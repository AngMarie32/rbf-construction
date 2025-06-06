
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ChangeOrder {
  id: string;
  number: string;
  description: string;
  amount: number;
  status: string;
  date: string;
}

interface EditChangeOrderDialogProps {
  changeOrder: ChangeOrder | null;
  open: boolean;
  onClose: () => void;
  onChangeOrderUpdated: () => void;
}

export function EditChangeOrderDialog({ changeOrder, open, onClose, onChangeOrderUpdated }: EditChangeOrderDialogProps) {
  const [formData, setFormData] = useState({
    number: '',
    description: '',
    amount: '',
    status: 'Draft',
    date: new Date().toISOString().split('T')[0]
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (changeOrder) {
      setFormData({
        number: changeOrder.number,
        description: changeOrder.description,
        amount: changeOrder.amount.toString(),
        status: changeOrder.status,
        date: changeOrder.date
      });
    }
  }, [changeOrder]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!changeOrder) return;

    setLoading(true);

    try {
      const { error } = await supabase
        .from('change_orders')
        .update({
          number: formData.number,
          description: formData.description,
          amount: parseFloat(formData.amount),
          status: formData.status,
          date: formData.date,
          updated_at: new Date().toISOString()
        })
        .eq('id', changeOrder.id);

      if (error) throw error;

      toast.success('Change order updated successfully');
      onChangeOrderUpdated();
      onClose();
    } catch (error) {
      console.error('Error updating change order:', error);
      toast.error('Failed to update change order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Edit Change Order</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="number">Change Order Number *</Label>
            <Input
              id="number"
              value={formData.number}
              onChange={(e) => setFormData(prev => ({ ...prev, number: e.target.value }))}
              placeholder="CO-001"
              required
            />
          </div>

          <div>
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Change order description"
              required
            />
          </div>

          <div>
            <Label htmlFor="amount">Amount *</Label>
            <Input
              id="amount"
              type="number"
              step="0.01"
              value={formData.amount}
              onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
              placeholder="0.00"
              required
            />
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Pending">Pending</SelectItem>
                <SelectItem value="Approved">Approved</SelectItem>
                <SelectItem value="Rejected">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="date">Date *</Label>
            <Input
              id="date"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData(prev => ({ ...prev, date: e.target.value }))}
              required
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" className="flex-1" disabled={loading}>
              {loading ? 'Updating...' : 'Update Change Order'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
