import type { ButtonHTMLAttributes, ReactNode } from 'react';
import type { Child, Verdict } from '../lib/types';

export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(' ');
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn('rounded-xl border border-border bg-surface', className)}>{children}</section>;
}

export function CardHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-foreground">{title}</h2>
        {description && <p className="mt-0.5 text-xs text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';

export function Button({
  variant = 'secondary',
  size = 'md',
  className,
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: 'sm' | 'md' }) {
  const variants: Record<Variant, string> = {
    primary: 'bg-primary text-primary-foreground hover:brightness-110',
    secondary: 'bg-surface-2 text-foreground border border-border hover:bg-border/60',
    ghost: 'text-muted hover:text-foreground hover:bg-surface-2',
    danger: 'bg-danger/15 text-danger border border-danger/30 hover:bg-danger/25',
  };
  return (
    <button
      className={cn(
        'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-50',
        size === 'sm' ? 'h-8 px-3 text-xs' : 'h-10 px-4 text-sm',
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}

const VERDICT_STYLES: Record<Verdict, string> = {
  allowed: 'bg-primary/15 text-primary border-primary/30',
  flagged: 'bg-warning/15 text-warning border-warning/30',
  blocked: 'bg-danger/15 text-danger border-danger/30',
};

export function VerdictBadge({ verdict }: { verdict: Verdict }) {
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[11px] font-medium capitalize', VERDICT_STYLES[verdict])}>
      {verdict}
    </span>
  );
}

export function ChildAvatar({ child, size = 'md' }: { child: Child; size?: 'sm' | 'md' | 'lg' }) {
  const sizes = { sm: 'size-6 text-[10px]', md: 'size-8 text-xs', lg: 'size-12 text-base' };
  return (
    <span
      aria-hidden
      className={cn('inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-background', sizes[size])}
      style={{ backgroundColor: child.color }}
    >
      {child.name[0]}
    </span>
  );
}

export function Tabs<T extends string>({
  value,
  onChange,
  items,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { value: T; label: ReactNode }[];
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="inline-flex rounded-lg border border-border bg-surface p-1">
      {items.map((it) => (
        <button
          key={it.value}
          role="tab"
          aria-selected={value === it.value}
          onClick={() => onChange(it.value)}
          className={cn(
            'flex items-center gap-2 rounded-md px-3 py-1.5 text-sm font-medium transition',
            value === it.value ? 'bg-surface-2 text-foreground' : 'text-muted hover:text-foreground',
          )}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}

export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition',
        checked ? 'bg-primary' : 'bg-border',
      )}
    >
      <span className={cn('inline-block size-4 rounded-full bg-white transition', checked ? 'translate-x-4.5' : 'translate-x-0.5')} />
    </button>
  );
}

export const inputClass =
  'h-10 w-full rounded-lg border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted/70 focus:border-primary focus:outline-none';

export function Field({ label, children, htmlFor }: { label: string; children: ReactNode; htmlFor?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={htmlFor} className="text-xs font-medium text-muted">
        {label}
      </label>
      {children}
    </div>
  );
}

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-balance">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted text-pretty">{description}</p>}
      </div>
      {action}
    </header>
  );
}

export function EmptyState({ title, description }: { title: string; description?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-1 px-6 py-12 text-center">
      <p className="text-sm font-medium">{title}</p>
      {description && <p className="text-xs text-muted">{description}</p>}
    </div>
  );
}
