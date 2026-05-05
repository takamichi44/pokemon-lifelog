import { useState } from 'react';
import type { GameState, PokemonSlot, AttributeType, ActivityCategory } from '../types';
import { ATTRIBUTE_COLORS, HATCH_THRESHOLD, TP_SLOT_THRESHOLDS } from '../types';
import { getPokemonName } from '../data/pokemonNames';
import { getEvolutionEntry } from '../data/evolutionTable';
import { DpPoolPanel } from './DpPoolPanel';
import { PokemonChat } from './PokemonChat';
import { PokemonDex } from './PokemonDex';
import { animatedSpriteUrl, onSpriteError } from '../utils/spriteUrl';

type CardMode = 'normal' | 'chat' | 'dex';

interface Props {
  state: GameState;
  onAllocate: (slotId: number, attribute: AttributeType, amount: number) => void;
  onAddActivity: (
    text: string,
    attribute: AttributeType,
    category: ActivityCategory,
    targetSlotId: number | null,
    pokemonResponse?: string,
  ) => void;
  onClaimReward: () => void;
}

const ATTRS: AttributeType[] = ['physical', 'smart', 'mental', 'life'];
const ATTR_LABEL: Record<AttributeType, string> = {
  physical: 'フィジカル',
  smart: 'スマート',
  mental: 'メンタル',
  life: 'ライフ',
};

function PokemonCard({
  slot,
  state,
  onAllocate,
  onAddActivity,
  onClaimReward,
}: {
  slot: PokemonSlot;
  state: GameState;
  onAllocate: (slotId: number, attr: AttributeType, amt: number) => void;
  onAddActivity: (text: string, attr: AttributeType, cat: ActivityCategory, targetSlotId: number | null, response?: string) => void;
  onClaimReward: () => void;
}) {
  const [mode, setMode] = useState<CardMode>('normal');
  const [showAllocate, setShowAllocate] = useState(false);

  const isEgg = slot.isEgg || slot.pokemonId === 0;
  const name = isEgg ? 'タマゴ' : getPokemonName(slot.pokemonId ?? 0);
  const totalDp = ATTRS.reduce((s, k) => s + slot.dp[k], 0);
  const maxDp = Math.max(totalDp, 100);
  const hasPool = ATTRS.some((a) => state.dpPool[a] > 0);

  const evolutionEntry = isEgg ? null : getEvolutionEntry(slot.pokemonId ?? 0);
  const nextEvolutions = evolutionEntry?.evolvesTo ?? null;

  function toggleMode(target: CardMode) {
    setMode((prev) => (prev === target ? 'normal' : target));
    setShowAllocate(false);
  }

  return (
    <div className="pokemon-card">
      {/* 画像エリア（常時表示） */}
      <div className="pokemon-card__sprite-area">
        {isEgg ? (
          <span className="pokemon-card__egg-icon">🥚</span>
        ) : (
          <img
            src={animatedSpriteUrl(slot.pokemonId!)}
            alt={name}
            className="pokemon-card__sprite pokemon-card__sprite--animated"
            onError={(e) => onSpriteError(e, slot.pokemonId!)}
          />
        )}
      </div>

      {/* 名前・No.（常時表示） */}
      <div className="pokemon-card__name">{name}</div>
      {!isEgg && slot.pokemonId !== null && (
        <div className="pokemon-card__no">No.{slot.pokemonId}</div>
      )}

      {/* アクションボタン行 */}
      <div className="pokemon-card__actions">
        <button
          className={`pokemon-card__action-btn${mode === 'chat' ? ' active' : ''}`}
          onClick={() => toggleMode('chat')}
        >
          💬 {mode === 'chat' ? '閉じる' : '話しかける'}
        </button>
        {!isEgg && (
          <button
            className={`pokemon-card__action-btn pokemon-card__action-btn--dex${mode === 'dex' ? ' active' : ''}`}
            onClick={() => toggleMode('dex')}
          >
            📖 {mode === 'dex' ? '閉じる' : '図鑑'}
          </button>
        )}
      </div>

      {/* ===== チャットモード ===== */}
      {mode === 'chat' && (
        <PokemonChat
          slot={slot}
          state={state}
          onAddActivity={onAddActivity}
          onClaimReward={onClaimReward}
        />
      )}

      {/* ===== 図鑑モード ===== */}
      {mode === 'dex' && !isEgg && slot.pokemonId !== null && (
        <PokemonDex pokemonId={slot.pokemonId} />
      )}

      {/* ===== 通常モード（DP・進化条件） ===== */}
      {mode === 'normal' && (
        <>
          {/* 卵: 孵化進捗 */}
          {isEgg && (
            <div className="pokemon-card__hatch">
              <div className="pokemon-card__hatch-label">
                孵化まであと {Math.max(0, HATCH_THRESHOLD - slot.totalDpEver).toFixed(1)} DP
              </div>
              <div className="pokemon-card__hatch-track">
                <div
                  className="pokemon-card__hatch-fill"
                  style={{ width: `${Math.min((slot.totalDpEver / HATCH_THRESHOLD) * 100, 100)}%` }}
                />
              </div>
              <div className="pokemon-card__hatch-num">
                {slot.totalDpEver.toFixed(1)} / {HATCH_THRESHOLD}
              </div>
            </div>
          )}

          {/* DP バー */}
          <div className="pokemon-card__stats">
            <div className="pokemon-card__stats-title">DP</div>
            {ATTRS.map((attr) => {
              const val = slot.dp[attr];
              const pct = (val / maxDp) * 100;
              return (
                <div key={attr} className="pokemon-card__stat-row">
                  <span
                    className="pokemon-card__stat-label"
                    style={{ color: ATTRIBUTE_COLORS[attr] }}
                  >
                    {ATTR_LABEL[attr]}
                  </span>
                  <div className="pokemon-card__stat-track">
                    <div
                      className="pokemon-card__stat-fill"
                      style={{
                        width: `${Math.min(pct, 100)}%`,
                        backgroundColor: ATTRIBUTE_COLORS[attr],
                      }}
                    />
                  </div>
                  <span className="pokemon-card__stat-val">{Math.floor(val)}</span>
                </div>
              );
            })}
            <div className="pokemon-card__affection">なつき度: {Math.floor(slot.totalDpEver)}</div>
          </div>

          {/* 進化条件 */}
          {nextEvolutions && nextEvolutions.length > 0 && (
            <div className="pokemon-card__evo">
              <div className="pokemon-card__evo-title">進化条件</div>
              {nextEvolutions.map((target) => {
                const cond = target.conditions;
                const checks: { label: string; met: boolean }[] = [];
                if (cond.minPhysical)  checks.push({ label: `フィジカル ${cond.minPhysical}`, met: slot.dp.physical  >= cond.minPhysical });
                if (cond.minSmart)     checks.push({ label: `スマート ${cond.minSmart}`,      met: slot.dp.smart     >= cond.minSmart });
                if (cond.minMental)    checks.push({ label: `メンタル ${cond.minMental}`,     met: slot.dp.mental    >= cond.minMental });
                if (cond.minLife)      checks.push({ label: `ライフ ${cond.minLife}`,         met: slot.dp.life      >= cond.minLife });
                if (cond.minAffection) checks.push({ label: `なつき度 ${cond.minAffection}`,  met: slot.totalDpEver  >= (cond.minAffection ?? 0) });
                if (cond.timeOfDay)    checks.push({ label: cond.timeOfDay === 'day' ? '昼に活動' : '夜に活動', met: false });
                if (cond.bias)         checks.push({ label: `${ATTR_LABEL[cond.bias.dominant]}が高い`, met: false });
                return (
                  <div key={target.targetId} className="pokemon-card__evo-entry">
                    <div className="pokemon-card__evo-name">→ {getPokemonName(target.targetId)}</div>
                    {checks.map((c, i) => (
                      <div key={i} className={`pokemon-card__evo-cond${c.met ? ' met' : ''}`}>
                        {c.met ? '✅' : '○'} {c.label}
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          )}
          {!nextEvolutions && !isEgg && (
            <div className="pokemon-card__evo">
              <div className="pokemon-card__evo-title">これ以上進化しない</div>
            </div>
          )}

          {/* DP配分 */}
          {hasPool && (
            <div className="pokemon-card__allocate">
              <button
                className="pokemon-card__allocate-btn"
                onClick={() => setShowAllocate((v) => !v)}
              >
                {showAllocate ? '▲ 閉じる' : '▼ DPプールから配分する'}
              </button>
              {showAllocate && (
                <DpPoolPanel
                  state={state}
                  selectedSlotId={slot.slotId}
                  onAllocate={(_, attr, amt) => onAllocate(slot.slotId, attr, amt)}
                />
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export function PartyView({ state, onAllocate, onAddActivity, onClaimReward }: Props) {
  const { party, unlockedSlots, totalTp } = state;
  const unlockedParty = party.slice(0, unlockedSlots);
  const [index, setIndex] = useState(0);

  const safeIndex = Math.min(index, unlockedParty.length - 1);
  const current = unlockedParty[safeIndex];

  const nextThreshold = TP_SLOT_THRESHOLDS[unlockedSlots];
  const tpToNext = nextThreshold !== undefined ? nextThreshold - totalTp : null;

  return (
    <div className="party-view">
      {unlockedParty.length > 1 && (
        <div className="party-nav">
          {unlockedParty.map((s, i) => {
            const isEgg = s.isEgg || s.pokemonId === 0;
            const isSelected = i === safeIndex;
            return (
              <button
                key={s.slotId}
                className={`party-nav__icon${isSelected ? ' party-nav__icon--active' : ''}`}
                onClick={() => setIndex(i)}
                aria-label={isEgg ? 'タマゴ' : getPokemonName(s.pokemonId ?? 0)}
              >
                {isEgg ? (
                  <span className="party-nav__icon-egg">🥚</span>
                ) : (
                  <img
                    src={animatedSpriteUrl(s.pokemonId!)}
                    alt={getPokemonName(s.pokemonId ?? 0)}
                    className="party-nav__icon-sprite"
                    onError={(e) => onSpriteError(e, s.pokemonId!)}
                  />
                )}
              </button>
            );
          })}
        </div>
      )}

      {current && (
        <PokemonCard
          slot={current}
          state={state}
          onAllocate={onAllocate}
          onAddActivity={onAddActivity}
          onClaimReward={onClaimReward}
        />
      )}

      {tpToNext !== null && tpToNext > 0 && (
        <div className="party-view__unlock-hint">
          次のスロット解放まであと{' '}
          <span className="party-view__unlock-tp">{Math.ceil(tpToNext)} TP</span>
        </div>
      )}
      {unlockedSlots >= 6 && (
        <div className="party-view__unlock-hint">パーティが満員です</div>
      )}
    </div>
  );
}
