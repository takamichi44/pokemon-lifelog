/**
 * BW アニメーションスプライト（Gen 1-5 対応）
 * フォールバック: 静止スプライト
 */
export function animatedSpriteUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-v/black-white/animated/${id}.gif`;
}

export function staticSpriteUrl(id: number): string {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
}

/** GIF が存在しなかった場合に静止スプライトへ差し替える onError ハンドラ */
export function onSpriteError(e: React.SyntheticEvent<HTMLImageElement>, id: number) {
  const img = e.target as HTMLImageElement;
  // 2 重 fallback を防ぐ
  if (!img.src.includes('animated')) return;
  img.src = staticSpriteUrl(id);
}
