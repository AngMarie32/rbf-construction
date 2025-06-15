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
import { CalendarIcon, Download } from 'lucide-react';
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
    project_id: billing?.project_id || '',
    billing_period_start: billing?.billing_period_start ? new Date(billing.billing_period_start) : new Date(),
    billing_period_end: billing?.billing_period_end ? new Date(billing.billing_period_end) : new Date(),
    billed_amount: billing?.billed_amount || 0,
    paid_amount: billing?.paid_amount || 0,
    status: billing?.status || 'Draft',
    invoice_number: billing?.invoice_number || '',
    invoice_date: billing?.invoice_date ? new Date(billing.invoice_date) : undefined,
    due_date: billing?.due_date ? new Date(billing.due_date) : undefined,
    notes: billing?.notes || ''
  });

  const [loading, setLoading] = useState(false);
  const [paymentApps, setPaymentApps] = useState<PaymentApp[]>([]);
  const [selectedPaymentApps, setSelectedPaymentApps] = useState<string[]>([]);
  const [showPaymentApps, setShowPaymentApps] = useState(false);

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl font-bold">
            {billing?.id ? 'Edit Billing Record' : 'Create New Billing Record'}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!billing?.id && (
            <Card className="border-blue-200 bg-blue-50">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg text-blue-800">Import from Payment Applications</CardTitle>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowPaymentApps(!showPaymentApps)}
                    disabled={!formData.project_id}
                  >
                    {showPaymentApps ? 'Hide' : 'Show'} Payment Apps
                  </Button>
                </div>
              </CardHeader>
              {showPaymentApps && formData.project_id && (
                <CardContent>
                  <div className="space-y-4">
                    {paymentApps.length > 0 ? (
                      <>
                        <div className="grid gap-3 max-h-60 overflow-y-auto">
                          {paymentApps.map((app) => (
                            <div key={app.id} className="flex items-center space-x-3 p-3 border rounded-lg bg-white">
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
                              <div className="flex-1">
                                <div className="flex justify-between items-center">
                                  <span className="font-medium">Application #{app.application_number}</span>
                                  <span className="font-bold text-green-600">
                                    ${app.current_payment_due.toLocaleString()}
                                  </span>
                                </div>
                                <div className="text-sm text-gray-600">
                                  Period ending: {format(new Date(app.period_to), 'MMM dd, yyyy')}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        {selectedPaymentApps.length > 0 && (
                          <div className="flex justify-between items-center pt-4 border-t">
                            <span className="font-medium text-blue-800">
                              Selected: {selectedPaymentApps.length} application(s)
                            </span>
                            <Button onClick={handleImportFromPaymentApps} className="bg-blue-600 hover:bg-blue-700">
                              <Download className="w-4 h-4 mr-2" />
                              Import Selected
                            </Button>
                          </div>
                        )}
                      </>
                    ) : (
                      <p className="text-gray-500 text-center py-6">No payment applications found for this project.</p>
                    )}
                  </div>
                </CardContent>
              )}
            </Card>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Basic Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="project">Project *</Label>
                    <Select 
                      value={formData.project_id} 
                      onValueChange={(value) => setFormData({ ...formData, project_id: value })}
                      required
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
                    <Label htmlFor="invoice_number">Invoice Number</Label>
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
                  <CardTitle>Financial Details</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div>
                    <Label htmlFor="billed_amount">Billed Amount *</Label>
                    <Input
                      id="billed_amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.billed_amount}
                      onChange={(e) => setFormData({ ...formData, billed_amount: parseFloat(e.target.value) || 0 })}
                      required
                    />
                  </div>

                  <div>
                    <Label htmlFor="paid_amount">Paid Amount</Label>
                    <Input
                      id="paid_amount"
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.paid_amount}
                      onChange={(e) => setFormData({ ...formData, paid_amount: parseFloat(e.target.value) || 0 })}
                    />
                  </div>

                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="flex justify-between items-center">
                      <span className="font-medium">Remaining Amount:</span>
                      <span className={`font-bold text-lg ${remainingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                        ${remainingAmount.toLocaleString()}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Date Information</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div>
                    <Label>Billing Period Start *</Label>
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
                    <Label>Billing Period End *</Label>
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
                    <Label>Invoice Date</Label>
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
                    <Label>Due Date</Label>
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
                <CardTitle>Additional Notes</CardTitle>
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
