import { createContext, useContext, useMemo, type ReactNode } from 'react';
import useSWR from 'swr';
import {
  addChannelRule as apiAddChannelRule,
  applyPreset as apiApplyPreset,
  deleteChildData as apiDeleteChildData,
  fetcher,
  inviteGuardian as apiInviteGuardian,
  removeChannelRule as apiRemoveChannelRule,
  resolveReview as apiResolveReview,
  revokeInvite as apiRevokeInvite,
  setNotificationPref as apiSetNotificationPref,
  signOut as apiSignOut,
  unpairDevice as apiUnpairDevice,
  updateNotifications as apiUpdateNotifications,
  updateRules as apiUpdateRules,
  pair as apiPair,
  revalidate,
} from './api';
import type {
  ChannelRule,
  DashboardSummary,
  Household,
  Insights,
  NotificationSettings,
  ReviewQueue,
  ReviewRequest,
  RuleSet,
  Video,
  WatchEventView,
} from './types';

type StoreData = Household & {
  rules: RuleSet[];
  channelRules: ChannelRule[];
  videos: Video[];
  watchEvents: WatchEventView[];
  reviewRequests: ReviewQueue['items'];
  notifications: NotificationSettings;
  dashboard: DashboardSummary;
  insights: Insights;
};

const fallback: StoreData = {
  householdName: 'Loading household…',
  plan: 'Family',
  guardians: [],
  invites: [],
  children: [],
  devices: [],
  rules: [],
  channelRules: [],
  videos: [],
  watchEvents: [],
  reviewRequests: [],
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
  dashboard: { children: [], flagsThisWeek: 0, pendingReviews: 0, recent: [] },
  insights: { trend: [], topChannels: [], categoryCounts: [] },
};

type Store = {
  data: StoreData;
  paired: boolean;
  loading: boolean;
  pair: (code: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateRules: (childId: string, patch: Parameters<typeof apiUpdateRules>[1]) => Promise<void>;
  applyPreset: (childId: string, preset: Parameters<typeof apiApplyPreset>[1]) => Promise<void>;
  addChannelRule: (rule: { childId: string; channelId: string; channelName: string; type: ChannelRule['type'] }) => Promise<void>;
  removeChannelRule: (id: string) => Promise<void>;
  resolveReview: (id: string, decision: 'approved' | 'denied', scope: string) => Promise<void>;
  updateNotifications: (body: unknown) => Promise<void>;
  setNotificationPref: (event: Parameters<typeof apiSetNotificationPref>[1], channel: Parameters<typeof apiSetNotificationPref>[2], value: boolean) => Promise<void>;
  inviteGuardian: (email: string) => Promise<void>;
  revokeInvite: (id: string) => Promise<void>;
  unpairDevice: (id: string) => Promise<void>;
  deleteChildData: (childId: string, confirmName: string) => Promise<void>;
};

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const session = useSWR<{ paired: boolean }>('/api/session', fetcher);
  const bootstrap = useSWR<StoreData>(session.data?.paired ? '/api/bootstrap' : null, fetcher, { refreshInterval: 5000 });
  const dashboard = useSWR<DashboardSummary>(session.data?.paired ? '/api/dashboard' : null, fetcher, { refreshInterval: 5000 });
  const reviews = useSWR<ReviewQueue>(session.data?.paired ? '/api/reviews' : null, fetcher);
  const notifications = useSWR<NotificationSettings>(session.data?.paired ? '/api/notifications' : null, fetcher);
  const insights = useSWR<Insights>(session.data?.paired ? '/api/insights?range=7' : null, fetcher);

  const data = useMemo<StoreData>(() => ({
    ...fallback,
    ...bootstrap.data,
    dashboard: dashboard.data ?? fallback.dashboard,
    notifications: notifications.data ?? bootstrap.data?.notifications ?? fallback.notifications,
    insights: insights.data ?? fallback.insights,
    reviewRequests: reviews.data?.items ?? bootstrap.data?.reviewRequests ?? [],
  }), [bootstrap.data, dashboard.data, notifications.data, insights.data, reviews.data]);

  const value: Store = {
    data,
    paired: !!session.data?.paired,
    loading: session.isLoading || (session.data?.paired === true && bootstrap.isLoading),
    pair: async (code) => { await apiPair(code); await session.mutate({ paired: true }); await revalidate('/api/household', '/api/dashboard'); },
    signOut: async () => { await apiSignOut(); await session.mutate({ paired: false }, { revalidate: false }); },
    updateRules: async (childId, patch) => { const current = data.rules.find((rule) => rule.childId === childId); if (current) await apiUpdateRules({ ...current, agePreset: data.children.find((child) => child.id === childId)?.agePreset ?? '10-12', isCustom: false }, patch); await revalidate('/api/bootstrap'); },
    applyPreset: (childId, preset) => apiApplyPreset(childId, preset),
    addChannelRule: async (rule) => { await apiAddChannelRule(rule.childId, rule.channelName, rule.type); await revalidate('/api/bootstrap'); },
    removeChannelRule: async (id) => { const rule = data.channelRules.find((item) => item.id === id); if (rule) { await apiRemoveChannelRule(rule.childId, id); await revalidate('/api/bootstrap'); } },
    resolveReview: (id, decision, scope) => apiResolveReview(id, decision, scope === 'channel'),
    updateNotifications: (body) => apiUpdateNotifications(data.notifications, body),
    setNotificationPref: (event, channel, value) => apiSetNotificationPref(data.notifications, event, channel, value),
    inviteGuardian: apiInviteGuardian,
    revokeInvite: apiRevokeInvite,
    unpairDevice: apiUnpairDevice,
    deleteChildData: apiDeleteChildData,
  };

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const store = useContext(StoreContext);
  if (!store) throw new Error('useStore must be used inside StoreProvider');
  return store;
}

export function useLookups() {
  const { data } = useStore();
  return useMemo(() => ({
    childById: new Map(data.children.map((child) => [child.id, child])),
    videoById: new Map(data.videos.map((video) => [video.videoId, video])),
  }), [data.children, data.videos]);
}

export type { StoreData };
export type { ReviewRequest };
export type { RuleSet };
export type { Insights };
export type { DashboardSummary };
export type { NotificationSettings };
export type { ChannelRule };
export type { WatchEventView };
