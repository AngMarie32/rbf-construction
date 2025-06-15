
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EditSOVItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sovItem: any;
  onSave: () => void;
}

export function EditSOVItemDialog({ open, onOpenChange, sovItem, onSave }: EditSOVItemDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    item_number: '',
    description: '',
    category: '',
    scheduled_value: '',
    change_orders: '',
    previous_applications: '',
    this_period: '',
    materials_stored: '',
    retainage_percentage: '10'
  });

  useEffect(() => {
    if (sovItem) {
      setFormData({
        item_number: sovItem.item_number || '',
        description: sovItem.description || '',
        category: sovItem.category || '',
        scheduled_value: sovItem.scheduled_value?.toString() || '',
        change_orders: sovItem.change_orders?.toString() || '0',
        previous_applications: sovItem.previous_applications?.toString() || '0',
        this_period: sovItem.this_period?.toString() || '0',
        materials_stored: sovItem.materials_stored?.toString() || '0',
        retainage_percentage: sovItem.retainage_percentage?.toString() || '10'
      });
    }
  }, [sovItem]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.item_number || !formData.description || !formData.scheduled_value) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('sov_items')
        .update({
          item_number: formData.item_number,
          description: formData.description,
          category: formData.category,
          scheduled_value: parseFloat(formData.scheduled_value),
          change_orders: parseFloat(formData.change_orders) || 0,
          previous_applications: parseFloat(formData.previous_applications) || 0,
          this_period: parseFloat(formData.this_period) || 0,
          materials_stored: parseFloat(formData.materials_stored) || 0,
          retainage_percentage: parseFloat(formData.retainage_percentage) || 10
        })
        .eq('id', sovItem.id);

      if (error) throw error;

      toast.success('SOV item updated successfully');
      onOpenChange(false);
      onSave();
    } catch (error) {
      console.error('Error updating SOV item:', error);
      toast.error('Failed to update SOV item');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Edit SOV Item</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="item_number">Item Number *</Label>
              <Input
                id="item_number"
                value={formData.item_number}
                onChange={(e) => setFormData({ ...formData, item_number: e.target.value })}
                placeholder="e.g., 001"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="category">Category *</Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                placeholder="e.g., Site Work"
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Describe the work item..."
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="scheduled_value">Scheduled Value ($) *</Label>
              <Input
                id="scheduled_value"
                type="number"
                step="0.01"
                value={formData.scheduled_value}
                onChange={(e) => setFormData({ ...formData, scheduled_value: e.target.value })}
                placeholder="0.00"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="change_orders">Change Orders ($)</Label>
              <Input
                id="change_orders"
                type="number"
                step="0.01"
                value={formData.change_orders}
                onChange={(e) => setFormData({ ...formData, change_orders: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="previous_applications">Previous Applications ($)</Label>
              <Input
                id="previous_applications"
                type="number"
                step="0.01"
                value={formData.previous_applications}
                onChange={(e) => setFormData({ ...formData, previous_applications: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="this_period">This Period ($)</Label>
              <Input
                id="this_period"
                type="number"
                step="0.01"
                value={formData.this_period}
                onChange={(e) => setFormData({ ...formData, this_period: e.target.value })}
                placeholder="0.00"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="materials_stored">Materials Stored ($)</Label>
              <Input
                id="materials_stored"
                type="number"
                step="0.01"
                value={formData.materials_stored}
                onChange={(e) => setFormData({ ...formData, materials_stored: e.target.value })}
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="retainage_percentage">Retainage % *</Label>
              <Input
                id="retainage_percentage"
                type="number"
                step="0.1"
                value={formData.retainage_percentage}
                onChange={(e) => setFormData({ ...formData, retainage_percentage: e.target.value })}
                placeholder="10"
                required
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update SOV Item'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
