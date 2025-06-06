
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

interface Project {
  id: string;
  name: string;
}

interface PaymentApplication {
  id: string;
  application_number: number;
  current_payment_due: number;
  project_id: string;
}

interface NewBillingDialogProps {
  onBillingCreated: () => void;
  selectedProjectId?: string;
}

type BillingStatus = 'Draft' | 'Sent' | 'Paid' | 'Overdue' | 'Cancelled';

export function NewBillingDialog({ onBillingCreated, selectedProjectId }: NewBillingDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [paymentApps, setPaymentApps] = useState<PaymentApplication[]>([]);
  const [formData, setFormData] = useState<{
    project_id: string;
    billing_period_start: string;
    billing_period_end: string;
    invoice_number: string;
    billed_amount: string;
    paid_amount: string;
    status: BillingStatus;
    invoice_date: string;
    due_date: string;
    payment_date: string;
    notes: string;
  }>({
    project_id: selectedProjectId || '',
    billing_period_start: '',
    billing_period_end: '',
    invoice_number: '',
    billed_amount: '',
    paid_amount: '',
    status: 'Draft',
    invoice_date: new Date().toISOString().split('T')[0],
    due_date: '',
    payment_date: '',
    notes: ''
  });

  useEffect(() => {
    if (selectedProjectId) {
      setFormData(prev => ({ ...prev, project_id: selectedProjectId }));
    }
  }, [selectedProjectId]);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (formData.project_id) {
      fetchPaymentApplications();
    }
  }, [formData.project_id]);

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
    }
  };

  const fetchPaymentApplications = async () => {
    if (!formData.project_id) return;

    try {
      const { data, error } = await supabase
        .from('payment_applications')
        .select('id, application_number, current_payment_due, project_id')
        .eq('project_id', formData.project_id)
        .order('application_number', { ascending: false });

      if (error) throw error;
      setPaymentApps(data || []);
    } catch (error) {
      console.error('Error fetching payment applications:', error);
    }
  };

  const createFromPaymentApp = (paymentApp: PaymentApplication) => {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);

    setFormData(prev => ({
      ...prev,
      billing_period_start: startDate.toISOString().split('T')[0],
      billing_period_end: endDate.toISOString().split('T')[0],
      billed_amount: paymentApp.current_payment_due.toString(),
      invoice_number: `INV-${paymentApp.application_number}`,
      status: 'Draft' as BillingStatus
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.project_id || !formData.billing_period_start || !formData.billing_period_end) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('project_billing')
        .insert({
          project_id: formData.project_id,
          billing_period_start: formData.billing_period_start,
          billing_period_end: formData.billing_period_end,
          invoice_number: formData.invoice_number || null,
          billed_amount: parseFloat(formData.billed_amount) || 0,
          paid_amount: parseFloat(formData.paid_amount) || 0,
          status: formData.status,
          invoice_date: formData.invoice_date || null,
          due_date: formData.due_date || null,
          payment_date: formData.payment_date || null,
          notes: formData.notes || null
        });

      if (error) throw error;

      toast.success('Billing entry created successfully');
      setOpen(false);
      setFormData({
        project_id: selectedProjectId || '',
        billing_period_start: '',
        billing_period_end: '',
        invoice_number: '',
        billed_amount: '',
        paid_amount: '',
        status: 'Draft',
        invoice_date: new Date().toISOString().split('T')[0],
        due_date: '',
        payment_date: '',
        notes: ''
      });
      onBillingCreated();
    } catch (error) {
      console.error('Error creating billing entry:', error);
      toast.error('Failed to create billing entry');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          New Billing Entry
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create New Billing Entry</DialogTitle>
        </DialogHeader>
        
        {paymentApps.length > 0 && (
          <div className="mb-6 p-4 bg-blue-50 rounded-lg">
            <h3 className="font-medium mb-3">Create from Payment Application</h3>
            <div className="space-y-2">
              {paymentApps.slice(0, 3).map((app) => (
                <div key={app.id} className="flex justify-between items-center p-2 bg-white rounded border">
                  <span>App #{app.application_number} - ${app.current_payment_due?.toLocaleString()}</span>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => createFromPaymentApp(app)}
                  >
                    Use This
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label htmlFor="project">Project *</Label>
            <Select 
              value={formData.project_id} 
              onValueChange={(value) => setFormData(prev => ({ ...prev, project_id: value }))}
              disabled={!!selectedProjectId}
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
            <Label htmlFor="billed_amount">Billed Amount</Label>
            <Input
              id="billed_amount"
              type="number"
              step="0.01"
              value={formData.billed_amount}
              onChange={(e) => setFormData(prev => ({ ...prev, billed_amount: e.target.value }))}
              placeholder="0.00"
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

          <div>
            <Label htmlFor="status">Status</Label>
            <Select 
              value={formData.status} 
              onValueChange={(value: BillingStatus) => setFormData(prev => ({ ...prev, status: value }))}
            >
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

          <div className="md:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes..."
              rows={3}
            />
          </div>

          <div className="md:col-span-2 flex gap-2 pt-4">
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'Creating...' : 'Create Billing Entry'}
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
