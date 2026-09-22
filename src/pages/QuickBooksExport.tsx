import { useCallback, useEffect, useMemo, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useCompanies } from '@/contexts/CompanyContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import {
  QbdRow,
  QBD_DEFAULTS,
  buildBillsIif,
  buildInvoicesIif,
  buildDepositsIif,
  buildNamesIif,
  buildCsv,
  downloadFile,
  fmtDate,
} from '@/utils/qbdExport';

const money = (n: number) =>
  (Number(n) || 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

const iso = (d: Date) => localDateISO(d);

type Bucket = 'expenses' | 'repairs' | 'invoices' | 'loanPayments';

interface Buckets {
  expenses: QbdRow[];
  repairs: QbdRow[];
  invoices: QbdRow[];
  loanPayments: QbdRow[];
}

const EMPTY: Buckets = { expenses: [], repairs: [], invoices: [], loanPayments: [] };

export default function QuickBooksExport() {
  const { selectedIds } = useCompanies();
  const [loading, setLoading] = useState(true);
  const [from, setFrom] = useState(iso(new Date(new Date().getFullYear(), 0, 1)));
  const [to, setTo] = useState(iso(new Date()));
  const [data, setData] = useState<Buckets>(EMPTY);
  const [include, setInclude] = useState<Record<Bucket, boolean>>({
    expenses: true,
    repairs: true,
    invoices: true,
    loanPayments: true,
  });
  const [accounts, setAccounts] = useState({ ...QBD_DEFAULTS });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const projFilter = selectedIds.length
        ? await supabase.from('projects').select('id,name,company_id').in('company_id', selectedIds)
        : { data: [] as any[] };
      const projects = (projFilter.data as any[]) || [];
      const projectIds = projects.map((p) => p.id);
      const projectName: Record<string, string> = {};
      projects.forEach((p) => (projectName[p.id] = p.name));

      const [expensesRes, invoicesRes, repairsRes, loansRes] = await Promise.all([
        projectIds.length
          ? supabase
              .from('expenses')
              .select('id,project_id,category,description,amount,date,vendor,receipt_number')
              .in('project_id', projectIds)
              .gte('date', from)
              .lte('date', to)
          : Promise.resolve({ data: [] as any[] }),
        projectIds.length
          ? supabase
              .from('invoices')
              .select('id,project_id,invoice_number,client_name,invoice_date,total_amount,notes')
              .in('project_id', projectIds)
              .gte('invoice_date', from)
              .lte('invoice_date', to)
          : Promise.resolve({ data: [] as any[] }),
        supabase
          .from('maintenance_logs')
          .select('id,date,description,cost,equipment:equipment_id(name)')
          .gte('date', from)
          .lte('date', to),
        selectedIds.length
          ? supabase.from('loans').select('id,loan_number,borrower_name,company_id').in('company_id', selectedIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);

      const loans = (loansRes.data as any[]) || [];
      const loanById: Record<string, any> = {};
      loans.forEach((l) => (loanById[l.id] = l));

      let loanPayments: QbdRow[] = [];
      if (loans.length) {
        const { data: payments } = await supabase
          .from('loan_payments')
          .select('id,loan_id,payment_number,paid_amount,paid_date,principal_amount,interest_amount')
          .in('loan_id', Object.keys(loanById))
          .not('paid_date', 'is', null)
          .gte('paid_date', from)
          .lte('paid_date', to);
        loanPayments = ((payments as any[]) || [])
          .filter((p) => Number(p.paid_amount) > 0)
          .map((p) => {
            const loan = loanById[p.loan_id] || {};
            return {
              date: p.paid_date,
              name: loan.borrower_name || 'Borrower',
              memo: `Loan ${loan.loan_number || ''} payment #${p.payment_number} — principal ${money(
                Number(p.principal_amount),
              )}, interest ${money(Number(p.interest_amount))}`,
              docNum: `${loan.loan_number || 'LOAN'}-${p.payment_number}`,
              amount: Number(p.paid_amount) || 0,
              account: accounts.loanAccount,
            } as QbdRow;
          });
      }

      const expenses: QbdRow[] = ((expensesRes.data as any[]) || []).map((e) => ({
        date: e.date,
        name: e.vendor || 'Unassigned Vendor',
        memo: e.description || e.category || 'Expense',
        docNum: e.receipt_number || '',
        amount: Number(e.amount) || 0,
        account: e.category || accounts.expenseAccount,
        class: projectName[e.project_id] || '',
      }));

      const repairs: QbdRow[] = ((repairsRes.data as any[]) || []).map((m) => ({
        date: m.date,
        name: 'Equipment Repair',
        memo: `${m.equipment?.name ? m.equipment.name + ' — ' : ''}${m.description || 'Repair'}`,
        docNum: '',
        amount: Number(m.cost) || 0,
        account: 'Repairs & Maintenance',
      }));

      const invoices: QbdRow[] = ((invoicesRes.data as any[]) || []).map((i) => ({
        date: i.invoice_date,
        name: i.client_name || 'Customer',
        memo: i.notes || `Invoice ${i.invoice_number || ''}`,
        docNum: i.invoice_number || '',
        amount: Number(i.total_amount) || 0,
        account: accounts.incomeAccount,
        class: projectName[i.project_id] || '',
      }));

      setData({ expenses, repairs, invoices, loanPayments });
    } catch (err: any) {
      toast.error(err?.message || 'Could not load records');
    } finally {
      setLoading(false);
    }
  }, [selectedIds, from, to, accounts.expenseAccount, accounts.incomeAccount, accounts.loanAccount]);

  useEffect(() => {
    load();
  }, [load]);

  const billRows = useMemo(
    () => [...(include.expenses ? data.expenses : []), ...(include.repairs ? data.repairs : [])],
    [data, include],
  );
  const invoiceRows = include.invoices ? data.invoices : [];
  const depositRows = include.loanPayments ? data.loanPayments : [];

  const totals = {
    bills: billRows.reduce((s, r) => s + r.amount, 0),
    invoices: invoiceRows.reduce((s, r) => s + r.amount, 0),
    deposits: depositRows.reduce((s, r) => s + r.amount, 0),
  };

  const stamp = `${from}_to_${to}`;

  const exportIif = () => {
    let files = 0;
    if (billRows.length) {
      downloadFile(
        `qbd-bills-${stamp}.iif`,
        buildNamesIif(billRows.map((r) => r.name), 'VEND') +
          buildBillsIif(billRows, accounts.apAccount),
      );
      files++;
    }
    if (invoiceRows.length) {
      downloadFile(
        `qbd-invoices-${stamp}.iif`,
        buildNamesIif(invoiceRows.map((r) => r.name), 'CUST') +
          buildInvoicesIif(invoiceRows, accounts.arAccount),
      );
      files++;
    }
    if (depositRows.length) {
      downloadFile(
        `qbd-deposits-${stamp}.iif`,
        buildDepositsIif(depositRows, accounts.bankAccount),
      );
      files++;
    }
    if (!files) toast.error('Nothing to export for that date range');
    else toast.success(`${files} file${files > 1 ? 's' : ''} downloaded`);
  };

  const exportCsv = () => {
    const rows = [...billRows, ...invoiceRows, ...depositRows];
    if (!rows.length) return toast.error('Nothing to export for that date range');
    downloadFile(`qbd-review-${stamp}.csv`, buildCsv(rows), 'text/csv');
    toast.success('Spreadsheet downloaded');
  };

  const toggle = (key: Bucket) => setInclude((p) => ({ ...p, [key]: !p[key] }));

  const previewRows = [...billRows, ...invoiceRows, ...depositRows]
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 25);

  return (
    <Layout title="QuickBooks Desktop Export">
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">QuickBooks Desktop Export</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Download your bills, invoices and payments as QuickBooks Desktop import files, then
            bring them in from File &gt; Utilities &gt; Import &gt; IIF Files.
          </p>
        </div>

        <Card className="p-5 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="space-y-2">
              <Label>From</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>To</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Accounts Payable account</Label>
              <Input
                value={accounts.apAccount}
                onChange={(e) => setAccounts({ ...accounts, apAccount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Accounts Receivable account</Label>
              <Input
                value={accounts.arAccount}
                onChange={(e) => setAccounts({ ...accounts, arAccount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Bank account for deposits</Label>
              <Input
                value={accounts.bankAccount}
                onChange={(e) => setAccounts({ ...accounts, bankAccount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Income account</Label>
              <Input
                value={accounts.incomeAccount}
                onChange={(e) => setAccounts({ ...accounts, incomeAccount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Loan account</Label>
              <Input
                value={accounts.loanAccount}
                onChange={(e) => setAccounts({ ...accounts, loanAccount: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Default expense account</Label>
              <Input
                value={accounts.expenseAccount}
                onChange={(e) => setAccounts({ ...accounts, expenseAccount: e.target.value })}
              />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {([
              ['expenses', 'Job expenses', data.expenses],
              ['repairs', 'Equipment repairs', data.repairs],
              ['invoices', 'Customer invoices', data.invoices],
              ['loanPayments', 'Loan payments received', data.loanPayments],
            ] as [Bucket, string, QbdRow[]][]).map(([key, label, rows]) => (
              <div
                key={key}
                className="flex items-center justify-between rounded-md bg-muted/40 px-4 py-3"
              >
                <div>
                  <div className="text-sm font-medium">{label}</div>
                  <div className="text-xs text-muted-foreground">
                    {rows.length} record{rows.length === 1 ? '' : 's'} ·{' '}
                    {money(rows.reduce((s, r) => s + r.amount, 0))}
                  </div>
                </div>
                <Switch checked={include[key]} onCheckedChange={() => toggle(key)} />
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button onClick={exportIif} disabled={loading}>
              Download QuickBooks files
            </Button>
            <Button variant="outline" onClick={exportCsv} disabled={loading}>
              Download spreadsheet
            </Button>
            <Button variant="ghost" onClick={load} disabled={loading}>
              Refresh
            </Button>
            <div className="ml-auto flex gap-2">
              <Badge variant="secondary">Bills {money(totals.bills)}</Badge>
              <Badge variant="secondary">Invoices {money(totals.invoices)}</Badge>
              <Badge variant="secondary">Deposits {money(totals.deposits)}</Badge>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <div className="text-sm font-medium mb-3">
            Preview {previewRows.length ? `(newest ${previewRows.length})` : ''}
          </div>
          {loading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : previewRows.length === 0 ? (
            <div className="text-sm text-muted-foreground">
              No records in this date range for the selected companies.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs uppercase text-muted-foreground">
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Name</th>
                    <th className="py-2 pr-4">Account</th>
                    <th className="py-2 pr-4">Job</th>
                    <th className="py-2 pr-4">Ref</th>
                    <th className="py-2 pr-4">Memo</th>
                    <th className="py-2 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {previewRows.map((r, i) => (
                    <tr key={i} className="border-t border-border/60">
                      <td className="py-2 pr-4 whitespace-nowrap">{fmtDate(r.date)}</td>
                      <td className="py-2 pr-4">{r.name}</td>
                      <td className="py-2 pr-4">{r.account}</td>
                      <td className="py-2 pr-4">{r.class || '—'}</td>
                      <td className="py-2 pr-4">{r.docNum || '—'}</td>
                      <td className="py-2 pr-4 max-w-[320px] truncate">{r.memo}</td>
                      <td className="py-2 text-right whitespace-nowrap">{money(r.amount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card className="p-5 text-sm text-muted-foreground space-y-2">
          <div className="font-medium text-foreground">How to import</div>
          <p>1. Back up your QuickBooks company file first.</p>
          <p>2. In QuickBooks Desktop choose File &gt; Utilities &gt; Import &gt; IIF Files.</p>
          <p>3. Pick the downloaded file(s) — bills first, then invoices, then deposits.</p>
          <p>
            Account names above must match the names in your chart of accounts exactly, otherwise
            QuickBooks creates new ones.
          </p>
        </Card>
      </div>
    </Layout>
  );
}
