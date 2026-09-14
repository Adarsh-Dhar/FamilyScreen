import { type FormEvent, type ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Link, Route, Switch, useLocation, useParams, Router as WouterRouter } from 'wouter';
import {
  AlertCircle,
  ArrowRight,
  Bell,
  Check,
  CheckCircle2,
  ChevronDown,
  Clapperboard,
  Film,
  HeartHandshake,
  KeyRound,
  Laptop,
  LoaderCircle,
  LockKeyhole,
  LogOut,
  MonitorPlay,
  Radio,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Sparkles,
  Tv,
  Users,
  Wifi,
  X,
  XCircle,
} from 'lucide-react';
import {
  ContentVerdict,
  DecisionRequestDecision,
  getGetPairingStatusQueryKey,
  getGetProfilesQueryKey,
  getSearchTitlesQueryKey,
  useConfirmPairing,
  useCreatePairing,
  useDecideTitle,
  useGetPairingStatus,
  useGetProfiles,
  useSearchTitles,
  useSelectTitle,
  useUpdateThresholds,
  type ChildProfile,
  type PairSession,
  type ParentAccount,
  type Thresholds,
  type Title,
  type TitleSelectionResponse,
} from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import NotFound from '@/pages/not-found';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';

const queryClient = new QueryClient();
const levels: Thresholds[keyof Thresholds][] = ['none', 'mild', 'moderate', 'severe'];
const thresholdLabels: Record<keyof Thresholds, string> = {
  violence: 'Violence',
  language: 'Language',
  sexContent: 'Sexual content',
  substances: 'Substances',
  scaryContent: 'Scary content',
};

function readSaved(key: string, fallback = '') {
  try {
    return window.localStorage.getItem(key) || fallback;
  } catch {
    return fallback;
  }
}

function saveValue(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Local storage is a convenience for the browser demo, not a dependency.
  }
}

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function Poster({ title, large = false }: { title: Title; large?: boolean }) {
  const initials = title.title.split(' ').slice(0, 2).map((word) => word[0]).join('');
  return title.posterPath ? (
    <img
      src={title.posterPath}
      alt={`${title.title} poster`}
      data-testid={`img-poster-${title.id}`}
      className={cx('h-full w-full object-cover', large && 'brightness-95')}
    />
  ) : (
    <div
      data-testid={`img-poster-${title.id}`}
      className="flex h-full w-full items-end bg-[radial-gradient(circle_at_70%_15%,hsl(164_43%_52%/.55),transparent_34%),linear-gradient(145deg,hsl(224_32%_20%),hsl(224_32%_36%))] p-4"
    >
      <span className="font-display text-4xl leading-none text-[hsl(var(--card))]">{initials}</span>
    </div>
  );
}

function Brand({ dark = false }: { dark?: boolean }) {
  return (
    <Link href="/tv" className="focus-ring group flex items-center gap-3" data-testid="link-brand">
      <span className={cx('grid h-10 w-10 place-items-center rounded-2xl transition-transform group-hover:-rotate-6', dark ? 'bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]' : 'bg-[hsl(var(--primary))] text-[hsl(var(--card))]')}>
        <Clapperboard size={20} strokeWidth={2.2} />
      </span>
      <span className={cx('font-display text-xl tracking-tight', dark ? 'text-[hsl(var(--sidebar-foreground))]' : 'text-[hsl(var(--foreground))]')}>family<span className="text-[hsl(var(--accent))]">screen</span></span>
    </Link>
  );
}

function DeviceSwitcher({ current }: { current: 'tv' | 'parent' }) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card)/.76)] p-1 shadow-sm" data-testid="device-switcher">
      <Link href="/tv" data-testid="link-switch-tv" className={cx('flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold transition-colors', current === 'tv' ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]')}>
        <Tv size={14} /> TV
      </Link>
      <Link href="/parent" data-testid="link-switch-parent" className={cx('flex items-center gap-2 rounded-full px-3 py-2 text-xs font-bold transition-colors', current === 'parent' ? 'bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))]' : 'text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]')}>
        <Laptop size={14} /> Parent
      </Link>
    </div>
  );
}

function StatusPill({ connected, label }: { connected: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card)/.6)] px-3 py-1.5 text-[11px] font-bold uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))]" data-testid="status-connection">
      <span className={cx('h-2 w-2 rounded-full', connected ? 'bg-[hsl(var(--secondary))]' : 'bg-[hsl(var(--accent))]')} />
      {label}
    </span>
  );
}

function LoadingRows({ count = 3 }: { count?: number }) {
  return <div className="space-y-3" data-testid="loading-state">{Array.from({ length: count }).map((_, index) => <div key={index} className="h-16 animate-pulse rounded-2xl bg-[hsl(var(--muted))]" />)}</div>;
}

function ErrorNotice({ message, onRetry }: { message?: string; onRetry?: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-[hsl(var(--destructive)/.3)] bg-[hsl(var(--destructive)/.08)] p-4 text-sm text-[hsl(var(--destructive))]" data-testid="error-state">
      <div className="flex items-start gap-3"><AlertCircle size={18} className="mt-0.5 shrink-0" /><span>{message || 'Something did not load. Try again.'}</span></div>
      {onRetry && <button onClick={onRetry} data-testid="button-retry" className="rounded-lg px-3 py-1.5 font-bold hover:bg-[hsl(var(--destructive)/.1)]">Retry</button>}
    </div>
  );
}

function TVShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-[100dvh] overflow-x-hidden bg-[hsl(var(--background))]">
      <header className="relative z-10 flex items-center justify-between px-5 py-5 md:px-10 md:py-7">
        <Brand />
        <div className="flex items-center gap-3"><StatusPill connected label="TV demo" /><DeviceSwitcher current="tv" /></div>
      </header>
      {children}
      <footer className="mx-auto flex max-w-7xl items-center justify-between px-5 py-8 text-xs text-[hsl(var(--muted-foreground))] md:px-10">
        <span className="flex items-center gap-2"><ShieldCheck size={15} /> A softer way to say yes.</span>
        <span className="font-data">FAMILYSCREEN / FIRE TV</span>
      </footer>
    </div>
  );
}

function ParentShell({ children, accountId }: { children: ReactNode; accountId: string }) {
  const [location] = useLocation();
  return (
    <div className="min-h-[100dvh] bg-[hsl(var(--background))]">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-[248px] flex-col bg-[hsl(var(--sidebar))] p-6 text-[hsl(var(--sidebar-foreground))] md:flex">
        <Brand dark />
        <div className="mt-14 space-y-2">
          <div className="px-3 pb-3 text-[10px] font-bold uppercase tracking-[.2em] text-[hsl(var(--sidebar-foreground)/.5)]">Your household</div>
          <Link href="/parent" className={cx('flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold transition-colors', location === '/parent' ? 'bg-[hsl(var(--sidebar-accent))] text-[hsl(var(--sidebar-foreground))]' : 'text-[hsl(var(--sidebar-foreground)/.67)] hover:bg-[hsl(var(--sidebar-accent))]')} data-testid="link-overview"><Users size={17} /> Family overview</Link>
          <a href="#thresholds" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-[hsl(var(--sidebar-foreground)/.67)] transition-colors hover:bg-[hsl(var(--sidebar-accent))]" data-testid="link-thresholds"><SlidersHorizontal size={17} /> Content settings</a>
          <a href="#requests" className="flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-bold text-[hsl(var(--sidebar-foreground)/.67)] transition-colors hover:bg-[hsl(var(--sidebar-accent))]" data-testid="link-requests"><Bell size={17} /> Requests</a>
        </div>
        <div className="mt-auto rounded-2xl border border-[hsl(var(--sidebar-border))] bg-[hsl(var(--sidebar-accent)/.55)] p-4">
          <div className="mb-3 flex items-center gap-2 text-xs font-bold text-[hsl(var(--secondary))]"><Radio size={14} /> Paired device</div>
          <p className="text-sm font-bold">Living room Fire TV</p>
          <p className="mt-1 truncate font-data text-[10px] text-[hsl(var(--sidebar-foreground)/.52)]">{accountId || 'Not paired yet'}</p>
        </div>
        <div className="mt-5 flex items-center justify-between border-t border-[hsl(var(--sidebar-border))] pt-5 text-xs text-[hsl(var(--sidebar-foreground)/.45)]"><span>family screen</span><span>v1.0</span></div>
      </aside>
      <main className="md:pl-[248px]">{children}</main>
    </div>
  );
}

function PairCode({ session }: { session: PairSession }) {
  const remaining = new Date(session.expiresAt).getTime() - Date.now();
  return (
    <div className="relative overflow-hidden rounded-[2rem] bg-[hsl(var(--primary))] p-7 text-[hsl(var(--primary-foreground))] shadow-warm md:p-10">
      <div className="absolute -right-16 -top-16 h-48 w-48 rounded-full border-[20px] border-[hsl(var(--secondary)/.22)]" />
      <div className="relative">
        <div className="mb-9 flex items-start justify-between"><div><p className="mb-2 text-xs font-bold uppercase tracking-[.2em] text-[hsl(var(--secondary))]">Pair this screen</p><h2 className="font-display text-3xl">A little code, then you’re in.</h2></div><KeyRound className="text-[hsl(var(--secondary))]" size={28} /></div>
        <div className="flex items-end justify-between gap-4"><div className="font-data text-6xl font-medium tracking-[.18em] text-[hsl(var(--card))] md:text-7xl" data-testid="text-pair-code">{session.code}</div><div className="pb-2 text-right text-xs text-[hsl(var(--primary-foreground)/.58)]"><p>Enter on the parent</p><p className="mt-1 font-data">{remaining > 0 ? 'expires soon' : 'expired'}</p></div></div>
      </div>
    </div>
  );
}

function PairingCard({ onCreated, accountId, setAccountId }: { onCreated: (session: PairSession) => void; accountId: string; setAccountId: (value: string) => void }) {
  const createPairing = useCreatePairing();
  const handleCreate = () => {
    if (!accountId.trim()) return;
    createPairing.mutate({ data: { parentAccountId: accountId.trim() } }, { onSuccess: onCreated });
  };
  return (
    <div className="rounded-[2rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-7 shadow-warm md:p-10" data-testid="card-pair-device">
      <div className="mb-8 flex items-center justify-between"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-[hsl(var(--secondary)/.18)] text-[hsl(var(--secondary-foreground))]"><Wifi size={22} /></div><span className="font-data text-xs text-[hsl(var(--muted-foreground))]">STEP 01 / 02</span></div>
      <h2 className="font-display text-3xl">Bring your living room in.</h2>
      <p className="mt-3 max-w-sm text-sm leading-6 text-[hsl(var(--muted-foreground))]">Pair this TV with the family account your parent uses. Nothing is shared until a parent says yes.</p>
      <div className="mt-8">
        <label htmlFor="tv-account-id" className="mb-2 block text-xs font-bold uppercase tracking-[.13em] text-[hsl(var(--muted-foreground))]">Parent account ID</label>
        <input id="tv-account-id" data-testid="input-tv-account-id" value={accountId} onChange={(event) => setAccountId(event.target.value)} className="focus-ring w-full rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-4 py-3 font-data text-sm outline-none" placeholder="family-demo" />
      </div>
      <button onClick={handleCreate} disabled={createPairing.isPending} data-testid="button-create-pairing" className="focus-ring mt-8 flex w-full items-center justify-between rounded-xl bg-[hsl(var(--primary))] px-5 py-4 text-left text-sm font-bold text-[hsl(var(--primary-foreground))] transition-transform hover:-translate-y-0.5 disabled:opacity-60">
        <span>{createPairing.isPending ? 'Creating a secure session…' : 'Create pairing code'}</span>{createPairing.isPending ? <LoaderCircle className="animate-spin" size={18} /> : <ArrowRight size={18} />}
      </button>
      {createPairing.isError && <p className="mt-3 text-xs text-[hsl(var(--destructive))]" data-testid="text-pairing-error">We couldn’t start pairing. Check the account ID and try again.</p>}
    </div>
  );
}

function TVHome() {
  const [accountId, setAccountId] = useState(readSaved('family-screen-account', 'family-demo'));
  const [session, setSession] = useState<PairSession | null>(null);
  const [selectedChild, setSelectedChild] = useState<ChildProfile | null>(null);
  const [search, setSearch] = useState('');
  const [activeTitle, setActiveTitle] = useState<Title | null>(null);
  const [selection, setSelection] = useState<TitleSelectionResponse | null>(null);
  const [notice, setNotice] = useState('');
  const [playing, setPlaying] = useState(false);
  const tvParentId = session?.parentAccountId || '';
  const pairingStatus = useGetPairingStatus(session?.code || '', { query: { enabled: Boolean(session?.code), refetchInterval: session ? 1800 : false, queryKey: getGetPairingStatusQueryKey(session?.code || '') } });
  const profiles = useGetProfiles(tvParentId, { query: { enabled: Boolean(tvParentId), queryKey: getGetProfilesQueryKey(tvParentId) } });
  const searchParams = useMemo(() => ({ q: search.trim() }), [search]);
  const searchResults = useSearchTitles(searchParams, { query: { enabled: search.trim().length > 1, queryKey: getSearchTitlesQueryKey(searchParams) } });
  const selectTitle = useSelectTitle();
  const children = profiles.data?.parentAccount.children || pairingStatus.data?.parentAccount?.children || [];
  const hasPaired = Boolean(session && pairingStatus.data?.confirmed);
  useTvDecisionSocket(tvParentId, selection?.requestId || '', (decision) => {
    setSelection((current) => current ? { ...current, verdict: decision === 'approved' ? ContentVerdict.approved : ContentVerdict.blocked } : current);
    setNotice(decision === 'approved' ? 'Approved. Opening on your streaming service…' : 'Not approved this time. The title will stay closed.');
    setPlaying(decision === 'approved');
  });
  useEffect(() => {
    if (!hasPaired || activeTitle) return;
    const handleRemoteKey = (event: KeyboardEvent) => {
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
      const focusable = Array.from(document.querySelectorAll<HTMLElement>('[data-tv-focus="true"]'));
      const currentIndex = focusable.indexOf(document.activeElement as HTMLElement);
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
        event.preventDefault();
        focusable[(currentIndex + 1 + focusable.length) % focusable.length]?.focus();
      } else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') {
        event.preventDefault();
        focusable[(currentIndex - 1 + focusable.length) % focusable.length]?.focus();
      } else if (event.key === 'Enter' && document.activeElement instanceof HTMLElement) {
        event.preventDefault();
        document.activeElement.click();
      }
    };
    window.addEventListener('keydown', handleRemoteKey);
    return () => window.removeEventListener('keydown', handleRemoteKey);
  }, [hasPaired, activeTitle]);
  useEffect(() => { saveValue('family-screen-account', accountId); }, [accountId]);
  useEffect(() => { if (!selectedChild && children.length) setSelectedChild(children[0]); }, [children, selectedChild]);
  const clearTitle = () => { setActiveTitle(null); setSelection(null); setNotice(''); setPlaying(false); };
  const requestPlayback = () => {
    if (!activeTitle || !selectedChild || !tvParentId) return;
    selectTitle.mutate({ data: { titleId: activeTitle.id, childProfileId: selectedChild.id, parentAccountId: tvParentId } }, { onSuccess: (result) => { setSelection(result); setNotice(result.verdict === ContentVerdict.approved ? 'Ready to watch.' : result.verdict === ContentVerdict.flagged ? 'A parent decision is on its way.' : 'This title is outside your family settings.'); } });
  };
  return (
    <TVShell>
      {!hasPaired ? (session ? (
        <main className="mx-auto max-w-3xl px-5 pb-12 pt-8 md:px-10 md:pt-16">
          <div className="mb-8 flex items-center gap-3 text-sm text-[hsl(var(--muted-foreground))]"><button onClick={() => setSession(null)} data-testid="button-cancel-pairing" className="flex items-center gap-2 rounded-lg px-2 py-1.5 font-bold hover:bg-[hsl(var(--muted))]"><X size={15} /> Start over</button><span className="text-[hsl(var(--border))]">/</span><span className="font-data text-xs">WAITING FOR PARENT</span></div>
          <PairCode session={session} />
          <div className="mt-8 flex items-start gap-4 rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-5" data-testid="status-pairing-waiting"><div className="relative mt-1 h-3 w-3 shrink-0 rounded-full bg-[hsl(var(--secondary))]"><span className="absolute inset-0 animate-soft-pulse rounded-full bg-[hsl(var(--secondary))]" /></div><div><p className="text-sm font-bold">Waiting for your parent device</p><p className="mt-1 text-sm leading-6 text-[hsl(var(--muted-foreground))]">Keep this screen open. We’ll move you into profiles as soon as the code is confirmed.</p></div></div>
          {pairingStatus.isError && <div className="mt-5"><ErrorNotice message="We lost the pairing session." onRetry={() => pairingStatus.refetch()} /></div>}
        </main>
      ) : (
        <main className="surface-grid mx-auto grid max-w-7xl gap-10 px-5 pb-12 pt-8 md:grid-cols-[1fr_.84fr] md:items-center md:px-10 md:pt-16">
          <section className="animate-rise-in">
            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[hsl(var(--border))] bg-[hsl(var(--card)/.65)] px-3 py-2 text-xs font-bold text-[hsl(var(--muted-foreground))]"><Sparkles size={14} className="text-[hsl(var(--accent))]" /> Calm controls for big-screen time</div>
            <h1 className="max-w-xl font-display text-6xl leading-[.95] tracking-[-.04em] md:text-8xl">Pick a story.<br /><span className="text-[hsl(var(--secondary-foreground))]">Keep the good part.</span></h1>
            <p className="mt-7 max-w-lg text-base leading-7 text-[hsl(var(--muted-foreground))]">Family Screen brings a parent’s guardrails to the TV without making discovery feel like a rulebook.</p>
            <div className="mt-10 grid max-w-lg grid-cols-3 gap-5 border-t border-[hsl(var(--border))] pt-5 text-xs text-[hsl(var(--muted-foreground))]"><div><span className="mb-2 block font-display text-2xl text-[hsl(var(--foreground))]">01</span>Pair simply</div><div><span className="mb-2 block font-display text-2xl text-[hsl(var(--foreground))]">02</span>Choose freely</div><div><span className="mb-2 block font-display text-2xl text-[hsl(var(--foreground))]">03</span>Ask when needed</div></div>
          </section>
          <section className="animate-rise-in [animation-delay:120ms]"><PairingCard accountId={accountId} setAccountId={setAccountId} onCreated={(newSession) => { setSession(newSession); saveValue('family-screen-account', newSession.parentAccountId); }} /><p className="mt-4 flex items-center justify-center gap-2 text-xs text-[hsl(var(--muted-foreground))]"><LockKeyhole size={13} /> Your pairing code is temporary and one-time.</p></section>
        </main>
      )) : (
        <main className="mx-auto max-w-7xl px-5 pb-12 md:px-10">
          <div className="mb-10 flex flex-col justify-between gap-5 border-b border-[hsl(var(--border))] pb-7 md:flex-row md:items-end">
            <div><p className="mb-3 text-xs font-bold uppercase tracking-[.2em] text-[hsl(var(--secondary-foreground))]">Living room / browse</p><h1 className="font-display text-5xl tracking-[-.03em] md:text-6xl">What sounds good?</h1></div>
            <button onClick={() => { setSession(null); setSelectedChild(null); clearTitle(); }} data-testid="button-unpair-tv" className="flex items-center gap-2 self-start rounded-xl px-3 py-2 text-xs font-bold text-[hsl(var(--muted-foreground))] hover:bg-[hsl(var(--muted))]"><LogOut size={15} /> Unpair TV</button>
          </div>
          <div className="mb-9 rounded-3xl bg-[hsl(var(--primary))] p-5 text-[hsl(var(--primary-foreground))] shadow-warm md:flex md:items-center md:justify-between md:p-6">
            <div className="flex items-center gap-4"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]"><Users size={21} /></div><div><p className="text-xs font-bold uppercase tracking-[.15em] text-[hsl(var(--primary-foreground)/.55)]">Watching as</p><p className="mt-1 text-lg font-bold" data-testid="text-active-profile">{selectedChild?.name || 'Choose a profile'}</p></div></div>
           <div className="mt-4 flex gap-2 overflow-x-auto md:mt-0">{children.map((child) => <button key={child.id} onClick={() => { setSelectedChild(child); clearTitle(); }} data-tv-focus="true" data-testid={`button-profile-${child.id}`} className={cx('shrink-0 rounded-xl border px-4 py-2 text-xs font-bold transition-colors', selectedChild?.id === child.id ? 'border-[hsl(var(--secondary))] bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]' : 'border-[hsl(var(--primary-foreground)/.2)] text-[hsl(var(--primary-foreground)/.7)] hover:bg-[hsl(var(--primary-foreground)/.08)]')}>{child.name}</button>)}</div>
          </div>
          {profiles.isLoading ? <LoadingRows /> : profiles.isError ? <ErrorNotice message="Profiles are taking a moment." onRetry={() => profiles.refetch()} /> : !children.length ? <div className="rounded-3xl border border-dashed border-[hsl(var(--border))] p-10 text-center" data-testid="empty-profiles"><Users className="mx-auto mb-3 text-[hsl(var(--muted-foreground))]" /><p className="font-bold">No profiles yet</p><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Add a child profile from the parent device to start browsing.</p></div> : (
            <>
              <div className="relative mb-10"><Search className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" size={20} /><input type="search" value={search} onChange={(event) => setSearch(event.target.value)} data-testid="input-search-titles" placeholder="Search the shared catalog" className="focus-ring w-full rounded-2xl border border-[hsl(var(--border))] bg-[hsl(var(--card))] py-5 pl-14 pr-5 text-base outline-none shadow-sm placeholder:text-[hsl(var(--muted-foreground))]" /></div>
              {searchResults.isError && <ErrorNotice message="The catalog could not be reached." onRetry={() => searchResults.refetch()} />}
              {searchResults.isLoading && <LoadingRows count={4} />}
              {!searchResults.isLoading && search.trim().length > 1 && !searchResults.isError && !searchResults.data?.results?.length && <div className="rounded-3xl border border-dashed border-[hsl(var(--border))] p-12 text-center" data-testid="empty-search"><Search className="mx-auto mb-3 text-[hsl(var(--muted-foreground))]" /><p className="font-bold">No stories matched that.</p><p className="mt-1 text-sm text-[hsl(var(--muted-foreground))]">Try a title, genre, or a favorite character.</p></div>}
              {!search.trim() && <div className="grid gap-5 rounded-3xl border border-[hsl(var(--border))] bg-[hsl(var(--card)/.55)] p-7 md:grid-cols-[1.2fr_.8fr] md:p-10"><div><p className="mb-3 text-xs font-bold uppercase tracking-[.16em] text-[hsl(var(--accent))]">The shared catalog</p><h2 className="font-display text-4xl leading-tight">A little wonder,<br />with a safety net.</h2><p className="mt-4 max-w-md text-sm leading-6 text-[hsl(var(--muted-foreground))]">Search movies and shows across your family’s services. If something needs a parent’s okay, we’ll ask — never interrupt.</p></div><div className="relative min-h-36 overflow-hidden rounded-2xl bg-[hsl(var(--secondary)/.2)] p-6"><div className="absolute -right-8 -top-8 h-36 w-36 rounded-full bg-[hsl(var(--accent)/.5)]" /><MonitorPlay className="relative mt-12 text-[hsl(var(--foreground))]" size={28} /></div></div>}
               {!!searchResults.data?.results?.length && <div className="grid gap-x-5 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">{searchResults.data.results.map((title, index) => <button key={title.id} onClick={() => { setPlaying(false); setActiveTitle(title); }} data-tv-focus="true" data-testid={`card-title-${title.id}`} className="group text-left"><div className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-[hsl(var(--muted))] shadow-sm transition-transform duration-300 group-hover:-translate-y-1 group-hover:shadow-warm"><Poster title={title} /><div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[hsl(var(--primary)/.85)] to-transparent p-4 pt-12 opacity-0 transition-opacity group-hover:opacity-100"><span className="flex items-center gap-2 text-xs font-bold text-[hsl(var(--card))]">See details <ArrowRight size={14} /></span></div></div><p className="mt-3 font-bold" data-testid={`text-title-${title.id}`}>{title.title}</p><p className="mt-1 text-xs text-[hsl(var(--muted-foreground))]">{title.year} · {title.service}</p><span className="sr-only">Result {index + 1}</span></button>)}</div>}
            </>
          )}
        </main>
      )}
      {playing && activeTitle && <div className="fixed inset-0 z-50 grid place-items-center bg-[hsl(var(--primary))] p-6 text-center text-[hsl(var(--primary-foreground))]" data-testid="screen-now-playing"><div><div className="mx-auto grid h-20 w-20 place-items-center rounded-3xl bg-[hsl(var(--secondary))] text-[hsl(var(--foreground))]"><MonitorPlay size={34} /></div><p className="mt-8 text-xs font-bold uppercase tracking-[.2em] text-[hsl(var(--secondary))]">Now playing</p><h2 className="mt-4 font-display text-6xl tracking-[-.04em]">{activeTitle.title}</h2><p className="mt-4 text-lg text-[hsl(var(--primary-foreground)/.68)]">Opening on {activeTitle.service}…</p><button onClick={() => setPlaying(false)} className="mt-10 rounded-xl border border-[hsl(var(--primary-foreground)/.22)] px-5 py-3 text-sm font-bold">Back to details</button></div></div>}
      {activeTitle && !playing && <div className="fixed inset-0 z-40 flex items-end justify-center bg-[hsl(var(--primary)/.4)] p-0 backdrop-blur-sm md:items-center md:p-6"><div className="animate-rise-in relative max-h-[92dvh] w-full max-w-3xl overflow-y-auto rounded-t-[2rem] bg-[hsl(var(--card))] p-5 shadow-2xl md:rounded-[2rem] md:p-7" role="dialog" aria-modal="true" data-testid="dialog-title-detail"><button onClick={clearTitle} data-testid="button-close-title" className="focus-ring absolute right-5 top-5 grid h-10 w-10 place-items-center rounded-full bg-[hsl(var(--card)/.8)] text-[hsl(var(--foreground))] shadow-sm"><X size={18} /></button><div className="grid gap-7 md:grid-cols-[210px_1fr]"><div className="aspect-[2/3] overflow-hidden rounded-2xl bg-[hsl(var(--muted))]"><Poster title={activeTitle} large /></div><div className="pt-3"><div className="mb-6 flex flex-wrap gap-2"><span className="rounded-full bg-[hsl(var(--secondary)/.18)] px-3 py-1.5 text-[11px] font-bold text-[hsl(var(--secondary-foreground))]">{activeTitle.service}</span>{activeTitle.genres.map((genre) => <span key={genre} className="rounded-full bg-[hsl(var(--muted))] px-3 py-1.5 text-[11px] font-bold text-[hsl(var(--muted-foreground))]">{genre}</span>)}</div><h2 className="pr-10 font-display text-5xl leading-[.95] tracking-[-.03em]" data-testid="text-selected-title">{activeTitle.title}</h2><p className="mt-3 text-sm font-bold text-[hsl(var(--muted-foreground))]">{activeTitle.year} · for {selectedChild?.name || 'your family'}</p><p className="mt-6 text-sm leading-7 text-[hsl(var(--muted-foreground))]">{activeTitle.overview || 'A new story to share together.'}</p><button onClick={requestPlayback} disabled={selectTitle.isPending || !selectedChild} data-tv-focus="true" data-testid="button-request-playback" className="mt-8 flex w-full items-center justify-between rounded-xl bg-[hsl(var(--primary))] px-5 py-4 text-sm font-bold text-[hsl(var(--primary-foreground))] transition-transform hover:-translate-y-0.5 disabled:opacity-50">{selectTitle.isPending ? 'Checking with your family settings…' : 'Request to watch'}{selectTitle.isPending ? <LoaderCircle size={18} className="animate-spin" /> : <ArrowRight size={18} />}</button>{notice && <div className={cx('mt-4 rounded-xl p-4 text-sm font-bold', selection?.verdict === ContentVerdict.approved ? 'bg-[hsl(var(--secondary)/.18)] text-[hsl(var(--secondary-foreground))]' : selection?.verdict === ContentVerdict.blocked ? 'bg-[hsl(var(--destructive)/.1)] text-[hsl(var(--destructive))]' : 'bg-[hsl(var(--accent)/.16)] text-[hsl(var(--foreground))]')} data-testid="status-title-selection"><div className="flex items-start gap-3">{selection?.verdict === ContentVerdict.approved ? <CheckCircle2 size={19} /> : selection?.verdict === ContentVerdict.blocked ? <XCircle size={19} /> : <Bell size={19} />}<span>{notice}{selection?.reason && <small className="mt-1 block font-normal opacity-75">{selection.reason}</small>}</span></div></div>}</div></div></div></div>}
    </TVShell>
  );
}

type SocketAlert = { requestId: string; title?: Title; childProfileId?: string; parentAccountId?: string; reason?: string; categoriesOfConcern?: string[] };

function useTvDecisionSocket(parentAccountId: string, requestId: string, onDecision: (decision: 'approved' | 'denied') => void) {
  const decisionRef = useRef(onDecision);
  useEffect(() => { decisionRef.current = onDecision; }, [onDecision]);
  useEffect(() => {
    if (!parentAccountId || !requestId) return;
    let socket: WebSocket | null = null;
    let disposed = false;
    let reconnectTimer: number | null = null;
    const connect = () => {
      if (disposed) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      socket = new WebSocket(`${protocol}//${window.location.host}/ws`);
      socket.onopen = () => socket?.send(JSON.stringify({ type: 'register', parentAccountId }));
      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as { type?: string; requestId?: string; decision?: 'approved' | 'denied' };
          if (payload.type === 'parent_decision' && payload.requestId === requestId && payload.decision) decisionRef.current(payload.decision);
        } catch {
          // Ignore malformed frames and keep the connection alive.
        }
      };
      socket.onclose = () => { if (!disposed) reconnectTimer = window.setTimeout(connect, 1200); };
      socket.onerror = () => socket?.close();
    };
    connect();
    return () => { disposed = true; if (reconnectTimer) window.clearTimeout(reconnectTimer); socket?.close(); };
  }, [parentAccountId, requestId]);
}

function useParentSocket(parentAccountId: string) {
  const [connected, setConnected] = useState(false);
  const [alert, setAlert] = useState<SocketAlert | null>(null);
  const reconnectTimer = useRef<number | null>(null);
  useEffect(() => {
    if (!parentAccountId) { setConnected(false); return; }
    let socket: WebSocket | null = null;
    let disposed = false;
    const connect = () => {
      if (disposed) return;
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      socket = new WebSocket(`${protocol}//${window.location.host}/ws`);
      socket.onopen = () => { setConnected(true); socket?.send(JSON.stringify({ type: 'register', parentAccountId })); };
      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data) as SocketAlert & { type?: string };
          if (payload.requestId && (payload.type === 'title_flagged' || payload.type === 'approval_request' || payload.type === 'title_request' || !payload.type)) {
            setAlert(payload);
            if ('Notification' in window && Notification.permission === 'granted') {
              new Notification('Family Screen needs you', { body: `${payload.title?.title || 'A title'} is waiting for your decision.` });
            }
          }
        } catch {
          // Ignore malformed frames and keep the connection alive.
        }
      };
      socket.onclose = () => { setConnected(false); if (!disposed) reconnectTimer.current = window.setTimeout(connect, 1800); };
      socket.onerror = () => { setConnected(false); socket?.close(); };
    };
    connect();
    return () => { disposed = true; setConnected(false); if (reconnectTimer.current) window.clearTimeout(reconnectTimer.current); socket?.close(); };
  }, [parentAccountId]);
  return { connected, alert, setAlert };
}

function ThresholdEditor({ child, onSaved }: { child: ChildProfile; onSaved: (updated: ChildProfile) => void }) {
  const [draft, setDraft] = useState<Thresholds>(child.thresholds);
  const updateThresholds = useUpdateThresholds();
  useEffect(() => { setDraft(child.thresholds); }, [child.id, child.thresholds]);
  const dirty = (Object.keys(draft) as Array<keyof Thresholds>).some((key) => draft[key] !== child.thresholds[key]);
  const save = () => updateThresholds.mutate({ childId: child.id, data: draft }, { onSuccess: onSaved });
  return (
    <div className="rounded-[2rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-warm md:p-8" id="thresholds" data-testid={`card-thresholds-${child.id}`}>
      <div className="flex items-start justify-between gap-5 border-b border-[hsl(var(--border))] pb-6"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[hsl(var(--accent))]">Content settings</p><h2 className="mt-2 font-display text-3xl">{child.name}’s guardrails</h2><p className="mt-2 text-sm text-[hsl(var(--muted-foreground))]">Set the highest level you’re comfortable with. We’ll ask you about anything above it.</p></div><div className="hidden h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[hsl(var(--secondary)/.18)] text-[hsl(var(--secondary-foreground))] sm:grid"><SlidersHorizontal size={21} /></div></div>
      <div className="mt-7 space-y-5">{(Object.keys(thresholdLabels) as Array<keyof Thresholds>).map((key) => <label key={key} className="flex items-center justify-between gap-4"><span className="text-sm font-bold">{thresholdLabels[key]}</span><span className="relative"><select value={draft[key]} onChange={(event) => setDraft((current) => ({ ...current, [key]: event.target.value as Thresholds[typeof key] }))} data-testid={`select-threshold-${key}`} className="focus-ring min-w-32 appearance-none rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--background))] px-4 py-3 pr-9 text-xs font-bold capitalize outline-none"><option value="none">None</option><option value="mild">Mild</option><option value="moderate">Moderate</option><option value="severe">Severe</option></select><ChevronDown className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(var(--muted-foreground))]" size={14} /></span></label>)}</div>
      <div className="mt-8 flex items-center justify-between border-t border-[hsl(var(--border))] pt-6"><span className="flex items-center gap-2 text-xs text-[hsl(var(--muted-foreground))]"><HeartHandshake size={15} /> Changes apply to new requests.</span><button onClick={save} disabled={!dirty || updateThresholds.isPending} data-testid="button-save-thresholds" className="rounded-xl bg-[hsl(var(--primary))] px-5 py-3 text-xs font-bold text-[hsl(var(--primary-foreground))] transition-transform hover:-translate-y-0.5 disabled:opacity-40">{updateThresholds.isPending ? 'Saving…' : 'Save changes'}</button></div>
      {updateThresholds.isError && <p className="mt-3 text-xs text-[hsl(var(--destructive))]" data-testid="text-threshold-error">Couldn’t save these settings. Try again.</p>}
      {updateThresholds.isSuccess && !dirty && <p className="mt-3 flex items-center gap-2 text-xs font-bold text-[hsl(var(--secondary-foreground))]" data-testid="status-threshold-saved"><Check size={14} /> Saved just now</p>}
    </div>
  );
}

function ParentHome() {
  const [accountId, setAccountId] = useState(readSaved('family-screen-account', ''));
  const [account, setAccount] = useState<ParentAccount | null>(null);
  const [code, setCode] = useState('');
  const [pairMessage, setPairMessage] = useState('');
  const [selectedChildId, setSelectedChildId] = useState('');
  const [decisionMessage, setDecisionMessage] = useState('');
  const { connected, alert, setAlert } = useParentSocket(account?.id || accountId);
  const confirmPairing = useConfirmPairing();
  const profiles = useGetProfiles(account?.id || accountId, { query: { enabled: Boolean(account?.id || accountId), queryKey: getGetProfilesQueryKey(account?.id || accountId) } });
  const decideTitle = useDecideTitle();
  const parent = profiles.data?.parentAccount || account;
  const children = parent?.children || [];
  const selectedChild = children.find((child) => child.id === selectedChildId) || children[0];
  const handleConfirm = (event: FormEvent) => {
    event.preventDefault();
    if (!code.trim()) return;
    confirmPairing.mutate({ data: { code: code.trim() } }, { onSuccess: (result) => { setAccount(result); setAccountId(result.id); saveValue('family-screen-account', result.id); setPairMessage('Living room TV is connected.'); setCode(''); } });
  };
  useEffect(() => { if (!selectedChildId && children[0]) setSelectedChildId(children[0].id); }, [children, selectedChildId]);
  useEffect(() => { if (profiles.data?.parentAccount) setAccount(profiles.data.parentAccount); }, [profiles.data]);
  const decide = (decision: 'approved' | 'denied') => {
    if (!alert || !account) return;
    decideTitle.mutate({ data: { requestId: alert.requestId, parentAccountId: account.id, decision: decision === 'approved' ? DecisionRequestDecision.approved : DecisionRequestDecision.denied } }, { onSuccess: (result) => { setDecisionMessage(result.decision === 'approved' ? 'Approved. The TV can start playback.' : 'Request denied. The title will stay closed.'); setAlert(null); } });
  };
  const childForAlert = children.find((child) => child.id === alert?.childProfileId);
  return (
    <ParentShell accountId={account?.id || accountId}>
      <header className="flex items-center justify-between border-b border-[hsl(var(--border))] px-5 py-5 md:hidden"><Brand /><DeviceSwitcher current="parent" /></header>
      <div className="mx-auto max-w-6xl px-5 pb-16 pt-8 md:px-10 md:pt-14">
        <div className="mb-10 flex flex-col justify-between gap-6 md:flex-row md:items-end"><div><div className="mb-4 flex items-center gap-3"><span className="font-data text-xs font-medium text-[hsl(var(--muted-foreground))]">PARENT CONTROL CENTER</span><span className="h-1 w-1 rounded-full bg-[hsl(var(--accent))]" /><StatusPill connected={connected} label={connected ? 'Live' : 'Reconnecting'} /></div><h1 className="font-display text-5xl tracking-[-.04em] md:text-6xl">{parent ? `Good evening, ${parent.name.split(' ')[0]}.` : 'Your family, at a glance.'}</h1><p className="mt-3 max-w-xl text-sm leading-6 text-[hsl(var(--muted-foreground))]">A quiet place to tune the guardrails and be there when a title needs a second opinion.</p></div><DeviceSwitcher current="parent" /></div>
        {!parent ? <section className="grid gap-8 md:grid-cols-[1fr_.82fr]"><div className="surface-grid rounded-[2rem] border border-[hsl(var(--border))] p-7 md:p-10"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-[hsl(var(--accent)/.18)] text-[hsl(var(--accent))]"><KeyRound size={22} /></div><h2 className="mt-8 max-w-md font-display text-4xl leading-tight">Meet the screen halfway.</h2><p className="mt-4 max-w-md text-sm leading-7 text-[hsl(var(--muted-foreground))]">Enter the short code shown on your TV to connect it to this parent account. Your family rules will follow.</p><form onSubmit={handleConfirm} className="mt-8 flex max-w-md gap-2"><input value={code} onChange={(event) => setCode(event.target.value)} data-testid="input-pair-code" maxLength={8} placeholder="Enter TV code" className="focus-ring min-w-0 flex-1 rounded-xl border border-[hsl(var(--input))] bg-[hsl(var(--card))] px-4 py-3 font-data text-sm uppercase outline-none placeholder:font-sans placeholder:normal-case" /><button type="submit" disabled={confirmPairing.isPending} data-testid="button-confirm-pairing" className="grid min-w-12 place-items-center rounded-xl bg-[hsl(var(--primary))] text-[hsl(var(--primary-foreground))] disabled:opacity-50">{confirmPairing.isPending ? <LoaderCircle className="animate-spin" size={18} /> : <ArrowRight size={18} />}</button></form>{confirmPairing.isError && <p className="mt-3 text-xs text-[hsl(var(--destructive))]" data-testid="text-confirm-error">That code is not ready. Check the TV and try again.</p>}{pairMessage && <p className="mt-3 flex items-center gap-2 text-xs font-bold text-[hsl(var(--secondary-foreground))]" data-testid="status-pair-success"><CheckCircle2 size={15} /> {pairMessage}</p>}</div><div className="flex flex-col justify-between rounded-[2rem] bg-[hsl(var(--primary))] p-7 text-[hsl(var(--primary-foreground))] md:p-10"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-[hsl(var(--secondary))]">Two devices, one rhythm</p><h3 className="mt-4 font-display text-3xl">The TV gets discovery.<br />You get the final say.</h3></div><div className="mt-12 space-y-4 text-sm text-[hsl(var(--primary-foreground)/.68)]"><div className="flex items-center gap-3"><Tv size={17} className="text-[hsl(var(--secondary))]" /> Browse together on the big screen</div><div className="flex items-center gap-3"><Bell size={17} className="text-[hsl(var(--accent))]" /> Hear about requests instantly</div><div className="flex items-center gap-3"><ShieldCheck size={17} className="text-[hsl(var(--secondary))]" /> Keep rules personal to each child</div></div></div></section> : (
          <div className="space-y-8">
            {alert && <section id="requests" className="animate-alert-in overflow-hidden rounded-[2rem] border border-[hsl(var(--accent)/.55)] bg-[hsl(var(--accent)/.12)] shadow-warm" data-testid="card-approval-alert"><div className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between md:p-7"><div className="flex items-start gap-4"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-[hsl(var(--accent))] text-[hsl(var(--foreground))]"><Bell size={22} /></div><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[hsl(var(--accent-foreground))]">Needs your attention</p><h2 className="mt-2 font-display text-3xl">{alert.title?.title || 'A title is waiting'}</h2><p className="mt-2 max-w-xl text-sm text-[hsl(var(--foreground)/.72)]">{childForAlert?.name || 'A child'} asked to watch this on the living room TV. {alert.reason || 'Take a quick look before you decide.'}</p>{alert.categoriesOfConcern?.length ? <div className="mt-3 flex flex-wrap gap-2">{alert.categoriesOfConcern.map((category) => <span key={category} className="rounded-full bg-[hsl(var(--accent)/.22)] px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide">{category}</span>)}</div> : null}</div></div><div className="flex shrink-0 gap-2 pl-16 md:pl-0"><button onClick={() => decide('denied')} disabled={decideTitle.isPending} data-testid="button-deny-title" className="rounded-xl border border-[hsl(var(--primary)/.18)] bg-[hsl(var(--card)/.75)] px-4 py-3 text-xs font-bold text-[hsl(var(--foreground))] hover:bg-[hsl(var(--card))]">Not this time</button><button onClick={() => decide('approved')} disabled={decideTitle.isPending} data-testid="button-approve-title" className="flex items-center gap-2 rounded-xl bg-[hsl(var(--primary))] px-5 py-3 text-xs font-bold text-[hsl(var(--primary-foreground))] hover:-translate-y-0.5">{decideTitle.isPending ? <LoaderCircle size={15} className="animate-spin" /> : <Check size={15} />} Approve title</button></div></div></section>}
            {decisionMessage && <div className="flex items-center gap-3 rounded-2xl bg-[hsl(var(--secondary)/.15)] p-4 text-sm font-bold text-[hsl(var(--secondary-foreground))]" data-testid="status-decision"><CheckCircle2 size={18} /> {decisionMessage}</div>}
            <div className="grid gap-8 lg:grid-cols-[.9fr_1.1fr]"><section className="rounded-[2rem] border border-[hsl(var(--border))] bg-[hsl(var(--card))] p-6 shadow-warm md:p-8"><div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[.16em] text-[hsl(var(--muted-foreground))]">The household</p><h2 className="mt-2 font-display text-3xl">Profiles</h2></div><span className="font-data text-xs text-[hsl(var(--muted-foreground))]">{children.length.toString().padStart(2, '0')} TOTAL</span></div>{profiles.isLoading ? <div className="mt-7"><LoadingRows count={2} /></div> : profiles.isError ? <div className="mt-7"><ErrorNotice message="Profiles are taking a moment." onRetry={() => profiles.refetch()} /></div> : <div className="mt-7 space-y-3">{children.map((child) => <button key={child.id} onClick={() => setSelectedChildId(child.id)} data-testid={`button-parent-profile-${child.id}`} className={cx('flex w-full items-center justify-between rounded-2xl border p-4 text-left transition-colors', selectedChild?.id === child.id ? 'border-[hsl(var(--secondary)/.6)] bg-[hsl(var(--secondary)/.1)]' : 'border-[hsl(var(--border))] hover:bg-[hsl(var(--muted)/.5)]')}><span className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-[hsl(var(--primary))] font-display text-lg text-[hsl(var(--primary-foreground))]">{child.name[0]}</span><span><span className="block text-sm font-bold">{child.name}</span><span className="mt-1 block text-xs text-[hsl(var(--muted-foreground))]">Age {child.age}</span></span></span><ArrowRight size={16} className="text-[hsl(var(--muted-foreground))]" /></button>)}</div>}</section>{selectedChild ? <ThresholdEditor child={selectedChild} onSaved={(updated) => { setAccount((current) => current ? ({ ...current, children: current.children.map((child) => child.id === updated.id ? updated : child) }) : current); queryClient.setQueryData(getGetProfilesQueryKey(account?.id || accountId), (old: typeof profiles.data) => old ? ({ ...old, parentAccount: { ...old.parentAccount, children: old.parentAccount.children.map((child) => child.id === updated.id ? updated : child) } }) : old); }} /> : <div className="grid min-h-72 place-items-center rounded-[2rem] border border-dashed border-[hsl(var(--border))] p-10 text-center"><SlidersHorizontal className="mb-3 text-[hsl(var(--muted-foreground))]" /><p className="font-bold">Choose a profile</p></div>}</div>
          </div>
        )}
      </div>
    </ParentShell>
  );
}

function Router() {
  return <Switch><Route path="/" component={TVHome} /><Route path="/tv" component={TVHome} /><Route path="/parent" component={ParentHome} /><Route component={NotFound} /></Switch>;
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return <QueryClientProvider client={queryClient}><TooltipProvider><WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}><RoutedErrorBoundary><Router /></RoutedErrorBoundary></WouterRouter><Toaster /></TooltipProvider></QueryClientProvider>;
}

export default App;