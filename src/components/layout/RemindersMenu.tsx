import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlarmClock, CreditCard, ShieldAlert, TrendingUp, CheckCircle2, Mail, Loader2, ClipboardCheck, FileCheck, X, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { fetchReminders, type Reminder } from '@/lib/reminders';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const ICONS = {
  invoice_overdue: CreditCard,
  insurance_expired: ShieldAlert,
  insurance_expiring: ShieldAlert,
  cost_spike: TrendingUp,
  inspection_soon: ClipboardCheck,
  permit_expiring: FileCheck,
} as const;

const DISMISS_KEY = 'rbf.reminders.dismissed';
const SNOOZE_DAYS = 7;

/** Dismissed reminder ids -> time dismissed. Entries older than SNOOZE_DAYS are dropped, so unresolved items come back. */
function loadDismissed(): Record<string, number> {
  try {
    const raw = JSON.parse(localStorage.getItem(DISMISS_KEY) || '{}') as Record<string, number>;
    const cutoff = Date.now() - SNOOZE_DAYS * 86_400_000;
    return Object.fromEntries(Object.entries(raw).filter(([, t]) => t > cutoff));
  } catch {
    return {};
  }
}

function saveDismissed(d: Record<string, number>) {
  try {
    localStorage.setItem(DISMISS_KEY, JSON.stringify(d));
  } catch {
    /* storage unavailable */
  }
}

/** Header button listing smart reminders (overdue invoices, expiring insurance, cost spikes). */
export function RemindersMenu() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [dismissed, setDismissed] = useState<Record<string, number>>(loadDismissed);

  const updateDismissed = (next: Record<string, number>) => {
    setDismissed(next);
    saveDismissed(next);
  };
  const dismiss = (id: string) => updateDismissed({ ...dismissed, [id]: Date.now() });
  const clearAll = () => {
    const now = Date.now();
    updateDismissed({ ...dismissed, ...Object.fromEntries(visible.map((r) => [r.id, now])) });
  };
  const restoreAll = () => updateDismissed({});

  const load = useCallback(async () => {
    try {
      setReminders(await fetchReminders());
    } catch (e) {
      console.error('Failed to load reminders', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 10 * 60 * 1000);
    return () => clearInterval(t);
  }, [load]);

  useEffect(() => {
    if (open) load();
  }, [open, load]);

  const emailMe = async () => {
    setSending(true);
    const { data, error } = await supabase.functions.invoke('send-reminders', { body: { test: true } });
    setSending(false);
    if (error || data?.error) toast.error(data?.error || 'Could not send the reminder email.');
    else toast.success(data?.sent ? 'Reminder email sent.' : 'Nothing to send right now.');
  };

  const visible = reminders.filter((r) => !dismissed[r.id]);
  const hiddenCount = reminders.length - visible.length;
  const high = visible.filter((r) => r.severity === 'high').length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Reminders (${visible.length})`}>
          <AlarmClock className="h-5 w-5" />
          {visible.length > 0 && (
            <span
              className={cn(
                'absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold text-white ring-2 ring-background',
                high ? 'bg-destructive' : 'bg-amber-500'
              )}
            >
              {visible.length > 99 ? '99+' : visible.length}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-[360px] p-0">
        <div className="flex items-center justify-between border-b px-4 py-3">
          <div>
            <p className="font-semibold">Reminders</p>
            <p className="text-xs text-muted-foreground">Invoices, insurance, inspections, permits and cost jumps</p>
          </div>
          <Button size="sm" variant="ghost" onClick={emailMe} disabled={sending} title="Email this list to the admins">
            {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
          </Button>
        </div>
        <div className="max-h-[420px] overflow-y-auto p-2">
          {loading ? (
            <p className="p-4 text-center text-sm text-muted-foreground">Checking…</p>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center p-6 text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              <p className="mt-2 text-sm font-medium">Nothing needs attention</p>
              <p className="text-xs text-muted-foreground">Go fishing.</p>
              {hiddenCount > 0 && (
                <Button size="sm" variant="ghost" className="mt-2" onClick={restoreAll}>
                  <RotateCcw className="h-4 w-4" /> Show {hiddenCount} cleared
                </Button>
              )}
            </div>
          ) : (
            visible.map((r) => {
              const Icon = ICONS[r.kind];
              return (
                <div key={r.id} className="group flex items-start gap-1 rounded-lg hover:bg-muted/60">
                <Link to={r.to} onClick={() => setOpen(false)} className="flex flex-1 gap-3 p-2">
                  <span
                    className={cn(
                      'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg',
                      r.severity === 'high' ? 'bg-red-500/10 text-red-600 dark:text-red-400' : 'bg-amber-500/10 text-amber-600 dark:text-amber-400'
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium leading-snug">{r.title}</span>
                    <span className="block text-xs text-muted-foreground">{r.detail}</span>
                  </span>
                </Link>
                <button
                  type="button"
                  onClick={() => dismiss(r.id)}
                  className="mr-1 mt-2 rounded-md p-1 text-muted-foreground opacity-60 hover:bg-muted hover:text-foreground hover:opacity-100"
                  aria-label="Dismiss"
                  title={`Hide for ${SNOOZE_DAYS} days`}
                >
                  <X className="h-4 w-4" />
                </button>
                </div>
              );
            })
          )}
        </div>
        {!loading && (visible.length > 0 || hiddenCount > 0) && (
          <div className="flex items-center justify-between border-t px-4 py-2 text-xs text-muted-foreground">
            <span>Cleared items come back after {SNOOZE_DAYS} days if still open.</span>
            {visible.length > 0 ? (
              <Button size="sm" variant="ghost" className="h-7" onClick={clearAll}>Clear all</Button>
            ) : (
              <Button size="sm" variant="ghost" className="h-7" onClick={restoreAll}>Show cleared</Button>
            )}
          </div>
        )}
      </PopoverContent>
    </Popover>
  );
}
