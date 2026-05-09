import type { EvolutionEntry } from '../types';

// DP 定常値の目安（20%/日減衰、streak なし）:
//   5活動/日 → 約270 DP、10活動/日 → 約550 DP
// 進化条件の設計基準:
//   1段階進化: 主属性 ≈ totalDpEver×25-30%、副属性 ≈ 15-20%
//   2段階進化: 主属性 ≈ totalDpEver×30-35%、副属性 ≈ 20-25%
//   御三家・竜・準伝説: 主属性 ≈ totalDpEver×35-40%

export const EVOLUTION_TABLE: EvolutionEntry[] = [
  // ピチュー → ピカチュウ (Lv5 / totalDpEver≥200)
  {
    pokemonId: 172,
    evolvesTo: [{ targetId: 25, conditions: { minLevel: 5, minMental: 50, minLife: 30 } }],
  },
  // ピカチュウ → ライチュウ (Lv15 / totalDpEver≥700)
  {
    pokemonId: 25,
    evolvesTo: [{ targetId: 26, conditions: { minLevel: 15, minPhysical: 130, minSmart: 210 } }],
  },
  // ピィ → ピッピ (Lv5 / 夜)
  {
    pokemonId: 173,
    evolvesTo: [{ targetId: 35, conditions: { minLevel: 5, minMental: 50, minLife: 50, timeOfDay: 'night' } }],
  },
  // ピッピ → ピクシー (Lv15)
  {
    pokemonId: 35,
    evolvesTo: [{ targetId: 36, conditions: { minLevel: 15, minMental: 200, minLife: 150 } }],
  },
  // ププリン → プリン (Lv5)
  {
    pokemonId: 174,
    evolvesTo: [{ targetId: 39, conditions: { minLevel: 5, minMental: 50, minLife: 50 } }],
  },
  // プリン → プクリン (Lv15)
  {
    pokemonId: 39,
    evolvesTo: [{ targetId: 40, conditions: { minLevel: 15, minMental: 200, minLife: 150 } }],
  },
  // トゲピー → トゲチック (Lv8 / totalDpEver≥350)
  {
    pokemonId: 175,
    evolvesTo: [{ targetId: 176, conditions: { minLevel: 8, minSmart: 80, minMental: 80, minLife: 70 } }],
  },
  // バルキー → 3種分岐 (Lv10 / totalDpEver≥450)
  {
    pokemonId: 236,
    evolvesTo: [
      {
        targetId: 237, // カポエラー（3属性均等）
        conditions: {
          minLevel: 10,
          minPhysical: 140,
          bias: { dominant: 'physical', over: ['mental', 'smart'], withinRange: 10 },
        },
      },
      {
        targetId: 106, // サワムラー（フィジカル > メンタル）
        conditions: {
          minLevel: 10,
          minPhysical: 140,
          bias: { dominant: 'physical', over: ['mental'] },
        },
      },
      {
        targetId: 107, // エビワラー（フィジカル > スマート）
        conditions: {
          minLevel: 10,
          minPhysical: 140,
          bias: { dominant: 'physical', over: ['smart'] },
        },
      },
    ],
  },
  // メリープ → モコモ (Lv10)
  {
    pokemonId: 179,
    evolvesTo: [{ targetId: 180, conditions: { minLevel: 10, minPhysical: 60, minSmart: 120 } }],
  },
  // モコモ → デンリュウ (Lv18 / totalDpEver≥850)
  {
    pokemonId: 180,
    evolvesTo: [{ targetId: 181, conditions: { minLevel: 18, minSmart: 260 } }],
  },
  // デルビル → ヘルガー (Lv15 / 夜)
  {
    pokemonId: 228,
    evolvesTo: [{ targetId: 229, conditions: { minLevel: 15, minPhysical: 200, minMental: 200, timeOfDay: 'night' } }],
  },
  // ヤミカラス（終点）
  { pokemonId: 198, evolvesTo: null },
  // ムウマ（終点）
  { pokemonId: 200, evolvesTo: null },
  // ハネッコ → ポポッコ (Lv10 / 昼)
  {
    pokemonId: 187,
    evolvesTo: [{ targetId: 188, conditions: { minLevel: 10, minPhysical: 70, minLife: 120, timeOfDay: 'day' } }],
  },
  // ポポッコ → ワタッコ (Lv18 / 昼)
  {
    pokemonId: 188,
    evolvesTo: [{ targetId: 189, conditions: { minLevel: 18, minPhysical: 140, minLife: 260, timeOfDay: 'day' } }],
  },
  // ウパー → ヌオー (Lv10)
  {
    pokemonId: 194,
    evolvesTo: [{ targetId: 195, conditions: { minLevel: 10, minPhysical: 120, minLife: 140 } }],
  },
  // ヒメグマ → リングマ (Lv15)
  {
    pokemonId: 216,
    evolvesTo: [{ targetId: 217, conditions: { minLevel: 15, minPhysical: 250 } }],
  },
  // マグマッグ → マグカルゴ (Lv12 / totalDpEver≥550)
  {
    pokemonId: 218,
    evolvesTo: [{ targetId: 219, conditions: { minLevel: 12, minPhysical: 160, minSmart: 100 } }],
  },
  // イノプー → イノムー (Lv12)
  {
    pokemonId: 220,
    evolvesTo: [{ targetId: 221, conditions: { minLevel: 12, minPhysical: 180, minLife: 90 } }],
  },
  // テッポウオ → オクタン (Lv12)
  {
    pokemonId: 223,
    evolvesTo: [{ targetId: 224, conditions: { minLevel: 12, minSmart: 160, minLife: 100 } }],
  },
  // ブルー → グランブル (Lv12)
  {
    pokemonId: 209,
    evolvesTo: [{ targetId: 210, conditions: { minLevel: 12, minPhysical: 160, minLife: 90 } }],
  },
  // ゴマゾウ → ドンファン (Lv15)
  {
    pokemonId: 231,
    evolvesTo: [{ targetId: 232, conditions: { minLevel: 15, minPhysical: 230, minLife: 110 } }],
  },
  // ムチュール → ルージュラ (Lv10)
  {
    pokemonId: 238,
    evolvesTo: [{ targetId: 124, conditions: { minLevel: 10, minMental: 140, minLife: 100 } }],
  },
  // エレキッド → エレブー (Lv10)
  {
    pokemonId: 239,
    evolvesTo: [{ targetId: 125, conditions: { minLevel: 10, minPhysical: 100, minSmart: 140 } }],
  },
  // ブビィ → ブーバー (Lv10)
  {
    pokemonId: 240,
    evolvesTo: [{ targetId: 126, conditions: { minLevel: 10, minPhysical: 140, minMental: 80 } }],
  },
  // フシギダネ → フシギソウ (Lv10)
  {
    pokemonId: 1,
    evolvesTo: [{ targetId: 2, conditions: { minLevel: 10, minSmart: 80, minLife: 120 } }],
  },
  // フシギソウ → フシギバナ (Lv20 / totalDpEver≥950)
  {
    pokemonId: 2,
    evolvesTo: [{ targetId: 3, conditions: { minLevel: 20, minSmart: 190, minLife: 300 } }],
  },
  // ヒトカゲ → リザード (Lv12)
  {
    pokemonId: 4,
    evolvesTo: [{ targetId: 5, conditions: { minLevel: 12, minPhysical: 160, minMental: 70 } }],
  },
  // リザード → リザードン (Lv22 / totalDpEver≥1050)
  {
    pokemonId: 5,
    evolvesTo: [{ targetId: 6, conditions: { minLevel: 22, minPhysical: 340, minMental: 200 } }],
  },
  // ゼニガメ → カメール (Lv10)
  {
    pokemonId: 7,
    evolvesTo: [{ targetId: 8, conditions: { minLevel: 10, minPhysical: 70, minSmart: 60, minLife: 120 } }],
  },
  // カメール → カメックス (Lv20)
  {
    pokemonId: 8,
    evolvesTo: [{ targetId: 9, conditions: { minLevel: 20, minPhysical: 180, minSmart: 150, minLife: 280 } }],
  },
  // チコリータ → ベイリーフ (Lv10)
  {
    pokemonId: 152,
    evolvesTo: [{ targetId: 153, conditions: { minLevel: 10, minSmart: 90, minLife: 120 } }],
  },
  // ベイリーフ → メガニウム (Lv20)
  {
    pokemonId: 153,
    evolvesTo: [{ targetId: 154, conditions: { minLevel: 20, minSmart: 190, minLife: 300 } }],
  },
  // ヒノアラシ → マグマラシ (Lv12)
  {
    pokemonId: 155,
    evolvesTo: [{ targetId: 156, conditions: { minLevel: 12, minPhysical: 150, minSmart: 70 } }],
  },
  // マグマラシ → バクフーン (Lv22)
  {
    pokemonId: 156,
    evolvesTo: [{ targetId: 157, conditions: { minLevel: 22, minPhysical: 320, minSmart: 190 } }],
  },
  // ワニノコ → アリゲイツ (Lv12)
  {
    pokemonId: 158,
    evolvesTo: [{ targetId: 159, conditions: { minLevel: 12, minPhysical: 160, minLife: 90 } }],
  },
  // アリゲイツ → オーダイル (Lv22)
  {
    pokemonId: 159,
    evolvesTo: [{ targetId: 160, conditions: { minLevel: 22, minPhysical: 340, minLife: 170 } }],
  },
  // ミニリュウ → ハクリュー (Lv15)
  {
    pokemonId: 147,
    evolvesTo: [{ targetId: 148, conditions: { minLevel: 15, minPhysical: 200, minSmart: 160, minLife: 120 } }],
  },
  // ハクリュー → カイリュー (Lv25 / totalDpEver≥1200)
  {
    pokemonId: 148,
    evolvesTo: [{ targetId: 149, conditions: { minLevel: 25, minPhysical: 400, minSmart: 250, minMental: 180, minLife: 200 } }],
  },
  // ヨーギラス → サナギラス (Lv12)
  {
    pokemonId: 246,
    evolvesTo: [{ targetId: 247, conditions: { minLevel: 12, minPhysical: 180, minMental: 90 } }],
  },
  // サナギラス → バンギラス (Lv25)
  {
    pokemonId: 247,
    evolvesTo: [{ targetId: 248, conditions: { minLevel: 25, minPhysical: 450, minSmart: 150, minMental: 230 } }],
  },
];

export function getEvolutionEntry(pokemonId: number): EvolutionEntry | undefined {
  return EVOLUTION_TABLE.find((e) => e.pokemonId === pokemonId);
}
