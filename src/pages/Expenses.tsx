import { sortProjectsOpenFirst } from '@/utils/projectOrder';
import { useState, useEffect } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { Link } from 'react-router-dom';
import { ScanReceiptDialog } from '@/components/expenses/ScanReceiptDialog';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Download, Edit, Trash2, Eye, TrendingUp, FileText, CheckCircle, XCircle, Paperclip, Clock, Wallet, Hourglass, BadgeCheck, CalendarDays, FileUp } from 'lucide-react';
import { PageHero, heroButton } from '@/components/ui/page-hero';
import { AccentStat } from '@/components/ui/accent-stat';
import { cn } from '@/lib/utils';
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
import { CreateExpenseDialog } from '@/components/expenses/CreateExpenseDialog';
import { EditExpenseDialog } from '@/components/expenses/EditExpenseDialog';
import { BulkExpenseDialog } from '@/components/expenses/BulkExpenseDialog';
import { AttachInvoiceDialog } from '@/components/expenses/AttachInvoiceDialog';
import { ViewInvoiceDialog } from '@/components/expenses/ViewInvoiceDialog';
import { VendorAnalysisDialog } from '@/components/expenses/VendorAnalysisDialog';
import { ImportExpensesDialog } from '@/components/expenses/ImportExpensesDialog';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { fetchAll } from '@/lib/fetchAll';
import { DateRange } from 'react-day-picker';
import { exportToExcel, exportToPDF, exportToCSV } from '@/utils/reportExports';

interface Expense {
  id: string;
  project_id: string;
  amount: number;
  date: string;
  category: string;
  description: string;
  vendor?: string;
  receipt_number?: string;
  status: string;
  created_at: string;
  updated_at: string;
  projects?: {
    name: string;
  };
}

interface Project {
  id: string;
  name: string;
}


/** "2026-11-13" as local midnight; new Date("2026-11-13") is UTC and shows a day early in the US. */
const localDay = (v: string) => new Date(`${String(v).slice(0, 10)}T00:00:00`);
const startOfDayLocal = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());
const endOfDayLocal = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate(), 23, 59, 59, 999);
export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState(new URLSearchParams(window.location.search).get('project') || 'all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [vendorFilter, setVendorFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [attachingInvoice, setAttachingInvoice] = useState<{ id: string; description: string } | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<{ id: string; description: string } | null>(null);
  const [vendorAnalysisOpen, setVendorAnalysisOpen] = useState(false);
  const [sortColumn, setSortColumn] = useState<string>('date');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedExpenses, setSelectedExpenses] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchProjects();
    fetchExpenses();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, status')
        .is('archived_at', null)
        .order('name');

      if (error) throw error;
      setProjects(sortProjectsOpenFirst(data || []));
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    }
  };

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      // Every expense, not just the first 1,000 the API returns per request; newest first.
      const data = await fetchAll<any>('expenses', '*, projects ( name )');
      data.sort((a, b) => String(b.date).localeCompare(String(a.date)) || String(b.created_at || '').localeCompare(String(a.created_at || '')));
      setExpenses(data);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const handleDeleteExpense = (expenseId: string) => setConfirmDeleteId(expenseId);

  const doDeleteExpense = async (expenseId: string) => {

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);

      if (error) throw error;

      setExpenses(prev => prev.filter(expense => expense.id !== expenseId));
      toast.success('Expense deleted successfully');
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Failed to delete expense');
    }
  };

  const handleStatusChange = async (expenseId: string, newStatus: string) => {
    try {
      const { data: saved, error } = await supabase
        .from('expenses')
        .update({ status: newStatus })
        .eq('id', expenseId)
        .select('id');

      if (error) throw error;
      // An update blocked by database permissions returns no error and no rows.
      if (!saved?.length) throw new Error("The status didn't change. Your account may not have permission to approve expenses.");

      setExpenses(prev =>
        prev.map(expense =>
          expense.id === expenseId
            ? { ...expense, status: newStatus }
            : expense
        )
      );

      toast.success(`Marked ${newStatus}`);
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error(error instanceof Error && error.message ? error.message : 'Failed to update status');
    }
  };

  const filteredExpenses = expenses.filter(expense => {
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch =
      expense.description.toLowerCase().includes(searchLower) ||
      expense.vendor?.toLowerCase().includes(searchLower) ||
      expense.category.toLowerCase().includes(searchLower) ||
      expense.projects?.name?.toLowerCase().includes(searchLower) ||
      expense.status.toLowerCase().includes(searchLower) ||
      expense.amount.toString().includes(searchTerm) ||
      expense.receipt_number?.toLowerCase().includes(searchLower) ||
      localDay(expense.date).toLocaleDateString().includes(searchTerm);
    const matchesStatus = statusFilter === 'all' || expense.status === statusFilter || (statusFilter === 'pending' && expense.status.includes('Pending'));
    const matchesProject = projectFilter === 'all' || expense.project_id === projectFilter;
    const matchesCategory = (categoryFilter === 'all' || expense.category === categoryFilter) &&
      (vendorFilter === 'all' || (expense.vendor || '') === vendorFilter);

    let matchesDateRange = true;
    if (dateRange?.from && dateRange?.to) {
      const expenseDate = localDay(expense.date);
      matchesDateRange = expenseDate >= startOfDayLocal(dateRange.from) && expenseDate <= endOfDayLocal(dateRange.to);
    } else if (dateRange?.from) {
      const expenseDate = localDay(expense.date);
      matchesDateRange = expenseDate >= startOfDayLocal(dateRange.from);
    }

    return matchesSearch && matchesStatus && matchesProject && matchesCategory && matchesDateRange;
  }).sort((a, b) => {
    let aValue: any, bValue: any;

    switch (sortColumn) {
      case 'date':
        aValue = new Date(a.date).getTime();
        bValue = new Date(b.date).getTime();
        break;
      case 'project':
        aValue = a.projects?.name || '';
        bValue = b.projects?.name || '';
        break;
      case 'description':
        aValue = a.description.toLowerCase();
        bValue = b.description.toLowerCase();
        break;
      case 'category':
        aValue = a.category.toLowerCase();
        bValue = b.category.toLowerCase();
        break;
      case 'vendor':
        aValue = (a.vendor || '').toLowerCase();
        bValue = (b.vendor || '').toLowerCase();
        break;
      case 'amount':
        aValue = a.amount;
        bValue = b.amount;
        break;
      case 'status':
        aValue = a.status.toLowerCase();
        bValue = b.status.toLowerCase();
        break;
      default:
        aValue = new Date(a.date).getTime();
        bValue = new Date(b.date).getTime();
    }

    if (sortDirection === 'asc') {
      return aValue > bValue ? 1 : -1;
    }
    return aValue < bValue ? 1 : -1;
  });

  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('asc');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'success';
      case 'Approved':
        return 'info';
      case 'Pending Field Approval':
      case 'Pending Office Approval':
        return 'warning';
      case 'Rejected':
        return 'destructive';
      default:
        return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Paid':
        return '$';
      case 'Approved':
        return '✓';
      case 'Pending Field Approval':
      case 'Pending Office Approval':
        return '⏳';
      case 'Rejected':
        return '✗';
      default:
        return '?';
    }
  };

  const expenseSummary = filteredExpenses.reduce((acc, expense) => {
    acc.total += expense.amount;
    if (expense.status === 'Paid') acc.paid += expense.amount;
    if (expense.status === 'Approved') acc.approved += expense.amount;
    if (expense.status.includes('Pending')) acc.pending += expense.amount;
    return acc;
  }, { total: 0, paid: 0, approved: 0, pending: 0 });

  const byCategory = Object.entries(
    filteredExpenses.reduce<Record<string, number>>((acc, e) => ((acc[e.category || 'Other'] = (acc[e.category || 'Other'] || 0) + e.amount), acc), {})
  )
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount);
  const monthKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const now = new Date();
  const thisMonth = monthKey(now);
  const lastMonth = monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1));
  const monthTotal = (k: string) => expenses.filter((e) => String(e.date).slice(0, 7) === k && e.status !== 'Rejected').reduce((s, e) => s + e.amount, 0);
  const spendThisMonth = monthTotal(thisMonth);
  const spendLastMonth = monthTotal(lastMonth);
  const monthDelta = spendLastMonth > 0 ? ((spendThisMonth - spendLastMonth) / spendLastMonth) * 100 : null;
  const topVendors = Object.entries(
    filteredExpenses.reduce<Record<string, number>>((acc, e) => (e.vendor ? ((acc[e.vendor] = (acc[e.vendor] || 0) + e.amount), acc) : acc), {})
  )
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  const categories = [...new Set(expenses.map(e => e.category))];
  const vendors = [...new Set(expenses.map(e => e.vendor).filter((v): v is string => !!v))].sort((a, b) => a.localeCompare(b));

  const toggleSelectAll = () => {
    if (selectedExpenses.size === filteredExpenses.length) {
      setSelectedExpenses(new Set());
    } else {
      setSelectedExpenses(new Set(filteredExpenses.map(e => e.id)));
    }
  };

  const toggleSelectExpense = (id: string) => {
    setSelectedExpenses(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleBulkStatusChange = async (newStatus: string) => {
    if (selectedExpenses.size === 0) return;
    try {
      const ids = Array.from(selectedExpenses);
      for (let i = 0; i < ids.length; i += 100) {
        const { data: saved, error } = await supabase
          .from('expenses')
          .update({ status: newStatus })
          .in('id', ids.slice(i, i + 100))
          .select('id');
        if (error) throw error;
        if (!saved?.length) throw new Error("No expenses changed. Your account may not have permission to approve expenses.");
      }
      setExpenses(prev =>
        prev.map(e => ids.includes(e.id) ? { ...e, status: newStatus } : e)
      );
      setSelectedExpenses(new Set());
      toast.success(`${ids.length} expense(s) updated to ${newStatus}`);
    } catch (error) {
      console.error('Error bulk updating:', error);
      toast.error(error instanceof Error && error.message ? error.message : 'Failed to update expenses');
    }
  };

  const handleExport = (format: 'excel' | 'pdf' | 'csv') => {
    const exportData = {
      title: 'Expense Report',
      data: filteredExpenses.map(expense => ({
        Date: localDay(expense.date).toLocaleDateString(),
        Project: expense.projects?.name || 'Unknown',
        Description: expense.description,
        Category: expense.category,
        Vendor: expense.vendor || 'N/A',
        Amount: `$${expense.amount.toLocaleString()}`,
        Status: expense.status
      })),
      metadata: {
        generatedAt: new Date().toLocaleString(),
        dateRange: dateRange?.from && dateRange?.to
          ? `${dateRange.from.toLocaleDateString()} - ${dateRange.to.toLocaleDateString()}`
          : 'All dates',
        totalExpenses: filteredExpenses.length,
        totalAmount: `$${expenseSummary.total.toLocaleString()}`
      }
    };

    switch (format) {
      case 'excel':
        exportToExcel(exportData);
        break;
      case 'pdf':
        exportToPDF(exportData);
        break;
      case 'csv':
        exportToCSV(exportData);
        break;
    }

    toast.success(`Expense report exported as ${format.toUpperCase()}`);
  };

  const STATUSES = ['Pending Field Approval', 'Pending Office Approval', 'Approved', 'Paid', 'Rejected'];
  const money0 = (n: number) => `$${Math.round(n || 0).toLocaleString()}`;
  const money2 = (n: number) => `$${(n || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const columns: DataTableColumn<Expense>[] = [
    {
      id: 'date',
      header: 'Date',
      value: (e) => e.date,
      cell: (e) => <span className="whitespace-nowrap">{localDay(e.date).toLocaleDateString()}</span>,
    },
    {
      id: 'project',
      header: 'Project',
      value: (e) => e.projects?.name,
      cell: (e) => (
        <Link to={`/projects/${e.project_id}?tab=expenses`} className="font-medium hover:text-primary">
          {e.projects?.name || 'Unknown'}
        </Link>
      ),
    },
    {
      id: 'description',
      header: 'Description',
      value: (e) => e.description,
      cell: (e) => (
        <div className="max-w-[280px]">
          <div className="truncate">{e.description || '—'}</div>
          {e.receipt_number && <div className="text-xs text-muted-foreground">#{e.receipt_number}</div>}
        </div>
      ),
    },
    { id: 'category', header: 'Category', value: (e) => e.category, cell: (e) => <Badge variant="secondary">{e.category}</Badge> },
    { id: 'vendor', header: 'Vendor', value: (e) => e.vendor, cell: (e) => e.vendor || <span className="text-muted-foreground">—</span> },
    { id: 'amount', header: 'Amount', align: 'right', value: (e) => e.amount, cell: (e) => <span className="font-medium">{money2(e.amount)}</span> },
    {
      id: 'status',
      header: 'Status',
      value: (e) => e.status,
      cell: (e) => (
        <Select value={e.status} onValueChange={(newStatus) => handleStatusChange(e.id, newStatus)}>
          <SelectTrigger className="h-auto w-auto border-0 bg-transparent p-0 shadow-none focus:ring-0 [&>svg]:hidden" aria-label="Change status">
            <Badge variant={getStatusColor(e.status) as 'success' | 'warning' | 'destructive' | 'info' | 'secondary'} className="cursor-pointer whitespace-nowrap">
              <span className="mr-1">{getStatusIcon(e.status)}</span>
              {e.status}
            </Badge>
          </SelectTrigger>
          <SelectContent>
            {STATUSES.map((st) => <SelectItem key={st} value={st}>{st}</SelectItem>)}
          </SelectContent>
        </Select>
      ),
    },
    {
      id: 'actions',
      header: '',
      align: 'right',
      cell: (e) => (
        <div className="flex justify-end gap-0.5">
          {e.status.includes('Pending') && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="mr-1 h-8 gap-1 border-emerald-500/40 px-2 text-xs text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
                title={e.status === 'Pending Field Approval' ? 'Field approve (moves to office approval)' : 'Approve'}
                onClick={() => handleStatusChange(e.id, e.status === 'Pending Field Approval' ? 'Pending Office Approval' : 'Approved')}
              >
                <CheckCircle className="h-3.5 w-3.5" /> {e.status === 'Pending Field Approval' ? 'Field OK' : 'Approve'}
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" title="Reject" aria-label="Reject" onClick={() => handleStatusChange(e.id, 'Rejected')}>
                <XCircle className="h-4 w-4" />
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit" aria-label="Edit" onClick={() => setEditingExpense(e)}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Attach invoice" aria-label="Attach invoice" onClick={() => setAttachingInvoice({ id: e.id, description: e.description })}>
            <Paperclip className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="View invoice" aria-label="View invoice" onClick={() => setViewingInvoice({ id: e.id, description: e.description })}>
            <Eye className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" title="Delete" aria-label="Delete" onClick={() => handleDeleteExpense(e.id)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    },
  ];

  const summaryCards = [
    { label: 'Paid', value: expenseSummary.paid, tone: '' },
    { label: 'Approved, not yet paid', value: expenseSummary.approved, tone: '' },
    { label: 'Waiting for approval', value: expenseSummary.pending, tone: expenseSummary.pending > 0 ? 'text-amber-600 dark:text-amber-400' : '' },
  ];

  const pendingCount = expenses.filter((e) => e.status.includes('Pending')).length;

  return (
    <Layout hideTitle title="Expenses">
      <div className="space-y-6">
        <PageHero
          eyebrow="Financial"
          title="Expenses"
          subtitle="Every dollar spent on a job: materials, subs, rentals and permits."
          actions={
            <>
              <CreateExpenseDialog onExpenseCreated={fetchExpenses} projects={projects} />
              <span className="contents [&_button]:border-white/15 [&_button]:bg-white/10 [&_button]:text-white [&_button:hover]:bg-white/20">
                <ScanReceiptDialog onExpenseCreated={fetchExpenses} />
                <BulkExpenseDialog onExpensesCreated={fetchExpenses} projects={projects} />
              </span>
              <button type="button" className={heroButton} onClick={() => setImportOpen(true)}>
                <FileUp className="h-4 w-4" /> Import
              </button>
              <button type="button" className={heroButton} onClick={() => setVendorAnalysisOpen(true)}>
                <TrendingUp className="h-4 w-4" /> Vendor analysis
              </button>
            </>
          }
          stats={[
            { label: 'This month', value: loading ? '…' : money0(spendThisMonth) },
            { label: 'Waiting for approval', value: loading ? '…' : String(pendingCount), tone: pendingCount ? 'warn' : undefined },
          ]}
        />

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          <AccentStat label="Total in view" value={money0(expenseSummary.total)} icon={Wallet} accent="blue" loading={loading} hint={`${filteredExpenses.length} expenses`} />
          <AccentStat label="Paid" value={money0(expenseSummary.paid)} icon={BadgeCheck} accent="emerald" loading={loading} hint="Status: Paid" />
          <AccentStat label="Approved, not paid" value={money0(expenseSummary.approved)} icon={CheckCircle} accent="indigo" loading={loading} hint="Ready to pay" />
          <AccentStat
            label="Waiting for approval"
            value={money0(expenseSummary.pending)}
            icon={Hourglass}
            accent="amber"
            tone={expenseSummary.pending ? 'warn' : undefined}
            loading={loading}
            hint={`${pendingCount} expense${pendingCount === 1 ? '' : 's'}`}
          />
          <AccentStat
            label="Spent this month"
            value={money0(spendThisMonth)}
            icon={CalendarDays}
            accent="orange"
            delta={monthDelta}
            loading={loading}
            hint={`vs ${money0(spendLastMonth)} last month`}
            className="col-span-2 lg:col-span-1"
          />
        </div>

        {byCategory.length > 0 && (
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <Card className="p-5">
              <div className="mb-3 flex items-baseline justify-between gap-2">
                <p className="font-semibold">Spend by category</p>
                <p className="text-xs text-muted-foreground">Click to filter</p>
              </div>
              <div className="space-y-2.5">
                {byCategory.slice(0, 7).map((c) => (
                  <button
                    key={c.name}
                    type="button"
                    onClick={() => setCategoryFilter(categoryFilter === c.name ? 'all' : c.name)}
                    className={cn('block w-full rounded-md px-1 text-left hover:bg-muted/50', categoryFilter === c.name && 'bg-muted')}
                  >
                    <div className="flex justify-between gap-2 text-sm">
                      <span>{c.name}</span>
                      <span className="tabular-nums">
                        {money0(c.amount)} <span className="text-xs text-muted-foreground">{expenseSummary.total ? `${((c.amount / expenseSummary.total) * 100).toFixed(0)}%` : ''}</span>
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                      <div className="h-full rounded-full bg-orange-500" style={{ width: `${(c.amount / (byCategory[0]?.amount || 1)) * 100}%` }} />
                    </div>
                  </button>
                ))}
              </div>
            </Card>
            <Card className="p-5">
              <div className="mb-3 flex items-baseline justify-between gap-2">
                <p className="font-semibold">Top vendors</p>
                <button type="button" className="text-xs text-primary hover:underline" onClick={() => setVendorAnalysisOpen(true)}>
                  Full analysis
                </button>
              </div>
              {topVendors.length ? (
                <ol className="space-y-2.5">
                  {topVendors.map(([name, amt], i) => (
                    <li key={name}>
                      <button
                        type="button"
                        onClick={() => setVendorFilter(vendorFilter === name ? 'all' : name)}
                        className={cn('flex w-full items-center gap-3 rounded-md px-1 py-0.5 text-left text-sm hover:bg-muted/50', vendorFilter === name && 'bg-muted')}
                      >
                        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold">{i + 1}</span>
                        <span className="flex-1 truncate">{name}</span>
                        <span className="font-semibold tabular-nums">{money0(amt)}</span>
                      </button>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className="text-sm text-muted-foreground">No vendors on these expenses.</p>
              )}
            </Card>
          </div>
        )}

        {pendingCount > 0 && statusFilter === 'all' && (
          <button
            type="button"
            onClick={() => setStatusFilter('pending')}
            className="flex w-full items-center gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-left text-sm hover:bg-amber-500/15"
          >
            <Clock className="h-4 w-4 text-amber-600 dark:text-amber-400" />
            <span className="flex-1">
              <strong>{pendingCount}</strong> expense{pendingCount === 1 ? ' is' : 's are'} waiting for approval.
            </span>
            <span className="font-medium text-amber-700 dark:text-amber-300">Review now →</span>
          </button>
        )}

        <DataTable
          columns={columns}
          rows={filteredExpenses}
          totalCount={expenses.length}
          getRowId={(e) => e.id}
          loading={loading}
          searchable={false}
          selectedIds={selectedExpenses}
          onSelectedIdsChange={setSelectedExpenses}
          bulkActions={
            <>
              <Button size="sm" variant="outline" onClick={() => handleBulkStatusChange('Approved')}>
                <CheckCircle className="w-4 h-4" /> Approve
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleBulkStatusChange('Paid')}>
                Mark paid
              </Button>
              <Button size="sm" variant="outline" onClick={() => handleBulkStatusChange('Rejected')}>
                <XCircle className="w-4 h-4" /> Reject
              </Button>
              <Select onValueChange={handleBulkStatusChange}>
                <SelectTrigger className="h-9 w-48"><SelectValue placeholder="Set status to…" /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((st) => <SelectItem key={st} value={st}>{st}</SelectItem>)}
                </SelectContent>
              </Select>
            </>
          }
          filters={
            <>
              <div className="relative w-full sm:w-60">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input placeholder="Search expenses…" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="pl-9" />
              </div>
              <DatePickerWithRange date={dateRange} onDateChange={setDateRange} className="w-auto" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-44"><SelectValue placeholder="All statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="pending">Waiting for approval</SelectItem>
                  <SelectItem value="Pending Field Approval">Pending field</SelectItem>
                  <SelectItem value="Pending Office Approval">Pending office</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-44"><SelectValue placeholder="All projects" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All projects</SelectItem>
                  {projects.map((project) => <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-40"><SelectValue placeholder="All categories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All categories</SelectItem>
                  {categories.map((category) => <SelectItem key={category} value={category}>{category}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={vendorFilter} onValueChange={(v) => { setVendorFilter(v); setSortColumn('vendor'); setSortDirection('asc'); }}>
                <SelectTrigger className="w-40"><SelectValue placeholder="All vendors" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All vendors</SelectItem>
                  {vendors.map((v) => <SelectItem key={v} value={v}>{v}</SelectItem>)}
                </SelectContent>
              </Select>
            </>
          }
          toolbarEnd={
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4" /> Export
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport('excel')}>Excel (.xlsx)</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('pdf')}>PDF</DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('csv')}>CSV</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          }
          footer={(rows) => (
            <>
              <TableCell colSpan={5} className="text-right text-sm text-muted-foreground">Total of {rows.length} shown</TableCell>
              <TableCell className="text-right tabular-nums">{money2(rows.reduce((sum, e) => sum + e.amount, 0))}</TableCell>
              <TableCell colSpan={2} />
            </>
          )}
          empty={
            <EmptyState
              icon={TrendingUp}
              title="Record your first job cost"
              description="Expenses are every dollar spent on a job: materials, subcontractor invoices, equipment rental, permits. Tie each one to a project to see true job profit."
              actionSlot={<CreateExpenseDialog onExpenseCreated={fetchExpenses} projects={projects} />}
              secondaryAction={{ label: 'Import from QuickBooks report', icon: FileText, to: '/report-import' }}
              steps={['Add costs one at a time or in bulk', 'Attach the receipt or invoice', 'Watch job profit update on the project']}
            />
          }
        />

        {importOpen && (
          <ImportExpensesDialog onExpensesImported={fetchExpenses} projects={projects} open={importOpen} onOpenChange={setImportOpen} />
        )}

        <AlertDialog open={!!confirmDeleteId} onOpenChange={(o) => !o && setConfirmDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this expense?</AlertDialogTitle>
              <AlertDialogDescription>
                {(() => {
                  const e = expenses.find((x) => x.id === confirmDeleteId);
                  return e ? `"${e.description}" (${money2(e.amount)}) will be removed and job costs will update.` : '';
                })()}
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  if (confirmDeleteId) doDeleteExpense(confirmDeleteId);
                  setConfirmDeleteId(null);
                }}
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Dialogs */}
        {editingExpense && (
          <EditExpenseDialog
            expense={editingExpense}
            projects={projects}
            onExpenseUpdated={fetchExpenses}
            onClose={() => setEditingExpense(null)}
          />
        )}

        {attachingInvoice && (
          <AttachInvoiceDialog
            open={!!attachingInvoice}
            onOpenChange={(open) => !open && setAttachingInvoice(null)}
            expenseId={attachingInvoice.id}
            expenseDescription={attachingInvoice.description}
            onInvoiceAttached={fetchExpenses}
          />
        )}

        {viewingInvoice && (
          <ViewInvoiceDialog
            open={!!viewingInvoice}
            onOpenChange={(open) => !open && setViewingInvoice(null)}
            expenseId={viewingInvoice.id}
            expenseDescription={viewingInvoice.description}
          />
        )}

        <VendorAnalysisDialog
          open={vendorAnalysisOpen}
          onOpenChange={setVendorAnalysisOpen}
          projects={projects}
        />
      </div>
    </Layout>
  );
}
