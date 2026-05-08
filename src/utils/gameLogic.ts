/**
 * gameLogic.ts
 * ゲームの純粋な計算関数群。Reactのstateに依存しない。
 */

import type {
  GameState,
  PokemonSlot,
  AttributeType,
  ActivityCategory,
  EvolutionConditions,
  TimeOfDay,
  WeeklyChallenge,
  SlotDecoration,
} from "../types";
import {
  DEFAULT_DECAY_RATE,
  HATCH_THRESHOLD,
  HATCH_POOL,
  TP_SLOT_THRESHOLDS,
} from "../types";
import { getEvolutionEntry } from "../data/evolutionTable";
import { calcLevel } from "./levelSystem";
import {
  getMondayTimestamp,
  getChallengeTypeIndex,
  getChallengeDefinition,
} from "../data/weeklyChallenges";

// ===== ストリーク倍率 =====
export function getStreakMultiplier(streak: number): number {
  if (streak >= 30) return 2.0;
  if (streak >= 14) return 1.8;
  if (streak >= 7) return 1.5;
  if (streak >= 3) return 1.2;
  return 1.0;
}

// ===== 日付ユーティリティ =====
export function getDateString(timestamp: number): string {
  const d = new Date(timestamp);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function getYesterdayString(today: string): string {
  const d = new Date(today);
  d.setDate(d.getDate() - 1);
  return getDateString(d.getTime());
}

// ===== デコレーションデフォルト =====
export function makeEmptyDecoration(): SlotDecoration {
  return {
    backgroundId: null,
    frameId: null,
    accessoryIds: [],
    purchasedIds: [],
  };
}

// ===== スロット生成・初期化 =====
export function makeEmptySlot(slotId: number, isEgg: boolean): PokemonSlot {
  return {
    slotId,
    pokemonId: isEgg ? 0 : null,
    isEgg,
    dp: { physical: 0, smart: 0, mental: 0, life: 0 },
    totalDpEver: 0,
    lastUpdatedAt: Date.now(),
    learnedMoves: [],
    decoration: makeEmptyDecoration(),
  };
}

// ===== DPプールから消費 =====
export function spendDpFromPool(
  pool: Record<AttributeType, number>,
  amount: number,
): { ok: true; newPool: Record<AttributeType, number> } | { ok: false } {
  const total = Object.values(pool).reduce((s, v) => s + v, 0);
  if (total < amount) return { ok: false };

  const attrs: AttributeType[] = ["physical", "smart", "mental", "life"];
  const newPool = { ...pool };
  let remaining = amount;
  for (const attr of attrs) {
    const take = Math.min(newPool[attr], remaining);
    newPool[attr] -= take;
    remaining -= take;
    if (remaining <= 0) break;
  }
  return { ok: true, newPool };
}

export function makeInitialState(): GameState {
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
export function migrateState(raw: unknown): GameState {
  const initial = makeInitialState();
  if (typeof raw !== "object" || raw === null) return initial;
  const merged = { ...initial, ...(raw as Partial<GameState>) };
  // party スロットに新フィールドが存在しない場合のマイグレーション
  if (Array.isArray(merged.party)) {
    merged.party = merged.party.map((slot) => ({
      ...slot,
      // 英語名（ASCII のみ）で保存されていた技はリセット → 起動時に日本語で再習得
      learnedMoves: (slot.learnedMoves ?? []).every((m: string) => /^[\x00-\x7F\s]+$/.test(m))
        ? []
        : slot.learnedMoves,
      decoration: slot.decoration ?? makeEmptyDecoration(),
    }));
  }
  return merged;
}

// ===== Decay =====
export function applyDecay(slot: PokemonSlot, decayRate: number): PokemonSlot {
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
export function getTimeOfDay(timestamp: number): TimeOfDay {
  const hour = new Date(timestamp).getHours();
  return hour >= 6 && hour < 18 ? "day" : "night";
}

export function meetsConditions(
  slot: PokemonSlot,
  conditions: EvolutionConditions,
  timeOfDay: TimeOfDay,
): boolean {
  const { dp, totalDpEver } = slot;
  if (conditions.minLevel !== undefined && calcLevel(totalDpEver) < conditions.minLevel)
    return false;
  if (conditions.minPhysical !== undefined && dp.physical < conditions.minPhysical)
    return false;
  if (conditions.minSmart !== undefined && dp.smart < conditions.minSmart)
    return false;
  if (conditions.minMental !== undefined && dp.mental < conditions.minMental)
    return false;
  if (conditions.minLife !== undefined && dp.life < conditions.minLife)
    return false;
  if (conditions.minAffection !== undefined && totalDpEver < conditions.minAffection)
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

export function checkEvolution(slot: PokemonSlot, inputTime: number): PokemonSlot {
  if (slot.pokemonId === null) return slot;

  if (slot.isEgg) {
    if (slot.totalDpEver >= HATCH_THRESHOLD) {
      const randomId = HATCH_POOL[Math.floor(Math.random() * HATCH_POOL.length)];
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
export function calcUnlockedSlots(totalTp: number): number {
  let unlocked = 1;
  for (let i = 1; i < TP_SLOT_THRESHOLDS.length; i++) {
    if (totalTp >= TP_SLOT_THRESHOLDS[i]) unlocked = i + 1;
  }
  return unlocked;
}

// ===== 図鑑 =====
export function addCaught(current: number[], newId: number): number[] {
  if (current.includes(newId)) return current;
  return [...current, newId];
}

// ===== バッジ判定 =====
export interface BadgeCheckState {
  effortStreak: number;
  totalTp: number;
  totalActivityCount: number;
  totalEffortCount: number;
  totalHatches: number;
  totalEvolutions: number;
  caughtPokemon: number[];
}

export function checkBadges(
  prev: GameState,
  newState: BadgeCheckState,
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
export function updateWeeklyChallenge(
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
