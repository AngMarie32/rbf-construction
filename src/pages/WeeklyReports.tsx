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

interface Sub {
  id: string;
  name: string;
  sections: string[];
  recipients: string[];
  day_of_week: number;
  hour: number;
  timezone: string;
  project_ids: string[] | null;
  enabled: boolean;
  last_sent_at: string | null;
  next_send_at: string | null;
}

const SECTION_OPTS = [
  { id: 'projects', label: 'Project status & progress' },
  { id: 'financials', label: 'Financials' },
  { id: 'schedule', label: 'Schedule & tasks' },
  { id: 'documents', label: 'Documents & change orders' },
];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function defaultForm(): Omit<Sub, 'id' | 'last_sent_at' | 'next_send_at'> {
  return {
    name: 'Weekly Recap',
    sections: ['projects', 'financials', 'schedule', 'documents'],
    recipients: [],
    day_of_week: 1,
    hour: 7,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'America/New_York',
    project_ids: null,
    enabled: true,
  };
}

export default function WeeklyReports() {
  const [subs, setSubs] = useState<Sub[]>([]);
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
      day_of_week: s.day_of_week, hour: s.hour, timezone: s.timezone,
      project_ids: s.project_ids, enabled: s.enabled,
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
    <Layout title="Weekly Reports" subtitle="Schedule recurring weekly recap emails">
      <div className="flex justify-end">
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-1" /> New Weekly Report</Button>
      </div>

      {showForm && (
        <Card className="p-6 space-y-4">
          <h2 className="font-display text-lg">{editing ? 'Edit weekly report' : 'New weekly report'}</h2>
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

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Day</Label>
              <Select value={String(form.day_of_week)} onValueChange={(v) => setForm({ ...form, day_of_week: Number(v) })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{DAYS.map((d, i) => <SelectItem key={i} value={String(i)}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
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
            <div>
              <Label>Timezone</Label>
              <Input value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
            </div>
          </div>

          <div>
            <Label className="mb-2 block">Projects (leave empty for all)</Label>
            <div className="max-h-40 overflow-y-auto border rounded p-2 space-y-1">
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
          subs.length === 0 ? <p className="text-muted-foreground">No weekly reports yet.</p> :
          subs.map((s) => (
            <Card key={s.id} className="p-4 flex items-center justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-display font-semibold">{s.name}</h3>
                  {!s.enabled && <Badge variant="secondary">Paused</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {DAYS[s.day_of_week]} at {s.hour === 0 ? '12 AM' : s.hour < 12 ? `${s.hour} AM` : s.hour === 12 ? '12 PM' : `${s.hour - 12} PM`} · {s.timezone} · {s.recipients.length} recipient(s) · {s.sections.length} section(s)
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