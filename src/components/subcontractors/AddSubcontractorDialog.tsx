
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface AddSubcontractorDialogProps {
  onSubcontractorCreated: () => void;
}

const tradeOptions = [
  'General Contractor',
  'Electrical',
  'Plumbing',
  'HVAC',
  'Roofing',
  'Flooring',
  'Painting',
  'Drywall',
  'Concrete',
  'Framing',
  'Landscaping',
  'Excavation',
  'Masonry',
  'Steel',
  'Glass & Glazing',
  'Insulation',
  'Tile & Stone',
  'Cabinetry',
  'Asphalt',
  'Other'
];

export function AddSubcontractorDialog({ onSubcontractorCreated }: AddSubcontractorDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    specialties: [] as string[],
    w9_on_file: false,
    insurance_expiry: '',
    notes: ''
  });

  const resetForm = () => {
    setFormData({
      name: '',
      company: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      specialties: [],
      w9_on_file: false,
      insurance_expiry: '',
      notes: ''
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.company.trim()) {
      toast.error('Name and Company are required fields');
      return;
    }

    setLoading(true);
    try {
      const insertData = {
        name: formData.name.trim(),
        company: formData.company.trim(),
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        address: formData.address.trim() || null,
        city: formData.city.trim() || null,
        state: formData.state.trim() || null,
        zip_code: formData.zip_code.trim() || null,
        specialties: formData.specialties.length > 0 ? formData.specialties : null,
        w9_on_file: formData.w9_on_file,
        insurance_expiry: formData.insurance_expiry || null,
        notes: formData.notes.trim() || null,
        status: 'Active'
      };

      console.log('Inserting subcontractor data:', insertData);

      const { data, error } = await supabase
        .from('subcontractors')
        .insert([insertData])
        .select();

      if (error) {
        console.error('Supabase error:', error);
        toast.error(`Failed to add subcontractor: ${error.message}`);
        return;
      }

      console.log('Successfully inserted:', data);
      toast.success('Subcontractor added successfully');
      setOpen(false);
      resetForm();
      onSubcontractorCreated();
    } catch (error: any) {
      console.error('Error adding subcontractor:', error);
      toast.error(`Failed to add subcontractor: ${error.message || 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleSpecialtyChange = (specialty: string, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({
        ...prev,
        specialties: [...prev.specialties, specialty]
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        specialties: prev.specialties.filter(s => s !== specialty)
      }));
    }
  };

  return (
    <Dialog open={open} onOpenChange={(newOpen) => {
      setOpen(newOpen);
      if (!newOpen) {
        resetForm();
      }
    }}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          Add Subcontractor
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Subcontractor</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Contact Name *</Label>
              <Input
                id="name"
                required
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter contact name"
              />
            </div>
            <div>
              <Label htmlFor="company">Company *</Label>
              <Input
                id="company"
                required
                value={formData.company}
                onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                placeholder="Enter company name"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                placeholder="Enter email address"
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                placeholder="Enter phone number"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              placeholder="Enter street address"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                placeholder="Enter city"
              />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                placeholder="Enter state"
              />
            </div>
            <div>
              <Label htmlFor="zip_code">Zip Code</Label>
              <Input
                id="zip_code"
                value={formData.zip_code}
                onChange={(e) => setFormData(prev => ({ ...prev, zip_code: e.target.value }))}
                placeholder="Enter zip code"
              />
            </div>
          </div>

          <div>
            <Label>Specialties/Trades</Label>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2 mt-2 max-h-32 overflow-y-auto border rounded p-2">
              {tradeOptions.map(trade => (
                <div key={trade} className="flex items-center space-x-2">
                  <Checkbox
                    id={trade}
                    checked={formData.specialties.includes(trade)}
                    onCheckedChange={(checked) => handleSpecialtyChange(trade, checked as boolean)}
                  />
                  <Label htmlFor={trade} className="text-sm">{trade}</Label>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="insurance_expiry">Insurance Expiry</Label>
              <Input
                id="insurance_expiry"
                type="date"
                value={formData.insurance_expiry}
                onChange={(e) => setFormData(prev => ({ ...prev, insurance_expiry: e.target.value }))}
              />
            </div>
            <div className="flex items-center space-x-2 pt-6">
              <Checkbox
                id="w9_on_file"
                checked={formData.w9_on_file}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, w9_on_file: checked as boolean }))}
              />
              <Label htmlFor="w9_on_file">W9 on File</Label>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              rows={3}
              placeholder="Enter any additional notes"
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="submit" disabled={loading} className="flex-1">
              {loading ? 'Adding...' : 'Add Subcontractor'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setOpen(false)} 
              className="flex-1"
              disabled={loading}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
