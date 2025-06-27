
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
  division: string;
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
      division: 'General Conditions',
      category: 'Labor/Supervision',
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

  const getDivisionBreakdown = () => {
    const breakdown: Record<string, Record<string, number>> = {};
    
    bidItems.forEach(item => {
      const division = item.division || 'Other';
      const category = item.category || 'Uncategorized';
      
      if (!breakdown[division]) {
        breakdown[division] = {};
      }
      
      if (!breakdown[division][category]) {
        breakdown[division][category] = 0;
      }
      
      breakdown[division][category] += item.total;
    });
    
    return breakdown;
  };

  const getDivisionTotals = () => {
    const breakdown = getDivisionBreakdown();
    const divisionTotals: Record<string, number> = {};
    
    Object.entries(breakdown).forEach(([division, categories]) => {
      divisionTotals[division] = Object.values(categories).reduce((sum, amount) => sum + amount, 0);
    });
    
    return divisionTotals;
  };

  const handleSaveBid = async () => {
    if (bidItems.length === 0) {
      toast.error('Please add at least one bid item');
      return;
    }

    setSaving(true);
    try {
      const itemsToSave = bidItems.map(item => ({
        project_id: projectId,
        category: item.category || 'Other',
        subcategory: item.subcategory || '',
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_cost: item.unitCost,
        total: item.total
      }));

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

  const breakdown = getDivisionBreakdown();
  const divisionTotals = getDivisionTotals();

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

      {/* Bid Items - Full width */}
      <div className="w-full">
        <BidItemForm items={bidItems} onItemsChange={setBidItems} />
      </div>

      {/* Bid Summary - Bottom section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Bid Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="text-lg font-bold border-b pb-2">
                Total: ${calculateTotalValue().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              
              {/* Division Totals */}
              <div className="space-y-3">
                <h4 className="font-semibold text-sm">Division Breakdown</h4>
                {Object.entries(divisionTotals).map(([division, total]) => (
                  <div key={division} className="flex justify-between text-sm border-b pb-1">
                    <span className="font-medium">{division}</span>
                    <span className="font-semibold">${total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  </div>
                ))}
              </div>

              {/* Detailed Category Breakdown */}
              <div className="space-y-4 pt-4 border-t">
                <h4 className="font-semibold text-sm">Category Breakdown</h4>
                {Object.entries(breakdown).map(([division, categories]) => (
                  <div key={division} className="space-y-2">
                    <div className="font-medium text-sm text-blue-600">
                      {division}
                    </div>
                    {Object.entries(categories).map(([category, amount]) => (
                      <div key={category} className="flex justify-between text-xs pl-3">
                        <span className="text-muted-foreground">{category}</span>
                        <span>${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
              
              <div className="text-sm text-muted-foreground pt-2 border-t">
                {bidItems.length} line items
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Buttons */}
        <Card>
          <CardHeader>
            <CardTitle>Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={handleSaveBid} 
              disabled={saving} 
              className="w-full"
              size="lg"
            >
              <Save className="w-4 h-4 mr-2" />
              {saving ? 'Saving...' : 'Save Bid'}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
