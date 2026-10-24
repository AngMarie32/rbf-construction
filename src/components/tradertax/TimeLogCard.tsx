import { useCallback, useEffect, useMemo, useState } from 'react';
import { tth } from '@/integrations/supabase/tradertax';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Clock, Loader2, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { TthEngagement, TthTimeEntry } from '@/types/tradertax';
import { money, shortDate } from '@/utils/traderTax/labels';

const TIME_ACTIVITIES = [
  'intake_review',
  'document_review',
  'analysis',
  'consultation',
  'preparation',
  'review',
  'client_communication',
  'admin',
] as const;

interface TimeLogCardProps {
  engagement: TthEngagement;
  clientId: string;
}

/**
 * Hours are the missing half of pricing: without them a fee is a guess and
 * realization cannot be measured. Logging is deliberately two fields wide so
 * it actually gets done.
 */
export function TimeLogCard({ engagement, clientId }: TimeLogCardProps) {
  const { user } = useAuth();
  const [entries, setEntries] = useState<TthTimeEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [minutes, setMinutes] = useState('');
  const [activity, setActivity] = useState<string>('preparation');
  const [description, setDescription] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const { data } = await tth
      .from('tth_time_entries')
      .select('*')
      .eq('engagement_id', engagement.id)
      .order('entry_date', { ascending: false });
    setEntries((data ?? []) as TthTimeEntry[]);
    setLoading(false);
  }, [engagement.id]);

  useEffect(() => {
    load();
  }, [load]);

  const totals = useMemo(() => {
    const total = entries.reduce((s, e) => s + e.minutes, 0);
    const billable = entries.filter((e) => e.billable).reduce((s, e) => s + e.minutes, 0);
    const fee = Number(engagement.fee ?? 0);
    return {
      hours: total / 60,
      billableHours: billable / 60,
      effectiveRate: billable > 0 && fee > 0 ? fee / (billable / 60) : null,
    };
  }, [entries, engagement.fee]);

  const add = async () => {
    const mins = Number(minutes);
    if (!mins || mins <= 0) {
      toast.error('Enter minutes');
      return;
    }
    setBusy(true);
    const { error } = await tth.from('tth_time_entries').insert({
      company_id: engagement.company_id,
      engagement_id: engagement.id,
      client_id: clientId,
      minutes: mins,
      activity,
      description: description.trim() || null,
      person: user?.email ?? null,
      billable: true,
      created_by: user?.id ?? null,
    });
    setBusy(false);
    if (error) {
      toast.error('Could not log time', { description: error.message });
      return;
    }
    setMinutes('');
    setDescription('');
    await load();
  };

  const remove = async (id: string) => {
    await tth.from('tth_time_entries').delete().eq('id', id);
    await load();
  };

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold">Time on this engagement</h3>
        </div>
        <div className="flex flex-wrap gap-4 text-sm">
          <span>
            <span className="text-muted-foreground">Hours </span>
            <span className="font-medium tabular-nums">{totals.hours.toFixed(1)}</span>
          </span>
          <span>
            <span className="text-muted-foreground">Billable </span>
            <span className="font-medium tabular-nums">{totals.billableHours.toFixed(1)}</span>
          </span>
          <span>
            <span className="text-muted-foreground">Effective rate </span>
            <span className="font-medium tabular-nums">
              {totals.effectiveRate ? `${money(totals.effectiveRate)}/hr` : '—'}
            </span>
          </span>
        </div>
      </div>

      <div className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Minutes</Label>
          <Input
            type="number"
            className="w-24"
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            placeholder="30"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Activity</Label>
          <Select value={activity} onValueChange={setActivity}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TIME_ACTIVITIES.map((a) => (
                <SelectItem key={a} value={a}>
                  {a.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[200px] flex-1 space-y-1">
          <Label className="text-xs">Note</Label>
          <Input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What you worked on"
          />
        </div>
        <Button onClick={add} disabled={busy}>
          {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Plus className="mr-2 h-4 w-4" />}
          Log
        </Button>
      </div>

      <div className="mt-4 space-y-1">
        {loading ? (
          <p className="py-4 text-center text-sm text-muted-foreground">Loading…</p>
        ) : entries.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Nothing logged. Without hours, next season’s fee is a guess.
          </p>
        ) : (
          entries.map((e) => (
            <div key={e.id} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
              <div className="min-w-0">
                <span className="font-medium tabular-nums">{(e.minutes / 60).toFixed(1)}h</span>
                <span className="ml-2 text-muted-foreground">{e.activity.replace(/_/g, ' ')}</span>
                {e.description && <span className="ml-2">{e.description}</span>}
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground">{shortDate(e.entry_date)}</span>
                <Button size="icon" variant="ghost" onClick={() => remove(e.id)}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
