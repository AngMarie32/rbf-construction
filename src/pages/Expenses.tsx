
import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Plus, 
  Calendar as CalendarIcon, 
  Edit, 
  FileText, 
  DollarSign, 
  Download, 
  Upload, 
  Clock, 
  CheckCircle, 
  AlertTriangle, 
  MoreHorizontal,
  Eye,
  Trash2,
  Paperclip
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format, startOfMonth, endOfMonth, startOfYear, endOfYear, subMonths } from 'date-fns';
import { cn } from '@/lib/utils';
import { DateRange } from 'react-day-picker';

interface Expense {
  id: string;
  invoiceNumber: string;
  vendor: string;
  project: string;
  projectId?: string;
  category: string;
  amount: number;
  invoiceDate: Date;
  dueDate?: Date;
  status: 'Pending' | 'Field Approved' | 'Office Approved' | 'Paid';
  notes?: string;
  documentUrl?: string;
}

interface Project {
  id: string;
  name: string;
}

const STATUS_OPTIONS = [
  { value: 'Pending', label: 'Pending', color: 'bg-gray-500', icon: Clock },
  { value: 'Field Approved', label: 'Field Approved', color: 'bg-yellow-500', icon: CheckCircle },
  { value: 'Office Approved', label: 'Office Approved', color: 'bg-blue-500', icon: CheckCircle },
  { value: 'Paid', label: 'Paid', color: 'bg-green-500', icon: CheckCircle }
];

const CATEGORY_OPTIONS = [
  'Materials',
  'Labor',
  'Equipment',
  'Permits',
  'Utilities',
  'Subcontractor',
  'Other'
];

const DATE_FILTER_OPTIONS = [
  { value: 'all', label: 'All Time' },
  { value: 'thisMonth', label: 'This Month' },
  { value: 'lastMonth', label: 'Last Month' },
  { value: 'thisYear', label: 'This Year' },
  { value: 'custom', label: 'Custom Range' }
];

export default function Expenses() {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  const [projectFilter, setProjectFilter] = useState('All Projects');
  const [dateFilter, setDateFilter] = useState('all');
  const [customDateRange, setCustomDateRange] = useState<DateRange | undefined>();
  const [showCustomDatePicker, setShowCustomDatePicker] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);
  
  const [newExpense, setNewExpense] = useState({
    invoiceNumber: '',
    vendor: '',
    project: '',
    category: '',
    amount: '',
    invoiceDate: new Date(),
    dueDate: null as Date | null,
    status: 'Pending' as 'Pending' | 'Field Approved' | 'Office Approved' | 'Paid',
    notes: ''
  });

  useEffect(() => {
    fetchExpenses();
    fetchProjects();
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
        .from('invoices')
        .select(`
          *,
          projects (name)
        `)
        .order('invoice_date', { ascending: false });

      if (error) throw error;

      const mappedExpenses: Expense[] = (data || []).map((invoice) => ({
        id: invoice.id,
        invoiceNumber: invoice.invoice_number,
        vendor: invoice.client_name,
        project: invoice.projects?.name || 'No Project',
        projectId: invoice.project_id,
        category: 'Materials', // Default for now
        amount: invoice.total_amount,
        invoiceDate: new Date(invoice.invoice_date),
        dueDate: invoice.due_date ? new Date(invoice.due_date) : undefined,
        status: invoice.status as Expense['status'],
        notes: invoice.notes
      }));

      setExpenses(mappedExpenses);
    } catch (error) {
      console.error('Error fetching expenses:', error);
      toast.error('Failed to load expenses');
    } finally {
      setLoading(false);
    }
  };

  const updateExpenseStatus = async (expenseId: string, newStatus: Expense['status']) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .update({ status: newStatus })
        .eq('id', expenseId);

      if (error) throw error;

      // Update local state
      setExpenses(prev => prev.map(exp => 
        exp.id === expenseId ? { ...exp, status: newStatus } : exp
      ));

      toast.success(`Expense ${newStatus.toLowerCase()}`);
    } catch (error) {
      console.error('Error updating expense status:', error);
      toast.error('Failed to update expense status');
    }
  };

  const handleStatusIconClick = (expense: Expense) => {
    const currentIndex = STATUS_OPTIONS.findIndex(s => s.value === expense.status);
    if (currentIndex < STATUS_OPTIONS.length - 1) {
      const nextStatus = STATUS_OPTIONS[currentIndex + 1].value as Expense['status'];
      updateExpenseStatus(expense.id, nextStatus);
    }
  };

  const saveExpense = async () => {
    if (!newExpense.invoiceNumber || !newExpense.vendor || !newExpense.amount) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      const expenseData = {
        invoice_number: newExpense.invoiceNumber,
        client_name: newExpense.vendor,
        project_id: newExpense.project || null,
        invoice_date: newExpense.invoiceDate.toISOString().split('T')[0],
        due_date: newExpense.dueDate?.toISOString().split('T')[0] || null,
        total_amount: parseFloat(newExpense.amount),
        subtotal: parseFloat(newExpense.amount),
        tax_amount: 0,
        status: newExpense.status,
        notes: newExpense.notes || null
      };

      if (editingExpense) {
        const { error } = await supabase
          .from('invoices')
          .update(expenseData)
          .eq('id', editingExpense.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('invoices')
          .insert(expenseData);

        if (error) throw error;
      }

      toast.success(editingExpense ? 'Expense updated successfully' : 'Expense created successfully');
      setDialogOpen(false);
      setEditingExpense(null);
      resetForm();
      fetchExpenses();
    } catch (error) {
      console.error('Error saving expense:', error);
      toast.error('Failed to save expense');
    }
  };

  const deleteExpense = async (expenseId: string) => {
    try {
      const { error } = await supabase
        .from('invoices')
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

  const editExpense = (expense: Expense) => {
    setEditingExpense(expense);
    setNewExpense({
      invoiceNumber: expense.invoiceNumber,
      vendor: expense.vendor,
      project: expense.projectId || '',
      category: expense.category,
      amount: expense.amount.toString(),
      invoiceDate: expense.invoiceDate,
      dueDate: expense.dueDate || null,
      status: expense.status,
      notes: expense.notes || ''
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setNewExpense({
      invoiceNumber: '',
      vendor: '',
      project: '',
      category: '',
      amount: '',
      invoiceDate: new Date(),
      dueDate: null,
      status: 'Pending',
      notes: ''
    });
    setUploadedFile(null);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setUploadedFile(file);
      toast.success('File uploaded successfully');
    }
  };

  const handleFileDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const file = event.dataTransfer.files[0];
    if (file) {
      setUploadedFile(file);
      toast.success('File uploaded successfully');
    }
  };

  const exportExpenses = () => {
    const csvContent = [
      ['Invoice #', 'Date', 'Vendor', 'Project', 'Category', 'Amount', 'Status', 'Due Date'].join(','),
      ...filteredExpenses.map(expense => [
        expense.invoiceNumber,
        format(expense.invoiceDate, 'M/d/yyyy'),
        expense.vendor,
        expense.project,
        expense.category,
        expense.amount,
        expense.status,
        expense.dueDate ? format(expense.dueDate, 'M/d/yyyy') : 'N/A'
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `expenses-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Expenses exported successfully');
  };

  const getDateRange = () => {
    const now = new Date();
    switch (dateFilter) {
      case 'thisMonth':
        return { start: startOfMonth(now), end: endOfMonth(now) };
      case 'lastMonth':
        const lastMonth = subMonths(now, 1);
        return { start: startOfMonth(lastMonth), end: endOfMonth(lastMonth) };
      case 'thisYear':
        return { start: startOfYear(now), end: endOfYear(now) };
      case 'custom':
        return customDateRange?.from && customDateRange?.to 
          ? { start: customDateRange.from, end: customDateRange.to }
          : null;
      default:
        return null;
    }
  };

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.vendor.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.project.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All Statuses' || expense.status === statusFilter;
    const matchesProject = projectFilter === 'All Projects' || expense.project === projectFilter;
    
    const dateRange = getDateRange();
    const matchesDate = !dateRange || 
      (expense.invoiceDate >= dateRange.start && expense.invoiceDate <= dateRange.end);
    
    return matchesSearch && matchesStatus && matchesProject && matchesDate;
  });

  const getStatusColor = (status: string) => {
    return STATUS_OPTIONS.find(s => s.value === status)?.color || 'bg-gray-500';
  };

  const getStatusIcon = (status: string) => {
    const StatusIcon = STATUS_OPTIONS.find(s => s.value === status)?.icon || AlertTriangle;
    return <StatusIcon className="w-4 h-4" />;
  };

  // Calculate summary statistics based on filtered data
  const totalInvoices = filteredExpenses.length;
  const paidExpenses = filteredExpenses.filter(exp => exp.status === 'Paid').reduce((sum, exp) => sum + exp.amount, 0);
  const pendingExpenses = filteredExpenses.filter(exp => exp.status === 'Pending').reduce((sum, exp) => sum + exp.amount, 0);
  const overdueExpenses = filteredExpenses.filter(exp => 
    exp.dueDate && exp.dueDate < new Date() && exp.status !== 'Paid'
  ).reduce((sum, exp) => sum + exp.amount, 0);

  return (
    <Layout title="Expenses" subtitle="Manage and track all project expenses">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{totalInvoices}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Paid Invoices</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${paidExpenses.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending Invoices</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                ${pendingExpenses.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Overdue Invoices</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">
                ${overdueExpenses.toLocaleString()}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Expenses Management */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Expenses</CardTitle>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={exportExpenses}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                <DialogTrigger asChild>
                  <Button onClick={() => {
                    setEditingExpense(null);
                    resetForm();
                  }}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Expense
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{editingExpense ? 'Edit Expense' : 'Create New Expense'}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="invoiceNumber">Invoice Number</Label>
                        <Input
                          id="invoiceNumber"
                          value={newExpense.invoiceNumber}
                          onChange={(e) => setNewExpense({ ...newExpense, invoiceNumber: e.target.value })}
                          placeholder="Enter invoice number"
                        />
                      </div>

                      <div>
                        <Label htmlFor="amount">Amount ($)</Label>
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          value={newExpense.amount}
                          onChange={(e) => setNewExpense({ ...newExpense, amount: e.target.value })}
                          placeholder="0.00"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Invoice Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !newExpense.invoiceDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {newExpense.invoiceDate ? format(newExpense.invoiceDate, "PPP") : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={newExpense.invoiceDate}
                              onSelect={(date) => date && setNewExpense({ ...newExpense, invoiceDate: date })}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>

                      <div>
                        <Label>Due Date</Label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              className={cn(
                                "w-full justify-start text-left font-normal",
                                !newExpense.dueDate && "text-muted-foreground"
                              )}
                            >
                              <CalendarIcon className="mr-2 h-4 w-4" />
                              {newExpense.dueDate ? format(newExpense.dueDate, "PPP") : "Pick a date"}
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-auto p-0">
                            <Calendar
                              mode="single"
                              selected={newExpense.dueDate || undefined}
                              onSelect={(date) => setNewExpense({ ...newExpense, dueDate: date || null })}
                              initialFocus
                            />
                          </PopoverContent>
                        </Popover>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="vendor">Vendor</Label>
                        <Input
                          id="vendor"
                          value={newExpense.vendor}
                          onChange={(e) => setNewExpense({ ...newExpense, vendor: e.target.value })}
                          placeholder="Enter vendor name"
                        />
                      </div>

                      <div>
                        <Label htmlFor="project">Project</Label>
                        <Select value={newExpense.project} onValueChange={(value) => setNewExpense({ ...newExpense, project: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select project" />
                          </SelectTrigger>
                          <SelectContent>
                            {projects.map((project) => (
                              <SelectItem key={project.id} value={project.id}>
                                {project.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="category">Category</Label>
                        <Select value={newExpense.category} onValueChange={(value) => setNewExpense({ ...newExpense, category: value })}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {CATEGORY_OPTIONS.map((category) => (
                              <SelectItem key={category} value={category}>
                                {category}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="status">Status</Label>
                        <Select value={newExpense.status} onValueChange={(value: 'Pending' | 'Field Approved' | 'Office Approved' | 'Paid') => setNewExpense({ ...newExpense, status: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUS_OPTIONS.map((status) => (
                              <SelectItem key={status.value} value={status.value}>
                                {status.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="document">Expense Document</Label>
                      <div 
                        className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-gray-400 transition-colors"
                        onDrop={handleFileDrop}
                        onDragOver={(e) => e.preventDefault()}
                        onClick={() => document.getElementById('fileInput')?.click()}
                      >
                        <input
                          id="fileInput"
                          type="file"
                          className="hidden"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={handleFileUpload}
                        />
                        <Upload className="mx-auto h-12 w-12 text-gray-400" />
                        <p className="mt-2 text-sm text-gray-600">
                          {uploadedFile ? uploadedFile.name : 'Click or drag file to upload'}
                        </p>
                        <p className="text-xs text-gray-500">Supports PDF, JPG, JPEG, PNG</p>
                      </div>
                    </div>

                    <div>
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={newExpense.notes}
                        onChange={(e) => setNewExpense({ ...newExpense, notes: e.target.value })}
                        placeholder="Add any relevant notes about this expense"
                        rows={3}
                      />
                    </div>

                    <div className="flex justify-end space-x-2">
                      <Button variant="outline" onClick={() => setDialogOpen(false)}>
                        Cancel
                      </Button>
                      <Button onClick={saveExpense}>
                        {editingExpense ? 'Update Expense' : 'Create Expense'}
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            {/* Filters */}
            <div className="flex flex-col lg:flex-row gap-4 mb-6">
              <Input
                placeholder="Search expenses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="lg:w-80"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="lg:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Statuses">All Statuses</SelectItem>
                  {STATUS_OPTIONS.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger className="lg:w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All Projects">All Projects</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.name}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={dateFilter} onValueChange={(value) => {
                setDateFilter(value);
                if (value === 'custom') {
                  setShowCustomDatePicker(true);
                } else {
                  setShowCustomDatePicker(false);
                  setCustomDateRange(undefined);
                }
              }}>
                <SelectTrigger className="lg:w-48">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {DATE_FILTER_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {showCustomDatePicker && (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "lg:w-60 justify-start text-left font-normal",
                        !customDateRange && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customDateRange?.from ? (
                        customDateRange.to ? (
                          <>
                            {format(customDateRange.from, "LLL dd, y")} -{" "}
                            {format(customDateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(customDateRange.from, "LLL dd, y")
                        )
                      ) : (
                        "Pick a date range"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={customDateRange?.from}
                      selected={customDateRange}
                      onSelect={setCustomDateRange}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>
              )}
            </div>

            {loading ? (
              <div className="text-center py-8">Loading expenses...</div>
            ) : filteredExpenses.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No expenses found. Create your first expense to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead className="w-32">Approval / Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredExpenses.map((expense) => (
                    <TableRow key={expense.id}>
                      <TableCell className="font-medium text-blue-600">
                        {expense.invoiceNumber}
                      </TableCell>
                      <TableCell>{format(expense.invoiceDate, "M/d/yyyy")}</TableCell>
                      <TableCell>{expense.vendor}</TableCell>
                      <TableCell>{expense.project}</TableCell>
                      <TableCell>{expense.category}</TableCell>
                      <TableCell className="font-medium">
                        ${expense.amount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          className={cn("flex items-center gap-1 text-white", getStatusColor(expense.status))}
                          onClick={() => handleStatusIconClick(expense)}
                          disabled={expense.status === 'Paid'}
                        >
                          {getStatusIcon(expense.status)}
                          {expense.status}
                        </Button>
                      </TableCell>
                      <TableCell>
                        {expense.dueDate ? format(expense.dueDate, "M/d/yyyy") : 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center space-x-1">
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => handleStatusIconClick(expense)}
                            disabled={expense.status === 'Paid'}
                          >
                            <DollarSign className="w-4 h-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem onClick={() => editExpense(expense)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toast.info('View attachment feature coming soon')}>
                                <Eye className="w-4 h-4 mr-2" />
                                View Attachment
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                onClick={() => deleteExpense(expense.id)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
