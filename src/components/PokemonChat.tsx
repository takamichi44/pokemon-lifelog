import { useState, useRef, useEffect } from "react";
import type {
  PokemonSlot,
  AttributeType,
  ActivityCategory,
  GameState,
} from "../types";
import {
  ATTRIBUTE_COLORS,
  ATTRIBUTE_LABELS,
  CATEGORY_LABELS,
  CATEGORY_COEFFICIENTS,
} from "../types";
import { getPokemonName } from "../data/pokemonNames";
import {
  classifyActivity,
  respondToActivity,
  respondToConversation,
} from "../services/geminiService";
import { animatedSpriteUrl, onSpriteError } from "../utils/spriteUrl";
import { playPokemonCry } from "../utils/pokemonCry";
import { getStreakMultiplier } from "../hooks/usePokemonEngine";
import { getChallengeDefinition } from "../data/weeklyChallenges";

interface Props {
  slot: PokemonSlot;
  state: GameState;
  onAddActivity: (
    text: string,
    attribute: AttributeType,
    category: ActivityCategory,
    targetSlotId: number | null,
    pokemonResponse?: string,
    isConversation?: boolean,
  ) => void;
  onClaimReward: () => void;
}

const ATTRS: AttributeType[] = ["physical", "smart", "mental", "life"];
const CAT_KEYS: ActivityCategory[] = ["effort", "daily"];

// AIオフのときのテンプレート返答
const TEMPLATES: Record<ActivityCategory, string[]> = {
  effort: [
    "すごい！ぼくとっても嬉しいよ！次も絶対できるよ！",
    "わあ、えらい！トレーナーならできるって思ってた！",
    "かっこいい！ぼくも応援してるから、もっとやれるよ！",
    "すごいすごい！一緒に頑張ろう！",
  ],
  daily: [
    "毎日こつこつって、すごく大事なことだよ。えらいね。",
    "今日もお疲れさま！ゆっくり休んでね。",
    "こういう積み重ねが大切なんだってぼく知ってるよ！",
    "毎日ちゃんとやってて、ぼく感動してるよ。",
  ],
};

function getTemplate(cat: ActivityCategory): string {
  const arr = TEMPLATES[cat];
  return arr[Math.floor(Math.random() * arr.length)];
}

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function PokemonChat({
  slot,
  state,
  onAddActivity,
  onClaimReward,
}: Props) {
  const isEgg = slot.isEgg || slot.pokemonId === 0;
  const name = isEgg ? "タマゴ" : getPokemonName(slot.pokemonId ?? 0);

  const [input, setInput] = useState("");
  const [toPool, setToPool] = useState(false);
  const [useAi, setUseAi] = useState(true);
  const [attribute, setAttribute] = useState<AttributeType>("physical");
  const [category, setCategory] = useState<ActivityCategory>("effort");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // このスロット宛の活動のみを古い順に並べる
  const allForSlot = [...state.chatHistory]
    .filter((a) => a.targetSlotId === slot.slotId)
    .reverse();

  const streak = state.effortStreak ?? 0;
  const multiplier = getStreakMultiplier(streak);
  const todayStr = getTodayStr();
  const isFirstToday = (state.lastEffortDate ?? "") !== todayStr;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.chatHistory.length]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;
    setError(null);
    setLoading(true);

    try {
      let finalAttr = attribute;
      let finalCat = category;
      let response: string | undefined;

      if (useAi) {
        const result = await classifyActivity(text);

        // 雑談判定：DP付与せずポケモンが返答するだけ
        if (result.type === "conversation") {
          if (!isEgg && slot.pokemonId) {
            response = await respondToConversation(slot, text);
            playPokemonCry(slot.pokemonId);
          } else {
            response = "🥚 ……（タマゴがかすかに揺れている）";
          }
          // チャット履歴に「会話」として追加（DP/TPなし）。対象スロットを紐付ける。
          onAddActivity(text, "life", "daily", slot.slotId, response, true);
          setInput("");
          inputRef.current?.focus();
          return;
        }

        finalAttr = result.attribute;
        finalCat = result.category;

        if (!isEgg && slot.pokemonId) {
          response = await respondToActivity(slot, text, finalAttr, finalCat);
          playPokemonCry(slot.pokemonId);
        } else {
          response = "🥚 ……（タマゴが温かく震えている）";
        }
      } else {
        response = getTemplate(finalCat);
      }

      onAddActivity(
        text,
        finalAttr,
        finalCat,
        toPool ? null : slot.slotId,
        response,
      );
      setInput("");
      inputRef.current?.focus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // 週間チャレンジバー
  const challenge = state.weeklyChallenge ?? null;
  const challengeDef = challenge
    ? getChallengeDefinition(challenge.challengeTypeIndex)
    : null;
  const challengePct =
    challenge && challengeDef
      ? Math.min((challenge.current / challengeDef.target) * 100, 100)
      : 0;
  const canClaim = challenge?.completed && !challenge.rewardClaimed;

  return (
    <div className="pokemon-chat">
      {/* ===== ストリーク + チャレンジバー ===== */}
      <div className="pokemon-chat__status-bar">
        {/* ストリーク */}
        <div className="pokemon-chat__streak">
          <span>🔥</span>
          <span className="pokemon-chat__streak-days">{streak}</span>
          <span className="pokemon-chat__streak-label">日連続</span>
          {multiplier > 1.0 && (
            <span className="pokemon-chat__streak-mult">
              ×{multiplier.toFixed(1)}
            </span>
          )}
          {isFirstToday && streak > 0 && (
            <span className="pokemon-chat__streak-bonus">今日最初 +30%</span>
          )}
        </div>

        {/* チャレンジ */}
        {challenge && challengeDef && (
          <div className="pokemon-chat__challenge">
            <span className="pokemon-chat__challenge-icon">
              {challengeDef.icon}
            </span>
            <div className="pokemon-chat__challenge-track">
              <div
                className="pokemon-chat__challenge-fill"
                style={{
                  width: `${challengePct}%`,
                  background: challenge.completed ? "#22c55e" : undefined,
                }}
              />
            </div>
            <span className="pokemon-chat__challenge-num">
              {challenge.current}/{challengeDef.target}
            </span>
            {canClaim ? (
              <button
                className="pokemon-chat__challenge-claim"
                onClick={onClaimReward}
              >
                🎁 {challengeDef.rewardDp}DP
              </button>
            ) : challenge.rewardClaimed ? (
              <span className="pokemon-chat__challenge-done">✅</span>
            ) : (
              <span className="pokemon-chat__challenge-reward">
                +{challengeDef.rewardDp}DP
              </span>
            )}
          </div>
        )}
      </div>

      {/* ===== チャット履歴 ===== */}
      <div className="pokemon-chat__history">
        {/* グリーティング（常に先頭） */}
        <div className="pokemon-chat__bubble pokemon-chat__bubble--model">
          {!isEgg && slot.pokemonId && (
            <img
              src={animatedSpriteUrl(slot.pokemonId)}
              alt={name}
              className="pokemon-chat__avatar-sprite"
              onError={(e) => onSpriteError(e, slot.pokemonId!)}
            />
          )}
          <div className="pokemon-chat__bubble-body">
            <span className="pokemon-chat__speaker">{name}</span>
            <div className="pokemon-chat__text">
              {isEgg
                ? "🥚 ……（タマゴがかすかに動いている）"
                : `やあ、トレーナー！ぼく${name}だよ。今日何をしたか話してみて！`}
            </div>
          </div>
        </div>

        {/* 活動記録 */}
        {allForSlot.map((act) => (
          <div key={act.id} className="pokemon-chat__pair">
            {/* ユーザー発言（右） */}
            <div className="pokemon-chat__bubble pokemon-chat__bubble--user">
              <div className="pokemon-chat__text">{act.text}</div>
              <div className="pokemon-chat__meta">
                <span style={{ color: ATTRIBUTE_COLORS[act.attribute] }}>
                  {ATTRIBUTE_LABELS[act.attribute]}
                </span>
                <span className="pokemon-chat__cat">
                  {CATEGORY_LABELS[act.category]}
                </span>
                <span className="pokemon-chat__dp">
                  +{act.earnedDp.toFixed(1)} DP
                </span>
              </div>
            </div>

            {/* ポケモン返答（左） */}
            {act.pokemonResponse && (
              <div className="pokemon-chat__bubble pokemon-chat__bubble--model">
                {!isEgg && slot.pokemonId && (
                  <img
                    src={animatedSpriteUrl(slot.pokemonId)}
                    alt={name}
                    className="pokemon-chat__avatar-sprite"
                    onError={(e) => onSpriteError(e, slot.pokemonId!)}
                  />
                )}
                <div className="pokemon-chat__bubble-body">
                  <span className="pokemon-chat__speaker">{name}</span>
                  <div className="pokemon-chat__text">
                    {act.pokemonResponse}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* ローディング中 */}
        {loading && (
          <div className="pokemon-chat__bubble pokemon-chat__bubble--model">
            {!isEgg && slot.pokemonId && (
              <img
                src={animatedSpriteUrl(slot.pokemonId)}
                alt={name}
                className="pokemon-chat__avatar-sprite"
                onError={(e) => onSpriteError(e, slot.pokemonId!)}
              />
            )}
            <div className="pokemon-chat__bubble-body">
              <span className="pokemon-chat__speaker">{name}</span>
              <div className="pokemon-chat__thinking">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        )}

        {error && <div className="pokemon-chat__error">⚠️ {error}</div>}
        <div ref={bottomRef} />
      </div>

      {/* ===== 入力フォーム ===== */}
      <div className="pokemon-chat__form">
        <div className="pokemon-chat__form-controls">
          <label className="pokemon-chat__toggle">
            <input
              type="checkbox"
              checked={useAi}
              onChange={(e) => setUseAi(e.target.checked)}
            />
            <span>AI分類</span>
          </label>

          {!useAi && (
            <>
              <select
                className="pokemon-chat__select"
                value={attribute}
                onChange={(e) => setAttribute(e.target.value as AttributeType)}
              >
                {ATTRS.map((a) => (
                  <option key={a} value={a}>
                    {ATTRIBUTE_LABELS[a]}
                  </option>
                ))}
              </select>
              <select
                className="pokemon-chat__select"
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value as ActivityCategory)
                }
              >
                {CAT_KEYS.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]} ×{CATEGORY_COEFFICIENTS[c]}
                  </option>
                ))}
              </select>
            </>
          )}

          <label className="pokemon-chat__toggle pokemon-chat__toggle--pool">
            <input
              type="checkbox"
              checked={toPool}
              onChange={(e) => setToPool(e.target.checked)}
            />
            <span>📦 プールへ</span>
          </label>
        </div>

        <div className="pokemon-chat__input-row">
          <textarea
            ref={inputRef}
            className="pokemon-chat__input"
            rows={2}
            placeholder={
              isEgg
                ? "タマゴに話しかける… (Enter送信)"
                : `${name}に話しかける… (Enter送信)`
            }
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <button
            className="pokemon-chat__send"
            onClick={handleSend}
            disabled={loading || !input.trim()}
          >
            {loading ? "⏳" : "送信"}
          </button>
        </div>

        {/* ボーナス表示 */}
        {(multiplier > 1.0 || isFirstToday) && (
          <div className="pokemon-chat__bonus-hint">
            {multiplier > 1.0 &&
              `🔥 ${streak}日ストリーク ×${multiplier.toFixed(1)}`}
            {multiplier > 1.0 && isFirstToday && " + "}
            {isFirstToday && "✨ 今日最初の努力 +30%"}
          </div>
        )}
      </div>
    </div>
  );
}
