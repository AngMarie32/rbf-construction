
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Save, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BidItemForm } from './BidItemForm';

interface BidCreationViewProps {
  projectId: string;
  selectedTemplate: any;
  onItemsChange: (items: any[]) => void;
  showCreateView: boolean;
  onShowCreateViewChange: (show: boolean) => void;
}

interface BidItem {
  id: string;
  category: string;
  subcategory: string;
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
  total: number;
}

export function BidCreationView({ projectId, selectedTemplate, onItemsChange, showCreateView, onShowCreateViewChange }: BidCreationViewProps) {
  const [saving, setSaving] = useState(false);
  const [bidInfo, setBidInfo] = useState({
    name: '',
    description: '',
    bidType: 'Primary',
    dueDate: '',
    estimatedValue: '',
    notes: ''
  });

  const [bidItems, setBidItems] = useState<BidItem[]>([
    {
      id: '1',
      category: '',
      subcategory: '',
      description: '',
      quantity: 1,
      unit: 'each',
      unitCost: 0,
      total: 0
    }
  ]);

  const calculateTotalValue = () => {
    return bidItems.reduce((sum, item) => sum + item.total, 0);
  };

  const handleSaveBid = async () => {
    if (!bidInfo.name.trim()) {
      toast.error('Please enter a bid name');
      return;
    }

    if (bidItems.length === 0 || bidItems.every(item => !item.description.trim())) {
      toast.error('Please add at least one bid item with a description');
      return;
    }

    setSaving(true);
    try {
      // Save bid items to the database
      const itemsToSave = bidItems
        .filter(item => item.description.trim())
        .map(item => ({
          project_id: projectId,
          category: item.category || 'General',
          subcategory: item.subcategory || '',
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_cost: item.unitCost,
          total: item.total
        }));

      if (itemsToSave.length === 0) {
        toast.error('Please add at least one valid bid item');
        return;
      }

      const { error: itemsError } = await supabase
        .from('bid_items')
        .insert(itemsToSave);

      if (itemsError) throw itemsError;

      // Also create a bid template record for reference
      const { error: templateError } = await supabase
        .from('bid_templates')
        .insert({
          name: bidInfo.name,
          description: bidInfo.description || `${bidInfo.bidType} bid for project`
        });

      if (templateError) {
        console.warn('Could not create template:', templateError);
        // Don't fail the whole operation for this
      }

      toast.success(`Bid "${bidInfo.name}" created successfully with ${itemsToSave.length} items`);
      onItemsChange(itemsToSave);
      onShowCreateViewChange(false);
    } catch (error) {
      console.error('Error saving bid:', error);
      toast.error('Failed to save bid. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      // Save as draft template
      const { error } = await supabase
        .from('bid_templates')
        .insert({
          name: bidInfo.name || `Draft Bid ${Date.now()}`,
          description: `Draft: ${bidInfo.description || 'Work in progress'}`
        });

      if (error) throw error;

      toast.success('Bid saved as draft');
    } catch (error) {
      console.error('Error saving draft:', error);
      toast.error('Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    onShowCreateViewChange(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={handleBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Bid Planner
        </Button>
        <div>
          <h1 className="text-2xl font-bold">Create New Bid</h1>
          <p className="text-muted-foreground">Build a detailed construction bid with line items and pricing</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Bid Information */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Bid Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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
                <Label htmlFor="notes">Notes</Label>
                <Textarea
                  id="notes"
                  value={bidInfo.notes}
                  onChange={(e) => setBidInfo({ ...bidInfo, notes: e.target.value })}
                  placeholder="Additional notes or considerations..."
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Bid Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Bid Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Line Items:</span>
                  <span className="font-medium">{bidItems.filter(item => item.description.trim()).length}</span>
                </div>
                <div className="flex justify-between">
                  <span>Categories:</span>
                  <span className="font-medium">{new Set(bidItems.filter(item => item.category).map(item => item.category)).size}</span>
                </div>
                <div className="border-t pt-2 flex justify-between text-lg font-bold">
                  <span>Total Value:</span>
                  <span>${calculateTotalValue().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="space-y-2">
            <Button 
              onClick={handleSaveBid} 
              disabled={saving} 
              className="w-full"
              size="lg"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Bid'}
            </Button>
            <Button 
              variant="outline" 
              onClick={handleSaveDraft} 
              disabled={saving}
              className="w-full"
            >
              <FileText className="w-4 h-4 mr-2" />
              Save as Draft
            </Button>
          </div>
        </div>

        {/* Bid Items */}
        <div className="lg:col-span-2">
          <BidItemForm items={bidItems} onItemsChange={setBidItems} />
        </div>
      </div>
    </div>
  );
}
