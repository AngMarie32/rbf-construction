
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BidCreationViewProps {
  projectId: string;
  onBack: () => void;
  onBidCreated: () => void;
}

export function BidCreationView({ projectId, onBack, onBidCreated }: BidCreationViewProps) {
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
      onBidCreated();
      onBack();
    } catch (error) {
      console.error('Error creating bid:', error);
      toast.error('Failed to create bid');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Bid Planner
        </Button>
        <h1 className="text-2xl font-bold">Create New Bid</h1>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Basic Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bidName">Bid Name *</Label>
                <Input
                  id="bidName"
                  value={bidInfo.name}
                  onChange={(e) => setBidInfo({ ...bidInfo, name: e.target.value })}
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
                />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Additional Settings</CardTitle>
          </CardHeader>
          <CardContent>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={bidInfo.notes}
                onChange={(e) => setBidInfo({ ...bidInfo, notes: e.target.value })}
                rows={8}
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end space-x-2">
        <Button variant="outline" onClick={onBack}>
          Cancel
        </Button>
        <Button onClick={handleCreateBid}>
          Create Bid
        </Button>
      </div>
    </div>
  );
}
