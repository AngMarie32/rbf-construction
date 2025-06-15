
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Download, X } from 'lucide-react';

interface ChangeOrderDocument {
  id: string;
  changeOrderId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileUrl: string;
  uploadDate: string;
}

interface ViewChangeOrderDocumentsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  changeOrderId: string | null;
  changeOrderNumber: string;
}

export function ViewChangeOrderDocumentsDialog({ 
  open, 
  onOpenChange, 
  changeOrderId, 
  changeOrderNumber 
}: ViewChangeOrderDocumentsDialogProps) {
  const [documents, setDocuments] = useState<ChangeOrderDocument[]>([]);
  const [selectedDocument, setSelectedDocument] = useState<ChangeOrderDocument | null>(null);

  useEffect(() => {
    if (open && changeOrderId) {
      // Load documents from localStorage (in real app, this would be from database)
      const allDocuments = JSON.parse(localStorage.getItem('change_order_documents') || '[]');
      const changeOrderDocuments = allDocuments.filter((doc: ChangeOrderDocument) => doc.changeOrderId === changeOrderId);
      setDocuments(changeOrderDocuments);
      if (changeOrderDocuments.length > 0) {
        setSelectedDocument(changeOrderDocuments[0]);
      }
    }
  }, [open, changeOrderId]);

  const handleDownload = (document: ChangeOrderDocument) => {
    const link = document.createElement('a');
    link.href = document.fileUrl;
    link.download = document.fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isImageFile = (fileType: string) => {
    return fileType.startsWith('image/');
  };

  const isPdfFile = (fileType: string) => {
    return fileType === 'application/pdf';
  };

  if (documents.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>View Documents</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Documents Attached</h3>
            <p className="text-gray-500 mb-4">This change order doesn't have any attached documents.</p>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>View Documents - CO #{changeOrderNumber}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex flex-col h-full">
          {/* Document selector if multiple */}
          {documents.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {documents.map((document, index) => (
                <Button
                  key={document.id}
                  variant={selectedDocument?.id === document.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedDocument(document)}
                >
                  Document {index + 1}
                </Button>
              ))}
            </div>
          )}

          {/* Document details */}
          {selectedDocument && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-medium">{selectedDocument.fileName}</h4>
                  <p className="text-sm text-gray-500">
                    {(selectedDocument.fileSize / 1024 / 1024).toFixed(2)} MB • 
                    Uploaded {new Date(selectedDocument.uploadDate).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(selectedDocument)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>

              {/* Document preview with scrolling */}
              <ScrollArea className="border rounded-lg bg-white h-96">
                {isImageFile(selectedDocument.fileType) ? (
                  <img
                    src={selectedDocument.fileUrl}
                    alt={selectedDocument.fileName}
                    className="w-full h-auto object-contain"
                  />
                ) : isPdfFile(selectedDocument.fileType) ? (
                  <iframe
                    src={selectedDocument.fileUrl}
                    className="w-full h-96"
                    title={selectedDocument.fileName}
                  />
                ) : (
                  <div className="flex items-center justify-center h-48 text-gray-500">
                    <div className="text-center">
                      <FileText className="w-16 h-16 mb-2 mx-auto" />
                      <p>Preview not available for this file type</p>
                    </div>
                  </div>
                )}
              </ScrollArea>
            </div>
          )}

          <div className="flex justify-end mt-4">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
