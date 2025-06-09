
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NewEquipmentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEquipmentCreated: () => void;
}

export function NewEquipmentDialog({ open, onOpenChange, onEquipmentCreated }: NewEquipmentDialogProps) {
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    hourly_rate: '',
    status: 'Available',
    location: '',
    notes: '',
    image: null as File | null
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const equipmentData = {
        name: formData.name,
        category: formData.category,
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : 0,
        status: formData.status,
        location: formData.location || null,
        notes: formData.notes || null,
        image_url: null // We'll handle image upload separately if needed
      };

      const { error } = await supabase
        .from('equipment')
        .insert(equipmentData);

      if (error) throw error;

      toast.success('Equipment added successfully');
      onEquipmentCreated();
      onOpenChange(false);
      setFormData({
        name: '',
        category: '',
        hourly_rate: '',
        status: 'Available',
        location: '',
        notes: '',
        image: null
      });
    } catch (error) {
      console.error('Error creating equipment:', error);
      toast.error('Failed to add equipment');
    } finally {
      setLoading(false);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setFormData({ ...formData, image: file });
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Add New Equipment</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Equipment Name *</Label>
            <Input
              id="name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </div>

          <div>
            <Label htmlFor="category">Category *</Label>
            <Select 
              value={formData.category} 
              onValueChange={(value) => setFormData({ ...formData, category: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Excavators">Excavators</SelectItem>
                <SelectItem value="Bulldozers">Bulldozers</SelectItem>
                <SelectItem value="Cranes">Cranes</SelectItem>
                <SelectItem value="Trucks">Trucks</SelectItem>
                <SelectItem value="Generators">Generators</SelectItem>
                <SelectItem value="Compactors">Compactors</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="hourly_rate">Hourly Rate ($)</Label>
            <Input
              id="hourly_rate"
              type="number"
              step="0.01"
              min="0"
              value={formData.hourly_rate}
              onChange={(e) => setFormData({ ...formData, hourly_rate: e.target.value })}
              placeholder="0.00"
            />
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select 
              value={formData.status} 
              onValueChange={(value) => setFormData({ ...formData, status: value })}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Available">Available</SelectItem>
                <SelectItem value="In Use">In Use</SelectItem>
                <SelectItem value="Maintenance">Maintenance</SelectItem>
                <SelectItem value="Out of Service">Out of Service</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Current location"
            />
          </div>

          <div>
            <Label htmlFor="image">Equipment Image</Label>
            <Input
              id="image"
              type="file"
              accept="image/*"
              onChange={handleImageChange}
              className="cursor-pointer"
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Additional notes about this equipment"
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Adding...' : 'Add Equipment'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
