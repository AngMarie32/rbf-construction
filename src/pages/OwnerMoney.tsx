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
import { Plus, Pencil, Trash2, DollarSign, Download, RefreshCw, Search, ArrowUpRight, ArrowDownLeft, Wallet, AlertTriangle, CalendarClock, Percent, Building2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { PageHero, heroButton, heroButtonPrimary } from '@/components/ui/page-hero';
import { AccentStat } from '@/components/ui/accent-stat';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { EmptyState } from '@/components/ui/empty-state';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
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

const money0 = (n: number) =>
  (Number(n) || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

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
  const [confirmDelete, setConfirmDelete] = useState<Obligation | null>(null);
  const [jobsOwed, setJobsOwed] = useState(0);

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
    // Construction jobs: billed but not yet paid (from Billing), for the selected companies.
    const { data: jobs } = await supabase
      .from('projects')
      .select('id')
      .is('archived_at', null)
      .or(`company_id.in.(${selectedIds.join(',')}),company_id.is.null`);
    const jobIds = (jobs || []).map((j) => j.id);
    if (jobIds.length) {
      const { data: bills } = await supabase.from('project_billing').select('billed_amount, paid_amount').in('project_id', jobIds);
      setJobsOwed(Math.max(0, (bills || []).reduce((acc, b) => acc + (Number(b.billed_amount) || 0) - (Number(b.paid_amount) || 0), 0)));
    } else {
      setJobsOwed(0);
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

  const companyName = (id: string) => companies.find((c) => c.id === id)?.name ?? '';
  const t0 = today();
  const statusOf = (o: Obligation) => {
    const bal = balanceOf(o);
    if (bal === 0) return { label: 'Paid', variant: 'success' as const, late: 0 };
    if (o.due_date && o.due_date < t0) return { label: `${daysBetween(o.due_date, t0)}d overdue`, variant: 'destructive' as const, late: daysBetween(o.due_date, t0) };
    return { label: 'Open', variant: 'info' as const, late: 0 };
  };

  const ledgerColumns = (direction: 'receivable' | 'payable'): DataTableColumn<Obligation>[] => [
    {
      id: 'who',
      header: direction === 'receivable' ? 'Who owes you' : 'Who you owe',
      value: (o) => o.counterparty_name,
      cell: (o) => (
        <div className="min-w-[180px]">
          <p className="font-semibold">{o.counterparty_name}</p>
          <p className="text-xs text-muted-foreground">
            <span className="capitalize">{o.kind}</span> · {companyName(o.company_id)}
            {o.recurrence !== 'one_time' && ` · ${o.recurrence.replace('_', ' ')}`}
          </p>
          {o.description && <p className="max-w-[280px] truncate text-xs text-muted-foreground">{o.description}</p>}
        </div>
      ),
    },
    { id: 'due', header: 'Due', value: (o) => o.due_date, cell: (o) => <span className="whitespace-nowrap">{o.due_date ? format(new Date(`${o.due_date}T00:00:00`), 'MMM d, yyyy') : '—'}</span> },
    { id: 'status', header: 'Status', value: (o) => statusOf(o).late || (balanceOf(o) === 0 ? -1 : 0), cell: (o) => <Badge variant={statusOf(o).variant} className="whitespace-nowrap">{statusOf(o).label}</Badge> },
    {
      id: 'paid',
      header: 'Paid',
      value: (o) => paidByObligation[o.id] || 0,
      cell: (o) => {
        const total = Number(o.amount || 0);
        const paid = paidByObligation[o.id] || 0;
        const pct = total > 0 ? Math.min((paid / total) * 100, 100) : 0;
        return (
          <div className="w-36">
            <div className="flex justify-between text-xs"><span className="tabular-nums">{money(paid)}</span><span className="text-muted-foreground">{pct.toFixed(0)}%</span></div>
            <Progress value={pct} className="mt-1 h-1.5" />
            <p className="mt-0.5 text-[11px] text-muted-foreground">of {money(total)}</p>
          </div>
        );
      },
    },
    { id: 'balance', header: 'Balance', align: 'right', value: (o) => balanceOf(o), cell: (o) => <span className="font-display text-base font-bold">{money(balanceOf(o))}</span> },
    {
      id: 'actions',
      header: '',
      align: 'right',
      cell: (o) => (
        <div className="flex justify-end gap-0.5">
          {balanceOf(o) > 0 && (
            <Button size="sm" variant="outline" onClick={() => { setPayFor(o); setPayAmount(balanceOf(o).toFixed(2)); setPayDate(today()); }}>
              <DollarSign className="h-3.5 w-3.5" /> {direction === 'receivable' ? 'Record payment' : 'Pay'}
            </Button>
          )}
          <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Edit" onClick={() => setForm(o)}><Pencil className="h-4 w-4" /></Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" aria-label="Delete" onClick={() => setConfirmDelete(o)}><Trash2 className="h-4 w-4" /></Button>
        </div>
      ),
    },
  ];

  const ranges = [
    { label: '30 days', days: 30 },
    { label: '90 days', days: 90 },
    { label: 'Year to date', days: -1 },
    { label: '12 months', days: 365 },
  ];
  const rangeFrom = (days: number) => (days === -1 ? `${new Date().getFullYear()}-01-01` : isoDaysAgo(days));
  const activeRange = ranges.find((r) => to === today() && from === rangeFrom(r.days))?.label;

  const receivableCount = obligations.filter((o) => o.direction === 'receivable' && balanceOf(o) > 0).length;
  const payableCount = obligations.filter((o) => o.direction === 'payable' && balanceOf(o) > 0).length;

  return (
    <Layout title="Owner Cockpit" hideTitle>
      <div className="space-y-6">
        <PageHero
          eyebrow="Owner Cockpit"
          title="Where the money stands"
          subtitle={`Across ${selectedIds.length} compan${selectedIds.length === 1 ? 'y' : 'ies'} · ${format(new Date(`${from}T00:00:00`), 'MMM d')} – ${format(new Date(`${to}T00:00:00`), 'MMM d, yyyy')}`}
          stats={[
            { label: 'Net position', value: loading ? '…' : money0(stats.netPosition + jobsOwed), tone: stats.netPosition + jobsOwed >= 0 ? 'good' : 'bad' },
            { label: 'Owed to you', value: loading ? '…' : money0(stats.owedToUs + jobsOwed) },
            { label: 'You owe', value: loading ? '…' : money0(stats.owedByUs) },
          ]}
          actions={
            <>
              <button type="button" className={heroButtonPrimary} onClick={() => setForm(emptyObligation(selectedIds[0] || '', 'receivable'))}>
                <Plus className="h-4 w-4" /> Money owed to you
              </button>
              <button type="button" className={heroButton} onClick={() => setForm(emptyObligation(selectedIds[0] || '', 'payable'))}>
                <Plus className="h-4 w-4" /> Bill to pay
              </button>
            </>
          }
        >
          <div className="flex flex-wrap items-center gap-2">
            {ranges.map((r) => (
              <button
                key={r.label}
                type="button"
                onClick={() => { setTo(today()); setFrom(rangeFrom(r.days)); }}
                className={cn('h-8 rounded-full px-3 text-xs font-medium ring-1 ring-inset transition-colors', activeRange === r.label ? 'bg-white text-slate-900 ring-white' : 'bg-white/10 text-white ring-white/15 hover:bg-white/20')}
              >
                {r.label}
              </button>
            ))}
            <span className="mx-1 h-5 w-px bg-white/20" />
            <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} aria-label="From" className="h-8 rounded-lg bg-white/10 px-2 text-xs text-white ring-1 ring-inset ring-white/15 [color-scheme:dark]" />
            <span className="text-xs text-white/50">to</span>
            <input type="date" value={to} onChange={(e) => setTo(e.target.value)} aria-label="To" className="h-8 rounded-lg bg-white/10 px-2 text-xs text-white ring-1 ring-inset ring-white/15 [color-scheme:dark]" />
            <div className="ml-auto flex gap-2">
              <button type="button" className={heroButton} onClick={load} disabled={loading}>
                <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /> Refresh
              </button>
              <button type="button" className={heroButton} onClick={exportCsv}>
                <Download className="h-4 w-4" /> Export CSV
              </button>
            </div>
          </div>
        </PageHero>

        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
          <AccentStat label="Collected" value={money0(stats.revenue)} delta={stats.revenueDelta} hint="vs prior period" icon={ArrowDownLeft} accent="emerald" loading={loading} />
          <AccentStat label="Paid out" value={money0(stats.spend)} delta={stats.spendDelta} hint="vs prior period" icon={ArrowUpRight} accent="orange" loading={loading} />
          <AccentStat label="Net cash flow" value={money0(stats.net)} hint="In this period" icon={Wallet} accent="blue" tone={stats.net >= 0 ? 'good' : 'bad'} loading={loading} />
          <AccentStat label="Past due to you" value={money0(stats.overdue)} hint={`${stats.overdueCount} overdue`} icon={AlertTriangle} accent="rose" tone={stats.overdue > 0 ? 'bad' : undefined} loading={loading} />
          <AccentStat label="Next 30 days" value={money0(stats.dueSoon)} hint="Expected in − expected out" icon={CalendarClock} accent="indigo" tone={stats.dueSoon >= 0 ? 'good' : 'bad'} loading={loading} />
          <AccentStat label="Collection rate" value={`${stats.collectionRate.toFixed(0)}%`} hint="Of everything billed" icon={Percent} accent="amber" loading={loading} />
        </div>

        {jobsOwed > 0 && (
          <Link to="/billing" className="flex flex-wrap items-center gap-3 rounded-xl border bg-card px-4 py-3 text-sm transition-colors hover:bg-muted/40">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400"><Building2 className="h-4 w-4" /></span>
            <span className="flex-1">
              <strong className="tabular-nums">{money0(jobsOwed)}</strong> is billed on your construction jobs but not yet paid. It's counted in "Owed to you" above.
            </span>
            <span className="font-medium text-primary">Open Billing →</span>
          </Link>
        )}

        <div className="grid gap-4 lg:grid-cols-2">
          <Card className="p-5">
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="font-semibold">Cash flow by month</h2>
              <span className="text-xs text-muted-foreground">Payments recorded in this period</span>
            </div>
            {loading ? <Skeleton className="h-[240px] w-full" /> : cashFlow.length === 0 ? <p className="py-16 text-center text-sm text-muted-foreground">No payments recorded in this period.</p> : <CashFlowChart data={cashFlow} />}
          </Card>
          <Card className="p-5">
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="font-semibold">Money owed to you, by age</h2>
              <span className="text-xs text-muted-foreground">Unpaid balances</span>
            </div>
            {loading ? <Skeleton className="h-[240px] w-full" /> : <AgingChart data={aging} />}
          </Card>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="p-5 lg:col-span-2">
            <h2 className="mb-3 font-semibold">By company</h2>
            {byCompany.length === 0 ? (
              <p className="py-6 text-sm text-muted-foreground">Choose at least one company in the top bar.</p>
            ) : (
              <div className="space-y-3">
                {byCompany.map((r) => (
                  <div key={r.company.id} className="grid grid-cols-[minmax(0,1fr)_auto_auto] items-center gap-x-6 gap-y-1 sm:grid-cols-[minmax(0,180px)_minmax(0,1fr)_110px_110px]">
                    <p className="truncate font-medium">{r.company.name}</p>
                    <div className="order-last col-span-3 flex items-center gap-2 sm:order-none sm:col-span-1">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(r.collected / maxCollected) * 100}%` }} />
                      </div>
                      <span className="w-24 text-right text-xs tabular-nums text-muted-foreground">{money0(r.collected)} in</span>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-muted-foreground">Owed to you</p>
                      <p className="text-sm font-semibold tabular-nums">{money0(r.outstanding)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[11px] text-muted-foreground">You owe</p>
                      <p className="text-sm font-semibold tabular-nums">{money0(r.owed)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
          <Card className="p-5">
            <h2 className="mb-3 font-semibold">Biggest balances owed to you</h2>
            {topCounterparties.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nothing outstanding.</p>
            ) : (
              <ol className="space-y-3">
                {topCounterparties.map(([name, amt], i) => {
                  const max = topCounterparties[0][1] || 1;
                  return (
                    <li key={name}>
                      <div className="flex items-center justify-between gap-2 text-sm">
                        <span className="flex min-w-0 items-center gap-2">
                          <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-muted text-[10px] font-bold">{i + 1}</span>
                          <span className="truncate">{name}</span>
                        </span>
                        <span className="font-semibold tabular-nums">{money0(amt)}</span>
                      </div>
                      <div className="mt-1 h-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-blue-600" style={{ width: `${(amt / max) * 100}%` }} />
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </Card>
        </div>

        {/* Ledger */}
        <Tabs defaultValue="receivable">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <TabsList>
              <TabsTrigger value="receivable">Owed to you{receivableCount ? ` (${receivableCount})` : ''}</TabsTrigger>
              <TabsTrigger value="payable">You owe{payableCount ? ` (${payableCount})` : ''}</TabsTrigger>
            </TabsList>
          </div>
          {(['receivable', 'payable'] as const).map((direction) => (
            <TabsContent key={direction} value={direction} className="mt-3">
              <DataTable
                columns={ledgerColumns(direction)}
                rows={visibleRows(direction)}
                totalCount={obligations.filter((o) => o.direction === direction).length}
                getRowId={(o) => o.id}
                loading={loading}
                searchable={false}
                exportFilename={direction === 'receivable' ? 'owed-to-you' : 'you-owe'}
                initialSort={{ id: 'due' }}
                filters={
                  <>
                    <div className="relative w-full sm:w-56">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                      <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search name, description…" className="pl-9" />
                    </div>
                    <Select value={companyFilter} onValueChange={setCompanyFilter}>
                      <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All companies</SelectItem>
                        {companies.filter((c) => selectedIds.includes(c.id)).map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={kindFilter} onValueChange={setKindFilter}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All types</SelectItem>
                        {KINDS.map((k) => <SelectItem key={k} value={k} className="capitalize">{k}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="overdue">Overdue</SelectItem>
                        <SelectItem value="paid">Paid</SelectItem>
                      </SelectContent>
                    </Select>
                  </>
                }
                empty={
                  <EmptyState
                    icon={direction === 'receivable' ? ArrowDownLeft : ArrowUpRight}
                    title={direction === 'receivable' ? 'Nothing owed to you yet' : 'No bills to pay yet'}
                    description={direction === 'receivable'
                      ? 'Track rent, loans you made, draws and invoices outside your construction jobs. Record payments as they come in.'
                      : 'Track loan payments, rent you pay and other bills across your companies so nothing is missed.'}
                    action={{ label: direction === 'receivable' ? 'Add money owed to you' : 'Add a bill to pay', onClick: () => setForm(emptyObligation(selectedIds[0] || '', direction)) }}
                  />
                }
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>

      {/* Record payment */}
      <Dialog open={!!payFor} onOpenChange={(o) => !o && setPayFor(null)}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{payFor?.direction === 'payable' ? 'Record a payment you made' : 'Record a payment received'}</DialogTitle>
            <DialogDescription>
              {payFor?.counterparty_name} · balance {payFor ? money(balanceOf(payFor)) : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label>Amount</Label>
              <Input type="number" step="0.01" inputMode="decimal" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
            </div>
            <div>
              <Label>Date</Label>
              <Input type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
            </div>
            <div className="sm:col-span-2">
              <Label>Method</Label>
              <Input value={payMethod} placeholder="Check, ACH, Zelle…" onChange={(e) => setPayMethod(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayFor(null)}>Cancel</Button>
            <Button onClick={recordPayment}>Save payment</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Add / edit entry */}
      <Dialog open={!!form} onOpenChange={(o) => !o && setForm(null)}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{form?.id ? 'Edit entry' : form?.direction === 'payable' ? 'Add a bill to pay' : 'Add money owed to you'}</DialogTitle>
            <DialogDescription>Rent, loans, draws and invoices outside your construction jobs.</DialogDescription>
          </DialogHeader>
          {form && (
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label>Company</Label>
                <Select value={form.company_id} onValueChange={(v) => setForm({ ...form, company_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                  <SelectContent>{companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div>
                <Label>Direction</Label>
                <Select value={form.direction} onValueChange={(v) => setForm({ ...form, direction: v as Obligation['direction'] })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="receivable">Owed to us</SelectItem>
                    <SelectItem value="payable">We owe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Type</Label>
                <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{KINDS.map((k) => <SelectItem key={k} value={k} className="capitalize">{k}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>{form.direction === 'payable' ? 'Who you pay' : 'Who owes you'}</Label>
                <Input value={form.counterparty_name} onChange={(e) => setForm({ ...form, counterparty_name: e.target.value })} />
              </div>
              <div>
                <Label>Amount</Label>
                <Input type="number" step="0.01" inputMode="decimal" value={form.amount} onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
              </div>
              <div>
                <Label>Due date</Label>
                <Input type="date" value={form.due_date ?? ''} onChange={(e) => setForm({ ...form, due_date: e.target.value || null })} />
              </div>
              <div>
                <Label>Repeats</Label>
                <Select value={form.recurrence} onValueChange={(v) => setForm({ ...form, recurrence: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>{RECURRENCES.map((r) => <SelectItem key={r} value={r} className="capitalize">{r.replace('_', ' ')}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-3">
                <Label>Description</Label>
                <Input value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setForm(null)}>Cancel</Button>
            <Button onClick={saveObligation}>{form?.id ? 'Save' : 'Add'}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this entry?</AlertDialogTitle>
            <AlertDialogDescription>
              {confirmDelete?.counterparty_name} · {confirmDelete ? money(Number(confirmDelete.amount || 0)) : ''}. Its recorded payments are removed too. This can't be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => { if (confirmDelete) remove(confirmDelete.id); setConfirmDelete(null); }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
