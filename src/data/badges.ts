export type BadgeCategory = 'streak' | 'activity' | 'tp' | 'pokemon' | 'effort';

export interface BadgeDefinition {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: BadgeCategory;
}

export const BADGE_DEFINITIONS: BadgeDefinition[] = [
  // ストリーク
  { id: 'streak_3',    name: '3日連続',       description: '3日間連続で努力活動を記録',   icon: '🔥', category: 'streak' },
  { id: 'streak_7',    name: '1週間連続',      description: '7日間連続で努力活動を記録',   icon: '🔥', category: 'streak' },
  { id: 'streak_14',   name: '2週間連続',      description: '14日間連続で努力活動を記録',  icon: '🌟', category: 'streak' },
  { id: 'streak_30',   name: '1ヶ月連続',      description: '30日間連続で努力活動を記録',  icon: '💫', category: 'streak' },
  // 活動回数
  { id: 'activities_10',  name: '初心者',       description: '活動を10回記録',              icon: '📝', category: 'activity' },
  { id: 'activities_50',  name: '継続者',       description: '活動を50回記録',              icon: '📚', category: 'activity' },
  { id: 'activities_100', name: '百戦錬磨',     description: '活動を100回記録',             icon: '📖', category: 'activity' },
  { id: 'activities_300', name: '不屈の意志',   description: '活動を300回記録',             icon: '🎓', category: 'activity' },
  // TP
  { id: 'tp_100',  name: '駆け出し',           description: '100 TP獲得',                  icon: '⭐', category: 'tp' },
  { id: 'tp_500',  name: 'ジム挑戦者',         description: '500 TP獲得',                  icon: '🏅', category: 'tp' },
  { id: 'tp_1500', name: 'ジムリーダー',       description: '1500 TP獲得',                 icon: '🥇', category: 'tp' },
  { id: 'tp_5000', name: '四天王',             description: '5000 TP獲得',                 icon: '💎', category: 'tp' },
  // ポケモン
  { id: 'first_hatch',   name: '孵化の喜び',   description: '初めてのポケモン孵化',        icon: '🥚', category: 'pokemon' },
  { id: 'hatches_5',     name: '育て屋さん',   description: '5体孵化',                     icon: '🐣', category: 'pokemon' },
  { id: 'first_evo',     name: '進化の目撃者', description: '初めてのポケモン進化',        icon: '✨', category: 'pokemon' },
  { id: 'evolutions_10', name: '進化研究家',   description: '10回進化',                    icon: '🦋', category: 'pokemon' },
  { id: 'pokedex_10',    name: '図鑑コレクター', description: '10種類のポケモンを入手',   icon: '📕', category: 'pokemon' },
  { id: 'pokedex_30',    name: '図鑑マスター', description: '30種類のポケモンを入手',      icon: '📗', category: 'pokemon' },
  // 努力
  { id: 'effort_10', name: '努力家',           description: '努力活動を10回記録',          icon: '💪', category: 'effort' },
  { id: 'effort_50', name: '修行者',           description: '努力活動を50回記録',          icon: '🥋', category: 'effort' },
];

export function getBadgeById(id: string): BadgeDefinition | undefined {
  return BADGE_DEFINITIONS.find((b) => b.id === id);
}
