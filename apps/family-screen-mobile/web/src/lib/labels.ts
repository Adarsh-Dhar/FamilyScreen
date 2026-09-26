import type { AgePreset, Category } from './types';

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
