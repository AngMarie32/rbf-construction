
import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { mockBidItems, mockProjects } from '@/data/mockData';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Upload, Download, ArrowRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export default function BidPlanner() {
  const [selectedProject, setSelectedProject] = useState('1');
  const [bidItems, setBidItems] = useState(mockBidItems);

  const selectedProjectData = mockProjects.find(p => p.id === selectedProject);
  const projectBidItems = bidItems.filter(item => item.projectId === selectedProject);
  const totalBidValue = projectBidItems.reduce((sum, item) => sum + item.total, 0);

  const updateBidItem = (id: string, field: string, value: number) => {
    setBidItems(items => 
      items.map(item => {
        if (item.id === id) {
          const updated = { ...item, [field]: value };
          if (field === 'unitCost' || field === 'quantity') {
            updated.total = updated.unitCost * updated.quantity;
          }
          return updated;
        }
        return item;
      })
    );
  };

  const addNewBidItem = () => {
    const newItem = {
      id: `${bidItems.length + 1}`,
      projectId: selectedProject,
      category: '',
      description: '',
      unitCost: 0,
      quantity: 0,
      total: 0
    };
    setBidItems([...bidItems, newItem]);
  };

  return (
    <Layout 
      title="Bid Planner" 
      subtitle="Create and manage project bids with detailed cost breakdowns"
    >
      <div className="space-y-6">
        {/* Project Selection */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Project Selection</CardTitle>
              <div className="flex gap-2">
                <Button variant="outline" size="sm">
                  <Upload className="w-4 h-4 mr-2" />
                  Import
                </Button>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {mockProjects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedProjectData && (
                <div className="flex items-center gap-4">
                  <Badge variant="secondary">{selectedProjectData.type}</Badge>
                  <span className="text-sm text-gray-600">
                    Contract Value: ${selectedProjectData.contractValue.toLocaleString()}
                  </span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Bid Summary */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Total Bid Value</p>
                <p className="text-2xl font-bold text-primary mt-2">
                  ${totalBidValue.toLocaleString()}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Bid Items</p>
                <p className="text-2xl font-bold text-gray-900 mt-2">
                  {projectBidItems.length}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6">
              <div className="text-center">
                <p className="text-sm text-gray-600">Profit Margin</p>
                <p className="text-2xl font-bold text-green-600 mt-2">15%</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bid Items Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Bid Items</CardTitle>
              <div className="flex gap-2">
                <Button onClick={addNewBidItem} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
                <Button size="sm" className="bg-accent hover:bg-accent/90">
                  <ArrowRight className="w-4 h-4 mr-2" />
                  Push to SOV
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Unit Cost</TableHead>
                  <TableHead>Quantity</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead width={100}>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projectBidItems.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell>
                      <Input 
                        value={item.category}
                        onChange={(e) => updateBidItem(item.id, 'category', e.target.value)}
                        className="border-0 p-0 h-auto"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        value={item.description}
                        onChange={(e) => updateBidItem(item.id, 'description', e.target.value)}
                        className="border-0 p-0 h-auto"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number"
                        value={item.unitCost}
                        onChange={(e) => updateBidItem(item.id, 'unitCost', parseFloat(e.target.value) || 0)}
                        className="border-0 p-0 h-auto w-24"
                      />
                    </TableCell>
                    <TableCell>
                      <Input 
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateBidItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                        className="border-0 p-0 h-auto w-24"
                      />
                    </TableCell>
                    <TableCell className="font-medium">
                      ${item.total.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="sm" className="text-red-600">
                        Delete
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
