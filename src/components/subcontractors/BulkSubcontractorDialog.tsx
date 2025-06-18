
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Upload, Trash2, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const SPECIALTY_OPTIONS = [
  'Electrical',
  'Plumbing',
  'HVAC',
  'Concrete',
  'Framing',
  'Roofing',
  'Flooring',
  'Drywall',
  'Painting',
  'Landscaping',
  'Excavation',
  'Masonry',
  'Windows & Doors',
  'Insulation',
  'Tile Work',
  'Asphalt',
  'Other'
];

interface BulkSubcontractorData {
  company: string;
  name: string;
  email: string;
  phone: string;
  specialty: string;
  travelRadius: string;
  insuranceExpiry: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  notes: string;
  w9OnFile: boolean;
}

interface BulkSubcontractorDialogProps {
  onSubcontractorsCreated: () => void;
}

export function BulkSubcontractorDialog({ onSubcontractorsCreated }: BulkSubcontractorDialogProps) {
  const [open, setOpen] = useState(false);
  const [subcontractors, setSubcontractors] = useState<BulkSubcontractorData[]>([
    {
      company: '',
      name: '',
      email: '',
      phone: '',
      specialty: '',
      travelRadius: '',
      insuranceExpiry: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      notes: '',
      w9OnFile: false
    }
  ]);

  const addSubcontractor = () => {
    setSubcontractors([...subcontractors, {
      company: '',
      name: '',
      email: '',
      phone: '',
      specialty: '',
      travelRadius: '',
      insuranceExpiry: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      notes: '',
      w9OnFile: false
    }]);
  };

  const removeSubcontractor = (index: number) => {
    if (subcontractors.length > 1) {
      setSubcontractors(subcontractors.filter((_, i) => i !== index));
    }
  };

  const updateSubcontractor = (index: number, field: keyof BulkSubcontractorData, value: any) => {
    const updated = [...subcontractors];
    updated[index] = { ...updated[index], [field]: value };
    setSubcontractors(updated);
  };

  const handleSave = async () => {
    const validSubcontractors = subcontractors.filter(sub => sub.company && sub.name);
    
    if (validSubcontractors.length === 0) {
      toast.error('Please add at least one subcontractor with company and name');
      return;
    }

    try {
      const subcontractorData = validSubcontractors.map(sub => ({
        company: sub.company,
        name: sub.name,
        email: sub.email || null,
        phone: sub.phone || null,
        specialties: sub.specialty ? [sub.specialty] : null,
        travel_radius: sub.travelRadius ? parseInt(sub.travelRadius) : null,
        insurance_expiry: sub.insuranceExpiry || null,
        address: sub.address || null,
        city: sub.city || null,
        state: sub.state || null,
        zip_code: sub.zipCode || null,
        notes: sub.notes || null,
        w9_on_file: sub.w9OnFile
      }));

      const { error } = await supabase
        .from('subcontractors')
        .insert(subcontractorData);

      if (error) throw error;

      toast.success(`Added ${validSubcontractors.length} subcontractors successfully`);
      onSubcontractorsCreated();
      setOpen(false);
      setSubcontractors([{
        company: '',
        name: '',
        email: '',
        phone: '',
        specialty: '',
        travelRadius: '',
        insuranceExpiry: '',
        address: '',
        city: '',
        state: '',
        zipCode: '',
        notes: '',
        w9OnFile: false
      }]);
    } catch (error) {
      console.error('Error adding subcontractors:', error);
      toast.error('Failed to add subcontractors');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Bulk Add Subcontractors
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Add Subcontractors</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {subcontractors.map((subcontractor, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">Subcontractor {index + 1}</h3>
                {subcontractors.length > 1 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => removeSubcontractor(index)}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Company Name *</Label>
                  <Input
                    value={subcontractor.company}
                    onChange={(e) => updateSubcontractor(index, 'company', e.target.value)}
                    placeholder="Company name"
                  />
                </div>
                <div>
                  <Label>Contact Person *</Label>
                  <Input
                    value={subcontractor.name}
                    onChange={(e) => updateSubcontractor(index, 'name', e.target.value)}
                    placeholder="Contact person name"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={subcontractor.email}
                    onChange={(e) => updateSubcontractor(index, 'email', e.target.value)}
                    placeholder="email@company.com"
                  />
                </div>
                <div>
                  <Label>Phone</Label>
                  <Input
                    value={subcontractor.phone}
                    onChange={(e) => updateSubcontractor(index, 'phone', e.target.value)}
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Specialty</Label>
                  <Select 
                    value={subcontractor.specialty} 
                    onValueChange={(value) => updateSubcontractor(index, 'specialty', value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select specialty" />
                    </SelectTrigger>
                    <SelectContent>
                      {SPECIALTY_OPTIONS.map((specialty) => (
                        <SelectItem key={specialty} value={specialty}>
                          {specialty}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Travel Radius (miles)</Label>
                  <Input
                    type="number"
                    value={subcontractor.travelRadius}
                    onChange={(e) => updateSubcontractor(index, 'travelRadius', e.target.value)}
                    placeholder="50"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>City</Label>
                  <Input
                    value={subcontractor.city}
                    onChange={(e) => updateSubcontractor(index, 'city', e.target.value)}
                    placeholder="City"
                  />
                </div>
                <div>
                  <Label>State</Label>
                  <Input
                    value={subcontractor.state}
                    onChange={(e) => updateSubcontractor(index, 'state', e.target.value)}
                    placeholder="State"
                  />
                </div>
                <div>
                  <Label>Zip Code</Label>
                  <Input
                    value={subcontractor.zipCode}
                    onChange={(e) => updateSubcontractor(index, 'zipCode', e.target.value)}
                    placeholder="12345"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  checked={subcontractor.w9OnFile}
                  onCheckedChange={(checked) => updateSubcontractor(index, 'w9OnFile', checked)}
                />
                <Label className="flex items-center gap-2">
                  <FileText className="w-4 h-4" />
                  W-9 on File
                </Label>
              </div>
            </div>
          ))}

          <div className="flex justify-between">
            <Button variant="outline" onClick={addSubcontractor}>
              <Plus className="w-4 h-4 mr-2" />
              Add Another Subcontractor
            </Button>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                Save All Subcontractors
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
