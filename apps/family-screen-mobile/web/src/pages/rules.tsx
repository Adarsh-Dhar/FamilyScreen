import { useState, type FormEvent } from 'react';
import { Check, Plus, Search, X } from 'lucide-react';
import { useStore } from '../lib/store';
import { AGE_PRESET_LABELS, CATEGORY_LABELS, PRESET_THRESHOLDS } from '../lib/rules-engine';
import { CATEGORIES, type AgePreset } from '../lib/types';
import { Button, Card, CardHeader, ChildAvatar, Field, PageHeader, Tabs, cn, inputClass } from '../components/ui';

export function RulesPage() {
  const { data, updateRules, addChannelRule, removeChannelRule } = useStore();
  const [childId, setChildId] = useState(data.children[0].id);
  const [preset, setPreset] = useState<AgePreset>(data.children[0].agePreset);
  const [channelInput, setChannelInput] = useState('');
  const [channelType, setChannelType] = useState<'allow' | 'block'>('allow');
  const [search, setSearch] = useState('');

  const rules = data.rules.find((r) => r.childId === childId)!;
  const channels = data.channelRules
    .filter((r) => r.childId === childId)
    .filter((r) => r.channelName.toLowerCase().includes(search.toLowerCase()));
  const isCustom = CATEGORIES.some((c) => rules.categoryThresholds[c] !== PRESET_THRESHOLDS[preset][c]);

  const selectChild = (id: string) => {
    setChildId(id);
    setPreset(data.children.find((c) => c.id === id)!.agePreset);
  };

  const applyPreset = (p: AgePreset) => {
    if (isCustom && !window.confirm('This will overwrite your custom slider values. Continue?')) return;
    setPreset(p);
    updateRules(childId, { categoryThresholds: { ...PRESET_THRESHOLDS[p] } });
  };

  const handleAddChannel = (e: FormEvent) => {
    e.preventDefault();
    const raw = channelInput.trim();
    if (!raw) return;
    const handle = raw.match(/@([\w.-]+)/)?.[1] ?? raw;
    addChannelRule({ childId, channelId: `UC_${handle.toLowerCase().replace(/\W/g, '')}`, channelName: handle, type: channelType });
    setChannelInput('');
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Rule Editor"
        description="Changes save automatically and sync to the TV on its next check-in."
        action={
          <span className="flex items-center gap-1.5 text-xs text-muted">
            <Check className="size-3.5 text-primary" aria-hidden />
            Saved {new Date(rules.updatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
          </span>
        }
      />

      <Tabs
        label="Child"
        value={childId}
        onChange={selectChild}
        items={data.children.map((c) => ({ value: c.id, label: <><ChildAvatar child={c} size="sm" />{c.name}</> }))}
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_20rem]">
        <Card>
          <CardHeader
            title="Content thresholds"
            description="0 is strictest, 10 is most lenient. Videos scoring above a threshold are flagged or blocked."
            action={
              <select
                aria-label="Age preset"
                value={preset}
                onChange={(e) => applyPreset(e.target.value as AgePreset)}
                className="h-8 rounded-lg border border-border bg-background px-2 text-xs"
              >
                {(Object.keys(AGE_PRESET_LABELS) as AgePreset[]).map((p) => (
                  <option key={p} value={p}>
                    {AGE_PRESET_LABELS[p]}
                  </option>
                ))}
              </select>
            }
          />
          <div className="flex flex-col gap-5 p-5">
            {isCustom && <p className="rounded-md bg-surface-2 px-3 py-2 text-xs text-muted">Custom values — differs from the {AGE_PRESET_LABELS[preset]} preset.</p>}
            {CATEGORIES.map((cat) => {
              const val = rules.categoryThresholds[cat];
              return (
                <div key={cat} className="flex flex-col gap-2">
                  <div className="flex items-center justify-between">
                    <label htmlFor={`slider-${cat}`} className="text-sm">
                      {CATEGORY_LABELS[cat]}
                    </label>
                    <span className="font-mono text-xs text-muted">{val}/10</span>
                  </div>
                  <input
                    id={`slider-${cat}`}
                    type="range"
                    min={0}
                    max={10}
                    value={val}
                    onChange={(e) =>
                      updateRules(childId, { categoryThresholds: { ...rules.categoryThresholds, [cat]: Number(e.target.value) } })
                    }
                    className="w-full"
                  />
                  <div className="flex justify-between text-[10px] uppercase tracking-wide text-muted/70">
                    <span>Strict</span>
                    <span>Lenient</span>
                  </div>
                </div>
              );
            })}
          </div>
        </Card>

        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Schedule" />
            <div className="flex flex-col gap-4 p-5">
              <Field label="Daily watch limit (minutes)" htmlFor="limit">
                <input
                  id="limit"
                  type="number"
                  min={0}
                  step={15}
                  className={inputClass}
                  value={rules.dailyWatchLimitMinutes}
                  onChange={(e) => updateRules(childId, { dailyWatchLimitMinutes: Math.max(0, Number(e.target.value)) })}
                />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Bedtime starts" htmlFor="bed-start">
                  <input id="bed-start" type="time" className={inputClass} value={rules.bedtimeStart} onChange={(e) => updateRules(childId, { bedtimeStart: e.target.value })} />
                </Field>
                <Field label="Bedtime ends" htmlFor="bed-end">
                  <input id="bed-end" type="time" className={inputClass} value={rules.bedtimeEnd} onChange={(e) => updateRules(childId, { bedtimeEnd: e.target.value })} />
                </Field>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="Channels" description="Channel rules override content scores." />
            <form onSubmit={handleAddChannel} className="flex flex-col gap-2 border-b border-border p-4">
              <input
                aria-label="Channel URL or name"
                className={inputClass}
                placeholder="youtube.com/@channel or name"
                value={channelInput}
                onChange={(e) => setChannelInput(e.target.value)}
              />
              <div className="flex gap-2">
                <select
                  aria-label="Rule type"
                  value={channelType}
                  onChange={(e) => setChannelType(e.target.value as 'allow' | 'block')}
                  className="h-10 flex-1 rounded-lg border border-border bg-background px-2 text-sm"
                >
                  <option value="allow">Always allow</option>
                  <option value="block">Always block</option>
                </select>
                <Button type="submit" variant="primary" aria-label="Add channel">
                  <Plus className="size-4" aria-hidden /> Add
                </Button>
              </div>
            </form>
            <div className="p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted" aria-hidden />
                <input aria-label="Search channels" className={cn(inputClass, 'h-9 pl-9')} placeholder="Search list" value={search} onChange={(e) => setSearch(e.target.value)} />
              </div>
              <ul className="mt-3 flex flex-col gap-1">
                {channels.length === 0 && <li className="py-4 text-center text-xs text-muted">No channels</li>}
                {channels.map((r) => (
                  <li key={r.id} className="flex items-center gap-2 rounded-md px-2 py-1.5 hover:bg-surface-2">
                    <span className={cn('size-1.5 rounded-full', r.type === 'allow' ? 'bg-primary' : 'bg-danger')} aria-hidden />
                    <span className="flex-1 truncate text-sm">{r.channelName}</span>
                    <span className="text-[11px] text-muted">{r.type === 'allow' ? 'Allowed' : 'Blocked'}</span>
                    <button onClick={() => removeChannelRule(r.id)} className="rounded p-1 text-muted hover:text-foreground" aria-label={`Remove ${r.channelName}`}>
                      <X className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
