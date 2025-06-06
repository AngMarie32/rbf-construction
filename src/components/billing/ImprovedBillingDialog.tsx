
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ImprovedBillingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBillingCreated: () => void;
}

export function ImprovedBillingDialog({ open, onOpenChange, onBillingCreated }: ImprovedBillingDialogProps) {
  const [formData, setFormData] = useState({
    project_id: '',
    billing_period_start: '',
    billing_period_end: '',
    invoice_number: '',
    billed_amount: '',
    invoice_date: '',
    due_date: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    if (!formData.project_id || !formData.billing_period_start || !formData.billing_period_end || !formData.billed_amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const billedAmount = Number(formData.billed_amount);
      const { error } = await supabase
        .from('project_billing')
        .insert({
          project_id: formData.project_id,
          billing_period_start: formData.billing_period_start,
          billing_period_end: formData.billing_period_end,
          invoice_number: formData.invoice_number || null,
          billed_amount: billedAmount,
          paid_amount: 0,
          remaining_amount: billedAmount,
          status: 'Draft',
          invoice_date: formData.invoice_date || null,
          due_date: formData.due_date || null,
          notes: formData.notes || null
        });

      if (error) throw error;

      toast.success('Billing record created successfully');
      onBillingCreated();
      onOpenChange(false);
      setFormData({
        project_id: '',
        billing_period_start: '',
        billing_period_end: '',
        invoice_number: '',
        billed_amount: '',
        invoice_date: '',
        due_date: '',
        notes: ''
      });
    } catch (error) {
      console.error('Error creating billing record:', error);
      toast.error('Failed to create billing record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-6">
          <DialogTitle className="text-xl">Create New Billing Record</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="project_id" className="text-sm font-medium">Project *</Label>
              <Select value={formData.project_id} onValueChange={(value) => setFormData({ ...formData, project_id: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {/* Projects would be loaded here */}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoice_number" className="text-sm font-medium">Invoice Number</Label>
              <Input
                id="invoice_number"
                value={formData.invoice_number}
                onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                placeholder="e.g., INV-001"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="billing_period_start" className="text-sm font-medium">Billing Period Start *</Label>
              <Input
                id="billing_period_start"
                type="date"
                value={formData.billing_period_start}
                onChange={(e) => setFormData({ ...formData, billing_period_start: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="billing_period_end" className="text-sm font-medium">Billing Period End *</Label>
              <Input
                id="billing_period_end"
                type="date"
                value={formData.billing_period_end}
                onChange={(e) => setFormData({ ...formData, billing_period_end: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <Label htmlFor="billed_amount" className="text-sm font-medium">Billed Amount *</Label>
              <Input
                id="billed_amount"
                type="number"
                step="0.01"
                value={formData.billed_amount}
                onChange={(e) => setFormData({ ...formData, billed_amount: e.target.value })}
                placeholder="0.00"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="invoice_date" className="text-sm font-medium">Invoice Date</Label>
              <Input
                id="invoice_date"
                type="date"
                value={formData.invoice_date}
                onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="due_date" className="text-sm font-medium">Due Date</Label>
              <Input
                id="due_date"
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes" className="text-sm font-medium">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes about this billing record..."
              rows={4}
            />
          </div>

          <div className="flex justify-end space-x-4 pt-6 border-t">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Creating...' : 'Create Billing Record'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
