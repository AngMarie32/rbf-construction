
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { FileText, Download, X } from 'lucide-react';

interface Invoice {
  id: string;
  expenseId: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  fileUrl: string;
  uploadDate: string;
}

interface ViewInvoiceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  expenseId: string | null;
  expenseDescription: string;
}

export function ViewInvoiceDialog({ 
  open, 
  onOpenChange, 
  expenseId, 
  expenseDescription 
}: ViewInvoiceDialogProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  useEffect(() => {
    if (open && expenseId) {
      // Load invoices from localStorage (in real app, this would be from database)
      const allInvoices = JSON.parse(localStorage.getItem('expense_invoices') || '[]');
      const expenseInvoices = allInvoices.filter((inv: Invoice) => inv.expenseId === expenseId);
      setInvoices(expenseInvoices);
      if (expenseInvoices.length > 0) {
        setSelectedInvoice(expenseInvoices[0]);
      }
    }
  }, [open, expenseId]);

  const handleDownload = (invoice: Invoice) => {
    // Create a temporary link to download the file
    const link = document.createElement('a');
    link.href = invoice.fileUrl;
    link.download = invoice.fileName;
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

  if (invoices.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>View Invoice</DialogTitle>
          </DialogHeader>
          <div className="text-center py-8">
            <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Invoice Attached</h3>
            <p className="text-gray-500 mb-4">This expense doesn't have any attached invoices.</p>
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
          <DialogTitle>View Invoice - {expenseDescription}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex flex-col h-full">
          {/* Invoice selector if multiple */}
          {invoices.length > 1 && (
            <div className="flex gap-2 flex-wrap">
              {invoices.map((invoice, index) => (
                <Button
                  key={invoice.id}
                  variant={selectedInvoice?.id === invoice.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedInvoice(invoice)}
                >
                  Invoice {index + 1}
                </Button>
              ))}
            </div>
          )}

          {/* Invoice details */}
          {selectedInvoice && (
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h4 className="font-medium">{selectedInvoice.fileName}</h4>
                  <p className="text-sm text-gray-500">
                    {(selectedInvoice.fileSize / 1024 / 1024).toFixed(2)} MB • 
                    Uploaded {new Date(selectedInvoice.uploadDate).toLocaleDateString()}
                  </p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(selectedInvoice)}
                >
                  <Download className="w-4 h-4 mr-2" />
                  Download
                </Button>
              </div>

              {/* Invoice preview with scrolling */}
              <ScrollArea className="border rounded-lg bg-white h-96">
                {isImageFile(selectedInvoice.fileType) ? (
                  <img
                    src={selectedInvoice.fileUrl}
                    alt={selectedInvoice.fileName}
                    className="w-full h-auto object-contain"
                  />
                ) : isPdfFile(selectedInvoice.fileType) ? (
                  <iframe
                    src={selectedInvoice.fileUrl}
                    className="w-full h-96"
                    title={selectedInvoice.fileName}
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
