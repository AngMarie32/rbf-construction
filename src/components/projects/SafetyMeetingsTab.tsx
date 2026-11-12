import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { CalendarCheck, HardHat, Loader2, Pencil, Plus, ShieldCheck, Trash2, Users, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
import { AccentStat } from '@/components/ui/accent-stat';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { ExportMenu, downloadCsv } from '@/components/ui/export-menu';
import { localDateISO } from '@/utils/dates';

export const MEETING_TYPES = ['Toolbox Talk', 'Pre-Task / JHA', 'Weekly Safety Meeting', 'Site Orientation', 'Incident Review', 'Other'] as const;
const TOPICS = [
  'Fall protection',
  'Ladder safety',
  'Scaffolding',
  'Trenching & excavation',
  'Electrical safety / lockout-tagout',
  'PPE',
  'Heat stress',
  'Cold weather',
  'Silica dust',
  'Hand & power tools',
  'Struck-by hazards',
  'Housekeeping',
  'Fire prevention',
  'Hazard communication',
  'Emergency action plan',
];

export interface SafetyMeeting {
  id: string;
  project_id: string;
  meeting_date: string;
  start_time: string | null;
  duration_minutes: number | null;
  meeting_type: string;
  topic: string;
  conducted_by: string;
  location: string;
  attendees: string[];
  hazards_discussed: string;
  corrective_actions: string;
  notes: string | null;
  created_at: string;
}

type Form = Omit<SafetyMeeting, 'id' | 'project_id' | 'created_at' | 'duration_minutes'> & { id?: string; duration_minutes: string };

const blank = (leader?: string): Form => ({
  meeting_date: localDateISO(new Date()),
  start_time: '07:00',
  duration_minutes: '15',
  meeting_type: 'Toolbox Talk',
  topic: '',
  conducted_by: leader || '',
  location: '',
  attendees: [],
  hazards_discussed: '',
  corrective_actions: '',
  notes: '',
});

const day = (v: string) => new Date(`${v.slice(0, 10)}T00:00:00`);
const fmtDay = (v: string) => format(day(v), 'MMM d, yyyy');
const MISSING = /safety_meetings|schema cache|does not exist/i;

interface Props {
  projectId: string;
  project?: { name?: string; address?: string | null; client?: string | null; fieldLeader?: string | null } | null;
}

/** Safety meeting / toolbox talk log for one job, with sign-in sheet PDF and CSV export. */
export function SafetyMeetingsTab({ projectId, project }: Props) {
  const [rows, setRows] = useState<SafetyMeeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [missingTable, setMissingTable] = useState(false);
  const [form, setForm] = useState<Form | null>(null);
  const [attendeeInput, setAttendeeInput] = useState('');
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<SafetyMeeting | null>(null);
  const [typeFilter, setTypeFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('safety_meetings')
      .select('*')
      .eq('project_id', projectId)
      .order('meeting_date', { ascending: false });
    if (error) {
      if (MISSING.test(error.message)) setMissingTable(true);
      else toast.error(error.message);
    } else {
      setMissingTable(false);
      setRows(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const shown = useMemo(() => rows.filter((r) => typeFilter === 'all' || r.meeting_type === typeFilter), [rows, typeFilter]);

  const stats = useMemo(() => {
    const now = new Date();
    const d30 = new Date(now.getTime() - 30 * 86400000);
    const last = rows[0];
    const daysSince = last ? Math.floor((now.getTime() - day(last.meeting_date).getTime()) / 86400000) : null;
    const people = new Set(rows.flatMap((r) => r.attendees.map((a) => a.trim().toLowerCase())).filter(Boolean));
    return {
      total: rows.length,
      last30: rows.filter((r) => day(r.meeting_date) >= d30).length,
      daysSince,
      people: people.size,
      avgAttendance: rows.length ? Math.round(rows.reduce((a, r) => a + r.attendees.length, 0) / rows.length) : 0,
    };
  }, [rows]);

  const openNew = () => {
    setAttendeeInput('');
    setForm(blank(project?.fieldLeader || ''));
  };
  const openEdit = (m: SafetyMeeting) => {
    setAttendeeInput('');
    setForm({ ...m, notes: m.notes || '', start_time: m.start_time || '', duration_minutes: m.duration_minutes != null ? String(m.duration_minutes) : '' });
  };
  const addAttendees = (raw: string) => {
    if (!form) return;
    const names = raw.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean);
    const next = [...form.attendees];
    names.forEach((n) => !next.some((x) => x.toLowerCase() === n.toLowerCase()) && next.push(n));
    setForm({ ...form, attendees: next });
    setAttendeeInput('');
  };
  const copyLastCrew = () => {
    const last = rows.find((r) => r.attendees.length && r.id !== form?.id);
    if (!last || !form) return toast.message('No earlier meeting with attendees on this job');
    addAttendees(last.attendees.join(','));
  };

  const save = async () => {
    if (!form) return;
    const pending = attendeeInput.trim();
    const attendees = pending ? [...form.attendees, ...pending.split(/[\n,;]+/).map((s) => s.trim()).filter(Boolean)] : form.attendees;
    if (!form.topic.trim()) return toast.error('Add the topic covered');
    if (!form.meeting_date) return toast.error('Pick the meeting date');
    setSaving(true);
    const row = {
      project_id: projectId,
      meeting_date: form.meeting_date,
      start_time: form.start_time || null,
      duration_minutes: form.duration_minutes ? Number(form.duration_minutes) : null,
      meeting_type: form.meeting_type,
      topic: form.topic.trim(),
      conducted_by: form.conducted_by.trim(),
      location: form.location.trim(),
      attendees,
      hazards_discussed: form.hazards_discussed.trim(),
      corrective_actions: form.corrective_actions.trim(),
      notes: form.notes?.trim() || null,
    };
    const q = (supabase as any).from('safety_meetings');
    const { error } = form.id ? await q.update(row).eq('id', form.id) : await q.insert(row);
    setSaving(false);
    if (error) {
      toast.error(MISSING.test(error.message) ? 'The database needs the "safety meetings" update before meetings can be saved.' : error.message);
      return;
    }
    toast.success(form.id ? 'Meeting updated' : 'Safety meeting logged');
    setForm(null);
    load();
  };

  const remove = async (m: SafetyMeeting) => {
    const { error } = await (supabase as any).from('safety_meetings').delete().eq('id', m.id);
    if (error) return toast.error(error.message);
    setRows((l) => l.filter((x) => x.id !== m.id));
    toast.success('Meeting deleted');
  };

  const slug = (project?.name || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-');

  const exportCsv = () =>
    downloadCsv(
      `safety-meetings-${slug}`,
      ['Date', 'Start', 'Minutes', 'Type', 'Topic', 'Conducted by', 'Location', 'Attendee count', 'Attendees', 'Hazards discussed', 'Corrective actions', 'Notes'],
      shown.map((m) => [
        m.meeting_date,
        m.start_time || '',
        m.duration_minutes ?? '',
        m.meeting_type,
        m.topic,
        m.conducted_by,
        m.location,
        m.attendees.length,
        m.attendees.join('; '),
        m.hazards_discussed,
        m.corrective_actions,
        m.notes || '',
      ])
    );

  /** Log of all meetings, then one sign-in sheet per meeting. */
  const exportPdf = async (only?: SafetyMeeting) => {
    const { DocKit, loadCompany, fmtDate, fileSlug } = await import('@/utils/pdfDocKit');
    const company = await loadCompany();
    const list = only ? [only] : shown;
    const doc = new DocKit(company, only ? 'Safety Meeting Sign-In' : 'Safety Meeting Log', project?.name || '');
    doc.letterhead(
      only
        ? [
            { label: 'Date', value: fmtDay(only.meeting_date) },
            { label: 'Type', value: only.meeting_type },
            { label: 'Attendees', value: String(only.attendees.length) },
            { label: 'Length', value: only.duration_minutes ? `${only.duration_minutes} min` : '—' },
          ]
        : [
            { label: 'Printed', value: fmtDate(new Date()) },
            { label: 'Meetings', value: String(list.length) },
            { label: 'Last 30 days', value: String(stats.last30) },
            { label: 'Workers trained', value: String(stats.people) },
          ]
    );
    doc.infoBoxes([
      { title: 'Project', lines: [project?.name, project?.address] },
      { title: only ? 'Conducted by' : 'Owner', lines: [only ? only.conducted_by || '—' : project?.client || '—', only?.location || undefined] },
    ]);
    if (!only) {
      doc.table(
        [
          { header: 'Date', width: 11 },
          { header: 'Type', width: 14 },
          { header: 'Topic', width: 30 },
          { header: 'Conducted by', width: 15 },
          { header: 'Crew', width: 6, align: 'center' },
          { header: 'Hazards / actions', width: 24 },
        ],
        list.map((m) => [
          fmtDay(m.meeting_date),
          m.meeting_type,
          { text: m.topic, bold: true },
          m.conducted_by || '—',
          String(m.attendees.length),
          [m.hazards_discussed, m.corrective_actions && `Action: ${m.corrective_actions}`].filter(Boolean).join('\n') || '—',
        ]),
        { fontSize: 8 }
      );
    } else {
      doc.heading(`Topic: ${only.topic}`);
      if (only.hazards_discussed) {
        doc.paragraph(`Hazards discussed: ${only.hazards_discussed}`);
      }
      if (only.corrective_actions) doc.paragraph(`Corrective actions: ${only.corrective_actions}`);
      if (only.notes) doc.paragraph(`Notes: ${only.notes}`);
      doc.y += 2;
      const lines = Math.max(only.attendees.length + 4, 12);
      doc.table(
        [
          { header: '#', width: 5, align: 'center' },
          { header: 'Printed name', width: 40 },
          { header: 'Company / trade', width: 25 },
          { header: 'Signature', width: 30 },
        ],
        Array.from({ length: lines }, (_, i) => [String(i + 1), only.attendees[i] || '', '', '']),
        { fontSize: 9 }
      );
      doc.y += 4;
      doc.signatures([{ title: 'Meeting leader' }, { title: 'Superintendent' }]);
    }
    doc.save(`${only ? 'safety-sign-in' : 'safety-meetings'}-${fileSlug(project?.name || 'project')}${only ? `-${only.meeting_date}` : ''}.pdf`);
  };

  const columns: DataTableColumn<SafetyMeeting>[] = [
    { id: 'date', header: 'Date', value: (m) => m.meeting_date, cell: (m) => <span className="whitespace-nowrap">{fmtDay(m.meeting_date)}</span> },
    {
      id: 'topic',
      header: 'Topic',
      value: (m) => `${m.topic} ${m.hazards_discussed}`,
      cell: (m) => (
        <div className="min-w-[200px] max-w-md">
          <p className="font-medium">{m.topic}</p>
          {m.hazards_discussed && <p className="truncate text-xs text-muted-foreground">{m.hazards_discussed}</p>}
        </div>
      ),
    },
    { id: 'type', header: 'Type', value: (m) => m.meeting_type, cell: (m) => <Badge variant="outline">{m.meeting_type}</Badge> },
    { id: 'by', header: 'Conducted by', value: (m) => m.conducted_by, cell: (m) => m.conducted_by || '—' },
    {
      id: 'crew',
      header: 'Attendees',
      align: 'right',
      value: (m) => m.attendees.length,
      cell: (m) => <span title={m.attendees.join(', ')}>{m.attendees.length}</span>,
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      cell: (m) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="sm" className="h-8" onClick={() => exportPdf(m)} title="Sign-in sheet PDF">
            Sign-in sheet
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Edit" onClick={() => openEdit(m)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" aria-label="Delete" onClick={() => setConfirmDelete(m)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  if (missingTable) {
    return (
      <EmptyState
        icon={ShieldCheck}
        title="Safety meetings need a database update"
        description='Ask an admin to run the "safety meetings" database update in Supabase, then reload this page.'
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <AccentStat label="Meetings logged" value={stats.total} icon={ShieldCheck} accent="blue" loading={loading} hint={`${stats.last30} in the last 30 days`} />
        <AccentStat
          label="Days since last"
          value={stats.daysSince == null ? '—' : stats.daysSince}
          icon={CalendarCheck}
          accent="amber"
          tone={stats.daysSince == null || stats.daysSince > 7 ? 'warn' : 'good'}
          loading={loading}
          hint={stats.daysSince == null ? 'No meetings yet' : stats.daysSince > 7 ? 'Weekly talk is due' : 'On a weekly cadence'}
        />
        <AccentStat label="Workers trained" value={stats.people} icon={Users} accent="emerald" loading={loading} hint="Different people who attended" />
        <AccentStat label="Avg. attendance" value={stats.avgAttendance} icon={HardHat} accent="indigo" loading={loading} hint="People per meeting" />
      </div>

      <DataTable
        columns={columns}
        rows={shown}
        totalCount={rows.length}
        getRowId={(m) => m.id}
        loading={loading}
        onRowClick={openEdit}
        initialSort={{ id: 'date', desc: true }}
        filters={
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All meeting types</SelectItem>
              {MEETING_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
            </SelectContent>
          </Select>
        }
        toolbarEnd={
          <>
            <ExportMenu
              options={[
                { label: 'Safety meeting log (PDF)', hint: 'All meetings shown, for the job file or an OSHA visit', format: 'pdf', onSelect: () => exportPdf(), disabled: !shown.length },
                { label: 'Spreadsheet (CSV)', hint: 'Every field, including attendee names', format: 'csv', onSelect: exportCsv, disabled: !shown.length },
              ]}
            />
            <Button onClick={openNew}>
              <Plus className="h-4 w-4" /> Log meeting
            </Button>
          </>
        }
        empty={
          <EmptyState
            icon={ShieldCheck}
            title="No safety meetings logged on this job"
            description="Record each toolbox talk or safety meeting: the topic, who led it and who attended. Print a sign-in sheet for the crew to sign."
            action={{ label: 'Log the first meeting', onClick: openNew }}
          />
        }
      />

      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[92vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{form?.id ? 'Edit safety meeting' : 'Log a safety meeting'}</DialogTitle>
            <DialogDescription>{project?.name}</DialogDescription>
          </DialogHeader>
          {form && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <div>
                  <Label htmlFor="sm-date">Date *</Label>
                  <Input id="sm-date" type="date" value={form.meeting_date} onChange={(e) => setForm({ ...form, meeting_date: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="sm-time">Start time</Label>
                  <Input id="sm-time" type="time" value={form.start_time || ''} onChange={(e) => setForm({ ...form, start_time: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="sm-min">Length (minutes)</Label>
                  <Input id="sm-min" type="number" min={1} value={form.duration_minutes} onChange={(e) => setForm({ ...form, duration_minutes: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Type</Label>
                  <Select value={form.meeting_type} onValueChange={(v) => setForm({ ...form, meeting_type: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>{MEETING_TYPES.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="sm-by">Conducted by</Label>
                  <Input id="sm-by" value={form.conducted_by} onChange={(e) => setForm({ ...form, conducted_by: e.target.value })} placeholder="Foreman or superintendent" />
                </div>
              </div>
              <div>
                <Label htmlFor="sm-topic">Topic *</Label>
                <Input id="sm-topic" list="sm-topics" value={form.topic} onChange={(e) => setForm({ ...form, topic: e.target.value })} placeholder="e.g. Fall protection on the roof deck" />
                <datalist id="sm-topics">{TOPICS.map((t) => <option key={t} value={t} />)}</datalist>
              </div>
              <div>
                <Label htmlFor="sm-loc">Location on site</Label>
                <Input id="sm-loc" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="e.g. Job trailer" />
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="sm-att">Attendees ({form.attendees.length})</Label>
                  <Button type="button" variant="link" size="sm" className="h-auto p-0 text-xs" onClick={copyLastCrew}>
                    Copy crew from last meeting
                  </Button>
                </div>
                <div className="mt-1 flex gap-2">
                  <Input
                    id="sm-att"
                    value={attendeeInput}
                    onChange={(e) => setAttendeeInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addAttendees(attendeeInput);
                      }
                    }}
                    placeholder="Type a name and press Enter (or paste a list)"
                  />
                  <Button type="button" variant="outline" onClick={() => addAttendees(attendeeInput)} disabled={!attendeeInput.trim()}>
                    Add
                  </Button>
                </div>
                {!!form.attendees.length && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {form.attendees.map((a) => (
                      <Badge key={a} variant="secondary" className="gap-1 pr-1">
                        {a}
                        <button type="button" aria-label={`Remove ${a}`} onClick={() => setForm({ ...form, attendees: form.attendees.filter((x) => x !== a) })}>
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <Label htmlFor="sm-haz">Hazards discussed</Label>
                <Textarea id="sm-haz" rows={2} value={form.hazards_discussed} onChange={(e) => setForm({ ...form, hazards_discussed: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="sm-act">Corrective actions / follow-up</Label>
                <Textarea id="sm-act" rows={2} value={form.corrective_actions} onChange={(e) => setForm({ ...form, corrective_actions: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="sm-notes">Notes</Label>
                <Textarea id="sm-notes" rows={2} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)} disabled={saving}>Cancel</Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="h-4 w-4 animate-spin" />} {form?.id ? 'Save changes' : 'Log meeting'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this safety meeting?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete ? `${confirmDelete.topic} on ${fmtDay(confirmDelete.meeting_date)}` : ''} is removed from the job's safety record. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDelete) remove(confirmDelete);
                setConfirmDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
