import { useMemo, useState } from 'react';
import { Download } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useLookups, useStore } from '../lib/store';
import { CATEGORY_LABELS, computeVerdict } from '../lib/rules-engine';
import { DAY, downloadFile, formatDuration, startOfDay, toCsv } from '../lib/format';
import { CATEGORIES, type Category } from '../lib/types';
import { Button, Card, CardHeader, PageHeader, Tabs } from '../components/ui';

type Range = '7' | '14' | '30';

export function InsightsPage() {
  const { data } = useStore();
  const { videoById, childById } = useLookups();
  const [range, setRange] = useState<Range>('7');

  const since = Date.now() - Number(range) * DAY;
  const events = useMemo(() => data.watchEvents.filter((e) => e.startedAt >= since), [data.watchEvents, since]);

  const trend = useMemo(() => {
    const today = startOfDay(Date.now());
    return Array.from({ length: 7 }, (_, i) => {
      const dayStart = today - (6 - i) * DAY;
      const row: Record<string, string | number> = {
        day: new Date(dayStart).toLocaleDateString(undefined, { weekday: 'short' }),
      };
      data.children.forEach((c) => {
        row[c.name] = Math.round(
          data.watchEvents
            .filter((e) => e.childId === c.id && e.startedAt >= dayStart && e.startedAt < dayStart + DAY)
            .reduce((s, e) => s + e.durationSeconds, 0) / 60,
        );
      });
      return row;
    });
  }, [data.watchEvents, data.children]);

  const topChannels = useMemo(() => {
    const totals = new Map<string, number>();
    events.forEach((e) => {
      const v = videoById.get(e.videoId)!;
      totals.set(v.channelName, (totals.get(v.channelName) ?? 0) + e.durationSeconds);
    });
    return [...totals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  }, [events, videoById]);

  const categoryCounts = useMemo(() => {
    const counts = Object.fromEntries(CATEGORIES.map((c) => [c, 0])) as Record<Category, number>;
    events
      .filter((e) => e.verdict !== 'allowed')
      .forEach((e) => {
        const v = videoById.get(e.videoId)!;
        const rules = data.rules.find((r) => r.childId === e.childId)!;
        computeVerdict(v.categoryScores, rules, '', []).triggered.forEach((c) => counts[c]++);
      });
    return CATEGORIES.map((c) => ({ category: c, count: counts[c] })).sort((a, b) => b.count - a.count);
  }, [events, videoById, data.rules]);

  const maxChannel = topChannels[0]?.[1] ?? 1;
  const maxCat = Math.max(1, ...categoryCounts.map((c) => c.count));

  const exportCsv = () => {
    const rows = events.map((e) => {
      const v = videoById.get(e.videoId)!;
      return {
        child: childById.get(e.childId)!.name,
        video: v.title,
        channel: v.channelName,
        verdict: e.verdict,
        started_at: new Date(e.startedAt).toISOString(),
        duration_seconds: e.durationSeconds,
      };
    });
    downloadFile(`insights-last-${range}-days.csv`, toCsv(rows), 'text/csv');
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Insights"
        description="Understand viewing habits and what the filters are catching."
        action={
          <div className="flex items-center gap-2">
            <Tabs
              label="Date range"
              value={range}
              onChange={setRange}
              items={[
                { value: '7', label: '7d' },
                { value: '14', label: '14d' },
                { value: '30', label: '30d' },
              ]}
            />
            <Button onClick={exportCsv}>
              <Download className="size-4" aria-hidden /> Export CSV
            </Button>
          </div>
        }
      />

      <Card>
        <CardHeader title="Watch time, last 7 days" description="Minutes per day" />
        <div className="h-64 p-4">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={trend} barGap={4}>
              <CartesianGrid vertical={false} stroke="var(--color-border)" />
              <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fill: 'var(--color-muted)', fontSize: 12 }} />
              <YAxis tickLine={false} axisLine={false} width={32} tick={{ fill: 'var(--color-muted)', fontSize: 12 }} />
              <Tooltip
                cursor={{ fill: 'var(--color-surface-2)' }}
                contentStyle={{ background: 'var(--color-surface)', border: '1px solid var(--color-border)', borderRadius: 8, fontSize: 12 }}
                labelStyle={{ color: 'var(--color-foreground)' }}
              />
              <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              {data.children.map((c) => (
                <Bar key={c.id} dataKey={c.name} fill={c.color} radius={[4, 4, 0, 0]} maxBarSize={22} />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader title="Top channels" description={`By watch time, last ${range} days`} />
          <ul className="flex flex-col gap-3 p-5">
            {topChannels.map(([name, secs]) => (
              <li key={name}>
                <div className="flex justify-between text-sm">
                  <span className="truncate">{name}</span>
                  <span className="font-mono text-xs text-muted">{formatDuration(secs)}</span>
                </div>
                <div className="mt-1.5 h-1.5 rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${(secs / maxChannel) * 100}%` }} />
                </div>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <CardHeader title="What triggered flags" description={`Categories over threshold, last ${range} days`} />
          <ul className="flex flex-col gap-3 p-5">
            {categoryCounts.map(({ category, count }) => (
              <li key={category} className="flex items-center gap-3 text-sm">
                <span className="w-32 shrink-0 truncate">{CATEGORY_LABELS[category]}</span>
                <div className="h-1.5 flex-1 rounded-full bg-surface-2">
                  <div className="h-full rounded-full bg-warning" style={{ width: `${(count / maxCat) * 100}%` }} />
                </div>
                <span className="w-6 text-right font-mono text-xs text-muted">{count}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
