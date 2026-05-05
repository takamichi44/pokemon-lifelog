import { getStreakMultiplier } from '../hooks/usePokemonEngine';

interface Props {
  streak: number;
  longestStreak: number;
  lastEffortDate: string | null;
}

export function StreakBanner({ streak, longestStreak, lastEffortDate }: Props) {
  const multiplier = getStreakMultiplier(streak);
  const todayStr = (() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  })();

  const isFirstToday = lastEffortDate !== todayStr;

  return (
    <div className="streak-banner">
      <div className="streak-banner__main">
        <span className="streak-banner__fire">🔥</span>
        <span className="streak-banner__days">{streak}</span>
        <span className="streak-banner__label">日連続</span>
        {multiplier > 1.0 && (
          <span className="streak-banner__mult">×{multiplier.toFixed(1)}</span>
        )}
      </div>
      <div className="streak-banner__sub">
        {isFirstToday && streak > 0 && (
          <span className="streak-banner__first-day">今日の最初の努力に +30% ボーナス！</span>
        )}
        {streak === 0 && (
          <span className="streak-banner__hint">努力活動でストリークを始めよう</span>
        )}
        {longestStreak > 0 && (
          <span className="streak-banner__record">最長 {longestStreak} 日</span>
        )}
      </div>
    </div>
  );
}
