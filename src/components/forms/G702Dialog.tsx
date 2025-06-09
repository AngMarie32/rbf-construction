
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Download, FileText, Printer } from 'lucide-react';
import { G702Form } from './G702Form';
import { exportG702G703ToPDF } from '@/utils/pdfExport';
import { toast } from 'sonner';

interface G702DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSave?: () => void;
}

export function G702Dialog({ open, onOpenChange, projectId, onSave }: G702DialogProps) {
  const [loading, setLoading] = useState(false);

  const handleExportPDF = async () => {
    try {
      setLoading(true);
      await exportG702G703ToPDF('G702-G703-Application.pdf');
      toast.success('G702/G703 exported to PDF successfully');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    // Add print styles for landscape orientation and proper page sizing
    const printStyles = `
      @media print {
        @page {
          size: 11in 8.5in landscape;
          margin: 0.5in;
        }
        
        body * {
          visibility: hidden;
        }
        
        #g702-document, #g702-document *,
        #g703-document, #g703-document * {
          visibility: visible;
        }
        
        #g702-document {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
        }
        
        #g703-document {
          position: absolute;
          left: 0;
          top: 0;
          width: 100%;
          page-break-before: always;
        }
        
        /* Ensure table fits properly */
        table {
          font-size: 10px !important;
          width: 100% !important;
        }
        
        th, td {
          padding: 2px !important;
          font-size: 9px !important;
        }
        
        /* Hide builder controls */
        .print\\:hidden {
          display: none !important;
        }
      }
    `;
    
    const style = document.createElement('style');
    style.textContent = printStyles;
    document.head.appendChild(style);
    
    window.print();
    
    // Remove the styles after printing
    setTimeout(() => {
      document.head.removeChild(style);
    }, 1000);
  };

  const handleSave = () => {
    onSave?.();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[98vw] max-h-[98vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex justify-between items-center">
            <DialogTitle>G702/G703 - Application and Certificate for Payment</DialogTitle>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handlePrint}>
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
              <Button variant="outline" onClick={handleExportPDF} disabled={loading}>
                <Download className="w-4 h-4 mr-2" />
                {loading ? 'Exporting...' : 'Export PDF'}
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div>
          <G702Form projectId={projectId} onSave={handleSave} />
        </div>
      </DialogContent>
    </Dialog>
  );
}
