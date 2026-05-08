/**
 * レベル計算
 * DP 0-49  → レベル1
 * DP 50-99 → レベル2
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
 * 指定ゲームレベルで習得できる技を取得。
 * PokeAPI の level_learned_at を10で割り切り上げてゲームレベルにマッピング。
 *   例: PokeAPI level 1-10  → ゲームレベル 1
 *       PokeAPI level 11-20 → ゲームレベル 2
 *       PokeAPI level 21-30 → ゲームレベル 3
 */
export function getMovesForLevel(
  allMoves: Array<{ name: string; level: number }>,
  targetLevel: number,
): string[] {
  return allMoves
    .filter((m) => Math.ceil(m.level / 10) === targetLevel)
    .map((m) => m.name);
}
