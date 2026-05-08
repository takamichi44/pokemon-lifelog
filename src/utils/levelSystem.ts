/**
 * レベル計算
 * DP 0-50 → レベル1
 * DP 50-100 → レベル2
 * ...
 * DP 4950+ → レベル100
 */
export function calcLevel(totalDp: number): number {
  return Math.min(Math.floor(totalDp / 50) + 1, 100);
}

/**
 * 前のレベル（DP加算前）を計算
 */
export function getPreviousLevel(totalDpBefore: number): number {
  return Math.max(Math.floor(totalDpBefore / 50) + 1, 1);
}

/**
 * 指定レベルで習得できる技を取得
 * レベルアップ時にレベル × 10 でマッピング
 * 例: レベル 10 → 100以上の技レベルを持つ技
 */
export function getMovesForLevel(
  allMoves: Array<{ name: string; level: number }>,
  targetLevel: number,
): string[] {
  const levelThreshold = targetLevel * 10;
  return allMoves.filter((m) => m.level === levelThreshold).map((m) => m.name);
}
