import { useStore } from '../lib/store';
import type { NotifyChannel, NotifyEvent } from '../lib/types';
import { Card, CardHeader, Field, PageHeader, Switch, inputClass } from '../components/ui';

const EVENTS: { key: NotifyEvent; label: string; description: string }[] = [
  { key: 'blocked', label: 'Video blocked', description: 'A video was stopped by the rules engine' },
  { key: 'review_requested', label: 'Review requested', description: 'A flag or kid request needs a decision' },
  { key: 'limit_reached', label: 'Daily limit reached', description: 'Watch time hit the daily limit' },
  { key: 'repeated_block', label: 'Repeated block attempts', description: '3+ blocked attempts within 15 minutes' },
];

const CHANNELS: { key: NotifyChannel; label: string }[] = [
  { key: 'push', label: 'Push' },
  { key: 'email', label: 'Email' },
  { key: 'sms', label: 'SMS' },
];

export function NotificationsPage() {
  const { data, updateNotifications } = useStore();
  const n = data.notifications;

  const toggle = (event: NotifyEvent, channel: NotifyChannel, value: boolean) =>
    updateNotifications({ prefs: { ...n.prefs, [event]: { ...n.prefs[event], [channel]: value } } });

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Notifications" description="Choose how and when you want to hear about activity." />

      <Card className="overflow-hidden">
        <CardHeader title="Alerts" description="Preferences apply to your guardian account only." />
        <table className="w-full text-sm">
          <thead className="border-b border-border text-xs text-muted">
            <tr>
              <th className="px-5 py-3 text-left font-medium">Event</th>
              {CHANNELS.map((c) => (
                <th key={c.key} className="w-20 px-3 py-3 text-center font-medium">
                  {c.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {EVENTS.map((ev) => (
              <tr key={ev.key}>
                <td className="px-5 py-4">
                  <p className="font-medium">{ev.label}</p>
                  <p className="text-xs text-muted">{ev.description}</p>
                </td>
                {CHANNELS.map((c) => (
                  <td key={c.key} className="px-3 py-4 text-center">
                    <div className="flex justify-center">
                      <Switch checked={n.prefs[ev.key][c.key]} onChange={(v) => toggle(ev.key, c.key, v)} label={`${ev.label} via ${c.label}`} />
                    </div>
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card>
        <CardHeader
          title="Quiet hours"
          description="Non-critical alerts are held until quiet hours end. Repeated block attempts always come through."
          action={<Switch checked={n.quietHoursEnabled} onChange={(v) => updateNotifications({ quietHoursEnabled: v })} label="Enable quiet hours" />}
        />
        <div className="grid max-w-md grid-cols-2 gap-3 p-5">
          <Field label="Starts" htmlFor="quiet-start">
            <input id="quiet-start" type="time" className={inputClass} disabled={!n.quietHoursEnabled} value={n.quietStart} onChange={(e) => updateNotifications({ quietStart: e.target.value })} />
          </Field>
          <Field label="Ends" htmlFor="quiet-end">
            <input id="quiet-end" type="time" className={inputClass} disabled={!n.quietHoursEnabled} value={n.quietEnd} onChange={(e) => updateNotifications({ quietEnd: e.target.value })} />
          </Field>
        </div>
      </Card>
    </div>
  );
}
