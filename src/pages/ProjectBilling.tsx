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
  AlertTriangle
} from 'lucide-react';
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

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(record => record.status.toLowerCase() === statusFilter.toLowerCase());
    }

    // Project filter
    if (projectFilter !== 'all') {
      filtered = filtered.filter(record => record.project_id === projectFilter);
    }

    // Date filter
    if (dateFilter.type === 'range' && dateFilter.startDate && dateFilter.endDate) {
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.billing_period_end);
        return recordDate >= dateFilter.startDate! && recordDate <= dateFilter.endDate!;
      });
    } else if (dateFilter.type === 'year' && dateFilter.value) {
      filtered = filtered.filter(record => {
        const recordYear = new Date(record.billing_period_end).getFullYear();
        return recordYear.toString() === dateFilter.value;
      });
    } else if (dateFilter.type === 'month' && dateFilter.value) {
      filtered = filtered.filter(record => {
        const recordDate = new Date(record.billing_period_end);
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
    if (!confirm('Are you sure you want to delete this billing record?')) {
      return;
    }

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

  const totalBilled = billingRecords.reduce((sum, record) => sum + record.billed_amount, 0);
  const totalReceived = billingRecords.reduce((sum, record) => sum + record.paid_amount, 0);
  const totalOutstanding = totalBilled - totalReceived;

  const getStatusBadgeColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'paid':
        return 'bg-green-100 text-green-800';
      case 'overdue':
        return 'bg-red-100 text-red-800';
      case 'sent':
        return 'bg-blue-100 text-blue-800';
      default:
        return 'bg-muted text-foreground';
    }
  };

  const statusTone: Record<string, 'success' | 'destructive' | 'info'> = {
    paid: 'success',
    overdue: 'destructive',
    sent: 'info',
  };

  const columns: DataTableColumn<BillingRecord>[] = [
    {
      id: 'project',
      header: 'Project',
      value: (r) => r.project?.name,
      cell: (r) => (
        <div>
          <Link to={`/projects/${r.project_id}?tab=billing`} className="font-medium hover:text-primary">{r.project?.name}</Link>
          {r.project?.client && <div className="text-xs text-muted-foreground">{r.project.client}</div>}
        </div>
      ),
    },
    { id: 'invoice', header: 'Invoice #', value: (r) => r.invoice_number, cell: (r) => r.invoice_number || '—' },
    {
      id: 'period',
      header: 'Period',
      value: (r) => r.billing_period_start,
      cell: (r) => (
        <span className="whitespace-nowrap">
          {format(new Date(r.billing_period_start), 'MMM d')} – {format(new Date(r.billing_period_end), 'MMM d, yyyy')}
        </span>
      ),
    },
    { id: 'billed', header: 'Billed', align: 'right', value: (r) => r.billed_amount, cell: (r) => money(r.billed_amount) },
    { id: 'paid', header: 'Paid', align: 'right', value: (r) => r.paid_amount, cell: (r) => money(r.paid_amount) },
    {
      id: 'remaining',
      header: 'Remaining',
      align: 'right',
      value: (r) => r.billed_amount - r.paid_amount,
      cell: (r) => {
        const owed = r.billed_amount - r.paid_amount;
        return <span className={owed > 0 ? 'font-semibold' : 'text-muted-foreground'}>{money(owed)}</span>;
      },
    },
    {
      id: 'status',
      header: 'Status',
      value: (r) => r.status,
      cell: (r) => (
        <Badge variant={statusTone[r.status.toLowerCase()] || 'secondary'} className="capitalize">
          {r.status}
        </Badge>
      ),
    },
    { id: 'due', header: 'Due', value: (r) => r.due_date, cell: (r) => (r.due_date ? format(new Date(r.due_date), 'MMM d, yyyy') : '—') },
    {
      id: 'actions',
      header: '',
      align: 'right',
      cell: (r) => (
        <div className="flex justify-end gap-1">
          <Button size="sm" variant="ghost" onClick={() => setEditingBilling(r)}>Edit</Button>
          <Button size="sm" variant="ghost" className="text-destructive hover:text-destructive" onClick={() => handleDeleteBilling(r.id)}>
            Delete
          </Button>
        </div>
      ),
    },
  ];

  const summary = [
    { label: 'Total billed', value: totalBilled, icon: DollarSign, tone: '' },
    { label: 'Payments received', value: totalReceived, icon: CheckCircle, tone: '' },
    { label: 'Outstanding', value: totalOutstanding, icon: AlertTriangle, tone: totalOutstanding > 0 ? 'text-amber-600 dark:text-amber-400' : '' },
  ];

  return (
    <Layout
      title="Billing"
      subtitle="What you've invoiced each client, what's been paid and what's still owed"
      actions={
        <Button onClick={() => setBillingDialogOpen(true)}>
          <Plus className="w-4 h-4" /> New bill
        </Button>
      }
    >
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {summary.map((s) => (
            <Card key={s.label} className="p-5">
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{s.label}</span>
                <s.icon className="h-4 w-4" />
              </div>
              <div className={`mt-2 text-2xl font-bold tabular-nums ${s.tone}`}>{money(s.value)}</div>
            </Card>
          ))}
        </div>

        <div className="overflow-x-auto">
          <FinancialDateFilter currentFilter={dateFilter} onFilterChange={setDateFilter} />
        </div>

        <DataTable
          columns={columns}
          rows={filteredRecords}
          totalCount={billingRecords.length}
          getRowId={(r) => r.id}
          loading={loading}
          searchPlaceholder="Search project, invoice #…"
          exportFilename="billing"
          initialSort={{ id: 'period', desc: true }}
          filters={
            <>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]"><SelectValue placeholder="All statuses" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="All projects" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All projects</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>{project.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </>
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

        {/* Dialogs */}
        <ImprovedBillingDialog
          open={billingDialogOpen}
          onOpenChange={setBillingDialogOpen}
          projects={projects}
          onSuccess={handleBillingSuccess}
        />

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
              notes: editingBilling.notes
            }}
            projects={projects}
            onSuccess={handleBillingSuccess}
          />
        )}
      </div>
    </Layout>
  );
}
