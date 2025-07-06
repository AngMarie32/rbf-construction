import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Search, Filter, FileText, Download, Edit, Trash2, Eye, DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';
import { CreateExpenseDialog } from '@/components/expenses/CreateExpenseDialog';
import { EditExpenseDialog } from '@/components/expenses/EditExpenseDialog';
import { BulkExpenseDialog } from '@/components/expenses/BulkExpenseDialog';
import { AttachInvoiceDialog } from '@/components/expenses/AttachInvoiceDialog';
import { ViewInvoiceDialog } from '@/components/expenses/ViewInvoiceDialog';
import { VendorAnalysisDialog } from '@/components/expenses/VendorAnalysisDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.vendor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.category.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || expense.status === statusFilter;
    const matchesProject = projectFilter === 'all' || expense.project_id === projectFilter;
    const matchesCategory = categoryFilter === 'all' || expense.category === categoryFilter;

    return matchesSearch && matchesStatus && matchesProject && matchesCategory;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Paid':
        return 'bg-green-100 text-green-800';
      case 'Approved':
        return 'bg-blue-100 text-blue-800';
      case 'Pending Field Approval':
        return 'bg-yellow-100 text-yellow-800';
      case 'Pending Office Approval':
        return 'bg-orange-100 text-orange-800';
      case 'Rejected':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Paid':
        return '✅';
      case 'Approved':
        return '👍';
      case 'Pending Field Approval':
      case 'Pending Office Approval':
        return '⏳';
      case 'Rejected':
        return '❌';
      default:
        return '❓';
    }
  };

  const expenseSummary = filteredExpenses.reduce((acc, expense) => {
    acc.total += expense.amount;
    acc.count += 1;
    if (expense.status === 'Paid') acc.paid += expense.amount;
    if (expense.status === 'Approved') acc.approved += expense.amount;
    if (expense.status.includes('Pending')) acc.pending += expense.amount;
    return acc;
  }, { total: 0, paid: 0, approved: 0, pending: 0, count: 0 });

  const categories = [...new Set(expenses.map(e => e.category))];

  return (
    <Layout title="Expense Management" subtitle="Track and manage project expenses">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-blue-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Expenses</p>
                  <p className="text-xl font-bold">${expenseSummary.total.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-green-600 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-600">Paid</p>
                  <p className="text-xl font-bold text-green-600">${expenseSummary.paid.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-blue-600 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-600">Approved</p>
                  <p className="text-xl font-bold text-blue-600">${expenseSummary.approved.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 bg-yellow-600 rounded-full"></div>
                <div>
                  <p className="text-sm text-gray-600">Pending</p>
                  <p className="text-xl font-bold text-yellow-600">${expenseSummary.pending.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-purple-600" />
                <div>
                  <p className="text-sm text-gray-600">Total Count</p>
                  <p className="text-xl font-bold text-purple-600">{expenseSummary.count}</p>
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
                <Button 
                  onClick={() => setVendorAnalysisOpen(true)}
                  variant="outline"
                  className="bg-purple-50 border-purple-200 text-purple-700 hover:bg-purple-100"
                >
                  <TrendingUp className="w-4 h-4 mr-2" />
                  Vendor Analysis
                </Button>
                <BulkExpenseDialog onExpensesCreated={fetchExpenses} projects={projects} />
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
                      <TableCell className="font-medium">${expense.amount.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(expense.status)}>
                          {getStatusIcon(expense.status)} {expense.status}
                        </Badge>
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
