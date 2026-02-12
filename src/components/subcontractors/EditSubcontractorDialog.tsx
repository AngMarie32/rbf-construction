
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { MapPin, Plus, X } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Subcontractor {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  specialties: string[] | null;
  status: string;
  rating: number | null;
  notes: string | null;
  w9_on_file: boolean;
  insurance_expiry: string | null;
  travel_radius: number | null;
  region: string | null;
}

interface EditSubcontractorDialogProps {
  subcontractor: Subcontractor;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubcontractorUpdated: () => void;
}

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

export const EditSubcontractorDialog: React.FC<EditSubcontractorDialogProps> = ({
  subcontractor,
  open,
  onOpenChange,
  onSubcontractorUpdated
}) => {
  const [formData, setFormData] = useState<Partial<Subcontractor>>(subcontractor);
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>(subcontractor.specialties || []);
  const [loading, setLoading] = useState(false);
  const [regions, setRegions] = useState<string[]>(defaultRegions);
  const [showNewRegion, setShowNewRegion] = useState(false);
  const [newRegionName, setNewRegionName] = useState('');
  const [customSpecialties, setCustomSpecialties] = useState<string[]>([]);
  const [showNewSpecialty, setShowNewSpecialty] = useState(false);
  const [newSpecialtyName, setNewSpecialtyName] = useState('');

  const specialties = [
    'Concrete', 'Electrical', 'HVAC', 'Insulation', 'Landscaping', 'Masonry',
    'Painting', 'Plumbing', 'Roofing', 'Siding', 'Tile/Flooring', 'Windows/Doors'
  ].sort();

  // Use default regions (database column not yet available)
  useEffect(() => {
    if (open) {
      setRegions(defaultRegions);
    }
  }, [open]);

  // Reset form when subcontractor changes
  useEffect(() => {
    setFormData(subcontractor);
    setSelectedSpecialties(subcontractor.specialties || []);
    // Detect custom specialties not in the default list
    const customs = (subcontractor.specialties || []).filter(s => !specialties.includes(s));
    setCustomSpecialties(customs);
  }, [subcontractor]);

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
    setLoading(true);

    try {
      const { error } = await supabase
        .from('subcontractors')
        .update({
          ...formData,
          specialties: selectedSpecialties,
          updated_at: new Date().toISOString()
        })
        .eq('id', subcontractor.id);

      if (error) throw error;

      toast.success('Subcontractor updated successfully');
      onSubcontractorUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating subcontractor:', error);
      toast.error('Failed to update subcontractor');
    } finally {
      setLoading(false);
    }
  };

  const toggleSpecialty = (specialty: string) => {
    setSelectedSpecialties(prev =>
      prev.includes(specialty)
        ? prev.filter(s => s !== specialty)
        : [...prev, specialty]
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Subcontractor</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="company">Company *</Label>
              <Input
                id="company"
                value={formData.company || ''}
                onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                required
              />
            </div>
            <div>
              <Label htmlFor="name">Contact Name</Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email || ''}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone || ''}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address || ''}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city || ''}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={formData.state || ''}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="zip_code">ZIP Code</Label>
              <Input
                id="zip_code"
                value={formData.zip_code || ''}
                onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
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
                value={formData.region || ''} 
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
              {formData.region && !defaultRegions.includes(formData.region) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => {
                    setRegions(prev => prev.filter(r => r !== formData.region));
                    setFormData(prev => ({ ...prev, region: '' }));
                  }}
                >
                  <X className="w-4 h-4" />
                </Button>
              )}
              {formData.region && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="shrink-0"
                  onClick={() => setFormData(prev => ({ ...prev, region: '' }))}
                >
                  Clear
                </Button>
              )}
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="travel_radius">Travel Radius (miles)</Label>
              <Input
                id="travel_radius"
                type="number"
                value={formData.travel_radius || ''}
                onChange={(e) => setFormData({ ...formData, travel_radius: parseInt(e.target.value) || null })}
              />
            </div>
            <div>
              <Label htmlFor="insurance_expiry">Insurance Expiry</Label>
              <Input
                id="insurance_expiry"
                type="date"
                value={formData.insurance_expiry || ''}
                onChange={(e) => setFormData({ ...formData, insurance_expiry: e.target.value })}
              />
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="w9_on_file"
              checked={formData.w9_on_file || false}
              onCheckedChange={(checked) => setFormData({ ...formData, w9_on_file: checked as boolean })}
            />
            <Label htmlFor="w9_on_file">W9 on File</Label>
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value) => setFormData({ ...formData, status: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Specialties</Label>
            <div className="grid grid-cols-3 gap-2 mt-2">
              {[...specialties, ...customSpecialties].sort().map(specialty => (
                <div key={specialty} className="flex items-center space-x-2 group">
                  <Checkbox
                    id={`edit-${specialty}`}
                    checked={selectedSpecialties.includes(specialty)}
                    onCheckedChange={() => toggleSpecialty(specialty)}
                  />
                  <Label htmlFor={`edit-${specialty}`} className="text-sm flex-1">{specialty}</Label>
                  {customSpecialties.includes(specialty) && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-5 w-5 p-0 opacity-0 group-hover:opacity-100"
                      onClick={() => {
                        setCustomSpecialties(prev => prev.filter(s => s !== specialty));
                        setSelectedSpecialties(prev => prev.filter(s => s !== specialty));
                      }}
                    >
                      <X className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <div className="mt-2">
              {showNewSpecialty ? (
                <div className="flex gap-2">
                  <Input
                    value={newSpecialtyName}
                    onChange={(e) => setNewSpecialtyName(e.target.value)}
                    placeholder="Enter new specialty"
                    className="flex-1"
                  />
                  <Button type="button" size="sm" onClick={() => {
                    const name = newSpecialtyName.trim();
                    if (name && !specialties.includes(name) && !customSpecialties.includes(name)) {
                      setCustomSpecialties(prev => [...prev, name]);
                      setSelectedSpecialties(prev => [...prev, name]);
                      setNewSpecialtyName('');
                      setShowNewSpecialty(false);
                    }
                  }}>Add</Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => { setShowNewSpecialty(false); setNewSpecialtyName(''); }}>Cancel</Button>
                </div>
              ) : (
                <Button type="button" variant="outline" size="sm" onClick={() => setShowNewSpecialty(true)}>
                  <Plus className="w-3 h-3 mr-1" /> Add Specialty
                </Button>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes || ''}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
