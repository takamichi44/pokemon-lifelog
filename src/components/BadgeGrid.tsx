import { BADGE_DEFINITIONS, type BadgeCategory } from '../data/badges';

interface Props {
  unlockedBadges: string[];
}

const CATEGORY_LABELS: Record<BadgeCategory, string> = {
  streak:   '🔥 連続記録',
  activity: '📝 活動回数',
  tp:       '⭐ トレーナーポイント',
  pokemon:  '🐾 ポケモン',
  effort:   '💪 努力',
};

const CATEGORY_ORDER: BadgeCategory[] = ['streak', 'effort', 'activity', 'tp', 'pokemon'];

export function BadgeGrid({ unlockedBadges }: Props) {
  const unlockedSet = new Set(unlockedBadges ?? []);

  return (
    <div className="badge-grid">
      {CATEGORY_ORDER.map((cat) => {
        const badges = BADGE_DEFINITIONS.filter((b) => b.category === cat);
        return (
          <div key={cat} className="badge-grid__section">
            <div className="badge-grid__section-title">{CATEGORY_LABELS[cat]}</div>
            <div className="badge-grid__row">
              {badges.map((b) => {
                const unlocked = unlockedSet.has(b.id);
                return (
                  <div
                    key={b.id}
                    className={`badge-item${unlocked ? ' badge-item--unlocked' : ''}`}
                    title={`${b.name}: ${b.description}`}
                  >
                    <span className="badge-item__icon">{unlocked ? b.icon : '🔒'}</span>
                    <span className="badge-item__name">{b.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
