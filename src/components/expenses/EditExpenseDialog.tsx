
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
}

interface EditExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expense: Expense | null;
  onExpenseUpdated: () => void;
}

export function EditExpenseDialog({ open, onOpenChange, expense, onExpenseUpdated }: EditExpenseDialogProps) {
  const [projects, setProjects] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    project_id: '',
    category: '',
    description: '',
    amount: '',
    date: '',
    vendor: '',
    receipt_number: ''
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && expense) {
      fetchProjects();
      setFormData({
        project_id: expense.project_id,
        category: expense.category,
        description: expense.description,
        amount: expense.amount.toString(),
        date: expense.date,
        vendor: expense.vendor || '',
        receipt_number: expense.receipt_number || ''
      });
    }
  }, [open, expense]);

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

  const handleSave = async () => {
    if (!expense || !formData.project_id || !formData.category || !formData.amount) {
      toast.error('Please fill in project, category, and amount');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('expenses')
        .update({
          project_id: formData.project_id,
          category: formData.category,
          description: formData.description || '',
          amount: parseFloat(formData.amount),
          date: formData.date,
          vendor: formData.vendor || null,
          receipt_number: formData.receipt_number || null
        })
        .eq('id', expense.id);

      if (error) throw error;

      toast.success('Expense updated successfully');
      onExpenseUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating expense:', error);
      toast.error('Failed to update expense');
    } finally {
      setLoading(false);
    }
  };

  if (!expense) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Expense</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="project">Project</Label>
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
            <Label htmlFor="category">Category</Label>
            <Select value={formData.category} onValueChange={(value) => setFormData(prev => ({ ...prev, category: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Materials">Materials</SelectItem>
                <SelectItem value="Labor">Labor</SelectItem>
                <SelectItem value="Equipment">Equipment</SelectItem>
                <SelectItem value="Travel">Travel</SelectItem>
                <SelectItem value="Office">Office</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Enter expense description"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">Amount</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="vendor">Vendor</Label>
            <Input
              id="vendor"
              value={formData.vendor}
              onChange={(e) => setFormData(prev => ({ ...prev, vendor: e.target.value }))}
              placeholder="Enter vendor name"
            />
          </div>

          <div>
            <Label htmlFor="receipt_number">Invoice Number</Label>
            <Input
              id="receipt_number"
              value={formData.receipt_number}
              onChange={(e) => setFormData(prev => ({ ...prev, receipt_number: e.target.value }))}
              placeholder="Enter invoice number"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Updating...' : 'Update Expense'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
