import type { GameState } from '../types';
import { TP_SLOT_THRESHOLDS } from '../types';
import { TrainerRankCard } from './TrainerRankCard';
import { BadgeGrid } from './BadgeGrid';
import { WeeklyChallengeCard } from './WeeklyChallengeCard';

interface Props {
  state: GameState;
  onReset: () => void;
  onDecayRateChange: (rate: number) => void;
  onClaimReward: () => void;
}

const DECAY_OPTIONS = [
  { label: 'なし (0%/日)',    value: 0 },
  { label: 'ゆるい (5%/日)',  value: 0.05 },
  { label: '標準 (20%/日)',   value: 0.2 },
  { label: '厳しい (50%/日)', value: 0.5 },
];

export function TrainerView({ state, onReset, onDecayRateChange, onClaimReward }: Props) {
  const { totalTp, unlockedSlots, decayRate, totalActivityCount, totalEffortCount, totalHatches, totalEvolutions, unlockedBadges } = state;

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
