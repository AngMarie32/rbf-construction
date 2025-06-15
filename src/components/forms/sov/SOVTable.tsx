import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, Plus, Save, X, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SOVItem {
  id: string;
  itemNumber: string;
  description: string;
  scheduledValue: number;
  changeOrders: number;
  previousApplications: number;
  thisPeriod: number;
  materialsStored: number;
  totalCompletedAndStored: number;
  percentComplete: number;
  category: string;
}

interface SOVTableProps {
  sovItems: SOVItem[];
  setSovItems: (items: SOVItem[]) => void;
  projectId: string;
  selectedApplication: string;
  onUpdateItem: (id: string, value: number) => void;
}

export function SOVTable({ sovItems, setSovItems, projectId, selectedApplication, onUpdateItem }: SOVTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [newSOVItem, setNewSOVItem] = useState<null | { itemNumber: string, description: string, scheduledValue: number, category: string }>(null);
  const [loading, setLoading] = useState(false);

  const categories = ['all', ...Array.from(new Set(sovItems.map(item => item.category)))];
  
  const filteredItems = sovItems.filter(item => {
    const matchesSearch = item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         item.itemNumber.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleDeleteSOVItem = async (itemId: string) => {
    if (!window.confirm("Are you sure you want to delete this item? This action cannot be undone.")) {
      return;
    }

    try {
      setLoading(true);
      
      // Check if this SOV item is linked to change orders
      const { data: changeOrderLinks } = await supabase
        .from('sov_item_change_orders')
        .select('*')
        .eq('sov_item_id', itemId);

      // If linked to change orders, remove the linkages and update project net change orders
      if (changeOrderLinks && changeOrderLinks.length > 0) {
        const totalChangeOrderAmount = changeOrderLinks.reduce((sum, link) => sum + link.amount, 0);
        
        // Update project net_change_orders
        const { data: projectData } = await supabase
          .from('projects')
          .select('net_change_orders')
          .eq('id', projectId)
          .single();

        const currentNetChange = projectData?.net_change_orders || 0;
        
        await supabase
          .from('projects')
          .update({ 
            net_change_orders: Math.max(0, currentNetChange - totalChangeOrderAmount)
          })
          .eq('id', projectId);

        // Delete the linkages
        await supabase
          .from('sov_item_change_orders')
          .delete()
          .eq('sov_item_id', itemId);
      }

      // Delete the SOV item
      const { error } = await supabase.from('sov_items').delete().eq('id', itemId);
      if (error) throw error;

      setSovItems(sovItems.filter(item => item.id !== itemId));
      toast.success("SOV item deleted successfully");
    } catch (error) {
      toast.error("Failed to delete SOV item");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddNewItem = () => {
    const nextItemNumber = sovItems.length > 0 ? String(Math.max(...sovItems.map(i => Number(i.itemNumber)).filter(Number.isFinite)) + 1) : "1";
    setNewSOVItem({ itemNumber: nextItemNumber, description: '', scheduledValue: 0, category: 'General' });
  };

  const handleSaveNewItem = async () => {
    if (!newSOVItem || !newSOVItem.description || newSOVItem.scheduledValue <= 0) {
      toast.error("Please fill all fields for the new item.");
      return;
    }
    
    try {
      setLoading(true);
      const { data, error } = await supabase.from('sov_items').insert({
        project_id: projectId,
        item_number: newSOVItem.itemNumber,
        description: newSOVItem.description,
        scheduled_value: newSOVItem.scheduledValue,
        category: newSOVItem.category
      }).select().single();

      if (error) throw error;
      
      const mappedItem = {
        id: data.id,
        itemNumber: data.item_number,
        description: data.description,
        scheduledValue: data.scheduled_value,
        changeOrders: 0,
        previousApplications: 0,
        thisPeriod: 0,
        materialsStored: 0,
        totalCompletedAndStored: 0,
        percentComplete: 0,
        category: data.category
      };
      setSovItems([...sovItems, mappedItem]);
      setNewSOVItem(null);
      toast.success("New SOV item added.");
    } catch (error) {
      toast.error("Failed to save new item.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const calculateTotals = () => {
    const totalScheduledValue = filteredItems.reduce((sum, item) => sum + (item.scheduledValue || 0), 0);
    const totalChangeOrders = filteredItems.reduce((sum, item) => sum + (item.changeOrders || 0), 0);
    const totalContract = totalScheduledValue + totalChangeOrders;
    const totalThisPeriod = filteredItems.reduce((sum, item) => sum + (item.thisPeriod || 0), 0);
    const totalCompleted = filteredItems.reduce((sum, item) => sum + (item.totalCompletedAndStored || 0), 0);

    return { totalScheduledValue, totalChangeOrders, totalContract, totalThisPeriod, totalCompleted };
  };

  const totals = calculateTotals();

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            Schedule of Values
            <Badge variant="outline">{filteredItems.length} items</Badge>
          </CardTitle>
          <Button onClick={handleAddNewItem} size="sm" className="flex items-center gap-2">
            <Plus className="w-4 h-4" />
            Add Item
          </Button>
        </div>
        
        {/* Search and Filter Controls */}
        <div className="flex gap-4 mt-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search items..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border rounded-md bg-background"
          >
            {categories.map(category => (
              <option key={category} value={category}>
                {category === 'all' ? 'All Categories' : category}
              </option>
            ))}
          </select>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-4">
          {/* Table Header */}
          <div className="grid grid-cols-9 gap-4 text-sm font-medium border-b pb-2 bg-gray-50 p-2 rounded">
            <div>Item & Description</div>
            <div>Scheduled Value</div>
            <div>Change Orders</div>
            <div>Total Contract</div>
            <div>Work This Period</div>
            <div>Total Completed</div>
            <div>% Complete</div>
            <div>Balance to Finish</div>
            <div>Actions</div>
          </div>

          {/* SOV Items */}
          <div className="max-h-96 overflow-y-auto space-y-2">
            {filteredItems.map((item) => {
              const totalContract = (item.scheduledValue || 0) + (item.changeOrders || 0);
              const totalCompleted = (item.previousApplications || 0) + (item.thisPeriod || 0) + (item.materialsStored || 0);
              const percentComplete = totalContract > 0 ? (totalCompleted / totalContract) * 100 : 0;
              const balanceToFinish = totalContract - totalCompleted;
              
              return (
                <div key={item.id} className="grid grid-cols-9 gap-2 items-center text-sm border-b pb-2 hover:bg-gray-50 p-2 rounded">
                  <div className="font-medium">
                    <div className="flex items-center gap-2">
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">{item.itemNumber}</span>
                      <Badge variant="outline" className="text-xs">{item.category}</Badge>
                    </div>
                    <div className="text-xs text-gray-600 mt-1 line-clamp-2">{item.description}</div>
                  </div>
                  <div className="font-mono">${(item.scheduledValue || 0).toLocaleString()}</div>
                  <div className="font-mono text-green-600">${(item.changeOrders || 0).toLocaleString()}</div>
                  <div className="font-medium font-mono">${totalContract.toLocaleString()}</div>
                  <div>
                    <Input
                      type="number"
                      step="0.01"
                      value={item.thisPeriod || 0}
                      onChange={(e) => onUpdateItem(item.id, Number(e.target.value) || 0)}
                      className="w-full text-sm"
                      disabled={selectedApplication !== 'current'}
                    />
                  </div>
                  <div className="font-mono">${totalCompleted.toLocaleString()}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-blue-600 h-2 rounded-full" 
                          style={{ width: `${Math.min(percentComplete, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-xs">{percentComplete.toFixed(1)}%</span>
                    </div>
                  </div>
                  <div className="font-mono">${balanceToFinish.toLocaleString()}</div>
                  <div>
                    <Button 
                      variant="ghost" 
                      size="icon" 
                      onClick={() => handleDeleteSOVItem(item.id)} 
                      className="text-red-500 hover:text-red-700 h-8 w-8"
                      disabled={loading}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              );
            })}

            {/* New Item Row */}
            {newSOVItem && (
              <div className="grid grid-cols-9 gap-2 items-center text-sm border-2 border-blue-200 bg-blue-50 p-2 rounded">
                <div>
                  <Input
                    value={newSOVItem.itemNumber}
                    onChange={(e) => setNewSOVItem({ ...newSOVItem, itemNumber: e.target.value })}
                    placeholder="Item #"
                    className="h-8 mb-1"
                  />
                  <Input
                    value={newSOVItem.description}
                    onChange={(e) => setNewSOVItem({ ...newSOVItem, description: e.target.value })}
                    placeholder="Description"
                    className="h-8"
                  />
                </div>
                <div>
                  <Input
                    type="number"
                    value={newSOVItem.scheduledValue}
                    onChange={(e) => setNewSOVItem({ ...newSOVItem, scheduledValue: Number(e.target.value) || 0 })}
                    placeholder="Value"
                    className="h-8"
                  />
                </div>
                <div className="text-gray-500">$0.00</div>
                <div className="font-medium">${(newSOVItem.scheduledValue || 0).toLocaleString()}</div>
                <div className="text-gray-500">$0.00</div>
                <div className="text-gray-500">$0.00</div>
                <div className="text-gray-500">0.0%</div>
                <div className="font-medium">${(newSOVItem.scheduledValue || 0).toLocaleString()}</div>
                <div className="flex gap-1">
                  <Button onClick={handleSaveNewItem} size="sm" className="h-8 text-xs" disabled={loading}>
                    <Save className="w-3 h-3 mr-1" />
                    {loading ? 'Saving...' : 'Save'}
                  </Button>
                  <Button onClick={() => setNewSOVItem(null)} variant="ghost" size="sm" className="h-8 text-xs">
                    <X className="w-3 h-3 mr-1" />
                    Cancel
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Totals Row */}
          <div className="grid grid-cols-9 gap-2 items-center text-sm font-bold border-t-2 pt-4 bg-gray-100 p-3 rounded">
            <div>TOTALS ({filteredItems.length} items)</div>
            <div className="font-mono">${totals.totalScheduledValue.toLocaleString()}</div>
            <div className="font-mono text-green-600">${totals.totalChangeOrders.toLocaleString()}</div>
            <div className="font-mono">${totals.totalContract.toLocaleString()}</div>
            <div className="font-mono text-blue-600">${totals.totalThisPeriod.toLocaleString()}</div>
            <div className="font-mono">${totals.totalCompleted.toLocaleString()}</div>
            <div>{totals.totalContract > 0 ? ((totals.totalCompleted / totals.totalContract) * 100).toFixed(1) : 0}%</div>
            <div className="font-mono">${(totals.totalContract - totals.totalCompleted).toLocaleString()}</div>
            <div></div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
