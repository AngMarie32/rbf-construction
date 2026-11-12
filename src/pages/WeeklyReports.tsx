import { sortProjectsOpenFirst } from '@/utils/projectOrder';
import { localDateTimeInputValue } from '@/utils/dates';
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
import { X, Plus, Send, Trash2, Pencil, CalendarClock, Clock, FileBarChart, Mail } from 'lucide-react';
import { PageHero, heroButtonPrimary } from '@/components/ui/page-hero';
import { AccentStat } from '@/components/ui/accent-stat';
import { EmptyState } from '@/components/ui/empty-state';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { cn } from '@/lib/utils';
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
  const [confirmDelete, setConfirmDelete] = useState<Sub | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: s }, { data: p }] = await Promise.all([
      supabase.from('weekly_report_subscriptions').select('*').order('created_at', { ascending: false }),
      supabase.from('projects').select('id,name, status').is('archived_at', null).order('name'),
    ]);
    setSubs((s as any) || []);
    setProjects(sortProjectsOpenFirst((p as { id: string; name: string; status: string }[]) || []));
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
    const typed = recipientInput.trim();
    if (typed && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(typed) && !form.recipients.includes(typed)) {
      form.recipients = [...form.recipients, typed];
      setRecipientInput('');
    }
    if (form.recipients.length === 0) { toast.error('Add at least one recipient'); return; }
    if (form.frequency === 'one_time' && !form.run_at) { toast.error('Pick a date/time for one-time report'); return; }
    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) { toast.error('Sign in required'); return; }
    const payload = { ...form, user_id: userData.user.id };
    const { error } = editing
      ? await supabase.from('weekly_report_subscriptions').update(payload).eq('id', editing.id)
      : await supabase.from('weekly_report_subscriptions').insert(payload);
    if (error) { toast.error(error.message); return; }
    toast.success(editing ? 'Report updated' : 'Report scheduled');
    setShowForm(false);
    load();
  };

  const remove = async (id: string) => {
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
      toast.error(data?.error || error?.message || 'The test email could not be sent', { id: 'wr-test' });
    } else {
      toast.success(`Test sent to ${s.recipients.length} recipient${s.recipients.length === 1 ? '' : 's'}`, { id: 'wr-test' });
    }
  };

  const hourLabel = (h: number) => (h === 0 ? '12 AM' : h < 12 ? `${h} AM` : h === 12 ? '12 PM' : `${h - 12} PM`);
  const scheduleText = (s: Pick<Sub, 'frequency' | 'run_at' | 'day_of_month' | 'day_of_week' | 'hour'>) =>
    s.frequency === 'one_time'
      ? s.run_at
        ? `Once on ${new Date(s.run_at).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}`
        : 'Once (no date set)'
      : s.frequency === 'monthly'
        ? `Monthly on day ${s.day_of_month ?? 1} at ${hourLabel(s.hour)}`
        : s.frequency === 'daily'
          ? `Every day at ${hourLabel(s.hour)}`
          : `Every ${DAYS[s.day_of_week]} at ${hourLabel(s.hour)}`;
  const when = (iso: string | null) => (iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—');
  const active = subs.filter((s) => s.enabled);
  const nextUp = [...active].filter((s) => s.next_send_at).sort((a, b) => String(a.next_send_at).localeCompare(String(b.next_send_at)))[0];
  const recipientsAll = new Set(subs.flatMap((s) => s.recipients));
  const sectionLabel = (id: string) => SECTION_OPTS.find((o) => o.id === id)?.label || id;

  return (
    <Layout hideTitle title="Scheduled Reports">
      <div className="space-y-6">
        <PageHero
          eyebrow="Reports"
          title="Scheduled Reports"
          subtitle="Recap emails with a PDF of the sections you pick, sent once or on a schedule."
          actions={
            <button type="button" className={heroButtonPrimary} onClick={openNew}>
              <Plus className="h-4 w-4" /> New report
            </button>
          }
          stats={[
            { label: 'Active', value: loading ? '…' : `${active.length}/${subs.length}` },
            { label: 'Next send', value: loading ? '…' : nextUp ? new Date(nextUp.next_send_at as string).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—' },
          ]}
        />

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <AccentStat label="Reports" value={subs.length} icon={FileBarChart} accent="blue" loading={loading} hint={`${subs.length - active.length} paused`} />
          <AccentStat label="Recipients" value={recipientsAll.size} icon={Mail} accent="indigo" loading={loading} hint="Unique email addresses" />
          <AccentStat label="Next send" value={nextUp ? when(nextUp.next_send_at) : '—'} icon={CalendarClock} accent="orange" loading={loading} hint={nextUp?.name || 'Nothing scheduled'} />
          <AccentStat
            label="Last sent"
            value={(() => {
              const last = [...subs].filter((s) => s.last_sent_at).sort((a, b) => String(b.last_sent_at).localeCompare(String(a.last_sent_at)))[0];
              return last ? when(last.last_sent_at) : '—';
            })()}
            icon={Send}
            accent="emerald"
            loading={loading}
            hint="Most recent report emailed"
          />
        </div>

        {loading ? (
          <div className="grid gap-4 md:grid-cols-2">
            {[0, 1].map((i) => (
              <Card key={i} className="h-40 animate-pulse bg-muted/40" />
            ))}
          </div>
        ) : subs.length === 0 ? (
          <EmptyState
            icon={CalendarClock}
            title="Schedule your first recap"
            description="Pick the sections you care about (projects, money, schedule, equipment and more) and who should get it. The report is emailed as a PDF on the schedule you choose."
            action={{ label: 'New report', onClick: openNew, icon: Plus }}
            steps={['Choose the sections and the jobs or companies', 'Add recipients', 'Pick daily, weekly, monthly or a one-time send']}
          />
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {subs.map((s) => (
              <Card key={s.id} className={cn('flex flex-col p-5', !s.enabled && 'opacity-70')}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="truncate font-semibold">{s.name}</h3>
                      <Badge variant={s.enabled ? 'success' : 'secondary'}>{s.enabled ? 'Active' : 'Paused'}</Badge>
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {scheduleText(s)} · {s.timezone.replace(/_/g, ' ')}
                    </p>
                  </div>
                  <Switch checked={s.enabled} onCheckedChange={() => toggleEnabled(s)} aria-label={s.enabled ? 'Pause' : 'Resume'} />
                </div>

                <div className="mt-3 flex flex-wrap gap-1.5">
                  {s.sections.slice(0, 5).map((sec) => (
                    <span key={sec} className="rounded-full bg-muted px-2 py-0.5 text-xs">
                      {sectionLabel(sec)}
                    </span>
                  ))}
                  {s.sections.length > 5 && <span className="rounded-full bg-muted px-2 py-0.5 text-xs">+{s.sections.length - 5}</span>}
                </div>

                <div className="mt-3 grid grid-cols-2 gap-3 rounded-lg bg-muted/40 p-3 text-xs">
                  <div>
                    <p className="text-muted-foreground">Next send</p>
                    <p className="font-medium">{s.enabled ? when(s.next_send_at) : 'Paused'}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Last sent</p>
                    <p className="font-medium">{when(s.last_sent_at)}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-muted-foreground">To</p>
                    <p className="truncate font-medium" title={s.recipients.join(', ')}>
                      {s.recipients.slice(0, 2).join(', ')}
                      {s.recipients.length > 2 ? ` +${s.recipients.length - 2} more` : ''}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={() => sendTest(s)}>
                    <Send className="mr-1.5 h-3.5 w-3.5" /> Send test now
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => openEdit(s)}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive" aria-label="Delete" onClick={() => setConfirmDelete(s)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>{editing ? `Edit “${editing.name}”` : 'New scheduled report'}</DialogTitle>
            <DialogDescription>What goes in it, who gets it and when it's sent.</DialogDescription>
          </DialogHeader>

          <div className="space-y-6">
            <FormBlock n={1} title="Report">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <Label>Name</Label>
                  <Input className="mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                </div>
                <div>
                  <Label>Email subject (optional)</Label>
                  <Input className="mt-1" value={form.subject_override || ''} placeholder="Automatic if blank" onChange={(e) => setForm({ ...form, subject_override: e.target.value || null })} />
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <Label>Sections to include</Label>
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={() => setForm({ ...form, sections: form.sections.length === SECTION_OPTS.length ? [] : SECTION_OPTS.map((o) => o.id) })}
                  >
                    {form.sections.length === SECTION_OPTS.length ? 'Clear all' : 'Select all'}
                  </button>
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  {SECTION_OPTS.map((opt) => {
                    const on = form.sections.includes(opt.id);
                    return (
                      <label key={opt.id} className={cn('flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm', on && 'border-orange-500/50 bg-orange-500/5')}>
                        <Checkbox
                          checked={on}
                          onCheckedChange={(v) => setForm({ ...form, sections: v ? [...form.sections, opt.id] : form.sections.filter((x) => x !== opt.id) })}
                        />
                        {opt.label}
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex items-center gap-3 text-sm">
                  <Switch checked={form.only_changes} onCheckedChange={(v) => setForm({ ...form, only_changes: v })} />
                  Skip sections with no activity
                </label>
                <label className="flex items-center gap-3 text-sm">
                  <Switch checked={form.attach_csv} onCheckedChange={(v) => setForm({ ...form, attach_csv: v })} />
                  Attach a CSV with the PDF
                </label>
              </div>
            </FormBlock>

            <FormBlock n={2} title="Recipients">
              <div className="flex gap-2">
                <Input
                  value={recipientInput}
                  placeholder="name@example.com (Enter to add)"
                  onChange={(e) => setRecipientInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ',') {
                      e.preventDefault();
                      addRecipient();
                    }
                  }}
                />
                <Button type="button" variant="secondary" onClick={addRecipient}>
                  Add
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {form.recipients.length === 0 && <p className="text-xs text-muted-foreground">No recipients yet.</p>}
                {form.recipients.map((r) => (
                  <Badge key={r} variant="secondary" className="gap-1">
                    {r}
                    <button type="button" onClick={() => setForm({ ...form, recipients: form.recipients.filter((x) => x !== r) })} aria-label={`Remove ${r}`}>
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                ))}
              </div>
            </FormBlock>

            <FormBlock n={3} title="Schedule">
              <div className="flex flex-wrap gap-1 rounded-lg bg-muted p-1 text-sm">
                {FREQS.map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setForm({ ...form, frequency: f.id })}
                    className={cn('flex-1 rounded-md px-3 py-1.5 font-medium transition-colors', form.frequency === f.id ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground')}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                {form.frequency === 'weekly' && (
                  <div>
                    <Label>Day</Label>
                    <Select value={String(form.day_of_week)} onValueChange={(v) => setForm({ ...form, day_of_week: Number(v) })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {DAYS.map((d, i) => (
                          <SelectItem key={i} value={String(i)}>
                            {d}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {form.frequency === 'monthly' && (
                  <div>
                    <Label>Day of month</Label>
                    <Select value={String(form.day_of_month ?? 1)} onValueChange={(v) => setForm({ ...form, day_of_month: Number(v) })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 31 }).map((_, i) => (
                          <SelectItem key={i} value={String(i + 1)}>
                            {i + 1}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                {form.frequency !== 'one_time' ? (
                  <div>
                    <Label>Time</Label>
                    <Select value={String(form.hour)} onValueChange={(v) => setForm({ ...form, hour: Number(v) })}>
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 24 }).map((_, i) => (
                          <SelectItem key={i} value={String(i)}>
                            {hourLabel(i)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="sm:col-span-2">
                    <Label>Send on</Label>
                    <Input
                      className="mt-1"
                      type="datetime-local"
                      value={form.run_at ? localDateTimeInputValue(form.run_at) : ''}
                      onChange={(e) => setForm({ ...form, run_at: e.target.value ? new Date(e.target.value).toISOString() : null })}
                    />
                  </div>
                )}
                <div>
                  <Label>Covers</Label>
                  <Select value={form.date_range_days == null ? 'default' : String(form.date_range_days)} onValueChange={(v) => setForm({ ...form, date_range_days: v === 'default' ? null : Number(v) })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {RANGE_OPTS.map((o) => (
                        <SelectItem key={o.v} value={o.v}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label>Time zone</Label>
                  <Input className="mt-1" value={form.timezone} onChange={(e) => setForm({ ...form, timezone: e.target.value })} />
                </div>
                <label className="mt-6 flex items-center gap-3 text-sm">
                  <Switch checked={form.enabled} onCheckedChange={(v) => setForm({ ...form, enabled: v })} />
                  Active (sends on schedule)
                </label>
              </div>
              <p className="rounded-lg bg-muted/50 px-3 py-2 text-sm">
                <Clock className="mr-1.5 inline h-3.5 w-3.5" />
                {scheduleText(form)}, {form.timezone.replace(/_/g, ' ')} time.
              </p>
            </FormBlock>

            <FormBlock n={4} title="Which jobs" hint="Leave both empty to include everything you can see.">
              <div className="grid gap-4 md:grid-cols-2">
                <PickList
                  label="Companies"
                  items={companies.map((c) => ({ id: c.id, name: c.name }))}
                  selected={form.company_ids}
                  onChange={(ids) => setForm({ ...form, company_ids: ids })}
                />
                <PickList label="Projects" items={projects} selected={form.project_ids} onChange={(ids) => setForm({ ...form, project_ids: ids })} />
              </div>
            </FormBlock>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button onClick={save}>{editing ? 'Save changes' : 'Create report'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete “{confirmDelete?.name}”?</AlertDialogTitle>
            <AlertDialogDescription>It stops sending and is removed. To stop it for now, pause it instead.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDelete) remove(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}

function FormBlock({ n, title, hint, children }: { n: number; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <div className="flex items-baseline gap-2">
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">{n}</span>
        <h3 className="font-semibold">{title}</h3>
        {hint && <span className="text-xs text-muted-foreground">{hint}</span>}
      </div>
      {children}
    </section>
  );
}

function PickList({
  label,
  items,
  selected,
  onChange,
}: {
  label: string;
  items: { id: string; name: string }[];
  selected: string[] | null;
  onChange: (ids: string[] | null) => void;
}) {
  const [q, setQ] = useState('');
  const shown = items.filter((i) => i.name.toLowerCase().includes(q.toLowerCase()));
  return (
    <div>
      <div className="mb-1 flex items-center justify-between">
        <Label>{label}</Label>
        <span className="text-xs text-muted-foreground">{selected?.length ? `${selected.length} selected` : 'All'}</span>
      </div>
      <div className="rounded-lg border">
        {items.length > 6 && <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Find ${label.toLowerCase()}…`} className="h-8 rounded-b-none border-0 border-b" />}
        <div className="max-h-40 space-y-0.5 overflow-y-auto p-1.5">
          {shown.length === 0 && <p className="p-2 text-xs text-muted-foreground">None</p>}
          {shown.map((it) => (
            <label key={it.id} className="flex cursor-pointer items-center gap-2 rounded px-1.5 py-1 text-sm hover:bg-muted">
              <Checkbox
                checked={selected?.includes(it.id) || false}
                onCheckedChange={(v) => {
                  const cur = selected || [];
                  const next = v ? [...cur, it.id] : cur.filter((x) => x !== it.id);
                  onChange(next.length ? next : null);
                }}
              />
              <span className="truncate">{it.name}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
}
