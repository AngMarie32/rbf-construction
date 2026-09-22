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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { Plus, Pencil, Trash2, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';
import { buildAmortization, monthlyPayment, summarize } from '@/utils/loanAmortization';

interface Loan {
  id: string;
  company_id: string;
  loan_number: string | null;
  borrower_name: string;
  borrower_email: string | null;
  borrower_phone: string | null;
  borrower_address: string | null;
  principal_amount: number;
  interest_rate: number;
  term_months: number;
  payment_day: number;
  start_date: string;
  status: string;
  notes: string | null;
}

interface LoanPayment {
  id: string;
  loan_id: string;
  payment_number: number;
  due_date: string;
  scheduled_amount: number;
  principal_amount: number;
  interest_amount: number;
  balance_after: number;
  paid_amount: number;
  paid_date: string | null;
  status: string;
  notes: string | null;
}

const STATUSES = ['active', 'pending', 'paid_off', 'default'];

const money = (n: number | null | undefined) =>
  (Number(n) || 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const loanTone = (s: string) =>
  s === 'active' ? 'bg-green-500/15 text-green-500'
  : s === 'paid_off' ? 'bg-blue-500/15 text-blue-500'
  : s === 'default' ? 'bg-red-500/15 text-red-500'
  : 'bg-yellow-500/15 text-yellow-500';

const payTone = (p: LoanPayment) =>
  p.status === 'paid' ? 'bg-blue-500/15 text-blue-500'
  : p.status === 'partial' ? 'bg-yellow-500/15 text-yellow-500'
  : new Date(p.due_date) < new Date(localDateISO())
  ? 'bg-red-500/15 text-red-500'
  : 'bg-green-500/15 text-green-500';

function emptyLoan(companyId: string): Loan {
  return {
    id: '', company_id: companyId, loan_number: '', borrower_name: '', borrower_email: '',
    borrower_phone: '', borrower_address: '', principal_amount: 0, interest_rate: 0,
    term_months: 12, payment_day: 1, start_date: localDateISO(),
    status: 'active', notes: '',
  };
}

export default function Loans() {
  const { companies, selectedIds } = useCompanies();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [payments, setPayments] = useState<LoanPayment[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [form, setForm] = useState<Loan | null>(null);

  const load = useCallback(async () => {
    if (selectedIds.length === 0) {
      setLoans([]); setPayments([]); setLoading(false); return;
    }
    setLoading(true);
    const { data: loanRows, error } = await supabase
      .from('loans')
      .select('*')
      .in('company_id', selectedIds)
      .order('created_at', { ascending: false });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }
    const ids = (loanRows || []).map((l: any) => l.id);
    let payRows: any[] = [];
    if (ids.length) {
      const { data } = await supabase
        .from('loan_payments')
        .select('*')
        .in('loan_id', ids)
        .order('payment_number');
      payRows = data || [];
    }
    setLoans((loanRows as any) || []);
    setPayments(payRows as any);
    setLoading(false);
  }, [selectedIds]);

  useEffect(() => { load(); }, [load]);

  const companyName = (id: string) => companies.find((c) => c.id === id)?.name ?? '—';
  const paymentsFor = (loanId: string) => payments.filter((p) => p.loan_id === loanId);

  const loanStats = (loan: Loan) => {
    const rows = paymentsFor(loan.id);
    const paidPrincipal = rows.reduce(
      (s, p) => s + (p.status === 'paid' ? Number(p.principal_amount) : 0), 0);
    const collected = rows.reduce((s, p) => s + Number(p.paid_amount || 0), 0);
    const interestPaid = rows.reduce(
      (s, p) => s + (p.status === 'paid' ? Number(p.interest_amount) : 0), 0);
    const outstanding = Math.max(0, Number(loan.principal_amount) - paidPrincipal);
    const pastDue = rows.filter(
      (p) => p.status !== 'paid' && p.due_date < localDateISO());
    const next = rows.find((p) => p.status !== 'paid');
    return { rows, collected, interestPaid, outstanding, pastDue, next };
  };

  const portfolio = useMemo(() => {
    return loans.reduce(
      (a, l) => {
        const s = loanStats(l);
        a.principal += Number(l.principal_amount);
        a.outstanding += s.outstanding;
        a.collected += s.collected;
        a.interest += s.interestPaid;
        a.pastDue += s.pastDue.length;
        return a;
      },
      { principal: 0, outstanding: 0, collected: 0, interest: 0, pastDue: 0 }
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loans, payments]);

  const previewPmt = form
    ? monthlyPayment(Number(form.principal_amount) || 0, Number(form.interest_rate) || 0, Number(form.term_months) || 1)
    : 0;

  async function generateSchedule(loan: Loan, replace: boolean) {
    const rows = buildAmortization({
      principal: Number(loan.principal_amount) || 0,
      annualRatePct: Number(loan.interest_rate) || 0,
      termMonths: Number(loan.term_months) || 1,
      startDate: loan.start_date,
      paymentDay: Number(loan.payment_day) || 1,
    });
    if (replace) {
      const { error } = await supabase.from('loan_payments').delete().eq('loan_id', loan.id);
      if (error) { toast.error(error.message); return; }
    }
    const { error } = await supabase
      .from('loan_payments')
      .insert(rows.map((r) => ({ ...r, loan_id: loan.id })) as any);
    if (error) { toast.error(error.message); return; }
    toast.success(`${rows.length} scheduled payments created`);
  }

  async function saveLoan() {
    if (!form) return;
    if (!form.borrower_name.trim()) { toast.error('Borrower name is required'); return; }
    if (!form.company_id) { toast.error('Select a company'); return; }

    const payload = {
      company_id: form.company_id,
      loan_number: form.loan_number || null,
      borrower_name: form.borrower_name.trim(),
      borrower_email: form.borrower_email || null,
      borrower_phone: form.borrower_phone || null,
      borrower_address: form.borrower_address || null,
      principal_amount: Number(form.principal_amount) || 0,
      interest_rate: Number(form.interest_rate) || 0,
      term_months: Number(form.term_months) || 1,
      payment_day: Number(form.payment_day) || 1,
      start_date: form.start_date,
      status: form.status,
      notes: form.notes || null,
    };

    if (form.id) {
      const { error } = await supabase.from('loans').update(payload).eq('id', form.id);
      if (error) { toast.error(error.message); return; }
      toast.success('Loan updated');
    } else {
      const { data, error } = await supabase.from('loans').insert(payload as any).select().single();
      if (error) { toast.error(error.message); return; }
      await generateSchedule(data as any, false);
      setExpanded((e) => ({ ...e, [(data as any).id]: true }));
    }
    setForm(null);
    load();
  }

  async function deleteLoan(id: string) {
    const { error } = await supabase.from('loans').delete().eq('id', id);
    if (error) { toast.error(error.message); return; }
    toast.success('Loan deleted');
    load();
  }

  async function markPaid(p: LoanPayment) {
    const { error } = await supabase
      .from('loan_payments')
      .update({
        status: 'paid',
        paid_amount: Number(p.scheduled_amount),
        paid_date: localDateISO(),
      })
      .eq('id', p.id);
    if (error) { toast.error(error.message); return; }
    load();
  }

  async function unmarkPaid(p: LoanPayment) {
    const { error } = await supabase
      .from('loan_payments')
      .update({ status: 'scheduled', paid_amount: 0, paid_date: null })
      .eq('id', p.id);
    if (error) { toast.error(error.message); return; }
    load();
  }

  async function updatePaid(p: LoanPayment, amount: number) {
    const status = amount <= 0 ? 'scheduled' : amount + 0.005 >= Number(p.scheduled_amount) ? 'paid' : 'partial';
    const { error } = await supabase
      .from('loan_payments')
      .update({
        paid_amount: amount,
        status,
        paid_date: amount > 0 ? p.paid_date || localDateISO() : null,
      })
      .eq('id', p.id);
    if (error) { toast.error(error.message); return; }
    load();
  }

  return (
    <Layout title="Loans">
      <div className="space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Loans</h1>
            <p className="text-sm text-muted-foreground">
              Loans issued by your companies with borrower details, balances, and monthly principal &amp; interest schedules.
            </p>
          </div>
          <Button
            size="sm"
            className="gap-2"
            onClick={() => setForm(emptyLoan(selectedIds[0] || ''))}
            disabled={companies.length === 0}
          >
            <Plus className="h-4 w-4" /> New loan
          </Button>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {[
            { label: 'Loans', value: String(loans.length) },
            { label: 'Original principal', value: money(portfolio.principal) },
            { label: 'Outstanding balance', value: money(portfolio.outstanding) },
            { label: 'Collected to date', value: money(portfolio.collected) },
            { label: 'Interest earned', value: money(portfolio.interest) },
          ].map((k) => (
            <Card key={k.label} className="p-4">
              <div className="text-xs uppercase tracking-wide text-muted-foreground">{k.label}</div>
              <div className="mt-1 text-xl font-semibold">{k.value}</div>
            </Card>
          ))}
        </div>

        {portfolio.pastDue > 0 && (
          <div className="rounded-md bg-red-500/10 px-4 py-2 text-sm text-red-500">
            {portfolio.pastDue} payment{portfolio.pastDue === 1 ? '' : 's'} past due across the portfolio.
          </div>
        )}

        {form && (
          <Card className="p-5 space-y-4">
            <div className="text-sm font-semibold">{form.id ? 'Edit loan' : 'New loan'}</div>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="space-y-1.5">
                <Label>Company</Label>
                <Select value={form.company_id} onValueChange={(v) => setForm({ ...form, company_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Select company" /></SelectTrigger>
                  <SelectContent>
                    {companies.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Loan number</Label>
                <Input value={form.loan_number ?? ''} onChange={(e) => setForm({ ...form, loan_number: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STATUSES.map((s) => <SelectItem key={s} value={s}>{s.replace('_', ' ')}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Borrower name</Label>
                <Input value={form.borrower_name} onChange={(e) => setForm({ ...form, borrower_name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Borrower email</Label>
                <Input type="email" value={form.borrower_email ?? ''} onChange={(e) => setForm({ ...form, borrower_email: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Borrower phone</Label>
                <Input value={form.borrower_phone ?? ''} onChange={(e) => setForm({ ...form, borrower_phone: e.target.value })} />
              </div>
              <div className="space-y-1.5 md:col-span-3">
                <Label>Borrower address</Label>
                <Input value={form.borrower_address ?? ''} onChange={(e) => setForm({ ...form, borrower_address: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Principal amount</Label>
                <Input
                  type="number" step="0.001"
                  value={form.principal_amount}
                  onChange={(e) => setForm({ ...form, principal_amount: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Annual interest rate (%)</Label>
                <Input
                  type="number" step="0.001"
                  value={form.interest_rate}
                  onChange={(e) => setForm({ ...form, interest_rate: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Term (months)</Label>
                <Input
                  type="number" min={1}
                  value={form.term_months}
                  onChange={(e) => setForm({ ...form, term_months: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>First payment date</Label>
                <Input type="date" value={form.start_date} onChange={(e) => setForm({ ...form, start_date: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Payment day of month</Label>
                <Input
                  type="number" min={1} max={31}
                  value={form.payment_day}
                  onChange={(e) => setForm({ ...form, payment_day: Number(e.target.value) })}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Monthly payment (calculated)</Label>
                <div className="flex h-10 items-center rounded-md bg-muted px-3 text-sm font-semibold">
                  {money(previewPmt)}
                </div>
              </div>
              <div className="space-y-1.5 md:col-span-3">
                <Label>Notes</Label>
                <Textarea rows={2} value={form.notes ?? ''} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div className="flex gap-2">
              <Button size="sm" onClick={saveLoan}>Save</Button>
              <Button size="sm" variant="ghost" onClick={() => setForm(null)}>Cancel</Button>
            </div>
          </Card>
        )}

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading loans…</div>
        ) : loans.length === 0 ? (
          <Card className="p-10 text-center text-sm text-muted-foreground">
            No loans yet for the selected companies.
          </Card>
        ) : (
          <div className="space-y-3">
            {loans.map((loan) => {
              const s = loanStats(loan);
              const totals = summarize(
                s.rows.map((r) => ({
                  payment_number: r.payment_number,
                  due_date: r.due_date,
                  scheduled_amount: Number(r.scheduled_amount),
                  principal_amount: Number(r.principal_amount),
                  interest_amount: Number(r.interest_amount),
                  balance_after: Number(r.balance_after),
                }))
              );
              const open = !!expanded[loan.id];
              return (
                <Card key={loan.id} className="overflow-hidden">
                  <div className="flex flex-wrap items-center gap-3 p-4">
                    <button
                      className="text-muted-foreground"
                      onClick={() => setExpanded((e) => ({ ...e, [loan.id]: !open }))}
                      aria-label={open ? 'Collapse schedule' : 'Expand schedule'}
                    >
                      {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                    </button>
                    <div className="min-w-[200px] flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{loan.borrower_name}</span>
                        <Badge className={loanTone(loan.status)} variant="secondary">
                          {loan.status.replace('_', ' ')}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {companyName(loan.company_id)}
                        {loan.loan_number ? ` · #${loan.loan_number}` : ''}
                        {loan.borrower_email ? ` · ${loan.borrower_email}` : ''}
                        {loan.borrower_phone ? ` · ${loan.borrower_phone}` : ''}
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs sm:grid-cols-4">
                      <div>
                        <div className="text-muted-foreground">Principal</div>
                        <div className="font-medium">{money(loan.principal_amount)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Rate / term</div>
                        <div className="font-medium">{Number(loan.interest_rate).toFixed(2)}% · {loan.term_months} mo</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Outstanding</div>
                        <div className="font-medium">{money(s.outstanding)}</div>
                      </div>
                      <div>
                        <div className="text-muted-foreground">Next due</div>
                        <div className="font-medium">
                          {s.next ? `${s.next.due_date} · ${money(s.next.scheduled_amount)}` : 'Paid off'}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setForm(loan)} aria-label="Edit loan">
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        size="icon" variant="ghost"
                        onClick={async () => { await generateSchedule(loan, true); load(); }}
                        aria-label="Rebuild schedule"
                        title="Rebuild schedule from current terms"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => deleteLoan(loan.id)} aria-label="Delete loan">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  {open && (
                    <div className="border-t">
                      {s.rows.length === 0 ? (
                        <div className="p-4 text-sm text-muted-foreground">
                          No schedule yet — use the rebuild button to generate payments.
                        </div>
                      ) : (
                        <div className="overflow-x-auto">
                          <table className="w-full text-sm">
                            <thead className="bg-muted/50 text-xs uppercase tracking-wide text-muted-foreground">
                              <tr>
                                <th className="px-4 py-2 text-left">#</th>
                                <th className="px-4 py-2 text-left">Due</th>
                                <th className="px-4 py-2 text-right">Payment</th>
                                <th className="px-4 py-2 text-right">Principal</th>
                                <th className="px-4 py-2 text-right">Interest</th>
                                <th className="px-4 py-2 text-right">Balance</th>
                                <th className="px-4 py-2 text-right">Paid</th>
                                <th className="px-4 py-2 text-left">Status</th>
                                <th className="px-4 py-2" />
                              </tr>
                            </thead>
                            <tbody>
                              {s.rows.map((p) => (
                                <tr key={p.id} className="border-t">
                                  <td className="px-4 py-2">{p.payment_number}</td>
                                  <td className="px-4 py-2">{p.due_date}</td>
                                  <td className="px-4 py-2 text-right">{money(p.scheduled_amount)}</td>
                                  <td className="px-4 py-2 text-right">{money(p.principal_amount)}</td>
                                  <td className="px-4 py-2 text-right">{money(p.interest_amount)}</td>
                                  <td className="px-4 py-2 text-right">{money(p.balance_after)}</td>
                                  <td className="px-4 py-2 text-right">
                                    <Input
                                      type="number" step="0.001"
                                      className="ml-auto h-8 w-28 text-right"
                                      defaultValue={Number(p.paid_amount)}
                                      onBlur={(e) => {
                                        const v = Number(e.target.value) || 0;
                                        if (v !== Number(p.paid_amount)) updatePaid(p, v);
                                      }}
                                    />
                                  </td>
                                  <td className="px-4 py-2">
                                    <Badge className={payTone(p)} variant="secondary">{p.status}</Badge>
                                  </td>
                                  <td className="px-4 py-2 text-right">
                                    {p.status === 'paid' ? (
                                      <Button size="sm" variant="ghost" onClick={() => unmarkPaid(p)}>Undo</Button>
                                    ) : (
                                      <Button size="sm" variant="ghost" onClick={() => markPaid(p)}>Mark paid</Button>
                                    )}
                                  </td>
                                </tr>
                              ))}
                              <tr className="border-t bg-muted/40 font-semibold">
                                <td className="px-4 py-2" colSpan={2}>Totals</td>
                                <td className="px-4 py-2 text-right">{money(totals.totalPayments)}</td>
                                <td className="px-4 py-2 text-right">{money(totals.totalPrincipal)}</td>
                                <td className="px-4 py-2 text-right">{money(totals.totalInterest)}</td>
                                <td className="px-4 py-2" />
                                <td className="px-4 py-2 text-right">{money(s.collected)}</td>
                                <td className="px-4 py-2" colSpan={2} />
                              </tr>
                            </tbody>
                          </table>
                        </div>
                      )}
                    </div>
                  )}
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
