import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Search, Filter, FileText, Download, Edit, Trash2, Eye, DollarSign, TrendingUp, AlertTriangle, Calendar, MoreHorizontal } from 'lucide-react';
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

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [projectFilter, setProjectFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [attachingInvoice, setAttachingInvoice] = useState<{ id: string; description: string } | null>(null);
  const [viewingInvoice, setViewingInvoice] = useState<{ id: string; description: string } | null>(null);
  const [vendorAnalysisOpen, setVendorAnalysisOpen] = useState(false);

  useEffect(() => {
    fetchProjects();
    fetchExpenses();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    }
  };

  const fetchExpenses = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          projects (
            name
          )
        `)
        .order('date', { ascending: false });

      if (error) throw error;
      console.log('Fetched expenses:', data);
      setExpenses(data || []);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteExpense = async (expenseId: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

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
      const { error } = await supabase
        .from('expenses')
        .update({ status: newStatus })
        .eq('id', expenseId);

      if (error) throw error;

      setExpenses(prev => 
        prev.map(expense => 
          expense.id === expenseId 
            ? { ...expense, status: newStatus }
            : expense
        )
      );
      
      toast.success('Status updated successfully');
    } catch (error) {
      console.error('Error updating status:', error);
      toast.error('Failed to update status');
    }
  };

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.vendor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || expense.status === statusFilter;
    const matchesProject = projectFilter === 'all' || expense.project_id === projectFilter;
    const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;
    
    let matchesDateRange = true;
    if (dateRange?.from && dateRange?.to) {
      const expenseDate = new Date(expense.date);
      matchesDateRange = expenseDate >= dateRange.from && expenseDate <= dateRange.to;
    } else if (dateRange?.from) {
      const expenseDate = new Date(expense.date);
      matchesDateRange = expenseDate >= dateRange.from;
    }

    return matchesSearch && matchesStatus && matchesProject && matchesCategory && matchesDateRange;
  });

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

  const categories = [...new Set(expenses.map(e => e.category))];

  const handleExport = (format: 'excel' | 'pdf' | 'csv') => {
    const exportData = {
      title: 'Expense Report',
      data: filteredExpenses.map(expense => ({
        Date: new Date(expense.date).toLocaleDateString(),
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

  return (
    <Layout title="Expense Management" subtitle="Track and manage project expenses">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-primary/10 rounded-lg">
                  <DollarSign className="w-6 h-6 text-primary" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Paid</p>
                  <p className="text-2xl font-bold">${expenseSummary.paid.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-secondary/10 rounded-lg">
                  <AlertTriangle className="w-6 h-6 text-secondary-foreground" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Approved</p>
                  <p className="text-2xl font-bold">${expenseSummary.approved.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <div className="p-3 bg-muted rounded-lg">
                  <FileText className="w-6 h-6 text-muted-foreground" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-muted-foreground">Pending</p>
                  <p className="text-2xl font-bold">${expenseSummary.pending.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Actions and Filters */}
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Expense Records
              </CardTitle>
              <div className="flex gap-2">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="outline">
                      <MoreHorizontal className="w-4 h-4 mr-2" />
                      More Actions
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent>
                    <DropdownMenuItem onClick={() => handleExport('excel')}>
                      <Download className="w-4 h-4 mr-2" />
                      Export Excel
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('pdf')}>
                      <Download className="w-4 h-4 mr-2" />
                      Export PDF
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleExport('csv')}>
                      <Download className="w-4 h-4 mr-2" />
                      Export CSV
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <div className="w-full">
                        <ImportExpensesDialog onExpensesImported={fetchExpenses} projects={projects} />
                      </div>
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
                <BulkExpenseDialog onExpensesCreated={fetchExpenses} projects={projects} />
                <Button 
                  onClick={() => setVendorAnalysisOpen(true)}
                  variant="outline"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Vendor Analysis
                </Button>
                <CreateExpenseDialog onExpenseCreated={fetchExpenses} projects={projects} />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Filters */}
            <div className="flex gap-4 items-center flex-wrap">
              <div className="relative flex-1 min-w-64">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search expenses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              
              <DatePickerWithRange
                date={dateRange}
                onDateChange={setDateRange}
                className="w-auto"
              />
              
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Pending Field Approval">Pending Field</SelectItem>
                  <SelectItem value="Pending Office Approval">Pending Office</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>

              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by project" />
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

              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Expenses Table */}
            {loading ? (
              <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                      <TableCell>{expense.projects?.name || 'Unknown'}</TableCell>
                      <TableCell>{expense.description}</TableCell>
                      <TableCell>{expense.category}</TableCell>
                      <TableCell>{expense.vendor || 'N/A'}</TableCell>
                      <TableCell className="font-medium">${expense.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                      <TableCell>
                        <Select value={expense.status} onValueChange={(newStatus) => handleStatusChange(expense.id, newStatus)}>
                          <SelectTrigger className="w-auto border-0 bg-transparent p-0">
                            <Badge variant={getStatusColor(expense.status) as any} className="cursor-pointer px-3 py-1 font-medium">
                              <span className="mr-1">{getStatusIcon(expense.status)}</span>
                              {expense.status}
                            </Badge>
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Pending Field Approval">Pending Field Approval</SelectItem>
                            <SelectItem value="Pending Office Approval">Pending Office Approval</SelectItem>
                            <SelectItem value="Approved">Approved</SelectItem>
                            <SelectItem value="Paid">Paid</SelectItem>
                            <SelectItem value="Rejected">Rejected</SelectItem>
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setEditingExpense(expense)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setAttachingInvoice({ id: expense.id, description: expense.description })}
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setViewingInvoice({ id: expense.id, description: expense.description })}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleDeleteExpense(expense.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

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
