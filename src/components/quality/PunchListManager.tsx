import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { AlertTriangle, BadgeCheck, Camera, CheckCircle2, Clock, ImagePlus, ListChecks, Loader2, MoreHorizontal, Pencil, Plus, Target, Trash2, X } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
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
import { PageHero, heroButtonPrimary } from '@/components/ui/page-hero';
import { AccentStat } from '@/components/ui/accent-stat';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { ExportMenu, downloadCsv } from '@/components/ui/export-menu';
import { sortProjectsOpenFirst } from '@/utils/projectOrder';
import { localDateISO } from '@/utils/dates';
import { cn } from '@/lib/utils';

interface PunchItem {
  id: string;
  project_id: string;
  title: string;
  description: string;
  location: string;
  trade: string;
  priority: string;
  status: string;
  assigned_to: string;
  due_date: string | null;
  completed_at: string | null;
  verified_at: string | null;
  notes: string | null;
  photo_paths: string[];
  created_at: string;
}

const PRIORITIES = ['Low', 'Medium', 'High', 'Critical'];
const STATUSES = ['Open', 'In Progress', 'Completed', 'Verified'];
const TRADES = ['General', 'Electrical', 'Plumbing', 'HVAC', 'Painting', 'Flooring', 'Drywall', 'Tile', 'Carpentry', 'Roofing', 'Concrete', 'Landscaping'];

const PRIORITY_STYLE: Record<string, string> = {
  Critical: 'bg-rose-500/10 text-rose-700 ring-rose-500/20 dark:text-rose-300',
  High: 'bg-orange-500/10 text-orange-700 ring-orange-500/20 dark:text-orange-300',
  Medium: 'bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300',
  Low: 'bg-slate-500/10 text-slate-700 ring-slate-500/20 dark:text-slate-300',
};
const STATUS_STYLE: Record<string, string> = {
  Open: 'bg-rose-500/10 text-rose-700 ring-rose-500/20 dark:text-rose-300',
  'In Progress': 'bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300',
  Completed: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300',
  Verified: 'bg-blue-500/10 text-blue-700 ring-blue-500/20 dark:text-blue-300',
};

const isDone = (s: string) => s === 'Completed' || s === 'Verified';
const fmt = (d: string | null) => (d ? format(new Date(`${d.slice(0, 10)}T00:00:00`), 'MMM d, yyyy') : '');
const daysUntil = (d: string) => {
  const t = new Date();
  return Math.round((new Date(`${d.slice(0, 10)}T00:00:00`).getTime() - new Date(t.getFullYear(), t.getMonth(), t.getDate()).getTime()) / 86400000);
};

type Form = Omit<PunchItem, 'id' | 'created_at' | 'completed_at' | 'verified_at' | 'photo_paths'> & { id?: string; photo_paths: string[] };
const blank = (projectId: string): Form => ({
  project_id: projectId,
  title: '',
  description: '',
  location: '',
  trade: 'General',
  priority: 'Medium',
  status: 'Open',
  assigned_to: '',
  due_date: localDateISO(new Date(Date.now() + 7 * 86400000)),
  notes: '',
  photo_paths: [],
});

export function PunchListManager({ projectId }: { projectId?: string }) {
  const [projects, setProjects] = useState<{ id: string; name: string; address?: string | null; client?: string | null }[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState(projectId || '');
  const [items, setItems] = useState<PunchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [missingTable, setMissingTable] = useState(false);
  const [statusFilter, setStatusFilter] = useState('all');
  const [priorityFilter, setPriorityFilter] = useState('all');
  const [tradeFilter, setTradeFilter] = useState('all');
  const [assigneeFilter, setAssigneeFilter] = useState('all');
  const [form, setForm] = useState<Form | null>(null);
  const [newPhotos, setNewPhotos] = useState<File[]>([]);
  const [photoUrls, setPhotoUrls] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<PunchItem | null>(null);
  const [viewPhoto, setViewPhoto] = useState<string | null>(null);

  useEffect(() => {
    supabase
      .from('projects')
      .select('id, name, status, address, client')
      .is('archived_at', null)
      .order('name')
      .then(({ data }) => {
        const list = sortProjectsOpenFirst(data || []);
        setProjects(list);
        if (!selectedProjectId && list.length) setSelectedProjectId(list[0].id);
        if (!list.length) setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const load = useCallback(async () => {
    if (!selectedProjectId) return;
    setLoading(true);
    const { data, error } = await (supabase as any)
      .from('punch_list_items')
      .select('*')
      .eq('project_id', selectedProjectId)
      .order('created_at', { ascending: false });
    if (error) {
      const missing = /relation|does not exist|schema cache/i.test(error.message);
      setMissingTable(missing);
      if (!missing) toast.error('Could not load the punch list.');
      setItems([]);
    } else {
      setMissingTable(false);
      setItems((data || []).map((r: any) => ({ ...r, photo_paths: r.photo_paths || [] })));
    }
    setLoading(false);
  }, [selectedProjectId]);

  useEffect(() => {
    load();
  }, [load]);

  // Signed links for photos on the open item
  useEffect(() => {
    const paths = form?.photo_paths?.filter((p) => !photoUrls[p]) || [];
    if (!paths.length) return;
    supabase.storage
      .from('punch-photos')
      .createSignedUrls(paths, 3600)
      .then(({ data }) => {
        if (!data) return;
        setPhotoUrls((m) => ({ ...m, ...Object.fromEntries(data.filter((d) => d.signedUrl).map((d) => [d.path as string, d.signedUrl])) }));
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form?.photo_paths]);

  const project = projects.find((p) => p.id === selectedProjectId);
  const overdue = (i: PunchItem) => !isDone(i.status) && !!i.due_date && daysUntil(i.due_date) < 0;
  const stats = useMemo(() => {
    const c = (s: string) => items.filter((i) => i.status === s).length;
    const done = items.filter((i) => isDone(i.status)).length;
    return {
      open: c('Open'),
      progress: c('In Progress'),
      completed: c('Completed'),
      verified: c('Verified'),
      overdue: items.filter(overdue).length,
      critical: items.filter((i) => !isDone(i.status) && (i.priority === 'Critical' || i.priority === 'High')).length,
      pct: items.length ? Math.round((done / items.length) * 100) : 0,
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items]);

  const assignees = [...new Set(items.map((i) => i.assigned_to).filter(Boolean))].sort();
  const trades = [...new Set([...TRADES, ...items.map((i) => i.trade)])];
  const rows = items.filter(
    (i) =>
      (statusFilter === 'all' || i.status === statusFilter || (statusFilter === 'overdue' && overdue(i)) || (statusFilter === 'remaining' && !isDone(i.status))) &&
      (priorityFilter === 'all' || i.priority === priorityFilter) &&
      (tradeFilter === 'all' || i.trade === tradeFilter) &&
      (assigneeFilter === 'all' || i.assigned_to === assigneeFilter)
  );

  const setStatus = async (item: PunchItem, status: string) => {
    const patch: Record<string, any> = { status };
    if (status === 'Completed' && !item.completed_at) patch.completed_at = new Date().toISOString();
    if (status === 'Verified') {
      patch.verified_at = new Date().toISOString();
      if (!item.completed_at) patch.completed_at = patch.verified_at;
    }
    if (!isDone(status)) {
      patch.completed_at = null;
      patch.verified_at = null;
    }
    const { error } = await (supabase as any).from('punch_list_items').update(patch).eq('id', item.id);
    if (error) return toast.error(`Couldn't update: ${error.message}`);
    setItems((l) => l.map((i) => (i.id === item.id ? { ...i, ...patch } : i)));
  };

  const save = async () => {
    if (!form) return;
    if (!form.title.trim()) return toast.error('Give the item a short title.');
    setSaving(true);
    try {
      const row = {
        project_id: form.project_id,
        title: form.title.trim(),
        description: form.description.trim(),
        location: form.location.trim(),
        trade: form.trade,
        priority: form.priority,
        status: form.status,
        assigned_to: form.assigned_to.trim(),
        due_date: form.due_date || null,
        notes: form.notes?.trim() || null,
      };
      let id = form.id;
      if (id) {
        const { error } = await (supabase as any).from('punch_list_items').update(row).eq('id', id);
        if (error) throw error;
      } else {
        const { data, error } = await (supabase as any).from('punch_list_items').insert(row).select('id').single();
        if (error) throw error;
        id = data.id;
      }
      if (newPhotos.length && id) {
        const uploaded: string[] = [];
        for (const f of newPhotos) {
          const path = `${form.project_id}/${id}/${Date.now()}-${f.name.replace(/[^\w.-]+/g, '_')}`;
          const { error } = await supabase.storage.from('punch-photos').upload(path, f, { contentType: f.type });
          if (error) throw error;
          uploaded.push(path);
        }
        const { error } = await (supabase as any).from('punch_list_items').update({ photo_paths: [...form.photo_paths, ...uploaded] }).eq('id', id);
        if (error) throw error;
      }
      toast.success(form.id ? 'Item updated' : 'Item added');
      setForm(null);
      setNewPhotos([]);
      load();
    } catch (e: any) {
      toast.error(
        /relation|does not exist|schema cache/i.test(e.message || '')
          ? 'The punch list needs its database update first. Ask an admin to run it.'
          : /bucket/i.test(e.message || '')
            ? 'Photo storage is not set up yet (part of the punch list database update).'
            : `Couldn't save: ${e.message}`
      );
    } finally {
      setSaving(false);
    }
  };

  const remove = async (item: PunchItem) => {
    if (item.photo_paths.length) await supabase.storage.from('punch-photos').remove(item.photo_paths);
    const { error } = await (supabase as any).from('punch_list_items').delete().eq('id', item.id);
    if (error) return toast.error(`Couldn't delete: ${error.message}`);
    setItems((l) => l.filter((i) => i.id !== item.id));
    toast.success('Item deleted');
  };

  const removePhoto = async (path: string) => {
    if (!form?.id) return;
    await supabase.storage.from('punch-photos').remove([path]);
    const next = form.photo_paths.filter((p) => p !== path);
    await (supabase as any).from('punch_list_items').update({ photo_paths: next }).eq('id', form.id);
    setForm({ ...form, photo_paths: next });
    setItems((l) => l.map((i) => (i.id === form.id ? { ...i, photo_paths: next } : i)));
  };

  const exportPdf = async () => {
    const { DocKit, loadCompany, fmtDate, fileSlug } = await import('@/utils/pdfDocKit');
    const company = await loadCompany();
    const doc = new DocKit(company, 'Punch List', project?.name || '');
    doc.letterhead([
      { label: 'Date', value: fmtDate(new Date()) },
      { label: 'Items', value: String(rows.length) },
      { label: 'Remaining', value: String(rows.filter((i) => !isDone(i.status)).length) },
      { label: 'Complete', value: `${rows.length ? Math.round((rows.filter((i) => isDone(i.status)).length / rows.length) * 100) : 0}%` },
    ]);
    doc.infoBoxes([
      { title: 'Project', lines: [project?.name, project?.address] },
      { title: 'Owner', lines: [project?.client || '—'] },
    ]);
    doc.table(
      [
        { header: '#', width: 4, align: 'center' },
        { header: 'Item', width: 30 },
        { header: 'Location', width: 13 },
        { header: 'Trade', width: 10 },
        { header: 'Assigned to', width: 14 },
        { header: 'Priority', width: 8 },
        { header: 'Due', width: 10 },
        { header: 'Status', width: 11 },
      ],
      rows.map((i, n) => [
        String(n + 1),
        [i.title, i.description].filter(Boolean).join('\n'),
        i.location || '—',
        i.trade,
        i.assigned_to || '—',
        i.priority,
        i.due_date ? fmt(i.due_date) : '—',
        { text: i.status, bold: true },
      ]),
      { fontSize: 8 }
    );
    doc.y += 4;
    doc.signatures([{ title: 'Contractor' }, { title: 'Owner / architect walk-through' }]);
    doc.save(`punch-list-${fileSlug(project?.name || 'project')}.pdf`);
  };

  const exportCsv = () =>
    downloadCsv(
      `punch-list-${(project?.name || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      ['Item', 'Description', 'Location', 'Trade', 'Assigned to', 'Priority', 'Status', 'Due', 'Completed', 'Notes'],
      rows.map((i) => [i.title, i.description, i.location, i.trade, i.assigned_to, i.priority, i.status, i.due_date || '', i.completed_at?.slice(0, 10) || '', i.notes || ''])
    );

  const columns: DataTableColumn<PunchItem>[] = [
    {
      id: 'title',
      header: 'Item',
      value: (i) => `${i.title} ${i.description} ${i.location}`,
      cell: (i) => (
        <div className="min-w-0 max-w-sm">
          <p className={cn('font-medium', isDone(i.status) && 'text-muted-foreground line-through decoration-muted-foreground/40')}>{i.title}</p>
          <p className="truncate text-xs text-muted-foreground">{[i.location, i.description].filter(Boolean).join(' · ')}</p>
        </div>
      ),
    },
    { id: 'trade', header: 'Trade', value: (i) => i.trade, cell: (i) => <span className="text-sm">{i.trade}</span> },
    { id: 'assigned', header: 'Assigned to', value: (i) => i.assigned_to, cell: (i) => i.assigned_to || <span className="text-muted-foreground">—</span> },
    {
      id: 'priority',
      header: 'Priority',
      value: (i) => PRIORITIES.indexOf(i.priority),
      cell: (i) => <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset', PRIORITY_STYLE[i.priority])}>{i.priority}</span>,
    },
    {
      id: 'due',
      header: 'Due',
      value: (i) => i.due_date,
      cell: (i) => {
        if (!i.due_date) return <span className="text-muted-foreground">—</span>;
        const d = daysUntil(i.due_date);
        return (
          <div className="whitespace-nowrap">
            <p className="text-sm">{fmt(i.due_date)}</p>
            {!isDone(i.status) && d < 0 && <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{-d} day{d === -1 ? '' : 's'} late</p>}
            {!isDone(i.status) && d >= 0 && d <= 2 && <p className="text-xs font-medium text-amber-600 dark:text-amber-400">{d === 0 ? 'Today' : `In ${d} day${d === 1 ? '' : 's'}`}</p>}
          </div>
        );
      },
    },
    {
      id: 'status',
      header: 'Status',
      value: (i) => STATUSES.indexOf(i.status),
      cell: (i) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Select value={i.status} onValueChange={(v) => setStatus(i, v)}>
            <SelectTrigger className={cn('h-7 w-[124px] rounded-full border-0 px-2.5 text-xs font-medium ring-1 ring-inset', STATUS_STYLE[i.status])}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      ),
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      noExport: true,
      cell: (i) => (
        <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {i.photo_paths.length > 0 && (
            <span className="inline-flex items-center gap-1 text-xs text-muted-foreground" title="Photos">
              <Camera className="h-3.5 w-3.5" />
              {i.photo_paths.length}
            </span>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="More">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={() => setForm({ ...i, notes: i.notes || '' })}>
                <Pencil className="mr-2 h-4 w-4" /> Edit, notes & photos
              </DropdownMenuItem>
              {!isDone(i.status) && (
                <DropdownMenuItem onSelect={() => setStatus(i, 'Completed')}>
                  <CheckCircle2 className="mr-2 h-4 w-4" /> Mark completed
                </DropdownMenuItem>
              )}
              {i.status === 'Completed' && (
                <DropdownMenuItem onSelect={() => setStatus(i, 'Verified')}>
                  <BadgeCheck className="mr-2 h-4 w-4" /> Mark verified
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => setConfirmDelete(i)}>
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  const openNew = () => {
    setNewPhotos([]);
    setForm(blank(selectedProjectId));
  };

  return (
    <div className="space-y-6">
      <PageHero
        eyebrow="Project management"
        title="Punch List"
        subtitle="Items that must be fixed or finished before the job is closed out."
        actions={
          <>
            <button type="button" className={heroButtonPrimary} onClick={openNew} disabled={!selectedProjectId || missingTable}>
              <Plus className="h-4 w-4" /> Add item
            </button>
            <ExportMenu
              variant="hero"
              options={[
                { label: 'Punch list (PDF)', hint: 'For the walk-through, with sign-off lines', format: 'pdf', disabled: !rows.length, onSelect: exportPdf },
                { label: 'Items (CSV)', hint: 'For Excel', format: 'csv', disabled: !rows.length, onSelect: exportCsv },
              ]}
            />
          </>
        }
        stats={[
          { label: 'Complete', value: loading ? '…' : `${stats.pct}%`, tone: stats.pct === 100 && items.length ? 'good' : undefined },
          { label: 'Remaining', value: loading ? '…' : String(stats.open + stats.progress), tone: stats.overdue ? 'bad' : undefined },
        ]}
      >
        <div className="flex flex-wrap items-center gap-3">
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-full max-w-sm border-white/15 bg-white/10 text-white">
              <SelectValue placeholder="Choose a project" />
            </SelectTrigger>
            <SelectContent>
              {projects.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {items.length > 0 && (
            <div className="flex min-w-[200px] flex-1 items-center gap-3">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/15">
                <div className="h-full rounded-full bg-emerald-400" style={{ width: `${stats.pct}%` }} />
              </div>
              <span className="text-xs text-white/70">to closeout</span>
            </div>
          )}
        </div>
      </PageHero>

      {missingTable ? (
        <EmptyState
          icon={ListChecks}
          title="The punch list needs a quick database update"
          description="Punch list items used to live only in your browser and were lost on reload. They now save to the database. Ask an admin to run the “punch list items” update in Supabase, then reload this page."
        />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
            {(
              [
                { key: 'Open', label: 'Open', value: stats.open, icon: Target, accent: 'rose' },
                { key: 'In Progress', label: 'In progress', value: stats.progress, icon: Clock, accent: 'amber' },
                { key: 'Completed', label: 'Completed', value: stats.completed, icon: CheckCircle2, accent: 'emerald' },
                { key: 'Verified', label: 'Verified', value: stats.verified, icon: BadgeCheck, accent: 'blue' },
                { key: 'overdue', label: 'Past due', value: stats.overdue, icon: AlertTriangle, accent: 'orange' },
              ] as const
            ).map((c, idx) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setStatusFilter(statusFilter === c.key ? 'all' : c.key)}
                className={cn('rounded-xl text-left transition-shadow hover:shadow-md', statusFilter === c.key && 'ring-2 ring-orange-500', idx === 4 && 'col-span-2 lg:col-span-1')}
              >
                <AccentStat
                  label={c.label}
                  value={c.value}
                  icon={c.icon}
                  accent={c.accent}
                  loading={loading}
                  tone={c.key === 'overdue' && c.value ? 'bad' : undefined}
                  hint={c.key === 'overdue' ? `${stats.critical} high or critical still open` : 'Click to filter'}
                />
              </button>
            ))}
          </div>

          <DataTable
            columns={columns}
            rows={rows}
            totalCount={items.length}
            getRowId={(i) => i.id}
            loading={loading}
            searchPlaceholder="Search item, location…"
            initialSort={{ id: 'due' }}
            onRowClick={(i) => {
              setNewPhotos([]);
              setForm({ ...i, notes: i.notes || '' });
            }}
            filters={
              <>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="remaining">Not done yet</SelectItem>
                    <SelectItem value="overdue">Past due</SelectItem>
                    {STATUSES.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All priorities</SelectItem>
                    {PRIORITIES.map((p) => (
                      <SelectItem key={p} value={p}>
                        {p}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={tradeFilter} onValueChange={setTradeFilter}>
                  <SelectTrigger className="w-36">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All trades</SelectItem>
                    {trades.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {assignees.length > 0 && (
                  <Select value={assigneeFilter} onValueChange={setAssigneeFilter}>
                    <SelectTrigger className="w-44">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Anyone</SelectItem>
                      {assignees.map((a) => (
                        <SelectItem key={a} value={a}>
                          {a}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </>
            }
            empty={
              <EmptyState
                icon={ListChecks}
                title={projects.length ? `No punch list items on ${project?.name || 'this project'} yet` : 'Create a project first'}
                description="Walk the job and add everything that has to be fixed or finished: where it is, who's on it and when it's due. Mark items completed, then verified at the owner walk-through."
                action={projects.length ? { label: 'Add the first item', onClick: openNew, icon: Plus } : undefined}
                secondaryAction={projects.length ? undefined : { label: 'Go to Projects', to: '/projects' }}
                steps={['Add items room by room', 'Assign each one and set a due date', 'Mark completed, then verified at the walk-through']}
              />
            }
          />
        </>
      )}

      {/* Add / edit */}
      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form?.id ? 'Edit punch list item' : 'New punch list item'}</DialogTitle>
            <DialogDescription>{project?.name}</DialogDescription>
          </DialogHeader>
          {form && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label>What needs fixing *</Label>
                <Input className="mt-1" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Touch up paint at stair landing" />
              </div>
              <div>
                <Label>Location</Label>
                <Input className="mt-1" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Room, floor or area" />
              </div>
              <div>
                <Label>Assigned to</Label>
                <Input className="mt-1" value={form.assigned_to} onChange={(e) => setForm({ ...form, assigned_to: e.target.value })} placeholder="Person or sub" list="punch-assignees" />
                <datalist id="punch-assignees">
                  {assignees.map((a) => (
                    <option key={a} value={a} />
                  ))}
                </datalist>
              </div>
              <div className="sm:col-span-2">
                <Label>Details</Label>
                <Textarea className="mt-1" rows={2} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3 sm:col-span-2 sm:grid-cols-4">
                <div>
                  <Label>Trade</Label>
                  <Select value={form.trade} onValueChange={(v) => setForm({ ...form, trade: v })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {trades.map((t) => (
                        <SelectItem key={t} value={t}>
                          {t}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Priority</Label>
                  <Select value={form.priority} onValueChange={(v) => setForm({ ...form, priority: v })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PRIORITIES.map((p) => (
                        <SelectItem key={p} value={p}>
                          {p}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUSES.map((s) => (
                        <SelectItem key={s} value={s}>
                          {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Due</Label>
                  <Input className="mt-1" type="date" value={form.due_date || ''} onChange={(e) => setForm({ ...form, due_date: e.target.value || null })} />
                </div>
              </div>
              <div className="sm:col-span-2">
                <Label>Notes</Label>
                <Textarea className="mt-1" rows={2} value={form.notes || ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Follow-ups, what was done, who signed off…" />
              </div>
              <div className="sm:col-span-2">
                <Label>Photos</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {form.photo_paths.map((p) => (
                    <div key={p} className="group relative h-20 w-20 overflow-hidden rounded-lg border bg-muted">
                      {photoUrls[p] ? (
                        <button type="button" onClick={() => setViewPhoto(photoUrls[p])} className="h-full w-full">
                          <img src={photoUrls[p]} alt="" className="h-full w-full object-cover" />
                        </button>
                      ) : (
                        <Loader2 className="m-auto mt-7 h-5 w-5 animate-spin text-muted-foreground" />
                      )}
                      <button
                        type="button"
                        onClick={() => removePhoto(p)}
                        className="absolute right-1 top-1 hidden rounded-full bg-black/60 p-0.5 text-white group-hover:block"
                        aria-label="Remove photo"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  {newPhotos.map((f, idx) => (
                    <div key={idx} className="relative h-20 w-20 overflow-hidden rounded-lg border">
                      <img src={URL.createObjectURL(f)} alt="" className="h-full w-full object-cover" />
                      <button type="button" onClick={() => setNewPhotos((l) => l.filter((_, j) => j !== idx))} className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white" aria-label="Remove">
                        <X className="h-3 w-3" />
                      </button>
                    </div>
                  ))}
                  <label className="flex h-20 w-20 cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed text-xs text-muted-foreground hover:border-orange-500/50 hover:text-foreground">
                    <ImagePlus className="h-5 w-5" />
                    Add
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        setNewPhotos((l) => [...l, ...Array.from(e.target.files || [])]);
                        e.target.value = '';
                      }}
                    />
                  </label>
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>
              Cancel
            </Button>
            <Button onClick={save} disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {form?.id ? 'Save changes' : 'Add item'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewPhoto} onOpenChange={(o) => !o && setViewPhoto(null)}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Photo</DialogTitle>
          </DialogHeader>
          {viewPhoto && <img src={viewPhoto} alt="" className="max-h-[70vh] w-full rounded-lg object-contain" />}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this item?</AlertDialogTitle>
            <AlertDialogDescription>"{confirmDelete?.title}" and its photos will be removed.</AlertDialogDescription>
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

export default PunchListManager;
