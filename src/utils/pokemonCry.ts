const CRY_BASE = "https://raw.githubusercontent.com/PokeAPI/cries/main/cries/pokemon/latest";

export function playPokemonCry(pokemonId: number, volume = 0.4): void {
  if (!pokemonId || pokemonId <= 0) return;
  const audio = new Audio(`${CRY_BASE}/${pokemonId}.ogg`);
  audio.volume = volume;
  audio.play().catch(() => {});
}
