
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EditSOVItemDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: any;
  onSave: () => void;
}

export function EditSOVItemDialog({ open, onOpenChange, item, onSave }: EditSOVItemDialogProps) {
  const [formData, setFormData] = useState({
    item_number: '',
    category: '',
    description: '',
    scheduled_value: '',
    change_orders: '',
    total_completed_and_stored: '',
    materials_presently_stored: '',
    retainage_percentage: '10'
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (item) {
      setFormData({
        item_number: item.item_number || '',
        category: item.category || '',
        description: item.description || '',
        scheduled_value: (item.scheduled_value || 0).toString(),
        change_orders: (item.change_orders || 0).toString(),
        total_completed_and_stored: (item.total_completed_and_stored || 0).toString(),
        materials_presently_stored: (item.materials_presently_stored || 0).toString(),
        retainage_percentage: (item.retainage_percentage || 10).toString()
      });
    }
  }, [item]);

  const handleSave = async () => {
    if (!item) return;

    setLoading(true);
    try {
      const scheduledValue = Number(formData.scheduled_value) || 0;
      const changeOrders = Number(formData.change_orders) || 0;
      const totalContract = scheduledValue + changeOrders;
      const totalCompleted = Number(formData.total_completed_and_stored) || 0;
      const percentComplete = totalContract > 0 ? Math.round((totalCompleted / totalContract) * 100) : 0;

      const { error } = await supabase
        .from('sov_items')
        .update({
          item_number: formData.item_number,
          category: formData.category,
          description: formData.description,
          scheduled_value: scheduledValue,
          change_orders: changeOrders,
          total_completed_and_stored: totalCompleted,
          materials_presently_stored: Number(formData.materials_presently_stored) || 0,
          retainage_percentage: Number(formData.retainage_percentage) || 10,
          percent_complete: percentComplete
        })
        .eq('id', item.id);

      if (error) throw error;

      toast.success('SOV item updated successfully');
      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating SOV item:', error);
      toast.error('Failed to update SOV item');
    } finally {
      setLoading(false);
    }
  };

  const categories = [
    'General Requirements',
    'Site Preparation',
    'Concrete',
    'Masonry',
    'Metals',
    'Wood, Plastics, and Composites',
    'Thermal and Moisture Protection',
    'Openings',
    'Finishes',
    'Specialties',
    'Equipment',
    'Furnishings',
    'Special Construction',
    'Conveying Equipment',
    'Fire Suppression',
    'Plumbing',
    'HVAC',
    'Electrical',
    'Communications',
    'Electronic Safety and Security'
  ];

  const totalContract = (Number(formData.scheduled_value) || 0) + (Number(formData.change_orders) || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit SOV Item</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="item_number">Item Number</Label>
              <Input
                id="item_number"
                value={formData.item_number}
                onChange={(e) => setFormData({ ...formData, item_number: e.target.value })}
                placeholder="e.g., 01100"
              />
            </div>
            <div>
              <Label htmlFor="category">Category</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((cat) => (
                    <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Description of work"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="scheduled_value">Scheduled Value</Label>
              <Input
                id="scheduled_value"
                type="number"
                step="0.01"
                value={formData.scheduled_value}
                onChange={(e) => setFormData({ ...formData, scheduled_value: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="change_orders">Change Orders</Label>
              <Input
                id="change_orders"
                type="number"
                step="0.01"
                value={formData.change_orders}
                onChange={(e) => setFormData({ ...formData, change_orders: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="total_contract">Total Contract (Calculated)</Label>
              <Input
                id="total_contract"
                type="number"
                value={totalContract.toFixed(2)}
                disabled
                className="bg-gray-100"
              />
            </div>
            <div>
              <Label htmlFor="total_completed">Total Completed & Stored</Label>
              <Input
                id="total_completed"
                type="number"
                step="0.01"
                value={formData.total_completed_and_stored}
                onChange={(e) => setFormData({ ...formData, total_completed_and_stored: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="materials_stored">Materials Presently Stored</Label>
              <Input
                id="materials_stored"
                type="number"
                step="0.01"
                value={formData.materials_presently_stored}
                onChange={(e) => setFormData({ ...formData, materials_presently_stored: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="retainage">Retainage Percentage</Label>
              <Input
                id="retainage"
                type="number"
                step="0.1"
                value={formData.retainage_percentage}
                onChange={(e) => setFormData({ ...formData, retainage_percentage: e.target.value })}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
