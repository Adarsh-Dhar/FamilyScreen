import { randomBytes } from 'node:crypto';
import { createSeed } from './seed';
import { HttpError, Router } from './http';
import { PRESET_THRESHOLDS, triggeredCategories } from './rules-engine';
import { DAY, MINUTE, startOfDay, toCsv, uid } from './util';
import {
  CATEGORIES,
  type AgePreset,
  type Category,
  type DashboardSummary,
  type Insights,
  type NotificationSettings,
  type ReviewQueue,
  type RuleSet,
  type RulesView,
  type Verdict,
  type WatchEvent,
  type WatchEventView,
} from '../src/lib/types';

// In-memory dummy store. Resets whenever the dev server restarts.
const db = createSeed();
const sessions = new Set<string>();

/** Dummy TV pairing codes. `000000` simulates an expired code. */
const PAIRING_CODES: Record<string, { status: 'valid' | 'expired' }> = {
  '123456': { status: 'valid' },
  '482913': { status: 'valid' },
  '000000': { status: 'expired' },
};

const SESSION_COOKIE = 'fs_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 30;
const PAGE_SIZE = 10;
const AGE_PRESETS: AgePreset[] = ['under6', '6-9', '10-12', '13plus'];
const VERDICTS: Verdict[] = ['allowed', 'flagged', 'blocked'];
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------- helpers ----------

function liveDuration(e: WatchEvent, now = Date.now()) {
  return e.endedAt === null ? Math.floor((now - e.startedAt) / 1000) : e.durationSeconds;
}

function toView(e: WatchEvent, now = Date.now()): WatchEventView {
  const video = db.videos.find((v) => v.videoId === e.videoId)!;
  return { ...e, durationSeconds: liveDuration(e, now), video };
}

function requireChild(id: string) {
  const child = db.children.find((c) => c.id === id);
  if (!child) throw new HttpError(404, 'Child not found');
  return child;
}

function requireRules(childId: string) {
  const rules = db.rules.find((r) => r.childId === childId);
  if (!rules) throw new HttpError(404, 'Rules not found');
  return rules;
}

function rulesView(childId: string): RulesView {
  const child = requireChild(childId);
  const rules = requireRules(childId);
  const preset = PRESET_THRESHOLDS[child.agePreset];
  return {
    ...rules,
    agePreset: child.agePreset,
    isCustom: CATEGORIES.some((c) => rules.categoryThresholds[c] !== preset[c]),
  };
}

function intInRange(value: unknown, min: number, max: number, field: string) {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < min || value > max) {
    throw new HttpError(400, `${field} must be an integer between ${min} and ${max}`);
  }
  return value;
}

function timeString(value: unknown, field: string) {
  if (typeof value !== 'string' || !TIME_RE.test(value)) throw new HttpError(400, `${field} must be HH:MM`);
  return value;
}

function sessionCookie(token: string, maxAge: number) {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}`;
}

function sinceFromRange(value: string | null) {
  const days = Number(value ?? 7);
  if (![7, 14, 30].includes(days)) throw new HttpError(400, 'range must be 7, 14 or 30');
  return { days, since: Date.now() - days * DAY };
}

// ---------- routes ----------

export const router = new Router((token) => token !== null && sessions.has(token));

// Session / pairing
router
  .on('GET', '/api/session', ({ sessionToken }) => ({ json: { paired: !!sessionToken && sessions.has(sessionToken) } }), { public: true })
  .on(
    'POST',
    '/api/pair',
    ({ body, setCookie }) => {
      const code = String(body.code ?? '');
      if (!/^\d{6}$/.test(code)) throw new HttpError(400, 'Enter the 6-digit code shown on your TV.');
      const entry = PAIRING_CODES[code];
      if (!entry) throw new HttpError(404, 'That code doesn’t match any TV. Check the screen and try again.');
      if (entry.status === 'expired') throw new HttpError(410, 'That code has expired. Refresh it on your TV.');
      const token = randomBytes(24).toString('hex');
      sessions.add(token);
      setCookie(sessionCookie(token, SESSION_MAX_AGE));
      return { json: { paired: true } };
    },
    { public: true },
  )
  .on(
    'POST',
    '/api/session/sign-out',
    ({ sessionToken, setCookie }) => {
      if (sessionToken) sessions.delete(sessionToken);
      setCookie(sessionCookie('', 0));
      return { status: 204 };
    },
    { public: true },
  );

// Household
router.on('GET', '/api/household', () => ({
  json: {
    householdName: db.householdName,
    plan: db.plan,
    guardians: db.guardians,
    invites: db.invites.filter((i) => i.expiresAt > Date.now()),
    children: db.children,
    devices: db.devices,
  },
}));

// Bootstrap payload keeps the frontend to one authenticated read after pairing.
router.on('GET', '/api/bootstrap', () => ({
  json: {
    householdName: db.householdName,
    plan: db.plan,
    guardians: db.guardians,
    invites: db.invites.filter((i) => i.expiresAt > Date.now()),
    children: db.children,
    devices: db.devices,
    rules: db.rules,
    channelRules: db.channelRules,
    videos: db.videos,
    watchEvents: db.watchEvents.map((event) => toView(event)),
    reviewRequests: db.reviewRequests.filter((request) => request.status === 'pending').map((request) => ({ ...request, video: db.videos.find((video) => video.videoId === request.videoId)! })),
    notifications: db.notifications,
  },
}));

// Dashboard
router.on('GET', '/api/dashboard', () => {
  const now = Date.now();
  const today = startOfDay(now);
  const summary: DashboardSummary = {
    children: db.children.map((c) => {
      const live = db.watchEvents.find((e) => e.childId === c.id && e.endedAt === null);
      return {
        childId: c.id,
        live: live ? toView(live, now) : null,
        watchedSecondsToday: db.watchEvents
          .filter((e) => e.childId === c.id && e.startedAt >= today)
          .reduce((s, e) => s + liveDuration(e, now), 0),
        dailyLimitMinutes: requireRules(c.id).dailyWatchLimitMinutes,
      };
    }),
    flagsThisWeek: db.watchEvents.filter((e) => e.startedAt > now - 7 * DAY && e.verdict !== 'allowed').length,
    pendingReviews: db.reviewRequests.filter((r) => r.status === 'pending').length,
    recent: db.watchEvents.slice(0, 5).map((e) => toView(e, now)),
  };
  return { json: summary };
});

// Rules
router
  .on('GET', '/api/children/:childId/rules', ({ params }) => ({ json: rulesView(params.childId) }))
  .on('PATCH', '/api/children/:childId/rules', ({ params, body }) => {
    const rules = requireRules(params.childId);
    const patch: Partial<RuleSet> = {};
    if (body.categoryThresholds !== undefined) {
      const input = body.categoryThresholds as Record<string, unknown>;
      if (!input || typeof input !== 'object') throw new HttpError(400, 'categoryThresholds must be an object');
      patch.categoryThresholds = { ...rules.categoryThresholds };
      for (const [key, value] of Object.entries(input)) {
        if (!CATEGORIES.includes(key as Category)) throw new HttpError(400, `Unknown category: ${key}`);
        patch.categoryThresholds[key as Category] = intInRange(value, 0, 10, key);
      }
    }
    if (body.dailyWatchLimitMinutes !== undefined) patch.dailyWatchLimitMinutes = intInRange(body.dailyWatchLimitMinutes, 0, 1440, 'dailyWatchLimitMinutes');
    if (body.bedtimeStart !== undefined) patch.bedtimeStart = timeString(body.bedtimeStart, 'bedtimeStart');
    if (body.bedtimeEnd !== undefined) patch.bedtimeEnd = timeString(body.bedtimeEnd, 'bedtimeEnd');
    Object.assign(rules, patch, { updatedAt: Date.now() });
    return { json: rulesView(params.childId) };
  })
  .on('POST', '/api/children/:childId/rules/preset', ({ params, body }) => {
    const child = requireChild(params.childId);
    const preset = body.preset as AgePreset;
    if (!AGE_PRESETS.includes(preset)) throw new HttpError(400, 'Unknown age preset');
    child.agePreset = preset;
    Object.assign(requireRules(child.id), { categoryThresholds: { ...PRESET_THRESHOLDS[preset] }, updatedAt: Date.now() });
    return { json: rulesView(child.id) };
  });

// Channel rules
router
  .on('GET', '/api/children/:childId/channel-rules', ({ params, query }) => {
    requireChild(params.childId);
    const q = (query.get('q') ?? '').toLowerCase();
    return {
      json: db.channelRules.filter((r) => r.childId === params.childId && r.channelName.toLowerCase().includes(q)),
    };
  })
  .on('POST', '/api/children/:childId/channel-rules', ({ params, body }) => {
    requireChild(params.childId);
    const raw = String(body.channel ?? '').trim();
    const type = body.type;
    if (!raw || raw.length > 200) throw new HttpError(400, 'Enter a channel URL or name');
    if (type !== 'allow' && type !== 'block') throw new HttpError(400, 'type must be allow or block');
    const handle = raw.match(/@([\w.-]+)/)?.[1] ?? raw;
    const channelId = `UC_${handle.toLowerCase().replace(/\W/g, '')}`;
    const known = db.videos.find((v) => v.channelId === channelId);
    db.channelRules = db.channelRules.filter((r) => !(r.childId === params.childId && r.channelId === channelId));
    const rule = { id: uid('cr'), childId: params.childId, channelId, channelName: known?.channelName ?? handle, type };
    db.channelRules.push(rule);
    return { json: rule, status: 201 };
  })
  .on('DELETE', '/api/channel-rules/:id', ({ params }) => {
    const before = db.channelRules.length;
    db.channelRules = db.channelRules.filter((r) => r.id !== params.id);
    if (db.channelRules.length === before) throw new HttpError(404, 'Channel rule not found');
    return { status: 204 };
  });

// Activity
router.on('GET', '/api/activity', ({ query }) => {
  const childId = query.get('childId');
  const verdict = query.get('verdict') as Verdict | null;
  const from = Number(query.get('from') ?? 0);
  const to = Number(query.get('to') ?? Date.now());
  if (verdict && !VERDICTS.includes(verdict)) throw new HttpError(400, 'Unknown verdict');
  const filtered = db.watchEvents.filter(
    (e) => (!childId || e.childId === childId) && (!verdict || e.verdict === verdict) && e.startedAt >= from && e.startedAt <= to,
  );
  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const page = Math.min(Math.max(0, Number(query.get('page') ?? 0) || 0), pageCount - 1);
  return {
    json: {
      items: filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE).map((e) => toView(e)),
      total: filtered.length,
      page,
      pageCount,
    },
  };
});

// Review queue
router
  .on('GET', '/api/reviews', ({ query }) => {
    const source = query.get('source');
    const pending = db.reviewRequests.filter((r) => r.status === 'pending');
    const queue: ReviewQueue = {
      counts: {
        auto_flag: pending.filter((r) => r.source === 'auto_flag').length,
        kid_request: pending.filter((r) => r.source === 'kid_request').length,
      },
      items: pending
        .filter((r) => !source || r.source === source)
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((r) => ({
          ...r,
          video: db.videos.find((v) => v.videoId === r.videoId)!,
          thresholds: requireRules(r.childId).categoryThresholds,
        })),
    };
    return { json: queue };
  })
  .on('POST', '/api/reviews/:id/decision', ({ params, body }) => {
    const req = db.reviewRequests.find((r) => r.id === params.id);
    if (!req) throw new HttpError(404, 'Review request not found');
    if (req.status !== 'pending') throw new HttpError(409, 'Already resolved');
    const decision = body.decision;
    if (decision !== 'approved' && decision !== 'denied') throw new HttpError(400, 'decision must be approved or denied');
    const applyToChannel = body.applyToChannel === true;

    if (applyToChannel) {
      const video = db.videos.find((v) => v.videoId === req.videoId)!;
      db.channelRules = db.channelRules.filter((r) => !(r.childId === req.childId && r.channelId === video.channelId));
      db.channelRules.push({
        id: uid('cr'),
        childId: req.childId,
        channelId: video.channelId,
        channelName: video.channelName,
        type: decision === 'approved' ? 'allow' : 'block',
      });
    }
    Object.assign(req, { status: decision, resolvedAt: Date.now() });
    return { json: req };
  });

// Insights
router
  .on('GET', '/api/insights', ({ query }) => {
    const { since } = sinceFromRange(query.get('range'));
    const events = db.watchEvents.filter((e) => e.startedAt >= since);
    const today = startOfDay(Date.now());

    const trend = Array.from({ length: 7 }, (_, i) => {
      const dayStart = today - (6 - i) * DAY;
      const minutesByChild = Object.fromEntries(
        db.children.map((c) => [
          c.id,
          Math.round(
            db.watchEvents
              .filter((e) => e.childId === c.id && e.startedAt >= dayStart && e.startedAt < dayStart + DAY)
              .reduce((s, e) => s + liveDuration(e), 0) / 60,
          ),
        ]),
      );
      return { dayStart, minutesByChild };
    });

    const channelTotals = new Map<string, number>();
    events.forEach((e) => {
      const v = db.videos.find((x) => x.videoId === e.videoId)!;
      channelTotals.set(v.channelName, (channelTotals.get(v.channelName) ?? 0) + liveDuration(e));
    });

    const counts = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
    events
      .filter((e) => e.verdict !== 'allowed')
      .forEach((e) => {
        const v = db.videos.find((x) => x.videoId === e.videoId)!;
        triggeredCategories(v.categoryScores, requireRules(e.childId).categoryThresholds).forEach((c) => counts[c]++);
      });

    const insights: Insights = {
      trend,
      topChannels: [...channelTotals.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 6)
        .map(([channelName, seconds]) => ({ channelName, seconds })),
      categoryCounts: CATEGORIES.map((category) => ({ category, count: counts[category] })).sort((a, b) => b.count - a.count),
    };
    return { json: insights };
  })
  .on('GET', '/api/insights/export', ({ query }) => {
    const { days, since } = sinceFromRange(query.get('range'));
    const rows = db.watchEvents
      .filter((e) => e.startedAt >= since)
      .map((e) => {
        const v = db.videos.find((x) => x.videoId === e.videoId)!;
        return {
          child: db.children.find((c) => c.id === e.childId)?.name ?? '',
          video: v.title,
          channel: v.channelName,
          verdict: e.verdict,
          started_at: new Date(e.startedAt).toISOString(),
          duration_seconds: liveDuration(e),
        };
      });
    return { file: toCsv(rows), filename: `insights-last-${days}-days.csv`, contentType: 'text/csv' };
  });

// Notifications
router
  .on('GET', '/api/notifications', () => ({ json: db.notifications }))
  .on('PATCH', '/api/notifications', ({ body }) => {
    const n = db.notifications;
    const patch = body as Partial<NotificationSettings>;
    if (patch.prefs !== undefined) {
      for (const [event, channels] of Object.entries(patch.prefs ?? {})) {
        if (!(event in n.prefs)) throw new HttpError(400, `Unknown event: ${event}`);
        for (const [channel, value] of Object.entries(channels ?? {})) {
          const target = n.prefs[event as keyof typeof n.prefs];
          if (!(channel in target) || typeof value !== 'boolean') throw new HttpError(400, `Invalid preference: ${event}.${channel}`);
          target[channel as keyof typeof target] = value;
        }
      }
    }
    if (patch.quietHoursEnabled !== undefined) {
      if (typeof patch.quietHoursEnabled !== 'boolean') throw new HttpError(400, 'quietHoursEnabled must be boolean');
      n.quietHoursEnabled = patch.quietHoursEnabled;
    }
    if (patch.quietStart !== undefined) n.quietStart = timeString(patch.quietStart, 'quietStart');
    if (patch.quietEnd !== undefined) n.quietEnd = timeString(patch.quietEnd, 'quietEnd');
    return { json: n };
  });

// Guardians & invites
router
  .on('POST', '/api/invites', ({ body }) => {
    const email = String(body.email ?? '').trim().toLowerCase();
    if (!EMAIL_RE.test(email) || email.length > 254) throw new HttpError(400, 'Enter a valid email address.');
    if (db.guardians.some((g) => g.email === email)) throw new HttpError(409, 'That person is already a guardian.');
    if (db.invites.some((i) => i.email === email)) throw new HttpError(409, 'An invite is already pending for that email.');
    const invite = { id: uid('inv'), email, expiresAt: Date.now() + 7 * DAY };
    db.invites.push(invite);
    return { json: invite, status: 201 };
  })
  .on('DELETE', '/api/invites/:id', ({ params }) => {
    db.invites = db.invites.filter((i) => i.id !== params.id);
    return { status: 204 };
  });

// Devices
router.on('DELETE', '/api/devices/:id', ({ params }) => {
  const before = db.devices.length;
  db.devices = db.devices.filter((d) => d.id !== params.id);
  if (db.devices.length === before) throw new HttpError(404, 'Device not found');
  return { status: 204 };
});

// Child data controls
router
  .on('GET', '/api/children/:childId/export', ({ params }) => {
    const child = requireChild(params.childId);
    const payload = {
      exportedAt: new Date().toISOString(),
      child,
      rules: requireRules(child.id),
      channelRules: db.channelRules.filter((r) => r.childId === child.id),
      watchEvents: db.watchEvents.filter((e) => e.childId === child.id),
      reviewRequests: db.reviewRequests.filter((r) => r.childId === child.id),
    };
    return { file: JSON.stringify(payload, null, 2), filename: `${child.name.toLowerCase()}-data.json`, contentType: 'application/json' };
  })
  .on('DELETE', '/api/children/:childId/data', ({ params, body }) => {
    const child = requireChild(params.childId);
    if (body.confirmName !== child.name) throw new HttpError(400, 'Confirmation name does not match');
    db.watchEvents = db.watchEvents.filter((e) => e.childId !== child.id);
    db.reviewRequests = db.reviewRequests.filter((r) => r.childId !== child.id);
    return { status: 204 };
  });

// Keep the dummy "live" session realistic: end it after 25 minutes.
setInterval(() => {
  const now = Date.now();
  db.watchEvents.forEach((e) => {
    if (e.endedAt === null && now - e.startedAt > 25 * MINUTE) {
      e.durationSeconds = liveDuration(e, now);
      e.endedAt = now;
    }
  });
}, MINUTE).unref();
