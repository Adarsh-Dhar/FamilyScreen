import { Link } from 'react-router-dom';
import { ArrowRight, Clock, Flag, ShieldCheck } from 'lucide-react';
import { useLookups, useStore } from '../lib/store';
import { DAY, formatDuration, formatRelative, startOfDay } from '../lib/format';
import { Card, CardHeader, ChildAvatar, PageHeader, VerdictBadge } from '../components/ui';

export function DashboardPage() {
  const { data } = useStore();
  const { videoById, childById } = useLookups();
  const now = Date.now();
  const today = startOfDay(now);
  const pending = data.reviewRequests.filter((r) => r.status === 'pending').length;
  const flagsThisWeek = data.watchEvents.filter((e) => e.startedAt > now - 7 * DAY && e.verdict !== 'allowed').length;

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Dashboard" description={`Here’s what’s happening in ${data.householdName} today.`} />

      <div className="grid gap-4 md:grid-cols-2">
        {data.children.map((child) => {
          const live = data.watchEvents.find((e) => e.childId === child.id && e.endedAt === null);
          const video = live && videoById.get(live.videoId);
          return (
            <Card key={child.id} className="overflow-hidden">
              <div className="flex items-center justify-between px-5 pt-4">
                <div className="flex items-center gap-2.5">
                  <ChildAvatar child={child} />
                  <span className="text-sm font-semibold">{child.name}</span>
                </div>
                {video ? (
                  <span className="flex items-center gap-1.5 text-xs font-medium text-primary">
                    <span className="relative flex size-2">
                      <span className="absolute inline-flex size-full animate-ping rounded-full bg-primary opacity-60" />
                      <span className="relative inline-flex size-2 rounded-full bg-primary" />
                    </span>
                    Watching now
                  </span>
                ) : (
                  <span className="text-xs text-muted">Not watching</span>
                )}
              </div>
              {video && live ? (
                <div className="flex gap-4 p-5">
                  <img src={video.thumbnail} alt="" className="aspect-video w-36 shrink-0 rounded-lg object-cover" />
                  <div className="min-w-0">
                    <p className="line-clamp-2 text-sm font-medium">{video.title}</p>
                    <p className="mt-1 text-xs text-muted">{video.channelName}</p>
                    <p className="mt-3 font-mono text-xs text-muted">{formatDuration(live.durationSeconds)} elapsed</p>
                  </div>
                </div>
              ) : (
                <div className="px-5 pb-5 pt-4">
                  <div className="flex aspect-[16/5] items-center justify-center rounded-lg border border-dashed border-border text-xs text-muted">
                    TV is idle
                  </div>
                </div>
              )}
            </Card>
          );
        })}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-5">
          <div className="flex items-center gap-2 text-xs text-muted">
            <Clock className="size-4" aria-hidden /> Watch time today
          </div>
          <ul className="mt-3 flex flex-col gap-2">
            {data.children.map((c) => {
              const secs = data.watchEvents.filter((e) => e.childId === c.id && e.startedAt >= today).reduce((s, e) => s + e.durationSeconds, 0);
              const limit = data.rules.find((r) => r.childId === c.id)!.dailyWatchLimitMinutes;
              const pct = Math.min(100, (secs / 60 / limit) * 100);
              return (
                <li key={c.id}>
                  <div className="flex justify-between text-sm">
                    <span>{c.name}</span>
                    <span className="font-mono text-xs text-muted">
                      {formatDuration(secs)} / {formatDuration(limit * 60)}
                    </span>
                  </div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-surface-2">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: c.color }} />
                  </div>
                </li>
              );
            })}
          </ul>
        </Card>
        <Card className="p-5">
          <div className="flex items-center gap-2 text-xs text-muted">
            <Flag className="size-4" aria-hidden /> Flags this week
          </div>
          <p className="mt-3 text-3xl font-semibold">{flagsThisWeek}</p>
          <p className="mt-1 text-xs text-muted">Flagged or blocked videos across all children</p>
        </Card>
        <Link to="/review" className="group">
          <Card className="h-full p-5 transition group-hover:border-warning/40">
            <div className="flex items-center gap-2 text-xs text-muted">
              <ShieldCheck className="size-4" aria-hidden /> Pending reviews
            </div>
            <p className="mt-3 text-3xl font-semibold text-warning">{pending}</p>
            <p className="mt-1 flex items-center gap-1 text-xs text-muted group-hover:text-foreground">
              Open review queue <ArrowRight className="size-3" aria-hidden />
            </p>
          </Card>
        </Link>
      </div>

      <Card>
        <CardHeader
          title="Recent activity"
          action={
            <Link to="/activity" className="text-xs text-muted hover:text-foreground">
              View all
            </Link>
          }
        />
        <ul className="divide-y divide-border">
          {data.watchEvents.slice(0, 5).map((e) => {
            const v = videoById.get(e.videoId)!;
            const c = childById.get(e.childId)!;
            return (
              <li key={e.id} className="flex items-center gap-4 px-5 py-3">
                <img src={v.thumbnail} alt="" className="aspect-video w-20 shrink-0 rounded-md object-cover" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{v.title}</p>
                  <p className="truncate text-xs text-muted">
                    {c.name} · {v.channelName}
                  </p>
                </div>
                <VerdictBadge verdict={e.verdict} />
                <span className="hidden w-16 text-right text-xs text-muted sm:block">{formatRelative(e.startedAt, now)}</span>
              </li>
            );
          })}
        </ul>
      </Card>
    </div>
  );
}
