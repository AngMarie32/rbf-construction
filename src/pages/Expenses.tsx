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
  TableRow 
} from '@/components/ui/table';
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { 
  Search, 
  Plus, 
  FileText, 
  CheckCircle, 
  X, 
  Download, 
  Paperclip, 
  Edit, 
  Eye,
  Trash2,
  Clock,
  Check,
  MoreHorizontal,
  Undo
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CreateExpenseDialog } from '@/components/expenses/CreateExpenseDialog';
import { EditExpenseDialog } from '@/components/expenses/EditExpenseDialog';
import { AttachInvoiceDialog } from '@/components/expenses/AttachInvoiceDialog';
import { ViewInvoiceDialog } from '@/components/expenses/ViewInvoiceDialog';
import { BulkExpenseDialog } from '@/components/expenses/BulkExpenseDialog';

interface Expense {
  id: string;
  project_id: string;
  description: string;
  category: string;
  amount: number;
  date: string;
  status: string;
  vendor: string | null;
  receipt_number: string | null;
  projects: {
    name: string;
    status: string;
  };
}

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [expenseToDelete, setExpenseToDelete] = useState<string | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [expenseToEdit, setExpenseToEdit] = useState<Expense | null>(null);
  const [attachInvoiceDialogOpen, setAttachInvoiceDialogOpen] = useState(false);
  const [expenseForInvoice, setExpenseForInvoice] = useState<Expense | null>(null);
  const [viewInvoiceDialogOpen, setViewInvoiceDialogOpen] = useState(false);
  const [expenseForViewInvoice, setExpenseForViewInvoice] = useState<Expense | null>(null);
  const [bulkExpenseDialogOpen, setBulkExpenseDialogOpen] = useState(false);

  useEffect(() => {
    fetchProjects();
    fetchExpenses();
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [selectedProject, statusFilter]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, status')
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
      let query = supabase
        .from('expenses')
        .select(`
          *,
          projects (name, status)
        `)
        .order('date', { ascending: false });

      if (selectedProject !== 'all') {
        query = query.eq('project_id', selectedProject);
      }

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter);
      }

      const { data, error } = await query;

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

  const updateExpenseStatus = async (id: string, newStatus: string) => {
    console.log('Updating expense status:', { id, newStatus });
    
    try {
      const { error } = await supabase
        .from('expenses')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      console.log('Status updated successfully');
      toast.success(`Expense ${newStatus.toLowerCase()}`);
      
      // Refresh the expenses list to update tiles
      await fetchExpenses();
    } catch (error) {
      console.error('Error updating expense:', error);
      toast.error('Failed to update expense status');
    }
  };

  const deleteExpense = async (id: string) => {
    try {
      const { error } = await supabase
        .from('expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Expense deleted successfully');
      setDeleteDialogOpen(false);
      setExpenseToDelete(null);
      fetchExpenses();
    } catch (error) {
      console.error('Error deleting expense:', error);
      toast.error('Failed to delete expense');
    }
  };

  const undoApproval = async (id: string, currentStatus: string) => {
    let previousStatus = 'Field Approval';
    
    if (currentStatus === 'Office Approval') {
      previousStatus = 'Field Approval';
    } else if (currentStatus === 'Paid') {
      previousStatus = 'Office Approval';
    }
    
    await updateExpenseStatus(id, previousStatus);
  };

  const handleViewExpense = (expense: Expense) => {
    console.log('Viewing expense:', expense);
    setSelectedExpense(expense);
    setViewDialogOpen(true);
  };

  const handleEditExpense = (expense: Expense) => {
    console.log('Editing expense:', expense);
    setExpenseToEdit(expense);
    setEditDialogOpen(true);
  };

  const handleAttachInvoice = (expense: Expense) => {
    console.log('Attaching invoice for expense:', expense);
    setExpenseForInvoice(expense);
    setAttachInvoiceDialogOpen(true);
  };

  const handleViewInvoice = (expense: Expense) => {
    console.log('Viewing invoice for expense:', expense);
    setExpenseForViewInvoice(expense);
    setViewInvoiceDialogOpen(true);
  };

  const handleDeleteClick = (expenseId: string) => {
    setExpenseToDelete(expenseId);
    setDeleteDialogOpen(true);
  };

  const filteredExpenses = expenses.filter(expense =>
    (expense.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    expense.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expense.vendor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expense.receipt_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const fieldApprovalExpenses = filteredExpenses.filter(e => e.status === 'Field Approval').reduce((sum, expense) => sum + expense.amount, 0);
  const officeApprovalExpenses = filteredExpenses.filter(e => e.status === 'Office Approval').reduce((sum, expense) => sum + expense.amount, 0);
  const paidExpenses = filteredExpenses.filter(e => e.status === 'Paid').reduce((sum, expense) => sum + expense.amount, 0);
  const totalExpenses = filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Field Approval': return 'bg-amber-100 text-amber-800 border-amber-200';
      case 'Office Approval': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Paid': return 'bg-green-100 text-green-800 border-green-200';
      case 'Rejected': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const canApprove = (status: string) => {
    return status === 'Field Approval' || status === 'Office Approval';
  };

  const canReject = (status: string) => {
    return status === 'Field Approval' || status === 'Office Approval';
  };

  const canUndo = (status: string) => {
    return status === 'Office Approval' || status === 'Paid';
  };

  const getNextStatus = (currentStatus: string) => {
    switch (currentStatus) {
      case 'Field Approval': return 'Office Approval';
      case 'Office Approval': return 'Paid';
      default: return null;
    }
  };

  const getApprovalButtonText = (status: string) => {
    switch (status) {
      case 'Field Approval': return 'Approve for Office';
      case 'Office Approval': return 'Mark as Paid';
      default: return 'Approve';
    }
  };

  const handleExport = () => {
    const csvContent = [
      ['Date', 'Project', 'Vendor', 'Category', 'Description', 'Amount', 'Status'],
      ...filteredExpenses.map(expense => [
        new Date(expense.date).toLocaleDateString(),
        expense.projects.name,
        expense.vendor || '',
        expense.category,
        expense.description || '',
        expense.amount.toString(),
        expense.status
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = window.document.createElement('a');
    a.href = url;
    a.download = 'expenses.csv';
    window.document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    window.document.body.removeChild(a);
    toast.success('Expenses exported successfully');
  };

  if (loading) {
    return (
      <Layout title="Expenses" subtitle="Manage and track all project expenses">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Expenses" subtitle="Manage and track all project expenses">
      <div className="space-y-6">
        {/* Summary Dashboard */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-yellow-700">Field Approval</CardTitle>
              <Clock className="h-5 w-5 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-800">${fieldApprovalExpenses.toLocaleString()}</div>
              <p className="text-xs text-yellow-600 mt-1">Awaiting field team</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">Office Approval</CardTitle>
              <FileText className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-800">${officeApprovalExpenses.toLocaleString()}</div>
              <p className="text-xs text-blue-600 mt-1">Awaiting office team</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-700">Paid</CardTitle>
              <CheckCircle className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-800">${paidExpenses.toLocaleString()}</div>
              <p className="text-xs text-green-600 mt-1">Completed payments</p>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-gray-50 to-gray-100 border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Total Expenses</CardTitle>
              <FileText className="h-5 w-5 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-800">${totalExpenses.toLocaleString()}</div>
              <p className="text-xs text-gray-600 mt-1">All expenses</p>
            </CardContent>
          </Card>
        </div>

        {/* Compact Filters and Controls - Side by Side */}
        <Card>
          <CardContent className="pt-6">
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 items-center mb-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search expenses..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="Field Approval">Field Approval</SelectItem>
                  <SelectItem value="Office Approval">Office Approval</SelectItem>
                  <SelectItem value="Paid">Paid</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
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

              <div className="flex gap-2">
                <Button variant="outline" onClick={handleExport} size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <Button onClick={() => setBulkExpenseDialogOpen(true)} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Bulk Entry
                </Button>
                <Button onClick={() => setCreateDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700" size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Expense
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Expenses Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>DATE</TableHead>
                  <TableHead>PROJECT</TableHead>
                  <TableHead>VENDOR</TableHead>
                  <TableHead>CATEGORY</TableHead>
                  <TableHead>DESCRIPTION</TableHead>
                  <TableHead>AMOUNT</TableHead>
                  <TableHead>STATUS</TableHead>
                  <TableHead>APPROVAL</TableHead>
                  <TableHead>ACTIONS</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredExpenses.map((expense) => (
                  <TableRow key={expense.id} className="hover:bg-gray-50">
                    <TableCell>{new Date(expense.date).toLocaleDateString()}</TableCell>
                    <TableCell>{expense.projects.name}</TableCell>
                    <TableCell>{expense.vendor || '-'}</TableCell>
                    <TableCell>{expense.category}</TableCell>
                    <TableCell className="font-medium">{expense.description || ''}</TableCell>
                    <TableCell className="font-semibold">${expense.amount.toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge className={`${getStatusColor(expense.status)} border`}>
                        {expense.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        {/* Approval Actions - Only show if can approve */}
                        {canApprove(expense.status) && (
                          <Button 
                            size="sm"
                            onClick={() => {
                              const nextStatus = getNextStatus(expense.status);
                              if (nextStatus) {
                                updateExpenseStatus(expense.id, nextStatus);
                              }
                            }}
                            className="bg-green-600 hover:bg-green-700 text-white h-6 px-2 text-xs"
                          >
                            <Check className="w-3 h-3 mr-1" />
                            Approve
                          </Button>
                        )}
                        
                        {/* Reject Button - Only show if can reject */}
                        {canReject(expense.status) && (
                          <Button 
                            size="sm"
                            variant="destructive"
                            onClick={() => updateExpenseStatus(expense.id, 'Rejected')}
                            className="h-6 px-2 text-xs"
                          >
                            <X className="w-3 h-3 mr-1" />
                            Reject
                          </Button>
                        )}

                        {/* Undo Button - Only show if can undo */}
                        {canUndo(expense.status) && (
                          <Button 
                            size="sm"
                            variant="outline"
                            onClick={() => undoApproval(expense.id, expense.status)}
                            className="h-6 px-2 text-xs"
                          >
                            <Undo className="w-3 h-3 mr-1" />
                            Undo
                          </Button>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      {/* Nested Actions Menu */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" size="sm" className="h-7 w-7 p-0">
                            <MoreHorizontal className="w-3 h-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem 
                            onClick={() => handleViewExpense(expense)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleEditExpense(expense)}
                          >
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleViewInvoice(expense)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Invoice
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            onClick={() => handleAttachInvoice(expense)}
                          >
                            <Paperclip className="w-4 h-4 mr-2" />
                            Attach Invoice
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            className="text-red-600 focus:text-red-600"
                            onClick={() => handleDeleteClick(expense.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            
            {filteredExpenses.length === 0 && (
              <div className="text-center py-12">
                <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No expenses found</h3>
                <p className="text-gray-500 mb-6">Start tracking your project expenses.</p>
                <Button onClick={() => setCreateDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Expense
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <CreateExpenseDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onExpenseCreated={fetchExpenses}
        />

        <BulkExpenseDialog
          open={bulkExpenseDialogOpen}
          onOpenChange={setBulkExpenseDialogOpen}
          onExpensesCreated={fetchExpenses}
        />

        <EditExpenseDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          expense={expenseToEdit}
          onExpenseUpdated={fetchExpenses}
        />

        <AttachInvoiceDialog
          open={attachInvoiceDialogOpen}
          onOpenChange={setAttachInvoiceDialogOpen}
          expenseId={expenseForInvoice?.id || null}
          expenseDescription={expenseForInvoice?.description || ''}
          onInvoiceAttached={fetchExpenses}
        />

        <ViewInvoiceDialog
          open={viewInvoiceDialogOpen}
          onOpenChange={setViewInvoiceDialogOpen}
          expenseId={expenseForViewInvoice?.id || null}
          expenseDescription={expenseForViewInvoice?.description || ''}
        />

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Expense</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete this expense? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => {
                setDeleteDialogOpen(false);
                setExpenseToDelete(null);
              }}>
                Cancel
              </AlertDialogCancel>
              <AlertDialogAction 
                onClick={() => {
                  if (expenseToDelete) {
                    deleteExpense(expenseToDelete);
                  }
                }}
                className="bg-red-600 hover:bg-red-700"
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
