
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Expense {
  id: string;
  project_id: string;
  amount: number;
  date: string;
  category: string;
  description: string;
  vendor?: string;
  receipt_number?: string;
  status: string;
  created_at: string;
  updated_at: string;
  projects?: {
    name: string;
  };
}

interface Project {
  id: string;
  name: string;
}

interface EditExpenseDialogProps {
  expense: Expense;
  projects: Project[];
  onExpenseUpdated: () => void;
  onClose: () => void;
}

const categories = [
  'Materials',
  'Labor',
  'Equipment',
  'Subcontractors',
  'Permits',
  'Travel',
  'Utilities',
  'Office Supplies',
  'Insurance',
  'Professional Services',
  'Fuel',
  'Maintenance',
  'Other'
];

const statuses = [
  'Pending Field Approval',
  'Pending Office Approval',
  'Approved',
  'Paid',
  'Rejected'
];

export function EditExpenseDialog({ expense, projects, onExpenseUpdated, onClose }: EditExpenseDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    project_id: expense.project_id,
    description: expense.description,
    category: expense.category,
    amount: expense.amount.toString(),
    date: expense.date,
    vendor: expense.vendor || '',
    receipt_number: expense.receipt_number || '',
    status: expense.status
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.project_id || !formData.category || !formData.amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('expenses')
        .update({
          project_id: formData.project_id,
          description: formData.description || null,
          category: formData.category,
          amount: parseFloat(formData.amount),
          date: formData.date,
          vendor: formData.vendor || null,
          receipt_number: formData.receipt_number || null,
          status: formData.status
        })
        .eq('id', expense.id);

      if (error) throw error;

      toast.success('Expense updated successfully');
      onExpenseUpdated();
      onClose();
    } catch (error) {
      console.error('Error updating expense:', error);
      toast.error('Failed to update expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Expense</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="project">Project *</Label>
            <Select value={formData.project_id} onValueChange={(value) => setFormData({...formData, project_id: value})}>
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
            <Label htmlFor="category">Category *</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="amount">Amount *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData({...formData, amount: e.target.value})}
              required
            />
          </div>

          <div>
            <Label htmlFor="date">Date *</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({...formData, date: e.target.value})}
              required
            />
          </div>

          <div>
            <Label htmlFor="vendor">Vendor</Label>
            <Input
              id="vendor"
              value={formData.vendor}
              onChange={(e) => setFormData({...formData, vendor: e.target.value})}
            />
          </div>

          <div>
            <Label htmlFor="receipt_number">Receipt Number</Label>
            <Input
              id="receipt_number"
              value={formData.receipt_number}
              onChange={(e) => setFormData({...formData, receipt_number: e.target.value})}
            />
          </div>

          <div>
            <Label htmlFor="status">Status *</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({...formData, status: value})}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                {statuses.map((status) => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              rows={2}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Updating...' : 'Update Expense'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
