export type TabId = 'party' | 'pokedex' | 'trainer';

interface Props {
  current: TabId;
  onChange: (tab: TabId) => void;
  hasPoolDp: boolean;
}

const TABS: { id: TabId; icon: string; label: string }[] = [
  { id: 'party',   icon: '🎮', label: 'パーティ' },
  { id: 'pokedex', icon: '📖', label: '図鑑' },
  { id: 'trainer', icon: '👤', label: 'トレーナー' },
];

export function BottomNav({ current, onChange, hasPoolDp }: Props) {
  return (
    <nav className="bottom-nav">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          className={`bottom-nav__btn${current === tab.id ? ' bottom-nav__btn--active' : ''}`}
          onClick={() => onChange(tab.id)}
        >
          <span className="bottom-nav__icon">
            {tab.icon}
            {tab.id === 'party' && hasPoolDp && <span className="bottom-nav__badge" />}
          </span>
          <span className="bottom-nav__label">{tab.label}</span>
        </button>
      ))}
    </nav>
  );
}
