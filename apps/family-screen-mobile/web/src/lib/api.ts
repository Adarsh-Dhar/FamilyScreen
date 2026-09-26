import useSWR, { mutate, type SWRConfiguration } from 'swr';
import type {
  ActivityResult,
  AgePreset,
  ChannelRule,
  DashboardSummary,
  Household,
  Insights,
  NotificationSettings,
  NotifyChannel,
  NotifyEvent,
  ReviewQueue,
  ReviewRequest,
  RulesView,
  RuleSet,
} from './types';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export async function api<T>(path: string, init: { method?: string; body?: unknown } = {}): Promise<T> {
  const res = await fetch(path, {
    method: init.method ?? 'GET',
    credentials: 'same-origin',
    headers: init.body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
    body: init.body !== undefined ? JSON.stringify(init.body) : undefined,
  });
  if (res.status === 204) return undefined as T;
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (res.status === 401) void mutate('/api/session');
    throw new ApiError(res.status, data.error ?? 'Something went wrong');
  }
  return data as T;
}

export const fetcher = <T>(path: string) => api<T>(path);

/** Revalidate every cached key starting with one of the given prefixes. */
export function revalidate(...prefixes: string[]) {
  return mutate((key) => typeof key === 'string' && prefixes.some((p) => key.startsWith(p)));
}

function useApi<T>(key: string | null, config?: SWRConfiguration<T>) {
  return useSWR<T>(key, config);
}

// ---------- queries ----------

export const useSession = () => useApi<{ paired: boolean }>('/api/session');
export const useHousehold = () => useApi<Household>('/api/household');
export const useDashboard = () => useApi<DashboardSummary>('/api/dashboard', { refreshInterval: 5000 });
export const useRules = (childId: string) => useApi<RulesView>(`/api/children/${childId}/rules`);
export const useChannelRules = (childId: string, q: string) =>
  useApi<ChannelRule[]>(`/api/children/${childId}/channel-rules?q=${encodeURIComponent(q)}`, { keepPreviousData: true });
export const useActivity = (params: Record<string, string>) =>
  useApi<ActivityResult>(`/api/activity?${new URLSearchParams(params)}`, { keepPreviousData: true });
export const useReviews = (source?: ReviewRequest['source']) =>
  useApi<ReviewQueue>(source ? `/api/reviews?source=${source}` : '/api/reviews');
export const useInsights = (range: string) => useApi<Insights>(`/api/insights?range=${range}`, { keepPreviousData: true });
export const useNotifications = () => useApi<NotificationSettings>('/api/notifications');

// ---------- mutations ----------

export async function pair(code: string) {
  await api('/api/pair', { method: 'POST', body: { code } });
  await mutate('/api/session', { paired: true }, { revalidate: false });
}

export async function signOut() {
  await api('/api/session/sign-out', { method: 'POST' });
  await mutate((key) => key !== '/api/session', undefined, { revalidate: false });
  await mutate('/api/session', { paired: false }, { revalidate: false });
}

type RulesPatch = Partial<Pick<RuleSet, 'dailyWatchLimitMinutes' | 'bedtimeStart' | 'bedtimeEnd'>> & {
  categoryThresholds?: Partial<RuleSet['categoryThresholds']>;
};

export async function updateRules(current: RulesView, patch: RulesPatch) {
  const optimistic: RulesView = {
    ...current,
    ...patch,
    categoryThresholds: { ...current.categoryThresholds, ...patch.categoryThresholds },
  };
  await mutate(`/api/children/${current.childId}/rules`, api<RulesView>(`/api/children/${current.childId}/rules`, { method: 'PATCH', body: patch }), {
    optimisticData: optimistic,
    rollbackOnError: true,
    revalidate: false,
  });
  void revalidate('/api/dashboard', '/api/reviews');
}

export async function applyPreset(childId: string, preset: AgePreset) {
  await mutate(`/api/children/${childId}/rules`, api<RulesView>(`/api/children/${childId}/rules/preset`, { method: 'POST', body: { preset } }), {
    revalidate: false,
  });
  void revalidate('/api/household', '/api/reviews');
}

export async function addChannelRule(childId: string, channel: string, type: ChannelRule['type']) {
  await api(`/api/children/${childId}/channel-rules`, { method: 'POST', body: { channel, type } });
  await revalidate(`/api/children/${childId}/channel-rules`);
}

export async function removeChannelRule(childId: string, id: string) {
  await api(`/api/channel-rules/${id}`, { method: 'DELETE' });
  await revalidate(`/api/children/${childId}/channel-rules`);
}

export async function resolveReview(id: string, decision: 'approved' | 'denied', applyToChannel: boolean) {
  await api(`/api/reviews/${id}/decision`, { method: 'POST', body: { decision, applyToChannel } });
  await revalidate('/api/reviews', '/api/dashboard', '/api/children/');
}

export async function setNotificationPref(current: NotificationSettings, event: NotifyEvent, channel: NotifyChannel, value: boolean) {
  const optimistic = { ...current, prefs: { ...current.prefs, [event]: { ...current.prefs[event], [channel]: value } } };
  await updateNotifications(optimistic, { prefs: { [event]: { [channel]: value } } });
}

export async function updateNotifications(optimistic: NotificationSettings, body: unknown) {
  await mutate('/api/notifications', api<NotificationSettings>('/api/notifications', { method: 'PATCH', body }), {
    optimisticData: optimistic,
    rollbackOnError: true,
    revalidate: false,
  });
}

export async function inviteGuardian(email: string) {
  await api('/api/invites', { method: 'POST', body: { email } });
  await revalidate('/api/household');
}

export async function revokeInvite(id: string) {
  await api(`/api/invites/${id}`, { method: 'DELETE' });
  await revalidate('/api/household');
}

export async function unpairDevice(id: string) {
  await api(`/api/devices/${id}`, { method: 'DELETE' });
  await revalidate('/api/household');
}

export async function deleteChildData(childId: string, confirmName: string) {
  await api(`/api/children/${childId}/data`, { method: 'DELETE', body: { confirmName } });
  await revalidate('/api/dashboard', '/api/activity', '/api/reviews', '/api/insights');
}
