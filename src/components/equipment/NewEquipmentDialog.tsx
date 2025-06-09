
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

interface NewEquipmentDialogProps {
  onEquipmentCreated: () => void;
}

export function NewEquipmentDialog({ onEquipmentCreated }: NewEquipmentDialogProps) {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    category: '',
    hourly_rate: '',
    status: 'Available',
    description: '',
    year: '',
    value: ''
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const equipmentData = {
        name: formData.name,
        category: formData.category || 'Other',
        hourly_rate: formData.hourly_rate ? parseFloat(formData.hourly_rate) : 0,
        status: formData.status,
        description: formData.description || null,
        year: formData.year ? parseInt(formData.year) : null,
        value: formData.value ? parseFloat(formData.value) : null
      };

      const { error } = await supabase
        .from('equipment')
        .insert(equipmentData);

      if (error) throw error;

      onEquipmentCreated();
      setOpen(false);
      setFormData({
        name: '',
        category: '',
        hourly_rate: '',
        status: 'Available',
        description: '',
        year: '',
        value: ''
      });
    } catch (error) {
      console.error('Error creating equipment:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Add Equipment
        </Button>
      </DialogTrigger>
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
            <Label htmlFor="category">Category</Label>
            <Select 
              value={formData.category} 
              onValueChange={(value) => setFormData({ ...formData, category: value })}
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
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Equipment description"
              rows={3}
            />
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
            <Label htmlFor="year">Year</Label>
            <Input
              id="year"
              type="number"
              min="1900"
              max="2030"
              value={formData.year}
              onChange={(e) => setFormData({ ...formData, year: e.target.value })}
              placeholder="2020"
            />
          </div>

          <div>
            <Label htmlFor="value">Equipment Value ($)</Label>
            <Input
              id="value"
              type="number"
              step="0.01"
              min="0"
              value={formData.value}
              onChange={(e) => setFormData({ ...formData, value: e.target.value })}
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

          <div className="flex justify-end gap-3 pt-4">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
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
