
import { useState, useEffect } from 'react';
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
  const [projectFilter, setProjectFilter] = useState('all');
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
        .select('id, name, client')
        .is('archived_at', null)
        .order('name');

      if (error) throw error;
      setProjects(data || []);
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
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Layout title="Project Billing" subtitle="Manage billing records across all projects">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <Button onClick={() => setBillingDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add New Billing
            </Button>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Billed</CardTitle>
              <DollarSign className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">${totalBilled.toLocaleString()}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Payments Received</CardTitle>
              <CheckCircle className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">${totalReceived.toLocaleString()}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Outstanding</CardTitle>
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">${totalOutstanding.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row gap-4 items-start lg:items-center">
              <div className="relative flex-1 min-w-[300px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <Input
                  placeholder="Search by project, invoice number, or notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="sent">Sent</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                </SelectContent>
              </Select>

              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All Projects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Projects</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <FinancialDateFilter
                currentFilter={dateFilter}
                onFilterChange={setDateFilter}
              />
            </div>
          </CardContent>
        </Card>

        {/* Results Summary */}
        <div className="text-sm text-gray-600">
          Showing {filteredRecords.length} of {billingRecords.length} billing records
        </div>

        {/* Billing Records Table */}
        <Card>
          <CardHeader>
            <CardTitle>Billing Records</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-48">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
              </div>
            ) : filteredRecords.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No billing records found
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Project</TableHead>
                      <TableHead>Invoice #</TableHead>
                      <TableHead>Period</TableHead>
                      <TableHead>Billed</TableHead>
                      <TableHead>Paid</TableHead>
                      <TableHead>Remaining</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>
                          <div>
                            <div className="font-medium">{record.project?.name}</div>
                            {record.project?.client && (
                              <div className="text-sm text-gray-500">{record.project.client}</div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>{record.invoice_number || '-'}</TableCell>
                        <TableCell>
                          {format(new Date(record.billing_period_start), 'MMM dd')} - {format(new Date(record.billing_period_end), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>${record.billed_amount.toLocaleString()}</TableCell>
                        <TableCell>${record.paid_amount.toLocaleString()}</TableCell>
                        <TableCell>${(record.billed_amount - record.paid_amount).toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge className={getStatusBadgeColor(record.status)}>
                            {record.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {record.due_date ? format(new Date(record.due_date), 'MMM dd, yyyy') : '-'}
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setEditingBilling(record)}
                            >
                              Edit
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => handleDeleteBilling(record.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

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
