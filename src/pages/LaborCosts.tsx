import { localDateISO } from '@/utils/dates';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useCompanies } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Trash2 } from 'lucide-react';

interface Employee {
  id: string;
  company_id: string | null;
  name: string;
  trade: string | null;
  hourly_rate: number | null;
  ot_multiplier: number;
  burden_percent: number;
  is_active: boolean;
}

interface TradeRate {
  id: string;
  company_id: string | null;
  trade: string;
  hourly_rate: number;
  ot_multiplier: number;
  burden_percent: number;
  is_active: boolean;
}

interface TimeEntry {
  id: string;
  project_id: string;
  employee_id: string | null;
  employee_name: string;
  trade: string | null;
  work_date: string;
  cost_code_id: string | null;
  regular_hours: number;
  overtime_hours: number;
  hourly_rate: number;
  ot_multiplier: number;
  burden_percent: number;
  total_cost: number;
  notes: string | null;
  source: string;
}

interface ProjectRef {
  id: string;
  name: string;
  company_id: string | null;
}

interface CostCodeRef {
  id: string;
  code: string;
  name: string;
}

const currency = (n: number) =>
  Number(n || 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const hours = (n: number) => Number(n || 0).toFixed(2);

const emptyEntry = {
  project_id: '',
  employee_id: '',
  work_date: localDateISO(),
  cost_code_id: '',
  regular_hours: '',
  overtime_hours: '',
  hourly_rate: '',
  ot_multiplier: '1.5',
  burden_percent: '0',
  notes: '',
};

export default function LaborCosts() {
  const { selectedIds } = useCompanies();
  const companyId = selectedIds.length === 1 ? selectedIds[0] : null;

  const [employees, setEmployees] = useState<Employee[]>([]);
  const [tradeRates, setTradeRates] = useState<TradeRate[]>([]);
  const [entries, setEntries] = useState<TimeEntry[]>([]);
  const [projects, setProjects] = useState<ProjectRef[]>([]);
  const [costCodes, setCostCodes] = useState<CostCodeRef[]>([]);
  const [busy, setBusy] = useState(false);

  const [form, setForm] = useState({ ...emptyEntry });
  const [filterProject, setFilterProject] = useState('all');
  const [newEmployee, setNewEmployee] = useState({ name: '', trade: '', hourly_rate: '', ot_multiplier: '1.5', burden_percent: '' });
  const [newRate, setNewRate] = useState({ trade: '', hourly_rate: '', ot_multiplier: '1.5', burden_percent: '' });

  const scoped = useCallback(
    (list: any[] | null) =>
      (list || []).filter((r) => !r.company_id || selectedIds.length === 0 || selectedIds.includes(r.company_id)),
    [selectedIds]
  );

  const load = useCallback(async () => {
    const [empRes, rateRes, projRes, codeRes] = await Promise.all([
      supabase.from('employees').select('*').eq('is_active', true).order('name'),
      supabase.from('trade_rates').select('*').eq('is_active', true).order('trade'),
      supabase.from('projects').select('id, name, company_id').is('archived_at', null).order('name'),
      supabase.from('cost_codes').select('id, code, name, company_id').eq('is_active', true).order('code'),
    ]);
    const projectList = scoped(projRes.data) as ProjectRef[];
    setEmployees(scoped(empRes.data) as Employee[]);
    setTradeRates(scoped(rateRes.data) as TradeRate[]);
    setProjects(projectList);
    setCostCodes(scoped(codeRes.data) as CostCodeRef[]);

    const projectIds = projectList.map((p) => p.id);
    if (projectIds.length) {
      const { data } = await supabase
        .from('time_entries')
        .select('*')
        .in('project_id', projectIds)
        .order('work_date', { ascending: false })
        .limit(500);
      setEntries((data || []) as TimeEntry[]);
    } else {
      setEntries([]);
    }
  }, [scoped]);

  useEffect(() => {
    load();
  }, [load]);

  // pull rate/burden defaults when a person is picked
  const pickEmployee = (id: string) => {
    const emp = employees.find((e) => e.id === id);
    const fallback = emp?.trade ? tradeRates.find((r) => r.trade.toLowerCase() === emp.trade!.toLowerCase()) : undefined;
    setForm((f) => ({
      ...f,
      employee_id: id,
      hourly_rate: String(emp?.hourly_rate ?? fallback?.hourly_rate ?? ''),
      ot_multiplier: String(emp?.ot_multiplier ?? fallback?.ot_multiplier ?? 1.5),
      burden_percent: String(emp?.burden_percent ?? fallback?.burden_percent ?? 0),
    }));
  };

  const previewCost = useMemo(() => {
    const rate = parseFloat(form.hourly_rate) || 0;
    const reg = parseFloat(form.regular_hours) || 0;
    const ot = parseFloat(form.overtime_hours) || 0;
    const mult = parseFloat(form.ot_multiplier) || 1.5;
    const burden = parseFloat(form.burden_percent) || 0;
    return (reg * rate + ot * rate * mult) * (1 + burden / 100);
  }, [form]);

  const saveEntry = async () => {
    if (!form.project_id) return toast.error('Pick a job for these hours.');
    if (!form.employee_id) return toast.error('Pick who worked.');
    const emp = employees.find((e) => e.id === form.employee_id);
    setBusy(true);
    const { error } = await supabase.from('time_entries').insert({
      project_id: form.project_id,
      employee_id: form.employee_id,
      employee_name: emp?.name || 'Employee',
      trade: emp?.trade || null,
      work_date: form.work_date,
      cost_code_id: form.cost_code_id || null,
      regular_hours: parseFloat(form.regular_hours) || 0,
      overtime_hours: parseFloat(form.overtime_hours) || 0,
      hourly_rate: parseFloat(form.hourly_rate) || 0,
      ot_multiplier: parseFloat(form.ot_multiplier) || 1.5,
      burden_percent: parseFloat(form.burden_percent) || 0,
      notes: form.notes || null,
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success('Hours added.');
    setForm({ ...emptyEntry, project_id: form.project_id, work_date: form.work_date });
    load();
  };

  const deleteEntry = async (id: string) => {
    const { error } = await supabase.from('time_entries').delete().eq('id', id);
    if (error) return toast.error(error.message);
    load();
  };

  const addEmployee = async () => {
    if (!newEmployee.name.trim()) return toast.error('Enter a name.');
    const { error } = await supabase.from('employees').insert({
      company_id: companyId,
      name: newEmployee.name.trim(),
      trade: newEmployee.trade.trim() || null,
      hourly_rate: newEmployee.hourly_rate ? parseFloat(newEmployee.hourly_rate) : null,
      ot_multiplier: parseFloat(newEmployee.ot_multiplier) || 1.5,
      burden_percent: parseFloat(newEmployee.burden_percent) || 0,
    });
    if (error) return toast.error(error.message);
    setNewEmployee({ name: '', trade: '', hourly_rate: '', ot_multiplier: '1.5', burden_percent: '' });
    load();
  };

  const updateEmployee = async (id: string, patch: Partial<Employee>) => {
    const { error } = await supabase.from('employees').update(patch).eq('id', id);
    if (error) return toast.error(error.message);
    setEmployees((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } as Employee : e)));
  };

  const removeEmployee = async (id: string) => {
    const { error } = await supabase.from('employees').update({ is_active: false }).eq('id', id);
    if (error) return toast.error(error.message);
    load();
  };

  const addTradeRate = async () => {
    if (!newRate.trade.trim()) return toast.error('Enter a trade.');
    const { error } = await supabase.from('trade_rates').insert({
      company_id: companyId,
      trade: newRate.trade.trim(),
      hourly_rate: parseFloat(newRate.hourly_rate) || 0,
      ot_multiplier: parseFloat(newRate.ot_multiplier) || 1.5,
      burden_percent: parseFloat(newRate.burden_percent) || 0,
    });
    if (error) return toast.error(error.message);
    setNewRate({ trade: '', hourly_rate: '', ot_multiplier: '1.5', burden_percent: '' });
    load();
  };

  const updateTradeRate = async (id: string, patch: Partial<TradeRate>) => {
    const { error } = await supabase.from('trade_rates').update(patch).eq('id', id);
    if (error) return toast.error(error.message);
    setTradeRates((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } as TradeRate : r)));
  };

  const removeTradeRate = async (id: string) => {
    const { error } = await supabase.from('trade_rates').update({ is_active: false }).eq('id', id);
    if (error) return toast.error(error.message);
    load();
  };

  const visibleEntries = useMemo(
    () => (filterProject === 'all' ? entries : entries.filter((e) => e.project_id === filterProject)),
    [entries, filterProject]
  );

  const totals = useMemo(() => {
    const regular = visibleEntries.reduce((s, e) => s + Number(e.regular_hours), 0);
    const overtime = visibleEntries.reduce((s, e) => s + Number(e.overtime_hours), 0);
    const cost = visibleEntries.reduce((s, e) => s + Number(e.total_cost), 0);
    return { regular, overtime, cost, avg: regular + overtime ? cost / (regular + overtime) : 0 };
  }, [visibleEntries]);

  const byJob = useMemo(() => {
    const map = new Map<string, { name: string; regular: number; overtime: number; cost: number }>();
    entries.forEach((e) => {
      const name = projects.find((p) => p.id === e.project_id)?.name || 'Unknown job';
      const row = map.get(e.project_id) || { name, regular: 0, overtime: 0, cost: 0 };
      row.regular += Number(e.regular_hours);
      row.overtime += Number(e.overtime_hours);
      row.cost += Number(e.total_cost);
      map.set(e.project_id, row);
    });
    return [...map.values()].sort((a, b) => b.cost - a.cost);
  }, [entries, projects]);

  const projectName = (id: string) => projects.find((p) => p.id === id)?.name || '—';
  const codeLabel = (id: string | null) => {
    const c = costCodes.find((x) => x.id === id);
    return c ? `${c.code} · ${c.name}` : '—';
  };

  return (
    <Layout title="Labor Costs">
      <div className="space-y-6 p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Labor Costs</h1>
          <p className="text-sm text-muted-foreground">
            Log crew hours against jobs and cost codes. Rates and burden are applied automatically.
          </p>
        </div>

        <Card className="grid grid-cols-2 gap-4 p-6 md:grid-cols-4">
          <Stat label="Regular hours" value={hours(totals.regular)} />
          <Stat label="Overtime hours" value={hours(totals.overtime)} />
          <Stat label="Burdened labor cost" value={currency(totals.cost)} />
          <Stat label="Average cost / hour" value={currency(totals.avg)} />
        </Card>

        <Tabs defaultValue="time">
          <TabsList>
            <TabsTrigger value="time">Time</TabsTrigger>
            <TabsTrigger value="jobs">By Job</TabsTrigger>
            <TabsTrigger value="people">People</TabsTrigger>
            <TabsTrigger value="rates">Trade Rates</TabsTrigger>
          </TabsList>

          <TabsContent value="time" className="space-y-4 pt-4">
            <Card className="space-y-4 p-6">
              <div className="grid gap-4 md:grid-cols-4">
                <div>
                  <Label>Job</Label>
                  <Select value={form.project_id} onValueChange={(v) => setForm({ ...form, project_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pick a job" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((p) => (
                        <SelectItem key={p.id} value={p.id}>
                          {p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Who worked</Label>
                  <Select value={form.employee_id} onValueChange={pickEmployee}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pick a person" />
                    </SelectTrigger>
                    <SelectContent>
                      {employees.map((e) => (
                        <SelectItem key={e.id} value={e.id}>
                          {e.name}
                          {e.trade ? ` · ${e.trade}` : ''}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Date</Label>
                  <Input type="date" value={form.work_date} onChange={(e) => setForm({ ...form, work_date: e.target.value })} />
                </div>
                <div>
                  <Label>Cost code</Label>
                  <Select value={form.cost_code_id || 'none'} onValueChange={(v) => setForm({ ...form, cost_code_id: v === 'none' ? '' : v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Optional" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {costCodes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.code} · {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-6">
                <div>
                  <Label>Regular hours</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={form.regular_hours}
                    onChange={(e) => setForm({ ...form, regular_hours: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Overtime hours</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={form.overtime_hours}
                    onChange={(e) => setForm({ ...form, overtime_hours: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Rate / hour</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={form.hourly_rate}
                    onChange={(e) => setForm({ ...form, hourly_rate: e.target.value })}
                  />
                </div>
                <div>
                  <Label>OT multiplier</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={form.ot_multiplier}
                    onChange={(e) => setForm({ ...form, ot_multiplier: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Burden %</Label>
                  <Input
                    type="number"
                    step="0.001"
                    value={form.burden_percent}
                    onChange={(e) => setForm({ ...form, burden_percent: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Notes</Label>
                  <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="text-sm text-muted-foreground">
                  This entry costs <span className="font-semibold text-foreground">{currency(previewCost)}</span> with burden.
                </div>
                <Button onClick={saveEntry} disabled={busy}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add hours
                </Button>
              </div>
            </Card>

            <div className="flex items-center gap-3">
              <Label className="text-xs uppercase text-muted-foreground">Job</Label>
              <Select value={filterProject} onValueChange={setFilterProject}>
                <SelectTrigger className="w-64">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All jobs</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-3 text-left">Date</th>
                    <th className="p-3 text-left">Person</th>
                    <th className="p-3 text-left">Job</th>
                    <th className="p-3 text-left">Cost code</th>
                    <th className="p-3 text-right">Reg</th>
                    <th className="p-3 text-right">OT</th>
                    <th className="p-3 text-right">Rate</th>
                    <th className="p-3 text-right">Burden</th>
                    <th className="p-3 text-right">Cost</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {visibleEntries.map((e) => (
                    <tr key={e.id} className="border-t border-border">
                      <td className="whitespace-nowrap p-3">{e.work_date}</td>
                      <td className="p-3">
                        <div className="font-medium">{e.employee_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {e.trade || '—'}
                          {e.source !== 'manual' && ' · imported'}
                        </div>
                      </td>
                      <td className="p-3">{projectName(e.project_id)}</td>
                      <td className="p-3 text-muted-foreground">{codeLabel(e.cost_code_id)}</td>
                      <td className="p-3 text-right tabular-nums">{hours(e.regular_hours)}</td>
                      <td className="p-3 text-right tabular-nums">{hours(e.overtime_hours)}</td>
                      <td className="p-3 text-right tabular-nums">{currency(e.hourly_rate)}</td>
                      <td className="p-3 text-right tabular-nums">{Number(e.burden_percent).toFixed(2)}%</td>
                      <td className="p-3 text-right font-medium tabular-nums">{currency(e.total_cost)}</td>
                      <td className="p-3 text-right">
                        <Button variant="ghost" size="sm" onClick={() => deleteEntry(e.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {!visibleEntries.length && (
                    <tr>
                      <td className="p-6 text-center text-muted-foreground" colSpan={10}>
                        No hours logged yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>
          </TabsContent>

          <TabsContent value="jobs" className="pt-4">
            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-3 text-left">Job</th>
                    <th className="p-3 text-right">Regular hours</th>
                    <th className="p-3 text-right">Overtime hours</th>
                    <th className="p-3 text-right">Labor cost</th>
                  </tr>
                </thead>
                <tbody>
                  {byJob.map((row) => (
                    <tr key={row.name} className="border-t border-border">
                      <td className="p-3 font-medium">{row.name}</td>
                      <td className="p-3 text-right tabular-nums">{hours(row.regular)}</td>
                      <td className="p-3 text-right tabular-nums">{hours(row.overtime)}</td>
                      <td className="p-3 text-right font-medium tabular-nums">{currency(row.cost)}</td>
                    </tr>
                  ))}
                  {!byJob.length && (
                    <tr>
                      <td className="p-6 text-center text-muted-foreground" colSpan={4}>
                        Nothing to total yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>
          </TabsContent>

          <TabsContent value="people" className="space-y-4 pt-4">
            <Card className="flex flex-wrap items-end gap-3 p-6">
              <div className="w-48">
                <Label>Name</Label>
                <Input value={newEmployee.name} onChange={(e) => setNewEmployee({ ...newEmployee, name: e.target.value })} />
              </div>
              <div className="w-40">
                <Label>Trade</Label>
                <Input value={newEmployee.trade} onChange={(e) => setNewEmployee({ ...newEmployee, trade: e.target.value })} />
              </div>
              <div className="w-32">
                <Label>Rate / hour</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={newEmployee.hourly_rate}
                  onChange={(e) => setNewEmployee({ ...newEmployee, hourly_rate: e.target.value })}
                />
              </div>
              <div className="w-28">
                <Label>OT ×</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={newEmployee.ot_multiplier}
                  onChange={(e) => setNewEmployee({ ...newEmployee, ot_multiplier: e.target.value })}
                />
              </div>
              <div className="w-28">
                <Label>Burden %</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={newEmployee.burden_percent}
                  onChange={(e) => setNewEmployee({ ...newEmployee, burden_percent: e.target.value })}
                />
              </div>
              <Button onClick={addEmployee}>
                <Plus className="mr-2 h-4 w-4" />
                Add person
              </Button>
            </Card>

            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-3 text-left">Name</th>
                    <th className="p-3 text-left">Trade</th>
                    <th className="p-3 text-right">Rate</th>
                    <th className="p-3 text-right">OT ×</th>
                    <th className="p-3 text-right">Burden %</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {employees.map((e) => (
                    <tr key={e.id} className="border-t border-border">
                      <td className="p-3 font-medium">{e.name}</td>
                      <td className="p-3 text-muted-foreground">{e.trade || '—'}</td>
                      <td className="p-3 text-right">
                        <Input
                          className="ml-auto w-28 text-right"
                          type="number"
                          step="0.001"
                          defaultValue={e.hourly_rate ?? ''}
                          onBlur={(ev) => updateEmployee(e.id, { hourly_rate: parseFloat(ev.target.value) || 0 })}
                        />
                      </td>
                      <td className="p-3 text-right">
                        <Input
                          className="ml-auto w-24 text-right"
                          type="number"
                          step="0.001"
                          defaultValue={e.ot_multiplier}
                          onBlur={(ev) => updateEmployee(e.id, { ot_multiplier: parseFloat(ev.target.value) || 1.5 })}
                        />
                      </td>
                      <td className="p-3 text-right">
                        <Input
                          className="ml-auto w-24 text-right"
                          type="number"
                          step="0.001"
                          defaultValue={e.burden_percent}
                          onBlur={(ev) => updateEmployee(e.id, { burden_percent: parseFloat(ev.target.value) || 0 })}
                        />
                      </td>
                      <td className="p-3 text-right">
                        <Button variant="ghost" size="sm" onClick={() => removeEmployee(e.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {!employees.length && (
                    <tr>
                      <td className="p-6 text-center text-muted-foreground" colSpan={6}>
                        No people yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>
          </TabsContent>

          <TabsContent value="rates" className="space-y-4 pt-4">
            <Card className="flex flex-wrap items-end gap-3 p-6">
              <div className="w-48">
                <Label>Trade</Label>
                <Input value={newRate.trade} onChange={(e) => setNewRate({ ...newRate, trade: e.target.value })} />
              </div>
              <div className="w-32">
                <Label>Rate / hour</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={newRate.hourly_rate}
                  onChange={(e) => setNewRate({ ...newRate, hourly_rate: e.target.value })}
                />
              </div>
              <div className="w-28">
                <Label>OT ×</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={newRate.ot_multiplier}
                  onChange={(e) => setNewRate({ ...newRate, ot_multiplier: e.target.value })}
                />
              </div>
              <div className="w-28">
                <Label>Burden %</Label>
                <Input
                  type="number"
                  step="0.001"
                  value={newRate.burden_percent}
                  onChange={(e) => setNewRate({ ...newRate, burden_percent: e.target.value })}
                />
              </div>
              <Button onClick={addTradeRate}>
                <Plus className="mr-2 h-4 w-4" />
                Add rate
              </Button>
              <Badge variant="secondary">Used when a person has no rate of their own</Badge>
            </Card>

            <Card className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50 text-xs uppercase text-muted-foreground">
                  <tr>
                    <th className="p-3 text-left">Trade</th>
                    <th className="p-3 text-right">Rate</th>
                    <th className="p-3 text-right">OT ×</th>
                    <th className="p-3 text-right">Burden %</th>
                    <th className="p-3" />
                  </tr>
                </thead>
                <tbody>
                  {tradeRates.map((r) => (
                    <tr key={r.id} className="border-t border-border">
                      <td className="p-3 font-medium">{r.trade}</td>
                      <td className="p-3 text-right">
                        <Input
                          className="ml-auto w-28 text-right"
                          type="number"
                          step="0.001"
                          defaultValue={r.hourly_rate}
                          onBlur={(ev) => updateTradeRate(r.id, { hourly_rate: parseFloat(ev.target.value) || 0 })}
                        />
                      </td>
                      <td className="p-3 text-right">
                        <Input
                          className="ml-auto w-24 text-right"
                          type="number"
                          step="0.001"
                          defaultValue={r.ot_multiplier}
                          onBlur={(ev) => updateTradeRate(r.id, { ot_multiplier: parseFloat(ev.target.value) || 1.5 })}
                        />
                      </td>
                      <td className="p-3 text-right">
                        <Input
                          className="ml-auto w-24 text-right"
                          type="number"
                          step="0.001"
                          defaultValue={r.burden_percent}
                          onBlur={(ev) => updateTradeRate(r.id, { burden_percent: parseFloat(ev.target.value) || 0 })}
                        />
                      </td>
                      <td className="p-3 text-right">
                        <Button variant="ghost" size="sm" onClick={() => removeTradeRate(r.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                  {!tradeRates.length && (
                    <tr>
                      <td className="p-6 text-center text-muted-foreground" colSpan={5}>
                        No trade rates yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-xs uppercase text-muted-foreground">{label}</div>
      <div className="text-lg font-semibold tabular-nums">{value}</div>
    </div>
  );
}
