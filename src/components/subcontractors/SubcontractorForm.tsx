
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Subcontractor {
  id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  specialties: string[];
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  rating?: number;
  notes?: string;
  created_at: string;
}

interface SubcontractorFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingSubcontractor: Subcontractor | null;
  onSuccess: () => void;
}

const specialties = [
  'Concrete',
  'Electrical',
  'Plumbing',
  'HVAC',
  'Roofing',
  'Framing',
  'Drywall',
  'Flooring',
  'Painting',
  'Landscaping',
  'Excavation',
  'Masonry',
  'Insulation',
  'Windows & Doors',
  'Asphalt',
  'Other'
];

export function SubcontractorForm({ open, onOpenChange, editingSubcontractor, onSuccess }: SubcontractorFormProps) {
  const [formData, setFormData] = useState({
    name: editingSubcontractor?.name || '',
    company: editingSubcontractor?.company || '',
    email: editingSubcontractor?.email || '',
    phone: editingSubcontractor?.phone || '',
    specialties: editingSubcontractor?.specialties || ['Other'],
    address: editingSubcontractor?.address || '',
    city: editingSubcontractor?.city || '',
    state: editingSubcontractor?.state || '',
    zip_code: editingSubcontractor?.zip_code || '',
    rating: editingSubcontractor?.rating?.toString() || '',
    notes: editingSubcontractor?.notes || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const submitData = {
        name: formData.name,
        company: formData.company,
        email: formData.email,
        phone: formData.phone,
        specialties: formData.specialties,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zip_code,
        rating: formData.rating ? parseFloat(formData.rating) : null,
        notes: formData.notes
      };

      if (editingSubcontractor) {
        const { error } = await supabase
          .from('subcontractors')
          .update(submitData)
          .eq('id', editingSubcontractor.id);

        if (error) throw error;
        toast.success('Subcontractor updated successfully');
      } else {
        const { error } = await supabase
          .from('subcontractors')
          .insert([submitData]);

        if (error) throw error;
        toast.success('Subcontractor created successfully');
      }

      onOpenChange(false);
      onSuccess();
    } catch (error) {
      console.error('Error saving subcontractor:', error);
      toast.error('Failed to save subcontractor');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingSubcontractor ? 'Edit Subcontractor' : 'Add New Subcontractor'}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Contact Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter contact name"
              />
            </div>
            <div>
              <Label htmlFor="company">Company Name</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                placeholder="Enter company name"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter email address"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                placeholder="Enter phone number"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="specialties">Specialties</Label>
            <Select 
              value={formData.specialties[0] || ''} 
              onValueChange={(value) => setFormData({ ...formData, specialties: [value] })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select specialty" />
              </SelectTrigger>
              <SelectContent>
                {specialties.map(specialty => (
                  <SelectItem key={specialty} value={specialty}>
                    {specialty}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Enter street address"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="Enter city"
              />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="Enter state"
              />
            </div>
            <div>
              <Label htmlFor="zip_code">Zip Code</Label>
              <Input
                id="zip_code"
                value={formData.zip_code}
                onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                placeholder="Enter zip code"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="rating">Rating (1-5)</Label>
            <Input
              id="rating"
              type="number"
              min="1"
              max="5"
              step="0.1"
              value={formData.rating}
              onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
              placeholder="Enter rating"
            />
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              placeholder="Enter additional notes"
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              {editingSubcontractor ? 'Update' : 'Create'} Subcontractor
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
