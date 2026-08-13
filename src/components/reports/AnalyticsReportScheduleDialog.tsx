import { useEffect, useState } from 'react';
import {
  Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Trash2, Send, Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Sub {
  id: string;
  name: string;
  recipients: string[];
  subject_override: string | null;
  frequency: string;
  day_of_week: number;
  day_of_month: number | null;
  hour: number;
  timezone: string;
  run_at: string | null;
  enabled: boolean;
  next_send_at: string | null;
  last_sent_at: string | null;
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TABLE = 'analytics_report_subscriptions';

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  config: Record<string, unknown>;
  defaultName: string;
}

export function AnalyticsReportScheduleDialog({ open, onOpenChange, config, defaultName }: Props) {
  const [subs, setSubs] = useState<Sub[]>([]);
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState(defaultName);
  const [recipients, setRecipients] = useState('');
  const [subject, setSubject] = useState('');
  const [frequency, setFrequency] = useState('weekly');
  const [dayOfWeek, setDayOfWeek] = useState('1');
  const [dayOfMonth, setDayOfMonth] = useState('1');
  const [hour, setHour] = useState('7');
  const [runAt, setRunAt] = useState('');

  const load = async () => {
    const { data } = await (supabase as any)
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false });
    setSubs((data as Sub[]) || []);
  };

  useEffect(() => {
    if (open) {
      setName(defaultName);
      load();
    }
  }, [open, defaultName]);

  const create = async () => {
    const list = recipients.split(/[,\s;]+/).map((r) => r.trim()).filter((r) => r.includes('@'));
    if (!list.length) {
      toast.error('Add at least one valid recipient email');
      return;
    }
    setLoading(true);
    const { data: auth } = await supabase.auth.getUser();
    const { error } = await (supabase as any).from(TABLE).insert({
      user_id: auth.user?.id,
      name,
      recipients: list,
      subject_override: subject || null,
      frequency,
      day_of_week: Number(dayOfWeek),
      day_of_month: frequency === 'monthly' ? Number(dayOfMonth) : null,
      hour: Number(hour),
      run_at: frequency === 'one_time' && runAt ? new Date(runAt).toISOString() : null,
      config,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success('Schedule created with the current report settings');
    setRecipients('');
    setSubject('');
    load();
  };

  const toggle = async (sub: Sub) => {
    await (supabase as any).from(TABLE).update({ enabled: !sub.enabled }).eq('id', sub.id);
    load();
  };

  const remove = async (id: string) => {
    await (supabase as any).from(TABLE).delete().eq('id', id);
    load();
  };

  const saveCurrentConfig = async (id: string) => {
    const { error } = await (supabase as any).from(TABLE).update({ config }).eq('id', id);
    if (error) toast.error(error.message);
    else toast.success('Schedule updated to the current report settings');
  };

  const sendTest = async (id: string) => {
    const { data, error } = await supabase.functions.invoke('send-analytics-report', {
      body: { subscription_id: id, test: true },
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    if ((data as { ok?: boolean })?.ok) toast.success('Test report sent');
    else toast.error((data as { error?: string })?.error || 'Send failed');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Automated analytics email</DialogTitle>
          <DialogDescription>
            Schedules capture the report sections, columns and filters configured right now.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Schedule name</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Subject (optional)</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Recipients</Label>
            <Input
              placeholder="name@company.com, other@company.com"
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Frequency</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="one_time">One time</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {frequency === 'weekly' && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Day</Label>
                <Select value={dayOfWeek} onValueChange={setDayOfWeek}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {DAYS.map((d, i) => (
                      <SelectItem key={d} value={String(i)}>{d}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {frequency === 'monthly' && (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Day of month</Label>
                <Input type="number" min={1} max={31} value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)} />
              </div>
            )}

            {frequency === 'one_time' ? (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Send at</Label>
                <Input type="datetime-local" value={runAt} onChange={(e) => setRunAt(e.target.value)} />
              </div>
            ) : (
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Hour (ET)</Label>
                <Select value={hour} onValueChange={setHour}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }, (_, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <Button onClick={create} disabled={loading} className="w-full">
            <Plus className="w-4 h-4 mr-2" />
            Create schedule
          </Button>

          <Separator />

          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Existing schedules</Label>
            {subs.length === 0 && <p className="text-sm text-muted-foreground">No schedules yet.</p>}
            {subs.map((s) => (
              <div key={s.id} className="rounded-lg border p-3 space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{s.name}</div>
                    <div className="text-xs text-muted-foreground truncate">{s.recipients.join(', ')}</div>
                  </div>
                  <Switch checked={s.enabled} onCheckedChange={() => toggle(s)} />
                </div>
                <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge variant="secondary" className="capitalize">{s.frequency.replace('_', ' ')}</Badge>
                  {s.next_send_at && <span>Next: {new Date(s.next_send_at).toLocaleString()}</span>}
                  {s.last_sent_at && <span>Last: {new Date(s.last_sent_at).toLocaleString()}</span>}
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => sendTest(s.id)}>
                    <Send className="w-3.5 h-3.5 mr-1.5" />
                    Send test
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => saveCurrentConfig(s.id)}>
                    Use current settings
                  </Button>
                  <Button size="sm" variant="ghost" className="ml-auto" onClick={() => remove(s.id)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
