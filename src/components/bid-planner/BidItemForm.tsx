
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';

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

interface BidItemFormProps {
  items: BidItem[];
  onItemsChange: (items: BidItem[]) => void;
}

const commonCategories = [
  'Site Work',
  'Concrete',
  'Masonry',
  'Steel',
  'Wood & Plastics',
  'Thermal & Moisture Protection',
  'Doors & Windows',
  'Finishes',
  'Specialties',
  'Equipment',
  'Furnishings',
  'Special Construction',
  'Conveying Systems',
  'Mechanical',
  'Electrical',
  'Earthwork',
  'Utilities'
];

const commonUnits = ['each', 'sf', 'lf', 'cf', 'cy', 'ton', 'hour', 'day', 'lot'];

export function BidItemForm({ items, onItemsChange }: BidItemFormProps) {
  const addItem = () => {
    const newItem: BidItem = {
      id: Date.now().toString(),
      category: '',
      subcategory: '',
      description: '',
      quantity: 1,
      unit: 'each',
      unitCost: 0,
      total: 0
    };
    onItemsChange([...items, newItem]);
  };

  const updateItem = (id: string, field: keyof BidItem, value: any) => {
    const updatedItems = items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitCost') {
          updated.total = updated.quantity * updated.unitCost;
        }
        return updated;
      }
      return item;
    });
    onItemsChange(updatedItems);
  };

  const removeItem = (id: string) => {
    onItemsChange(items.filter(item => item.id !== id));
  };

  const calculateGrandTotal = () => {
    return items.reduce((sum, item) => sum + item.total, 0);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Bid Line Items</CardTitle>
          <Button onClick={addItem} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item, index) => (
          <div key={item.id} className="border rounded-lg p-4 space-y-4">
            <div className="flex justify-between items-start">
              <h4 className="font-medium">Item #{index + 1}</h4>
              {items.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeItem(item.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`category-${item.id}`}>Category</Label>
                <Select
                  value={item.category}
                  onValueChange={(value) => updateItem(item.id, 'category', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {commonCategories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor={`subcategory-${item.id}`}>Subcategory</Label>
                <Input
                  id={`subcategory-${item.id}`}
                  value={item.subcategory}
                  onChange={(e) => updateItem(item.id, 'subcategory', e.target.value)}
                  placeholder="Enter subcategory"
                />
              </div>
            </div>

            <div>
              <Label htmlFor={`description-${item.id}`}>Description</Label>
              <Textarea
                id={`description-${item.id}`}
                value={item.description}
                onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                placeholder="Detailed description of work"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor={`quantity-${item.id}`}>Quantity</Label>
                <Input
                  id={`quantity-${item.id}`}
                  type="number"
                  value={item.quantity}
                  onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <Label htmlFor={`unit-${item.id}`}>Unit</Label>
                <Select
                  value={item.unit}
                  onValueChange={(value) => updateItem(item.id, 'unit', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {commonUnits.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor={`unitCost-${item.id}`}>Unit Cost ($)</Label>
                <Input
                  id={`unitCost-${item.id}`}
                  type="number"
                  value={item.unitCost}
                  onChange={(e) => updateItem(item.id, 'unitCost', parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <Label>Total</Label>
                <div className="p-2 bg-gray-50 rounded border font-medium">
                  ${item.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>
        ))}

        {items.length > 0 && (
          <div className="border-t pt-4 mt-6">
            <div className="flex justify-end">
              <div className="text-right">
                <div className="text-lg font-bold">
                  Grand Total: ${calculateGrandTotal().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-sm text-gray-600">
                  {items.length} line item{items.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
