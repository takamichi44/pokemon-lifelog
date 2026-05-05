import type { ActivityCategory, AttributeType, PokemonSlot } from '../types';
import { getPokemonName } from '../data/pokemonNames';

export interface ClassificationResult {
  attribute: AttributeType;
  category: ActivityCategory;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

// 試すモデルの優先順位（このAPIキーで存在するモデルのみ）
// ※ gemini-1.5-flash 系はこのキーでは利用不可 (404) のため除外
const GEMINI_MODEL_CANDIDATES = [
  'gemini-2.0-flash-lite',   // 最軽量・クォータ消費が少ない
  'gemini-2.0-flash',        // 標準
  'gemini-2.5-flash-lite',   // 新世代 lite
  'gemini-2.5-flash',        // 新世代標準
];

const GEMINI_BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

function getApiKey(): string {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key) throw new Error('VITE_GEMINI_API_KEY が設定されていません。.env ファイルを確認してください。');
  return key;
}

async function callGemini(body: object): Promise<string> {
  const key = getApiKey();
  const errors: string[] = [];

  for (const model of GEMINI_MODEL_CANDIDATES) {
    const url = `${GEMINI_BASE}/${model}:generateContent?key=${key}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      const data = await response.json();
      return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    }

    const errText = await response.text();

    // 404 → モデルが存在しない → 次を試す
    if (response.status === 404) {
      errors.push(`${model}: not found`);
      continue;
    }

    // 429 → クォータ/レート超過 → 次のモデルを試す
    if (response.status === 429) {
      // limit: 0 は課金済みプロジェクトで無料枠が無効になっている特殊ケース
      const isZeroQuota = errText.includes('limit: 0');
      errors.push(`${model}: ${isZeroQuota ? 'free-tier quota=0 (billing project)' : 'rate limit'}`);
      continue;
    }

    // 503 → 高負荷で一時的に利用不可 → 次のモデルを試す
    if (response.status === 503) {
      errors.push(`${model}: service unavailable`);
      continue;
    }

    // それ以外 (400/403/500 等) は即 throw
    throw new Error(`Gemini API エラー (${response.status}) [${model}]: ${errText}`);
  }

  const hasZeroQuota = errors.some((e) => e.includes('quota=0'));
  const hint = hasZeroQuota
    ? 'APIキーが課金プロジェクトに紐付いており無料枠が無効です。\n' +
      'AI Studioで課金なしの新しいプロジェクトを作成するか、\n' +
      'Google Cloud コンソールで Gemini API の有料クォータを確認してください。\n' +
      '（回避策: 「AI分類」チェックをオフにすると手動入力で利用できます）'
    : 'APIキーのクォータまたは課金設定を確認してください。';

  throw new Error(`Gemini APIが利用できません。\n${errors.map((e) => `  • ${e}`).join('\n')}\n${hint}`);
}

// ===== 活動分類 =====

const CLASSIFY_SYSTEM_PROMPT = `あなたは活動分類アシスタントです。ユーザーが入力した活動テキストを分析し、以下の形式でJSONのみを返してください。

分類ルール:
- attribute: "physical"（運動・体を使う活動）| "smart"（学習・知的作業）| "mental"（感情・内省・創作）| "life"（食事・睡眠・人間関係・趣味）
- category: "effort"（意識的な努力が必要な活動: 英語学習、ジム、コーディング等）| "daily"（日常的な活動: 仕事、家事、育児等）

返答形式（JSONのみ、説明不要）:
{"attribute":"physical","category":"effort"}`;

export async function classifyActivity(text: string): Promise<ClassificationResult> {
  const rawText = await callGemini({
    contents: [{ parts: [{ text: CLASSIFY_SYSTEM_PROMPT }, { text: `活動: ${text}` }] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 64 },
  });

  const match = rawText.match(/\{[^}]+\}/);
  if (!match) throw new Error(`Gemini の応答をパースできませんでした: ${rawText}`);

  const parsed = JSON.parse(match[0]) as ClassificationResult;
  const validAttributes: AttributeType[] = ['physical', 'smart', 'mental', 'life'];
  const validCategories: ActivityCategory[] = ['effort', 'daily'];

  if (!validAttributes.includes(parsed.attribute) || !validCategories.includes(parsed.category)) {
    throw new Error(`不正な分類結果: ${match[0]}`);
  }
  return parsed;
}

// ===== 活動への反応（褒め・応援） =====

const ATTR_LABEL_MAP: Record<AttributeType, string> = {
  physical: 'フィジカル（体・運動系）',
  smart:    'スマート（知識・学習系）',
  mental:   'メンタル（心・感情系）',
  life:     'ライフ（生活・日常系）',
};

const PERSONALITY_MAP: Record<string, string> = {
  physical: '元気で活発、体を動かすことが大好き。熱血でストレートな話し方をする。',
  smart:    '知的で冷静、物事を論理的に考える。少し難しい言葉を使うこともある。',
  mental:   '感受性が豊かで繊細。感情豊かに話し、共感を大切にする。',
  life:     '穏やかで優しい。トレーナーをいつも気にかけており、日常の細かいことに喜びを感じる。',
};

export async function respondToActivity(
  slot: PokemonSlot,
  activityText: string,
  attribute: AttributeType,
  category: ActivityCategory,
): Promise<string> {
  const name = getPokemonName(slot.pokemonId ?? 0);
  const { physical, smart, mental, life } = slot.dp;
  const dominant = (
    [['physical', physical], ['smart', smart], ['mental', mental], ['life', life]] as [string, number][]
  ).sort((a, b) => b[1] - a[1])[0][0];

  const categoryDesc =
    category === 'effort'
      ? '意識的な努力・自己研鑽（しっかり頑張った活動）'
      : '日常的な活動・習慣（毎日の積み重ね）';

  const encouragement =
    category === 'effort'
      ? 'この活動を全力で称え、さらに背中を押すような熱い応援をする。'
      : 'この活動を温かく労い、毎日の積み重ねを大切にする言葉をかける。';

  const prompt = `あなたはポケモン「${name}」です。トレーナーが今日の活動を報告してくれました。

【報告された活動】
「${activityText}」

【活動の種類】${ATTR_LABEL_MAP[attribute]}の${categoryDesc}

【あなたの性格】
${PERSONALITY_MAP[dominant] ?? PERSONALITY_MAP.life}

【返答のルール】
- 活動内容に具体的に触れながら反応する
- ${encouragement}
- 2〜3文程度の短い返答
- 一人称は「ぼく」または「わたし」（性格に合わせて）
- 自分の名前（${name}）は使わない
- ポケモンらしい純粋さと愛情を込める`;

  return callGemini({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.85, maxOutputTokens: 150 },
  });
}

// ===== ポケモン会話 =====

function buildPokemonSystemPrompt(slot: PokemonSlot): string {
  const name = getPokemonName(slot.pokemonId ?? 0);
  const { physical, smart, mental, life } = slot.dp;
  const dominant = (
    [['physical', physical], ['smart', smart], ['mental', mental], ['life', life]] as [string, number][]
  ).sort((a, b) => b[1] - a[1])[0][0];

  const personality: Record<string, string> = {
    physical: '元気で活発、体を動かすことが大好き。少し熱血でストレートな話し方をする。',
    smart:    '知的で冷静、物事を論理的に考える。少し難しい言葉を使うこともある。',
    mental:   '感受性が豊かで繊細。感情豊かに話し、共感を大切にする。',
    life:     '穏やかで優しい。トレーナーをいつも気にかけており、日常の細かいことに喜びを感じる。',
  };

  return `あなたはポケモンの「${name}」です。トレーナーと日本語で会話してください。

【あなたのステータス】
フィジカル: ${Math.floor(physical)} / スマート: ${Math.floor(smart)} / メンタル: ${Math.floor(mental)} / ライフ: ${Math.floor(life)}
なつき度: ${Math.floor(slot.totalDpEver)}

【性格】
${personality[dominant] ?? personality.life}

【会話のルール】
- 一人称は「ぼく」または「わたし」（性格に合わせて）
- 自分の名前は「${name}」と呼ぶ
- 自分のステータスや日々の活動、進化への思いを自然に織り交ぜて話す
- トレーナーへの愛情・信頼を表現する
- 2〜4文程度の短い返答にする
- ポケモンらしい純粋さを忘れない`;
}

export async function chatWithPokemon(
  slot: PokemonSlot,
  history: ChatMessage[],
  userMessage: string,
): Promise<string> {
  const systemPrompt = buildPokemonSystemPrompt(slot);

  // Gemini multi-turn形式に変換
  const contents = [
    { role: 'user', parts: [{ text: systemPrompt }] },
    { role: 'model', parts: [{ text: `わかりました！${getPokemonName(slot.pokemonId ?? 0)}として話しますね。` }] },
    ...history.map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    })),
    { role: 'user', parts: [{ text: userMessage }] },
  ];

  return callGemini({
    contents,
    generationConfig: { temperature: 0.9, maxOutputTokens: 256 },
  });
}
