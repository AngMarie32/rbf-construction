
import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Filter, Download, DollarSign, CheckCircle, AlertTriangle, Clock, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { CreateExpenseDialog } from '@/components/expenses/CreateExpenseDialog';
import { ProjectSelector } from '@/components/layout/ProjectSelector';

interface Expense {
  id: string;
  project_id: string;
  project_name?: string;
  category: string;
  description: string;
  amount: number;
  date: string;
  vendor?: string;
  receipt_number?: string;
  status: string;
  created_at: string;
}

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [filteredExpenses, setFilteredExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

  useEffect(() => {
    if (selectedProject) {
      fetchExpenses();
    } else {
      setExpenses([]);
      setFilteredExpenses([]);
      setLoading(false);
    }
  }, [selectedProject]);

  useEffect(() => {
    filterExpenses();
  }, [expenses, searchTerm, statusFilter, categoryFilter]);

  const fetchExpenses = async () => {
    if (!selectedProject) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          projects!inner(name)
        `)
        .eq('project_id', selectedProject)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedExpenses: Expense[] = (data || []).map(expense => ({
        id: expense.id,
        project_id: expense.project_id,
        project_name: expense.projects?.name,
        category: expense.category,
        description: expense.description,
        amount: expense.amount,
        date: expense.date,
        vendor: expense.vendor,
        receipt_number: expense.receipt_number,
        status: expense.status,
        created_at: expense.created_at
      }));

      setExpenses(mappedExpenses);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const filterExpenses = () => {
    let filtered = expenses;

    if (searchTerm) {
      filtered = filtered.filter(expense =>
        expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.vendor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        expense.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(expense => expense.status === statusFilter);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(expense => expense.category === categoryFilter);
    }

    setFilteredExpenses(filtered);
  };

  const updateExpenseStatus = async (expenseId: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('expenses')
        .update({ status: newStatus })
        .eq('id', expenseId);

      if (error) throw error;

      toast.success(`Expense status updated to ${newStatus}`);
      fetchExpenses();
    } catch (error) {
      console.error('Error updating expense status:', error);
      toast.error('Failed to update expense status');
    }
  };

  const deleteExpense = async (expenseId: string) => {
    if (!confirm('Are you sure you want to delete this expense?')) return;

    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', expenseId);

      if (error) throw error;

      toast.success('Expense deleted successfully');
      fetchExpenses();
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Failed to delete expense');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending Field Approval': return 'bg-yellow-500';
      case 'Pending Office Approval': return 'bg-blue-500';
      case 'Approved': return 'bg-green-500';
      case 'Paid': return 'bg-purple-500';
      case 'Rejected': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Approved':
      case 'Paid': return <CheckCircle className="w-4 h-4" />;
      case 'Rejected': return <AlertTriangle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  const calculateTotals = () => {
    return filteredExpenses.reduce((acc, expense) => ({
      total: acc.total + expense.amount,
      approved: acc.approved + (expense.status === 'Approved' || expense.status === 'Paid' ? expense.amount : 0),
      pending: acc.pending + (expense.status.includes('Pending') ? expense.amount : 0)
    }), { total: 0, approved: 0, pending: 0 });
  };

  const totals = calculateTotals();

  if (!selectedProject) {
    return (
      <Layout title="Expenses" subtitle="Track project expenses and approvals">
        <ProjectSelector
          selectedProject={selectedProject}
          onProjectSelect={setSelectedProject}
          title="Expense Management"
          subtitle="Select a project to view and manage expenses"
        />
      </Layout>
    );
  }

  return (
    <Layout title="Expenses" subtitle="Track project expenses and approvals">
      <div className="space-y-6">
        {/* Project Selector */}
        <Card>
          <CardContent className="pt-6">
            <ProjectSelector
              selectedProject={selectedProject}
              onProjectSelect={setSelectedProject}
              showTitle={false}
            />
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Expenses</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                ${totals.total.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Approved</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${totals.approved.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                ${totals.pending.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Count</CardTitle>
              <AlertTriangle className="h-4 w-4 text-orange-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">
                {filteredExpenses.length}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
          <div className="flex gap-4 flex-1">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
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
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="Pending Field Approval">Pending Field Approval</SelectItem>
                <SelectItem value="Pending Office Approval">Pending Office Approval</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>

            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="Materials">Materials</SelectItem>
                <SelectItem value="Labor">Labor</SelectItem>
                <SelectItem value="Equipment">Equipment</SelectItem>
                <SelectItem value="Travel">Travel</SelectItem>
                <SelectItem value="Office">Office</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <Button onClick={() => setCreateDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            New Expense
          </Button>
        </div>

        {/* Expenses Table */}
        <Card>
          <CardHeader>
            <CardTitle>Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8">
                        Loading expenses...
                      </TableCell>
                    </TableRow>
                  ) : filteredExpenses.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        No expenses found
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredExpenses.map((expense) => (
                      <TableRow key={expense.id}>
                        <TableCell>
                          {format(new Date(expense.date), 'MMM dd, yyyy')}
                        </TableCell>
                        <TableCell>{expense.category}</TableCell>
                        <TableCell>{expense.description}</TableCell>
                        <TableCell>{expense.vendor || 'N/A'}</TableCell>
                        <TableCell className="font-medium">
                          ${expense.amount.toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge className={`${getStatusColor(expense.status)} text-white flex items-center gap-1 w-fit`}>
                            {getStatusIcon(expense.status)}
                            {expense.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            {expense.status === 'Pending Field Approval' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => updateExpenseStatus(expense.id, 'Pending Office Approval')}
                                className="text-blue-600"
                              >
                                Field Approve
                              </Button>
                            )}
                            {expense.status === 'Pending Office Approval' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => updateExpenseStatus(expense.id, 'Approved')}
                                className="text-green-600"
                              >
                                Office Approve
                              </Button>
                            )}
                            {expense.status === 'Approved' && (
                              <Button 
                                size="sm" 
                                variant="outline"
                                onClick={() => updateExpenseStatus(expense.id, 'Paid')}
                                className="text-purple-600"
                              >
                                Mark Paid
                              </Button>
                            )}
                            <Button 
                              size="sm" 
                              variant="outline"
                              onClick={() => deleteExpense(expense.id)}
                              className="text-red-600"
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

        <CreateExpenseDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          projectId={selectedProject}
          onExpenseCreated={fetchExpenses}
        />
      </div>
    </Layout>
  );
}
