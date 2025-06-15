
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Download, FileText, Save, Upload, PaperclipIcon } from 'lucide-react';
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
                <Button variant="outline">
                  <FileText className="w-4 h-4 mr-2" />
                  Use Template
                </Button>
                <Button variant="outline">
                  <Save className="w-4 h-4 mr-2" />
                  Save as Template
                </Button>
                <Button variant="outline" className="bg-blue-100 text-blue-700 border-blue-300">
                  <Upload className="w-4 h-4 mr-2" />
                  Export to SOV
                </Button>
                <Button variant="outline" className="bg-blue-100 text-blue-700 border-blue-300" onClick={onExportReport}>
                  <Download className="w-4 h-4 mr-2" />
                  Export PDF
                </Button>
              </div>
              
              <div className="mt-3">
                <Button variant="ghost" className="text-gray-600">
                  <PaperclipIcon className="w-4 h-4 mr-2" />
                  Create Proposal
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Project Information */}
          <Card>
            <CardHeader>
              <CardTitle>Project Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-lg font-semibold">Baldwin</div>
              <div className="text-sm text-blue-600">Last updated: 6/15/2025</div>
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
