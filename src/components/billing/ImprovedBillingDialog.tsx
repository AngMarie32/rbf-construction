
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { CalendarIcon, Download, Import, Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Project {
  id: string;
  name: string;
  client?: string;
}

interface PaymentApp {
  id: string;
  application_number: number;
  period_to: string;
  current_payment_due: number;
}

interface BillingData {
  id?: string;
  project_id: string;
  billing_period_start: string;
  billing_period_end: string;
  billed_amount: number;
  paid_amount: number;
  status: string;
  invoice_number?: string;
  invoice_date?: string;
  due_date?: string;
  notes?: string;
}

interface BulkBillingEntry {
  id: string;
  project_id: string;
  billing_period_start: Date;
  billing_period_end: Date;
  billed_amount: number;
  paid_amount: number;
  status: string;
  invoice_number: string;
  notes: string;
}

interface ImprovedBillingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  billing?: BillingData;
  projects: Project[];
  onSuccess: () => void;
}

export function ImprovedBillingDialog({
  open,
  onOpenChange,
  billing,
  projects,
  onSuccess
}: ImprovedBillingDialogProps) {
  const [formData, setFormData] = useState({
    project_id: '',
    billing_period_start: new Date(),
    billing_period_end: new Date(),
    billed_amount: 0,
    paid_amount: 0,
    status: 'Draft',
    invoice_number: '',
    invoice_date: undefined as Date | undefined,
    due_date: undefined as Date | undefined,
    notes: ''
  });

  const [loading, setLoading] = useState(false);
  const [paymentApps, setPaymentApps] = useState<PaymentApp[]>([]);
  const [selectedPaymentApps, setSelectedPaymentApps] = useState<string[]>([]);
  const [showPaymentApps, setShowPaymentApps] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [bulkEntries, setBulkEntries] = useState<BulkBillingEntry[]>([]);

  // Reset form data when billing prop changes or dialog opens/closes
  useEffect(() => {
    if (open) {
      if (billing) {
        console.log('Setting form data from billing:', billing);
        setFormData({
          project_id: billing.project_id || '',
          billing_period_start: billing.billing_period_start ? new Date(billing.billing_period_start) : new Date(),
          billing_period_end: billing.billing_period_end ? new Date(billing.billing_period_end) : new Date(),
          billed_amount: billing.billed_amount || 0,
          paid_amount: billing.paid_amount || 0,
          status: billing.status || 'Draft',
          invoice_number: billing.invoice_number || '',
          invoice_date: billing.invoice_date ? new Date(billing.invoice_date) : undefined,
          due_date: billing.due_date ? new Date(billing.due_date) : undefined,
          notes: billing.notes || ''
        });
        setBulkMode(false);
      } else {
        // Reset to default values for new billing
        setFormData({
          project_id: '',
          billing_period_start: new Date(),
          billing_period_end: new Date(),
          billed_amount: 0,
          paid_amount: 0,
          status: 'Draft',
          invoice_number: '',
          invoice_date: undefined,
          due_date: undefined,
          notes: ''
        });
        setBulkMode(false);
        setBulkEntries([]);
      }
    }
  }, [billing, open]);

  useEffect(() => {
    if (formData.project_id && showPaymentApps) {
      fetchPaymentApps();
    }
  }, [formData.project_id, showPaymentApps]);

  const fetchPaymentApps = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_applications_g702')
        .select('id, application_number, period_to, current_payment_due')
        .eq('project_id', formData.project_id)
        .order('application_number');

      if (error) throw error;
      
      const mappedData: PaymentApp[] = (data || []).map(item => ({
        id: item.id,
        application_number: item.application_number,
        period_to: item.period_to,
        current_payment_due: item.current_payment_due || 0
      }));
      
      setPaymentApps(mappedData);
    } catch (error) {
      console.error('Error fetching payment apps:', error);
    }
  };

  const handleImportFromPaymentApps = () => {
    if (selectedPaymentApps.length === 0) return;

    const selectedApps = paymentApps.filter(app => selectedPaymentApps.includes(app.id));
    const totalAmount = selectedApps.reduce((sum, app) => sum + app.current_payment_due, 0);
    
    // Use the payment app period end date as both start and end for simplicity
    const latestPeriodEnd = selectedApps.reduce((latest, app) => {
      const appDate = new Date(app.period_to);
      return appDate > latest ? appDate : latest;
    }, new Date(selectedApps[0].period_to));

    setFormData({
      ...formData,
      billed_amount: totalAmount,
      billing_period_start: latestPeriodEnd,
      billing_period_end: latestPeriodEnd,
      notes: `Imported from Payment Applications: ${selectedApps.map(app => app.application_number).join(', ')}`
    });

    setShowPaymentApps(false);
    setSelectedPaymentApps([]);
    toast.success('Payment applications imported successfully');
  };

  const addBulkEntry = () => {
    const newEntry: BulkBillingEntry = {
      id: Math.random().toString(36).substr(2, 9),
      project_id: '',
      billing_period_start: new Date(),
      billing_period_end: new Date(),
      billed_amount: 0,
      paid_amount: 0,
      status: 'Draft',
      invoice_number: '',
      notes: ''
    };
    setBulkEntries([...bulkEntries, newEntry]);
  };

  const removeBulkEntry = (id: string) => {
    setBulkEntries(bulkEntries.filter(entry => entry.id !== id));
  };

  const updateBulkEntry = (id: string, field: keyof BulkBillingEntry, value: any) => {
    setBulkEntries(bulkEntries.map(entry => 
      entry.id === id ? { ...entry, [field]: value } : entry
    ));
  };

  const handleBulkSubmit = async () => {
    if (bulkEntries.length === 0) {
      toast.error('Please add at least one billing entry');
      return;
    }

    const invalidEntries = bulkEntries.filter(entry => !entry.project_id || entry.billed_amount <= 0);
    if (invalidEntries.length > 0) {
      toast.error('Please fill in project and billed amount for all entries');
      return;
    }

    setLoading(true);
    try {
      const billingData = bulkEntries.map(entry => ({
        project_id: entry.project_id,
        billing_period_start: entry.billing_period_start.toISOString().split('T')[0],
        billing_period_end: entry.billing_period_end.toISOString().split('T')[0],
        billed_amount: Number(entry.billed_amount),
        paid_amount: Number(entry.paid_amount) || 0,
        status: entry.status,
        invoice_number: entry.invoice_number || null,
        notes: entry.notes || null
      }));

      const { error } = await supabase
        .from('project_billing')
        .insert(billingData);

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      toast.success(`${bulkEntries.length} billing records created successfully`);
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving bulk billing:', error);
      toast.error(`Failed to save billing records: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (bulkMode) {
      handleBulkSubmit();
      return;
    }

    if (!formData.project_id) {
      toast.error('Please select a project');
      return;
    }

    if (!formData.billed_amount || formData.billed_amount <= 0) {
      toast.error('Please enter a valid billed amount');
      return;
    }

    setLoading(true);
    try {
      const billingData = {
        project_id: formData.project_id,
        billing_period_start: formData.billing_period_start.toISOString().split('T')[0],
        billing_period_end: formData.billing_period_end.toISOString().split('T')[0],
        billed_amount: Number(formData.billed_amount),
        paid_amount: Number(formData.paid_amount) || 0,
        status: formData.status,
        invoice_number: formData.invoice_number || null,
        invoice_date: formData.invoice_date ? formData.invoice_date.toISOString().split('T')[0] : null,
        due_date: formData.due_date ? formData.due_date.toISOString().split('T')[0] : null,
        notes: formData.notes || null
      };

      console.log('Submitting billing data:', billingData);

      let error;
      if (billing?.id) {
        const { error: updateError } = await supabase
          .from('project_billing')
          .update(billingData)
          .eq('id', billing.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('project_billing')
          .insert([billingData]);
        error = insertError;
      }

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      toast.success(billing?.id ? 'Billing record updated successfully' : 'Billing record created successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error: any) {
      console.error('Error saving billing:', error);
      toast.error(`Failed to save billing record: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const selectedProject = projects.find(p => p.id === formData.project_id);
  const remainingAmount = formData.billed_amount - formData.paid_amount;

  if (bulkMode) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-6xl max-h-[95vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold flex items-center justify-between">
              Bulk Billing Entry
              <Button variant="outline" onClick={() => setBulkMode(false)}>
                Switch to Single Entry
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <p className="text-sm text-gray-600">Add multiple billing records at once</p>
              <Button onClick={addBulkEntry} variant="outline">
                <Plus className="w-4 h-4 mr-2" />
                Add Entry
              </Button>
            </div>

            <div className="space-y-4 max-h-96 overflow-y-auto">
              {bulkEntries.map((entry, index) => (
                <Card key={entry.id}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-center">
                      <CardTitle className="text-sm">Entry #{index + 1}</CardTitle>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => removeBulkEntry(entry.id)}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <Label>Project</Label>
                      <Select 
                        value={entry.project_id} 
                        onValueChange={(value) => updateBulkEntry(entry.id, 'project_id', value)}
                      >
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

                    <div>
                      <Label>Billed Amount</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={entry.billed_amount}
                        onChange={(e) => updateBulkEntry(entry.id, 'billed_amount', parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <div>
                      <Label>Paid Amount</Label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        value={entry.paid_amount}
                        onChange={(e) => updateBulkEntry(entry.id, 'paid_amount', parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <div>
                      <Label>Status</Label>
                      <Select 
                        value={entry.status} 
                        onValueChange={(value) => updateBulkEntry(entry.id, 'status', value)}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Draft">Draft</SelectItem>
                          <SelectItem value="Sent">Sent</SelectItem>
                          <SelectItem value="Paid">Paid</SelectItem>
                          <SelectItem value="Overdue">Overdue</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label>Invoice Number</Label>
                      <Input
                        value={entry.invoice_number}
                        onChange={(e) => updateBulkEntry(entry.id, 'invoice_number', e.target.value)}
                        placeholder="Optional"
                      />
                    </div>

                    <div>
                      <Label>Notes</Label>
                      <Input
                        value={entry.notes}
                        onChange={(e) => updateBulkEntry(entry.id, 'notes', e.target.value)}
                        placeholder="Optional"
                      />
                    </div>
                  </CardContent>
                </Card>
              ))}

              {bulkEntries.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No entries added yet. Click "Add Entry" to start.</p>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleBulkSubmit} disabled={loading || bulkEntries.length === 0}>
                {loading ? 'Saving...' : `Create ${bulkEntries.length} Billing Records`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold flex items-center justify-between">
            {billing?.id ? 'Edit Billing Record' : 'Create New Billing Record'}
            <Button variant="outline" onClick={() => setBulkMode(true)}>
              Switch to Bulk Entry
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="project">Project</Label>
                    <Select 
                      value={formData.project_id} 
                      onValueChange={(value) => setFormData({ ...formData, project_id: value })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a project" />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            <div>
                              <div className="font-medium">{project.name}</div>
                              {project.client && (
                                <div className="text-sm text-gray-500">{project.client}</div>
                              )}
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {formData.project_id && (
                    <div className="flex gap-2">
                      <Button 
                        type="button" 
                        variant="outline" 
                        onClick={() => setShowPaymentApps(!showPaymentApps)}
                        className="flex-1"
                      >
                        <Import className="w-4 h-4 mr-2" />
                        {showPaymentApps ? 'Hide Payment Apps' : 'Import from Payment Apps'}
                      </Button>
                    </div>
                  )}

                  {showPaymentApps && (
                    <Card className="p-4 bg-gray-50">
                      <h4 className="font-medium mb-3">Available Payment Applications</h4>
                      {paymentApps.length === 0 ? (
                        <p className="text-sm text-gray-500">No payment applications found for this project.</p>
                      ) : (
                        <div className="space-y-2 max-h-32 overflow-y-auto">
                          {paymentApps.map(app => (
                            <div key={app.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={app.id}
                                checked={selectedPaymentApps.includes(app.id)}
                                onCheckedChange={(checked) => {
                                  if (checked) {
                                    setSelectedPaymentApps([...selectedPaymentApps, app.id]);
                                  } else {
                                    setSelectedPaymentApps(selectedPaymentApps.filter(id => id !== app.id));
                                  }
                                }}
                              />
                              <Label htmlFor={app.id} className="text-sm flex-1">
                                App #{app.application_number} - ${app.current_payment_due.toLocaleString()} 
                                ({format(new Date(app.period_to), 'MMM dd, yyyy')})
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}
                      {selectedPaymentApps.length > 0 && (
                        <Button 
                          type="button" 
                          onClick={handleImportFromPaymentApps}
                          className="mt-3 w-full"
                          size="sm"
                        >
                          Import Selected ({selectedPaymentApps.length})
                        </Button>
                      )}
                    </Card>
                  )}

                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select 
                      value={formData.status} 
                      onValueChange={(value) => setFormData({ ...formData, status: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Draft">Draft</SelectItem>
                        <SelectItem value="Sent">Sent</SelectItem>
                        <SelectItem value="Paid">Paid</SelectItem>
                        <SelectItem value="Overdue">Overdue</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="invoice_number">Invoice Number (Optional)</Label>
                    <Input
                      id="invoice_number"
                      value={formData.invoice_number}
                      onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                      placeholder="Enter invoice number"
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Financial Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="billed_amount">Billed Amount</Label>
                    <Input
                      id="billed_amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.billed_amount}
                      onChange={(e) => setFormData({ ...formData, billed_amount: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="paid_amount">Paid Amount (Optional)</Label>
                    <Input
                      id="paid_amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.paid_amount}
                      onChange={(e) => setFormData({ ...formData, paid_amount: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <Separator />

                  <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-4 rounded-lg space-y-3">
                    <h4 className="font-semibold text-gray-800">Billing Summary</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Billed:</span>
                        <span className="font-medium">${formData.billed_amount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Paid:</span>
                        <span className="font-medium text-green-600">${formData.paid_amount.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between col-span-2 pt-2 border-t">
                        <span className="font-semibold">Outstanding:</span>
                        <span className={`font-bold text-lg ${remainingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          ${remainingAmount.toLocaleString()}
                        </span>
                      </div>
                    </div>
                    {remainingAmount > 0 && (
                      <Badge variant="destructive" className="w-fit">
                        Payment Due
                      </Badge>
                    )}
                    {remainingAmount <= 0 && formData.billed_amount > 0 && (
                      <Badge className="w-fit bg-green-500">
                        Fully Paid
                      </Badge>
                    )}
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Date Information (Optional)</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label>Billing Period Start</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(formData.billing_period_start, "MMM dd, yyyy")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.billing_period_start}
                          onSelect={(date) => date && setFormData({ ...formData, billing_period_start: date })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label>Billing Period End</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {format(formData.billing_period_end, "MMM dd, yyyy")}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.billing_period_end}
                          onSelect={(date) => date && setFormData({ ...formData, billing_period_end: date })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label>Invoice Date (Optional)</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.invoice_date ? format(formData.invoice_date, "MMM dd, yyyy") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.invoice_date}
                          onSelect={(date) => setFormData({ ...formData, invoice_date: date })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>

                  <div>
                    <Label>Due Date (Optional)</Label>
                    <Popover>
                      <PopoverTrigger asChild>
                        <Button
                          variant="outline"
                          className="w-full justify-start text-left font-normal"
                        >
                          <CalendarIcon className="mr-2 h-4 w-4" />
                          {formData.due_date ? format(formData.due_date, "MMM dd, yyyy") : "Select date"}
                        </Button>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0">
                        <Calendar
                          mode="single"
                          selected={formData.due_date}
                          onSelect={(date) => setFormData({ ...formData, due_date: date })}
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Additional Notes (Optional)</CardTitle>
              </CardHeader>
              <CardContent>
                <Textarea
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Add any billing notes or special instructions..."
                  rows={3}
                />
              </CardContent>
            </Card>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading || !formData.project_id}>
                {loading ? 'Saving...' : billing?.id ? 'Update Billing' : 'Create Billing'}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
