import { CATEGORIES, type AgePreset, type Category, type CategoryScores, type ChannelRule, type RuleSet, type Verdict } from './types';

export const CATEGORY_LABELS: Record<Category, string> = {
  violence: 'Violence',
  sexual: 'Sexual content',
  profanity: 'Profanity',
  scary: 'Scary / horror',
  gambling: 'Gambling',
  drugs: 'Drugs / alcohol',
  stunts: 'Dangerous stunts',
};

export const AGE_PRESET_LABELS: Record<AgePreset, string> = {
  under6: 'Under 6',
  '6-9': 'Ages 6–9',
  '10-12': 'Ages 10–12',
  '13plus': 'Ages 13+',
};

export const PRESET_THRESHOLDS: Record<AgePreset, CategoryScores> = {
  under6: { violence: 1, sexual: 0, profanity: 0, scary: 1, gambling: 0, drugs: 0, stunts: 1 },
  '6-9': { violence: 3, sexual: 0, profanity: 1, scary: 3, gambling: 1, drugs: 0, stunts: 2 },
  '10-12': { violence: 5, sexual: 1, profanity: 3, scary: 5, gambling: 2, drugs: 1, stunts: 4 },
  '13plus': { violence: 7, sexual: 3, profanity: 6, scary: 7, gambling: 4, drugs: 3, stunts: 6 },
};

export function presetFromDob(dob: string, now = Date.now()): AgePreset {
  const age = (now - new Date(dob).getTime()) / (365.25 * 24 * 3600 * 1000);
  if (age < 6) return 'under6';
  if (age < 10) return '6-9';
  if (age < 13) return '10-12';
  return '13plus';
}

/**
 * Deterministic verdict: a category over threshold by more than 2 blocks,
 * any smaller overage flags for guardian review. Channel rules override scores.
 */
export function computeVerdict(
  scores: CategoryScores,
  rules: RuleSet,
  channelId: string,
  channelRules: ChannelRule[],
): { verdict: Verdict; triggered: Category[] } {
  const channelRule = channelRules.find((r) => r.childId === rules.childId && r.channelId === channelId);
  if (channelRule?.type === 'block') return { verdict: 'blocked', triggered: [] };
  if (channelRule?.type === 'allow') return { verdict: 'allowed', triggered: [] };

  const triggered = CATEGORIES.filter((c) => scores[c] > rules.categoryThresholds[c]);
  if (triggered.length === 0) return { verdict: 'allowed', triggered };
  const worstOverage = Math.max(...triggered.map((c) => scores[c] - rules.categoryThresholds[c]));
  return { verdict: worstOverage > 2 ? 'blocked' : 'flagged', triggered };
}
