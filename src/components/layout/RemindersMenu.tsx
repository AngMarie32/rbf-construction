import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlarmClock, CreditCard, ShieldAlert, TrendingUp, CheckCircle2, Mail, Loader2, ClipboardCheck, FileCheck } from 'lucide-react';
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

/** Header button listing smart reminders (overdue invoices, expiring insurance, cost spikes). */
export function RemindersMenu() {
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [sending, setSending] = useState(false);

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

  const high = reminders.filter((r) => r.severity === 'high').length;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label={`Reminders (${reminders.length})`}>
          <AlarmClock className="h-5 w-5" />
          {reminders.length > 0 && (
            <span
              className={cn(
                'absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-[11px] font-semibold text-white ring-2 ring-background',
                high ? 'bg-destructive' : 'bg-amber-500'
              )}
            >
              {reminders.length > 99 ? '99+' : reminders.length}
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
          ) : reminders.length === 0 ? (
            <div className="flex flex-col items-center p-6 text-center">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              <p className="mt-2 text-sm font-medium">Nothing needs attention</p>
              <p className="text-xs text-muted-foreground">Go fishing.</p>
            </div>
          ) : (
            reminders.map((r) => {
              const Icon = ICONS[r.kind];
              return (
                <Link key={r.id} to={r.to} onClick={() => setOpen(false)} className="flex gap-3 rounded-lg p-2 hover:bg-muted/60">
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
              );
            })
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
