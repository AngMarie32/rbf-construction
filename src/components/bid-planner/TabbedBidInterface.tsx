
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TabbedBidInterfaceProps {
  projectId: string;
  bidItems: any[];
  onItemsChange: (items: any[]) => void;
  onCreateNewBid: () => void;
  onExportReport: () => void;
  projectName?: string;
}

interface NewBidItem {
  category: string;
  subcategory: string;
  description: string;
  unit: string;
  unitCost: string;
  quantity: string;
}

export function TabbedBidInterface({ 
  projectId, 
  bidItems, 
  onItemsChange, 
  onCreateNewBid,
  onExportReport,
  projectName 
}: TabbedBidInterfaceProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [newItem, setNewItem] = useState<NewBidItem>({
    category: '',
    subcategory: '',
    description: '',
    unit: 'Each',
    unitCost: '',
    quantity: '1'
  });

  const calculateTotalValue = () => {
    return bidItems.reduce((sum, item) => sum + (item.total || 0), 0);
  };

  const getItemCount = () => {
    return bidItems.length;
  };

  const getCategoryCount = () => {
    return new Set(bidItems.map(item => item.category)).size;
  };

  const handleAddItem = async () => {
    if (!newItem.category || !newItem.description || !newItem.unitCost) {
      toast.error('Please fill in required fields');
      return;
    }

    const quantity = parseFloat(newItem.quantity) || 1;
    const unitCost = parseFloat(newItem.unitCost) || 0;
    const total = quantity * unitCost;

    try {
      const { data, error } = await supabase
        .from('bid_items')
        .insert({
          project_id: projectId,
          category: newItem.category,
          subcategory: newItem.subcategory || '',
          description: newItem.description,
          quantity: quantity,
          unit: newItem.unit,
          unit_cost: unitCost,
          total: total
        })
        .select()
        .single();

      if (error) throw error;

      onItemsChange([...bidItems, data]);
      
      // Reset form
      setNewItem({
        category: '',
        subcategory: '',
        description: '',
        unit: 'Each',
        unitCost: '',
        quantity: '1'
      });

      toast.success('Bid item added successfully');
    } catch (error) {
      console.error('Error adding bid item:', error);
      toast.error('Failed to add bid item');
    }
  };

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview">Bid Overview</TabsTrigger>
          <TabsTrigger value="lineitems">Line Items</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Project Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div className="text-lg font-semibold">{projectName || 'Baldwin'}</div>
                <div className="text-sm text-gray-500">
                  Last updated: {new Date().toLocaleDateString()}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-green-600">
                      ${calculateTotalValue().toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">Project bid total</div>
                  </div>
                  <div className="text-gray-400">📊</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">{getItemCount()}</div>
                    <div className="text-sm text-gray-600">Across {getCategoryCount()} categories</div>
                  </div>
                  <div className="text-gray-400">📄</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold">
                      ${(calculateTotalValue() * 0.75).toLocaleString()}
                    </div>
                    <div className="text-sm text-gray-600">75% of total bid</div>
                  </div>
                  <div className="text-gray-400">💰</div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-2xl font-bold text-blue-600">15%</div>
                    <div className="text-sm text-gray-600">${(calculateTotalValue() * 0.15).toLocaleString()} profit</div>
                  </div>
                  <div className="text-gray-400">📈</div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Bid Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle>Bid Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Direct Costs</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">75%</span>
                    <span className="font-medium">${(calculateTotalValue() * 0.75).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Overhead</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">10%</span>
                    <span className="font-medium">${(calculateTotalValue() * 0.10).toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Profit</span>
                  <div className="flex items-center gap-2">
                    <span className="text-sm">15%</span>
                    <span className="font-medium">${(calculateTotalValue() * 0.15).toLocaleString()}</span>
                  </div>
                </div>
                <div className="border-t pt-2 flex justify-between items-center font-semibold">
                  <span>Total Bid Amount</span>
                  <span className="text-lg text-green-600">${calculateTotalValue().toLocaleString()}</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lineitems" className="space-y-6">
          {/* Add Bid Item Form */}
          <Card>
            <CardHeader>
              <CardTitle>Add Bid Item</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-6 gap-4 items-end">
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Input
                    id="category"
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                    placeholder="Category"
                  />
                </div>
                <div>
                  <Label htmlFor="subcategory">Subcategory</Label>
                  <Input
                    id="subcategory"
                    value={newItem.subcategory}
                    onChange={(e) => setNewItem({ ...newItem, subcategory: e.target.value })}
                    placeholder="Subcategory"
                  />
                </div>
                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Input
                    id="description"
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    placeholder="Description"
                  />
                </div>
                <div>
                  <Label htmlFor="unit">Unit</Label>
                  <Select value={newItem.unit} onValueChange={(value) => setNewItem({ ...newItem, unit: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Each">Each</SelectItem>
                      <SelectItem value="SF">SF</SelectItem>
                      <SelectItem value="LF">LF</SelectItem>
                      <SelectItem value="CF">CF</SelectItem>
                      <SelectItem value="CY">CY</SelectItem>
                      <SelectItem value="Hour">Hour</SelectItem>
                      <SelectItem value="Day">Day</SelectItem>
                      <SelectItem value="Lot">Lot</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="unitCost">Unit Cost ($) *</Label>
                  <Input
                    id="unitCost"
                    type="number"
                    value={newItem.unitCost}
                    onChange={(e) => setNewItem({ ...newItem, unitCost: e.target.value })}
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                    placeholder="1"
                    step="0.01"
                  />
                </div>
              </div>
              <div className="mt-4">
                <Button onClick={handleAddItem} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Add
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Bid Items List */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Bid Items</CardTitle>
              <Button variant="outline" onClick={onExportReport}>
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
            </CardHeader>
            <CardContent>
              {bidItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No bid items found. Add your first item above or use a template.
                </div>
              ) : (
                <div className="space-y-3">
                  {bidItems.map((item) => (
                    <div key={item.id} className="flex justify-between items-center p-3 border rounded-lg">
                      <div className="flex-1">
                        <div className="font-medium">{item.description}</div>
                        <div className="text-sm text-gray-600">
                          {item.category} • Qty: {item.quantity} {item.unit} • ${item.unit_cost}/unit
                        </div>
                      </div>
                      <div className="text-lg font-bold">
                        ${(item.total || 0).toLocaleString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Bid Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="profitMargin">Profit Margin (%)</Label>
                  <Input
                    id="profitMargin"
                    type="number"
                    defaultValue="15"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="overhead">Overhead (%)</Label>
                  <Input
                    id="overhead"
                    type="number"
                    defaultValue="10"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="contingency">Contingency (%)</Label>
                  <Input
                    id="contingency"
                    type="number"
                    defaultValue="5"
                    className="mt-1"
                  />
                </div>
                <div>
                  <Label htmlFor="bondRate">Bond Rate (%)</Label>
                  <Input
                    id="bondRate"
                    type="number"
                    defaultValue="1"
                    className="mt-1"
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
