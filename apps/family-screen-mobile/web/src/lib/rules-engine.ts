import { CATEGORIES, type AgePreset, type CategoryScores } from './types';

export const PRESET_THRESHOLDS: Record<AgePreset, CategoryScores> = {
  under6: { violence: 1, sexual: 0, profanity: 0, scary: 1, gambling: 0, drugs: 0, stunts: 1 },
  '6-9': { violence: 3, sexual: 0, profanity: 1, scary: 3, gambling: 1, drugs: 0, stunts: 2 },
  '10-12': { violence: 5, sexual: 1, profanity: 3, scary: 5, gambling: 2, drugs: 1, stunts: 4 },
  '13plus': { violence: 7, sexual: 3, profanity: 6, scary: 7, gambling: 4, drugs: 3, stunts: 6 },
};
export const AGE_PRESET_LABELS: Record<AgePreset, string> = { under6: 'Under 6', '6-9': 'Ages 6–9', '10-12': 'Ages 10–12', '13plus': '13+' };
export const CATEGORY_LABELS: Record<(typeof CATEGORIES)[number], string> = { violence: 'Violence', sexual: 'Sexual content', profanity: 'Profanity', scary: 'Scary content', gambling: 'Gambling', drugs: 'Drugs', stunts: 'Dangerous stunts' };
export function computeVerdict(scores: CategoryScores, rules: { categoryThresholds: CategoryScores }, _channelId?: string, _channelRules?: unknown[]) { const triggered = CATEGORIES.filter((c) => scores[c] > rules.categoryThresholds[c]); if (!triggered.length) return { verdict: 'allowed' as const, triggered }; return { verdict: (Math.max(...triggered.map((c) => scores[c] - rules.categoryThresholds[c])) > 2 ? 'blocked' : 'flagged') as const, triggered }; }
