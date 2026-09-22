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
import { Plus, Pencil, Trash2 } from 'lucide-react';
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

const emptyForm = {
  id: '' as string,
  company_id: '' as string,
  name: '',
  category: 'General',
  amount: '',
  frequency: 'monthly' as OverheadFrequency,
  is_active: true,
  notes: '',
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

  const RateCards = ({ rate, label }: { rate: RunRate; label: string }) => (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {([
        ['Per day', rate.daily],
        ['Per week', rate.weekly],
        ['Per month', rate.monthly],
        ['Per year', rate.yearly],
      ] as [string, number][]).map(([k, v]) => (
        <Card key={k} className="p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">{k}</p>
          <p className="text-2xl font-semibold mt-1">{money(v)}</p>
          <p className="text-xs text-muted-foreground mt-1">{label}</p>
        </Card>
      ))}
    </div>
  );

  return (
    <Layout title="Operating Costs">
      <div className="space-y-6">
        <div className="flex flex-wrap items-end gap-4 justify-between">
          <div className="flex flex-wrap items-center gap-4">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">View</Label>
              <Select value={view} onValueChange={(v) => setView(v as any)}>
                <SelectTrigger className="w-[190px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="combined">Combined total</SelectItem>
                  <SelectItem value="per_company">Separate by company</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Recorded spending window</Label>
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
            <div className="flex items-center gap-2 pb-2">
              <Switch checked={includeSpend} onCheckedChange={setIncludeSpend} id="inc" />
              <Label htmlFor="inc" className="text-sm">
                Include recorded job spending
              </Label>
            </div>
          </div>
          <Button onClick={openNew}>
            <Plus className="w-4 h-4 mr-2" />
            Add cost
          </Button>
        </div>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : (
          <>
            {view === 'combined' ? (
              <div className="space-y-4">
                <RateCards
                  rate={combined.total}
                  label={includeSpend ? 'overhead + job spending' : 'overhead only'}
                />
                <div className="grid md:grid-cols-2 gap-4">
                  <Card className="p-4">
                    <p className="text-sm font-medium">Fixed overhead</p>
                    <p className="text-xl font-semibold mt-1">{money(combined.overhead.monthly)}/mo</p>
                    <p className="text-xs text-muted-foreground">
                      {money(combined.overhead.daily)}/day · {money(combined.overhead.yearly)}/yr
                    </p>
                  </Card>
                  <Card className="p-4">
                    <p className="text-sm font-medium">Recorded job spending (averaged)</p>
                    <p className="text-xl font-semibold mt-1">{money(combined.recorded.monthly)}/mo</p>
                    <p className="text-xs text-muted-foreground">
                      {money(combined.recorded.daily)}/day · {money(combined.recorded.yearly)}/yr
                    </p>
                  </Card>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                {perCompany.map((r) => (
                  <Card key={r.company.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold">{r.company.name}</p>
                      <Badge variant="secondary">{r.items.length} cost items</Badge>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                      <div>
                        <p className="text-xs text-muted-foreground">Per day</p>
                        <p className="font-semibold">{money(r.total.daily)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Per week</p>
                        <p className="font-semibold">{money(r.total.weekly)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Per month</p>
                        <p className="font-semibold">{money(r.total.monthly)}</p>
                      </div>
                      <div>
                        <p className="text-xs text-muted-foreground">Per year</p>
                        <p className="font-semibold">{money(r.total.yearly)}</p>
                      </div>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Overhead {money(r.overhead.monthly)}/mo · Job spending{' '}
                      {money(r.recorded.monthly)}/mo
                    </p>
                  </Card>
                ))}
                {perCompany.length === 0 && (
                  <p className="text-sm text-muted-foreground">No companies selected.</p>
                )}
              </div>
            )}

            {byCategory.length > 0 && (
              <Card className="p-4">
                <p className="font-semibold mb-3">Overhead by category</p>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase text-muted-foreground">
                        <th className="py-2">Category</th>
                        <th className="py-2 text-right">Day</th>
                        <th className="py-2 text-right">Week</th>
                        <th className="py-2 text-right">Month</th>
                        <th className="py-2 text-right">Year</th>
                      </tr>
                    </thead>
                    <tbody>
                      {byCategory.map((c) => (
                        <tr key={c.label} className="border-t border-border">
                          <td className="py-2">{c.label}</td>
                          <td className="py-2 text-right">{money(c.daily)}</td>
                          <td className="py-2 text-right">{money(c.weekly)}</td>
                          <td className="py-2 text-right">{money(c.monthly)}</td>
                          <td className="py-2 text-right">{money(c.yearly)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            <Card className="p-4">
              <p className="font-semibold mb-3">Recurring overhead items</p>
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Nothing yet — add rent, insurance, payroll, software and other fixed costs.
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-xs uppercase text-muted-foreground">
                        <th className="py-2">Name</th>
                        <th className="py-2">Company</th>
                        <th className="py-2">Category</th>
                        <th className="py-2 text-right">Amount</th>
                        <th className="py-2">Frequency</th>
                        <th className="py-2 text-right">Monthly</th>
                        <th className="py-2 text-right">Yearly</th>
                        <th className="py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {items.map((i) => {
                        const rate = runRateFromDaily(toDaily(Number(i.amount), i.frequency));
                        return (
                          <tr key={i.id} className="border-t border-border">
                            <td className="py-2">
                              {i.name}
                              {!i.is_active && (
                                <Badge variant="secondary" className="ml-2">
                                  Paused
                                </Badge>
                              )}
                            </td>
                            <td className="py-2 text-muted-foreground">
                              {companies.find((c) => c.id === i.company_id)?.name || '—'}
                            </td>
                            <td className="py-2 text-muted-foreground">{i.category}</td>
                            <td className="py-2 text-right">{money(Number(i.amount))}</td>
                            <td className="py-2 text-muted-foreground">
                              {FREQUENCIES.find((f) => f.value === i.frequency)?.label}
                            </td>
                            <td className="py-2 text-right">{money(rate.monthly)}</td>
                            <td className="py-2 text-right">{money(rate.yearly)}</td>
                            <td className="py-2 text-right whitespace-nowrap">
                              <Button variant="ghost" size="sm" onClick={() => openEdit(i)}>
                                <Pencil className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm" onClick={() => remove(i.id)}>
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>
          </>
        )}

        {showForm && (
          <Card className="p-4 space-y-4">
            <p className="font-semibold">{form.id ? 'Edit cost' : 'New recurring cost'}</p>
            <div className="grid md:grid-cols-3 gap-4">
              <div className="space-y-1">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Office rent"
                />
              </div>
              <div className="space-y-1">
                <Label>Company</Label>
                <Select
                  value={form.company_id}
                  onValueChange={(v) => setForm({ ...form, company_id: v })}
                >
                  <SelectTrigger>
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
              <div className="space-y-1">
                <Label>Category</Label>
                <Select
                  value={form.category}
                  onValueChange={(v) => setForm({ ...form, category: v })}
                >
                  <SelectTrigger>
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
              <div className="space-y-1">
                <Label>Amount</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={form.amount}
                  onChange={(e) => setForm({ ...form, amount: e.target.value })}
                />
              </div>
              <div className="space-y-1">
                <Label>How often</Label>
                <Select
                  value={form.frequency}
                  onValueChange={(v) => setForm({ ...form, frequency: v as OverheadFrequency })}
                >
                  <SelectTrigger>
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
              <div className="flex items-center gap-2 pt-6">
                <Switch
                  id="active"
                  checked={form.is_active}
                  onCheckedChange={(v) => setForm({ ...form, is_active: v })}
                />
                <Label htmlFor="active">Active</Label>
              </div>
            </div>
            <div className="space-y-1">
              <Label>Notes</Label>
              <Textarea
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                rows={2}
              />
            </div>
            <div className="flex gap-2">
              <Button onClick={save}>Save</Button>
              <Button variant="outline" onClick={() => setShowForm(false)}>
                Cancel
              </Button>
            </div>
          </Card>
        )}
      </div>
    </Layout>
  );
}
