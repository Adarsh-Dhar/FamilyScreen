export const CATEGORIES = [
  'violence',
  'sexual',
  'profanity',
  'scary',
  'gambling',
  'drugs',
  'stunts',
] as const;

export type Category = (typeof CATEGORIES)[number];
export type CategoryScores = Record<Category, number>;

export type AgePreset = 'under6' | '6-9' | '10-12' | '13plus';
export type Verdict = 'allowed' | 'flagged' | 'blocked';

export interface Guardian {
  id: string;
  name: string;
  email: string;
  role: 'owner' | 'guardian';
}

export interface Invite {
  id: string;
  email: string;
  expiresAt: number;
}

export interface Child {
  id: string;
  name: string;
  color: string;
  dateOfBirth: string;
  agePreset: AgePreset;
}

export interface Device {
  id: string;
  childId: string;
  name: string;
  pairedAt: number;
  lastSeenAt: number;
}

export interface RuleSet {
  childId: string;
  categoryThresholds: CategoryScores;
  dailyWatchLimitMinutes: number;
  bedtimeStart: string;
  bedtimeEnd: string;
  updatedAt: number;
}

export interface ChannelRule {
  id: string;
  childId: string;
  channelId: string;
  channelName: string;
  type: 'allow' | 'block';
}

export interface Video {
  videoId: string;
  title: string;
  channelId: string;
  channelName: string;
  thumbnail: string;
  categoryScores: CategoryScores;
}

export interface WatchEvent {
  id: string;
  childId: string;
  videoId: string;
  verdict: Verdict;
  startedAt: number;
  durationSeconds: number;
  endedAt: number | null;
}

export interface ReviewRequest {
  id: string;
  childId: string;
  videoId: string;
  source: 'auto_flag' | 'kid_request';
  status: 'pending' | 'approved' | 'denied';
  createdAt: number;
  resolvedAt: number | null;
}

export type NotifyChannel = 'push' | 'email' | 'sms';
export type NotifyEvent = 'blocked' | 'review_requested' | 'limit_reached' | 'repeated_block';

export interface NotificationSettings {
  prefs: Record<NotifyEvent, Record<NotifyChannel, boolean>>;
  quietHoursEnabled: boolean;
  quietStart: string;
  quietEnd: string;
}

// API response shapes

export interface Household {
  householdName: string;
  plan: string;
  guardians: Guardian[];
  invites: Invite[];
  children: Child[];
  devices: Device[];
}

export type WatchEventView = WatchEvent & { video: Video };

export interface DashboardSummary {
  children: {
    childId: string;
    live: WatchEventView | null;
    watchedSecondsToday: number;
    dailyLimitMinutes: number;
  }[];
  flagsThisWeek: number;
  pendingReviews: number;
  recent: WatchEventView[];
}

export type RulesView = RuleSet & { agePreset: AgePreset; isCustom: boolean };

export interface ActivityResult {
  items: WatchEventView[];
  total: number;
  page: number;
  pageCount: number;
}

export type ReviewView = ReviewRequest & { video: Video; thresholds: CategoryScores };

export interface ReviewQueue {
  items: ReviewView[];
  counts: Record<ReviewRequest['source'], number>;
}

export interface Insights {
  trend: { dayStart: number; minutesByChild: Record<string, number> }[];
  topChannels: { channelName: string; seconds: number }[];
  categoryCounts: { category: Category; count: number }[];
}
