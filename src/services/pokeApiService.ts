const TYPE_JA: Record<string, string> = {
  normal: "ノーマル",
  fire: "ほのお",
  water: "みず",
  grass: "くさ",
  electric: "でんき",
  ice: "こおり",
  fighting: "かくとう",
  poison: "どく",
  ground: "じめん",
  flying: "ひこう",
  psychic: "エスパー",
  bug: "むし",
  rock: "いわ",
  ghost: "ゴースト",
  dragon: "ドラゴン",
  dark: "あく",
  steel: "はがね",
  fairy: "フェアリー",
};

export const TYPE_COLORS: Record<string, string> = {
  ノーマル: "#9ea29e",
  ほのお: "#ff7b44",
  みず: "#4a9ed6",
  くさ: "#5bb85d",
  でんき: "#f6c800",
  こおり: "#72c4bd",
  かくとう: "#c72c2c",
  どく: "#943ea6",
  じめん: "#d6b064",
  ひこう: "#7fa6e0",
  エスパー: "#ef3f7a",
  むし: "#6eba3b",
  いわ: "#c2b044",
  ゴースト: "#6e5796",
  ドラゴン: "#4059d0",
  あく: "#555",
  はがね: "#8fa7b3",
  フェアリー: "#e98ec6",
};

export interface PokeData {
  types: string[];
  height: number; // dm
  weight: number; // hg
  flavorText: string;
}

export interface Move {
  name: string;
  level: number;
}

const cache = new Map<number, PokeData>();
const movesCache = new Map<number, Move[]>();
const moveNameJaCache = new Map<string, string>(); // english slug → Japanese name

async function getMoveJaName(slug: string, url: string): Promise<string> {
  if (moveNameJaCache.has(slug)) return moveNameJaCache.get(slug)!;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error();
    const data = await res.json();
    const names = data.names as Array<{ language: { name: string }; name: string }>;
    const jaEntry = names.find((n) => n.language.name === "ja")
      ?? names.find((n) => n.language.name === "ja-Hrkt");
    const name = jaEntry?.name ?? slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    moveNameJaCache.set(slug, name);
    return name;
  } catch {
    const fallback = slug.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
    moveNameJaCache.set(slug, fallback);
    return fallback;
  }
}

export async function getPokeData(id: number): Promise<PokeData> {
  if (cache.has(id)) return cache.get(id)!;

  const [pokemonRes, speciesRes] = await Promise.all([
    fetch(`https://pokeapi.co/api/v2/pokemon/${id}`),
    fetch(`https://pokeapi.co/api/v2/pokemon-species/${id}`),
  ]);

  if (!pokemonRes.ok || !speciesRes.ok)
    throw new Error("PokeAPI の取得に失敗しました");

  const pokemon = await pokemonRes.json();
  const species = await speciesRes.json();

  const types = (
    pokemon.types as Array<{ slot: number; type: { name: string } }>
  )
    .sort((a, b) => a.slot - b.slot)
    .map((t) => TYPE_JA[t.type.name] ?? t.type.name);

  const jaEntries = (
    species.flavor_text_entries as Array<{
      flavor_text: string;
      language: { name: string };
    }>
  ).filter((e) => e.language.name === "ja" || e.language.name === "ja-Hrkt");

  const flavorText =
    jaEntries.length > 0
      ? jaEntries[0].flavor_text.replace(/[\n\f\r]/g, "").trim()
      : "";

  const data: PokeData = {
    types,
    height: pokemon.height,
    weight: pokemon.weight,
    flavorText,
  };
  cache.set(id, data);
  return data;
}

export async function getMovesByPokemonId(id: number): Promise<Move[]> {
  if (movesCache.has(id)) return movesCache.get(id)!;

  try {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${id}`);
    if (!res.ok) throw new Error("PokeAPI 取得失敗");

    const data = await res.json();

    // レベルアップ技のみ抽出し、全バージョンの中から最小レベルを採用
    const levelUpMap = new Map<string, { url: string; minLevel: number }>();
    (
      data.moves as Array<{
        move: { name: string; url: string };
        version_group_details: Array<{
          level_learned_at: number;
          move_learn_method: { name: string };
        }>;
      }>
    ).forEach((m) => {
      m.version_group_details
        .filter((v) => v.move_learn_method.name === "level-up" && v.level_learned_at > 0)
        .forEach((v) => {
          const existing = levelUpMap.get(m.move.name);
          if (existing === undefined || v.level_learned_at < existing.minLevel) {
            levelUpMap.set(m.move.name, { url: m.move.url, minLevel: v.level_learned_at });
          }
        });
    });

    // 日本語技名を並列取得
    const entries = Array.from(levelUpMap.entries());
    const jaNames = await Promise.all(
      entries.map(([slug, { url }]) => getMoveJaName(slug, url)),
    );

    const moves: Move[] = entries
      .map(([, { minLevel }], i) => ({ name: jaNames[i], level: minLevel }))
      .sort((a, b) => a.level - b.level);

    movesCache.set(id, moves);
    return moves;
  } catch (e) {
    console.error("技データ取得エラー:", e);
    return [];
  }
}
