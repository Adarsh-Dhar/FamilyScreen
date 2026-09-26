import { DAY, HOUR, MINUTE } from './format';
import { PRESET_THRESHOLDS, computeVerdict } from './rules-engine';
import type {
  ChannelRule,
  Child,
  Device,
  Guardian,
  NotificationSettings,
  ReviewRequest,
  RuleSet,
  Video,
  WatchEvent,
} from './types';

export const VIDEOS: Video[] = [
  {
    videoId: 'v_volcano',
    title: 'Giant Foam Volcano Experiment!',
    channelId: 'UC_sciencekids',
    channelName: 'Science Squad Kids',
    thumbnail: '/thumbs/science.png',
    categoryScores: { violence: 0, sexual: 0, profanity: 0, scary: 0, gambling: 0, drugs: 0, stunts: 1 },
  },
  {
    videoId: 'v_castle',
    title: 'Building a Mega Castle in Survival Mode',
    channelId: 'UC_blockbuilds',
    channelName: 'BlockBuilds',
    thumbnail: '/thumbs/minecraft.png',
    categoryScores: { violence: 2, sexual: 0, profanity: 1, scary: 1, gambling: 0, drugs: 0, stunts: 0 },
  },
  {
    videoId: 'v_elephant',
    title: 'Baby Elephant’s First River Swim',
    channelId: 'UC_wildworld',
    channelName: 'Wild World',
    thumbnail: '/thumbs/animals.png',
    categoryScores: { violence: 1, sexual: 0, profanity: 0, scary: 0, gambling: 0, drugs: 0, stunts: 0 },
  },
  {
    videoId: 'v_rooftop',
    title: 'Rooftop Gap Jump — 3 Stories Up',
    channelId: 'UC_sendit',
    channelName: 'SendIt Crew',
    thumbnail: '/thumbs/stunts.png',
    categoryScores: { violence: 2, sexual: 0, profanity: 4, scary: 2, gambling: 0, drugs: 0, stunts: 9 },
  },
  {
    videoId: 'v_haunted',
    title: 'Exploring the Haunted House at 3AM',
    channelId: 'UC_nightplays',
    channelName: 'NightPlays',
    thumbnail: '/thumbs/horror.png',
    categoryScores: { violence: 4, sexual: 0, profanity: 3, scary: 8, gambling: 0, drugs: 0, stunts: 1 },
  },
  {
    videoId: 'v_cupcakes',
    title: 'Rainbow Cupcakes Anyone Can Make',
    channelId: 'UC_minichefs',
    channelName: 'Mini Chefs',
    thumbnail: '/thumbs/cooking.png',
    categoryScores: { violence: 0, sexual: 0, profanity: 0, scary: 0, gambling: 0, drugs: 0, stunts: 0 },
  },
];

export interface AppData {
  householdName: string;
  plan: string;
  guardians: Guardian[];
  invites: { id: string; email: string; expiresAt: number }[];
  children: Child[];
  devices: Device[];
  rules: RuleSet[];
  channelRules: ChannelRule[];
  videos: Video[];
  watchEvents: WatchEvent[];
  reviewRequests: ReviewRequest[];
  notifications: NotificationSettings;
}

export function createSeed(now = Date.now()): AppData {
  const children: Child[] = [
    { id: 'c_emma', name: 'Emma', color: '#3dd6a3', dateOfBirth: '2018-04-12', agePreset: '6-9' },
    { id: 'c_jake', name: 'Jake', color: '#7aa2ff', dateOfBirth: '2014-09-03', agePreset: '10-12' },
  ];

  const rules: RuleSet[] = children.map((c) => ({
    childId: c.id,
    categoryThresholds: { ...PRESET_THRESHOLDS[c.agePreset] },
    dailyWatchLimitMinutes: c.agePreset === '6-9' ? 60 : 120,
    bedtimeStart: c.agePreset === '6-9' ? '19:30' : '21:00',
    bedtimeEnd: '07:00',
    updatedAt: now - 2 * DAY,
  }));

  const channelRules: ChannelRule[] = [
    { id: 'cr1', childId: 'c_emma', channelId: 'UC_sciencekids', channelName: 'Science Squad Kids', type: 'allow' },
    { id: 'cr2', childId: 'c_emma', channelId: 'UC_minichefs', channelName: 'Mini Chefs', type: 'allow' },
    { id: 'cr3', childId: 'c_jake', channelId: 'UC_nightplays', channelName: 'NightPlays', type: 'block' },
  ];

  const pattern: [string, number][] = [
    ['c_emma', 0], ['c_emma', 2], ['c_emma', 5], ['c_emma', 1],
    ['c_jake', 1], ['c_jake', 3], ['c_jake', 4], ['c_jake', 0],
  ];

  const watchEvents: WatchEvent[] = [];
  let n = 0;
  for (let day = 0; day < 10; day++) {
    pattern.forEach(([childId, vIdx], i) => {
      if ((day + i) % 3 === 0 && day > 0) return;
      const video = VIDEOS[(vIdx + day) % VIDEOS.length];
      const rule = rules.find((r) => r.childId === childId)!;
      const { verdict } = computeVerdict(video.categoryScores, rule, video.channelId, channelRules);
      const startedAt = now - day * DAY - (i + 1) * 47 * MINUTE - (day === 0 ? 0 : 3 * HOUR);
      watchEvents.push({
        id: `we_${n++}`,
        childId,
        videoId: video.videoId,
        verdict,
        startedAt,
        durationSeconds: verdict === 'blocked' ? 0 : 240 + ((i * 97 + day * 131) % 900),
        endedAt: startedAt + 10 * MINUTE,
      });
    });
  }

  watchEvents.push({
    id: 'we_live_emma',
    childId: 'c_emma',
    videoId: 'v_elephant',
    verdict: 'allowed',
    startedAt: now - 6 * MINUTE,
    durationSeconds: 360,
    endedAt: null,
  });
  watchEvents.sort((a, b) => b.startedAt - a.startedAt);

  const reviewRequests: ReviewRequest[] = [
    { id: 'rr1', childId: 'c_jake', videoId: 'v_rooftop', source: 'auto_flag', status: 'pending', createdAt: now - 50 * MINUTE, resolvedAt: null },
    { id: 'rr2', childId: 'c_emma', videoId: 'v_castle', source: 'auto_flag', status: 'pending', createdAt: now - 3 * HOUR, resolvedAt: null },
    { id: 'rr3', childId: 'c_emma', videoId: 'v_haunted', source: 'kid_request', status: 'pending', createdAt: now - 12 * MINUTE, resolvedAt: null },
    { id: 'rr4', childId: 'c_jake', videoId: 'v_haunted', source: 'kid_request', status: 'pending', createdAt: now - 2 * HOUR, resolvedAt: null },
  ];

  const devices: Device[] = [
    { id: 'd1', childId: 'c_emma', name: 'Living Room Fire TV', pairedAt: now - 20 * DAY, lastSeenAt: now - MINUTE },
    { id: 'd2', childId: 'c_jake', name: 'Bedroom Fire TV Stick', pairedAt: now - 14 * DAY, lastSeenAt: now - 40 * MINUTE },
  ];

  return {
    householdName: 'The Rivera Household',
    plan: 'Family (Free trial)',
    guardians: [
      { id: 'g1', name: 'Alex Rivera', email: 'alex@rivera.family', role: 'owner' },
      { id: 'g2', name: 'Sam Rivera', email: 'sam@rivera.family', role: 'guardian' },
    ],
    invites: [],
    children,
    devices,
    rules,
    channelRules,
    videos: VIDEOS,
    watchEvents,
    reviewRequests,
    notifications: {
      prefs: {
        blocked: { push: true, email: false, sms: false },
        review_requested: { push: true, email: true, sms: false },
        limit_reached: { push: true, email: false, sms: false },
        repeated_block: { push: true, email: true, sms: true },
      },
      quietHoursEnabled: true,
      quietStart: '22:00',
      quietEnd: '07:00',
    },
  };
}
