import { useState, useEffect, useCallback } from "react";
import type {
  GameState,
  PokemonSlot,
  Activity,
  AttributeType,
  ActivityCategory,
  EvolutionConditions,
  TimeOfDay,
  WeeklyChallenge,
} from "../types";
import {
  BASE_DP_PER_ACTIVITY,
  CATEGORY_COEFFICIENTS,
  HATCH_THRESHOLD,
  HATCH_POOL,
  TP_SLOT_THRESHOLDS,
  DEFAULT_DECAY_RATE,
} from "../types";
import { getEvolutionEntry } from "../data/evolutionTable";
import {
  getMondayTimestamp,
  getChallengeTypeIndex,
  getChallengeDefinition,
} from "../data/weeklyChallenges";
import { getMovesByPokemonId } from "../services/pokeApiService";
import {
  calcLevel,
  getPreviousLevel,
  getMovesForLevel,
} from "../utils/levelSystem";

const STORAGE_KEY = "pokemon_lifelog_state";

// ===== ストリーク倍率 =====
export function getStreakMultiplier(streak: number): number {
  if (streak >= 30) return 2.0;
  if (streak >= 14) return 1.8;
  if (streak >= 7) return 1.5;
  if (streak >= 3) return 1.2;
  return 1.0;
}

function getDateString(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getYesterdayString(today: string): string {
  const d = new Date(today);
  d.setDate(d.getDate() - 1);
  return getDateString(d.getTime());
}

// ===== スロット生成 =====
function makeEmptySlot(slotId: number, isEgg: boolean): PokemonSlot {
  return {
    slotId,
    pokemonId: isEgg ? 0 : null,
    isEgg,
    dp: { physical: 0, smart: 0, mental: 0, life: 0 },
    totalDpEver: 0,
    lastUpdatedAt: Date.now(),
    learnedMoves: [],
  };
}

function makeInitialState(): GameState {
  return {
    party: [
      makeEmptySlot(0, true),
      makeEmptySlot(1, false),
      makeEmptySlot(2, false),
      makeEmptySlot(3, false),
      makeEmptySlot(4, false),
      makeEmptySlot(5, false),
    ],
    dpPool: { physical: 0, smart: 0, mental: 0, life: 0 },
    totalTp: 0,
    unlockedSlots: 1,
    chatHistory: [],
    decayRate: DEFAULT_DECAY_RATE,
    caughtPokemon: [],
    effortStreak: 0,
    longestStreak: 0,
    lastEffortDate: null,
    unlockedBadges: [],
    totalActivityCount: 0,
    totalEffortCount: 0,
    totalHatches: 0,
    totalEvolutions: 0,
    weeklyChallenge: null,
    pendingMove: null,
    pendingMoveSlotId: null,
  };
}

/** 保存データを新フィールドでマイグレーション */
function migrateState(raw: unknown): GameState {
  const initial = makeInitialState();
  if (typeof raw !== "object" || raw === null) return initial;
  return { ...initial, ...(raw as Partial<GameState>) };
}

// ===== Decay =====
function applyDecay(slot: PokemonSlot, decayRate: number): PokemonSlot {
  if (!slot.isEgg && slot.pokemonId === null) return slot;
  const now = Date.now();
  const elapsedHours = (now - slot.lastUpdatedAt) / 3600000;
  if (elapsedHours < 0.01) return { ...slot, lastUpdatedAt: now };

  const decayFactor = Math.pow(1 - decayRate / 24, elapsedHours);
  return {
    ...slot,
    dp: {
      physical: Math.max(0, slot.dp.physical * decayFactor),
      smart: Math.max(0, slot.dp.smart * decayFactor),
      mental: Math.max(0, slot.dp.mental * decayFactor),
      life: Math.max(0, slot.dp.life * decayFactor),
    },
    lastUpdatedAt: now,
  };
}

// ===== 進化 =====
function getTimeOfDay(timestamp: number): TimeOfDay {
  const hour = new Date(timestamp).getHours();
  return hour >= 6 && hour < 18 ? "day" : "night";
}

function meetsConditions(
  slot: PokemonSlot,
  conditions: EvolutionConditions,
  timeOfDay: TimeOfDay,
): boolean {
  const { dp, totalDpEver } = slot;
  if (
    conditions.minPhysical !== undefined &&
    dp.physical < conditions.minPhysical
  )
    return false;
  if (conditions.minSmart !== undefined && dp.smart < conditions.minSmart)
    return false;
  if (conditions.minMental !== undefined && dp.mental < conditions.minMental)
    return false;
  if (conditions.minLife !== undefined && dp.life < conditions.minLife)
    return false;
  if (
    conditions.minAffection !== undefined &&
    totalDpEver < conditions.minAffection
  )
    return false;
  if (conditions.timeOfDay !== undefined && conditions.timeOfDay !== timeOfDay)
    return false;

  if (conditions.bias) {
    const { dominant, over, withinRange } = conditions.bias;
    const domVal = dp[dominant];
    if (withinRange !== undefined) {
      if (!over.every((a) => Math.abs(domVal - dp[a]) <= withinRange))
        return false;
    } else {
      if (!over.every((a) => domVal > dp[a])) return false;
    }
  }
  return true;
}

function checkEvolution(slot: PokemonSlot, inputTime: number): PokemonSlot {
  if (slot.pokemonId === null) return slot;

  if (slot.isEgg) {
    if (slot.totalDpEver >= HATCH_THRESHOLD) {
      const randomId =
        HATCH_POOL[Math.floor(Math.random() * HATCH_POOL.length)];
      return { ...slot, pokemonId: randomId, isEgg: false };
    }
    return slot;
  }

  const entry = getEvolutionEntry(slot.pokemonId);
  if (!entry?.evolvesTo) return slot;

  const timeOfDay = getTimeOfDay(inputTime);
  for (const target of entry.evolvesTo) {
    if (meetsConditions(slot, target.conditions, timeOfDay)) {
      return { ...slot, pokemonId: target.targetId };
    }
  }
  return slot;
}

// ===== TP → スロット解放 =====
function calcUnlockedSlots(totalTp: number): number {
  let unlocked = 1;
  for (let i = 1; i < TP_SLOT_THRESHOLDS.length; i++) {
    if (totalTp >= TP_SLOT_THRESHOLDS[i]) unlocked = i + 1;
  }
  return unlocked;
}

// ===== 図鑑 =====
function addCaught(current: number[], newId: number): number[] {
  if (current.includes(newId)) return current;
  return [...current, newId];
}

// ===== バッジ判定 =====
function checkBadges(
  prev: GameState,
  newState: Partial<GameState> & {
    effortStreak: number;
    totalTp: number;
    totalActivityCount: number;
    totalEffortCount: number;
    totalHatches: number;
    totalEvolutions: number;
    caughtPokemon: number[];
  },
): string[] {
  const existing = prev.unlockedBadges;
  const gained: string[] = [];
  function check(id: string, cond: boolean) {
    if (cond && !existing.includes(id) && !gained.includes(id)) gained.push(id);
  }

  check("streak_3", newState.effortStreak >= 3);
  check("streak_7", newState.effortStreak >= 7);
  check("streak_14", newState.effortStreak >= 14);
  check("streak_30", newState.effortStreak >= 30);

  check("activities_10", newState.totalActivityCount >= 10);
  check("activities_50", newState.totalActivityCount >= 50);
  check("activities_100", newState.totalActivityCount >= 100);
  check("activities_300", newState.totalActivityCount >= 300);

  check("tp_100", newState.totalTp >= 100);
  check("tp_500", newState.totalTp >= 500);
  check("tp_1500", newState.totalTp >= 1500);
  check("tp_5000", newState.totalTp >= 5000);

  check("first_hatch", newState.totalHatches >= 1);
  check("hatches_5", newState.totalHatches >= 5);
  check("first_evo", newState.totalEvolutions >= 1);
  check("evolutions_10", newState.totalEvolutions >= 10);
  check("pokedex_10", newState.caughtPokemon.length >= 10);
  check("pokedex_30", newState.caughtPokemon.length >= 30);

  check("effort_10", newState.totalEffortCount >= 10);
  check("effort_50", newState.totalEffortCount >= 50);

  return gained;
}

// ===== 週間チャレンジ =====
function updateWeeklyChallenge(
  prev: WeeklyChallenge | null,
  now: number,
  attribute: AttributeType,
  category: ActivityCategory,
): WeeklyChallenge {
  const weekStart = getMondayTimestamp(now);
  const typeIndex = getChallengeTypeIndex(weekStart);
  const def = getChallengeDefinition(typeIndex);

  const counts =
    (def.attribute === undefined || def.attribute === attribute) &&
    (def.category === undefined || def.category === category);

  // 新しい週 or 初回
  if (!prev || prev.weekStart !== weekStart) {
    const newCurrent = counts ? 1 : 0;
    return {
      weekStart,
      challengeTypeIndex: typeIndex,
      current: newCurrent,
      completed: newCurrent >= def.target,
      rewardClaimed: false,
    };
  }

  if (prev.completed) return prev;

  if (!counts) return prev;

  const newCurrent = prev.current + 1;
  return { ...prev, current: newCurrent, completed: newCurrent >= def.target };
}

// ===== フック本体 =====
export function usePokemonEngine() {
  const [state, setState] = useState<GameState>(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        return migrateState(JSON.parse(saved));
      } catch {
        return makeInitialState();
      }
    }
    return makeInitialState();
  });

  // 起動時: decay適用 + ストリーク切れチェック
  useEffect(() => {
    setState((prev) => {
      const todayStr = getDateString(Date.now());
      let effortStreak = prev.effortStreak;
      // 昨日より前に努力活動が途絶えていたらストリークをリセット
      if (
        prev.lastEffortDate !== null &&
        prev.lastEffortDate !== todayStr &&
        prev.lastEffortDate !== getYesterdayString(todayStr)
      ) {
        effortStreak = 0;
      }
      return {
        ...prev,
        effortStreak,
        party: prev.party.map((slot) => applyDecay(slot, prev.decayRate)),
      };
    });
  }, []);

  // LocalStorageへ保存
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  const addActivity = useCallback(
    async (
      text: string,
      attribute: AttributeType,
      category: ActivityCategory,
      targetSlotId: number | null,
      pokemonResponse?: string,
      isConversation?: boolean,
    ) => {
      const now = Date.now();
      const todayStr = getDateString(now);
      const isEffort = category === "effort";
      const isConversationActivity = isConversation === true;

      setState((prev) => {
        let newStreak = prev.effortStreak;
        let newLongest = prev.longestStreak;
        let newLastEffortDate = prev.lastEffortDate;
        let multiplier = 1.0;
        let earned = 0;
        let newChallenge = prev.weeklyChallenge;
        let newActivityCount = prev.totalActivityCount ?? 0;
        let newEffortCount = prev.totalEffortCount ?? 0;

        if (!isConversationActivity) {
          // ===== ストリーク計算 =====
          if (isEffort) {
            if (prev.lastEffortDate === null) {
              newStreak = 1;
            } else if (prev.lastEffortDate === todayStr) {
              // 今日すでに努力済み → ストリーク変化なし
            } else if (prev.lastEffortDate === getYesterdayString(todayStr)) {
              // 昨日に続いて今日も努力
              newStreak = prev.effortStreak + 1;
            } else {
              // 途絶えていた → リセット
              newStreak = 1;
            }
            newLastEffortDate = todayStr;
            newLongest = Math.max(newLongest, newStreak);
          }

          // ===== DP倍率計算 =====
          if (isEffort) {
            multiplier *= getStreakMultiplier(newStreak);
            // 今日最初の努力活動なら +30%
            if (prev.lastEffortDate !== todayStr) {
              multiplier *= 1.3;
            }
          }

          const baseEarned =
            BASE_DP_PER_ACTIVITY * CATEGORY_COEFFICIENTS[category];
          earned = Math.round(baseEarned * multiplier * 10) / 10; // 小数第1位

          newChallenge = updateWeeklyChallenge(
            prev.weeklyChallenge,
            now,
            attribute,
            category,
          );
          newActivityCount = (prev.totalActivityCount ?? 0) + 1;
          newEffortCount = (prev.totalEffortCount ?? 0) + (isEffort ? 1 : 0);
        }

        const activity: Activity = {
          id: crypto.randomUUID(),
          text,
          attribute,
          category,
          earnedDp: earned,
          earnedTp: earned,
          targetSlotId,
          createdAt: now,
          ...(pokemonResponse !== undefined ? { pokemonResponse } : {}),
          ...(isConversationActivity ? { isConversation: true } : {}),
        };

        // ===== TP・スロット =====
        const newTp = prev.totalTp + earned;
        const newUnlocked = calcUnlockedSlots(newTp);

        let newPool = { ...prev.dpPool };
        let newParty = [...prev.party];
        let newCaught = [...(prev.caughtPokemon ?? [])];
        let newHatches = prev.totalHatches ?? 0;
        let newEvolutions = prev.totalEvolutions ?? 0;

        if (!isConversationActivity) {
          if (targetSlotId !== null) {
            newParty = newParty.map((slot) => {
              if (slot.slotId !== targetSlotId) return slot;
              const prevId = slot.pokemonId;
              const wasEgg = slot.isEgg;
              const updated: PokemonSlot = {
                ...slot,
                dp: { ...slot.dp, [attribute]: slot.dp[attribute] + earned },
                totalDpEver: slot.totalDpEver + earned,
                lastUpdatedAt: now,
              };
              const evolved = checkEvolution(updated, now);
              if (
                evolved.pokemonId !== null &&
                evolved.pokemonId !== 0 &&
                evolved.pokemonId !== prevId
              ) {
                newCaught = addCaught(newCaught, evolved.pokemonId);
                if (wasEgg) newHatches++;
                else newEvolutions++;
              }
              return evolved;
            });
          } else {
            newPool = { ...newPool, [attribute]: newPool[attribute] + earned };
          }
        }

        // ===== 週間チャレンジ =====
        const finalChallenge = newChallenge;

        // ===== バッジ判定 =====
        const badgeCheck = {
          effortStreak: newStreak,
          totalTp: newTp,
          totalActivityCount: newActivityCount,
          totalEffortCount: newEffortCount,
          totalHatches: newHatches,
          totalEvolutions: newEvolutions,
          caughtPokemon: newCaught,
        };
        const newBadges = checkBadges(prev, badgeCheck);

        return {
          ...prev,
          party: newParty.map((slot, i) =>
            i < newUnlocked && slot.pokemonId === null && !slot.isEgg
              ? makeEmptySlot(i, true)
              : slot,
          ),
          dpPool: newPool,
          totalTp: newTp,
          unlockedSlots: newUnlocked,
          chatHistory: [activity, ...prev.chatHistory].slice(0, 100),
          caughtPokemon: newCaught,
          effortStreak: newStreak,
          longestStreak: newLongest,
          lastEffortDate: newLastEffortDate,
          totalActivityCount: newActivityCount,
          totalEffortCount: newEffortCount,
          totalHatches: newHatches,
          totalEvolutions: newEvolutions,
          unlockedBadges: [...(prev.unlockedBadges ?? []), ...newBadges],
          weeklyChallenge: finalChallenge,
        };
      });

      // 技習得チェック（DP報酬獲得後）
      if (!isConversationActivity && targetSlotId !== null) {
        await checkAndLearnMoves(targetSlotId);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  const allocateFromPool = useCallback(
    (targetSlotId: number, attribute: AttributeType, amount: number) => {
      const now = Date.now();
      setState((prev) => {
        const available = prev.dpPool[attribute];
        const actual = Math.min(amount, available);
        if (actual <= 0) return prev;

        const newPool = { ...prev.dpPool, [attribute]: available - actual };
        let newCaught = [...(prev.caughtPokemon ?? [])];
        let newHatches = prev.totalHatches ?? 0;
        let newEvolutions = prev.totalEvolutions ?? 0;
        const newParty = prev.party.map((slot) => {
          if (slot.slotId !== targetSlotId) return slot;
          const prevId = slot.pokemonId;
          const wasEgg = slot.isEgg;
          const updated: PokemonSlot = {
            ...slot,
            dp: { ...slot.dp, [attribute]: slot.dp[attribute] + actual },
            totalDpEver: slot.totalDpEver + actual,
            lastUpdatedAt: now,
          };
          const evolved = checkEvolution(updated, now);
          if (
            evolved.pokemonId !== null &&
            evolved.pokemonId !== 0 &&
            evolved.pokemonId !== prevId
          ) {
            newCaught = addCaught(newCaught, evolved.pokemonId);
            if (wasEgg) newHatches++;
            else newEvolutions++;
          }
          return evolved;
        });

        const badgeCheck = {
          effortStreak: prev.effortStreak ?? 0,
          totalTp: prev.totalTp,
          totalActivityCount: prev.totalActivityCount ?? 0,
          totalEffortCount: prev.totalEffortCount ?? 0,
          totalHatches: newHatches,
          totalEvolutions: newEvolutions,
          caughtPokemon: newCaught,
        };
        const newBadges = checkBadges(prev, badgeCheck);

        return {
          ...prev,
          dpPool: newPool,
          party: newParty,
          caughtPokemon: newCaught,
          totalHatches: newHatches,
          totalEvolutions: newEvolutions,
          unlockedBadges: [...(prev.unlockedBadges ?? []), ...newBadges],
        };
      });
    },
    [],
  );

  const claimChallengeReward = useCallback(() => {
    setState((prev) => {
      const ch = prev.weeklyChallenge;
      if (!ch?.completed || ch.rewardClaimed) return prev;
      const def = getChallengeDefinition(ch.challengeTypeIndex);
      const perAttr = def.rewardDp / 4;
      return {
        ...prev,
        dpPool: {
          physical: prev.dpPool.physical + perAttr,
          smart: prev.dpPool.smart + perAttr,
          mental: prev.dpPool.mental + perAttr,
          life: prev.dpPool.life + perAttr,
        },
        weeklyChallenge: { ...ch, rewardClaimed: true },
      };
    });
  }, []);

  const resetGame = useCallback(() => {
    const fresh = makeInitialState();
    setState(fresh);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(fresh));
  }, []);

  const setDecayRate = useCallback((rate: number) => {
    setState((prev) => ({ ...prev, decayRate: rate }));
  }, []);

  /** 開発者モード: 任意DPを直接付与 */
  const grantDp = useCallback(
    (
      targetSlotId: number | "pool",
      attribute: AttributeType | "all",
      amount: number,
    ) => {
      const now = Date.now();
      setState((prev) => {
        const attrs: AttributeType[] =
          attribute === "all"
            ? ["physical", "smart", "mental", "life"]
            : [attribute];

        if (targetSlotId === "pool") {
          const newPool = { ...prev.dpPool };
          for (const a of attrs) newPool[a] += amount;
          return { ...prev, dpPool: newPool };
        }

        let newCaught = [...(prev.caughtPokemon ?? [])];
        let newHatches = prev.totalHatches ?? 0;
        let newEvolutions = prev.totalEvolutions ?? 0;

        const newParty = prev.party.map((slot) => {
          if (slot.slotId !== targetSlotId) return slot;
          const prevId = slot.pokemonId;
          const wasEgg = slot.isEgg;
          const newDp = { ...slot.dp };
          let totalAdd = 0;
          for (const a of attrs) {
            newDp[a] += amount;
            totalAdd += amount;
          }
          const updated: PokemonSlot = {
            ...slot,
            dp: newDp,
            totalDpEver: slot.totalDpEver + totalAdd,
            lastUpdatedAt: now,
          };
          const evolved = checkEvolution(updated, now);
          if (
            evolved.pokemonId !== null &&
            evolved.pokemonId !== 0 &&
            evolved.pokemonId !== prevId
          ) {
            newCaught = addCaught(newCaught, evolved.pokemonId);
            if (wasEgg) newHatches++;
            else newEvolutions++;
          }
          return evolved;
        });

        return {
          ...prev,
          party: newParty,
          caughtPokemon: newCaught,
          totalHatches: newHatches,
          totalEvolutions: newEvolutions,
        };
      });
    },
    [],
  );

  const checkAndLearnMoves = useCallback(
    async (targetSlotId: number) => {
      setState((prev) => {
        const slot = prev.party.find((s) => s.slotId === targetSlotId);
        if (!slot || slot.isEgg || !slot.pokemonId) return prev;

        const currentLevel = calcLevel(slot.totalDpEver);
        const prevLevel = getPreviousLevel(slot.totalDpEver - 1);

        if (currentLevel <= prevLevel) return prev;

        // 非同期処理が必要なため、ここではpendingMove をセット
        // 実際の技習得判定は別途処理
        return { ...prev };
      });

      // 非同期で技データを取得
      const slot = state.party.find((s) => s.slotId === targetSlotId);
      if (!slot || slot.isEgg || !slot.pokemonId) return;

      try {
        const allMoves = await getMovesByPokemonId(slot.pokemonId);
        const currentLevel = calcLevel(slot.totalDpEver);
        const newMovesAtLevel = getMovesForLevel(allMoves, currentLevel);

        for (const newMove of newMovesAtLevel) {
          if (!slot.learnedMoves.includes(newMove)) {
            if (slot.learnedMoves.length < 4) {
              // 自動習得
              setState((prev) => ({
                ...prev,
                party: prev.party.map((s) =>
                  s.slotId === targetSlotId
                    ? { ...s, learnedMoves: [...s.learnedMoves, newMove] }
                    : s,
                ),
              }));
            } else {
              // モーダル表示
              setState((prev) => ({
                ...prev,
                pendingMove: newMove,
                pendingMoveSlotId: targetSlotId,
              }));
              break; // 最初の新技のみ処理
            }
          }
        }
      } catch (e) {
        console.error("技データ取得エラー:", e);
      }
    },
    [state.party],
  );

  const forgetMove = useCallback((moveToForgot: string) => {
    setState((prev) => {
      if (!prev.pendingMove || prev.pendingMoveSlotId === null) return prev;

      const newParty = prev.party.map((slot) => {
        if (slot.slotId !== prev.pendingMoveSlotId) return slot;
        const newMoves = slot.learnedMoves
          .filter((m) => m !== moveToForgot)
          .concat([prev.pendingMove!]);
        return { ...slot, learnedMoves: newMoves };
      });

      return {
        ...prev,
        party: newParty,
        pendingMove: null,
        pendingMoveSlotId: null,
      };
    });
  }, []);

  const cancelPendingMove = useCallback(() => {
    setState((prev) => ({
      ...prev,
      pendingMove: null,
      pendingMoveSlotId: null,
    }));
  }, []);

  return {
    state,
    addActivity,
    allocateFromPool,
    claimChallengeReward,
    resetGame,
    setDecayRate,
    grantDp,
    checkAndLearnMoves,
    forgetMove,
    cancelPendingMove,
  };
}
