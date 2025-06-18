
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Upload, FileSpreadsheet } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SubcontractorImportDialogProps {
  onImportComplete: () => void;
}

export function SubcontractorImportDialog({ onImportComplete }: SubcontractorImportDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [previewData, setPreviewData] = useState<any[]>([]);

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const lines = text.split('\n');
      const headers = lines[0].split(',').map(h => h.trim());
      
      const data = lines.slice(1)
        .filter(line => line.trim())
        .map(line => {
          const values = line.split(',').map(v => v.trim());
          const row: any = {};
          headers.forEach((header, index) => {
            row[header] = values[index] || '';
          });
          return row;
        });

      setPreviewData(data);
    };
    reader.readAsText(file);
  };

  const handleImport = async () => {
    if (previewData.length === 0) {
      toast.error('No data to import');
      return;
    }

    setIsLoading(true);
    try {
      const subcontractorData = previewData.map(row => ({
        company_name: row['Company Name'] || row.company_name || '',
        contact_name: row['Contact Name'] || row.contact_name || '',
        email: row['Email'] || row.email || '',
        phone: row['Phone'] || row.phone || '',
        specialty: row['Specialty'] || row.specialty || 'Other',
        address: row['Address'] || row.address || '',
        city: row['City'] || row.city || '',
        state: row['State'] || row.state || '',
        zip_code: row['Zip Code'] || row.zip_code || '',
        license_number: row['License Number'] || row.license_number || '',
        rating: row['Rating'] ? parseFloat(row['Rating']) : null,
        notes: row['Notes'] || row.notes || ''
      }));

      const { error } = await supabase
        .from('subcontractors')
        .insert(subcontractorData);

      if (error) throw error;

      toast.success(`Successfully imported ${subcontractorData.length} subcontractors`);
      setIsOpen(false);
      setPreviewData([]);
      onImportComplete();
    } catch (error) {
      console.error('Error importing subcontractors:', error);
      toast.error('Failed to import subcontractors');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Upload className="w-4 h-4 mr-2" />
          Import CSV
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Import Subcontractors from CSV</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <FileSpreadsheet className="h-4 w-4" />
            <AlertDescription>
              Upload a CSV file with columns: Company Name, Contact Name, Email, Phone, Specialty, Address, City, State, Zip Code, License Number, Rating, Notes
            </AlertDescription>
          </Alert>

          <div>
            <Label htmlFor="csvFile">Select CSV File</Label>
            <Input
              id="csvFile"
              type="file"
              accept=".csv"
              onChange={handleFileUpload}
              className="mt-1"
            />
          </div>

          {previewData.length > 0 && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Preview ({previewData.length} items)</h3>
              <div className="max-h-60 overflow-auto border rounded">
                <table className="w-full text-sm">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-2 py-1 text-left">Company</th>
                      <th className="px-2 py-1 text-left">Contact</th>
                      <th className="px-2 py-1 text-left">Email</th>
                      <th className="px-2 py-1 text-left">Phone</th>
                      <th className="px-2 py-1 text-left">Specialty</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.slice(0, 10).map((row, index) => (
                      <tr key={index} className="border-t">
                        <td className="px-2 py-1">{row['Company Name'] || row.company_name}</td>
                        <td className="px-2 py-1">{row['Contact Name'] || row.contact_name}</td>
                        <td className="px-2 py-1">{row['Email'] || row.email}</td>
                        <td className="px-2 py-1">{row['Phone'] || row.phone}</td>
                        <td className="px-2 py-1">{row['Specialty'] || row.specialty}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {previewData.length > 10 && (
                  <div className="px-2 py-1 text-gray-500 text-center">
                    ... and {previewData.length - 10} more items
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleImport} 
              disabled={previewData.length === 0 || isLoading}
            >
              {isLoading ? 'Importing...' : `Import ${previewData.length} Items`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
