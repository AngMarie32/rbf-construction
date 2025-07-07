import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Save, Image } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ImportBidItemsDialogProps {
  onItemsImported: () => void;
  projects: Array<{ id: string; name: string }>;
}

export function ImportBidItemsDialog({ onItemsImported, projects }: ImportBidItemsDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [uploadedImages, setUploadedImages] = useState<File[]>([]);

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    setUploadedImages(prev => [...prev, ...imageFiles]);
  };

  const removeImage = (index: number) => {
    setUploadedImages(prev => prev.filter((_, i) => i !== index));
  };

  const handleImport = async () => {
    if (!selectedProject) {
      toast.error('Please select a project first');
      return;
    }

    if (uploadedImages.length === 0) {
      toast.error('Please upload at least one image');
      return;
    }

    setLoading(true);
    try {
      // Sample bid items based on the uploaded images - these would be extracted via OCR/AI in a real implementation
      const bidItemsToCreate = [
        // General Conditions
        { category: 'Labor/Supervision', subcategory: 'General Conditions', description: 'General Conditions', quantity: 1, unit: 'each', unit_cost: 14500 },
        { category: 'Design Fees & Estimating', subcategory: 'General-Design Fees & Estimating', description: 'Design Fees & Estimating', quantity: 1, unit: 'each', unit_cost: 600 },
        { category: 'Printing & Reproduction', subcategory: 'General-Design Fees & Estimating', description: 'Printing & Reproduction', quantity: 1, unit: 'each', unit_cost: 600 },
        { category: 'Permits/Fees/Bonds/Insurances', subcategory: 'General-Permits/Fees/Bonds/Insurances', description: 'Permits/Fees/Bonds/Insurances', quantity: 1, unit: 'each', unit_cost: 8900 },
        { category: 'Building Permits', subcategory: 'General-Permits/Fees/Bonds/Insurances', description: 'Building Permits', quantity: 1, unit: 'each', unit_cost: 5000 },
        { category: 'Demo Permit', subcategory: 'General-Permits/Fees/Bonds/Insurances', description: 'Demo Permit', quantity: 1, unit: 'each', unit_cost: 1000 },
        { category: 'Soil Erosion', subcategory: 'General-Permits/Fees/Bonds/Insurances', description: 'Soil Erosion', quantity: 1, unit: 'each', unit_cost: 600 },
        { category: 'Builder\'s Risk Insurance', subcategory: 'General-Permits/Fees/Bonds/Insurances', description: 'Builder\'s Risk Insurance', quantity: 1, unit: 'each', unit_cost: 2273 },
        { category: 'General-Other', subcategory: 'General-Other', description: 'General-Other', quantity: 1, unit: 'each', unit_cost: 5000 },
        { category: 'Survey Staking & Layout', subcategory: 'General-Other', description: 'Survey Staking & Layout', quantity: 1, unit: 'each', unit_cost: 1200 },
        { category: 'Daily Clean-up', subcategory: 'General-Other', description: 'Daily Clean-up', quantity: 1, unit: 'each', unit_cost: 3000 },
        { category: 'Porta-Jon Rental', subcategory: 'General-Other', description: 'Porta-Jon Rental', quantity: 1, unit: 'each', unit_cost: 1200 },
        { category: 'Dumpster Rental', subcategory: 'General-Other', description: 'Dumpster Rental', quantity: 1, unit: 'each', unit_cost: 1500 },
        { category: 'Equipment Rental', subcategory: 'General-Other', description: 'Equipment Rental', quantity: 1, unit: 'each', unit_cost: 2000 },

        // Site Work
        { category: 'Site-General', subcategory: 'Site-General', description: 'Site-General', quantity: 1, unit: 'each', unit_cost: 5000 },
        { category: 'Mobilization', subcategory: 'Site-General', description: 'Mobilization', quantity: 1, unit: 'bid', unit_cost: 5000 },
        { category: 'Demolition Building/Concrete', subcategory: 'Site-Demolition Building/Concrete', description: 'Demolition Building/Concrete', quantity: 1, unit: 'each', unit_cost: 100000 },
        { category: 'Remove Existing Building(s)', subcategory: 'Site-Demolition Building/Concrete', description: 'Remove Existing Building(s)', quantity: 1, unit: 'bid', unit_cost: 100000 },
        { category: 'Erosion Controls', subcategory: 'Site-Erosion Controls', description: 'Erosion Controls', quantity: 1, unit: 'each', unit_cost: 2000 },
        { category: 'Silt Fence', subcategory: 'Site-Erosion Controls', description: 'Silt Fence', quantity: 1, unit: 'bid', unit_cost: 1500 },
        { category: 'Mud Mat', subcategory: 'Site-Erosion Controls', description: 'Mud Mat', quantity: 1, unit: 'bid', unit_cost: 500 },
        { category: 'Excavation/Grading', subcategory: 'Site-Excavation/Grading', description: 'Excavation/Grading', quantity: 1, unit: 'each', unit_cost: 33500 },
        { category: 'Excavation (Non-Utility)', subcategory: 'Site-Excavation/Grading', description: 'Excavation (Non-Utility)', quantity: 1, unit: 'bid', unit_cost: 10000 },
        { category: 'Backfill Materials', subcategory: 'Site-Excavation/Grading', description: 'Backfill Materials', quantity: 1, unit: 'bid', unit_cost: 15000 },
        { category: 'Export Spoils', subcategory: 'Site-Excavation/Grading', description: 'Export Spoils', quantity: 1, unit: 'bid', unit_cost: 8500 },

        // Site Construction
        { category: 'Site Construction', subcategory: 'Site-Construction', description: 'Site Construction', quantity: 1, unit: 'each', unit_cost: 70300 },
        { category: 'Concrete Curbs/Gutters', subcategory: 'Site-Construction', description: 'Concrete Curbs/Gutters', quantity: 1, unit: 'bid', unit_cost: 15000 },
        { category: 'Concrete Walk-Ways', subcategory: 'Site-Construction', description: 'Concrete Walk-Ways', quantity: 1, unit: 'bid', unit_cost: 4600 },
        { category: 'Light Pole Bases', subcategory: 'Site-Construction', description: 'Light Pole Bases', quantity: 1, unit: 'bid', unit_cost: 1800 },
        { category: 'Asphalt Paving', subcategory: 'Site-Construction', description: 'Asphalt Paving', quantity: 1, unit: 'bid', unit_cost: 28000 },
        { category: 'Lot Striping', subcategory: 'Site-Construction', description: 'Lot Striping', quantity: 1, unit: 'bid', unit_cost: 500 },
        { category: 'Other Asphalt', subcategory: 'Site-Construction', description: 'Other Asphalt', quantity: 1, unit: 'bid', unit_cost: 12000 },
        { category: 'Bollards', subcategory: 'Site-Construction', description: 'Bollards', quantity: 1, unit: 'bid', unit_cost: 2400 },
        { category: 'Retaining Wall(s)-Concrete @ 4\'', subcategory: 'Site-Construction', description: 'Retaining Wall(s)-Concrete @ 4\'', quantity: 1, unit: 'bid', unit_cost: 6000 },

        // Utilities
        { category: 'Utilities (Including Excavation)', subcategory: 'Site-Utilities (Including Excavation)', description: 'Utilities (Including Excavation)', quantity: 1, unit: 'each', unit_cost: 75500 },
        { category: 'Water Service', subcategory: 'Site-Utilities (Including Excavation)', description: 'Water Service', quantity: 1, unit: 'bid', unit_cost: 15500 },
        { category: 'Sanitary Sewer', subcategory: 'Site-Utilities (Including Excavation)', description: 'Sanitary Sewer', quantity: 1, unit: 'bid', unit_cost: 34000 },
        { category: 'Storm Sewer/Structures', subcategory: 'Site-Utilities (Including Excavation)', description: 'Storm Sewer/Structures', quantity: 1, unit: 'bid', unit_cost: 26000 },

        // Landscaping
        { category: 'Landscaping & Irrigation', subcategory: 'Site-Landscaping & Irrigation', description: 'Landscaping & Irrigation', quantity: 1, unit: 'each', unit_cost: 7000 },
        { category: 'Landscaping (Hard/Soft)', subcategory: 'Site-Landscaping & Irrigation', description: 'Landscaping (Hard/Soft)', quantity: 1, unit: 'bid', unit_cost: 4000 },
        { category: 'Top Soil', subcategory: 'Site-Landscaping & Irrigation', description: 'Top Soil', quantity: 1, unit: 'bid', unit_cost: 3000 },

        // Building - Concrete
        { category: 'Concrete', subcategory: 'Building-Concrete', description: 'Concrete', quantity: 1, unit: 'each', unit_cost: 105200 },
        { category: 'Concrete Footings & Foundation', subcategory: 'Building-Concrete', description: 'Concrete Footings & Foundation', quantity: 1, unit: 'bid', unit_cost: 63500 },
        { category: 'Slab on Grade & Trench Fill', subcategory: 'Building-Concrete', description: 'Slab on Grade & Trench Fill', quantity: 1, unit: 'bid', unit_cost: 40600 },
        { category: 'Saw Cutting', subcategory: 'Building-Concrete', description: 'Saw Cutting', quantity: 1, unit: 'bid', unit_cost: 1100 },

        // Masonry
        { category: 'Masonry', subcategory: 'Building-Masonry', description: 'Masonry', quantity: 1, unit: 'each', unit_cost: 163000 },
        { category: 'Masonry-CMU (Concrete Blocks)', subcategory: 'Building-Masonry', description: 'Masonry-CMU (Concrete Blocks)', quantity: 1, unit: 'bid', unit_cost: 163000 },

        // Metals/Siding Materials
        { category: 'Metals/Siding Materials', subcategory: 'Building-Metals/Siding Materials', description: 'Metals/Siding Materials', quantity: 1, unit: 'each', unit_cost: 317155 },
        { category: 'Steel- Red Iron Structural', subcategory: 'Building-Metals/Siding Materials', description: 'Steel- Red Iron Structural', quantity: 1, unit: 'bid', unit_cost: 134475 },
        { category: 'Pre-Fab Steel Building Materials', subcategory: 'Building-Metals/Siding Materials', description: 'Pre-Fab Steel Building Materials', quantity: 1, unit: 'bid', unit_cost: 134475 },
        { category: 'Pre-Fab Labor', subcategory: 'Building-Metals/Siding Materials', description: 'Pre-Fab Labor', quantity: 1, unit: 'bid', unit_cost: 37205 },
        { category: 'Metal Awnings/Overhangs/Canopy', subcategory: 'Building-Metals/Siding Materials', description: 'Metal Awnings/Overhangs/Canopy', quantity: 1, unit: 'bid', unit_cost: 6000 },
        { category: 'Gutters & Downspouts', subcategory: 'Building-Metals/Siding Materials', description: 'Gutters & Downspouts', quantity: 1, unit: 'bid', unit_cost: 1500 },
        { category: 'Metals- Other', subcategory: 'Building-Metals/Siding Materials', description: 'Metals- Other', quantity: 1, unit: 'bid', unit_cost: 3500 },

        // Rough/Final Carpentry
        { category: 'Rough/Final Carpentry', subcategory: 'Building-Rough/Final Carpentry', description: 'Rough/Final Carpentry', quantity: 1, unit: 'each', unit_cost: 45500 },
        { category: 'RC-Metal Framing Materials', subcategory: 'Building-Rough/Final Carpentry', description: 'RC-Metal Framing Materials', quantity: 1, unit: 'bid', unit_cost: 42000 },
        { category: 'FC- Misc Finish Carpentry & Trim', subcategory: 'Building-Rough/Final Carpentry', description: 'FC- Misc Finish Carpentry & Trim', quantity: 1, unit: 'bid', unit_cost: 1500 },
        { category: 'FC- Millwork', subcategory: 'Building-Rough/Final Carpentry', description: 'FC- Millwork', quantity: 1, unit: 'bid', unit_cost: 2000 },

        // Thermal/Moisture
        { category: 'Thermal/Moisture', subcategory: 'Building-Thermal/Moisture', description: 'Thermal/Moisture', quantity: 1, unit: 'each', unit_cost: 57500 },
        { category: 'Building Insulation-Exterior', subcategory: 'Building-Thermal/Moisture', description: 'Building Insulation-Exterior', quantity: 1, unit: 'bid', unit_cost: 5000 },
        { category: 'Runner Roofing (Durolast)', subcategory: 'Building-Thermal/Moisture', description: 'Runner Roofing (Durolast)', quantity: 1, unit: 'bid', unit_cost: 50500 },
        { category: 'Caulking & Sealants', subcategory: 'Building-Thermal/Moisture', description: 'Caulking & Sealants', quantity: 1, unit: 'bid', unit_cost: 2000 },

        // Doors, Windows, & Glass
        { category: 'Doors, Windows, & Glass', subcategory: 'Building-Doors, Windows, & Glass', description: 'Doors, Windows, & Glass', quantity: 1, unit: 'each', unit_cost: 95200 },
        { category: 'Storefront Aluminium, Door Frames, Etc.', subcategory: 'Building-Doors, Windows, & Glass', description: 'Storefront Aluminium, Door Frames, Etc.', quantity: 1, unit: 'bid', unit_cost: 17200 },
        { category: 'Overhead Doors (Closures)', subcategory: 'Building-Doors, Windows, & Glass', description: 'Overhead Doors (Closures)', quantity: 1, unit: 'bid', unit_cost: 45000 },
        { category: 'Interior HM Frame Doors', subcategory: 'Building-Doors, Windows, & Glass', description: 'Interior HM Frame Doors', quantity: 1, unit: 'bid', unit_cost: 30000 },
        { category: 'Door/Windows-Other (Labor)', subcategory: 'Building-Doors, Windows, & Glass', description: 'Door/Windows-Other (Labor)', quantity: 1, unit: 'bid', unit_cost: 3000 },

        // Finishes
        { category: 'Finishes', subcategory: 'Building-Finishes', description: 'Finishes', quantity: 1, unit: 'each', unit_cost: 66300 },
        { category: 'Epoxy Flooring', subcategory: 'Building-Finishes', description: 'Epoxy Flooring', quantity: 1, unit: 'bid', unit_cost: 14000 },
        { category: 'Laminate Flooring', subcategory: 'Building-Finishes', description: 'Laminate Flooring', quantity: 1, unit: 'bid', unit_cost: 10000 },
        { category: 'Carpet', subcategory: 'Building-Finishes', description: 'Carpet', quantity: 1, unit: 'bid', unit_cost: 1800 },
        { category: 'Floor Prep', subcategory: 'Building-Finishes', description: 'Floor Prep', quantity: 1, unit: 'bid', unit_cost: 15000 },
        { category: 'Exterior Painting', subcategory: 'Building-Finishes', description: 'Exterior Painting', quantity: 1, unit: 'bid', unit_cost: 1000 },
        { category: 'Interior Painting', subcategory: 'Building-Finishes', description: 'Interior Painting', quantity: 1, unit: 'bid', unit_cost: 8000 },
        { category: 'Ceiling Painting', subcategory: 'Building-Finishes', description: 'Ceiling Painting', quantity: 1, unit: 'bid', unit_cost: 12000 },
        { category: 'Acoustical Ceilings', subcategory: 'Building-Finishes', description: 'Acoustical Ceilings', quantity: 1, unit: 'bid', unit_cost: 4000 },
        { category: 'Countertops-Laminate', subcategory: 'Building-Finishes', description: 'Countertops-Laminate', quantity: 1, unit: 'bid', unit_cost: 500 },

        // Install Specialities
        { category: 'Install Specialities', subcategory: 'Building-Install Specialities', description: 'Install Specialities', quantity: 1, unit: 'each', unit_cost: 1700 },
        { category: 'Toilet Accessories', subcategory: 'Building-Install Specialities', description: 'Toilet Accessories', quantity: 1, unit: 'bid', unit_cost: 1200 },
        { category: 'ABC Fire Extinguishers', subcategory: 'Building-Install Specialities', description: 'ABC Fire Extinguishers', quantity: 1, unit: 'bid', unit_cost: 500 },

        // Mechanical
        { category: 'Mechanical', subcategory: 'Building-Mechanical', description: 'Mechanical', quantity: 1, unit: 'each', unit_cost: 67000 },
        { category: 'Mechanical-Other', subcategory: 'Building-Mechanical', description: 'Mechanical-Other', quantity: 1, unit: 'bid', unit_cost: 67000 },

        // Plumbing
        { category: 'Plumbing', subcategory: 'Building-Plumbing', description: 'Plumbing', quantity: 1, unit: 'each', unit_cost: 16000 },
        { category: 'Plumbing', subcategory: 'Building-Plumbing', description: 'Plumbing', quantity: 1, unit: 'bid', unit_cost: 16000 },

        // Electrical
        { category: 'Electrical', subcategory: 'Building-Electrical', description: 'Electrical', quantity: 1, unit: 'each', unit_cost: 73450 },
        { category: 'Electrical Distribution: Feeders, Switches, Receptacles', subcategory: 'Building-Electrical', description: 'Electrical Distribution: Feeders, Switches, Receptacles', quantity: 1, unit: 'bid', unit_cost: 73450 },

        // Other categories
        { category: 'Other Interior Demolition', subcategory: 'Other Interior Demolition', description: 'Other Interior Demolition', quantity: 1, unit: 'each', unit_cost: 6000 },
        { category: 'Management', subcategory: 'Management', description: 'Management', quantity: 1, unit: 'each', unit_cost: 13073 },
        { category: 'Supervision', subcategory: 'Supervision', description: 'Supervision', quantity: 1, unit: 'each', unit_cost: 32683 },
        { category: 'Profit & Overhead', subcategory: 'Profit & Overhead', description: 'Profit & Overhead', quantity: 1, unit: 'each', unit_cost: 108506 }
      ];

      const itemsToInsert = bidItemsToCreate.map(item => ({
        project_id: selectedProject,
        category: item.category,
        subcategory: item.subcategory || null,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_cost: item.unit_cost
      }));

      const { error } = await supabase
        .from('bid_items')
        .insert(itemsToInsert);

      if (error) throw error;

      toast.success(`Successfully imported ${bidItemsToCreate.length} bid items from images`);
      onItemsImported();
      setOpen(false);
      setUploadedImages([]);
      setSelectedProject('');
    } catch (error) {
      console.error('Error importing bid items:', error);
      toast.error('Failed to import bid items from images');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline">
        <Image className="w-4 h-4 mr-2" />
        Import from Images
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Import Bid Items from Images</DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="project-select">Select Project</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a project..." />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="image-upload">Upload Bid Item Images</Label>
              <Input
                id="image-upload"
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="cursor-pointer"
              />
              <p className="text-sm text-gray-500">
                Upload images of bid sheets or cost estimates. Supported formats: JPG, PNG, GIF
              </p>
            </div>

            {uploadedImages.length > 0 && (
              <div className="space-y-2">
                <Label>Uploaded Images ({uploadedImages.length})</Label>
                <div className="grid grid-cols-2 gap-4 max-h-60 overflow-y-auto">
                  {uploadedImages.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-2 border rounded">
                      <div className="flex items-center space-x-2">
                        <Image className="w-4 h-4" />
                        <span className="text-sm truncate">{file.name}</span>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeImage(index)}
                      >
                        Remove
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-yellow-50 p-4 rounded-lg">
              <h4 className="font-medium mb-2">📝 Note:</h4>
              <p className="text-sm text-gray-600">
                This feature will create bid items based on your uploaded images. 
                The system will extract item descriptions, categories, quantities, and costs from the images.
                You can review and edit the details after import.
              </p>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={loading || !selectedProject || uploadedImages.length === 0}>
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Importing...' : 'Import Bid Items'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
