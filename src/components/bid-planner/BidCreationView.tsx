
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

  const [bidItems, setBidItems] = useState<BidItem[]>([
    {
      id: '1',
      category: 'General Conditions',
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

  const getCategoryBreakdown = () => {
    const breakdown: Record<string, Record<string, number>> = {};
    
    bidItems.forEach(item => {
      if (!item.description.trim()) return;
      
      const category = item.category || 'Other';
      const subcategory = item.subcategory || 'Uncategorized';
      
      if (!breakdown[category]) {
        breakdown[category] = {};
      }
      
      if (!breakdown[category][subcategory]) {
        breakdown[category][subcategory] = 0;
      }
      
      breakdown[category][subcategory] += item.total;
    });
    
    return breakdown;
  };

  const handleSaveBid = async () => {
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
          category: item.category || 'Other',
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

      toast.success(`Bid created successfully with ${itemsToSave.length} items`);
      onItemsChange(itemsToSave);
      onShowCreateViewChange(false);
    } catch (error) {
      console.error('Error saving bid:', error);
      toast.error('Failed to save bid. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const handleBack = () => {
    onShowCreateViewChange(false);
  };

  const breakdown = getCategoryBreakdown();

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

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Bid Items - Takes up 3 columns */}
        <div className="lg:col-span-3">
          <BidItemForm items={bidItems} onItemsChange={setBidItems} />
        </div>

        {/* Bid Summary - Takes up 1 column */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Bid Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="text-lg font-bold border-b pb-2">
                  Total: ${calculateTotalValue().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                
                <div className="space-y-3">
                  {Object.entries(breakdown).map(([category, subcategories]) => (
                    <div key={category} className="space-y-2">
                      <div className="font-medium text-sm">{category}</div>
                      {Object.entries(subcategories).map(([subcategory, amount]) => (
                        <div key={subcategory} className="flex justify-between text-xs pl-3">
                          <span className="text-muted-foreground">{subcategory}</span>
                          <span>${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </div>
                
                <div className="text-sm text-muted-foreground pt-2 border-t">
                  {bidItems.filter(item => item.description.trim()).length} line items
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
          </div>
        </div>
      </div>
    </div>
  );
}
