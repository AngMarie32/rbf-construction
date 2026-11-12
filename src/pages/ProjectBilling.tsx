import { sortProjectsOpenFirst } from '@/utils/projectOrder';

import { useState, useEffect } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  DollarSign, 
  Download,
  Plus,
  Receipt as ReceiptIcon,
  FileText as FileTextIcon,
  Search,
  CheckCircle,
  AlertTriangle,
  Banknote,
  Pencil,
  Trash2,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { PageHero, heroButton, heroButtonPrimary } from '@/components/ui/page-hero';
import { AccentStat } from '@/components/ui/accent-stat';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ImprovedBillingDialog } from '@/components/billing/ImprovedBillingDialog';
import { format } from 'date-fns';
import { FinancialDateFilter } from '@/components/dashboard/FinancialDateFilter';

interface Project {
  id: string;
  name: string;
  client?: string;
}

interface BillingRecord {
  id: string;
  project_id: string;
  billing_period_start: string;
  billing_period_end: string;
  billed_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: string;
  invoice_number: string | null;
  invoice_date: string | null;
  due_date: string | null;
  notes: string | null;
  created_at: string;
  project?: {
    name: string;
    client?: string;
  };
}

const money0 = (n: number) => `${n < 0 ? '-' : ''}$${Math.abs(Math.round(n || 0)).toLocaleString()}`;
const money = (n: number) => `$${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

export default function ProjectBilling() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [billingRecords, setBillingRecords] = useState<BillingRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [billingDialogOpen, setBillingDialogOpen] = useState(false);
  const [editingBilling, setEditingBilling] = useState<BillingRecord | null>(null);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState(new URLSearchParams(window.location.search).get('project') || 'all');
  const [dateFilter, setDateFilter] = useState<{ 
    type: 'year' | 'month' | 'custom' | 'range';
    value?: string;
    startDate?: Date;
    endDate?: Date;
  }>({ 
    type: 'custom'
  });

  useEffect(() => {
    fetchProjects();
    fetchBillingRecords();
  }, []);

  useEffect(() => {
    filterRecords();
  }, [billingRecords, searchQuery, statusFilter, projectFilter, dateFilter]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, client, status')
        .is('archived_at', null)
        .order('name');

      if (error) throw error;
      setProjects(sortProjectsOpenFirst(data || []));
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    }
  };

  const fetchBillingRecords = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('project_billing')
        .select(`
          *,
          projects!inner(name, client)
        `)
        .order('billing_period_end', { ascending: false });

      if (error) throw error;
      
      const recordsWithProject = (data || []).map(record => ({
        ...record,
        project: record.projects
      }));
      
      setBillingRecords(recordsWithProject);
    } catch (error) {
      console.error('Error fetching billing records:', error);
      toast.error('Failed to load billing records');
    } finally {
      setLoading(false);
    }
  };

  const filterRecords = () => {
    let filtered = [...billingRecords];

    // Search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(record => 
        record.project?.name?.toLowerCase().includes(query) ||
        record.invoice_number?.toLowerCase().includes(query) ||
        record.notes?.toLowerCase().includes(query)
      );
    }

    // Status is filtered on the effective status (e.g. unpaid past due = overdue) when rendering

    // Project filter
    if (projectFilter !== 'all') {
      filtered = filtered.filter(record => record.project_id === projectFilter);
    }

    // Date filter
    if (dateFilter.type === 'range' && dateFilter.startDate && dateFilter.endDate) {
      filtered = filtered.filter(record => {
        const recordDate = new Date(`${String(record.billing_period_end).slice(0, 10)}T00:00:00`);
        return recordDate >= dateFilter.startDate! && recordDate <= dateFilter.endDate!;
      });
    } else if (dateFilter.type === 'year' && dateFilter.value) {
      filtered = filtered.filter(record => {
        const recordYear = new Date(`${String(record.billing_period_end).slice(0, 10)}T00:00:00`).getFullYear();
        return recordYear.toString() === dateFilter.value;
      });
    } else if (dateFilter.type === 'month' && dateFilter.value) {
      filtered = filtered.filter(record => {
        const recordDate = new Date(`${String(record.billing_period_end).slice(0, 10)}T00:00:00`);
        const recordMonth = `${recordDate.getFullYear()}-${(recordDate.getMonth() + 1).toString().padStart(2, '0')}`;
        return recordMonth === dateFilter.value;
      });
    }

    setFilteredRecords(filtered);
  };

  const handleBillingSuccess = () => {
    fetchBillingRecords();
    setBillingDialogOpen(false);
    setEditingBilling(null);
  };

  const handleDeleteBilling = async (id: string) => {

    try {
      const { error } = await supabase
        .from('project_billing')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Billing record deleted successfully');
      fetchBillingRecords();
    } catch (error) {
      console.error('Error deleting billing record:', error);
      toast.error('Failed to delete billing record');
    }
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const d = (iso: string | null) => (iso ? new Date(`${iso.slice(0, 10)}T00:00:00`) : null);
  const owedOf = (r: BillingRecord) => Math.max(0, (Number(r.billed_amount) || 0) - (Number(r.paid_amount) || 0));
  const daysLate = (r: BillingRecord) => {
    const due = d(r.due_date);
    return due && owedOf(r) > 0 ? Math.floor((today.getTime() - due.getTime()) / 86400000) : 0;
  };
  /** Status shown to the user: unpaid bills past their due date read as Overdue even if nobody changed the status. */
  const effectiveStatus = (r: BillingRecord) => {
    if (owedOf(r) <= 0 && (Number(r.billed_amount) || 0) > 0) return 'paid';
    if (daysLate(r) > 0) return 'overdue';
    if ((Number(r.paid_amount) || 0) > 0) return 'partial';
    return (r.status || 'draft').toLowerCase();
  };

  const shown = filteredRecords.filter((r) => statusFilter === 'all' || effectiveStatus(r) === statusFilter);
  const totals = shown.reduce(
    (a, r) => ({
      billed: a.billed + (Number(r.billed_amount) || 0),
      received: a.received + (Number(r.paid_amount) || 0),
      owed: a.owed + owedOf(r),
      overdue: a.overdue + (daysLate(r) > 0 ? owedOf(r) : 0),
      overdueCount: a.overdueCount + (daysLate(r) > 0 ? 1 : 0),
    }),
    { billed: 0, received: 0, owed: 0, overdue: 0, overdueCount: 0 }
  );
  const collectionRate = totals.billed > 0 ? (totals.received / totals.billed) * 100 : 0;
  const aging = [
    { label: 'Not due yet', test: (n: number) => n <= 0, color: 'bg-emerald-500' },
    { label: '1–30 days', test: (n: number) => n >= 1 && n <= 30, color: 'bg-amber-400' },
    { label: '31–60 days', test: (n: number) => n >= 31 && n <= 60, color: 'bg-orange-500' },
    { label: '61–90 days', test: (n: number) => n >= 61 && n <= 90, color: 'bg-rose-500' },
    { label: '90+ days', test: (n: number) => n > 90, color: 'bg-rose-700' },
  ].map((b) => {
    const list = shown.filter((r) => owedOf(r) > 0 && b.test(daysLate(r)));
    return { ...b, amount: list.reduce((s, r) => s + owedOf(r), 0), count: list.length };
  });

  const [paying, setPaying] = useState<BillingRecord | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payDate, setPayDate] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<BillingRecord | null>(null);

  const openPayment = (r: BillingRecord) => {
    setPaying(r);
    setPayAmount(String(owedOf(r)));
    const t = new Date();
    setPayDate(`${t.getFullYear()}-${String(t.getMonth() + 1).padStart(2, '0')}-${String(t.getDate()).padStart(2, '0')}`);
  };

  const savePayment = async () => {
    if (!paying) return;
    const amt = Number(payAmount);
    if (!(amt > 0)) return toast.error('Enter the amount received.');
    const paid = (Number(paying.paid_amount) || 0) + amt;
    const full = paid >= (Number(paying.billed_amount) || 0) - 0.005;
    const { error } = await supabase
      .from('project_billing')
      .update({ paid_amount: paid, payment_date: payDate || null, status: full ? 'paid' : paying.status === 'draft' ? 'sent' : paying.status })
      .eq('id', paying.id);
    if (error) return toast.error(`Couldn't record the payment: ${error.message}`);
    toast.success(full ? `${paying.invoice_number || 'Bill'} is paid in full` : `${money(amt)} recorded`);
    setPaying(null);
    fetchBillingRecords();
  };

  const STATUS_STYLE: Record<string, string> = {
    paid: 'bg-emerald-500/10 text-emerald-700 ring-emerald-500/20 dark:text-emerald-300',
    overdue: 'bg-rose-500/10 text-rose-700 ring-rose-500/20 dark:text-rose-300',
    partial: 'bg-amber-500/10 text-amber-700 ring-amber-500/20 dark:text-amber-300',
    sent: 'bg-blue-500/10 text-blue-700 ring-blue-500/20 dark:text-blue-300',
    draft: 'bg-slate-500/10 text-slate-700 ring-slate-500/20 dark:text-slate-300',
  };

  const columns: DataTableColumn<BillingRecord>[] = [
    {
      id: 'project',
      header: 'Project',
      value: (r) => r.project?.name,
      cell: (r) => (
        <div>
          <Link to={`/projects/${r.project_id}?tab=billing`} className="font-medium hover:text-primary" onClick={(e) => e.stopPropagation()}>
            {r.project?.name}
          </Link>
          <div className="text-xs text-muted-foreground">{[r.invoice_number && `#${r.invoice_number}`, r.project?.client].filter(Boolean).join(' · ')}</div>
        </div>
      ),
    },
    {
      id: 'period',
      header: 'Period',
      value: (r) => r.billing_period_end,
      cell: (r) => (
        <span className="whitespace-nowrap text-sm">
          {d(r.billing_period_start) ? format(d(r.billing_period_start)!, 'MMM d') : '—'} – {d(r.billing_period_end) ? format(d(r.billing_period_end)!, 'MMM d, yyyy') : '—'}
        </span>
      ),
    },
    { id: 'billed', header: 'Billed', align: 'right', value: (r) => r.billed_amount, cell: (r) => <span className="tabular-nums">{money(r.billed_amount)}</span> },
    {
      id: 'paid',
      header: 'Paid',
      value: (r) => (Number(r.billed_amount) ? (Number(r.paid_amount) || 0) / Number(r.billed_amount) : 0),
      cell: (r) => {
        const pct = Number(r.billed_amount) ? Math.min(100, ((Number(r.paid_amount) || 0) / Number(r.billed_amount)) * 100) : 0;
        return (
          <div className="min-w-[110px]">
            <div className="h-1.5 overflow-hidden rounded-full bg-muted">
              <div className={cn('h-full rounded-full', pct >= 100 ? 'bg-emerald-500' : 'bg-blue-600')} style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-1 text-xs tabular-nums text-muted-foreground">{money(r.paid_amount)}</p>
          </div>
        );
      },
    },
    {
      id: 'remaining',
      header: 'Owed',
      align: 'right',
      value: (r) => owedOf(r),
      cell: (r) => <span className={owedOf(r) > 0 ? 'font-semibold tabular-nums' : 'tabular-nums text-muted-foreground'}>{money(owedOf(r))}</span>,
    },
    {
      id: 'due',
      header: 'Due',
      value: (r) => r.due_date,
      cell: (r) => {
        if (!r.due_date) return <span className="text-muted-foreground">—</span>;
        const late = daysLate(r);
        return (
          <div className="whitespace-nowrap">
            <p className="text-sm">{format(d(r.due_date)!, 'MMM d, yyyy')}</p>
            {late > 0 && <p className="text-xs font-medium text-rose-600 dark:text-rose-400">{late} day{late === 1 ? '' : 's'} late</p>}
          </div>
        );
      },
    },
    {
      id: 'status',
      header: 'Status',
      value: (r) => effectiveStatus(r),
      cell: (r) => {
        const st = effectiveStatus(r);
        return <span className={cn('inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize ring-1 ring-inset', STATUS_STYLE[st] || STATUS_STYLE.draft)}>{st}</span>;
      },
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      noExport: true,
      cell: (r) => (
        <div className="flex justify-end gap-1" onClick={(e) => e.stopPropagation()}>
          {owedOf(r) > 0 && (
            <Button size="sm" variant="outline" className="h-8" onClick={() => openPayment(r)}>
              <Banknote className="mr-1 h-3.5 w-3.5" /> Payment
            </Button>
          )}
          <Button size="icon" variant="ghost" className="h-8 w-8" aria-label="Edit" onClick={() => setEditingBilling(r)}>
            <Pencil className="h-4 w-4" />
          </Button>
          <Button size="icon" variant="ghost" className="h-8 w-8 text-destructive hover:text-destructive" aria-label="Delete" onClick={() => setConfirmDelete(r)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <Layout hideTitle title="Billing">
      <div className="space-y-6">
        <PageHero
          eyebrow="Financial"
          title="Billing"
          subtitle="What you've invoiced each client, what's been paid and what's still owed."
          actions={
            <>
              <button type="button" className={heroButtonPrimary} onClick={() => setBillingDialogOpen(true)}>
                <Plus className="h-4 w-4" /> New bill
              </button>
              <Link to="/payment-applications" className={heroButton}>
                <FileTextIcon className="h-4 w-4" /> Payment applications
              </Link>
            </>
          }
          stats={[
            { label: 'Owed to you', value: loading ? '…' : money0(totals.owed), tone: totals.owed ? 'warn' : 'good' },
            { label: 'Past due', value: loading ? '…' : money0(totals.overdue), tone: totals.overdue ? 'bad' : undefined },
          ]}
        />

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          <AccentStat label="Billed" value={money0(totals.billed)} icon={DollarSign} accent="blue" loading={loading} hint={`${shown.length} bill${shown.length === 1 ? '' : 's'}`} />
          <AccentStat label="Received" value={money0(totals.received)} icon={CheckCircle} accent="emerald" loading={loading} hint={`${collectionRate.toFixed(0)}% collected`} />
          <AccentStat label="Owed to you" value={money0(totals.owed)} icon={Wallet} accent="amber" tone={totals.owed ? 'warn' : undefined} loading={loading} hint="Billed minus paid" />
          <AccentStat
            label="Past due"
            value={money0(totals.overdue)}
            icon={AlertTriangle}
            accent="rose"
            tone={totals.overdue ? 'bad' : undefined}
            loading={loading}
            hint={`${totals.overdueCount} bill${totals.overdueCount === 1 ? '' : 's'} past their due date`}
          />
          <button type="button" onClick={() => setStatusFilter(statusFilter === 'overdue' ? 'all' : 'overdue')} className="col-span-2 rounded-xl text-left lg:col-span-1">
            <AccentStat label="Collection rate" value={`${collectionRate.toFixed(0)}%`} icon={TrendingUp} accent="indigo" loading={loading} hint={statusFilter === 'overdue' ? 'Showing past due · click to clear' : 'Click to show past due bills'} />
          </button>
        </div>

        {totals.owed > 0 && (
          <Card className="p-5">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <p className="font-semibold">How late the unpaid money is</p>
              <p className="text-xs text-muted-foreground">Days past the due date</p>
            </div>
            <div className="flex h-3 overflow-hidden rounded-full bg-muted">
              {aging.map((b) => (b.amount ? <div key={b.label} className={b.color} style={{ width: `${(b.amount / totals.owed) * 100}%` }} title={b.label} /> : null))}
            </div>
            <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-5">
              {aging.map((b) => (
                <div key={b.label}>
                  <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className={cn('h-2 w-2 rounded-sm', b.color)} />
                    {b.label}
                  </p>
                  <p className="font-semibold tabular-nums">{money0(b.amount)}</p>
                  <p className="text-xs text-muted-foreground">{b.count} bill{b.count === 1 ? '' : 's'}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        <div className="overflow-x-auto">
          <FinancialDateFilter currentFilter={dateFilter} onFilterChange={setDateFilter} />
        </div>

        <DataTable
          columns={columns}
          rows={shown}
          totalCount={billingRecords.length}
          getRowId={(r) => r.id}
          loading={loading}
          searchPlaceholder="Search project, invoice #…"
          exportFilename="billing"
          initialSort={{ id: 'period', desc: true }}
          onRowClick={(r) => setEditingBilling(r)}
          filters={
            <>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="partial">Partly paid</SelectItem>
                  <SelectItem value="overdue">Past due</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                </SelectContent>
              </Select>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="All projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All projects</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
          }
          footer={(rows) =>
            rows.length ? (
              <>
                <TableCell colSpan={2} className="text-right text-sm text-muted-foreground">
                  Total of {rows.length} shown
                </TableCell>
                <TableCell className="text-right tabular-nums">{money(rows.reduce((s, r) => s + (Number(r.billed_amount) || 0), 0))}</TableCell>
                <TableCell className="tabular-nums">{money(rows.reduce((s, r) => s + (Number(r.paid_amount) || 0), 0))}</TableCell>
                <TableCell className="text-right tabular-nums">{money(rows.reduce((s, r) => s + owedOf(r), 0))}</TableCell>
                <TableCell colSpan={3} />
              </>
            ) : null
          }
          empty={
            <EmptyState
              icon={ReceiptIcon}
              title="Send your first bill"
              description="Billing records track what you've invoiced each client, what they've paid and what's still owed, per project and billing period."
              action={{ label: 'Create your first bill', onClick: () => setBillingDialogOpen(true) }}
              secondaryAction={{ label: 'Use a pay application (AIA)', icon: FileTextIcon, to: '/payment-applications' }}
            />
          }
        />

        <ImprovedBillingDialog open={billingDialogOpen} onOpenChange={setBillingDialogOpen} projects={projects} onSuccess={handleBillingSuccess} />

        {editingBilling && (
          <ImprovedBillingDialog
            open={!!editingBilling}
            onOpenChange={(open) => !open && setEditingBilling(null)}
            billing={{
              id: editingBilling.id,
              project_id: editingBilling.project_id,
              billing_period_start: editingBilling.billing_period_start,
              billing_period_end: editingBilling.billing_period_end,
              billed_amount: editingBilling.billed_amount,
              paid_amount: editingBilling.paid_amount,
              status: editingBilling.status,
              invoice_number: editingBilling.invoice_number,
              invoice_date: editingBilling.invoice_date,
              due_date: editingBilling.due_date,
              notes: editingBilling.notes,
            }}
            projects={projects}
            onSuccess={handleBillingSuccess}
          />
        )}

        <Dialog open={!!paying} onOpenChange={(o) => !o && setPaying(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Record a payment</DialogTitle>
              <DialogDescription>
                {paying?.project?.name}
                {paying?.invoice_number ? ` · #${paying.invoice_number}` : ''} · {paying ? money(owedOf(paying)) : ''} still owed
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Amount received</Label>
                <Input className="mt-1" type="number" inputMode="decimal" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} />
              </div>
              <div>
                <Label>Date received</Label>
                <Input className="mt-1" type="date" value={payDate} onChange={(e) => setPayDate(e.target.value)} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setPaying(null)}>
                Cancel
              </Button>
              <Button onClick={savePayment}>Record payment</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this bill?</AlertDialogTitle>
              <AlertDialogDescription>
                {confirmDelete?.project?.name}
                {confirmDelete?.invoice_number ? ` #${confirmDelete.invoice_number}` : ''} for {confirmDelete ? money(confirmDelete.billed_amount) : ''} will be removed, and project
                billing totals will update.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (confirmDelete) handleDeleteBilling(confirmDelete.id);
                  setConfirmDelete(null);
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
