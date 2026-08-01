import { useCallback, useEffect, useMemo, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useCompanies } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, DollarSign } from 'lucide-react';

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
  (Number(n) || 0).toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });

function isoDaysAgo(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

function emptyObligation(companyId: string, direction: 'receivable' | 'payable'): Obligation {
  return {
    id: '', company_id: companyId, direction, kind: 'rent', counterparty_name: '',
    description: '', amount: 0, due_date: new Date().toISOString().slice(0, 10),
    status: 'open', recurrence: 'one_time', property_unit_id: null, notes: '',
  };
}

export default function OwnerMoney() {
  const { companies, selectedIds } = useCompanies();
  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(isoDaysAgo(30));
  const [to, setTo] = useState(new Date().toISOString().slice(0, 10));
  const [form, setForm] = useState<Obligation | null>(null);
  const [payFor, setPayFor] = useState<Obligation | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState(new Date().toISOString().slice(0, 10));
  const [payMethod, setPayMethod] = useState('');

  const load = useCallback(async () => {
    if (selectedIds.length === 0) {
      setObligations([]); setPayments([]); setLoading(false); return;
    }
    setLoading(true);
    const { data: obs } = await supabase
      .from('company_obligations').select('*').in('company_id', selectedIds).order('due_date');
    const list = ((obs as any) || []) as Obligation[];
    setObligations(list);
    if (list.length) {
      const { data: pays } = await supabase
        .from('obligation_payments').select('*').in('obligation_id', list.map((o) => o.id));
      setPayments(((pays as any) || []) as Payment[]);
    } else {
      setPayments([]);
    }
    setLoading(false);
  }, [selectedIds]);

  useEffect(() => { load(); }, [load]);

  const paidByObligation = useMemo(() => {
    const map: Record<string, number> = {};
    payments.forEach((p) => { map[p.obligation_id] = (map[p.obligation_id] || 0) + Number(p.amount || 0); });
    return map;
  }, [payments]);

  const inRange = useCallback((d: string) => d >= from && d <= to, [from, to]);

  const stats = useMemo(() => {
    const obById: Record<string, Obligation> = {};
    obligations.forEach((o) => { obById[o.id] = o; });
    const rangePayments = payments.filter((p) => inRange(p.paid_on));
    const revenue = rangePayments
      .filter((p) => obById[p.obligation_id]?.direction === 'receivable')
      .reduce((s, p) => s + Number(p.amount || 0), 0);
    const spend = rangePayments
      .filter((p) => obById[p.obligation_id]?.direction === 'payable')
      .reduce((s, p) => s + Number(p.amount || 0), 0);

    const balance = (o: Obligation) => Math.max(Number(o.amount || 0) - (paidByObligation[o.id] || 0), 0);
    const owedToUs = obligations.filter((o) => o.direction === 'receivable').reduce((s, o) => s + balance(o), 0);
    const owedByUs = obligations.filter((o) => o.direction === 'payable').reduce((s, o) => s + balance(o), 0);
    const today = new Date().toISOString().slice(0, 10);
    const overdue = obligations
      .filter((o) => o.direction === 'receivable' && o.due_date && o.due_date < today && balance(o) > 0)
      .reduce((s, o) => s + balance(o), 0);

    return { revenue, spend, owedToUs, owedByUs, overdue, net: revenue - spend };
  }, [obligations, payments, paidByObligation, inRange]);

  const byCompany = useMemo(() => {
    return companies
      .filter((c) => selectedIds.includes(c.id))
      .map((c) => {
        const obs = obligations.filter((o) => o.company_id === c.id);
        const ids = new Set(obs.map((o) => o.id));
        const collected = payments
          .filter((p) => ids.has(p.obligation_id) && inRange(p.paid_on) &&
            obs.find((o) => o.id === p.obligation_id)?.direction === 'receivable')
          .reduce((s, p) => s + Number(p.amount || 0), 0);
        const outstanding = obs
          .filter((o) => o.direction === 'receivable')
          .reduce((s, o) => s + Math.max(Number(o.amount || 0) - (paidByObligation[o.id] || 0), 0), 0);
        const owed = obs
          .filter((o) => o.direction === 'payable')
          .reduce((s, o) => s + Math.max(Number(o.amount || 0) - (paidByObligation[o.id] || 0), 0), 0);
        return { company: c, collected, outstanding, owed };
      });
  }, [companies, selectedIds, obligations, payments, paidByObligation, inRange]);

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
      obligation_id: payFor.id, amount: amt, paid_on: payDate, method: payMethod || null,
    });
    if (error) return toast.error(error.message);
    const newPaid = (paidByObligation[payFor.id] || 0) + amt;
    const status = newPaid >= Number(payFor.amount) ? 'paid' : 'partial';
    await supabase.from('company_obligations').update({ status }).eq('id', payFor.id);
    toast.success('Payment recorded');
    setPayFor(null); setPayAmount(''); setPayMethod('');
    load();
  };

  const renderList = (direction: 'receivable' | 'payable') => {
    const rows = obligations.filter((o) => o.direction === direction);
    if (loading) return <p className="text-muted-foreground">Loading...</p>;
    if (rows.length === 0)
      return <p className="text-muted-foreground">Nothing recorded for the selected companies.</p>;
    const today = new Date().toISOString().slice(0, 10);
    return (
      <div className="space-y-2">
        {rows.map((o) => {
          const paid = paidByObligation[o.id] || 0;
          const balance = Math.max(Number(o.amount || 0) - paid, 0);
          const overdue = balance > 0 && o.due_date && o.due_date < today;
          return (
            <Card key={o.id} className="p-4 flex items-center justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-display font-semibold truncate">{o.counterparty_name}</h3>
                  <Badge variant="outline">{o.kind}</Badge>
                  <Badge variant="secondary">{companies.find((c) => c.id === o.company_id)?.name}</Badge>
                  {balance === 0 ? (
                    <span className="px-2 py-0.5 rounded text-xs bg-blue-500/15 text-blue-500">paid</span>
                  ) : overdue ? (
                    <span className="px-2 py-0.5 rounded text-xs bg-yellow-500/15 text-yellow-500">overdue</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded text-xs bg-green-500/15 text-green-500">open</span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {o.description || 'No description'} · due {o.due_date || '—'} · {o.recurrence.replace('_', ' ')}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="font-display font-bold">{money(balance)}</p>
                <p className="text-xs text-muted-foreground">
                  {money(paid)} of {money(Number(o.amount))} paid
                </p>
                <div className="flex gap-1 justify-end mt-1">
                  <Button size="sm" variant="outline" onClick={() => { setPayFor(o); setPayAmount(String(balance.toFixed(2))); }}>
                    <DollarSign className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setForm(o)}><Pencil className="h-3 w-3" /></Button>
                  <Button size="sm" variant="outline" onClick={() => remove(o.id)}><Trash2 className="h-3 w-3" /></Button>
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
              key={r.label} size="sm" variant="outline"
              onClick={() => {
                setTo(new Date().toISOString().slice(0, 10));
                setFrom(r.days === -1 ? `${new Date().getFullYear()}-01-01` : isoDaysAgo(r.days));
              }}
            >
              {r.label}
            </Button>
          ))}
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mt-4">
        {[
          { label: 'Revenue collected', value: money(stats.revenue) },
          { label: 'Paid out', value: money(stats.spend) },
          { label: 'Net', value: money(stats.net) },
          { label: 'Still owed to you', value: money(stats.owedToUs) },
          { label: 'You owe', value: money(stats.owedByUs) },
        ].map((s) => (
          <Card key={s.label} className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">{s.label}</p>
            <p className="text-xl font-display font-bold mt-1">{s.value}</p>
          </Card>
        ))}
      </div>

      {stats.overdue > 0 && (
        <Card className="p-4 mt-3">
          <p className="text-sm">
            <span className="font-semibold text-yellow-500">{money(stats.overdue)}</span> is past due and still uncollected.
          </p>
        </Card>
      )}

      {byCompany.length > 1 && (
        <Card className="p-4 mt-4 overflow-x-auto">
          <h2 className="font-display text-lg mb-2">By company</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <th className="py-1">Company</th>
                <th className="py-1 text-right">Collected (range)</th>
                <th className="py-1 text-right">Owed to you</th>
                <th className="py-1 text-right">You owe</th>
              </tr>
            </thead>
            <tbody>
              {byCompany.map((r) => (
                <tr key={r.company.id} className="border-t border-border/50">
                  <td className="py-2">{r.company.name}</td>
                  <td className="py-2 text-right">{money(r.collected)}</td>
                  <td className="py-2 text-right">{money(r.outstanding)}</td>
                  <td className="py-2 text-right">{money(r.owed)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}

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
            <Button variant="outline" onClick={() => setPayFor(null)}>Cancel</Button>
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
                <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                <SelectContent>
                  {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
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
                <SelectContent>
                  {KINDS.map((k) => <SelectItem key={k} value={k}>{k}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Counterparty</Label>
              <Input value={form.counterparty_name} onChange={(e) => setForm({ ...form, counterparty_name: e.target.value })} />
            </div>
            <div>
              <Label>Amount</Label>
              <Input type="number" step="0.001" value={form.amount}
                onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })} />
            </div>
            <div>
              <Label>Due date</Label>
              <Input type="date" value={form.due_date ?? ''} onChange={(e) => setForm({ ...form, due_date: e.target.value || null })} />
            </div>
            <div>
              <Label>Recurrence</Label>
              <Select value={form.recurrence} onValueChange={(v) => setForm({ ...form, recurrence: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {RECURRENCES.map((r) => <SelectItem key={r} value={r}>{r.replace('_', ' ')}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="md:col-span-2">
              <Label>Description</Label>
              <Input value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setForm(null)}>Cancel</Button>
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
        <TabsContent value="receivable" className="mt-4">{renderList('receivable')}</TabsContent>
        <TabsContent value="payable" className="mt-4">{renderList('payable')}</TabsContent>
      </Tabs>
    </Layout>
  );
}