import { useState } from 'react';
import { Check, Hand, X } from 'lucide-react';
import { useLookups, useStore } from '../lib/store';
import { CATEGORY_LABELS } from '../lib/rules-engine';
import { formatRelative } from '../lib/format';
import { CATEGORIES, type ReviewRequest } from '../lib/types';
import { Button, Card, EmptyState, PageHeader, Tabs, cn } from '../components/ui';

export function ReviewPage() {
  const { data } = useStore();
  const [tab, setTab] = useState<'auto_flag' | 'kid_request'>('auto_flag');
  const pending = data.reviewRequests.filter((r) => r.status === 'pending');
  const autoCount = pending.filter((r) => r.source === 'auto_flag').length;
  const kidCount = pending.filter((r) => r.source === 'kid_request').length;
  const list = pending.filter((r) => r.source === tab);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Review Queue" description="Decide on videos the classifier flagged or your kids asked to watch." />
      <Tabs
        label="Review type"
        value={tab}
        onChange={setTab}
        items={[
          { value: 'auto_flag', label: `Awaiting review (${autoCount})` },
          { value: 'kid_request', label: `Kid requests (${kidCount})` },
        ]}
      />
      {list.length === 0 ? (
        <Card>
          <EmptyState title="All caught up" description="Nothing is waiting for a decision." />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {list.map((r) => (
            <ReviewCard key={r.id} request={r} />
          ))}
        </div>
      )}
    </div>
  );
}

function ReviewCard({ request }: { request: ReviewRequest }) {
  const { data, resolveReview } = useStore();
  const { videoById, childById } = useLookups();
  const [scope, setScope] = useState<'video' | 'channel'>('video');
  const [addToBlocklist, setAddToBlocklist] = useState(false);
  const video = videoById.get(request.videoId)!;
  const child = childById.get(request.childId)!;
  const thresholds = data.rules.find((r) => r.childId === child.id)!.categoryThresholds;

  return (
    <Card className="flex flex-col">
      <div className="flex gap-4 p-5">
        <img src={video.thumbnail} alt="" className="aspect-video w-32 shrink-0 rounded-lg object-cover" />
        <div className="min-w-0">
          <p className="line-clamp-2 text-sm font-medium">{video.title}</p>
          <p className="mt-1 text-xs text-muted">{video.channelName}</p>
          <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
            {request.source === 'kid_request' && <Hand className="size-3.5 text-warning" aria-hidden />}
            {request.source === 'kid_request' ? `${child.name} asked` : `Flagged for ${child.name}`} · {formatRelative(request.createdAt)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-x-6 gap-y-2 border-t border-border px-5 py-4">
        {CATEGORIES.map((cat) => {
          const score = video.categoryScores[cat];
          const over = score > thresholds[cat];
          return (
            <div key={cat} className="flex items-center gap-2 text-xs">
              <span className={cn('w-24 truncate', over ? 'text-foreground' : 'text-muted')}>{CATEGORY_LABELS[cat]}</span>
              <div className="h-1.5 flex-1 rounded-full bg-surface-2">
                <div className={cn('h-full rounded-full', over ? 'bg-danger' : 'bg-muted/50')} style={{ width: `${score * 10}%` }} />
              </div>
              <span className={cn('w-4 text-right font-mono', over ? 'text-danger' : 'text-muted')}>{score}</span>
            </div>
          );
        })}
      </div>

      <div className="mt-auto flex flex-col gap-3 border-t border-border p-5">
        <fieldset className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
          <legend className="sr-only">Approval scope</legend>
          <label className="flex cursor-pointer items-center gap-2">
            <input type="radio" name={`scope-${request.id}`} checked={scope === 'video'} onChange={() => setScope('video')} className="accent-[var(--color-primary)]" />
            This video only
          </label>
          <label className="flex cursor-pointer items-center gap-2">
            <input type="radio" name={`scope-${request.id}`} checked={scope === 'channel'} onChange={() => setScope('channel')} className="accent-[var(--color-primary)]" />
            Allow whole channel
          </label>
          <label className="flex cursor-pointer items-center gap-2 text-muted">
            <input type="checkbox" checked={addToBlocklist} onChange={(e) => setAddToBlocklist(e.target.checked)} className="accent-[var(--color-danger)]" />
            Block channel if denied
          </label>
        </fieldset>
        <div className="flex gap-2">
          <Button variant="primary" className="flex-1" onClick={() => resolveReview(request.id, 'approved', scope)}>
            <Check className="size-4" aria-hidden /> Approve
          </Button>
          <Button variant="danger" className="flex-1" onClick={() => resolveReview(request.id, 'denied', addToBlocklist ? 'channel' : 'none')}>
            <X className="size-4" aria-hidden /> Confirm block
          </Button>
        </div>
      </div>
    </Card>
  );
}
