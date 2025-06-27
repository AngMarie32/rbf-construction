
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

  const handleStatusBadgeClick = (expense: Expense) => {
    const canApprove = expense.status === 'Field Approval' || expense.status === 'Office Approval';
    if (canApprove) {
      const nextStatus = expense.status === 'Field Approval' ? 'Office Approval' : 'Paid';
      updateExpenseStatus(expense.id, nextStatus);
    }
  };

  const filteredExpenses = expenses.filter(expense =>
    (expense.description || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    expense.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expense.vendor?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    expense.receipt_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const fieldApprovalExpenses = filteredExpenses.filter(e => e.status === 'Field Approval');
  const fieldApprovalAmount = fieldApprovalExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
  const fieldApprovalCount = fieldApprovalExpenses.length;
    
  const officeApprovalExpenses = filteredExpenses.filter(e => e.status === 'Office Approval');
  const officeApprovalAmount = officeApprovalExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    
  const paidExpenses = filteredExpenses.filter(e => e.status === 'Paid');
  const paidAmount = paidExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);
    
  const totalAmount = filteredExpenses.reduce((sum, expense) => sum + Number(expense.amount || 0), 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Field Approval': return 'bg-amber-100 text-amber-800 border-amber-200 cursor-pointer hover:bg-amber-200';
      case 'Office Approval': return 'bg-blue-100 text-blue-800 border-blue-200 cursor-pointer hover:bg-blue-200';
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
          <Card className="bg-white border-yellow-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-yellow-700">Field Approval</CardTitle>
              <Clock className="h-5 w-5 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-800">${fieldApprovalAmount.toLocaleString()}</div>
              <p className="text-xs text-yellow-600 mt-1">{fieldApprovalCount} pending approvals</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-blue-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-blue-700">Office Approval</CardTitle>
              <FileText className="h-5 w-5 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-800">${officeApprovalAmount.toLocaleString()}</div>
              <p className="text-xs text-blue-600 mt-1">Awaiting office team</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-green-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-green-700">Paid</CardTitle>
              <CheckCircle className="h-5 w-5 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-800">${paidAmount.toLocaleString()}</div>
              <p className="text-xs text-green-600 mt-1">Completed payments</p>
            </CardContent>
          </Card>

          <Card className="bg-white border-gray-200">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-gray-700">Total Expenses</CardTitle>
              <FileText className="h-5 w-5 text-gray-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-800">${totalAmount.toLocaleString()}</div>
              <p className="text-xs text-gray-600 mt-1">All expenses</p>
            </CardContent>
          </Card>
        </div>

        {/* Compact Filters and Controls - Side by Side */}
        <Card className="bg-white">
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
        <Card className="bg-white">
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
                    <TableCell className="font-semibold">${Number(expense.amount || 0).toLocaleString()}</TableCell>
                    <TableCell>
                      <Badge 
                        className={`${getStatusColor(expense.status)} border`}
                        onClick={() => handleStatusBadgeClick(expense)}
                      >
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
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <span className="sr-only">Open menu</span>
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => handleViewExpense(expense)}>
                            <Eye className="mr-2 h-4 w-4" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditExpense(expense)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleAttachInvoice(expense)}>
                            <Paperclip className="mr-2 h-4 w-4" />
                            Attach Invoice
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDeleteClick(expense.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
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
                <p className="text-gray-500 mb-6">Create your first expense to get started.</p>
                <Button onClick={() => setCreateDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create First Expense
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Dialogs */}
        <CreateExpenseDialog 
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onExpenseCreated={fetchExpenses}
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

        <BulkExpenseDialog
          open={bulkExpenseDialogOpen}
          onOpenChange={setBulkExpenseDialogOpen}
          onExpensesCreated={fetchExpenses}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the expense record.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={() => expenseToDelete && deleteExpense(expenseToDelete)}>
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Expense Details</DialogTitle>
            </DialogHeader>
            {selectedExpense && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium text-gray-500">Date</label>
                    <p className="text-sm">{new Date(selectedExpense.date).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Amount</label>
                    <p className="text-sm font-semibold">${Number(selectedExpense.amount).toLocaleString()}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Category</label>
                    <p className="text-sm">{selectedExpense.category}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <Badge className={`${getStatusColor(selectedExpense.status)} border`}>
                      {selectedExpense.status}
                    </Badge>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Project</label>
                    <p className="text-sm">{selectedExpense.projects.name}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Vendor</label>
                    <p className="text-sm">{selectedExpense.vendor || 'N/A'}</p>
                  </div>
                </div>
                {selectedExpense.description && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Description</label>
                    <p className="text-sm">{selectedExpense.description}</p>
                  </div>
                )}
                {selectedExpense.receipt_number && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Receipt Number</label>
                    <p className="text-sm">{selectedExpense.receipt_number}</p>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setViewDialogOpen(false)}>
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
