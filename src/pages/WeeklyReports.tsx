import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { X, Plus, Send, Trash2, Pencil } from 'lucide-react';
import { useCompanies } from '@/contexts/CompanyContext';

interface Sub {
  id: string;
  name: string;
  sections: string[];
  recipients: string[];
  day_of_week: number;
  day_of_month: number | null;
  hour: number;
  timezone: string;
  frequency: 'one_time' | 'daily' | 'weekly' | 'monthly';
  run_at: string | null;
  subject_override: string | null;
  date_range_days: number | null;
  only_changes: boolean;
  attach_csv: boolean;
  project_ids: string[] | null;
  company_ids: string[] | null;
  enabled: boolean;
  last_sent_at: string | null;
  next_send_at: string | null;
}

const SECTION_OPTS = [
  { id: 'projects', label: 'Project status & progress' },
  { id: 'financials', label: 'Financials' },
  { id: 'schedule', label: 'Schedule & tasks' },
  { id: 'documents', label: 'Documents & change orders' },
  { id: 'expenses', label: 'Expenses summary' },
  { id: 'payment_apps', label: 'Payment applications' },
  { id: 'equipment', label: 'Equipment & maintenance' },
  { id: 'subcontractors', label: 'Subcontractor activity' },
  { id: 'properties', label: 'Properties & occupancy' },
  { id: 'money', label: 'Money owed & collected' },
];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const FREQS: { id: Sub['frequency']; label: string }[] = [
  { id: 'one_time', label: 'One-time' },
  { id: 'daily', label: 'Daily' },
  { id: 'weekly', label: 'Weekly' },
  { id: 'monthly', label: 'Monthly' },
];
const RANGE_OPTS = [
  { v: 'default', label: 'Default for frequency' },
  { v: '7', label: 'Last 7 days' },
  { v: '14', label: 'Last 14 days' },
  { v: '30', label: 'Last 30 days' },
  { v: '-1', label: 'Since last send' },
];

function defaultForm(): Omit<Sub, 'id' | 'last_sent_at' | 'next_send_at'> {
  return {
    name: 'Weekly Recap',
    sections: ['projects', 'financials', 'schedule', 'documents'],
    recipients: [],
    day_of_week: 1,
    day_of_month: 1,
    hour: 7,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
    frequency: 'weekly',
    run_at: null,
    subject_override: null,
    date_range_days: null,
    only_changes: false,
    attach_csv: false,
    project_ids: null,
    company_ids: null,
    enabled: true,
  };
}

export default function WeeklyReports() {
  const [subs, setSubs] = useState<Sub[]>([]);
  const { companies } = useCompanies();
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Sub | null>(null);
  const [form, setForm] = useState(defaultForm());
  const [recipientInput, setRecipientInput] = useState('');
  const [showForm, setShowForm] = useState(false);

  const load = async () => {
    setLoading(true);
    const [{ data: s }, { data: p }] = await Promise.all([
      supabase.from('weekly_report_subscriptions').select('*').order('created_at', { ascending: false }),
      supabase.from('projects').select('id,name').order('name'),
    ]);
    setSubs((s as any) || []);
    setProjects((p as any) || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const openNew = () => {
    setEditing(null);
    setForm(defaultForm());
    setRecipientInput('');
    setShowForm(true);
  };
  const openEdit = (s: Sub) => {
    setEditing(s);
    setForm({
      name: s.name, sections: s.sections, recipients: s.recipients,
      day_of_week: s.day_of_week, day_of_month: s.day_of_month ?? 1, hour: s.hour, timezone: s.timezone,
      frequency: s.frequency || 'weekly', run_at: s.run_at, subject_override: s.subject_override,
      date_range_days: s.date_range_days, only_changes: !!s.only_changes, attach_csv: !!s.attach_csv,
      project_ids: s.project_ids, company_ids: s.company_ids ?? null, enabled: s.enabled,
    });
    setRecipientInput('');
    setShowForm(true);
  };

  const addRecipient = () => {
    const v = recipientInput.trim();
    if (!v) return;
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) { toast.error('Invalid email'); return; }
    if (form.recipients.includes(v)) return;
    setForm({ ...form, recipients: [...form.recipients, v] });
    setRecipientInput('');
  };

  const save = async () => {
    if (!form.name.trim()) { toast.error('Name required'); return; }
    if (form.sections.length === 0) { toast.error('Pick at least one section'); return; }
    if (form.recipients.length === 0) { toast.error('Add at least one recipient'); return; }
    if (form.frequency === 'one_time' && !form.run_at) { toast.error('Pick a date/time for one-time report'); return; }
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) { toast.error('Sign in required'); return; }
    const payload = { ...form, user_id: userData.user.id };
    const { error } = editing
      ? await supabase.from('weekly_report_subscriptions').update(payload).eq('id', editing.id)
      : await supabase.from('weekly_report_subscriptions').insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? 'Updated' : 'Created');
    setShowForm(false);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Delete this weekly report?')) return;
    await supabase.from('weekly_report_subscriptions').delete().eq('id', id);
    toast.success('Deleted');
    load();
  };

  const toggleEnabled = async (s: Sub) => {
    await supabase.from('weekly_report_subscriptions').update({ enabled: !s.enabled }).eq('id', s.id);
    load();
  };

  const sendTest = async (s: Sub) => {
    toast.loading('Sending test...', { id: 'wr-test' });
    const { data, error } = await supabase.functions.invoke('send-weekly-report', {
      body: { subscriptionId: s.id, test: true },
    });
    if (error || !data?.ok) {
      toast.error(data?.error || error?.message || 'Failed', { id: 'wr-test' });
    } else {
      toast.success('Test sent', { id: 'wr-test' });
    }
  };

  return (
    <Layout title="Scheduled Reports" subtitle="Send recap emails one-time or on a recurring schedule">
      <div className="flex justify-end">
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> New Report</Button>
      </div>

      {showForm && (
        <Card className="p-6 space-y-4">
          <h2 className="font-display text-lg">{editing ? 'Edit report' : 'New report'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label>Name</Label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div className="flex items-center gap-3 mt-6">
              <Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
              <Label>Enabled</Label>
            </div>
          </div>

          <div>
            <Label>Custom subject line (optional)</Label>
            <Input
              value={form.subject_override || ''}
              placeholder="Leave blank for auto subject"
              onChange={(e) => setForm({ ...form, subject_override: e.target.value || null })}
            />
          </div>

          <div>
            <Label className="mb-2 block">Sections to include</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {SECTION_OPTS.map((opt) => (
                <label key={opt.id} className="flex items-center gap-2 text-sm">
                  <Checkbox
                    checked={form.sections.includes(opt.id)}
                    onCheckedChange={(v) => setForm({
                      ...form,
                      sections: v ? [...form.sections, opt.id] : form.sections.filter((s) => s !== opt.id),
                    })}
                  />
                  {opt.label}
                </label>
              ))}
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Recipients</Label>
            <div className="flex gap-2">
              <Input
                value={recipientInput}
                placeholder="name@example.com"
                onChange={(e) => setRecipientInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); addRecipient(); } }}
              />
              <Button type="button" variant="secondary" onClick={addRecipient}>Add</Button>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {form.recipients.map((r) => (
                <Badge key={r} variant="secondary" className="gap-1">
                  {r}
                  <button onClick={() => setForm({ ...form, recipients: form.recipients.filter((x) => x !== r) })}>
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <Label>Frequency</Label>
              <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v as Sub['frequency'] })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{FREQS.map((f) => <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {form.frequency === 'weekly' && (
              <div>
                <Label>Day of week</Label>
                <Select value={String(form.day_of_week)} onValueChange={(v) => setForm({ ...form, day_of_week: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}
            {form.frequency === 'monthly' && (
              <div>
                <Label>Day of month</Label>
                <Select value={String(form.day_of_month ?? 1)} onValueChange={(v) => setForm({ ...form, day_of_month: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 31 }).map((_, i) => <SelectItem key={i} value={String(i + 1)}>{i + 1}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            {form.frequency !== 'one_time' && (
              <div>
                <Label>Hour</Label>
                <Select value={String(form.hour)} onValueChange={(v) => setForm({ ...form, hour: Number(v) })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 24 }).map((_, i) => (
                      <SelectItem key={i} value={String(i)}>
                        {i === 0 ? '12 AM' : i < 12 ? `${i} AM` : i === 12 ? '12 PM' : `${i - 12} PM`}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            {form.frequency === 'one_time' && (
              <div className="md:col-span-2">
                <Label>Send date & time</Label>
                <Input
                  type="datetime-local"
                  value={form.run_at ? new Date(form.run_at).toISOString().slice(0, 16) : ''}
                  onChange={(e) => setForm({ ...form, run_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                />
              </div>
            )}
            <div>
              <Label>Timezone</Label>
              <Input value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
            </div>
            <div>
              <Label>Date range</Label>
              <Select
                value={form.date_range_days == null ? 'default' : String(form.date_range_days)}
                onValueChange={(v) => setForm({ ...form, date_range_days: v === 'default' ? null : Number(v) })}
              >
                <SelectTrigger><SelectValue placeholder="Default" /></SelectTrigger>
                <SelectContent>
                  {RANGE_OPTS.map((o) => <SelectItem key={o.v} value={o.v}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <label className="flex items-center gap-3 text-sm">
              <Switch checked={form.only_changes} onCheckedChange={(v) => setForm({ ...form, only_changes: v })} />
              Include only sections with activity in the period
            </label>
            <label className="flex items-center gap-3 text-sm">
              <Switch checked={form.attach_csv} onCheckedChange={(v) => setForm({ ...form, attach_csv: v })} />
              Attach CSV export alongside PDF
            </label>
          </div>

          <div>
            <Label className="mb-2 block">Projects (leave empty for all)</Label>
            <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-1">
              {projects.length === 0 && <p className="text-xs text-muted-foreground">No projects</p>}
              {projects.map((p) => {
                const selected = form.project_ids?.includes(p.id) || false;
                return (
                  <label key={p.id} className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={selected}
                      onCheckedChange={(v) => {
                        const cur = form.project_ids || [];
                        const next = v ? [...cur, p.id] : cur.filter((x) => x !== p.id);
                        setForm({ ...form, project_ids: next.length ? next : null });
                      }}
                    />
                    {p.name}
                  </label>
                );
              })}
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={save}>{editing ? 'Save' : 'Create'}</Button>
          </div>
        </Card>
      )}

      <div className="space-y-2">
        {loading ? <p className="text-muted-foreground">Loading...</p> :
          subs.length === 0 ? <p className="text-muted-foreground">No scheduled reports yet.</p> :
          subs.map((s) => (
            <Card key={s.id} className="p-4 flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-semibold">{s.name}</h3>
                  {!s.enabled && <Badge variant="secondary">Paused</Badge>}
                  <Badge variant="outline">{(s.frequency || 'weekly').replace('_', ' ')}</Badge>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {s.frequency === 'one_time' && s.run_at
                    ? `One-time: ${new Date(s.run_at).toLocaleString()}`
                    : s.frequency === 'monthly'
                    ? `Day ${s.day_of_month ?? 1} of each month at ${s.hour}:00`
                    : s.frequency === 'daily'
                    ? `Daily at ${s.hour}:00`
                    : `${DAYS[s.day_of_week]} at ${s.hour === 0 ? '12 AM' : s.hour < 12 ? `${s.hour} AM` : s.hour === 12 ? '12 PM' : `${s.hour - 12} PM`}`}
                  {' · '}{s.timezone} · {s.recipients.length} recipient(s) · {s.sections.length} section(s)
                </p>
                {s.next_send_at && s.enabled && (
                  <p className="text-xs text-muted-foreground">Next send: {new Date(s.next_send_at).toLocaleString()}</p>
                )}
                {s.last_sent_at && (
                  <p className="text-xs text-muted-foreground">Last sent: {new Date(s.last_sent_at).toLocaleString()}</p>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Switch checked={s.enabled} onCheckedChange={() => toggleEnabled(s)} />
                <Button size="sm" variant="outline" onClick={() => sendTest(s)}><Send className="h-3 w-3 mr-1" />Test</Button>
                <Button size="sm" variant="outline" onClick={() => openEdit(s)}><Pencil className="h-3 w-3" /></Button>
                <Button size="sm" variant="outline" onClick={() => remove(s.id)}><Trash2 className="h-3 w-3" /></Button>
              </div>
            </Card>
          ))
        }
      </div>
    </Layout>
  );
}