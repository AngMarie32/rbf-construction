
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Save, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BidItem {
  id?: string;
  category: string;
  subcategory?: string;
  description: string;
  quantity: number;
  unit: string;
  unit_cost: number;
  total?: number;
  division?: string;
}

interface BidItemFormProps {
  projectId: string;
  onItemsChange: (items: any[]) => void;
  initialItems?: BidItem[];
}

const divisions = [
  'Site Work',
  'Building', 
  'General Conditions',
  'Other'
];

const categories = [
  'General Conditions',
  'Site Work',
  'Concrete',
  'Masonry',
  'Metals',
  'Carpentry',
  'Thermal & Moisture Protection',
  'Doors & Windows',
  'Finishes',
  'Specialties',
  'Equipment',
  'Furnishings',
  'Special Construction',
  'Conveying Systems',
  'Fire Suppression',
  'Plumbing',
  'HVAC',
  'Electrical',
  'Communications',
  'Electronic Safety & Security'
];

export function BidItemForm({ projectId, onItemsChange, initialItems = [] }: BidItemFormProps) {
  const [items, setItems] = useState<BidItem[]>(initialItems.length > 0 ? initialItems : [{
    category: '',
    subcategory: '',
    description: '',
    quantity: 1,
    unit: 'each',
    unit_cost: 0,
    division: ''
  }]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (initialItems.length > 0) {
      setItems(initialItems);
    }
  }, [initialItems]);

  const addItem = () => {
    setItems([...items, {
      category: '',
      subcategory: '',
      description: '',
      quantity: 1,
      unit: 'each',
      unit_cost: 0,
      division: ''
    }]);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_, i) => i !== index);
    setItems(newItems);
  };

  const updateItem = (index: number, field: keyof BidItem, value: any) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [field]: value };
    
    // Calculate total when quantity or unit_cost changes
    if (field === 'quantity' || field === 'unit_cost') {
      newItems[index].total = newItems[index].quantity * newItems[index].unit_cost;
    }
    
    setItems(newItems);
  };

  const saveItems = async () => {
    if (!projectId) {
      toast.error('No project selected');
      return;
    }

    // Validate items
    const validItems = items.filter(item => 
      item.category.trim() && 
      item.description.trim() && 
      item.quantity > 0 && 
      item.unit_cost >= 0
    );

    if (validItems.length === 0) {
      toast.error('Please add at least one valid bid item');
      return;
    }

    setSaving(true);
    try {
      console.log('Saving bid items:', validItems);

      // Prepare items for database insertion
      const itemsToSave = validItems.map(item => ({
        project_id: projectId,
        category: item.category,
        subcategory: item.subcategory || null,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        unit_cost: item.unit_cost,
        total: item.quantity * item.unit_cost,
        division: item.division || null
      }));

      console.log('Items prepared for database:', itemsToSave);

      // Delete existing items for this project
      const { error: deleteError } = await supabase
        .from('bid_items')
        .delete()
        .eq('project_id', projectId);

      if (deleteError) {
        console.error('Error deleting existing bid items:', deleteError);
        throw deleteError;
      }

      // Insert new items
      const { data, error: insertError } = await supabase
        .from('bid_items')
        .insert(itemsToSave)
        .select();

      if (insertError) {
        console.error('Error inserting bid items:', insertError);
        throw insertError;
      }

      console.log('Bid items saved successfully:', data);
      toast.success(`Successfully saved ${validItems.length} bid items`);
      onItemsChange(data || []);
      
    } catch (error) {
      console.error('Error saving bid items:', error);
      toast.error('Failed to save bid items');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bid Items</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item, index) => (
          <div key={index} className="border rounded-lg p-4 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">Item {index + 1}</h4>
              {items.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeItem(index)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label>Division</Label>
                <Select
                  value={item.division || ''}
                  onValueChange={(value) => updateItem(index, 'division', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select division" />
                  </SelectTrigger>
                  <SelectContent>
                    {divisions.map((division) => (
                      <SelectItem key={division} value={division}>
                        {division}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Category</Label>
                <Select
                  value={item.category}
                  onValueChange={(value) => updateItem(index, 'category', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div>
              <Label>Subcategory (Optional)</Label>
              <Input
                value={item.subcategory || ''}
                onChange={(e) => updateItem(index, 'subcategory', e.target.value)}
                placeholder="Enter subcategory"
              />
            </div>

            <div>
              <Label>Description</Label>
              <Textarea
                value={item.description}
                onChange={(e) => updateItem(index, 'description', e.target.value)}
                placeholder="Enter item description"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label>Quantity</Label>
                <Input
                  type="number"
                  value={item.quantity}
                  onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <Label>Unit</Label>
                <Select
                  value={item.unit}
                  onValueChange={(value) => updateItem(index, 'unit', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="each">Each</SelectItem>
                    <SelectItem value="sq ft">Sq Ft</SelectItem>
                    <SelectItem value="linear ft">Linear Ft</SelectItem>
                    <SelectItem value="cubic ft">Cubic Ft</SelectItem>
                    <SelectItem value="sq yd">Sq Yd</SelectItem>
                    <SelectItem value="cubic yd">Cubic Yd</SelectItem>
                    <SelectItem value="ton">Ton</SelectItem>
                    <SelectItem value="lb">Pound</SelectItem>
                    <SelectItem value="hr">Hour</SelectItem>
                    <SelectItem value="day">Day</SelectItem>
                    <SelectItem value="lump sum">Lump Sum</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label>Unit Cost</Label>
                <Input
                  type="number"
                  value={item.unit_cost}
                  onChange={(e) => updateItem(index, 'unit_cost', parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <Label>Total</Label>
                <Input
                  type="number"
                  value={(item.quantity * item.unit_cost).toFixed(2)}
                  readOnly
                  className="bg-gray-50"
                />
              </div>
            </div>
          </div>
        ))}

        <div className="flex gap-2">
          <Button onClick={addItem} variant="outline" className="flex-1">
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
          
          <Button onClick={saveItems} disabled={saving} className="flex-1">
            <Save className="w-4 h-4 mr-2" />
            {saving ? 'Saving...' : 'Save Items'}
          </Button>
        </div>

        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="font-medium">Total Bid Amount:</span>
            <span className="text-xl font-bold">
              ${items.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0).toFixed(2)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
