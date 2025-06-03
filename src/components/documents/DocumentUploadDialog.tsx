
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Upload } from 'lucide-react';

interface DocumentUploadDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpload: (documentData: any) => void;
  projects: Array<{ id: string; name: string }>;
}

export function DocumentUploadDialog({ open, onOpenChange, onUpload, projects }: DocumentUploadDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [documentName, setDocumentName] = useState('');
  const [description, setDescription] = useState('');
  const [folder, setFolder] = useState('');
  const [project, setProject] = useState('');
  const [tags, setTags] = useState('');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!documentName) {
        setDocumentName(selectedFile.name.replace(/\.[^/.]+$/, ''));
      }
    }
  };

  const handleUpload = () => {
    if (!file || !documentName) return;

    const documentData = {
      name: documentName,
      description,
      folder,
      project_id: project || null,
      tags: tags.split(',').map(tag => tag.trim()).filter(Boolean),
      file
    };

    onUpload(documentData);
    
    // Reset form
    setFile(null);
    setDocumentName('');
    setDescription('');
    setFolder('');
    setProject('');
    setTags('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Upload Document</DialogTitle>
          <p className="text-sm text-gray-600">Upload a new document to the system.</p>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label htmlFor="file">File</Label>
            <div className="mt-1">
              <Input
                id="file"
                type="file"
                onChange={handleFileChange}
                className="cursor-pointer"
              />
              {!file && (
                <p className="text-sm text-gray-500 mt-1">No file chosen</p>
              )}
            </div>
          </div>

          <div>
            <Label htmlFor="documentName">Document Name</Label>
            <Input
              id="documentName"
              value={documentName}
              onChange={(e) => setDocumentName(e.target.value)}
              placeholder="Enter document name"
            />
          </div>

          <div>
            <Label htmlFor="description">Description (Optional)</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter document description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="folder">Folder (Optional)</Label>
              <Select value={folder} onValueChange={setFolder}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General</SelectItem>
                  <SelectItem value="contracts">Contracts</SelectItem>
                  <SelectItem value="plans">Plans</SelectItem>
                  <SelectItem value="photos">Photos</SelectItem>
                  <SelectItem value="reports">Reports</SelectItem>
                  <SelectItem value="permits">Permits</SelectItem>
                  <SelectItem value="invoices">Invoices</SelectItem>
                  <SelectItem value="change-orders">Change Orders</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="project">Project (Optional)</Label>
              <Select value={project} onValueChange={setProject}>
                <SelectTrigger>
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((proj) => (
                    <SelectItem key={proj.id} value={proj.id}>
                      {proj.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="tags">Tags (Optional)</Label>
            <Input
              id="tags"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="Add tags..."
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <Button onClick={() => onOpenChange(false)} variant="outline" className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={!file || !documentName}
              className="flex-1"
            >
              Upload Document
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
