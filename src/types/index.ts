export type AttributeType = "physical" | "smart" | "mental" | "life";
export type ActivityCategory = "effort" | "daily";
export type TimeOfDay = "day" | "night";

export interface Activity {
  id: string;
  text: string;
  attribute: AttributeType;
  category: ActivityCategory;
  earnedDp: number;
  earnedTp: number;
  targetSlotId: number | null; // null = DPプール
  createdAt: number;
  pokemonResponse?: string; // ポケモンの反応メッセージ
  isConversation?: boolean; // 雑談扱い
}

export interface PokemonSlot {
  slotId: number;
  pokemonId: number | null; // null = 未解放スロット
  isEgg: boolean;
  dp: Record<AttributeType, number>;
  totalDpEver: number; // なつき度代替（減衰の影響を受けない累計）
  lastUpdatedAt: number;
  learnedMoves: string[]; // 習得済み技（最大4つ）
}

export interface BiasCondition {
  dominant: AttributeType;
  over: AttributeType[];
  withinRange?: number; // 差がこの値以内なら均等とみなす（Hitmontop用）
}

export interface EvolutionConditions {
  minPhysical?: number;
  minSmart?: number;
  minMental?: number;
  minLife?: number;
  minAffection?: number;
  timeOfDay?: TimeOfDay;
  bias?: BiasCondition;
}

export interface EvolutionTarget {
  targetId: number;
  conditions: EvolutionConditions;
}

export interface EvolutionEntry {
  pokemonId: number;
  evolvesTo: EvolutionTarget[] | null;
}

export interface WeeklyChallenge {
  weekStart: number; // その週のMonday 00:00 UNIXタイムスタンプ
  challengeTypeIndex: number; // 0-6, チャレンジ種別
  current: number; // 現在の進捗
  completed: boolean;
  rewardClaimed: boolean;
}

export interface GameState {
  party: PokemonSlot[];
  dpPool: Record<AttributeType, number>;
  totalTp: number;
  unlockedSlots: number;
  chatHistory: Activity[];
  decayRate: number; // 24hあたりの減衰率 (0.0〜1.0)
  caughtPokemon: number[]; // これまでに孵化・進化したポケモンIDの履歴
  // ゲーミフィケーション
  effortStreak: number; // 連続努力日数
  longestStreak: number; // 歴代最長ストリーク
  lastEffortDate: string | null; // 最後に努力活動を記録した日 (YYYY-MM-DD)
  unlockedBadges: string[]; // 解放済みバッジID
  totalActivityCount: number;
  totalEffortCount: number;
  totalHatches: number;
  totalEvolutions: number;
  weeklyChallenge: WeeklyChallenge | null;
  // 技習得関連
  pendingMove: string | null; // 習得待ちの技名
  pendingMoveSlotId: number | null; // 習得対象のスロットID
}

export const ATTRIBUTE_LABELS: Record<AttributeType, string> = {
  physical: "フィジカル",
  smart: "スマート",
  mental: "メンタル",
  life: "ライフ",
};

export const ATTRIBUTE_COLORS: Record<AttributeType, string> = {
  physical: "#ef4444",
  smart: "#3b82f6",
  mental: "#a855f7",
  life: "#22c55e",
};

export const CATEGORY_LABELS: Record<ActivityCategory, string> = {
  effort: "努力",
  daily: "日常",
};

export const CATEGORY_COEFFICIENTS: Record<ActivityCategory, number> = {
  effort: 1.0,
  daily: 0.5,
};

export const BASE_DP_PER_ACTIVITY = 10;
export const HATCH_THRESHOLD = 50;
export const TP_SLOT_THRESHOLDS = [0, 100, 300, 600, 1000, 1500];
export const DEFAULT_DECAY_RATE = 0.2;

export const HATCH_POOL: number[] = [
  172,
  173,
  174,
  175, // ピチュー, ピィ, ププリン, トゲピー
  236,
  238,
  239,
  240, // バルキー, ムチュール, エレキッド, ブビィ
  228, // デルビル（ヤミカラス・ムウマは進化なしのため除外）
  179,
  187,
  194,
  216, // メリープ, ハネッコ, ウパー, ヒメグマ
  220,
  231,
  223,
  218,
  209, // イノプー, ゴマゾウ, テッポウオ, マグマッグ, ブルー
  147,
  246, // ミニリュウ, ヨーギラス（強力な進化ライン）
  1,
  4,
  7,
  152,
  155,
  158, // フシギダネ, ヒトカゲ, ゼニガメ, チコリータ, ヒノアラシ, ワニノコ
];
