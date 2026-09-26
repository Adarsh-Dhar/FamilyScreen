import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLookups, useStore } from '../lib/store';
import { DAY, formatDateTime, formatDuration, toDateInput } from '../lib/format';
import type { Verdict } from '../lib/types';
import { Button, Card, EmptyState, Field, PageHeader, VerdictBadge, inputClass } from '../components/ui';

const PAGE_SIZE = 10;

export function ActivityPage() {
  const { data } = useStore();
  const { videoById, childById } = useLookups();
  const [childId, setChildId] = useState('all');
  const [verdict, setVerdict] = useState<'all' | Verdict>('all');
  const [from, setFrom] = useState(toDateInput(Date.now() - 7 * DAY));
  const [to, setTo] = useState(toDateInput(Date.now()));
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const fromTs = new Date(`${from}T00:00`).getTime();
    const toTs = new Date(`${to}T23:59:59`).getTime();
    return data.watchEvents.filter(
      (e) =>
        (childId === 'all' || e.childId === childId) &&
        (verdict === 'all' || e.verdict === verdict) &&
        e.startedAt >= fromTs &&
        e.startedAt <= toTs,
    );
  }, [data.watchEvents, childId, verdict, from, to]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pageCount - 1);
  const rows = filtered.slice(current * PAGE_SIZE, (current + 1) * PAGE_SIZE);
  const resetPage = <T,>(fn: (v: T) => void) => (v: T) => {
    fn(v);
    setPage(0);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Activity" description="Every video your children tried to watch, with the verdict applied." />

      <Card className="grid gap-3 p-4 sm:grid-cols-4">
        <Field label="Child" htmlFor="f-child">
          <select id="f-child" className={inputClass} value={childId} onChange={(e) => resetPage(setChildId)(e.target.value)}>
            <option value="all">All children</option>
            {data.children.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Verdict" htmlFor="f-verdict">
          <select id="f-verdict" className={inputClass} value={verdict} onChange={(e) => resetPage(setVerdict)(e.target.value as 'all' | Verdict)}>
            <option value="all">All verdicts</option>
            <option value="allowed">Allowed</option>
            <option value="flagged">Flagged</option>
            <option value="blocked">Blocked</option>
          </select>
        </Field>
        <Field label="From" htmlFor="f-from">
          <input id="f-from" type="date" className={inputClass} value={from} onChange={(e) => resetPage(setFrom)(e.target.value)} />
        </Field>
        <Field label="To" htmlFor="f-to">
          <input id="f-to" type="date" className={inputClass} value={to} onChange={(e) => resetPage(setTo)(e.target.value)} />
        </Field>
      </Card>

      <Card className="overflow-hidden">
        {rows.length === 0 ? (
          <EmptyState title="No activity matches these filters" description="Try widening the date range." />
        ) : (
          <>
            <table className="hidden w-full text-left text-sm md:table">
              <thead className="border-b border-border text-xs text-muted">
                <tr>
                  <th className="px-5 py-3 font-medium">Video</th>
                  <th className="px-3 py-3 font-medium">Child</th>
                  <th className="px-3 py-3 font-medium">Verdict</th>
                  <th className="px-3 py-3 font-medium">When</th>
                  <th className="px-5 py-3 text-right font-medium">Duration</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((e) => {
                  const v = videoById.get(e.videoId)!;
                  return (
                    <tr key={e.id} className="hover:bg-surface-2/50">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <img src={v.thumbnail} alt="" className="aspect-video w-20 shrink-0 rounded-md object-cover" />
                          <div className="min-w-0">
                            <p className="truncate font-medium">{v.title}</p>
                            <p className="truncate text-xs text-muted">{v.channelName}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-3 text-muted">{childById.get(e.childId)?.name}</td>
                      <td className="px-3 py-3">
                        <VerdictBadge verdict={e.verdict} />
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-muted">{formatDateTime(e.startedAt)}</td>
                      <td className="px-5 py-3 text-right font-mono text-xs text-muted">{e.durationSeconds ? formatDuration(e.durationSeconds) : '—'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <ul className="divide-y divide-border md:hidden">
              {rows.map((e) => {
                const v = videoById.get(e.videoId)!;
                return (
                  <li key={e.id} className="flex gap-3 p-4">
                    <img src={v.thumbnail} alt="" className="aspect-video w-24 shrink-0 rounded-md object-cover" />
                    <div className="min-w-0 flex-1">
                      <p className="line-clamp-2 text-sm font-medium">{v.title}</p>
                      <p className="text-xs text-muted">
                        {childById.get(e.childId)?.name} · {formatDateTime(e.startedAt)}
                      </p>
                      <div className="mt-2 flex items-center gap-2">
                        <VerdictBadge verdict={e.verdict} />
                        <span className="font-mono text-xs text-muted">{e.durationSeconds ? formatDuration(e.durationSeconds) : ''}</span>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </>
        )}
        <div className="flex items-center justify-between border-t border-border px-5 py-3 text-xs text-muted">
          <span>
            {filtered.length} events · Page {current + 1} of {pageCount}
          </span>
          <div className="flex gap-2">
            <Button size="sm" onClick={() => setPage(current - 1)} disabled={current === 0} aria-label="Previous page">
              <ChevronLeft className="size-4" />
            </Button>
            <Button size="sm" onClick={() => setPage(current + 1)} disabled={current >= pageCount - 1} aria-label="Next page">
              <ChevronRight className="size-4" />
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
