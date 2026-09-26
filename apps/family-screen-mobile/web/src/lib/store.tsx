import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { createSeed, type AppData } from './seed';
import { DAY, uid } from './format';
import type { ChannelRule, NotificationSettings, RuleSet } from './types';

interface Store {
  data: AppData;
  paired: boolean;
  pair: () => void;
  signOut: () => void;
  updateRules: (childId: string, patch: Partial<RuleSet>) => void;
  addChannelRule: (rule: Omit<ChannelRule, 'id'>) => void;
  removeChannelRule: (id: string) => void;
  resolveReview: (id: string, decision: 'approved' | 'denied', listScope: 'video' | 'channel' | 'none') => void;
  updateNotifications: (patch: Partial<NotificationSettings>) => void;
  inviteGuardian: (email: string) => void;
  revokeInvite: (id: string) => void;
  unpairDevice: (id: string) => void;
  deleteChildData: (childId: string) => void;
}

const StoreContext = createContext<Store | null>(null);

export function StoreProvider({ children }: { children: ReactNode }) {
  const [data, setData] = useState<AppData>(() => createSeed());
  const [paired, setPaired] = useState(false);

  // Advance open watch sessions so "currently watching" feels live.
  useEffect(() => {
    const t = setInterval(() => {
      setData((d) => ({
        ...d,
        watchEvents: d.watchEvents.map((e) => (e.endedAt === null ? { ...e, durationSeconds: e.durationSeconds + 5 } : e)),
      }));
    }, 5000);
    return () => clearInterval(t);
  }, []);

  const updateRules = useCallback((childId: string, patch: Partial<RuleSet>) => {
    setData((d) => ({
      ...d,
      rules: d.rules.map((r) => (r.childId === childId ? { ...r, ...patch, updatedAt: Date.now() } : r)),
    }));
  }, []);

  const addChannelRule = useCallback((rule: Omit<ChannelRule, 'id'>) => {
    setData((d) => ({
      ...d,
      channelRules: [
        ...d.channelRules.filter((r) => !(r.childId === rule.childId && r.channelId === rule.channelId)),
        { ...rule, id: uid('cr') },
      ],
    }));
  }, []);

  const removeChannelRule = useCallback((id: string) => {
    setData((d) => ({ ...d, channelRules: d.channelRules.filter((r) => r.id !== id) }));
  }, []);

  const resolveReview = useCallback<Store['resolveReview']>((id, decision, listScope) => {
    setData((d) => {
      const req = d.reviewRequests.find((r) => r.id === id);
      if (!req) return d;
      const video = d.videos.find((v) => v.videoId === req.videoId);
      let channelRules = d.channelRules;
      if (video && listScope === 'channel') {
        channelRules = [
          ...channelRules.filter((r) => !(r.childId === req.childId && r.channelId === video.channelId)),
          {
            id: uid('cr'),
            childId: req.childId,
            channelId: video.channelId,
            channelName: video.channelName,
            type: decision === 'approved' ? 'allow' : 'block',
          },
        ];
      }
      return {
        ...d,
        channelRules,
        reviewRequests: d.reviewRequests.map((r) =>
          r.id === id ? { ...r, status: decision, resolvedAt: Date.now() } : r,
        ),
      };
    });
  }, []);

  const updateNotifications = useCallback((patch: Partial<NotificationSettings>) => {
    setData((d) => ({ ...d, notifications: { ...d.notifications, ...patch } }));
  }, []);

  const inviteGuardian = useCallback((email: string) => {
    setData((d) => ({ ...d, invites: [...d.invites, { id: uid('inv'), email, expiresAt: Date.now() + 7 * DAY }] }));
  }, []);

  const revokeInvite = useCallback((id: string) => {
    setData((d) => ({ ...d, invites: d.invites.filter((i) => i.id !== id) }));
  }, []);

  const unpairDevice = useCallback((id: string) => {
    setData((d) => ({ ...d, devices: d.devices.filter((x) => x.id !== id) }));
  }, []);

  const deleteChildData = useCallback((childId: string) => {
    setData((d) => ({
      ...d,
      watchEvents: d.watchEvents.filter((e) => e.childId !== childId),
      reviewRequests: d.reviewRequests.filter((r) => r.childId !== childId),
    }));
  }, []);

  const value = useMemo<Store>(
    () => ({
      data,
      paired,
      pair: () => setPaired(true),
      signOut: () => setPaired(false),
      updateRules,
      addChannelRule,
      removeChannelRule,
      resolveReview,
      updateNotifications,
      inviteGuardian,
      revokeInvite,
      unpairDevice,
      deleteChildData,
    }),
    [data, paired, updateRules, addChannelRule, removeChannelRule, resolveReview, updateNotifications, inviteGuardian, revokeInvite, unpairDevice, deleteChildData],
  );

  return <StoreContext.Provider value={value}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore must be used within StoreProvider');
  return ctx;
}

export function useLookups() {
  const { data } = useStore();
  return useMemo(() => {
    const videoById = new Map(data.videos.map((v) => [v.videoId, v]));
    const childById = new Map(data.children.map((c) => [c.id, c]));
    return { videoById, childById };
  }, [data.videos, data.children]);
}
