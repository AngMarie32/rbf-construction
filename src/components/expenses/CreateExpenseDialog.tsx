
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreateExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  onExpenseCreated: () => void;
}

export function CreateExpenseDialog({ open, onOpenChange, projectId, onExpenseCreated }: CreateExpenseDialogProps) {
  const [projects, setProjects] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    project_id: projectId || '',
    category: '',
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    vendor: '',
    receipt_number: '',
    status: 'Pending Field Approval'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchProjects();
    }
  }, [open]);

  useEffect(() => {
    setFormData(prev => ({ ...prev, project_id: projectId || '' }));
  }, [projectId]);

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
    if (!formData.project_id || !formData.category || !formData.description || !formData.amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('expenses')
        .insert({
          project_id: formData.project_id,
          category: formData.category,
          description: formData.description,
          amount: Number(formData.amount),
          date: formData.date,
          vendor: formData.vendor || null,
          receipt_number: formData.receipt_number || null,
          status: formData.status
        });

      if (error) throw error;

      toast.success('Expense created successfully');
      onExpenseCreated();
      onOpenChange(false);
      setFormData({
        project_id: projectId || '',
        category: '',
        description: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        vendor: '',
        receipt_number: '',
        status: 'Pending Field Approval'
      });
    } catch (error) {
      console.error('Error creating expense:', error);
      toast.error('Failed to create expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create New Expense</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="project">Project *</Label>
            <Select value={formData.project_id} onValueChange={(value) => setFormData({ ...formData, project_id: value })}>
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
            <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
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
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Enter expense description"
              rows={2}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div>
              <Label htmlFor="date">Date</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="vendor">Vendor</Label>
            <Input
              id="vendor"
              value={formData.vendor}
              onChange={(e) => setFormData({ ...formData, vendor: e.target.value })}
              placeholder="Enter vendor name"
            />
          </div>

          <div>
            <Label htmlFor="receipt_number">Receipt Number</Label>
            <Input
              id="receipt_number"
              value={formData.receipt_number}
              onChange={(e) => setFormData({ ...formData, receipt_number: e.target.value })}
              placeholder="Enter receipt number"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Creating...' : 'Create Expense'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
