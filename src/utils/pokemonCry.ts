const CRY_BASE = "https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest";

// Safari は .ogg 非対応のため Web Audio API でフォールバック音を合成する
function playSynthCry(pokemonId: number, volume: number): void {
  try {
    const ctx = new AudioContext();
    const gain = ctx.createGain();
    gain.connect(ctx.destination);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);

    // pokemonId を seed にして周波数をずらし、種ごとに音を変える
    const baseFreq = 200 + (pokemonId % 30) * 12;
    const osc1 = ctx.createOscillator();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(baseFreq * 2, ctx.currentTime);
    osc1.frequency.exponentialRampToValueAtTime(baseFreq, ctx.currentTime + 0.3);
    osc1.connect(gain);
    osc1.start(ctx.currentTime);
    osc1.stop(ctx.currentTime + 0.5);

    const osc2 = ctx.createOscillator();
    osc2.type = "triangle";
    osc2.frequency.setValueAtTime(baseFreq * 1.5, ctx.currentTime + 0.05);
    osc2.frequency.exponentialRampToValueAtTime(baseFreq * 0.8, ctx.currentTime + 0.4);
    const gain2 = ctx.createGain();
    gain2.gain.setValueAtTime(volume * 0.4, ctx.currentTime + 0.05);
    gain2.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(ctx.currentTime + 0.05);
    osc2.stop(ctx.currentTime + 0.5);

    setTimeout(() => ctx.close(), 800);
  } catch {
    // AudioContext 未対応環境では無音
  }
}

export function playPokemonCry(pokemonId: number, volume = 0.4): void {
  if (!pokemonId || pokemonId <= 0) return;

  const audio = new Audio();
  // .ogg 再生可否を事前チェック（Safari は '' を返す）
  if (audio.canPlayType("audio/ogg") === "") {
    playSynthCry(pokemonId, volume);
    return;
  }

  audio.src = `${CRY_BASE}/${pokemonId}.ogg`;
  audio.volume = volume;
  audio.play().catch(() => playSynthCry(pokemonId, volume));
}
