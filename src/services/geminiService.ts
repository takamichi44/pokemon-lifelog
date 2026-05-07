import type { ActivityCategory, AttributeType, PokemonSlot } from '../types';
import { getPokemonName } from '../data/pokemonNames';
import { getSpeechTic } from '../data/pokemonSpeechTics';

export interface ClassificationResult {
  type: 'activity' | 'conversation';
  attribute: AttributeType;
  category: ActivityCategory;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
}

// 試すモデルの優先順位
const GEMINI_MODEL_CANDIDATES = [
  'gemini-2.0-flash-lite',
  'gemini-2.0-flash',
  'gemini-2.5-flash-lite',
  'gemini-2.5-flash',
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

    if (response.status === 404) { errors.push(`${model}: not found`); continue; }
    if (response.status === 429) {
      const isZeroQuota = errText.includes('limit: 0');
      errors.push(`${model}: ${isZeroQuota ? 'free-tier quota=0 (billing project)' : 'rate limit'}`);
      continue;
    }
    if (response.status === 503) { errors.push(`${model}: service unavailable`); continue; }

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

// ===== 活動分類 + 会話判定 =====

const CLASSIFY_SYSTEM_PROMPT = `あなたは活動分類アシスタントです。ユーザーの入力が「活動報告」か「ただの会話」かを判定し、JSONのみを返してください。

判定ルール:
- 活動報告: 「〜した」「〜やった」「〜行った」など、何か行動・出来事を報告している
- ただの会話: 挨拶、質問、雑談、感情表現など、活動報告でないもの

活動報告の場合:
- type: "activity"
- attribute: "physical"（運動・体）| "smart"（学習・知的）| "mental"（感情・創作）| "life"（食事・睡眠・日常）
- category: "effort"（意識的な努力: 英語学習、ジム等）| "daily"（日常活動: 仕事、家事等）

会話の場合:
- type: "conversation"
- attribute と category は "life" / "daily" を入れる（無視される）

返答形式（JSONのみ）:
活動例: {"type":"activity","attribute":"physical","category":"effort"}
会話例: {"type":"conversation","attribute":"life","category":"daily"}`;

export async function classifyActivity(text: string): Promise<ClassificationResult> {
  const rawText = await callGemini({
    contents: [{ parts: [{ text: CLASSIFY_SYSTEM_PROMPT }, { text: `入力: ${text}` }] }],
    generationConfig: { temperature: 0.1, maxOutputTokens: 64 },
  });

  const match = rawText.match(/\{[^}]+\}/);
  if (!match) throw new Error(`Gemini の応答をパースできませんでした: ${rawText}`);

  const parsed = JSON.parse(match[0]) as ClassificationResult;
  if (parsed.type === 'conversation') return parsed;

  const validAttributes: AttributeType[] = ['physical', 'smart', 'mental', 'life'];
  const validCategories: ActivityCategory[] = ['effort', 'daily'];
  if (!validAttributes.includes(parsed.attribute) || !validCategories.includes(parsed.category)) {
    throw new Error(`不正な分類結果: ${match[0]}`);
  }
  return parsed;
}

// ===== 語尾ルール =====
function getSpeechTicRule(pokemonId: number): string {
  const tic = getSpeechTic(pokemonId);
  return `- 文末に「〜${tic}」という語尾をつける（例: 「すごい${tic}！」「頑張って${tic}ね」）`;
}

// ===== 性格マップ =====
const PERSONALITY_MAP: Record<string, string> = {
  physical: '元気で活発、体を動かすことが大好き。熱血でストレートな話し方をする。',
  smart:    '知的で冷静、物事を論理的に考える。少し難しい言葉を使うこともある。',
  mental:   '感受性が豊かで繊細。感情豊かに話し、共感を大切にする。',
  life:     '穏やかで優しい。トレーナーをいつも気にかけており、日常の細かいことに喜びを感じる。',
};

const ATTR_LABEL_MAP: Record<AttributeType, string> = {
  physical: 'フィジカル（体・運動系）',
  smart:    'スマート（知識・学習系）',
  mental:   'メンタル（心・感情系）',
  life:     'ライフ（生活・日常系）',
};

function getDominant(slot: PokemonSlot): string {
  const { physical, smart, mental, life } = slot.dp;
  return (
    [['physical', physical], ['smart', smart], ['mental', mental], ['life', life]] as [string, number][]
  ).sort((a, b) => b[1] - a[1])[0][0];
}

// ===== 活動への反応（褒め・応援） =====

export async function respondToActivity(
  slot: PokemonSlot,
  activityText: string,
  attribute: AttributeType,
  category: ActivityCategory,
): Promise<string> {
  const name = getPokemonName(slot.pokemonId ?? 0);
  const dominant = getDominant(slot);

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
- ポケモンらしい純粋さと愛情を込める
${getSpeechTicRule(slot.pokemonId ?? 0)}`;

  return callGemini({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.85, maxOutputTokens: 150 },
  });
}

// ===== 雑談への返答（DP付与なし） =====

export async function respondToConversation(
  slot: PokemonSlot,
  userMessage: string,
): Promise<string> {
  const name = getPokemonName(slot.pokemonId ?? 0);
  const dominant = getDominant(slot);
  const { physical, smart, mental, life } = slot.dp;

  const prompt = `あなたはポケモン「${name}」です。トレーナーから話しかけられました。

【トレーナーのメッセージ】
「${userMessage}」

【あなたのステータス】
フィジカル: ${Math.floor(physical)} / スマート: ${Math.floor(smart)} / メンタル: ${Math.floor(mental)} / ライフ: ${Math.floor(life)}

【あなたの性格】
${PERSONALITY_MAP[dominant] ?? PERSONALITY_MAP.life}

【返答のルール】
- 自然に会話する（活動報告への反応ではなく、雑談として）
- 2〜3文程度の短い返答
- 一人称は「ぼく」または「わたし」（性格に合わせて）
- 自分の名前（${name}）は使わない
- ポケモンらしい純粋さと愛情を込める
${getSpeechTicRule(slot.pokemonId ?? 0)}`;

  return callGemini({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.9, maxOutputTokens: 150 },
  });
}

// ===== ポケモン会話（履歴付き） =====

function buildPokemonSystemPrompt(slot: PokemonSlot): string {
  const name = getPokemonName(slot.pokemonId ?? 0);
  const dominant = getDominant(slot);
  const { physical, smart, mental, life } = slot.dp;

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
- ポケモンらしい純粋さを忘れない
${getSpeechTicRule(slot.pokemonId ?? 0)}`;
}

export async function chatWithPokemon(
  slot: PokemonSlot,
  history: ChatMessage[],
  userMessage: string,
): Promise<string> {
  const systemPrompt = buildPokemonSystemPrompt(slot);

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
