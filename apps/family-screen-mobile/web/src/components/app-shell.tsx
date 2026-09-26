import { NavLink, Outlet } from 'react-router-dom';
import { Bell, ChartColumn, History, LayoutDashboard, LogOut, ShieldCheck, SlidersHorizontal, Tv, UserCog } from 'lucide-react';
import { useStore } from '../lib/store';
import { cn } from './ui';

const NAV = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/rules', label: 'Rule Editor', icon: SlidersHorizontal },
  { to: '/activity', label: 'Activity', icon: History },
  { to: '/review', label: 'Review Queue', icon: ShieldCheck, badge: true },
  { to: '/insights', label: 'Insights', icon: ChartColumn },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/account', label: 'Account', icon: UserCog },
];

export function AppShell() {
  const { data, signOut } = useStore();
  const pending = data.reviewRequests.filter((r) => r.status === 'pending').length;
  const owner = data.guardians.find((g) => g.role === 'owner');

  return (
    <div className="flex min-h-dvh">
      <aside className="sticky top-0 hidden h-dvh w-60 shrink-0 flex-col border-r border-border bg-surface md:flex">
        <div className="flex items-center gap-2.5 px-5 py-5">
          <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Tv className="size-4" aria-hidden />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold">Family Screen</p>
            <p className="text-[11px] text-muted">Guardian</p>
          </div>
        </div>
        <nav aria-label="Main" className="flex flex-1 flex-col gap-0.5 px-3">
          {NAV.map(({ to, label, icon: Icon, badge }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                cn(
                  'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition',
                  isActive ? 'bg-surface-2 font-medium text-foreground' : 'text-muted hover:bg-surface-2/60 hover:text-foreground',
                )
              }
            >
              <Icon className="size-4" aria-hidden />
              <span className="flex-1">{label}</span>
              {badge && pending > 0 && (
                <span className="rounded-full bg-warning/20 px-1.5 text-[11px] font-semibold text-warning">{pending}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="flex items-center gap-3 border-t border-border px-4 py-4">
          <span className="flex size-8 items-center justify-center rounded-full bg-surface-2 text-xs font-semibold">
            {owner?.name.split(' ').map((p) => p[0]).join('')}
          </span>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-sm font-medium">{owner?.name}</p>
            <p className="truncate text-[11px] text-muted">{data.householdName}</p>
          </div>
          <button onClick={signOut} className="rounded-md p-1.5 text-muted hover:bg-surface-2 hover:text-foreground" aria-label="Sign out">
            <LogOut className="size-4" />
          </button>
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-24 pt-6 sm:px-8 md:pb-10 md:pt-8">
          <Outlet />
        </main>
      </div>

      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-20 flex border-t border-border bg-surface/95 backdrop-blur md:hidden">
        {NAV.slice(0, 5).map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn('flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px]', isActive ? 'text-primary' : 'text-muted')
            }
          >
            <Icon className="size-5" aria-hidden />
            {label.split(' ')[0]}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
