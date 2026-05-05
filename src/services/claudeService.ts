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

const MODEL = 'claude-haiku-4-5';
const API_URL = 'https://api.anthropic.com/v1/messages';

function getApiKey(): string {
  const key = import.meta.env.VITE_ANTHROPIC_API_KEY;
  if (!key) throw new Error('VITE_ANTHROPIC_API_KEY が設定されていません。.env ファイルを確認してください。');
  return key;
}

async function callClaude(
  systemPrompt: string,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>,
  maxTokens = 256,
): Promise<string> {
  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'x-api-key': getApiKey(),
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
      'anthropic-dangerous-direct-browser-access': 'true',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Claude API エラー (${res.status}): ${err}`);
  }

  const data = await res.json();
  return (data.content as Array<{ type: string; text: string }>)
    .filter((c) => c.type === 'text')
    .map((c) => c.text)
    .join('');
}

// ===== 活動分類 =====

const CLASSIFY_SYSTEM = `あなたは活動分類アシスタントです。ユーザーが入力した活動テキストを分析し、JSONのみを返してください。

分類ルール:
- attribute: "physical"（運動・体を使う活動）| "smart"（学習・知的作業）| "mental"（感情・内省・創作）| "life"（食事・睡眠・人間関係・趣味）
- category: "effort"（意識的な努力: 英語学習・ジム・コーディング等）| "daily"（日常的な活動: 仕事・家事・育児等）

返答形式（JSONのみ、説明不要）:
{"attribute":"physical","category":"effort"}`;

export async function classifyActivity(text: string): Promise<ClassificationResult> {
  const raw = await callClaude(
    CLASSIFY_SYSTEM,
    [{ role: 'user', content: `活動: ${text}` }],
    64,
  );

  const match = raw.match(/\{[^}]+\}/);
  if (!match) throw new Error(`応答をパースできませんでした: ${raw}`);

  const parsed = JSON.parse(match[0]) as ClassificationResult;
  const validAttributes: AttributeType[] = ['physical', 'smart', 'mental', 'life'];
  const validCategories: ActivityCategory[] = ['effort', 'daily'];

  if (!validAttributes.includes(parsed.attribute) || !validCategories.includes(parsed.category)) {
    throw new Error(`不正な分類結果: ${match[0]}`);
  }
  return parsed;
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

  // 先頭の model メッセージ（初期挨拶）をスキップし、Claude 形式に変換
  // Claude は user/assistant の交互が必要なため、先頭の model メッセージは除外
  let startIdx = 0;
  while (startIdx < history.length && history[startIdx].role === 'model') {
    startIdx++;
  }

  const messages: Array<{ role: 'user' | 'assistant'; content: string }> = [
    ...history.slice(startIdx).map((m) => ({
      role: (m.role === 'model' ? 'assistant' : 'user') as 'user' | 'assistant',
      content: m.text,
    })),
    { role: 'user', content: userMessage },
  ];

  return callClaude(systemPrompt, messages, 256);
}
