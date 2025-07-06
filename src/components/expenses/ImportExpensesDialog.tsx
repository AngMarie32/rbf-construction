
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload, Save, Image } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ImportExpensesDialogProps {
  onExpensesImported: () => void;
  projects: Array<{ id: string; name: string }>;
}

export function ImportExpensesDialog({ onExpensesImported, projects }: ImportExpensesDialogProps) {
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
      // For now, we'll create placeholder expenses based on uploaded images
      // In a real implementation, you would use OCR or AI to extract data from images
      const expensesToCreate = uploadedImages.map((file, index) => ({
        project_id: selectedProject,
        description: `Expense from ${file.name}`,
        category: 'Materials',
        amount: 0, // User would need to fill this in
        date: new Date().toISOString().split('T')[0],
        vendor: 'Unknown',
        receipt_number: `IMG-${Date.now()}-${index}`,
        status: 'Pending Field Approval'
      }));

      const { error } = await supabase
        .from('expenses')
        .insert(expensesToCreate);

      if (error) throw error;

      toast.success(`Successfully imported ${uploadedImages.length} expense entries from images`);
      onExpensesImported();
      setOpen(false);
      setUploadedImages([]);
      setSelectedProject('');
    } catch (error) {
      console.error('Error importing expenses:', error);
      toast.error('Failed to import expenses from images');
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
            <DialogTitle>Import Expenses from Images</DialogTitle>
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
              <Label htmlFor="image-upload">Upload Receipt Images</Label>
              <Input
                id="image-upload"
                type="file"
                accept="image/*"
                multiple
                onChange={handleImageUpload}
                className="cursor-pointer"
              />
              <p className="text-sm text-gray-500">
                Upload images of receipts or expense documents. Supported formats: JPG, PNG, GIF
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
                This feature will create placeholder expense entries based on your uploaded images. 
                You'll need to review and edit the details (amounts, vendors, categories) after import.
                Future versions will include automatic data extraction from receipt images.
              </p>
            </div>

            <div className="flex justify-end space-x-2 pt-4">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleImport} disabled={loading || !selectedProject || uploadedImages.length === 0}>
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Importing...' : 'Import Expenses'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
