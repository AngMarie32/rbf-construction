
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarIcon, X } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Project {
  id: string;
  name: string;
  client?: string;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const billingData = {
        project_id: formData.project_id,
        billing_period_start: formData.billing_period_start.toISOString().split('T')[0],
        billing_period_end: formData.billing_period_end.toISOString().split('T')[0],
        billed_amount: formData.billed_amount,
        paid_amount: formData.paid_amount,
        status: formData.status,
        invoice_number: formData.invoice_number || null,
        invoice_date: formData.invoice_date ? formData.invoice_date.toISOString().split('T')[0] : null,
        due_date: formData.due_date ? formData.due_date.toISOString().split('T')[0] : null,
        notes: formData.notes || null,
        remaining_amount: formData.billed_amount - formData.paid_amount
      };

      let error;
      if (billing?.id) {
        ({ error } = await supabase
          .from('project_billing')
          .update(billingData)
          .eq('id', billing.id));
      } else {
        ({ error } = await supabase
          .from('project_billing')
          .insert(billingData));
      }

      if (error) throw error;

      toast.success(billing?.id ? 'Billing record updated successfully' : 'Billing record created successfully');
      onSuccess();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving billing:', error);
      toast.error('Failed to save billing record');
    } finally {
      setLoading(false);
    }
  };

  const selectedProject = projects.find(p => p.id === formData.project_id);
  const remainingAmount = formData.billed_amount - formData.paid_amount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[95vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between text-xl">
            {billing?.id ? 'Edit Billing Record' : 'Create New Billing Record'}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-8 w-8 p-0"
            >
              <X className="h-5 w-5" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Left Column - Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="project" className="text-base font-medium">Project *</Label>
                  <Select 
                    value={formData.project_id} 
                    onValueChange={(value) => setFormData({ ...formData, project_id: value })}
                    required
                  >
                    <SelectTrigger className="h-12 mt-2">
                      <SelectValue placeholder="Select a project" />
                    </SelectTrigger>
                    <SelectContent>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          <div className="py-2">
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
                  <Label htmlFor="status" className="text-base font-medium">Status</Label>
                  <Select 
                    value={formData.status} 
                    onValueChange={(value) => setFormData({ ...formData, status: value })}
                  >
                    <SelectTrigger className="h-12 mt-2">
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
                  <Label htmlFor="invoice_number" className="text-base font-medium">Invoice Number</Label>
                  <Input
                    id="invoice_number"
                    value={formData.invoice_number}
                    onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                    placeholder="INV-001"
                    className="h-12 mt-2"
                  />
                </div>
              </CardContent>
            </Card>

            {/* Right Column - Financial Information */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Financial Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label htmlFor="billed_amount" className="text-base font-medium">Billed Amount *</Label>
                  <Input
                    id="billed_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.billed_amount}
                    onChange={(e) => setFormData({ ...formData, billed_amount: parseFloat(e.target.value) || 0 })}
                    required
                    className="h-12 mt-2"
                  />
                </div>

                <div>
                  <Label htmlFor="paid_amount" className="text-base font-medium">Paid Amount</Label>
                  <Input
                    id="paid_amount"
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.paid_amount}
                    onChange={(e) => setFormData({ ...formData, paid_amount: parseFloat(e.target.value) || 0 })}
                    className="h-12 mt-2"
                  />
                </div>

                <div className="p-4 bg-gray-50 rounded-lg border">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-base">Remaining Amount:</span>
                    <span className={`font-bold text-xl ${remainingAmount > 0 ? 'text-red-600' : 'text-green-600'}`}>
                      ${remainingAmount.toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Date Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Date Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div>
                  <Label className="text-base font-medium">Billing Period Start *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal h-12 mt-2"
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
                  <Label className="text-base font-medium">Billing Period End *</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal h-12 mt-2"
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
                  <Label className="text-base font-medium">Invoice Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal h-12 mt-2"
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
                  <Label className="text-base font-medium">Due Date</Label>
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className="w-full justify-start text-left font-normal h-12 mt-2"
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

          {/* Notes */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Additional Notes</CardTitle>
            </CardHeader>
            <CardContent>
              <Textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                placeholder="Add any billing notes or special instructions..."
                rows={4}
                className="text-base"
              />
            </CardContent>
          </Card>

          {/* Project Summary */}
          {selectedProject && (
            <Card className="bg-blue-50 border-blue-200">
              <CardHeader>
                <CardTitle className="text-lg text-blue-800">Project Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium text-blue-700">Project:</span>
                    <span className="ml-2">{selectedProject.name}</span>
                  </div>
                  {selectedProject.client && (
                    <div>
                      <span className="font-medium text-blue-700">Client:</span>
                      <span className="ml-2">{selectedProject.client}</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex justify-end gap-4 pt-6 border-t">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="px-8 py-3">
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !formData.project_id} className="px-8 py-3">
              {loading ? 'Saving...' : billing?.id ? 'Update Billing' : 'Create Billing'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
