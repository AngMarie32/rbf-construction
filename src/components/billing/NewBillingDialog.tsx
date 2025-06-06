
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NewBillingDialogProps {
  onBillingCreated: () => void;
}

interface Project {
  id: string;
  name: string;
}

export function NewBillingDialog({ onBillingCreated }: NewBillingDialogProps) {
  const [open, setOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    project_id: '',
    billing_period_start: new Date().toISOString().split('T')[0],
    billing_period_end: new Date().toISOString().split('T')[0],
    invoice_number: '',
    billed_amount: '',
    paid_amount: '0',
    status: 'Draft' as const,
    invoice_date: '',
    due_date: '',
    payment_date: '',
    notes: ''
  });

  useEffect(() => {
    if (open) {
      fetchProjects();
    }
  }, [open]);

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

  const resetForm = () => {
    setFormData({
      project_id: '',
      billing_period_start: new Date().toISOString().split('T')[0],
      billing_period_end: new Date().toISOString().split('T')[0],
      invoice_number: '',
      billed_amount: '',
      paid_amount: '0',
      status: 'Draft',
      invoice_date: '',
      due_date: '',
      payment_date: '',
      notes: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.project_id || !formData.billed_amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const billedAmount = parseFloat(formData.billed_amount);
      const paidAmount = parseFloat(formData.paid_amount);
      
      const { error } = await supabase
        .from('project_billing')
        .insert({
          project_id: formData.project_id,
          billing_period_start: formData.billing_period_start,
          billing_period_end: formData.billing_period_end,
          invoice_number: formData.invoice_number || null,
          billed_amount: billedAmount,
          paid_amount: paidAmount,
          remaining_amount: billedAmount - paidAmount,
          status: formData.status,
          invoice_date: formData.invoice_date || null,
          due_date: formData.due_date || null,
          payment_date: formData.payment_date || null,
          notes: formData.notes || null
        });

      if (error) throw error;

      toast.success('Billing record created successfully');
      onBillingCreated();
      setOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error creating billing record:', error);
      toast.error('Failed to create billing record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button onClick={resetForm}>
          <Plus className="w-4 h-4 mr-2" />
          New Billing Record
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Billing Record</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <Label htmlFor="project">Project *</Label>
                <Select value={formData.project_id} onValueChange={(value) => setFormData(prev => ({ ...prev, project_id: value }))}>
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
                <Label htmlFor="billing_period_start">Billing Period Start *</Label>
                <Input
                  id="billing_period_start"
                  type="date"
                  value={formData.billing_period_start}
                  onChange={(e) => setFormData(prev => ({ ...prev, billing_period_start: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="billing_period_end">Billing Period End *</Label>
                <Input
                  id="billing_period_end"
                  type="date"
                  value={formData.billing_period_end}
                  onChange={(e) => setFormData(prev => ({ ...prev, billing_period_end: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="invoice_number">Invoice Number</Label>
                <Input
                  id="invoice_number"
                  value={formData.invoice_number}
                  onChange={(e) => setFormData(prev => ({ ...prev, invoice_number: e.target.value }))}
                  placeholder="INV-001"
                />
              </div>

              <div>
                <Label htmlFor="billed_amount">Billed Amount *</Label>
                <Input
                  id="billed_amount"
                  type="number"
                  step="0.01"
                  value={formData.billed_amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, billed_amount: e.target.value }))}
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <Label htmlFor="paid_amount">Paid Amount</Label>
                <Input
                  id="paid_amount"
                  type="number"
                  step="0.01"
                  value={formData.paid_amount}
                  onChange={(e) => setFormData(prev => ({ ...prev, paid_amount: e.target.value }))}
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value: 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled') => setFormData(prev => ({ ...prev, status: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Sent">Sent</SelectItem>
                    <SelectItem value="Paid">Paid</SelectItem>
                    <SelectItem value="Overdue">Overdue</SelectItem>
                    <SelectItem value="Cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="invoice_date">Invoice Date</Label>
                <Input
                  id="invoice_date"
                  type="date"
                  value={formData.invoice_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, invoice_date: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="due_date">Due Date</Label>
                <Input
                  id="due_date"
                  type="date"
                  value={formData.due_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="payment_date">Payment Date</Label>
                <Input
                  id="payment_date"
                  type="date"
                  value={formData.payment_date}
                  onChange={(e) => setFormData(prev => ({ ...prev, payment_date: e.target.value }))}
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Additional notes..."
                  rows={3}
                />
              </div>
            </div>
          </div>

          <div className="flex gap-3 pt-4 border-t">
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'Creating...' : 'Create Billing Record'}
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
