import type { AttributeType, ActivityCategory } from '../types';

export interface ChallengeDefinition {
  typeIndex: number;
  title: string;
  description: string;
  target: number;
  rewardDp: number;
  icon: string;
  attribute?: AttributeType;
  category?: ActivityCategory;
}

export const CHALLENGE_DEFINITIONS: ChallengeDefinition[] = [
  {
    typeIndex: 0,
    title: 'フィジカル週間',
    description: 'フィジカル系の努力活動を5回記録しよう',
    target: 5,
    rewardDp: 30,
    icon: '🏋️',
    attribute: 'physical',
    category: 'effort',
  },
  {
    typeIndex: 1,
    title: 'スマート週間',
    description: 'スマート系の努力活動を5回記録しよう',
    target: 5,
    rewardDp: 30,
    icon: '📚',
    attribute: 'smart',
    category: 'effort',
  },
  {
    typeIndex: 2,
    title: 'メンタル週間',
    description: 'メンタル系の努力活動を5回記録しよう',
    target: 5,
    rewardDp: 30,
    icon: '🧘',
    attribute: 'mental',
    category: 'effort',
  },
  {
    typeIndex: 3,
    title: 'ライフ週間',
    description: 'ライフ系の努力活動を5回記録しよう',
    target: 5,
    rewardDp: 30,
    icon: '💚',
    attribute: 'life',
    category: 'effort',
  },
  {
    typeIndex: 4,
    title: '努力週間',
    description: 'どの属性でも努力活動を7回記録しよう',
    target: 7,
    rewardDp: 50,
    icon: '💪',
    category: 'effort',
  },
  {
    typeIndex: 5,
    title: '日常習慣週間',
    description: '日常活動を10回記録しよう',
    target: 10,
    rewardDp: 40,
    icon: '📅',
    category: 'daily',
  },
  {
    typeIndex: 6,
    title: '全力活動週間',
    description: '活動を合計15回記録しよう',
    target: 15,
    rewardDp: 60,
    icon: '🌟',
  },
];

/** その週のMonday 00:00のタイムスタンプを返す */
export function getMondayTimestamp(now: number): number {
  const d = new Date(now);
  const day = d.getDay(); // 0=Sun, 1=Mon, ...
  const daysToMonday = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + daysToMonday);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** 週インデックスからチャレンジ種別インデックスを計算 */
export function getChallengeTypeIndex(weekStart: number): number {
  const weekIndex = Math.floor(weekStart / (7 * 24 * 3600 * 1000));
  return weekIndex % CHALLENGE_DEFINITIONS.length;
}

export function getChallengeDefinition(typeIndex: number): ChallengeDefinition {
  return CHALLENGE_DEFINITIONS[typeIndex % CHALLENGE_DEFINITIONS.length];
}
