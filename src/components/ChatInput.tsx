import { useState, useRef } from 'react';
import type { Activity, AttributeType, ActivityCategory, PokemonSlot } from '../types';
import {
  ATTRIBUTE_LABELS,
  ATTRIBUTE_COLORS,
  CATEGORY_LABELS,
  CATEGORY_COEFFICIENTS,
  BASE_DP_PER_ACTIVITY,
} from '../types';
import { getPokemonName } from '../data/pokemonNames';
import { classifyActivity } from '../services/geminiService';

interface Props {
  chatHistory: Activity[];
  selectedSlotId: number | null;
  unlockedSlots: number;
  party: PokemonSlot[];
  onSubmit: (
    text: string,
    attribute: AttributeType,
    category: ActivityCategory,
    targetSlotId: number | null,
  ) => void;
}

const ATTR_KEYS: AttributeType[] = ['physical', 'smart', 'mental', 'life'];
const CAT_KEYS: ActivityCategory[] = ['effort', 'daily'];

function slotLabel(slot: PokemonSlot): string {
  if (slot.isEgg || slot.pokemonId === 0) return `スロット${slot.slotId + 1}: タマゴ`;
  if (slot.pokemonId === null) return `スロット${slot.slotId + 1}`;
  return `スロット${slot.slotId + 1}: ${getPokemonName(slot.pokemonId)}`;
}

export function ChatInput({ chatHistory, selectedSlotId: _selectedSlotId, unlockedSlots, party, onSubmit }: Props) {
  const [text, setText] = useState('');
  const [attribute, setAttribute] = useState<AttributeType>('physical');
  const [category, setCategory] = useState<ActivityCategory>('effort');
  const [targetSlotId, setTargetSlotId] = useState<number | null>(0);
  const [useAi, setUseAi] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  async function handleSubmit() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setError(null);

    let finalAttr = attribute;
    let finalCat = category;

    if (useAi) {
      setLoading(true);
      try {
        const result = await classifyActivity(trimmed);
        finalAttr = result.attribute;
        finalCat = result.category;
      } catch (e) {
        setError(e instanceof Error ? e.message : 'AI分類に失敗しました');
        setLoading(false);
        return;
      } finally {
        setLoading(false);
      }
    }

    onSubmit(trimmed, finalAttr, finalCat, targetSlotId);
    setText('');
    textareaRef.current?.focus();
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  }

  const earnedDp = BASE_DP_PER_ACTIVITY * CATEGORY_COEFFICIENTS[category];
  const unlockedParty = party.slice(0, unlockedSlots);

  return (
    <section className="chat-section">
      <div className="chat-history">
        {chatHistory.length === 0 && (
          <div className="chat-history__empty">活動を入力してポイントを獲得しよう！</div>
        )}
        {chatHistory.map((act) => (
          <div key={act.id} className="chat-bubble">
            <div className="chat-bubble__text">{act.text}</div>
            <div className="chat-bubble__meta">
              <span className="chat-bubble__attr" style={{ color: ATTRIBUTE_COLORS[act.attribute] }}>
                {ATTRIBUTE_LABELS[act.attribute]}
              </span>
              <span className="chat-bubble__cat">{CATEGORY_LABELS[act.category]}</span>
              <span className="chat-bubble__dp">+{act.earnedDp.toFixed(1)} DP</span>
              {act.targetSlotId !== null ? (
                <span className="chat-bubble__target">
                  → {slotLabel(party[act.targetSlotId] ?? party[0])}
                </span>
              ) : (
                <span className="chat-bubble__target">→ プール</span>
              )}
              <span className="chat-bubble__time">
                {new Date(act.createdAt).toLocaleTimeString('ja-JP', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          </div>
        ))}
      </div>

      {error && <div className="chat-error">⚠️ {error}</div>}

      <div className="chat-form">
        <div className="chat-form__controls">
          <label className="chat-form__ai-toggle">
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
                className="chat-form__select"
                value={attribute}
                onChange={(e) => setAttribute(e.target.value as AttributeType)}
              >
                {ATTR_KEYS.map((a) => (
                  <option key={a} value={a}>{ATTRIBUTE_LABELS[a]}</option>
                ))}
              </select>
              <select
                className="chat-form__select"
                value={category}
                onChange={(e) => setCategory(e.target.value as ActivityCategory)}
              >
                {CAT_KEYS.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABELS[c]} (×{CATEGORY_COEFFICIENTS[c]})
                  </option>
                ))}
              </select>
            </>
          )}

          <select
            className="chat-form__select"
            value={targetSlotId === null ? 'pool' : String(targetSlotId)}
            onChange={(e) =>
              setTargetSlotId(e.target.value === 'pool' ? null : Number(e.target.value))
            }
          >
            <option value="pool">プールへ</option>
            {unlockedParty.map((slot) => (
              <option key={slot.slotId} value={String(slot.slotId)}>
                {slotLabel(slot)}
              </option>
            ))}
          </select>
        </div>

        <div className="chat-form__input-row">
          <textarea
            ref={textareaRef}
            className="chat-form__textarea"
            rows={2}
            placeholder="活動を入力... (Enterで送信)"
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
          />
          <button
            className="chat-form__submit"
            onClick={handleSubmit}
            disabled={loading || !text.trim()}
          >
            {loading ? '⏳' : '送信'}
          </button>
        </div>

        {!useAi && (
          <div className="chat-form__preview">獲得予定: {earnedDp.toFixed(1)} DP</div>
        )}
      </div>
    </section>
  );
}
