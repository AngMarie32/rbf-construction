
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Download, FileText, Save, Upload, PaperclipIcon, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface TabbedBidInterfaceProps {
  projectId: string;
  bidItems: any[];
  onItemsChange: (items: any[]) => void;
  onCreateNewBid: () => void;
  onExportReport: () => void;
}

export function TabbedBidInterface({ 
  projectId, 
  bidItems, 
  onItemsChange, 
  onCreateNewBid,
  onExportReport 
}: TabbedBidInterfaceProps) {
  const [activeTab, setActiveTab] = useState('overview');
  const [newItem, setNewItem] = useState({
    category: '',
    subcategory: '',
    description: '',
    unit: 'Each',
    unitCost: '',
    quantity: '1'
  });

  const calculateTotalValue = () => {
    return bidItems.reduce((sum, item) => sum + (item.unit_cost * item.quantity || 0), 0);
  };

  const getItemCount = () => {
    return bidItems.length;
  };

  const getCategoryCount = () => {
    return new Set(bidItems.map(item => item.category)).size;
  };

  const calculateDirectCosts = () => {
    const total = calculateTotalValue();
    return total * 0.75; // 75% of total
  };

  const calculateProfit = () => {
    const total = calculateTotalValue();
    return total * 0.15; // 15% profit
  };

  const calculateOverhead = () => {
    const total = calculateTotalValue();
    return total * 0.10; // 10% overhead
  };

  const handleAddItem = async () => {
    if (!newItem.category || !newItem.description || !newItem.unitCost) {
      toast.error('Please fill in required fields: Category, Description, and Unit Cost');
      return;
    }

    try {
      const itemData = {
        project_id: projectId,
        category: newItem.category,
        subcategory: newItem.subcategory || '',
        description: newItem.description,
        unit: newItem.unit,
        unit_cost: parseFloat(newItem.unitCost),
        quantity: parseFloat(newItem.quantity)
      };

      const { data, error } = await supabase
        .from('bid_items')
        .insert([itemData])
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

  const handleDeleteItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('bid_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      onItemsChange(bidItems.filter(item => item.id !== itemId));
      toast.success('Bid item deleted successfully');
    } catch (error) {
      console.error('Error deleting bid item:', error);
      toast.error('Failed to delete bid item');
    }
  };

  const handleDeleteAllBidItems = async () => {
    if (!confirm('Are you sure you want to delete all bid items? This action cannot be undone.')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('bid_items')
        .delete()
        .eq('project_id', projectId);

      if (error) throw error;

      onItemsChange([]);
      toast.success('All bid items deleted successfully');
    } catch (error) {
      console.error('Error deleting all bid items:', error);
      toast.error('Failed to delete all bid items');
    }
  };

  const handleUseTemplate = async () => {
    try {
      // Fetch available templates
      const { data: templates, error } = await supabase
        .from('bid_templates')
        .select('*')
        .order('name');

      if (error) throw error;

      if (templates.length === 0) {
        toast.error('No bid templates available');
        return;
      }

      // For now, use the first template or show a selection dialog
      const template = templates[0];
      
      // Fetch template items
      const { data: templateItems, error: itemsError } = await supabase
        .from('bid_template_items')
        .select('*')
        .eq('template_id', template.id);

      if (itemsError) throw itemsError;

      // Convert template items to bid items
      const newBidItems = templateItems.map(item => ({
        project_id: projectId,
        category: item.category,
        subcategory: item.subcategory,
        description: item.description,
        unit: item.unit,
        unit_cost: item.unit_cost || 0,
        quantity: 1
      }));

      if (newBidItems.length > 0) {
        const { data, error: insertError } = await supabase
          .from('bid_items')
          .insert(newBidItems)
          .select();

        if (insertError) throw insertError;

        onItemsChange([...bidItems, ...data]);
        toast.success(`Applied template "${template.name}" with ${data.length} items`);
      }
    } catch (error) {
      console.error('Error using template:', error);
      toast.error('Failed to apply template');
    }
  };

  const handleSaveAsTemplate = async () => {
    if (bidItems.length === 0) {
      toast.error('No bid items to save as template');
      return;
    }

    const templateName = prompt('Enter template name:');
    if (!templateName) return;

    try {
      // Create template
      const { data: template, error: templateError } = await supabase
        .from('bid_templates')
        .insert({
          name: templateName,
          description: `Template created from project bid items`
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Create template items
      const templateItems = bidItems.map(item => ({
        template_id: template.id,
        category: item.category,
        subcategory: item.subcategory,
        description: item.description,
        unit: item.unit,
        unit_cost: item.unit_cost
      }));

      const { error: itemsError } = await supabase
        .from('bid_template_items')
        .insert(templateItems);

      if (itemsError) throw itemsError;

      toast.success(`Template "${templateName}" saved successfully`);
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    }
  };

  const handleExportToSOV = async () => {
    try {
      // Convert bid items to SOV items
      const sovItems = bidItems.map((item, index) => ({
        project_id: projectId,
        item_number: String(index + 1).padStart(3, '0'),
        category: item.category,
        description: item.description,
        scheduled_value: item.unit_cost * item.quantity,
        previous_applications: 0,
        this_period: 0,
        materials_stored: 0,
        work_completed_from_previous: 0,
        materials_presently_stored: 0,
        total_completed_and_stored: 0,
        percent_complete: 0,
        retainage_percentage: 10
      }));

      const { error } = await supabase
        .from('sov_items')
        .insert(sovItems);

      if (error) throw error;

      toast.success(`Exported ${sovItems.length} items to Schedule of Values`);
    } catch (error) {
      console.error('Error exporting to SOV:', error);
      toast.error('Failed to export to SOV');
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
          {/* Bid Management Section */}
          <Card>
            <CardHeader>
              <CardTitle>Bid Management</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-3">
                <Button onClick={onCreateNewBid} className="bg-blue-600 hover:bg-blue-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Bid
                </Button>
                <Button variant="outline" onClick={handleUseTemplate}>
                  <FileText className="w-4 h-4 mr-2" />
                  Use Template
                </Button>
                <Button variant="outline" onClick={handleSaveAsTemplate}>
                  <Save className="w-4 h-4 mr-2" />
                  Save as Template
                </Button>
                <Button variant="outline" className="bg-blue-100 text-blue-700 border-blue-300" onClick={handleExportToSOV}>
                  <Upload className="w-4 h-4 mr-2" />
                  Export to SOV
                </Button>
                <Button variant="outline" className="bg-blue-100 text-blue-700 border-blue-300" onClick={onExportReport}>
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
              </div>
              
              <div className="mt-3 flex gap-3">
                <Button variant="ghost" className="text-gray-600">
                  <PaperclipIcon className="w-4 h-4 mr-2" />
                  Create Proposal
                </Button>
                {bidItems.length > 0 && (
                  <Button variant="ghost" className="text-red-600 hover:text-red-700" onClick={handleDeleteAllBidItems}>
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete All Items
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Project Information */}
          <Card>
            <CardHeader>
              <CardTitle>Project Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">Current Project</div>
              <div className="text-sm text-blue-600">Last updated: {new Date().toLocaleDateString()}</div>
            </CardContent>
          </Card>

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded">
                    <FileText className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Total Estimate</div>
                    <div className="text-2xl font-bold text-green-600">
                      ${calculateTotalValue().toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">Project bid total</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded">
                    <FileText className="w-5 h-5 text-gray-600" />
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Line Items</div>
                    <div className="text-2xl font-bold">{getItemCount()}</div>
                    <div className="text-xs text-gray-500">Across {getCategoryCount()} categories</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded">
                    <span className="text-lg">$</span>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Direct Costs</div>
                    <div className="text-2xl font-bold">
                      ${calculateDirectCosts().toLocaleString()}
                    </div>
                    <div className="text-xs text-gray-500">75% of total bid</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="p-6">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded">
                    <span className="text-lg">📈</span>
                  </div>
                  <div>
                    <div className="text-sm text-gray-600">Profit Margin</div>
                    <div className="text-2xl font-bold text-blue-600">15%</div>
                    <div className="text-xs text-gray-500">${calculateProfit().toLocaleString()} profit</div>
                  </div>
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
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Direct Costs</span>
                  <div className="flex items-center gap-4">
                    <span className="text-gray-600">75%</span>
                    <span className="font-bold">${calculateDirectCosts().toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Overhead</span>
                  <div className="flex items-center gap-4">
                    <span className="text-gray-600">10%</span>
                    <span className="font-bold">${calculateOverhead().toLocaleString()}</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="font-medium">Profit</span>
                  <div className="flex items-center gap-4">
                    <span className="text-gray-600">15%</span>
                    <span className="font-bold">${calculateProfit().toLocaleString()}</span>
                  </div>
                </div>
                <div className="border-t pt-4 flex justify-between items-center font-bold text-lg">
                  <span>Total Bid Amount</span>
                  <span className="text-green-600">${calculateTotalValue().toLocaleString()}</span>
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
                  <label className="text-sm font-medium text-gray-700">Category *</label>
                  <Input
                    value={newItem.category}
                    onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                    placeholder="Category"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Subcategory</label>
                  <Input
                    value={newItem.subcategory}
                    onChange={(e) => setNewItem({ ...newItem, subcategory: e.target.value })}
                    placeholder="Subcategory"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Description *</label>
                  <Input
                    value={newItem.description}
                    onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                    placeholder="Description"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Unit</label>
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
                      <SelectItem value="Ton">Ton</SelectItem>
                      <SelectItem value="Hour">Hour</SelectItem>
                      <SelectItem value="Day">Day</SelectItem>
                      <SelectItem value="Lot">Lot</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Unit Cost ($) *</label>
                  <Input
                    type="number"
                    value={newItem.unitCost}
                    onChange={(e) => setNewItem({ ...newItem, unitCost: e.target.value })}
                    placeholder="0.00"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Quantity</label>
                  <Input
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
              <Button variant="outline" size="sm" onClick={onExportReport}>
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
                <div className="space-y-4">
                  {bidItems.map((item, index) => (
                    <div key={item.id || index} className="border rounded-lg p-4">
                      <div className="grid grid-cols-6 gap-4 text-sm">
                        <div>
                          <div className="font-medium text-gray-600">Category</div>
                          <div>{item.category}</div>
                        </div>
                        <div>
                          <div className="font-medium text-gray-600">Subcategory</div>
                          <div>{item.subcategory || '-'}</div>
                        </div>
                        <div>
                          <div className="font-medium text-gray-600">Description</div>
                          <div>{item.description}</div>
                        </div>
                        <div>
                          <div className="font-medium text-gray-600">Unit</div>
                          <div>{item.unit}</div>
                        </div>
                        <div>
                          <div className="font-medium text-gray-600">Unit Cost</div>
                          <div>${item.unit_cost?.toFixed(2) || '0.00'}</div>
                        </div>
                        <div>
                          <div className="font-medium text-gray-600">Quantity</div>
                          <div>{item.quantity}</div>
                        </div>
                      </div>
                      <div className="mt-2 pt-2 border-t flex justify-between items-center">
                        <div className="text-sm text-gray-600">Total</div>
                        <div className="flex items-center gap-2">
                          <div className="font-bold">${((item.unit_cost || 0) * (item.quantity || 0)).toFixed(2)}</div>
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            onClick={() => handleDeleteItem(item.id)}
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                  
                  {/* Grand Total */}
                  <div className="border-t pt-4 mt-6">
                    <div className="flex justify-end">
                      <div className="text-right">
                        <div className="text-lg font-bold">
                          Grand Total: ${calculateTotalValue().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </div>
                        <div className="text-sm text-gray-600">
                          {bidItems.length} line item{bidItems.length !== 1 ? 's' : ''}
                        </div>
                      </div>
                    </div>
                  </div>
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
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Default Tax Rate (%)</label>
                  <input 
                    type="number" 
                    className="w-full mt-1 px-3 py-2 border rounded-md" 
                    placeholder="8.5" 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Default Markup (%)</label>
                  <input 
                    type="number" 
                    className="w-full mt-1 px-3 py-2 border rounded-md" 
                    placeholder="15" 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Contingency (%)</label>
                  <input 
                    type="number" 
                    className="w-full mt-1 px-3 py-2 border rounded-md" 
                    placeholder="5" 
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Bond Rate (%)</label>
                  <input 
                    type="number" 
                    className="w-full mt-1 px-3 py-2 border rounded-md" 
                    placeholder="1.5" 
                  />
                </div>
              </div>
              
              <div className="pt-4">
                <Button>Save Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
