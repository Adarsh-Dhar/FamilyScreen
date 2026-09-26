import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Tv } from 'lucide-react';
import { useStore } from '../lib/store';
import { Button, inputClass } from '../components/ui';

export function PairingPage() {
  const { pair } = useStore();
  const navigate = useNavigate();
  const [code, setCode] = useState('123456');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!/^\d{6}$/.test(code)) {
      setError('Enter the 6-digit code shown on your TV.');
      return;
    }
    setError('');
    setLoading(true);
    setTimeout(() => {
      pair();
      navigate('/dashboard', { replace: true });
    }, 600);
  };

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center text-center">
          <span className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Tv className="size-6" aria-hidden />
          </span>
          <h1 className="text-2xl font-semibold tracking-tight">Family Screen</h1>
          <p className="mt-1 text-sm text-muted">Pair your Fire TV to open the guardian dashboard.</p>
        </div>
        <form onSubmit={handleSubmit} className="rounded-xl border border-border bg-surface p-6" noValidate>
          <label htmlFor="pairing-code" className="text-xs font-medium text-muted">
            TV pairing code
          </label>
          <input
            id="pairing-code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={6}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            placeholder="000000"
            aria-invalid={!!error}
            aria-describedby={error ? 'pairing-error' : undefined}
            className={`${inputClass} mt-1.5 h-12 text-center font-mono text-xl tracking-[0.5em]`}
            autoFocus
          />
          {error && (
            <p id="pairing-error" className="mt-2 text-xs text-danger">
              {error}
            </p>
          )}
          <Button type="submit" variant="primary" className="mt-5 w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden /> Connecting…
              </>
            ) : (
              'Pair TV'
            )}
          </Button>
          <p className="mt-4 text-center text-xs text-muted">Codes expire 10 minutes after they appear on screen.</p>
        </form>
      </div>
    </main>
  );
}
