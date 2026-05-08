import { useState } from 'react';
import type { GameState, AttributeType } from '../types';
import { TP_SLOT_THRESHOLDS, ATTRIBUTE_LABELS } from '../types';
import { TrainerRankCard } from './TrainerRankCard';
import { BadgeGrid } from './BadgeGrid';
import { WeeklyChallengeCard } from './WeeklyChallengeCard';

interface Props {
  state: GameState;
  onReset: () => void;
  onDecayRateChange: (rate: number) => void;
  onClaimReward: () => void;
  onGrantDp: (targetSlotId: number | 'pool', attribute: AttributeType | 'all', amount: number) => void;
}

const DECAY_OPTIONS = [
  { label: 'なし (0%/日)',    value: 0 },
  { label: 'ゆるい (5%/日)',  value: 0.05 },
  { label: '標準 (20%/日)',   value: 0.2 },
  { label: '厳しい (50%/日)', value: 0.5 },
];

const ATTR_OPTIONS: { label: string; value: AttributeType | 'all' }[] = [
  { label: '全属性', value: 'all' },
  { label: ATTRIBUTE_LABELS.physical, value: 'physical' },
  { label: ATTRIBUTE_LABELS.smart,    value: 'smart' },
  { label: ATTRIBUTE_LABELS.mental,   value: 'mental' },
  { label: ATTRIBUTE_LABELS.life,     value: 'life' },
];

export function TrainerView({ state, onReset, onDecayRateChange, onClaimReward, onGrantDp }: Props) {
  const { totalTp, unlockedSlots, decayRate, totalActivityCount, totalEffortCount, totalHatches, totalEvolutions, unlockedBadges } = state;

  // 開発者モード
  const [devMode, setDevMode] = useState(false);
  const [devTarget, setDevTarget] = useState<string>('0');
  const [devAttr, setDevAttr]     = useState<AttributeType | 'all'>('all');
  const [devAmount, setDevAmount] = useState(50);

  function handleGrant() {
    const target = devTarget === 'pool' ? 'pool' : parseInt(devTarget);
    if (typeof target === 'number' && isNaN(target)) return;
    onGrantDp(target as number | 'pool', devAttr, devAmount);
  }

  return (
    <div className="trainer-view">
      {/* トレーナーランク */}
      <section className="trainer-section">
        <div className="trainer-section__title">トレーナーランク</div>
        <TrainerRankCard totalTp={totalTp} />
      </section>

      {/* 週間チャレンジ */}
      <section className="trainer-section">
        <div className="trainer-section__title">週間チャレンジ</div>
        <WeeklyChallengeCard challenge={state.weeklyChallenge ?? null} onClaim={onClaimReward} />
      </section>

      {/* 統計 */}
      <section className="trainer-section">
        <div className="trainer-section__title">統計</div>
        <div className="trainer-stats">
          <div className="trainer-stat">
            <span className="trainer-stat__val">{Math.floor(totalTp)}</span>
            <span className="trainer-stat__label">総TP</span>
          </div>
          <div className="trainer-stat">
            <span className="trainer-stat__val">{totalActivityCount ?? 0}</span>
            <span className="trainer-stat__label">総活動数</span>
          </div>
          <div className="trainer-stat">
            <span className="trainer-stat__val">{totalEffortCount ?? 0}</span>
            <span className="trainer-stat__label">努力回数</span>
          </div>
          <div className="trainer-stat">
            <span className="trainer-stat__val">{totalHatches ?? 0}</span>
            <span className="trainer-stat__label">孵化数</span>
          </div>
          <div className="trainer-stat">
            <span className="trainer-stat__val">{totalEvolutions ?? 0}</span>
            <span className="trainer-stat__label">進化数</span>
          </div>
          <div className="trainer-stat">
            <span className="trainer-stat__val">{state.caughtPokemon?.length ?? 0}</span>
            <span className="trainer-stat__label">図鑑登録</span>
          </div>
        </div>
      </section>

      {/* パーティスロット */}
      <section className="trainer-section">
        <div className="trainer-section__title">パーティスロット</div>
        <div className="trainer-slots">
          {TP_SLOT_THRESHOLDS.map((_threshold, i) => {
            const unlocked = i < unlockedSlots;
            return (
              <div key={i} className={`trainer-slot-pip${unlocked ? ' trainer-slot-pip--on' : ''}`}>
                {unlocked ? '●' : '○'}
              </div>
            );
          })}
        </div>
        <div className="trainer-slots-label">
          {unlockedSlots} / {TP_SLOT_THRESHOLDS.length} 枠解放中
        </div>
      </section>

      {/* バッジ */}
      <section className="trainer-section">
        <div className="trainer-section__title">
          バッジ ({(unlockedBadges ?? []).length} / 20)
        </div>
        <BadgeGrid unlockedBadges={unlockedBadges ?? []} />
      </section>

      {/* 設定 */}
      <section className="trainer-section">
        <div className="trainer-section__title">設定</div>
        <div className="trainer-setting-row">
          <span className="trainer-setting-label">減衰レート</span>
          <select
            className="trainer-setting-select"
            value={decayRate}
            onChange={(e) => onDecayRateChange(Number(e.target.value))}
          >
            {DECAY_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="trainer-setting-hint">
          アプリを閉じている間、ポケモンのDPが自動で減少します
        </div>
      </section>

      {/* 開発者モード（開発環境のみ表示） */}
      {import.meta.env.VITE_DEV_PANEL === 'true' && <section className="trainer-section">
        <div className="trainer-section__title">
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={devMode}
              onChange={(e) => setDevMode(e.target.checked)}
            />
            🛠️ 開発者モード
          </label>
        </div>
        {devMode && (
          <div className="dev-panel">
            <div className="dev-panel__row">
              <label className="dev-panel__label">対象スロット</label>
              <select
                className="trainer-setting-select"
                value={devTarget}
                onChange={(e) => setDevTarget(e.target.value)}
              >
                {state.party.slice(0, unlockedSlots).map((_slot, i) => (
                  <option key={i} value={String(i)}>スロット {i + 1}</option>
                ))}
                <option value="pool">📦 DPプール</option>
              </select>
            </div>
            <div className="dev-panel__row">
              <label className="dev-panel__label">属性</label>
              <select
                className="trainer-setting-select"
                value={devAttr}
                onChange={(e) => setDevAttr(e.target.value as AttributeType | 'all')}
              >
                {ATTR_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <div className="dev-panel__row">
              <label className="dev-panel__label">付与DP</label>
              <input
                type="number"
                className="dev-panel__input"
                min={1}
                max={9999}
                value={devAmount}
                onChange={(e) => setDevAmount(Math.max(1, parseInt(e.target.value) || 1))}
              />
            </div>
            <button className="dev-panel__btn" onClick={handleGrant}>
              ✨ DP付与
            </button>
          </div>
        )}
      </section>}

      {/* リセット */}
      <section className="trainer-section">
        <button
          className="trainer-reset-btn"
          onClick={() => {
            if (window.confirm('全データをリセットしますか？この操作は取り消せません。')) {
              onReset();
            }
          }}
        >
          データをリセット
        </button>
      </section>
    </div>
  );
}
