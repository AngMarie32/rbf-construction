import { localDateISO } from '@/utils/dates';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useCompanies } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, Layers, CalendarDays, Receipt } from 'lucide-react';
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
import { PageHero, heroButton, heroButtonPrimary } from '@/components/ui/page-hero';
import { AccentStat } from '@/components/ui/accent-stat';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip } from 'recharts';
import { cn } from '@/lib/utils';
import {
  FREQUENCIES,
  OverheadFrequency,
  RunRate,
  EMPTY_RUN_RATE,
  addRunRates,
  runRateFromDaily,
  toDaily,
} from '@/utils/overheadMath';

interface OverheadItem {
  id: string;
  company_id: string | null;
  name: string;
  category: string;
  amount: number;
  frequency: OverheadFrequency;
  is_active: boolean;
  notes: string | null;
}

const CATEGORIES = [
  'General',
  'Rent & Facilities',
  'Payroll',
  'Insurance',
  'Vehicles & Fuel',
  'Equipment',
  'Software & IT',
  'Utilities',
  'Professional Fees',
  'Marketing',
  'Debt Service',
];

const LOOKBACKS = [
  { value: '90', label: 'Last 90 days' },
  { value: '180', label: 'Last 180 days' },
  { value: '365', label: 'Last 12 months' },
];

const money = (n: number) =>
  (Number(n) || 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const money0 = (n: number) => (Number(n) || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

const CAT_COLORS = ['#2563eb', '#f97316', '#10b981', '#6366f1', '#f59e0b', '#e11d48', '#06b6d4', '#8b5cf6', '#84cc16', '#ec4899', '#64748b'];
const catColor = (c: string) => {
  const i = CATEGORIES.indexOf(c);
  if (i >= 0) return CAT_COLORS[i % CAT_COLORS.length];
  let h = 0;
  for (const ch of c) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return CAT_COLORS[h % CAT_COLORS.length];
};

const emptyForm = {
  id: '' as string,
  company_id: '' as string,
  name: '',
  category: 'General',
  amount: '',
  frequency: 'monthly' as OverheadFrequency,
  is_active: true,
  notes: '',
  allIn: false,
};

export default function OperatingCosts() {
  const { companies, activeCompanies, selectedIds } = useCompanies();
  const [items, setItems] = useState<OverheadItem[]>([]);
  const [spendByCompany, setSpendByCompany] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<'combined' | 'per_company'>('combined');
  const [includeSpend, setIncludeSpend] = useState(true);
  const [lookback, setLookback] = useState('180');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ ...emptyForm });
  const [catFilter, setCatFilter] = useState('all');
  const [activeFilter, setActiveFilter] = useState('all');
  const [confirmDelete, setConfirmDelete] = useState<OverheadItem | null>(null);

  const load = useCallback(async () => {
    if (selectedIds.length === 0) {
      setItems([]);
      setSpendByCompany({});
      setLoading(false);
      return;
    }
    setLoading(true);

    const days = Number(lookback);
    const since = localDateISO(new Date(Date.now() - days * 86400000));

    const [{ data: overhead }, { data: projects }] = await Promise.all([
      supabase.from('overhead_items').select('*').in('company_id', selectedIds).order('name'),
      supabase.from('projects').select('id,company_id').in('company_id', selectedIds),
    ]);

    setItems(((overhead as any[]) || []) as OverheadItem[]);

    const projectCompany: Record<string, string> = {};
    ((projects as any[]) || []).forEach((p) => {
      projectCompany[p.id] = p.company_id;
    });
    const projectIds = Object.keys(projectCompany);

    const totals: Record<string, number> = {};
    if (projectIds.length) {
      const { data: expenses } = await supabase
        .from('expenses')
        .select('amount,project_id,date')
        .in('project_id', projectIds)
        .gte('date', since);
      ((expenses as any[]) || []).forEach((e) => {
        const cid = projectCompany[e.project_id];
        if (!cid) return;
        totals[cid] = (totals[cid] || 0) + (Number(e.amount) || 0);
      });
    }
    setSpendByCompany(totals);
    setLoading(false);
  }, [selectedIds, lookback]);

  useEffect(() => {
    load();
  }, [load]);

  const days = Number(lookback);

  const perCompany = useMemo(() => {
    return activeCompanies.map((c) => {
      const own = items.filter((i) => i.company_id === c.id && i.is_active);
      const overheadDaily = own.reduce((s, i) => s + toDaily(Number(i.amount), i.frequency), 0);
      const recordedDaily = includeSpend ? (spendByCompany[c.id] || 0) / days : 0;
      return {
        company: c,
        items: own,
        overhead: runRateFromDaily(overheadDaily),
        recorded: runRateFromDaily(recordedDaily),
        total: runRateFromDaily(overheadDaily + recordedDaily),
      };
    });
  }, [activeCompanies, items, spendByCompany, includeSpend, days]);

  const combined = useMemo(
    () =>
      perCompany.reduce(
        (acc, r) => ({
          overhead: addRunRates(acc.overhead, r.overhead),
          recorded: addRunRates(acc.recorded, r.recorded),
          total: addRunRates(acc.total, r.total),
        }),
        { overhead: EMPTY_RUN_RATE, recorded: EMPTY_RUN_RATE, total: EMPTY_RUN_RATE }
      ),
    [perCompany]
  );

  const byCategory = useMemo(() => {
    const map: Record<string, number> = {};
    items
      .filter((i) => i.is_active)
      .forEach((i) => {
        map[i.category] = (map[i.category] || 0) + toDaily(Number(i.amount), i.frequency);
      });
    return Object.entries(map)
      .map(([label, daily]) => ({ label, ...runRateFromDaily(daily) }))
      .sort((a, b) => b.yearly - a.yearly);
  }, [items]);

  const openNew = () => {
    setForm({ ...emptyForm, company_id: activeCompanies[0]?.id || companies[0]?.id || '' });
    setShowForm(true);
  };

  const openAllIn = () => {
    setForm({
      ...emptyForm,
      company_id: activeCompanies[0]?.id || companies[0]?.id || '',
      name: 'All-in overhead',
      category: 'General',
      allIn: true,
    });
    setShowForm(true);
  };

  const openEdit = (item: OverheadItem) => {
    setForm({
      id: item.id,
      company_id: item.company_id || '',
      name: item.name,
      category: item.category,
      amount: String(item.amount ?? ''),
      frequency: item.frequency,
      is_active: item.is_active,
      notes: item.notes || '',
      allIn: false,
    });
    setShowForm(true);
  };

  const save = async () => {
    if (!form.name.trim()) return toast.error('Give the cost a name');
    if (!form.company_id) return toast.error('Pick a company');
    const payload = {
      company_id: form.company_id,
      name: form.name.trim(),
      category: form.category,
      amount: Number(form.amount) || 0,
      frequency: form.frequency,
      is_active: form.is_active,
      notes: form.notes || null,
    };
    const { error } = form.id
      ? await supabase.from('overhead_items').update(payload).eq('id', form.id)
      : await supabase.from('overhead_items').insert(payload as any);
    if (error) return toast.error(error.message);
    toast.success(form.id ? 'Cost updated' : 'Cost added');
    setShowForm(false);
    setForm({ ...emptyForm });
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('overhead_items').delete().eq('id', id);
    if (error) return toast.error(error.message);
    toast.success('Removed');
    load();
  };

  const toggleActive = async (item: OverheadItem) => {
    const { error } = await supabase.from('overhead_items').update({ is_active: !item.is_active }).eq('id', item.id);
    if (error) return toast.error(error.message);
    setItems((list) => list.map((i) => (i.id === item.id ? { ...i, is_active: !i.is_active } : i)));
    toast.success(item.is_active ? `Paused "${item.name}"` : `"${item.name}" is active again`);
  };

  const visibleItems = items.filter(
    (i) => (catFilter === 'all' || i.category === catFilter) && (activeFilter === 'all' || (activeFilter === 'active' ? i.is_active : !i.is_active))
  );
  const overheadShare = combined.total.monthly > 0 ? (combined.overhead.monthly / combined.total.monthly) * 100 : 0;
  const catTotal = byCategory.reduce((s, c) => s + c.monthly, 0);
  const pausedMonthly = items.filter((i) => !i.is_active).reduce((s, i) => s + runRateFromDaily(toDaily(Number(i.amount), i.frequency)).monthly, 0);

  const columns: DataTableColumn<OverheadItem>[] = [
    {
      id: 'name',
      header: 'Cost',
      value: (i) => i.name,
      cell: (i) => (
        <div className="min-w-0">
          <p className={cn('font-medium', !i.is_active && 'text-muted-foreground line-through decoration-muted-foreground/50')}>{i.name}</p>
          {i.notes && <p className="max-w-xs truncate text-xs text-muted-foreground">{i.notes.replace(/\[batch:[^\]]+\]/g, '').trim()}</p>}
        </div>
      ),
    },
    ...(selectedIds.length > 1
      ? [{ id: 'company', header: 'Company', value: (i: OverheadItem) => companies.find((c) => c.id === i.company_id)?.name || '', cell: (i: OverheadItem) => companies.find((c) => c.id === i.company_id)?.name || '—' }]
      : []),
    {
      id: 'category',
      header: 'Category',
      value: (i) => i.category,
      cell: (i) => (
        <span className="inline-flex items-center gap-1.5 text-sm">
          <span className="h-2 w-2 rounded-full" style={{ background: catColor(i.category) }} />
          {i.category}
        </span>
      ),
    },
    {
      id: 'amount',
      header: 'Amount',
      align: 'right',
      value: (i) => Number(i.amount) || 0,
      cell: (i) => (
        <div className="text-right">
          <p className="tabular-nums">{money(Number(i.amount))}</p>
          <p className="text-xs text-muted-foreground">{FREQUENCIES.find((f) => f.value === i.frequency)?.label}</p>
        </div>
      ),
    },
    { id: 'monthly', header: 'Monthly', align: 'right', value: (i) => runRateFromDaily(toDaily(Number(i.amount), i.frequency)).monthly, cell: (i) => <span className="font-semibold tabular-nums">{money(runRateFromDaily(toDaily(Number(i.amount), i.frequency)).monthly)}</span> },
    { id: 'yearly', header: 'Yearly', align: 'right', value: (i) => runRateFromDaily(toDaily(Number(i.amount), i.frequency)).yearly, cell: (i) => <span className="tabular-nums text-muted-foreground">{money(runRateFromDaily(toDaily(Number(i.amount), i.frequency)).yearly)}</span> },
    {
      id: 'active',
      header: 'Active',
      value: (i) => (i.is_active ? 'Active' : 'Paused'),
      cell: (i) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Switch checked={i.is_active} onCheckedChange={() => toggleActive(i)} aria-label={i.is_active ? 'Pause' : 'Resume'} />
        </div>
      ),
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      noExport: true,
      cell: (i) => (
        <div className="flex justify-end gap-0.5" onClick={(e) => e.stopPropagation()}>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Edit" onClick={() => openEdit(i)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" aria-label="Delete" onClick={() => setConfirmDelete(i)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Layout hideTitle title="Operating Costs">
      <div className="space-y-6">
        <PageHero
          eyebrow="Portfolio"
          title="Operating Costs"
          subtitle="What it costs to keep the doors open: fixed overhead plus average job spending, as a daily, weekly, monthly and yearly run rate."
          actions={
            <>
              <button type="button" className={heroButtonPrimary} onClick={openNew}>
                <Plus className="h-4 w-4" /> Add cost
              </button>
              <button type="button" className={heroButton} onClick={openAllIn}>
                <Layers className="h-4 w-4" /> One all-in number
              </button>
            </>
          }
          stats={[
            { label: 'Per month', value: loading ? '…' : money0(combined.total.monthly) },
            { label: 'Per year', value: loading ? '…' : money0(combined.total.yearly) },
          ]}
        />

        {/* Controls */}
        <Card className="flex flex-wrap items-end gap-4 p-4">
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">View</Label>
            <div className="flex rounded-lg bg-muted p-1 text-sm">
              {(['combined', 'per_company'] as const).map((v) => (
                <button
                  key={v}
                  type="button"
                  onClick={() => setView(v)}
                  className={cn('rounded-md px-3 py-1.5 font-medium transition-colors', view === v ? 'bg-background shadow-sm' : 'text-muted-foreground hover:text-foreground')}
                >
                  {v === 'combined' ? 'Combined' : 'By company'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-2 pb-2">
            <Switch checked={includeSpend} onCheckedChange={setIncludeSpend} id="inc" />
            <Label htmlFor="inc" className="text-sm">
              Include job spending
            </Label>
          </div>
          {includeSpend && (
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Average job spending over</Label>
              <Select value={lookback} onValueChange={setLookback}>
                <SelectTrigger className="w-[170px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {LOOKBACKS.map((l) => (
                    <SelectItem key={l.value} value={l.value}>
                      {l.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </Card>

        {/* Run rate */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <AccentStat label="Per day" value={money0(combined.total.daily)} icon={CalendarDays} accent="blue" loading={loading} hint={includeSpend ? 'Overhead + job spending' : 'Overhead only'} />
          <AccentStat label="Per week" value={money0(combined.total.weekly)} accent="indigo" loading={loading} hint="7 days" />
          <AccentStat label="Per month" value={money0(combined.total.monthly)} accent="orange" loading={loading} hint="Average month" />
          <AccentStat label="Per year" value={money0(combined.total.yearly)} accent="emerald" loading={loading} hint={pausedMonthly ? `${money0(pausedMonthly)}/mo paused, not counted` : '365 days'} />
        </div>

        {view === 'combined' ? (
          <div className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
            {/* Split fixed vs job */}
            <Card className="p-5">
              <p className="font-semibold">Where the run rate comes from</p>
              <p className="text-xs text-muted-foreground">Per month</p>
              <div className="mt-4 flex h-3 overflow-hidden rounded-full bg-muted">
                <div className="h-full bg-indigo-500" style={{ width: `${overheadShare}%` }} />
                <div className="h-full bg-orange-500" style={{ width: `${includeSpend ? 100 - overheadShare : 0}%` }} />
              </div>
              <div className="mt-4 space-y-3">
                <SplitRow color="bg-indigo-500" label="Fixed overhead" hint={`${items.filter((i) => i.is_active).length} active costs`} rate={combined.overhead} />
                <SplitRow
                  color="bg-orange-500"
                  label="Job spending (averaged)"
                  hint={includeSpend ? `Expenses on jobs, ${LOOKBACKS.find((l) => l.value === lookback)?.label.toLowerCase()}` : 'Turned off'}
                  rate={combined.recorded}
                  muted={!includeSpend}
                />
              </div>
            </Card>

            {/* Categories */}
            <Card className="p-5">
              <p className="font-semibold">Overhead by category</p>
              <p className="text-xs text-muted-foreground">Active costs, per month</p>
              {byCategory.length ? (
                <div className="mt-4 grid items-center gap-4 sm:grid-cols-[160px_1fr]">
                  <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={byCategory} dataKey="monthly" nameKey="label" innerRadius={45} outerRadius={70} paddingAngle={2} isAnimationActive={false}>
                          {byCategory.map((c) => (
                            <Cell key={c.label} fill={catColor(c.label)} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(v: number) => money(v)} contentStyle={{ borderRadius: 8, fontSize: 12 }} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-2">
                    {byCategory.map((c) => (
                      <button
                        key={c.label}
                        type="button"
                        onClick={() => setCatFilter(catFilter === c.label ? 'all' : c.label)}
                        className={cn('block w-full rounded-md px-2 py-1 text-left text-sm hover:bg-muted', catFilter === c.label && 'bg-muted')}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-2">
                            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: catColor(c.label) }} />
                            {c.label}
                          </span>
                          <span className="tabular-nums">
                            {money0(c.monthly)} <span className="text-xs text-muted-foreground">{catTotal ? `${((c.monthly / catTotal) * 100).toFixed(0)}%` : ''}</span>
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="mt-6 text-sm text-muted-foreground">Add recurring costs to see the breakdown.</p>
              )}
            </Card>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {perCompany.map((r) => (
              <Card key={r.company.id} className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold">{r.company.name}</p>
                  <Badge variant="secondary">{r.items.length} costs</Badge>
                </div>
                <p className="mt-3 font-display text-2xl font-bold tabular-nums">
                  {money0(r.total.monthly)}
                  <span className="text-sm font-normal text-muted-foreground"> / month</span>
                </p>
                <p className="text-xs text-muted-foreground">
                  {money0(r.total.daily)}/day · {money0(r.total.yearly)}/yr
                </p>
                <div className="mt-3 flex h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full bg-indigo-500" style={{ width: `${r.total.monthly ? (r.overhead.monthly / r.total.monthly) * 100 : 0}%` }} />
                  <div className="h-full bg-orange-500" style={{ width: `${r.total.monthly ? (r.recorded.monthly / r.total.monthly) * 100 : 0}%` }} />
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Overhead {money0(r.overhead.monthly)}/mo · Job spending {money0(r.recorded.monthly)}/mo
                </p>
              </Card>
            ))}
            {perCompany.length === 0 && <p className="text-sm text-muted-foreground">No companies selected.</p>}
          </div>
        )}

        <div>
          <h2 className="mb-3 font-semibold">Recurring costs</h2>
          <DataTable
            columns={columns}
            rows={visibleItems}
            totalCount={items.length}
            getRowId={(i) => i.id}
            loading={loading}
            searchPlaceholder="Search costs…"
            exportFilename="operating-costs"
            initialSort={{ id: 'monthly', desc: true }}
            onRowClick={openEdit}
            filters={
              <>
                <Select value={catFilter} onValueChange={setCatFilter}>
                  <SelectTrigger className="w-48">
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All categories</SelectItem>
                    {[...new Set([...CATEGORIES, ...items.map((i) => i.category)])].map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={activeFilter} onValueChange={setActiveFilter}>
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Active & paused</SelectItem>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="paused">Paused</SelectItem>
                  </SelectContent>
                </Select>
              </>
            }
            empty={
              <EmptyState
                icon={Receipt}
                title="No recurring costs yet"
                description="Add rent, insurance, payroll, vehicles, software and other fixed costs, or enter one all-in overhead number."
                action={{ label: 'Add cost', onClick: openNew, icon: Plus }}
                secondaryAction={{ label: 'One all-in number', onClick: openAllIn }}
              />
            }
          />
        </div>
      </div>

      <Dialog open={showForm} onOpenChange={setShowForm}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{form.allIn ? 'All-in overhead' : form.id ? 'Edit cost' : 'New recurring cost'}</DialogTitle>
            <DialogDescription>
              {form.allIn
                ? 'One total number for all your overhead, with no itemized breakdown. It saves as a single recurring cost you can edit later.'
                : 'A fixed cost that repeats, like rent, insurance or a software subscription.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            {!form.allIn && (
              <div className="sm:col-span-2">
                <Label>Name *</Label>
                <Input className="mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="e.g. Office rent" />
              </div>
            )}
            <div>
              <Label>Company</Label>
              <Select value={form.company_id} onValueChange={(v) => setForm({ ...form, company_id: v })}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {companies.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {!form.allIn && (
              <div>
                <Label>Category</Label>
                <Select value={form.category} onValueChange={(v) => setForm({ ...form, category: v })}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div>
              <Label>{form.allIn ? 'Total overhead amount' : 'Amount'}</Label>
              <Input className="mt-1" type="number" inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} />
            </div>
            <div>
              <Label>How often</Label>
              <Select value={form.frequency} onValueChange={(v) => setForm({ ...form, frequency: v as OverheadFrequency })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {FREQUENCIES.map((f) => (
                    <SelectItem key={f.value} value={f.value}>
                      {f.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {Number(form.amount) > 0 && (
              <p className="text-sm text-muted-foreground sm:col-span-2">
                = <span className="font-semibold text-foreground">{money(runRateFromDaily(toDaily(Number(form.amount), form.frequency)).monthly)}</span> per month ·{' '}
                {money(runRateFromDaily(toDaily(Number(form.amount), form.frequency)).yearly)} per year
              </p>
            )}
            <div className="flex items-center gap-2 sm:col-span-2">
              <Switch id="active" checked={form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} />
              <Label htmlFor="active">Active (counts toward the run rate)</Label>
            </div>
            <div className="sm:col-span-2">
              <Label>Notes</Label>
              <Textarea className="mt-1" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Cancel
            </Button>
            <Button onClick={save}>{form.id ? 'Save changes' : 'Add cost'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this cost?</AlertDialogTitle>
            <AlertDialogDescription>
              "{confirmDelete?.name}" will be removed from your operating costs. To stop counting it but keep it on file, pause it instead.
            </AlertDialogDescription>
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

function SplitRow({ color, label, hint, rate, muted }: { color: string; label: string; hint: string; rate: RunRate; muted?: boolean }) {
  return (
    <div className={cn('flex items-start justify-between gap-3', muted && 'opacity-50')}>
      <div className="flex items-start gap-2">
        <span className={cn('mt-1.5 h-2.5 w-2.5 shrink-0 rounded-sm', color)} />
        <div>
          <p className="text-sm font-medium">{label}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="font-semibold tabular-nums">{money0(rate.monthly)}/mo</p>
        <p className="text-xs text-muted-foreground">
          {money0(rate.daily)}/day · {money0(rate.yearly)}/yr
        </p>
      </div>
    </div>
  );
}
