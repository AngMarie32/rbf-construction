
import { useState, useRef } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface AttachInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenseId: string | null;
  expenseDescription: string;
  onInvoiceAttached: () => void;
}

export function AttachInvoiceDialog({ 
  open, 
  onOpenChange, 
  expenseId, 
  expenseDescription,
  onInvoiceAttached 
}: AttachInvoiceDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file type
      const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'];
      if (!allowedTypes.includes(file.type)) {
        toast.error('Please select an image (JPEG, PNG, GIF) or PDF file');
        return;
      }
      
      // Check file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        toast.error('File size must be less than 5MB');
        return;
      }
      
      setSelectedFile(file);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !expenseId) {
      toast.error('Please select a file');
      return;
    }

    setUploading(true);
    try {
      // Create a temporary URL for the file and store it in localStorage for demo purposes
      // In a real implementation, you would upload to Supabase storage here
      const fileUrl = URL.createObjectURL(selectedFile);
      const invoiceData = {
        id: crypto.randomUUID(),
        expenseId,
        fileName: selectedFile.name,
        fileSize: selectedFile.size,
        fileType: selectedFile.type,
        fileUrl,
        uploadDate: new Date().toISOString()
      };
      
      // Store in localStorage for demo (in real app, this would be in database)
      const existingInvoices = JSON.parse(localStorage.getItem('expense_invoices') || '[]');
      existingInvoices.push(invoiceData);
      localStorage.setItem('expense_invoices', JSON.stringify(existingInvoices));
      
      await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate upload
      
      toast.success('Invoice attached successfully');
      onInvoiceAttached();
      onOpenChange(false);
      setSelectedFile(null);
    } catch (error) {
      console.error('Error uploading invoice:', error);
      toast.error('Failed to attach invoice');
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
          <DialogTitle>Attach Invoice</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label className="text-sm font-medium text-gray-700">Expense:</Label>
            <p className="text-sm text-gray-600">{expenseDescription}</p>
          </div>

          <div>
            <Label htmlFor="file">Invoice File *</Label>
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
                    PNG, JPG, GIF, PDF up to 5MB
                  </p>
                </div>
              )}
            </div>
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/*,.pdf"
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
              {uploading ? 'Uploading...' : 'Attach Invoice'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
