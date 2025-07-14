
import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Calendar, CalendarIcon } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { format } from 'date-fns';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';

interface NewPermitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId?: string;
  onPermitCreated: () => void;
}

const permitTypes = [
  'Building', 'Electrical', 'Plumbing', 'Mechanical', 
  'Fire', 'Demolition', 'Grading', 'Other'
];

const permitStatuses = [
  'Not Applied', 'Application Submitted', 'Under Review', 
  'Approved', 'Issued', 'Expired', 'Rejected'
];

export const NewPermitDialog = ({ open, onOpenChange, projectId, onPermitCreated }: NewPermitDialogProps) => {
  const [formData, setFormData] = useState({
    permit_type: '',
    description: '',
    issuing_authority: '',
    permit_number: '',
    status: 'Not Applied',
    fee_amount: '',
    fee_paid: false,
    notes: '',
    application_date: null as Date | null,
    issued_date: null as Date | null,
    expiration_date: null as Date | null,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    console.log('Creating permit with data:', {
      ...formData,
      project_id: projectId,
      fee_amount: formData.fee_amount ? parseFloat(formData.fee_amount) : null,
    });
    
    // TODO: Implement actual API call when backend is ready
    onPermitCreated();
    onOpenChange(false);
    setFormData({
      permit_type: '',
      description: '',
      issuing_authority: '',
      permit_number: '',
      status: 'Not Applied',
      fee_amount: '',
      fee_paid: false,
      notes: '',
      application_date: null,
      issued_date: null,
      expiration_date: null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Add New Permit</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="permit_type">Permit Type *</Label>
              <Select value={formData.permit_type} onValueChange={(value) => setFormData(prev => ({ ...prev, permit_type: value }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select permit type" />
                </SelectTrigger>
                <SelectContent>
                  {permitTypes.map(type => (
                    <SelectItem key={type} value={type}>{type}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="status">Status *</Label>
              <Select value={formData.status} onValueChange={(value) => setFormData(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {permitStatuses.map(status => (
                    <SelectItem key={status} value={status}>{status}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="description">Description *</Label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of work"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="issuing_authority">Issuing Authority *</Label>
              <Input
                id="issuing_authority"
                value={formData.issuing_authority}
                onChange={(e) => setFormData(prev => ({ ...prev, issuing_authority: e.target.value }))}
                placeholder="City, County, State, etc."
                required
              />
            </div>
            
            <div>
              <Label htmlFor="permit_number">Permit Number</Label>
              <Input
                id="permit_number"
                value={formData.permit_number}
                onChange={(e) => setFormData(prev => ({ ...prev, permit_number: e.target.value }))}
                placeholder="Enter permit number"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label>Application Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.application_date ? format(formData.application_date, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={formData.application_date || undefined}
                    onSelect={(date) => setFormData(prev => ({ ...prev, application_date: date || null }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Issued Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.issued_date ? format(formData.issued_date, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={formData.issued_date || undefined}
                    onSelect={(date) => setFormData(prev => ({ ...prev, issued_date: date || null }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div>
              <Label>Expiration Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.expiration_date ? format(formData.expiration_date, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={formData.expiration_date || undefined}
                    onSelect={(date) => setFormData(prev => ({ ...prev, expiration_date: date || null }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="fee_amount">Fee Amount</Label>
              <Input
                id="fee_amount"
                type="number"
                step="0.01"
                value={formData.fee_amount}
                onChange={(e) => setFormData(prev => ({ ...prev, fee_amount: e.target.value }))}
                placeholder="0.00"
              />
            </div>
            
            <div className="flex items-center space-x-2 mt-6">
              <Checkbox
                id="fee_paid"
                checked={formData.fee_paid}
                onCheckedChange={(checked) => setFormData(prev => ({ ...prev, fee_paid: !!checked }))}
              />
              <Label htmlFor="fee_paid">Fee Paid</Label>
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              placeholder="Additional notes or requirements..."
              rows={3}
            />
          </div>

          <div className="flex gap-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1">
              Create Permit
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
