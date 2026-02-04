
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, MapPin } from 'lucide-react';
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

const defaultRegions = [
  'Northeast',
  'Southeast', 
  'Midwest',
  'Southwest',
  'West Coast',
  'Pacific Northwest',
  'Mountain Region',
  'Gulf Coast',
  'Mid-Atlantic',
  'New England'
];

export function AddSubcontractorDialog({ onSubcontractorCreated }: AddSubcontractorDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [regions, setRegions] = useState<string[]>(defaultRegions);
  const [showNewRegion, setShowNewRegion] = useState(false);
  const [newRegionName, setNewRegionName] = useState('');
  const [formData, setFormData] = useState({
    company: '',
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zip_code: '',
    specialties: [] as string[],
    region: '',
    w9_on_file: false,
    insurance_expiry: '',
    notes: ''
  });

  // Use default regions (database column not yet available)
  useEffect(() => {
    if (open) {
      setRegions(defaultRegions);
    }
  }, [open]);

  const resetForm = () => {
    setFormData({
      company: '',
      name: '',
      email: '',
      phone: '',
      address: '',
      city: '',
      state: '',
      zip_code: '',
      specialties: [],
      region: '',
      w9_on_file: false,
      insurance_expiry: '',
      notes: ''
    });
    setShowNewRegion(false);
    setNewRegionName('');
  };

  const handleAddNewRegion = () => {
    if (newRegionName.trim()) {
      const newRegion = newRegionName.trim();
      if (!regions.includes(newRegion)) {
        setRegions(prev => [...prev, newRegion].sort());
      }
      setFormData(prev => ({ ...prev, region: newRegion }));
      setNewRegionName('');
      setShowNewRegion(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.company.trim()) {
      toast.error('Company name is required');
      return;
    }

    setLoading(true);
    try {
      const insertData = {
        company: formData.company.trim(),
        name: formData.name.trim() || null,
        email: formData.email.trim() || null,
        phone: formData.phone.trim() || null,
        address: formData.address.trim() || null,
        city: formData.city.trim() || null,
        state: formData.state.trim() || null,
        zip_code: formData.zip_code.trim() || null,
        specialties: formData.specialties.length > 0 ? formData.specialties : null,
        region: formData.region || null,
        w9_on_file: formData.w9_on_file,
        insurance_expiry: formData.insurance_expiry || null,
        notes: formData.notes.trim() || null,
        status: 'Active'
      };

      console.log('Inserting subcontractor data:', insertData);

      const { error } = await supabase
        .from('subcontractors')
        .insert([insertData]);

      if (error) {
        console.error('Supabase error:', error);
        toast.error(`Failed to add subcontractor: ${error.message}`);
        return;
      }

      console.log('Successfully inserted subcontractor');
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
              <Label htmlFor="company">Company Name *</Label>
              <Input
                id="company"
                required
                value={formData.company}
                onChange={(e) => setFormData(prev => ({ ...prev, company: e.target.value }))}
                placeholder="Enter company name"
              />
            </div>
            <div>
              <Label htmlFor="name">Contact Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="Enter contact name (optional)"
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

          {/* Region Selection */}
          <div>
            <Label className="flex items-center gap-2">
              <MapPin className="w-4 h-4" />
              Service Region
            </Label>
            <div className="flex gap-2 mt-1">
              <Select 
                value={formData.region} 
                onValueChange={(value) => {
                  if (value === '__new__') {
                    setShowNewRegion(true);
                  } else {
                    setFormData(prev => ({ ...prev, region: value }));
                  }
                }}
              >
                <SelectTrigger className="flex-1">
                  <SelectValue placeholder="Select a region" />
                </SelectTrigger>
                <SelectContent>
                  {regions.map(region => (
                    <SelectItem key={region} value={region}>{region}</SelectItem>
                  ))}
                  <SelectItem value="__new__">+ Add New Region</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {showNewRegion && (
              <div className="flex gap-2 mt-2">
                <Input
                  value={newRegionName}
                  onChange={(e) => setNewRegionName(e.target.value)}
                  placeholder="Enter new region name"
                  className="flex-1"
                />
                <Button type="button" size="sm" onClick={handleAddNewRegion}>
                  Add
                </Button>
                <Button type="button" size="sm" variant="outline" onClick={() => setShowNewRegion(false)}>
                  Cancel
                </Button>
              </div>
            )}
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
