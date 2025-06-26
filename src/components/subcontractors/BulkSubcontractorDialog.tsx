import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Upload, FileText, Users } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BulkSubcontractorDialogProps {
  onSubcontractorsCreated: () => void;
}

export function BulkSubcontractorDialog({ onSubcontractorsCreated }: BulkSubcontractorDialogProps) {
  const [open, setOpen] = useState(false);
  const [csvData, setCsvData] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!csvData.trim()) {
      toast.error('Please enter CSV data');
      return;
    }

    setLoading(true);
    try {
      const lines = csvData.trim().split('\n');
      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      
      const subcontractors = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim());
        const sub: any = {};
        
        headers.forEach((header, index) => {
          const value = values[index] || '';
          
          switch (header) {
            case 'name':
              sub.name = value;
              break;
            case 'company':
              sub.company = value;
              break;
            case 'email':
              sub.email = value;
              break;
            case 'phone':
              sub.phone = value;
              break;
            case 'address':
              sub.address = value;
              break;
            case 'city':
              sub.city = value;
              break;
            case 'state':
              sub.state = value;
              break;
            case 'zip_code':
            case 'zip':
              sub.zip_code = value;
              break;
            case 'specialties':
            case 'trades':
              sub.specialties = value ? value.split('|').map(s => s.trim()) : [];
              break;
            case 'status':
              sub.status = value || 'Active';
              break;
            case 'notes':
              sub.notes = value;
              break;
            case 'w9_on_file':
            case 'w9':
              sub.w9_on_file = value.toLowerCase() === 'true' || value.toLowerCase() === 'yes';
              break;
            case 'insurance_expiry':
              if (value) {
                sub.insurance_expiry = new Date(value).toISOString().split('T')[0];
              }
              break;
            case 'rating':
              if (value && !isNaN(parseFloat(value))) {
                sub.rating = parseFloat(value);
              }
              break;
          }
        });
        
        return sub;
      }).filter(sub => sub.name); // Only include entries with names

      if (subcontractors.length === 0) {
        toast.error('No valid subcontractor data found');
        return;
      }

      const { error } = await supabase
        .from('subcontractors')
        .insert(subcontractors);

      if (error) throw error;

      toast.success(`Successfully created ${subcontractors.length} subcontractors`);
      setOpen(false);
      setCsvData('');
      onSubcontractorsCreated();
    } catch (error) {
      console.error('Error creating subcontractors:', error);
      toast.error('Failed to create subcontractors');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2">
          <Upload className="w-4 h-4" />
          Bulk Import
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            Bulk Import Subcontractors
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="csv-data">CSV Data</Label>
            <Textarea
              id="csv-data"
              value={csvData}
              onChange={(e) => setCsvData(e.target.value)}
              placeholder="Paste your CSV data here..."
              className="min-h-[200px] font-mono text-sm"
            />
            <p className="text-sm text-muted-foreground mt-2">
              Include headers: name, company, email, phone, address, city, state, zip_code, specialties, status, notes, w9_on_file, insurance_expiry, rating
            </p>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-start gap-2">
              <FileText className="w-5 h-5 text-blue-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-blue-900">CSV Format Tips</h4>
                <ul className="text-sm text-blue-800 mt-2 space-y-1">
                  <li>• Separate multiple specialties with "|" (pipe character)</li>
                  <li>• Use "true" or "yes" for w9_on_file field</li>
                  <li>• Date format for insurance_expiry: YYYY-MM-DD</li>
                  <li>• Rating should be a number between 1-5</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button onClick={handleSubmit} disabled={loading} className="flex-1">
              {loading ? 'Importing...' : 'Import Subcontractors'}
            </Button>
            <Button 
              variant="outline" 
              onClick={() => setOpen(false)}
              className="flex-1"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
