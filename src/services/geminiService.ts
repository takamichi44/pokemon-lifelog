import type { ActivityCategory, AttributeType, PokemonSlot } from "../types";
import { getPokemonName } from "../data/pokemonNames";
import { getSpeechTic } from "../data/pokemonSpeechTics";

export interface ClassificationResult {
  type: "activity" | "conversation";
  attribute: AttributeType;
  category: ActivityCategory;
}

export interface ChatMessage {
  role: "user" | "model";
  text: string;
}

// 試すモデルの優先順位
const GEMINI_MODEL_CANDIDATES = [
  "gemini-2.0-flash-lite",
  "gemini-2.0-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-flash",
];

const GEMINI_BASE = "https://generativelanguage.googleapis.com/v1beta/models";

function getApiKey(): string {
  const key = import.meta.env.VITE_GEMINI_API_KEY;
  if (!key)
    throw new Error(
      "VITE_GEMINI_API_KEY が設定されていません。.env ファイルを確認してください。",
    );
  return key;
}

async function callGemini(body: object): Promise<string> {
  const key = getApiKey();
  const errors: string[] = [];

  for (const model of GEMINI_MODEL_CANDIDATES) {
    const url = `${GEMINI_BASE}/${model}:generateContent?key=${key}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (response.ok) {
      const data = await response.json();
      return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    }

    const errText = await response.text();

    if (response.status === 404) {
      errors.push(`${model}: not found`);
      continue;
    }
    if (response.status === 429) {
      const isZeroQuota = errText.includes("limit: 0");
      errors.push(
        `${model}: ${isZeroQuota ? "free-tier quota=0 (billing project)" : "rate limit"}`,
      );
      continue;
    }
    if (response.status === 503) {
      errors.push(`${model}: service unavailable`);
      continue;
    }

    throw new Error(
      `Gemini API エラー (${response.status}) [${model}]: ${errText}`,
    );
  }

  const hasZeroQuota = errors.some((e) => e.includes("quota=0"));
  const hint = hasZeroQuota
    ? "APIキーが課金プロジェクトに紐付いており無料枠が無効です。\n" +
      "AI Studioで課金なしの新しいプロジェクトを作成するか、\n" +
      "Google Cloud コンソールで Gemini API の有料クォータを確認してください。\n" +
      "（回避策: 「AI分類」チェックをオフにすると手動入力で利用できます）"
    : "APIキーのクォータまたは課金設定を確認してください。";

  throw new Error(
    `Gemini APIが利用できません。\n${errors.map((e) => `  • ${e}`).join("\n")}\n${hint}`,
  );
}

// ===== 活動分類 + 会話判定 =====

const CLASSIFY_SYSTEM_PROMPT = `あなたは活動分類アシスタントです。ユーザーの入力が「活動報告」か「ただの会話」かを判定してください。

【重要】コードブロック（\`\`\`）は絶対に使わないでください。JSONオブジェクトのみを出力してください。

判定ルール:
- 活動報告: 「〜した」「〜やった」「〜行った」など、何か行動・出来事を報告している
- ただの会話: 挨拶、質問、雑談、感情表現など、活動報告でないもの

活動報告の場合:
- type: "activity"
- attribute: "physical"（運動・スポーツ・筋トレ・ランニング・ヨガ・体を動かす活動）| "smart"（勉強・読書・仕事・プログラミング・語学・資格・知的な作業）| "mental"（日記・手帳を書いた、友達や家族と話した・食事した、映画や音楽・アニメ・ゲームを楽しんだ、絵を描いた・楽器を弾いた・創作した、瞑想・マインドフルネス、悩みを整理した・感謝を伝えた、カウンセリング、自分の感情や人間関係にまつわる活動）| "life"（食事・料理・お弁当、睡眠・休養・お昼寝、入浴・シャワー、家事・掃除・洗濯・片付け、散歩・通勤など日常のルーティン）
- category: "effort"（意識的な努力: 英語学習、ジム等）| "daily"（日常活動: 仕事、家事等）

会話の場合:
- type: "conversation"
- attribute と category は "life" / "daily" を入れる（無視される）

出力例（このJSON形式のみ、余計なテキストなし）:
{"type":"activity","attribute":"physical","category":"effort"}
{"type":"conversation","attribute":"life","category":"daily"}`;

function extractJsonFromGemini(rawText: string): string | null {
  // コードフェンス（```json ... ``` / ``` ... ```）を除去してから探す
  const fenceMatch = rawText.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  // フェンスが不完全な場合でも rawText 全体から { を探す
  const content = fenceMatch?.[1]?.trim() ?? rawText.replace(/```(?:json)?/gi, "").trim();

  const start = content.indexOf("{");
  if (start < 0) return null;

  let depth = 0;
  for (let i = start; i < content.length; i += 1) {
    const char = content[i];
    if (char === "{") depth += 1;
    if (char === "}") depth -= 1;
    if (depth === 0) {
      return content.slice(start, i + 1).trim();
    }
  }

  return null;
}

export async function classifyActivity(
  text: string,
): Promise<ClassificationResult> {
  const rawText = await callGemini({
    contents: [
      { parts: [{ text: CLASSIFY_SYSTEM_PROMPT }, { text: `入力: ${text}` }] },
    ],
    generationConfig: { temperature: 0.1, maxOutputTokens: 200 },
  });

  const jsonText = extractJsonFromGemini(rawText);
  if (!jsonText) {
    throw new Error(`Gemini の応答をパースできませんでした: ${rawText}`);
  }

  const parsed = JSON.parse(jsonText) as ClassificationResult;
  if (parsed.type === "conversation") return parsed;

  const validAttributes: AttributeType[] = [
    "physical",
    "smart",
    "mental",
    "life",
  ];
  const validCategories: ActivityCategory[] = ["effort", "daily"];
  if (
    !validAttributes.includes(parsed.attribute) ||
    !validCategories.includes(parsed.category)
  ) {
    throw new Error(`不正な分類結果: ${jsonText}`);
  }
  return parsed;
}

// ===== ポケモンごとの個性定義 =====

const POKEMON_CHARACTERS: Record<number, string> = {
  // ピカチュウ系
  172: "まだ小さくて電気の制御が下手。よく自分でビリッとしてしまう。でも負けず嫌いで一生懸命。",
  25: "すばしっこくて自由奔放。感情がダイレクトに出る。嬉しいと尻尾をぶんぶん振る。",
  26: "でんきタイプの大ベテラン。落ち着いているが、テンションが上がると放電する。",
  // ピッピ系
  173: "星に願いを込めるのが大好き。ふわふわしていてマイペース。",
  35: "歌が大好きで歌いだすと止まらない。誰にでも優しく、月明かりが似合う。",
  36: "魔法のような技を使う。おっとりしているが、強い意志を持っている。",
  // プリン系
  174: "歌でみんなを眠らせてしまう。本人は一生懸命歌っているつもり。少し気分屋。",
  39: "歌いだしたら止まらない。眠らせちゃうのは本当に困っているが、歌は誰より好き。",
  40: "ふわふわのボディが自慢。ハッピーな雰囲気を周りに振りまく。",
  // トゲピー系
  175: "幸せのシンボル。純粋無垢でどんな状況でもニコニコしている。",
  176: "空を飛ぶことが大好き。友達想いで、トレーナーのことが大切。",
  // バルキー系
  236: "格闘の道を極めたい武闘派。ストイックだが、どこか不器用。",
  106: "蹴り技一筋。足の速さが自慢で、素早さには絶対の自信がある。",
  107: "正確なパンチが必殺技。誠実で真面目、約束は絶対に守る。",
  237: "回転技の達人。バランス感覚が抜群で、常にクールを保っている。",
  // メリープ系
  179: "モフモフの毛が自慢。静電気でよくトレーナーにくっつく。おっとり系。",
  180: "少し大人になった気分。毛が短くなって少し恥ずかしがり屋になった。",
  181: "電気をばちばち放電する。誇り高いが、意外と面倒見がいい。",
  // デルビル系
  228: "夜行性でクールぶっているが、実は寂しがり屋。コマタナで物を切るのが得意。",
  229: "強がりだが情には厚い。仲間を守るためなら全力で戦う。",
  // ハネッコ系
  187: "風に乗って旅するのが夢。小さいけど好奇心旺盛。",
  188: "お日様が大好き。晴れの日はテンションが爆上がりする。",
  189: "綿毛を飛ばして全国制覇したい。自由と冒険が大好き。",
  // ウパー系
  194: "ニッコリ顔がトレードマーク。水も陸も得意でのんびり屋。",
  195: "どろどろのフィールドが好き。ゆったりしているが、技は強力。",
  // ヒメグマ系
  216: "ハチミツが大好きで、においを嗅ぎつけるとテンションMAX。おとなしいが甘いものには弱い。",
  217: "大きな体でパワフル。でも蜂蜜への愛は健在。",
  // イノプー系
  220: "寒さに強くて雪の中でも元気。好奇心が強く地面を掘るのが好き。",
  221: "巨大な牙が自慢。力強いが、意外と臆病な一面もある。",
  // ゴマゾウ系
  231: "長い鼻を使ってあらゆるものを覚える。記憶力がよく、頭がいい。",
  232: "転がって突進するのが得意。頑固だが仲間のためには一直線。",
  // テッポウオ系
  223: "水中から精密なウォータースポットを打つ職人気質。",
  224: "タコのような知性派。インクで目くらましをするのが得意。",
  // マグマッグ系
  218: "溶岩をまとったスライム。熱いけど意外と繊細。",
  219: "ゆっくり動くが、その背中は城のように固い。",
  // ブルー系
  209: "見た目は怖いが実は臆病。叫び声でよく自分も驚く。",
  210: "大きな口が武器。威圧感はあるが、慣れると陽気。",
  // ミニリュウ系
  147: "竜の子、まだ小さいがいつか空を飛ぶのが夢。純粋でひたむき。",
  148: "りゅうのいかりを覚えた。プライドが高いが、トレーナーへの忠誠心は誰より強い。",
  149: "空を自由に飛び回る。穏やかだが怒らせると手がつけられない。",
  // ヨーギラス系
  246: "砂漠生まれの暴れん坊。エネルギーが有り余っている。",
  247: "硬い殻に閉じこもって成長中。何かを考えているような不思議な雰囲気。",
  248: "圧倒的な力を持つ王者。静かな威圧感があり、言葉は少ない。",
  // 御三家・フシギダネ系
  1: "のんびり屋だが芯は強い。背中の球から良い匂いがしてきたら機嫌がいい証拠。",
  2: "少し大人になった感じ。背中の花が咲いてきて、なんか恥ずかしい。",
  3: "大きな花を誇らしげに咲かせる。草タイプの誇りを持つ、頼れる存在。",
  // 御三家・ヒトカゲ系
  4: "負けず嫌いで熱血。しっぽの炎は気持ちのバロメーター。",
  5: "ちょっとやんちゃになってきた。炎の威力が増してきて、少しドヤっている。",
  6: "空の覇者。プライドが高いが、信頼したトレーナーには心を開く。",
  // 御三家・ゼニガメ系
  7: "真面目で礼儀正しい。甲羅の中に引っ込む癖があるが、慣れた相手には出てくる。",
  8: "少しツンデレになってきた。カメールになって自信がついた。",
  9: "大砲のキャノンが自慢。どっしりと構えた頼もしい存在。",
  // 御三家・チコリータ系
  152: "草の香りが好き。ちょっとわがままだが、愛情表現が豊か。",
  153: "花の首飾りが増えてきた。少し大人びてきて、ゆったりとした余裕がある。",
  154: "大きな花を揺らして歩く。穏やかな強さを持ち、仲間を癒す。",
  // 御三家・ヒノアラシ系
  155: "臆病だが火のついた背中は本物。一歩踏み出すといつも全力。",
  156: "ちょっとカッコよくなった気がしている。炎が体を覆ってきた。",
  157: "火山のような情熱の持ち主。短気だがトレーナーへの愛情は深い。",
  // 御三家・ワニノコ系
  158: "やんちゃでいたずら好き。あごの力には自信あり。",
  159: "ちょっと強面になってきた。でも根はやんちゃなまま。",
  160: "水面を制する王者。豪快に見えて戦略家でもある。",
};

// 属性ベースのフォールバック個性
const FALLBACK_PERSONALITIES: Record<string, string> = {
  physical: "元気いっぱいで活発。感情がそのまま言葉に出る熱血タイプ。",
  smart: "知的で観察眼がある。少し冷静に物事を見る傾向がある。",
  mental: "感受性が豊かで感情移入しやすい。共感することが得意。",
  life: "穏やかで誰にでも優しい。日常の小さなことに喜びを見つける。",
};

function getDominant(slot: PokemonSlot): string {
  const { physical, smart, mental, life } = slot.dp;
  return (
    [
      ["physical", physical],
      ["smart", smart],
      ["mental", mental],
      ["life", life],
    ] as [string, number][]
  ).sort((a, b) => b[1] - a[1])[0][0];
}

function getCharacter(slot: PokemonSlot): string {
  const id = slot.pokemonId ?? 0;
  return (
    POKEMON_CHARACTERS[id] ??
    FALLBACK_PERSONALITIES[getDominant(slot)] ??
    FALLBACK_PERSONALITIES.life
  );
}

// ===== 活動への反応（褒め・応援） =====

export async function respondToActivity(
  slot: PokemonSlot,
  activityText: string,
  _attribute: AttributeType,
  category: ActivityCategory,
  trainerName = "トレーナー",
): Promise<string> {
  const name = getPokemonName(slot.pokemonId ?? 0);
  const tic = getSpeechTic(slot.pokemonId ?? 0);
  const character = getCharacter(slot);

  const effortOrDaily =
    category === "effort"
      ? "全力で称えて背中を押す"
      : "温かく労って毎日の積み重ねを讃える";

  const prompt = `あなたはポケモン「${name}」です。
キャラクター: ${character}
語尾: 文末は「〜${tic}」にする（例:「すごい${tic}！」「やったね${tic}」）

トレーナーの名前は「${trainerName}」。トレーナーが活動を報告してきた。${effortOrDaily}ような返答を2文でする。
自分の名前は使わない。トレーナーを名前で呼ぶこと。活動内容（「${activityText}」）に具体的に触れること。
フランクに、キャラクターの個性を前面に出して話す。`;

  return callGemini({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.9, maxOutputTokens: 120 },
  });
}

// ===== 雑談への返答（DP付与なし） =====

export async function respondToConversation(
  slot: PokemonSlot,
  userMessage: string,
  trainerName = "トレーナー",
): Promise<string> {
  const name = getPokemonName(slot.pokemonId ?? 0);
  const tic = getSpeechTic(slot.pokemonId ?? 0);
  const character = getCharacter(slot);

  const prompt = `あなたはポケモン「${name}」です。
キャラクター: ${character}
語尾: 文末は「〜${tic}」にする（例:「そうだね${tic}」「えっ本当${tic}？」）

トレーナーの名前は「${trainerName}」。トレーナーが話しかけてきた: 「${userMessage}」
自然に雑談として2文で返す。自分の名前は使わない。トレーナーを名前で呼ぶこと。
フランクに、このポケモンらしい個性を出して話す。`;

  return callGemini({
    contents: [{ parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.95, maxOutputTokens: 120 },
  });
}

// ===== ポケモン会話（履歴付き） =====

function buildPokemonSystemPrompt(slot: PokemonSlot): string {
  const name = getPokemonName(slot.pokemonId ?? 0);
  const tic = getSpeechTic(slot.pokemonId ?? 0);
  const character = getCharacter(slot);
  const { physical, smart, mental, life } = slot.dp;

  return `あなたはポケモンの「${name}」です。日本語でトレーナーと会話してください。

キャラクター: ${character}
ステータス: フィジカル${Math.floor(physical)} / スマート${Math.floor(smart)} / メンタル${Math.floor(mental)} / ライフ${Math.floor(life)} / なつき度${Math.floor(slot.totalDpEver)}

語尾: 文末は必ず「〜${tic}」にする。
自分の名前は使わない。一人称は「ぼく」か「わたし」。
2〜3文で、キャラクターの個性を全面に出してフランクに話す。`;
}

export async function chatWithPokemon(
  slot: PokemonSlot,
  history: ChatMessage[],
  userMessage: string,
): Promise<string> {
  const systemPrompt = buildPokemonSystemPrompt(slot);

  const contents = [
    { role: "user", parts: [{ text: systemPrompt }] },
    {
      role: "model",
      parts: [
        {
          text: `わかった！${getPokemonName(slot.pokemonId ?? 0)}として話すね。`,
        },
      ],
    },
    ...history.map((m) => ({
      role: m.role,
      parts: [{ text: m.text }],
    })),
    { role: "user", parts: [{ text: userMessage }] },
  ];

  return callGemini({
    contents,
    generationConfig: { temperature: 0.95, maxOutputTokens: 200 },
  });
}
