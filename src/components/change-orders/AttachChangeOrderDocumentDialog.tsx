
import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText, X } from 'lucide-react';
import { toast } from 'sonner';

interface AttachChangeOrderDocumentDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  changeOrderId: string | null;
  changeOrderNumber: string;
  onDocumentAttached: () => void;
}

export function AttachChangeOrderDocumentDialog({ 
  open, 
  onOpenChange, 
  changeOrderId, 
  changeOrderNumber,
  onDocumentAttached 
}: AttachChangeOrderDocumentDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please select an image, PDF, or Word document');
        return;
      }
      
      // Check file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !changeOrderId) {
      toast.error('Please select a file');
      return;
    }

    setUploading(true);
    try {
      // Create a temporary URL for the file and store it in localStorage for demo purposes
      const fileUrl = URL.createObjectURL(selectedFile);
      const documentData = {
        id: crypto.randomUUID(),
        changeOrderId,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
        fileUrl,
        uploadDate: new Date().toISOString()
      };
      
      // Store in localStorage for demo (in real app, this would be in database)
      const existingDocuments = JSON.parse(localStorage.getItem('change_order_documents') || '[]');
      existingDocuments.push(documentData);
      localStorage.setItem('change_order_documents', JSON.stringify(existingDocuments));
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate upload
      
      toast.success('Document attached successfully');
      onDocumentAttached();
      onOpenChange(false);
      setSelectedFile(null);
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to attach document');
    } finally {
      setUploading(false);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) {
      const event = { target: { files: [file] } } as any;
      handleFileSelect(event);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Attach Document</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-gray-700">Change Order:</Label>
            <p className="text-sm text-gray-600">CO #{changeOrderNumber}</p>
          </div>

          <div>
            <Label htmlFor="file">Document File *</Label>
            <div 
              className="mt-2 border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors"
              onDragOver={handleDragOver}
              onDrop={handleDrop}
            >
              {selectedFile ? (
                <div className="space-y-2">
                  <FileText className="w-8 h-8 text-blue-500 mx-auto" />
                  <p className="text-sm font-medium">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                  </p>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Change File
                  </Button>
                </div>
              ) : (
                <div className="space-y-2">
                  <Upload className="w-8 h-8 text-gray-400 mx-auto" />
                  <div>
                    <Button 
                      variant="outline" 
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Select File
                    </Button>
                    <p className="text-xs text-gray-500 mt-2">
                      or drag and drop
                    </p>
                  </div>
                  <p className="text-xs text-gray-500">
                    PNG, JPG, PDF, DOC, DOCX up to 10MB
                  </p>
                </div>
              )}
            </div>
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf,.doc,.docx"
              onChange={handleFileSelect}
              className="hidden"
            />
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={!selectedFile || uploading}
            >
              {uploading ? 'Uploading...' : 'Attach Document'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
