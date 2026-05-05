import type { WeeklyChallenge } from '../types';
import { getChallengeDefinition } from '../data/weeklyChallenges';

interface Props {
  challenge: WeeklyChallenge | null;
  onClaim: () => void;
}

export function WeeklyChallengeCard({ challenge, onClaim }: Props) {
  if (!challenge) {
    return (
      <div className="weekly-challenge weekly-challenge--empty">
        <span className="weekly-challenge__icon">📅</span>
        <span className="weekly-challenge__title">活動すると週間チャレンジが始まります</span>
      </div>
    );
  }

  const def = getChallengeDefinition(challenge.challengeTypeIndex);
  const pct = Math.min((challenge.current / def.target) * 100, 100);
  const canClaim = challenge.completed && !challenge.rewardClaimed;

  return (
    <div className={`weekly-challenge${challenge.completed ? ' weekly-challenge--done' : ''}`}>
      <div className="weekly-challenge__header">
        <span className="weekly-challenge__icon">{def.icon}</span>
        <div className="weekly-challenge__info">
          <div className="weekly-challenge__title">{def.title}</div>
          <div className="weekly-challenge__desc">{def.description}</div>
        </div>
        <div className="weekly-challenge__reward">+{def.rewardDp} DP</div>
      </div>

      <div className="weekly-challenge__progress-wrap">
        <div className="weekly-challenge__progress-track">
          <div className="weekly-challenge__progress-fill" style={{ width: `${pct}%` }} />
        </div>
        <span className="weekly-challenge__progress-num">
          {challenge.current} / {def.target}
        </span>
      </div>

      {canClaim && (
        <button className="weekly-challenge__claim-btn" onClick={onClaim}>
          🎁 報酬を受け取る ({def.rewardDp} DP)
        </button>
      )}
      {challenge.rewardClaimed && (
        <div className="weekly-challenge__claimed">✅ 受取済み</div>
      )}
    </div>
  );
}
