import type { EvolutionEntry } from '../types';

export const EVOLUTION_TABLE: EvolutionEntry[] = [
  // ピチュー → ピカチュウ
  {
    pokemonId: 172,
    evolvesTo: [{ targetId: 25, conditions: { minLevel: 5, minAffection: 50 } }],
  },
  // ピカチュウ → ライチュウ
  {
    pokemonId: 25,
    evolvesTo: [{ targetId: 26, conditions: { minLevel: 15, minPhysical: 30, minSmart: 60 } }],
  },
  // ピィ → ピッピ（夜・なつき度）
  {
    pokemonId: 173,
    evolvesTo: [{ targetId: 35, conditions: { minLevel: 5, minLife: 30, minAffection: 40, timeOfDay: 'night' } }],
  },
  // ピッピ → ピクシー
  {
    pokemonId: 35,
    evolvesTo: [{ targetId: 36, conditions: { minLevel: 15, minMental: 40, minLife: 50 } }],
  },
  // ププリン → プリン（なつき度）
  {
    pokemonId: 174,
    evolvesTo: [{ targetId: 39, conditions: { minLevel: 5, minMental: 20, minLife: 40, minAffection: 50 } }],
  },
  // プリン → プクリン
  {
    pokemonId: 39,
    evolvesTo: [{ targetId: 40, conditions: { minLevel: 15, minMental: 50, minLife: 60 } }],
  },
  // トゲピー → トゲチック（高なつき度）
  {
    pokemonId: 175,
    evolvesTo: [{ targetId: 176, conditions: { minLevel: 8, minSmart: 20, minMental: 30, minLife: 40, minAffection: 80 } }],
  },
  // バルキー → 3種分岐
  {
    pokemonId: 236,
    evolvesTo: [
      {
        targetId: 237, // カポエラー（均等）
        conditions: {
          minLevel: 10,
          minPhysical: 60,
          bias: { dominant: 'physical', over: ['mental', 'smart'], withinRange: 10 },
        },
      },
      {
        targetId: 106, // サワムラー（Physical > Mental）
        conditions: {
          minLevel: 10,
          minPhysical: 60,
          bias: { dominant: 'physical', over: ['mental'] },
        },
      },
      {
        targetId: 107, // エビワラー（Physical > Smart）
        conditions: {
          minLevel: 10,
          minPhysical: 60,
          bias: { dominant: 'physical', over: ['smart'] },
        },
      },
    ],
  },
  // メリープ → モコモ
  {
    pokemonId: 179,
    evolvesTo: [{ targetId: 180, conditions: { minLevel: 10, minPhysical: 20, minSmart: 40 } }],
  },
  // モコモ → デンリュウ
  {
    pokemonId: 180,
    evolvesTo: [{ targetId: 181, conditions: { minLevel: 18, minSmart: 80 } }],
  },
  // デルビル → ヘルガー（夜）
  {
    pokemonId: 228,
    evolvesTo: [{ targetId: 229, conditions: { minLevel: 15, minPhysical: 40, minMental: 50, timeOfDay: 'night' } }],
  },
  // ヤミカラス（終点）
  { pokemonId: 198, evolvesTo: null },
  // ムウマ（終点）
  { pokemonId: 200, evolvesTo: null },
  // ハネッコ → ポポッコ（昼）
  {
    pokemonId: 187,
    evolvesTo: [{ targetId: 188, conditions: { minLevel: 10, minPhysical: 30, minLife: 30, timeOfDay: 'day' } }],
  },
  // ポポッコ → ワタッコ（昼）
  {
    pokemonId: 188,
    evolvesTo: [{ targetId: 189, conditions: { minLevel: 18, minPhysical: 50, minLife: 50, timeOfDay: 'day' } }],
  },
  // ウパー → ヌオー
  {
    pokemonId: 194,
    evolvesTo: [{ targetId: 195, conditions: { minLevel: 10, minPhysical: 40, minLife: 50 } }],
  },
  // ヒメグマ → リングマ
  {
    pokemonId: 216,
    evolvesTo: [{ targetId: 217, conditions: { minLevel: 15, minPhysical: 80 } }],
  },
  // マグマッグ → マグカルゴ
  {
    pokemonId: 218,
    evolvesTo: [{ targetId: 219, conditions: { minLevel: 12, minPhysical: 60, minSmart: 40 } }],
  },
  // イノプー → イノムー
  {
    pokemonId: 220,
    evolvesTo: [{ targetId: 221, conditions: { minLevel: 12, minPhysical: 70, minLife: 30 } }],
  },
  // テッポウオ → オクタン
  {
    pokemonId: 223,
    evolvesTo: [{ targetId: 224, conditions: { minLevel: 12, minSmart: 50, minLife: 40 } }],
  },
  // ブルー → グランブル
  {
    pokemonId: 209,
    evolvesTo: [{ targetId: 210, conditions: { minLevel: 12, minPhysical: 60, minLife: 30 } }],
  },
  // ゴマゾウ → ドンファン
  {
    pokemonId: 231,
    evolvesTo: [{ targetId: 232, conditions: { minLevel: 15, minPhysical: 80, minLife: 30 } }],
  },
  // ムチュール → ルージュラ
  {
    pokemonId: 238,
    evolvesTo: [{ targetId: 124, conditions: { minLevel: 10, minMental: 60, minLife: 40 } }],
  },
  // エレキッド → エレブー
  {
    pokemonId: 239,
    evolvesTo: [{ targetId: 125, conditions: { minLevel: 10, minPhysical: 40, minSmart: 60 } }],
  },
  // ブビィ → ブーバー
  {
    pokemonId: 240,
    evolvesTo: [{ targetId: 126, conditions: { minLevel: 10, minPhysical: 60, minMental: 30 } }],
  },
  // フシギダネ → フシギソウ
  {
    pokemonId: 1,
    evolvesTo: [{ targetId: 2, conditions: { minLevel: 10, minSmart: 20, minLife: 40 } }],
  },
  // フシギソウ → フシギバナ
  {
    pokemonId: 2,
    evolvesTo: [{ targetId: 3, conditions: { minLevel: 20, minSmart: 40, minLife: 80 } }],
  },
  // ヒトカゲ → リザード
  {
    pokemonId: 4,
    evolvesTo: [{ targetId: 5, conditions: { minLevel: 12, minPhysical: 50, minMental: 20 } }],
  },
  // リザード → リザードン
  {
    pokemonId: 5,
    evolvesTo: [{ targetId: 6, conditions: { minLevel: 22, minPhysical: 80, minMental: 50 } }],
  },
  // ゼニガメ → カメール
  {
    pokemonId: 7,
    evolvesTo: [{ targetId: 8, conditions: { minLevel: 10, minPhysical: 30, minSmart: 20, minLife: 40 } }],
  },
  // カメール → カメックス
  {
    pokemonId: 8,
    evolvesTo: [{ targetId: 9, conditions: { minLevel: 20, minPhysical: 50, minSmart: 40, minLife: 60 } }],
  },
  // チコリータ → ベイリーフ
  {
    pokemonId: 152,
    evolvesTo: [{ targetId: 153, conditions: { minLevel: 10, minSmart: 30, minLife: 40 } }],
  },
  // ベイリーフ → メガニウム
  {
    pokemonId: 153,
    evolvesTo: [{ targetId: 154, conditions: { minLevel: 20, minSmart: 60, minLife: 80 } }],
  },
  // ヒノアラシ → マグマラシ
  {
    pokemonId: 155,
    evolvesTo: [{ targetId: 156, conditions: { minLevel: 12, minPhysical: 40, minSmart: 20 } }],
  },
  // マグマラシ → バクフーン
  {
    pokemonId: 156,
    evolvesTo: [{ targetId: 157, conditions: { minLevel: 22, minPhysical: 70, minSmart: 50 } }],
  },
  // ワニノコ → アリゲイツ
  {
    pokemonId: 158,
    evolvesTo: [{ targetId: 159, conditions: { minLevel: 12, minPhysical: 50, minLife: 30 } }],
  },
  // アリゲイツ → オーダイル
  {
    pokemonId: 159,
    evolvesTo: [{ targetId: 160, conditions: { minLevel: 22, minPhysical: 80, minLife: 50 } }],
  },
  // ミニリュウ → ハクリュー
  {
    pokemonId: 147,
    evolvesTo: [{ targetId: 148, conditions: { minLevel: 15, minPhysical: 40, minSmart: 40, minLife: 30, minAffection: 80 } }],
  },
  // ハクリュー → カイリュー
  {
    pokemonId: 148,
    evolvesTo: [{ targetId: 149, conditions: { minLevel: 25, minPhysical: 80, minSmart: 60, minMental: 40, minLife: 60 } }],
  },
  // ヨーギラス → サナギラス
  {
    pokemonId: 246,
    evolvesTo: [{ targetId: 247, conditions: { minLevel: 12, minPhysical: 60, minMental: 30 } }],
  },
  // サナギラス → バンギラス
  {
    pokemonId: 247,
    evolvesTo: [{ targetId: 248, conditions: { minLevel: 25, minPhysical: 100, minSmart: 40, minMental: 60 } }],
  },
];

export function getEvolutionEntry(pokemonId: number): EvolutionEntry | undefined {
  return EVOLUTION_TABLE.find((e) => e.pokemonId === pokemonId);
}
