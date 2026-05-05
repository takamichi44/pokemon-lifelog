export interface TrainerRank {
  level: number;
  title: string;
  minTp: number;
  icon: string;
}

export const TRAINER_RANKS: TrainerRank[] = [
  { level: 1, title: '見習いトレーナー',    minTp: 0,     icon: '🌱' },
  { level: 2, title: 'ルーキートレーナー',  minTp: 100,   icon: '⭐' },
  { level: 3, title: 'ジム挑戦者',          minTp: 500,   icon: '🏅' },
  { level: 4, title: 'ジムリーダー',        minTp: 1500,  icon: '🥇' },
  { level: 5, title: '四天王',              minTp: 3000,  icon: '💎' },
  { level: 6, title: 'チャンピオン',        minTp: 6000,  icon: '🏆' },
  { level: 7, title: 'マスタートレーナー',  minTp: 10000, icon: '👑' },
];

export function getCurrentRank(totalTp: number): TrainerRank {
  let current = TRAINER_RANKS[0];
  for (const rank of TRAINER_RANKS) {
    if (totalTp >= rank.minTp) current = rank;
  }
  return current;
}

export function getNextRank(totalTp: number): TrainerRank | null {
  for (const rank of TRAINER_RANKS) {
    if (totalTp < rank.minTp) return rank;
  }
  return null;
}
