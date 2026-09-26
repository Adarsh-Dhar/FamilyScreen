import { CATEGORIES, type AgePreset, type Category, type CategoryScores, type ChannelRule, type RuleSet, type Verdict } from '../src/lib/types';

export const PRESET_THRESHOLDS: Record<AgePreset, CategoryScores> = {
  under6: { violence: 1, sexual: 0, profanity: 0, scary: 1, gambling: 0, drugs: 0, stunts: 1 },
  '6-9': { violence: 3, sexual: 0, profanity: 1, scary: 3, gambling: 1, drugs: 0, stunts: 2 },
  '10-12': { violence: 5, sexual: 1, profanity: 3, scary: 5, gambling: 2, drugs: 1, stunts: 4 },
  '13plus': { violence: 7, sexual: 3, profanity: 6, scary: 7, gambling: 4, drugs: 3, stunts: 6 },
};

export function triggeredCategories(scores: CategoryScores, thresholds: CategoryScores): Category[] {
  return CATEGORIES.filter((c) => scores[c] > thresholds[c]);
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
): Verdict {
  const channelRule = channelRules.find((r) => r.childId === rules.childId && r.channelId === channelId);
  if (channelRule) return channelRule.type === 'block' ? 'blocked' : 'allowed';

  const triggered = triggeredCategories(scores, rules.categoryThresholds);
  if (triggered.length === 0) return 'allowed';
  const worstOverage = Math.max(...triggered.map((c) => scores[c] - rules.categoryThresholds[c]));
  return worstOverage > 2 ? 'blocked' : 'flagged';
}
