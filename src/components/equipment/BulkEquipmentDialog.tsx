
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Upload, Trash2, Image } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Equipment } from '@/types/equipment';

interface BulkEquipmentData {
  name: string;
  category: Equipment['category'];
  hourly_rate: string;
  year: string;
  value: string;
  status: Equipment['status'];
  description: string;
  location: string;
  image: string;
  imageFile?: File;
}

interface BulkEquipmentDialogProps {
  onEquipmentCreated: () => void;
}

export function BulkEquipmentDialog({ onEquipmentCreated }: BulkEquipmentDialogProps) {
  const [open, setOpen] = useState(false);
  const [equipment, setEquipment] = useState<BulkEquipmentData[]>([
    {
      name: '',
      category: 'Other',
      hourly_rate: '',
      year: '',
      value: '',
      status: 'Available',
      description: '',
      location: '',
      image: ''
    }
  ]);

  const addEquipment = () => {
    setEquipment([...equipment, {
      name: '',
      category: 'Other',
      hourly_rate: '',
      year: '',
      value: '',
      status: 'Available',
      description: '',
      location: '',
      image: ''
    }]);
  };

  const removeEquipment = (index: number) => {
    if (equipment.length > 1) {
      setEquipment(equipment.filter((_, i) => i !== index));
    }
  };

  const updateEquipment = (index: number, field: keyof BulkEquipmentData, value: any) => {
    const updated = [...equipment];
    updated[index] = { ...updated[index], [field]: value };
    setEquipment(updated);
  };

  const handleImageUpload = (index: number, file: File) => {
    updateEquipment(index, 'imageFile', file);
    updateEquipment(index, 'image', URL.createObjectURL(file));
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `equipment/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('equipment-images')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('equipment-images')
        .getPublicUrl(filePath);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  const handleSave = async () => {
    const validEquipment = equipment.filter(eq => eq.name && eq.hourly_rate);
    
    if (validEquipment.length === 0) {
      toast.error('Please add at least one equipment with name and hourly rate');
      return;
    }

    try {
      const equipmentData = await Promise.all(validEquipment.map(async (eq) => {
        let imageUrl = eq.image;
        
        // Upload image if file is provided
        if (eq.imageFile) {
          const uploadedUrl = await uploadImage(eq.imageFile);
          if (uploadedUrl) {
            imageUrl = uploadedUrl;
          }
        }

        return {
          name: eq.name,
          category: eq.category,
          hourly_rate: Number(eq.hourly_rate),
          year: eq.year ? Number(eq.year) : null,
          value: eq.value ? Number(eq.value) : null,
          status: eq.status,
          description: eq.description || null,
          location: eq.location || null,
          image: imageUrl || null
        };
      }));

      const { error } = await supabase
        .from('equipment')
        .insert(equipmentData);

      if (error) throw error;

      toast.success(`Added ${validEquipment.length} equipment items successfully`);
      onEquipmentCreated();
      setOpen(false);
      setEquipment([{
        name: '',
        category: 'Other',
        hourly_rate: '',
        year: '',
        value: '',
        status: 'Available',
        description: '',
        location: '',
        image: ''
      }]);
    } catch (error) {
      console.error('Error adding equipment:', error);
      toast.error('Failed to add equipment');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Bulk Add Equipment
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Bulk Add Equipment</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {equipment.map((eq, index) => (
            <div key={index} className="border rounded-lg p-4 space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="font-medium">Equipment {index + 1}</h3>
                {equipment.length > 1 && (
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => removeEquipment(index)}
                    className="text-red-600"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Name *</Label>
                  <Input
                    value={eq.name}
                    onChange={(e) => updateEquipment(index, 'name', e.target.value)}
                    placeholder="Equipment name"
                  />
                </div>
                <div>
                  <Label>Category</Label>
                  <Select 
                    value={eq.category} 
                    onValueChange={(value) => updateEquipment(index, 'category', value as Equipment['category'])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Heavy Machinery">Heavy Machinery</SelectItem>
                      <SelectItem value="Vehicles">Vehicles</SelectItem>
                      <SelectItem value="Trailers">Trailers</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label>Hourly Rate *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={eq.hourly_rate}
                    onChange={(e) => updateEquipment(index, 'hourly_rate', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label>Year</Label>
                  <Input
                    type="number"
                    value={eq.year}
                    onChange={(e) => updateEquipment(index, 'year', e.target.value)}
                    placeholder="2024"
                  />
                </div>
                <div>
                  <Label>Value</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={eq.value}
                    onChange={(e) => updateEquipment(index, 'value', e.target.value)}
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Status</Label>
                  <Select 
                    value={eq.status} 
                    onValueChange={(value) => updateEquipment(index, 'status', value as Equipment['status'])}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Available">Available</SelectItem>
                      <SelectItem value="In Use">In Use</SelectItem>
                      <SelectItem value="Maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Location</Label>
                  <Input
                    value={eq.location}
                    onChange={(e) => updateEquipment(index, 'location', e.target.value)}
                    placeholder="Equipment location"
                  />
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={eq.description}
                  onChange={(e) => updateEquipment(index, 'description', e.target.value)}
                  placeholder="Equipment description..."
                  rows={2}
                />
              </div>

              <div>
                <Label>Image</Label>
                <div className="space-y-2">
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleImageUpload(index, file);
                      }
                    }}
                  />
                  {eq.image && (
                    <div className="relative w-32 h-32">
                      <img 
                        src={eq.image} 
                        alt="Equipment preview" 
                        className="w-full h-full object-cover rounded border"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          <div className="flex justify-between">
            <Button variant="outline" onClick={addEquipment}>
              <Plus className="w-4 h-4 mr-2" />
              Add Another Equipment
            </Button>
            
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                Save All Equipment
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
