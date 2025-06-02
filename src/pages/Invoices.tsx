
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
import { Plus, Calendar as CalendarIcon, Edit, Trash2, FileText, DollarSign, Send } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Invoice {
  id: string;
  projectId?: string;
  invoiceNumber: string;
  clientName: string;
  clientAddress?: string;
  invoiceDate: Date;
  dueDate?: Date;
  subtotal: number;
  taxAmount?: number;
  totalAmount: number;
  status: 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled';
  notes?: string;
  items: InvoiceItem[];
}

interface InvoiceItem {
  id: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Project {
  id: string;
  name: string;
}

const STATUS_OPTIONS = [
  { value: 'Draft', label: 'Draft', color: 'bg-gray-500' },
  { value: 'Sent', label: 'Sent', color: 'bg-blue-500' },
  { value: 'Paid', label: 'Paid', color: 'bg-green-500' },
  { value: 'Overdue', label: 'Overdue', color: 'bg-red-500' },
  { value: 'Cancelled', label: 'Cancelled', color: 'bg-gray-600' }
];

export default function Invoices() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null);
  
  const [newInvoice, setNewInvoice] = useState({
    projectId: '',
    invoiceNumber: '',
    clientName: '',
    clientAddress: '',
    invoiceDate: new Date(),
    dueDate: null as Date | null,
    status: 'Draft' as 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled',
    notes: '',
    items: [{ id: '1', description: '', quantity: 1, unitPrice: 0, total: 0 }]
  });

  useEffect(() => {
    fetchInvoices();
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

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const { data: invoicesData, error: invoicesError } = await supabase
        .from('invoices')
        .select('*')
        .order('invoice_date', { ascending: false });

      if (invoicesError) throw invoicesError;

      const invoicesWithItems = await Promise.all(
        (invoicesData || []).map(async (invoice) => {
          const { data: itemsData, error: itemsError } = await supabase
            .from('invoice_items')
            .select('*')
            .eq('invoice_id', invoice.id);

          if (itemsError) throw itemsError;

          return {
            id: invoice.id,
            projectId: invoice.project_id,
            invoiceNumber: invoice.invoice_number,
            clientName: invoice.client_name,
            clientAddress: invoice.client_address,
            invoiceDate: new Date(invoice.invoice_date),
            dueDate: invoice.due_date ? new Date(invoice.due_date) : undefined,
            subtotal: invoice.subtotal,
            taxAmount: invoice.tax_amount,
            totalAmount: invoice.total_amount,
            status: invoice.status as Invoice['status'],
            notes: invoice.notes,
            items: (itemsData || []).map((item: any) => ({
              id: item.id,
              description: item.description,
              quantity: item.quantity,
              unitPrice: item.unit_price,
              total: item.total
            }))
          };
        })
      );

      setInvoices(invoicesWithItems);
    } catch (error) {
      console.error('Error fetching invoices:', error);
      toast.error('Failed to load invoices');
    } finally {
      setLoading(false);
    }
  };

  const generateInvoiceNumber = () => {
    const invoiceCount = invoices.length + 1;
    return `INV-${String(invoiceCount).padStart(4, '0')}`;
  };

  const calculateItemTotal = (quantity: number, unitPrice: number) => {
    return quantity * unitPrice;
  };

  const calculateSubtotal = (items: any[]) => {
    return items.reduce((sum, item) => sum + item.total, 0);
  };

  const updateItemTotal = (index: number, field: 'quantity' | 'unitPrice', value: number) => {
    const updatedItems = [...newInvoice.items];
    updatedItems[index] = {
      ...updatedItems[index],
      [field]: value,
      total: calculateItemTotal(
        field === 'quantity' ? value : updatedItems[index].quantity,
        field === 'unitPrice' ? value : updatedItems[index].unitPrice
      )
    };
    setNewInvoice({ ...newInvoice, items: updatedItems });
  };

  const addInvoiceItem = () => {
    const newItem = {
      id: Date.now().toString(),
      description: '',
      quantity: 1,
      unitPrice: 0,
      total: 0
    };
    setNewInvoice({ ...newInvoice, items: [...newInvoice.items, newItem] });
  };

  const removeInvoiceItem = (index: number) => {
    if (newInvoice.items.length > 1) {
      const updatedItems = newInvoice.items.filter((_, i) => i !== index);
      setNewInvoice({ ...newInvoice, items: updatedItems });
    }
  };

  const saveInvoice = async () => {
    if (!newInvoice.clientName || !newInvoice.invoiceNumber) {
      toast.error('Please fill in required fields');
      return;
    }

    if (newInvoice.items.some(item => !item.description)) {
      toast.error('Please fill in all item descriptions');
      return;
    }

    try {
      const subtotal = calculateSubtotal(newInvoice.items);
      const taxAmount = subtotal * 0.1; // 10% tax rate
      const totalAmount = subtotal + taxAmount;

      const invoiceData = {
        project_id: newInvoice.projectId || null,
        invoice_number: newInvoice.invoiceNumber,
        client_name: newInvoice.clientName,
        client_address: newInvoice.clientAddress || null,
        invoice_date: newInvoice.invoiceDate.toISOString().split('T')[0],
        due_date: newInvoice.dueDate?.toISOString().split('T')[0] || null,
        subtotal: subtotal,
        tax_amount: taxAmount,
        total_amount: totalAmount,
        status: newInvoice.status,
        notes: newInvoice.notes || null
      };

      let invoiceId: string;

      if (editingInvoice) {
        const { error } = await supabase
          .from('invoices')
          .update(invoiceData)
          .eq('id', editingInvoice.id);

        if (error) throw error;
        invoiceId = editingInvoice.id;

        // Delete existing items
        const { error: deleteError } = await supabase
          .from('invoice_items')
          .delete()
          .eq('invoice_id', invoiceId);

        if (deleteError) throw deleteError;
      } else {
        const { data, error } = await supabase
          .from('invoices')
          .insert(invoiceData)
          .select()
          .single();

        if (error) throw error;
        invoiceId = data.id;
      }

      // Insert invoice items
      const itemsData = newInvoice.items.map(item => ({
        invoice_id: invoiceId,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total: item.total
      }));

      const { error: itemsError } = await supabase
        .from('invoice_items')
        .insert(itemsData);

      if (itemsError) throw itemsError;

      toast.success(editingInvoice ? 'Invoice updated successfully' : 'Invoice created successfully');
      setDialogOpen(false);
      setEditingInvoice(null);
      resetForm();
      fetchInvoices();
    } catch (error) {
      console.error('Error saving invoice:', error);
      toast.error('Failed to save invoice');
    }
  };

  const deleteInvoice = async (id: string) => {
    try {
      const { error } = await supabase
        .from('invoices')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Invoice deleted successfully');
      fetchInvoices();
    } catch (error) {
      console.error('Error deleting invoice:', error);
      toast.error('Failed to delete invoice');
    }
  };

  const editInvoice = (invoice: Invoice) => {
    setEditingInvoice(invoice);
    setNewInvoice({
      projectId: invoice.projectId || '',
      invoiceNumber: invoice.invoiceNumber,
      clientName: invoice.clientName,
      clientAddress: invoice.clientAddress || '',
      invoiceDate: invoice.invoiceDate,
      dueDate: invoice.dueDate || null,
      status: invoice.status,
      notes: invoice.notes || '',
      items: invoice.items
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setNewInvoice({
      projectId: '',
      invoiceNumber: generateInvoiceNumber(),
      clientName: '',
      clientAddress: '',
      invoiceDate: new Date(),
      dueDate: null,
      status: 'Draft',
      notes: '',
      items: [{ id: '1', description: '', quantity: 1, unitPrice: 0, total: 0 }]
    });
  };

  const getStatusColor = (status: string) => {
    return STATUS_OPTIONS.find(s => s.value === status)?.color || 'bg-gray-500';
  };

  const totalRevenue = invoices
    .filter(inv => inv.status === 'Paid')
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  const totalOutstanding = invoices
    .filter(inv => ['Sent', 'Overdue'].includes(inv.status))
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  return (
    <Layout title="Invoices" subtitle="Manage invoices and billing">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Invoices</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{invoices.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${totalRevenue.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Outstanding</CardTitle>
              <DollarSign className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                ${totalOutstanding.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Collection Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {invoices.length > 0 
                  ? Math.round((invoices.filter(inv => inv.status === 'Paid').length / invoices.length) * 100)
                  : 0
                }%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invoices Management */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Invoices</CardTitle>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingInvoice(null);
                  resetForm();
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Invoice
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingInvoice ? 'Edit Invoice' : 'Create New Invoice'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="invoiceNumber">Invoice Number</Label>
                      <Input
                        id="invoiceNumber"
                        value={newInvoice.invoiceNumber}
                        onChange={(e) => setNewInvoice({ ...newInvoice, invoiceNumber: e.target.value })}
                        placeholder="INV-0001"
                      />
                    </div>

                    <div>
                      <Label htmlFor="project">Project (Optional)</Label>
                      <Select value={newInvoice.projectId} onValueChange={(value) => setNewInvoice({ ...newInvoice, projectId: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select project..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No Project</SelectItem>
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
                      <Label htmlFor="clientName">Client Name</Label>
                      <Input
                        id="clientName"
                        value={newInvoice.clientName}
                        onChange={(e) => setNewInvoice({ ...newInvoice, clientName: e.target.value })}
                        placeholder="Client Name"
                      />
                    </div>

                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select value={newInvoice.status} onValueChange={(value: 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled') => setNewInvoice({ ...newInvoice, status: value })}>
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
                    <Label htmlFor="clientAddress">Client Address</Label>
                    <Textarea
                      id="clientAddress"
                      value={newInvoice.clientAddress}
                      onChange={(e) => setNewInvoice({ ...newInvoice, clientAddress: e.target.value })}
                      placeholder="Client address..."
                      rows={3}
                    />
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
                              !newInvoice.invoiceDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {newInvoice.invoiceDate ? format(newInvoice.invoiceDate, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={newInvoice.invoiceDate}
                            onSelect={(date) => date && setNewInvoice({ ...newInvoice, invoiceDate: date })}
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
                              !newInvoice.dueDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {newInvoice.dueDate ? format(newInvoice.dueDate, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={newInvoice.dueDate || undefined}
                            onSelect={(date) => setNewInvoice({ ...newInvoice, dueDate: date || null })}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  {/* Invoice Items */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <Label className="text-lg font-medium">Invoice Items</Label>
                      <Button type="button" variant="outline" onClick={addInvoiceItem}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Item
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {newInvoice.items.map((item, index) => (
                        <div key={item.id} className="grid grid-cols-12 gap-4 items-end">
                          <div className="col-span-5">
                            <Label>Description</Label>
                            <Input
                              value={item.description}
                              onChange={(e) => {
                                const updatedItems = [...newInvoice.items];
                                updatedItems[index].description = e.target.value;
                                setNewInvoice({ ...newInvoice, items: updatedItems });
                              }}
                              placeholder="Item description"
                            />
                          </div>
                          <div className="col-span-2">
                            <Label>Quantity</Label>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItemTotal(index, 'quantity', parseFloat(e.target.value) || 0)}
                              placeholder="1"
                            />
                          </div>
                          <div className="col-span-2">
                            <Label>Unit Price</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.unitPrice}
                              onChange={(e) => updateItemTotal(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                            />
                          </div>
                          <div className="col-span-2">
                            <Label>Total</Label>
                            <Input
                              value={`$${item.total.toFixed(2)}`}
                              readOnly
                              className="bg-gray-50"
                            />
                          </div>
                          <div className="col-span-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeInvoiceItem(index)}
                              disabled={newInvoice.items.length === 1}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-6 border-t pt-4">
                      <div className="flex justify-end space-y-2">
                        <div className="w-64 space-y-2">
                          <div className="flex justify-between">
                            <span>Subtotal:</span>
                            <span>${calculateSubtotal(newInvoice.items).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Tax (10%):</span>
                            <span>${(calculateSubtotal(newInvoice.items) * 0.1).toFixed(2)}</span>
                          </div>
                          <div className="flex justify-between font-bold text-lg border-t pt-2">
                            <span>Total:</span>
                            <span>${(calculateSubtotal(newInvoice.items) * 1.1).toFixed(2)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={newInvoice.notes}
                      onChange={(e) => setNewInvoice({ ...newInvoice, notes: e.target.value })}
                      placeholder="Additional notes..."
                      rows={3}
                    />
                  </div>

                  <Button onClick={saveInvoice} className="w-full">
                    {editingInvoice ? 'Update Invoice' : 'Create Invoice'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading invoices...</div>
            ) : invoices.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No invoices found. Create your first invoice to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice #</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {invoices.map((invoice) => (
                    <TableRow key={invoice.id}>
                      <TableCell className="font-medium">{invoice.invoiceNumber}</TableCell>
                      <TableCell>{invoice.clientName}</TableCell>
                      <TableCell>{format(invoice.invoiceDate, "MMM dd, yyyy")}</TableCell>
                      <TableCell>
                        {invoice.dueDate ? format(invoice.dueDate, "MMM dd, yyyy") : 'N/A'}
                      </TableCell>
                      <TableCell className="font-medium">
                        ${invoice.totalAmount.toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("text-white", getStatusColor(invoice.status))}>
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => editInvoice(invoice)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteInvoice(invoice.id)}
                            className="text-red-600 hover:text-red-800"
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
      </div>
    </Layout>
  );
}
