import { useState, useRef, useEffect } from "react";
import type { AttributeType, ActivityCategory, GameState } from "../types";
import {
  ATTRIBUTE_COLORS,
  ATTRIBUTE_LABELS,
  CATEGORY_LABELS,
  CATEGORY_COEFFICIENTS,
} from "../types";
import { getPokemonName } from "../data/pokemonNames";
import { classifyActivity, respondToActivity } from "../services/geminiService";
import { getStreakMultiplier } from "../hooks/usePokemonEngine";
import {
  getChallengeDefinition,
  getMondayTimestamp,
} from "../data/weeklyChallenges";
import { MoveSelectionModal } from "./MoveSelectionModal";
import type { WeeklyChallenge } from "../types";

interface Props {
  state: GameState;
  onSubmit: (
    text: string,
    attribute: AttributeType,
    category: ActivityCategory,
    targetSlotId: number | null,
    pokemonResponse?: string,
  ) => void;
  onClaimReward: () => void;
  onForgetMove?: (moveToForgot: string) => void;
  onCancelPendingMove?: () => void;
}

const ATTRS: AttributeType[] = ["physical", "smart", "mental", "life"];
const CAT_KEYS: ActivityCategory[] = ["effort", "daily"];

// AI off のとき使うテンプレート返答
const TEMPLATE: Record<ActivityCategory, string[]> = {
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

function getTemplate(cat: ActivityCategory, slotName: string): string {
  const arr = TEMPLATE[cat];
  return arr[Math.floor(Math.random() * arr.length)].replace(
    "ぼく",
    slotName.length <= 4 ? "ぼく" : "わたし",
  );
}

function officialArtUrl(id: number) {
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

function getTodayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

// ===== Compact streak bar =====
function StreakBar({
  streak,
  multiplier,
  isFirstToday,
}: {
  streak: number;
  multiplier: number;
  isFirstToday: boolean;
}) {
  return (
    <div className="streak-bar">
      <span className="streak-bar__fire">🔥</span>
      <span className="streak-bar__days">{streak}</span>
      <span className="streak-bar__label">日連続</span>
      {multiplier > 1.0 && (
        <span className="streak-bar__mult">×{multiplier.toFixed(1)}</span>
      )}
      {isFirstToday && <span className="streak-bar__bonus">今日最初 +30%</span>}
    </div>
  );
}

// ===== Compact challenge bar =====
function ChallengeBar({
  challenge,
  onClaim,
}: {
  challenge: WeeklyChallenge | null;
  onClaim: () => void;
}) {
  if (!challenge) return null;
  const def = getChallengeDefinition(challenge.challengeTypeIndex);
  const pct = Math.min((challenge.current / def.target) * 100, 100);
  const canClaim = challenge.completed && !challenge.rewardClaimed;

  // Check if it's a new week (different weekStart)
  const currentWeekStart = getMondayTimestamp(Date.now());
  if (challenge.weekStart !== currentWeekStart && !canClaim) return null;

  return (
    <div
      className={`challenge-bar${challenge.completed ? " challenge-bar--done" : ""}`}
    >
      <span className="challenge-bar__icon">{def.icon}</span>
      <div className="challenge-bar__body">
        <span className="challenge-bar__title">{def.title}</span>
        <div className="challenge-bar__track">
          <div className="challenge-bar__fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="challenge-bar__num">
          {challenge.current}/{def.target}
        </span>
      </div>
      {canClaim ? (
        <button className="challenge-bar__claim" onClick={onClaim}>
          🎁 {def.rewardDp}DP
        </button>
      ) : challenge.rewardClaimed ? (
        <span className="challenge-bar__claimed">✅</span>
      ) : (
        <span className="challenge-bar__reward">+{def.rewardDp}DP</span>
      )}
    </div>
  );
}

export function ActivityView({
  state,
  onSubmit,
  onClaimReward,
  onForgetMove,
  onCancelPendingMove,
}: Props) {
  const party = state.party.slice(0, state.unlockedSlots);

  const [selectedSlotId, setSelectedSlotId] = useState(
    () => party[0]?.slotId ?? 0,
  );
  const [text, setText] = useState("");
  const [toPool, setToPool] = useState(false);
  const [useAi, setUseAi] = useState(true);
  const [attribute, setAttribute] = useState<AttributeType>("physical");
  const [category, setCategory] = useState<ActivityCategory>("effort");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const currentSlot =
    party.find((s) => s.slotId === selectedSlotId) ?? party[0];
  const isEgg =
    !currentSlot || currentSlot.isEgg || currentSlot.pokemonId === 0;
  const pokemonName = isEgg
    ? "タマゴ"
    : getPokemonName(currentSlot?.pokemonId ?? 0);

  const streak = state.effortStreak ?? 0;
  const multiplier = getStreakMultiplier(streak);
  const todayStr = getTodayStr();
  const isFirstToday = (state.lastEffortDate ?? "") !== todayStr;

  // scroll to bottom when new messages arrive
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [state.chatHistory.length]);

  async function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed || loading) return;
    setError(null);
    setLoading(true);

    try {
      let finalAttr = attribute;
      let finalCat = category;
      let pokemonResponse: string | undefined;

      if (useAi) {
        const result = await classifyActivity(trimmed);
        finalAttr = result.attribute;
        finalCat = result.category;

        if (!isEgg && currentSlot?.pokemonId) {
          pokemonResponse = await respondToActivity(
            currentSlot,
            trimmed,
            finalAttr,
            finalCat,
          );
        } else if (isEgg) {
          pokemonResponse = "🥚 ……（タマゴが温かく震えている）";
        }
      } else {
        pokemonResponse = getTemplate(finalCat, pokemonName);
      }

      onSubmit(
        trimmed,
        finalAttr,
        finalCat,
        toPool ? null : (currentSlot?.slotId ?? null),
        pokemonResponse,
      );
      setText("");
      textareaRef.current?.focus();
    } catch (e) {
      setError(e instanceof Error ? e.message : "エラーが発生しました");
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  // Reversed: oldest first for chat display
  const messages = [...state.chatHistory].reverse();

  return (
    <div className="activity-view">
      {/* ===== 固定ヘッダー ===== */}
      <div className="activity-view__header">
        <StreakBar
          streak={streak}
          multiplier={multiplier}
          isFirstToday={isFirstToday && streak > 0}
        />
        <ChallengeBar
          challenge={state.weeklyChallenge ?? null}
          onClaim={onClaimReward}
        />
      </div>

      {/* ===== パーティセレクター ===== */}
      {party.length > 1 && (
        <div className="activity-party-nav">
          {party.map((slot) => {
            const egg = slot.isEgg || slot.pokemonId === 0;
            const active = slot.slotId === selectedSlotId;
            return (
              <button
                key={slot.slotId}
                className={`activity-party-nav__btn${active ? " active" : ""}`}
                onClick={() => setSelectedSlotId(slot.slotId)}
                aria-label={
                  egg ? "タマゴ" : getPokemonName(slot.pokemonId ?? 0)
                }
              >
                {egg ? (
                  <span className="activity-party-nav__egg">🥚</span>
                ) : (
                  <img
                    src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${slot.pokemonId}.png`}
                    alt={getPokemonName(slot.pokemonId ?? 0)}
                    className="activity-party-nav__sprite"
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {/* ===== チャットエリア ===== */}
      <div className="activity-chat">
        {/* ポケモン紹介 (履歴なし時) */}
        {messages.length === 0 && (
          <div className="activity-chat__intro">
            {isEgg ? (
              <span className="activity-chat__intro-egg">🥚</span>
            ) : (
              <img
                src={officialArtUrl(currentSlot?.pokemonId!)}
                alt={pokemonName}
                className="activity-chat__intro-sprite"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${currentSlot?.pokemonId}.png`;
                }}
              />
            )}
            <div className="activity-chat__intro-name">{pokemonName}</div>
            <div className="activity-chat__intro-hint">
              {isEgg
                ? "タマゴに話しかけてみよう。孵化が近づくよ！"
                : `今日何をしたか${pokemonName}に話しかけてみよう！`}
            </div>
          </div>
        )}

        {/* メッセージ一覧 */}
        {messages.map((act) => {
          const responderSlot =
            act.targetSlotId !== null
              ? state.party.find((s) => s.slotId === act.targetSlotId)
              : currentSlot;
          const responderIsEgg =
            !responderSlot ||
            responderSlot.isEgg ||
            responderSlot.pokemonId === 0;
          const responderName = responderIsEgg
            ? "タマゴ"
            : getPokemonName(responderSlot?.pokemonId ?? 0);

          return (
            <div key={act.id} className="activity-msg-pair">
              {/* ユーザー発言（右） */}
              <div className="activity-msg activity-msg--user">
                <div className="activity-msg__bubble activity-msg__bubble--user">
                  <div className="activity-msg__text">{act.text}</div>
                  <div className="activity-msg__meta">
                    <span style={{ color: ATTRIBUTE_COLORS[act.attribute] }}>
                      {ATTRIBUTE_LABELS[act.attribute]}
                    </span>
                    <span className="activity-msg__cat">
                      {CATEGORY_LABELS[act.category]}
                    </span>
                    <span className="activity-msg__dp">
                      +{act.earnedDp.toFixed(1)} DP
                    </span>
                    <span className="activity-msg__target">
                      {act.targetSlotId !== null
                        ? `→ ${responderName}`
                        : "→ プール"}
                    </span>
                  </div>
                </div>
              </div>

              {/* ポケモン返答（左） */}
              {act.pokemonResponse && (
                <div className="activity-msg activity-msg--pokemon">
                  <div className="activity-msg__avatar">
                    {responderIsEgg ? (
                      <span className="activity-msg__avatar-egg">🥚</span>
                    ) : (
                      <img
                        src={`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${responderSlot?.pokemonId}.png`}
                        alt={responderName}
                        className="activity-msg__avatar-sprite"
                      />
                    )}
                  </div>
                  <div className="activity-msg__bubble activity-msg__bubble--pokemon">
                    <div className="activity-msg__pokemon-name">
                      {responderName}
                    </div>
                    <div className="activity-msg__text">
                      {act.pokemonResponse}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        <div ref={chatEndRef} />
      </div>

      {/* ===== エラー ===== */}
      {error && <div className="chat-error">⚠️ {error}</div>}

      {/* ===== 技習得モーダル ===== */}
      {state.pendingMove && state.pendingMoveSlotId !== null && (
        <MoveSelectionModal
          newMove={state.pendingMove}
          currentMoves={
            state.party.find((s) => s.slotId === state.pendingMoveSlotId)
              ?.learnedMoves ?? []
          }
          onConfirm={(moveToForgot) => {
            onForgetMove?.(moveToForgot);
          }}
          onCancel={() => {
            onCancelPendingMove?.();
          }}
        />
      )}

      {/* ===== 入力エリア ===== */}
      <div className="activity-input">
        <div className="activity-input__controls">
          <label className="activity-input__toggle">
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
                className="activity-input__select"
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
                className="activity-input__select"
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

          <label className="activity-input__toggle activity-input__toggle--pool">
            <input
              type="checkbox"
              checked={toPool}
              onChange={(e) => setToPool(e.target.checked)}
            />
            <span>📦 プールへ</span>
          </label>
        </div>

        <div className="activity-input__row">
          <textarea
            ref={textareaRef}
            className="activity-input__textarea"
            rows={2}
            placeholder={
              isEgg
                ? "タマゴに話しかける… (Enter送信)"
                : `${pokemonName}に話しかける… (Enter送信)`
            }
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <button
            className="activity-input__submit"
            onClick={handleSubmit}
            disabled={loading || !text.trim()}
          >
            {loading ? "⏳" : "送信"}
          </button>
        </div>

        {/* ボーナス表示 */}
        {(multiplier > 1.0 || isFirstToday) && (
          <div className="activity-input__bonus-hint">
            {multiplier > 1.0 &&
              `🔥 ${streak}日ストリーク中 → ×${multiplier.toFixed(1)}`}
            {multiplier > 1.0 && isFirstToday && "  +  "}
            {isFirstToday && "✨ 今日最初の努力 +30%"}
          </div>
        )}
      </div>
    </div>
  );
}
