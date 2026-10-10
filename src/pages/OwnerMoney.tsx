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
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, DollarSign, Download, RefreshCw, Search, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { CashFlowChart, type CashFlowPoint } from '@/components/owner/CashFlowChart';
import { AgingChart, type AgingBucket } from '@/components/owner/AgingChart';

interface Obligation {
  id: string;
  company_id: string;
  direction: 'receivable' | 'payable';
  kind: string;
  counterparty_name: string;
  description: string | null;
  amount: number;
  due_date: string | null;
  status: string;
  recurrence: string;
  property_unit_id: string | null;
  notes: string | null;
}

interface Payment {
  id: string;
  obligation_id: string;
  amount: number;
  paid_on: string;
  method: string | null;
  reference: string | null;
}

const KINDS = ['rent', 'loan', 'invoice', 'draw', 'other'];
const RECURRENCES = ['one_time', 'monthly', 'quarterly', 'annual'];

const money = (n: number) =>
  (Number(n) || 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const today = () => localDateISO();

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return localDateISO(d);
}

function addDays(iso: string, days: number) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return localDateISO(d);
}

function daysBetween(a: string, b: string) {
  return Math.round((new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / 86400000);
}

function monthKey(iso: string) {
  return iso.slice(0, 7);
}

function monthLabel(key: string) {
  const [y, m] = key.split('-');
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
}

function emptyObligation(companyId: string, direction: 'receivable' | 'payable'): Obligation {
  return {
    id: '',
    company_id: companyId,
    direction,
    kind: 'rent',
    counterparty_name: '',
    description: '',
    amount: 0,
    due_date: today(),
    status: 'open',
    recurrence: 'one_time',
    property_unit_id: null,
    notes: '',
  };
}

function KpiCard({
  label,
  value,
  delta,
  hint,
  accent,
}: {
  label: string;
  value: string;
  delta?: number | null;
  hint?: string;
  accent?: 'good' | 'bad' | 'warn';
}) {
  const accentClass =
    accent === 'good' ? 'text-green-500' : accent === 'bad' ? 'text-red-500' : accent === 'warn' ? 'text-yellow-500' : '';
  return (
    <Card className="p-4 animate-fade-in">
      <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className={`text-xl font-display font-bold mt-1 tabular-nums ${accentClass}`}>{value}</p>
      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
        {delta !== undefined && delta !== null && Number.isFinite(delta) && (
          <span className={`inline-flex items-center gap-0.5 ${delta >= 0 ? 'text-green-500' : 'text-red-500'}`}>
            {delta >= 0 ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
            {Math.abs(delta).toFixed(0)}%
          </span>
        )}
        {hint && <span className="truncate">{hint}</span>}
      </div>
    </Card>
  );
}

export default function OwnerMoney() {
  const { companies, selectedIds } = useCompanies();
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(isoDaysAgo(90));
  const [to, setTo] = useState(today());
  const [form, setForm] = useState<Obligation | null>(null);
  const [payFor, setPayFor] = useState<Obligation | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(today());
  const [payMethod, setPayMethod] = useState('');

  // ledger controls
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [companyFilter, setCompanyFilter] = useState('all');
  const [sortBy, setSortBy] = useState('due_asc');

  const load = useCallback(async () => {
    if (selectedIds.length === 0) {
      setObligations([]);
      setPayments([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data: obs } = await supabase
      .from('company_obligations')
      .select('*')
      .in('company_id', selectedIds)
      .order('due_date');
    const list = ((obs as any) || []) as Obligation[];
    setObligations(list);
    if (list.length) {
      const { data: pays } = await supabase
        .from('obligation_payments')
        .select('*')
        .in('obligation_id', list.map((o) => o.id));
      setPayments(((pays as any) || []) as Payment[]);
    } else {
      setPayments([]);
    }
    setLoading(false);
  }, [selectedIds]);

  useEffect(() => {
    load();
  }, [load]);

  const paidByObligation = useMemo(() => {
    const map: Record<string, number> = {};
    payments.forEach((p) => {
      map[p.obligation_id] = (map[p.obligation_id] || 0) + Number(p.amount || 0);
    });
    return map;
  }, [payments]);

  const balanceOf = useCallback(
    (o: Obligation) => Math.max(Number(o.amount || 0) - (paidByObligation[o.id] || 0), 0),
    [paidByObligation],
  );

  const obById = useMemo(() => {
    const map: Record<string, Obligation> = {};
    obligations.forEach((o) => {
      map[o.id] = o;
    });
    return map;
  }, [obligations]);

  const stats = useMemo(() => {
    const span = Math.max(daysBetween(from, to), 1);
    const prevFrom = addDays(from, -span - 1);
    const prevTo = addDays(from, -1);

    const sumFor = (a: string, b: string, direction: 'receivable' | 'payable') =>
      payments
        .filter((p) => p.paid_on >= a && p.paid_on <= b && obById[p.obligation_id]?.direction === direction)
        .reduce((s, p) => s + Number(p.amount || 0), 0);

    const revenue = sumFor(from, to, 'receivable');
    const spend = sumFor(from, to, 'payable');
    const prevRevenue = sumFor(prevFrom, prevTo, 'receivable');
    const prevSpend = sumFor(prevFrom, prevTo, 'payable');

    const owedToUs = obligations.filter((o) => o.direction === 'receivable').reduce((s, o) => s + balanceOf(o), 0);
    const owedByUs = obligations.filter((o) => o.direction === 'payable').reduce((s, o) => s + balanceOf(o), 0);

    const t = today();
    const overdue = obligations
      .filter((o) => o.direction === 'receivable' && o.due_date && o.due_date < t && balanceOf(o) > 0)
      .reduce((s, o) => s + balanceOf(o), 0);
    const overdueCount = obligations.filter(
      (o) => o.direction === 'receivable' && o.due_date && o.due_date < t && balanceOf(o) > 0,
    ).length;

    const next30 = addDays(t, 30);
    const dueSoon = obligations
      .filter((o) => o.due_date && o.due_date >= t && o.due_date <= next30 && balanceOf(o) > 0)
      .reduce((s, o) => s + (o.direction === 'receivable' ? balanceOf(o) : -balanceOf(o)), 0);

    const billed = obligations
      .filter((o) => o.direction === 'receivable')
      .reduce((s, o) => s + Number(o.amount || 0), 0);
    const collectedAll = obligations
      .filter((o) => o.direction === 'receivable')
      .reduce((s, o) => s + (paidByObligation[o.id] || 0), 0);
    const collectionRate = billed > 0 ? (collectedAll / billed) * 100 : 0;

    const pct = (cur: number, prev: number) => (prev > 0 ? ((cur - prev) / prev) * 100 : null);

    return {
      revenue,
      spend,
      net: revenue - spend,
      owedToUs,
      owedByUs,
      overdue,
      overdueCount,
      dueSoon,
      collectionRate,
      revenueDelta: pct(revenue, prevRevenue),
      spendDelta: pct(spend, prevSpend),
      netPosition: owedToUs - owedByUs,
    };
  }, [obligations, payments, obById, paidByObligation, balanceOf, from, to]);

  const cashFlow = useMemo<CashFlowPoint[]>(() => {
    const buckets: Record<string, CashFlowPoint> = {};
    payments
      .filter((p) => p.paid_on >= from && p.paid_on <= to)
      .forEach((p) => {
        const key = monthKey(p.paid_on);
        buckets[key] = buckets[key] || { month: monthLabel(key), collected: 0, paid: 0, net: 0 };
        const dir = obById[p.obligation_id]?.direction;
        const amt = Number(p.amount || 0);
        if (dir === 'receivable') buckets[key].collected += amt;
        else if (dir === 'payable') buckets[key].paid += amt;
        buckets[key].net = buckets[key].collected - buckets[key].paid;
      });
    return Object.keys(buckets)
      .sort()
      .map((k) => buckets[k]);
  }, [payments, obById, from, to]);

  const aging = useMemo<AgingBucket[]>(() => {
    const t = today();
    const rows: AgingBucket[] = [
      { bucket: 'Not due', amount: 0, tone: 'ok' },
      { bucket: '1–30 days', amount: 0, tone: 'warn' },
      { bucket: '31–60 days', amount: 0, tone: 'warn' },
      { bucket: '60+ days', amount: 0, tone: 'bad' },
    ];
    obligations
      .filter((o) => o.direction === 'receivable' && balanceOf(o) > 0)
      .forEach((o) => {
        const bal = balanceOf(o);
        if (!o.due_date || o.due_date >= t) rows[0].amount += bal;
        else {
          const late = daysBetween(o.due_date, t);
          if (late <= 30) rows[1].amount += bal;
          else if (late <= 60) rows[2].amount += bal;
          else rows[3].amount += bal;
        }
      });
    return rows;
  }, [obligations, balanceOf]);

  const byCompany = useMemo(() => {
    return companies
      .filter((c) => selectedIds.includes(c.id))
      .map((c) => {
        const obs = obligations.filter((o) => o.company_id === c.id);
        const ids = new Set(obs.map((o) => o.id));
        const collected = payments
          .filter(
            (p) =>
              ids.has(p.obligation_id) &&
              p.paid_on >= from &&
              p.paid_on <= to &&
              obById[p.obligation_id]?.direction === 'receivable',
          )
          .reduce((s, p) => s + Number(p.amount || 0), 0);
        const outstanding = obs.filter((o) => o.direction === 'receivable').reduce((s, o) => s + balanceOf(o), 0);
        const owed = obs.filter((o) => o.direction === 'payable').reduce((s, o) => s + balanceOf(o), 0);
        return { company: c, collected, outstanding, owed, net: collected - owed };
      })
      .sort((a, b) => b.collected - a.collected);
  }, [companies, selectedIds, obligations, payments, obById, balanceOf, from, to]);

  const maxCollected = Math.max(...byCompany.map((r) => r.collected), 1);

  const topCounterparties = useMemo(() => {
    const map: Record<string, number> = {};
    obligations
      .filter((o) => o.direction === 'receivable')
      .forEach((o) => {
        const bal = balanceOf(o);
        if (bal > 0) map[o.counterparty_name] = (map[o.counterparty_name] || 0) + bal;
      });
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);
  }, [obligations, balanceOf]);

  const visibleRows = useCallback(
    (direction: 'receivable' | 'payable') => {
      const t = today();
      const q = search.trim().toLowerCase();
      let rows = obligations.filter((o) => o.direction === direction);
      if (q)
        rows = rows.filter(
          (o) =>
            o.counterparty_name.toLowerCase().includes(q) ||
            (o.description || '').toLowerCase().includes(q) ||
            o.kind.toLowerCase().includes(q),
        );
      if (kindFilter !== 'all') rows = rows.filter((o) => o.kind === kindFilter);
      if (companyFilter !== 'all') rows = rows.filter((o) => o.company_id === companyFilter);
      if (statusFilter !== 'all')
        rows = rows.filter((o) => {
          const bal = balanceOf(o);
          if (statusFilter === 'paid') return bal === 0;
          if (statusFilter === 'overdue') return bal > 0 && !!o.due_date && o.due_date < t;
          return bal > 0 && (!o.due_date || o.due_date >= t);
        });
      const sorted = [...rows];
      sorted.sort((a, b) => {
        switch (sortBy) {
          case 'due_desc':
            return (b.due_date || '').localeCompare(a.due_date || '');
          case 'amount_desc':
            return balanceOf(b) - balanceOf(a);
          case 'amount_asc':
            return balanceOf(a) - balanceOf(b);
          case 'name':
            return a.counterparty_name.localeCompare(b.counterparty_name);
          default:
            return (a.due_date || '9999').localeCompare(b.due_date || '9999');
        }
      });
      return sorted;
    },
    [obligations, search, kindFilter, companyFilter, statusFilter, sortBy, balanceOf],
  );

  const exportCsv = () => {
    const t = today();
    const header = ['Company', 'Direction', 'Type', 'Counterparty', 'Description', 'Amount', 'Paid', 'Balance', 'Due', 'Status'];
    const lines = obligations.map((o) => {
      const paid = paidByObligation[o.id] || 0;
      const bal = balanceOf(o);
      const status = bal === 0 ? 'paid' : o.due_date && o.due_date < t ? 'overdue' : 'open';
      return [
        companies.find((c) => c.id === o.company_id)?.name ?? '',
        o.direction,
        o.kind,
        o.counterparty_name,
        o.description ?? '',
        Number(o.amount || 0).toFixed(2),
        paid.toFixed(2),
        bal.toFixed(2),
        o.due_date ?? '',
        status,
      ]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(',');
    });
    const blob = new Blob([[header.join(','), ...lines].join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `owner-cockpit-${today()}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Ledger exported');
  };

  const saveObligation = async () => {
    if (!form) return;
    if (!form.counterparty_name.trim()) return toast.error('Who owes / is owed?');
    if (!form.company_id) return toast.error('Select a company');
    const { id, ...rest } = form;
    const { error } = id
      ? await supabase.from('company_obligations').update(rest).eq('id', id)
      : await supabase.from('company_obligations').insert(rest);
    if (error) return toast.error(error.message);
    toast.success(id ? 'Updated' : 'Added');
    setForm(null);
    load();
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from('company_obligations').delete().eq('id', id);
    if (error) return toast.error(error.message);
    load();
  };

  const recordPayment = async () => {
    if (!payFor) return;
    const amt = Number(payAmount);
    if (!amt || amt <= 0) return toast.error('Enter an amount');
    const { error } = await supabase.from('obligation_payments').insert({
      obligation_id: payFor.id,
      amount: amt,
      paid_on: payDate,
      method: payMethod || null,
    });
    if (error) return toast.error(error.message);
    const newPaid = (paidByObligation[payFor.id] || 0) + amt;
    const status = newPaid >= Number(payFor.amount) ? 'paid' : 'partial';
    await supabase.from('company_obligations').update({ status }).eq('id', payFor.id);
    toast.success('Payment recorded');
    setPayFor(null);
    setPayAmount('');
    setPayMethod('');
    load();
  };

  const renderList = (direction: 'receivable' | 'payable') => {
    if (loading)
      return (
        <div className="space-y-2">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-24 w-full" />
          ))}
        </div>
      );
    const rows = visibleRows(direction);
    if (rows.length === 0)
      return (
        <Card className="p-8 text-center">
          <p className="text-muted-foreground text-sm">Nothing matches the current filters.</p>
        </Card>
      );
    const t = today();
    return (
      <div className="space-y-2">
        {rows.map((o) => {
          const paid = paidByObligation[o.id] || 0;
          const total = Number(o.amount || 0);
          const balance = Math.max(total - paid, 0);
          const pct = total > 0 ? Math.min((paid / total) * 100, 100) : 0;
          const overdue = balance > 0 && o.due_date && o.due_date < t;
          const lateDays = overdue && o.due_date ? daysBetween(o.due_date, t) : 0;
          return (
            <Card key={o.id} className="p-4 hover:bg-muted/30 transition-colors">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-display font-semibold truncate">{o.counterparty_name}</h3>
                    <Badge variant="outline">{o.kind}</Badge>
                    <Badge variant="secondary">{companies.find((c) => c.id === o.company_id)?.name}</Badge>
                    {balance === 0 ? (
                      <span className="px-2 py-0.5 rounded text-xs bg-blue-500/15 text-blue-500">paid</span>
                    ) : overdue ? (
                      <span className="px-2 py-0.5 rounded text-xs bg-yellow-500/15 text-yellow-500">
                        {lateDays}d overdue
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded text-xs bg-green-500/15 text-green-500">open</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    {o.description || 'No description'} · due {o.due_date || '—'} · {o.recurrence.replace('_', ' ')}
                  </p>
                  <div className="mt-2 max-w-md">
                    <Progress value={pct} className="h-1.5" />
                    <p className="text-[11px] text-muted-foreground mt-1 tabular-nums">
                      {money(paid)} of {money(total)} paid · {pct.toFixed(0)}%
                    </p>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-display font-bold tabular-nums">{money(balance)}</p>
                  <p className="text-[11px] text-muted-foreground">balance</p>
                  <div className="flex gap-1 justify-end mt-2">
                    <Button
                      size="sm"
                      variant="outline"
                      title="Record payment"
                      onClick={() => {
                        setPayFor(o);
                        setPayAmount(String(balance.toFixed(2)));
                      }}
                    >
                      <DollarSign className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" title="Edit" onClick={() => setForm(o)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                    <Button size="sm" variant="outline" title="Delete" onClick={() => remove(o.id)}>
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    );
  };

  return (
    <Layout title="Owner Cockpit" subtitle="Revenue, what's owed to you, and what you owe — across every company">
      <Card className="p-4 flex flex-wrap items-end gap-3">
        <div>
          <Label className="text-xs">From</Label>
          <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-[160px]" />
        </div>
        <div>
          <Label className="text-xs">To</Label>
          <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-[160px]" />
        </div>
        <div className="flex gap-1">
          {[
            { label: '30d', days: 30 },
            { label: '90d', days: 90 },
            { label: 'YTD', days: -1 },
            { label: '12mo', days: 365 },
          ].map((r) => (
            <Button
              key={r.label}
              size="sm"
              variant="outline"
              onClick={() => {
                setTo(today());
                setFrom(r.days === -1 ? `${new Date().getFullYear()}-01-01` : isoDaysAgo(r.days));
              }}
            >
              {r.label}
            </Button>
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={`h-4 w-4 mr-1 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
          <Button size="sm" variant="outline" onClick={exportCsv}>
            <Download className="h-4 w-4 mr-1" /> Export CSV
          </Button>
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3 mt-4">
        <KpiCard
          label="Revenue collected"
          value={money(stats.revenue)}
          delta={stats.revenueDelta}
          hint="vs prior period"
          accent="good"
        />
        <KpiCard label="Paid out" value={money(stats.spend)} delta={stats.spendDelta} hint="vs prior period" />
        <KpiCard
          label="Net cash flow"
          value={money(stats.net)}
          accent={stats.net >= 0 ? 'good' : 'bad'}
          hint="in selected range"
        />
        <KpiCard label="Still owed to you" value={money(stats.owedToUs)} hint={`${stats.overdueCount} past due`} />
        <KpiCard label="You owe" value={money(stats.owedByUs)} hint="open payables" />
        <KpiCard
          label="Net position"
          value={money(stats.netPosition)}
          accent={stats.netPosition >= 0 ? 'good' : 'bad'}
          hint="receivables − payables"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-3">
        <Card className="p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Collection rate</p>
          <p className="text-xl font-display font-bold mt-1 tabular-nums">{stats.collectionRate.toFixed(1)}%</p>
          <Progress value={stats.collectionRate} className="h-1.5 mt-2" />
        </Card>
        <Card className="p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Past due (receivable)</p>
          <p className="text-xl font-display font-bold mt-1 tabular-nums text-yellow-500">{money(stats.overdue)}</p>
          <p className="text-xs text-muted-foreground mt-1">{stats.overdueCount} obligation(s) uncollected</p>
        </Card>
        <Card className="p-4">
          <p className="text-[11px] uppercase tracking-wide text-muted-foreground">Next 30 days (net)</p>
          <p
            className={`text-xl font-display font-bold mt-1 tabular-nums ${
              stats.dueSoon >= 0 ? 'text-green-500' : 'text-red-500'
            }`}
          >
            {money(stats.dueSoon)}
          </p>
          <p className="text-xs text-muted-foreground mt-1">expected in minus expected out</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
        <Card className="p-4">
          <h2 className="font-display text-lg mb-2">Cash flow by month</h2>
          {loading ? <Skeleton className="h-[240px] w-full" /> : <CashFlowChart data={cashFlow} />}
        </Card>
        <Card className="p-4">
          <h2 className="font-display text-lg mb-2">Receivables aging</h2>
          {loading ? <Skeleton className="h-[240px] w-full" /> : <AgingChart data={aging} />}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-3">
        <Card className="p-4 lg:col-span-2 overflow-x-auto">
          <h2 className="font-display text-lg mb-2">By company</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-1">Company</th>
                <th className="py-1">Collected (range)</th>
                <th className="py-1 text-right">Owed to you</th>
                <th className="py-1 text-right">You owe</th>
              </tr>
            </thead>
            <tbody>
              {byCompany.map((r) => (
                <tr key={r.company.id} className="border-t border-border/50">
                  <td className="py-2 pr-3 whitespace-nowrap">{r.company.name}</td>
                  <td className="py-2 pr-3 min-w-[180px]">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 rounded-full bg-muted overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${(r.collected / maxCollected) * 100}%` }}
                        />
                      </div>
                      <span className="tabular-nums text-xs">{money(r.collected)}</span>
                    </div>
                  </td>
                  <td className="py-2 text-right tabular-nums">{money(r.outstanding)}</td>
                  <td className="py-2 text-right tabular-nums">{money(r.owed)}</td>
                </tr>
              ))}
              {byCompany.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-4 text-muted-foreground text-sm">
                    Select at least one company in the header.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </Card>
        <Card className="p-4">
          <h2 className="font-display text-lg mb-2">Top outstanding</h2>
          {topCounterparties.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing outstanding.</p>
          ) : (
            <div className="space-y-2">
              {topCounterparties.map(([name, amt]) => (
                <div key={name} className="flex items-center justify-between gap-2 text-sm">
                  <span className="truncate">{name}</span>
                  <span className="tabular-nums font-medium">{money(amt)}</span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {payFor && (
        <Card className="p-6 space-y-4 mt-4">
          <h2 className="font-display text-lg">Record payment — {payFor.counterparty_name}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Amount</Label>
              <Input type="number" step="0.001" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
            </div>
            <div>
              <Label>Method</Label>
              <Input value={payMethod} placeholder="Check, ACH, Zelle..." onChange={(e) => setPayMethod(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPayFor(null)}>
              Cancel
            </Button>
            <Button onClick={recordPayment}>Save payment</Button>
          </div>
        </Card>
      )}

      {form && (
        <Card className="p-6 space-y-4 mt-4">
          <h2 className="font-display text-lg">{form.id ? 'Edit entry' : 'New entry'}</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label>Company</Label>
              <Select value={form.company_id} onValueChange={(v) => setForm({ ...form, company_id: v })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select company" />
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
            <div>
              <Label>Direction</Label>
              <Select
                value={form.direction}
                onValueChange={(v) => setForm({ ...form, direction: v as Obligation['direction'] })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="receivable">Owed to us</SelectItem>
                  <SelectItem value="payable">We owe</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Type</Label>
              <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {KINDS.map((k) => (
                    <SelectItem key={k} value={k}>
                      {k}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Counterparty</Label>
              <Input
                value={form.counterparty_name}
                onChange={(e) => setForm({ ...form, counterparty_name: e.target.value })}
              />
            </div>
            <div>
              <Label>Amount</Label>
              <Input
                type="number"
                step="0.001"
                value={form.amount}
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
              />
            </div>
            <div>
              <Label>Due date</Label>
              <Input
                type="date"
                value={form.due_date ?? ''}
                onChange={(e) => setForm({ ...form, due_date: e.target.value || null })}
              />
            </div>
            <div>
              <Label>Recurrence</Label>
              <Select value={form.recurrence} onValueChange={(v) => setForm({ ...form, recurrence: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RECURRENCES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r.replace('_', ' ')}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Description</Label>
              <Input
                value={form.description ?? ''}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setForm(null)}>
              Cancel
            </Button>
            <Button onClick={saveObligation}>{form.id ? 'Save' : 'Create'}</Button>
          </div>
        </Card>
      )}

      <Tabs defaultValue="receivable" className="mt-6">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <TabsList>
            <TabsTrigger value="receivable">Owed to you</TabsTrigger>
            <TabsTrigger value="payable">You owe</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setForm(emptyObligation(selectedIds[0] || '', 'payable'))}>
              <Plus className="h-4 w-4 mr-1" /> Bill to pay
            </Button>
            <Button onClick={() => setForm(emptyObligation(selectedIds[0] || '', 'receivable'))}>
              <Plus className="h-4 w-4 mr-1" /> Money owed to you
            </Button>
          </div>
        </div>

        <Card className="p-3 mt-3 flex flex-wrap items-center gap-2">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search counterparty, description, type..."
              className="pl-8"
            />
          </div>
          <Select value={companyFilter} onValueChange={setCompanyFilter}>
            <SelectTrigger className="w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All companies</SelectItem>
              {companies
                .filter((c) => selectedIds.includes(c.id))
                .map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
            </SelectContent>
          </Select>
          <Select value={kindFilter} onValueChange={setKindFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              {KINDS.map((k) => (
                <SelectItem key={k} value={k}>
                  {k}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[130px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="paid">Paid</SelectItem>
            </SelectContent>
          </Select>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="due_asc">Due date ↑</SelectItem>
              <SelectItem value="due_desc">Due date ↓</SelectItem>
              <SelectItem value="amount_desc">Balance high → low</SelectItem>
              <SelectItem value="amount_asc">Balance low → high</SelectItem>
              <SelectItem value="name">Counterparty A–Z</SelectItem>
            </SelectContent>
          </Select>
        </Card>

        <TabsContent value="receivable" className="mt-4">
          {renderList('receivable')}
        </TabsContent>
        <TabsContent value="payable" className="mt-4">
          {renderList('payable')}
        </TabsContent>
      </Tabs>
    </Layout>
  );
}