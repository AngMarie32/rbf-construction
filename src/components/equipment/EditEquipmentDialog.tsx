
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Equipment } from '@/types/equipment';

interface EditEquipmentDialogProps {
  equipment: Equipment;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEquipmentUpdated: () => void;
}

export function EditEquipmentDialog({ 
  equipment, 
  open, 
  onOpenChange, 
  onEquipmentUpdated 
}: EditEquipmentDialogProps) {
  const [formData, setFormData] = useState({
    name: equipment.name,
    category: equipment.category,
    hourly_rate: equipment.hourly_rate,
    year: equipment.year || '',
    value: equipment.value || '',
    status: equipment.status,
    description: equipment.description || '',
    image: equipment.image || '',
    location: equipment.location || ''
  });
  const [uploading, setUploading] = useState(false);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB');
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${equipment.id}-${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('equipment-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('equipment-images')
        .getPublicUrl(fileName);

      setFormData({ ...formData, image: publicUrl });
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Error uploading image:', error);
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const { error } = await supabase
        .from('equipment')
        .update({
          name: formData.name,
          category: formData.category,
          hourly_rate: Number(formData.hourly_rate),
          year: formData.year ? Number(formData.year) : null,
          value: formData.value ? Number(formData.value) : null,
          status: formData.status,
          description: formData.description || null,
          image: formData.image || null,
          location: formData.location || null,
          updated_at: new Date().toISOString()
        })
        .eq('id', equipment.id);

      if (error) throw error;

      toast.success('Equipment updated successfully');
      onEquipmentUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating equipment:', error);
      toast.error('Failed to update equipment');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Equipment</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="name">Name *</Label>
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
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Heavy Machinery">Heavy Machinery</SelectItem>
                <SelectItem value="Vehicles">Vehicles</SelectItem>
                <SelectItem value="Trailers">Trailers</SelectItem>
                <SelectItem value="Excavator">Excavator</SelectItem>
                <SelectItem value="Backhoe">Backhoe</SelectItem>
                <SelectItem value="Skid Steer">Skid Steer</SelectItem>
                <SelectItem value="Dozer">Dozer</SelectItem>
                <SelectItem value="Telehandler">Telehandler</SelectItem>
                <SelectItem value="Scraper">Scraper</SelectItem>
                <SelectItem value="Compaction">Compaction</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="hourly_rate">Hourly Rate *</Label>
            <Input
              id="hourly_rate"
              type="number"
              step="0.01"
              value={formData.hourly_rate}
              onChange={(e) => setFormData({ ...formData, hourly_rate: Number(e.target.value) })}
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="year">Year</Label>
              <Input
                id="year"
                type="number"
                value={formData.year}
                onChange={(e) => setFormData({ ...formData, year: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="value">Value</Label>
              <Input
                id="value"
                type="number"
                step="0.01"
                value={formData.value}
                onChange={(e) => setFormData({ ...formData, value: e.target.value })}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="status">Status</Label>
            <Select 
              value={formData.status} 
              onValueChange={(value) => setFormData({ ...formData, status: value as Equipment['status'] })}
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
            <Label htmlFor="location">Location</Label>
            <Input
              id="location"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder="Enter location"
            />
          </div>

          <div>
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Equipment Image</Label>
            <div className="flex gap-2">
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="flex-1"
                disabled={uploading}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={uploading}
              >
                {uploading ? (
                  'Uploading...'
                ) : (
                  <>
                    <Upload className="w-4 h-4 mr-1" />
                    Upload
                  </>
                )}
              </Button>
            </div>
            
            {formData.image && (
              <div className="mt-2">
                <div className="relative w-full h-32 border rounded overflow-hidden">
                  <img 
                    src={formData.image} 
                    alt="Equipment preview"
                    className="w-full h-full object-cover"
                  />
                </div>
              </div>
            )}
            
            <div className="text-sm text-gray-500">
              Or enter image URL:
            </div>
            <Input
              value={formData.image}
              onChange={(e) => setFormData({ ...formData, image: e.target.value })}
              placeholder="https://example.com/image.jpg"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit">
              Update Equipment
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
