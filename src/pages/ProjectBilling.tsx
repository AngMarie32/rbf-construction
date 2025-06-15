
import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Search, 
  Filter, 
  Download, 
  Calendar,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  FileText,
  Edit,
  Trash2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ImprovedBillingDialog } from '@/components/billing/ImprovedBillingDialog';
import { toast } from 'sonner';

interface ProjectBilling {
  id: string;
  project_id: string;
  project_name: string;
  billing_period_start: string;
  billing_period_end: string;
  invoice_number?: string;
  billed_amount: number;
  paid_amount: number;
  remaining_amount: number;
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled';
  invoice_date?: string;
  due_date?: string;
  payment_date?: string;
  notes?: string;
  created_at: string;
}

export default function ProjectBilling() {
  const [billings, setBillings] = useState<ProjectBilling[]>([]);
  const [filteredBillings, setFilteredBillings] = useState<ProjectBilling[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState<string>('all');
  const [projects, setProjects] = useState<any[]>([]);
  const [editingBilling, setEditingBilling] = useState<any>(null);
  const [newBillingDialogOpen, setNewBillingDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);

  useEffect(() => {
    fetchBillings();
    fetchProjects();
  }, []);

  useEffect(() => {
    filterBillings();
  }, [billings, searchTerm, statusFilter, projectFilter, dateFilter]);

  const fetchBillings = async () => {
    try {
      const { data, error } = await supabase
        .from('project_billing')
        .select(`
          *,
          projects!inner(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedBillings: ProjectBilling[] = (data || []).map(billing => ({
        id: billing.id,
        project_id: billing.project_id,
        project_name: billing.projects.name,
        billing_period_start: billing.billing_period_start,
        billing_period_end: billing.billing_period_end,
        invoice_number: billing.invoice_number,
        billed_amount: Number(billing.billed_amount) || 0,
        paid_amount: Number(billing.paid_amount) || 0,
        remaining_amount: Number(billing.billed_amount || 0) - Number(billing.paid_amount || 0),
        status: billing.status as 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled',
        invoice_date: billing.invoice_date,
        due_date: billing.due_date,
        payment_date: billing.payment_date,
        notes: billing.notes,
        created_at: billing.created_at
      }));

      setBillings(mappedBillings);
    } catch (error) {
      console.error('Error fetching billings:', error);
      toast.error('Failed to load billing records');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, client')
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    }
  };

  const deleteBilling = async (id: string) => {
    try {
      const { error } = await supabase
        .from('project_billing')
        .delete()
        .eq('id', id);

      if (error) throw error;

      fetchBillings();
      toast.success('Billing record deleted successfully');
    } catch (error) {
      console.error('Error deleting billing record:', error);
      toast.error('Failed to delete billing record');
    }
  };

  const handleEdit = (billing: any) => {
    console.log('Editing billing:', billing);
    setEditingBilling(billing);
    setEditDialogOpen(true);
  };

  const handleMarkAsPaid = async (billing: any) => {
    try {
      const { error } = await supabase
        .from('project_billing')
        .update({
          paid_amount: billing.billed_amount,
          status: 'Paid',
          payment_date: new Date().toISOString().split('T')[0]
        })
        .eq('id', billing.id);

      if (error) throw error;

      fetchBillings();
      toast.success('Billing marked as paid');
    } catch (error) {
      console.error('Error updating billing:', error);
      toast.error('Failed to update billing');
    }
  };

  const filterBillings = () => {
    let filtered = billings;

    if (searchTerm) {
      filtered = filtered.filter(billing =>
        billing.project_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        billing.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        billing.notes?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(billing => billing.status === statusFilter);
    }

    if (projectFilter !== 'all') {
      filtered = filtered.filter(billing => billing.project_id === projectFilter);
    }

    if (dateFilter !== 'all') {
      const now = new Date();
      filtered = filtered.filter(billing => {
        const billingDate = new Date(billing.billing_period_end);
        switch (dateFilter) {
          case 'thisMonth':
            return billingDate.getMonth() === now.getMonth() && billingDate.getFullYear() === now.getFullYear();
          case 'lastMonth':
            const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1);
            return billingDate.getMonth() === lastMonth.getMonth() && billingDate.getFullYear() === lastMonth.getFullYear();
          case 'thisQuarter':
            const quarter = Math.floor(now.getMonth() / 3);
            const billingQuarter = Math.floor(billingDate.getMonth() / 3);
            return billingQuarter === quarter && billingDate.getFullYear() === now.getFullYear();
          case 'thisYear':
            return billingDate.getFullYear() === now.getFullYear();
          default:
            return true;
        }
      });
    }

    setFilteredBillings(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid': return 'bg-green-500';
      case 'Sent': return 'bg-blue-500';
      case 'Overdue': return 'bg-red-500';
      case 'Draft': return 'bg-gray-500';
      case 'Cancelled': return 'bg-gray-400';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Paid': return <CheckCircle className="w-4 h-4" />;
      case 'Sent': return <Clock className="w-4 h-4" />;
      case 'Overdue': return <AlertTriangle className="w-4 h-4" />;
      case 'Draft': return <FileText className="w-4 h-4" />;
      default: return <FileText className="w-4 h-4" />;
    }
  };

  const calculateTotals = () => {
    return filteredBillings.reduce((acc, billing) => ({
      totalBilled: acc.totalBilled + billing.billed_amount,
      totalPaid: acc.totalPaid + billing.paid_amount,
      totalRemaining: acc.totalRemaining + billing.remaining_amount
    }), { totalBilled: 0, totalPaid: 0, totalRemaining: 0 });
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Project', 'Invoice Number', 'Period Start', 'Period End', 'Billed Amount', 'Paid Amount', 'Remaining', 'Status', 'Due Date'].join(','),
      ...filteredBillings.map(billing => [
        `"${billing.project_name}"`,
        `"${billing.invoice_number || 'N/A'}"`,
        billing.billing_period_start,
        billing.billing_period_end,
        billing.billed_amount,
        billing.paid_amount,
        billing.remaining_amount,
        billing.status,
        billing.due_date || 'N/A'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `project-billing-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const totals = calculateTotals();

  return (
    <Layout title="Project Billing" subtitle="Track billing progress and payments">
      <div className="space-y-6">
        {/* Header with Actions */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div className="flex items-center space-x-4">
            <Button onClick={() => setNewBillingDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add New Billing
            </Button>
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Billed</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                ${totals.totalBilled.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Payments Received</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${totals.totalPaid.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                ${totals.totalRemaining.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row gap-4 items-center">
              <div className="relative flex-1 min-w-[300px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search by project, invoice number, or notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-full"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Sent">Sent</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Overdue">Overdue</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>

              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="Project" />
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

              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Period" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Time</SelectItem>
                  <SelectItem value="thisMonth">This Month</SelectItem>
                  <SelectItem value="lastMonth">Last Month</SelectItem>
                  <SelectItem value="thisQuarter">This Quarter</SelectItem>
                  <SelectItem value="thisYear">This Year</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="text-sm text-gray-600 mt-4">
              Showing {filteredBillings.length} of {billings.length} billing records
            </div>
          </CardContent>
        </Card>

        {/* Billing Table */}
        <Card>
          <CardHeader>
            <CardTitle>Billing Records</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto">
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
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8">
                        Loading billing records...
                      </TableCell>
                    </TableRow>
                  ) : filteredBillings.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                        No billing records found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBillings.map((billing) => (
                      <TableRow key={billing.id}>
                        <TableCell className="font-medium">{billing.project_name}</TableCell>
                        <TableCell>{billing.invoice_number || 'Draft'}</TableCell>
                        <TableCell>
                          {format(new Date(billing.billing_period_start), 'MMM dd')} - {format(new Date(billing.billing_period_end), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>${billing.billed_amount.toLocaleString()}</TableCell>
                        <TableCell className="text-green-600">${billing.paid_amount.toLocaleString()}</TableCell>
                        <TableCell className="text-red-600">${billing.remaining_amount.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge className={`${getStatusColor(billing.status)} text-white flex items-center gap-1 w-fit`}>
                            {getStatusIcon(billing.status)}
                            {billing.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {billing.due_date ? format(new Date(billing.due_date), 'MMM dd, yyyy') : 'N/A'}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-1">
                            {billing.status !== 'Paid' && billing.remaining_amount > 0 && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => handleMarkAsPaid(billing)}
                                className="text-green-600 hover:text-green-700"
                              >
                                Mark Paid
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => handleEdit(billing)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => deleteBilling(billing.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>

        {/* New Billing Dialog */}
        <ImprovedBillingDialog
          open={newBillingDialogOpen}
          onOpenChange={setNewBillingDialogOpen}
          projects={projects}
          onSuccess={fetchBillings}
        />

        {/* Edit Billing Dialog */}
        <ImprovedBillingDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          billing={editingBilling}
          projects={projects}
          onSuccess={fetchBillings}
        />
      </div>
    </Layout>
  );
}
