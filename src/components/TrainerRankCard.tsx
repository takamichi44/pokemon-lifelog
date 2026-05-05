import { getCurrentRank, getNextRank, TRAINER_RANKS } from '../data/trainerRanks';

interface Props {
  totalTp: number;
}

export function TrainerRankCard({ totalTp }: Props) {
  const current = getCurrentRank(totalTp);
  const next = getNextRank(totalTp);

  const progressPct = next
    ? ((totalTp - current.minTp) / (next.minTp - current.minTp)) * 100
    : 100;

  return (
    <div className="rank-card">
      <div className="rank-card__current">
        <span className="rank-card__icon">{current.icon}</span>
        <div className="rank-card__info">
          <div className="rank-card__level">LEVEL {current.level}</div>
          <div className="rank-card__title">{current.title}</div>
        </div>
        <div className="rank-card__tp">{Math.floor(totalTp)} TP</div>
      </div>

      {next ? (
        <>
          <div className="rank-card__progress-track">
            <div className="rank-card__progress-fill" style={{ width: `${Math.min(progressPct, 100)}%` }} />
          </div>
          <div className="rank-card__next-label">
            次: {next.icon} {next.title} まであと {Math.ceil(next.minTp - totalTp)} TP
          </div>
        </>
      ) : (
        <div className="rank-card__max">最高ランク達成！</div>
      )}

      <div className="rank-card__all">
        {TRAINER_RANKS.map((r) => (
          <div
            key={r.level}
            className={`rank-card__pip${totalTp >= r.minTp ? ' rank-card__pip--on' : ''}`}
            title={`${r.icon} ${r.title} (${r.minTp} TP)`}
          >
            {r.icon}
          </div>
        ))}
      </div>
    </div>
  );
}
