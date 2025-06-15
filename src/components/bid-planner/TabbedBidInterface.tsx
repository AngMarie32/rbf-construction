
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Download } from 'lucide-react';
import { BidItemForm } from './BidItemForm';

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

  const calculateTotalValue = () => {
    return bidItems.reduce((sum, item) => sum + (item.total || 0), 0);
  };

  const getItemCount = () => {
    return bidItems.length;
  };

  const getCategoryCount = () => {
    return new Set(bidItems.map(item => item.category)).size;
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
              <CardTitle>Bid Overview</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-blue-700">
                    ${calculateTotalValue().toLocaleString()}
                  </div>
                  <div className="text-sm text-blue-600">Total Bid Value</div>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-green-700">{getItemCount()}</div>
                  <div className="text-sm text-green-600">Line Items</div>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-orange-700">{getCategoryCount()}</div>
                  <div className="text-sm text-orange-600">Categories</div>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="flex gap-4">
                <Button onClick={onCreateNewBid}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Bid Item
                </Button>
                <Button variant="outline" onClick={onExportReport}>
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>

              {/* Recent Items Preview */}
              {bidItems.length > 0 && (
                <div>
                  <h3 className="text-lg font-medium mb-3">Recent Items</h3>
                  <div className="space-y-2">
                    {bidItems.slice(0, 5).map((item) => (
                      <div key={item.id} className="flex justify-between items-center p-3 border rounded-lg">
                        <div>
                          <div className="font-medium">{item.description}</div>
                          <div className="text-sm text-gray-600">
                            {item.category} • Qty: {item.quantity} {item.unit}
                          </div>
                        </div>
                        <div className="text-lg font-bold">
                          ${(item.total || 0).toLocaleString()}
                        </div>
                      </div>
                    ))}
                    {bidItems.length > 5 && (
                      <div className="text-center text-sm text-gray-500 py-2">
                        And {bidItems.length - 5} more items...
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="lineitems" className="space-y-6">
          <BidItemForm items={bidItems} onItemsChange={onItemsChange} />
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
