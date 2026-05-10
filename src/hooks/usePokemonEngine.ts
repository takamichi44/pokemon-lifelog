import { useState, useEffect, useCallback, useRef } from "react";
import type {
  GameState,
  PokemonSlot,
  Activity,
  AttributeType,
  ActivityCategory,
} from "../types";
import { BASE_DP_PER_ACTIVITY, CATEGORY_COEFFICIENTS } from "../types";
import { getChallengeDefinition } from "../data/weeklyChallenges";
import { getBadgeById } from "../data/badges";
import { useMoveSystem } from "./useMoveSystem";
import {
  getStreakMultiplier,
  getDateString,
  getYesterdayString,
  makeEmptySlot,
  makeInitialState,
  migrateState,
  applyDecay,
  checkEvolution,
  calcUnlockedSlots,
  addCaught,
  checkBadges,
  updateWeeklyChallenge,
  spendDpFromPool,
} from "../utils/gameLogic";
import { DECORATION_CATALOG, ACCESSORY_MAX } from "../data/decorationCatalog";
import type { DecorationCategory } from "../types";

// getStreakMultiplier は他コンポーネントから import されているため再エクスポート
export { getStreakMultiplier };

const STORAGE_KEY = "pokemon_lifelog_state";

// ===== フック本体 =====
export function usePokemonEngine(
  onEvolutionAnimation?: (fromPokemonId: number, toPokemonId: number) => void,
) {
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

  const { checkAndLearnMoves, forgetMove, cancelPendingMove } = useMoveSystem(
    state,
    setState,
  );

  // pokemonId の変化（孵化・進化）を検知して技習得チェックを走らせる
  // checkAndLearnMoves は state.party の古いクロージャを参照するため、
  // useEffect（再レンダー後に実行）から呼ぶことで最新の state.party を参照できる
  const prevPartyIdsRef = useRef<Record<number, number | null>>({});
  useEffect(() => {
    const prev = prevPartyIdsRef.current;
    state.party.forEach((slot) => {
      if (slot.isEgg || !slot.pokemonId) return;
      const prevId = prev[slot.slotId];
      const pokemonChanged = prevId !== slot.pokemonId;
      const movesEmpty = (slot.learnedMoves?.length ?? 0) === 0;
      if (pokemonChanged || movesEmpty) {
        checkAndLearnMoves(slot.slotId);
      }
    });
    prevPartyIdsRef.current = Object.fromEntries(
      state.party.map((s) => [s.slotId, s.pokemonId]),
    );
  }, [state.party, checkAndLearnMoves]);

  // 起動時: decay適用 + ストリーク切れチェック
  useEffect(() => {
    setState((prev) => {
      const todayStr = getDateString(Date.now());
      let effortStreak = prev.effortStreak;
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
              newStreak = prev.effortStreak + 1;
            } else {
              newStreak = 1;
            }
            newLastEffortDate = todayStr;
            newLongest = Math.max(newLongest, newStreak);
          }

          // ===== DP倍率計算 =====
          if (isEffort) {
            multiplier *= getStreakMultiplier(newStreak);
            if (prev.lastEffortDate !== todayStr) {
              multiplier *= 1.3;
            }
          }

          const baseEarned =
            BASE_DP_PER_ACTIVITY * CATEGORY_COEFFICIENTS[category];
          earned = Math.round(baseEarned * multiplier * 10) / 10;

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
                else {
                  newEvolutions++;
                  // 進化アニメーションをトリガー（孵化は対象外）
                  onEvolutionAnimation?.(prevId!, evolved.pokemonId);
                }
              }
              return evolved;
            });
          } else {
            newPool = { ...newPool, [attribute]: newPool[attribute] + earned };
          }
        }

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

        // バッジ解放時のDP報酬をプールに配分
        for (const badgeId of newBadges) {
          const badgeDef = getBadgeById(badgeId);
          if (badgeDef?.rewardDp) {
            const perAttr = badgeDef.rewardDp / 4;
            newPool = {
              ...newPool,
              physical: newPool.physical + perAttr,
              smart: newPool.smart + perAttr,
              mental: newPool.mental + perAttr,
              life: newPool.life + perAttr,
            };
          }
        }

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
          weeklyChallenge: newChallenge,
        };
      });

      // 技習得チェック（DP報酬獲得後）
      if (!isConversationActivity && targetSlotId !== null) {
        await checkAndLearnMoves(targetSlotId);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [checkAndLearnMoves],
  );

  const allocateFromPool = useCallback(
    async (targetSlotId: number, attribute: AttributeType, amount: number) => {
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

        // バッジ解放時のDP報酬をプールに配分
        let badgeRewardPool = newPool;
        for (const badgeId of newBadges) {
          const badgeDef = getBadgeById(badgeId);
          if (badgeDef?.rewardDp) {
            const perAttr = badgeDef.rewardDp / 4;
            badgeRewardPool = {
              ...badgeRewardPool,
              physical: badgeRewardPool.physical + perAttr,
              smart: badgeRewardPool.smart + perAttr,
              mental: badgeRewardPool.mental + perAttr,
              life: badgeRewardPool.life + perAttr,
            };
          }
        }

        return {
          ...prev,
          dpPool: badgeRewardPool,
          party: newParty,
          caughtPokemon: newCaught,
          totalHatches: newHatches,
          totalEvolutions: newEvolutions,
          unlockedBadges: [...(prev.unlockedBadges ?? []), ...newBadges],
        };
      });

      await checkAndLearnMoves(targetSlotId);
    },
    [checkAndLearnMoves],
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

  const setTrainerName = useCallback((name: string) => {
    setState((prev) => ({ ...prev, trainerName: name }));
  }, []);

  const setStarterPokemon = useCallback((pokemonId: number) => {
    setState((prev) => {
      const newParty = prev.party.map((slot) =>
        slot.slotId === 0
          ? { ...slot, pokemonId, isEgg: false, lastUpdatedAt: Date.now() }
          : slot,
      );
      return {
        ...prev,
        party: newParty,
        caughtPokemon: addCaught(prev.caughtPokemon ?? [], pokemonId),
        totalHatches: (prev.totalHatches ?? 0) + 1,
      };
    });
  }, []);

  /** 開発者モード: 任意DPを直接付与 */
  const grantDp = useCallback(
    async (
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

        // 付与するDP総量 → TP に加算
        const totalGranted = attrs.length * amount;
        const newTp = prev.totalTp + totalGranted;
        const newUnlocked = calcUnlockedSlots(newTp);

        if (targetSlotId === "pool") {
          const newPool = { ...prev.dpPool };
          for (const a of attrs) newPool[a] += amount;
          return {
            ...prev,
            dpPool: newPool,
            totalTp: newTp,
            unlockedSlots: newUnlocked,
          };
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
            else {
              newEvolutions++;
              // 進化アニメーションをトリガー（孵化は対象外）
              onEvolutionAnimation?.(prevId!, evolved.pokemonId);
            }
          }
          return evolved;
        });

        return {
          ...prev,
          party: newParty.map((slot, i) =>
            i < newUnlocked && slot.pokemonId === null && !slot.isEgg
              ? makeEmptySlot(i, true)
              : slot,
          ),
          totalTp: newTp,
          unlockedSlots: newUnlocked,
          caughtPokemon: newCaught,
          totalHatches: newHatches,
          totalEvolutions: newEvolutions,
        };
      });
      // DP付与後に技習得チェック（レベルアップで新技を習得する可能性）
      if (targetSlotId !== "pool") {
        await checkAndLearnMoves(targetSlotId);
      }
    },
    [checkAndLearnMoves],
  );

  // ===== デコレーション購入（DPプールから消費） =====
  const purchaseDecoration = useCallback((slotId: number, itemId: string) => {
    setState((prev) => {
      const item = DECORATION_CATALOG.find((d) => d.id === itemId);
      if (!item) return prev;
      const slot = prev.party.find((s) => s.slotId === slotId);
      if (!slot) return prev;
      // 購入済みはスキップ（再適用はapplyDecorationで）
      if (slot.decoration.purchasedIds.includes(itemId)) return prev;

      const result = spendDpFromPool(prev.dpPool, item.cost);
      if (!result.ok) return prev;

      // 購入＋即時装備
      const newParty = prev.party.map((s) => {
        if (s.slotId !== slotId) return s;
        const deco = { ...s.decoration };
        const purchased = [...deco.purchasedIds, itemId];
        if (item.category === "background") {
          return {
            ...s,
            decoration: {
              ...deco,
              backgroundId: itemId,
              purchasedIds: purchased,
            },
          };
        }
        if (item.category === "frame") {
          return {
            ...s,
            decoration: { ...deco, frameId: itemId, purchasedIds: purchased },
          };
        }
        // accessory: 最大ACCESSORY_MAX個まで
        const newAccIds =
          deco.accessoryIds.length < ACCESSORY_MAX
            ? [...deco.accessoryIds, itemId]
            : deco.accessoryIds;
        return {
          ...s,
          decoration: {
            ...deco,
            accessoryIds: newAccIds,
            purchasedIds: purchased,
          },
        };
      });

      return { ...prev, dpPool: result.newPool, party: newParty };
    });
  }, []);

  // ===== デコレーション適用（購入済みアイテムを無料で付け替え） =====
  const applyDecoration = useCallback((slotId: number, itemId: string) => {
    setState((prev) => {
      const slot = prev.party.find((s) => s.slotId === slotId);
      if (!slot || !slot.decoration.purchasedIds.includes(itemId)) return prev;
      const item = DECORATION_CATALOG.find((d) => d.id === itemId);
      if (!item) return prev;

      const newParty = prev.party.map((s) => {
        if (s.slotId !== slotId) return s;
        const deco = { ...s.decoration };
        if (item.category === "background") {
          return { ...s, decoration: { ...deco, backgroundId: itemId } };
        }
        if (item.category === "frame") {
          return { ...s, decoration: { ...deco, frameId: itemId } };
        }
        // accessory: まだ装備していない場合のみ追加
        if (deco.accessoryIds.includes(itemId)) return s;
        if (deco.accessoryIds.length >= ACCESSORY_MAX) return s;
        return {
          ...s,
          decoration: { ...deco, accessoryIds: [...deco.accessoryIds, itemId] },
        };
      });

      return { ...prev, party: newParty };
    });
  }, []);

  // ===== デコレーション取り外し =====
  const removeDecoration = useCallback(
    (slotId: number, itemId: string, category: DecorationCategory) => {
      setState((prev) => {
        const newParty = prev.party.map((s) => {
          if (s.slotId !== slotId) return s;
          const deco = { ...s.decoration };
          if (category === "background" && deco.backgroundId === itemId) {
            return { ...s, decoration: { ...deco, backgroundId: null } };
          }
          if (category === "frame" && deco.frameId === itemId) {
            return { ...s, decoration: { ...deco, frameId: null } };
          }
          if (category === "accessory") {
            return {
              ...s,
              decoration: {
                ...deco,
                accessoryIds: deco.accessoryIds.filter((id) => id !== itemId),
              },
            };
          }
          return s;
        });
        return { ...prev, party: newParty };
      });
    },
    [],
  );

  return {
    state,
    addActivity,
    allocateFromPool,
    claimChallengeReward,
    resetGame,
    setDecayRate,
    setTrainerName,
    setStarterPokemon,
    grantDp,
    checkAndLearnMoves,
    forgetMove,
    cancelPendingMove,
    purchaseDecoration,
    applyDecoration,
    removeDecoration,
  };
}
