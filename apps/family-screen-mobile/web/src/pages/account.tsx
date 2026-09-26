import { useState, type FormEvent } from 'react';
import { Download, Mail, Trash2, Tv } from 'lucide-react';
import { useStore } from '../lib/store';
import { downloadFile, formatRelative } from '../lib/format';
import { Button, Card, CardHeader, ChildAvatar, PageHeader, inputClass } from '../components/ui';

export function AccountPage() {
  const { data, inviteGuardian, revokeInvite, unpairDevice, deleteChildData } = useStore();
  const [email, setEmail] = useState('');
  const [emailError, setEmailError] = useState('');

  const handleInvite = (e: FormEvent) => {
    e.preventDefault();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setEmailError('Enter a valid email address.');
      return;
    }
    setEmailError('');
    inviteGuardian(email);
    setEmail('');
  };

  const exportChild = (childId: string) => {
    const child = data.children.find((c) => c.id === childId)!;
    const payload = {
      child,
      rules: data.rules.find((r) => r.childId === childId),
      channelRules: data.channelRules.filter((r) => r.childId === childId),
      watchEvents: data.watchEvents.filter((e) => e.childId === childId),
      reviewRequests: data.reviewRequests.filter((r) => r.childId === childId),
    };
    downloadFile(`${child.name.toLowerCase()}-data.json`, JSON.stringify(payload, null, 2), 'application/json');
  };

  const deleteChild = (childId: string) => {
    const child = data.children.find((c) => c.id === childId)!;
    const typed = window.prompt(`This permanently deletes all watch history and review requests for ${child.name}. Type "${child.name}" to confirm.`);
    if (typed === child.name) void deleteChildData(childId, typed);
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Account" description={data.householdName} />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Guardians" description="Everyone who can manage rules and review activity." />
          <ul className="divide-y divide-border">
            {data.guardians.map((g) => (
              <li key={g.id} className="flex items-center gap-3 px-5 py-3">
                <span className="flex size-8 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold">
                  {g.name.split(' ').map((p) => p[0]).join('')}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{g.name}</p>
                  <p className="truncate text-xs text-muted">{g.email}</p>
                </div>
                <span className="text-xs capitalize text-muted">{g.role}</span>
              </li>
            ))}
            {data.invites.map((inv) => (
              <li key={inv.id} className="flex items-center gap-3 px-5 py-3">
                <span className="flex size-8 items-center justify-center rounded-full border border-dashed border-border">
                  <Mail className="size-3.5 text-muted" aria-hidden />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm">{inv.email}</p>
                  <p className="text-xs text-muted">Invite pending · expires in 7 days</p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => revokeInvite(inv.id)}>
                  Revoke
                </Button>
              </li>
            ))}
          </ul>
          <form onSubmit={handleInvite} className="border-t border-border p-4" noValidate>
            <div className="flex gap-2">
              <input
                aria-label="Guardian email"
                type="email"
                className={inputClass}
                placeholder="guardian@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                aria-invalid={!!emailError}
              />
              <Button type="submit" variant="primary">
                Invite
              </Button>
            </div>
            {emailError && <p className="mt-2 text-xs text-danger">{emailError}</p>}
          </form>
        </Card>

        <Card>
          <CardHeader title="Paired devices" />
          <ul className="divide-y divide-border">
            {data.children.map((c) => {
              const devices = data.devices.filter((d) => d.childId === c.id);
              return (
                <li key={c.id} className="px-5 py-3">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <ChildAvatar child={c} size="sm" /> {c.name}
                  </div>
                  {devices.length === 0 ? (
                    <p className="mt-2 pl-8 text-xs text-muted">No devices paired</p>
                  ) : (
                    <ul className="mt-2 flex flex-col gap-2 pl-8">
                      {devices.map((d) => (
                        <li key={d.id} className="flex items-center gap-3">
                          <Tv className="size-4 text-muted" aria-hidden />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm">{d.name}</p>
                            <p className="text-xs text-muted">Last seen {formatRelative(d.lastSeenAt)}</p>
                          </div>
                          <Button size="sm" variant="ghost" onClick={() => window.confirm(`Unpair ${d.name}? It will lose access immediately.`) && unpairDevice(d.id)}>
                            Unpair
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              );
            })}
          </ul>
        </Card>

        <Card>
          <CardHeader title="Plan & billing" />
          <div className="flex items-center justify-between p-5">
            <div>
              <p className="text-sm font-medium">{data.plan}</p>
              <p className="text-xs text-muted">Up to 5 children and 10 devices</p>
            </div>
            <Button disabled title="Billing provider not connected yet">
              Manage plan
            </Button>
          </div>
        </Card>

        <Card>
          <CardHeader title="Data controls" description="Export or permanently delete a child's data (COPPA / GDPR-K)." />
          <ul className="divide-y divide-border">
            {data.children.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-2 px-5 py-3">
                <span className="flex flex-1 items-center gap-2 text-sm">
                  <ChildAvatar child={c} size="sm" /> {c.name}
                </span>
                <Button size="sm" onClick={() => exportChild(c.id)}>
                  <Download className="size-3.5" aria-hidden /> Export
                </Button>
                <Button size="sm" variant="danger" onClick={() => deleteChild(c.id)}>
                  <Trash2 className="size-3.5" aria-hidden /> Delete
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
