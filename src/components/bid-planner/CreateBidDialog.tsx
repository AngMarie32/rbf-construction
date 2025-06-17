
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface CreateBidDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBidCreated: () => void;
  projectId: string;
}

export function CreateBidDialog({ open, onOpenChange, onBidCreated, projectId }: CreateBidDialogProps) {
  const [bidInfo, setBidInfo] = useState({
    name: '',
    description: '',
    bidType: 'Primary',
    dueDate: '',
    estimatedValue: '',
    notes: ''
  });

  const handleCreateBid = async () => {
    if (!bidInfo.name) {
      toast.error('Please enter a bid name');
      return;
    }

    try {
      // For now, we'll create a bid template that can be loaded
      const { data, error } = await supabase
        .from('bid_templates')
        .insert({
          name: bidInfo.name,
          description: bidInfo.description || `${bidInfo.bidType} bid for project`
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Bid created successfully');
      setBidInfo({
        name: '',
        description: '',
        bidType: 'Primary',
        dueDate: '',
        estimatedValue: '',
        notes: ''
      });
      onOpenChange(false);
      onBidCreated();
    } catch (error) {
      console.error('Error creating bid:', error);
      toast.error('Failed to create bid');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create New Bid</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Information */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="bidName">Bid Name *</Label>
                  <Input
                    id="bidName"
                    value={bidInfo.name}
                    onChange={(e) => setBidInfo({ ...bidInfo, name: e.target.value })}
                    placeholder="Main Contract Bid"
                  />
                </div>
                <div>
                  <Label htmlFor="bidType">Bid Type</Label>
                  <Select value={bidInfo.bidType} onValueChange={(value) => setBidInfo({ ...bidInfo, bidType: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Primary">Primary</SelectItem>
                      <SelectItem value="Alternative">Alternative</SelectItem>
                      <SelectItem value="Addendum">Addendum</SelectItem>
                      <SelectItem value="Change Order">Change Order</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={bidInfo.description}
                  onChange={(e) => setBidInfo({ ...bidInfo, description: e.target.value })}
                  placeholder="Brief description of the bid scope..."
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="dueDate">Due Date</Label>
                  <Input
                    id="dueDate"
                    type="date"
                    value={bidInfo.dueDate}
                    onChange={(e) => setBidInfo({ ...bidInfo, dueDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="estimatedValue">Estimated Value ($)</Label>
                  <Input
                    id="estimatedValue"
                    type="number"
                    value={bidInfo.estimatedValue}
                    onChange={(e) => setBidInfo({ ...bidInfo, estimatedValue: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Additional Settings */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Additional Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={bidInfo.notes}
                  onChange={(e) => setBidInfo({ ...bidInfo, notes: e.target.value })}
                  placeholder="Additional notes or special considerations..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateBid}>
              Create Bid
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
