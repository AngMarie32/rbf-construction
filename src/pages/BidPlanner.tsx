
import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, Calculator, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BidItem {
  id: string;
  category: string;
  description: string;
  unitCost: number;
  quantity: number;
  total: number;
}

interface Project {
  id: string;
  name: string;
}

export default function BidPlanner() {
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [bidItems, setBidItems] = useState<BidItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [newItem, setNewItem] = useState({
    category: '',
    description: '',
    unitCost: '',
    quantity: '1'
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchBidItems();
    }
  }, [selectedProject]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    }
  };

  const fetchBidItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bid_items')
        .select('*')
        .eq('project_id', selectedProject)
        .order('category', { ascending: true });

      if (error) throw error;

      const mappedItems = (data || []).map(item => ({
        id: item.id,
        category: item.category,
        description: item.description,
        unitCost: item.unit_cost,
        quantity: item.quantity,
        total: item.total || (item.unit_cost * item.quantity)
      }));

      setBidItems(mappedItems);
    } catch (error) {
      console.error('Error fetching bid items:', error);
      toast.error('Failed to load bid items');
    } finally {
      setLoading(false);
    }
  };

  const addBidItem = async () => {
    if (!selectedProject || !newItem.category || !newItem.description || !newItem.unitCost) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const unitCost = parseFloat(newItem.unitCost);
      const quantity = parseInt(newItem.quantity);
      const total = unitCost * quantity;

      const { error } = await supabase
        .from('bid_items')
        .insert({
          project_id: selectedProject,
          category: newItem.category,
          description: newItem.description,
          unit_cost: unitCost,
          quantity: quantity,
          total: total
        });

      if (error) throw error;

      toast.success('Bid item added successfully');
      setNewItem({ category: '', description: '', unitCost: '', quantity: '1' });
      fetchBidItems();
    } catch (error) {
      console.error('Error adding bid item:', error);
      toast.error('Failed to add bid item');
    }
  };

  const deleteBidItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('bid_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Bid item deleted');
      fetchBidItems();
    } catch (error) {
      console.error('Error deleting bid item:', error);
      toast.error('Failed to delete bid item');
    }
  };

  const totalEstimate = bidItems.reduce((sum, item) => sum + item.total, 0);
  const categorizedItems = bidItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, BidItem[]>);

  return (
    <Layout title="Bid Planner" subtitle="Plan and estimate project costs">
      <div className="space-y-6">
        {/* Project Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Project</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a project to plan bid for..." />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedProject && (
          <>
            {/* Add New Item */}
            <Card>
              <CardHeader>
                <CardTitle>Add Bid Item</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      value={newItem.category}
                      onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                      placeholder="e.g. Labor, Materials"
                    />
                  </div>
                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Input
                      id="description"
                      value={newItem.description}
                      onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                      placeholder="Item description"
                    />
                  </div>
                  <div>
                    <Label htmlFor="unitCost">Unit Cost ($)</Label>
                    <Input
                      id="unitCost"
                      type="number"
                      step="0.01"
                      value={newItem.unitCost}
                      onChange={(e) => setNewItem({ ...newItem, unitCost: e.target.value })}
                      placeholder="0.00"
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
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={addBidItem} className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Item
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Bid Summary */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calculator className="w-5 h-5 mr-2" />
                    Total Estimate
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    ${totalEstimate.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Total Items</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{bidItems.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Categories</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold">{Object.keys(categorizedItems).length}</div>
                </CardContent>
              </Card>
            </div>

            {/* Bid Items Table */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Bid Items</CardTitle>
                <Button variant="outline">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading bid items...</div>
                ) : bidItems.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No bid items found. Add your first item above.
                  </div>
                ) : (
                  <div className="space-y-6">
                    {Object.entries(categorizedItems).map(([category, items]) => (
                      <div key={category}>
                        <div className="flex items-center mb-3">
                          <Badge variant="secondary" className="mr-2">
                            {category}
                          </Badge>
                          <span className="text-sm text-gray-500">
                            ${items.reduce((sum, item) => sum + item.total, 0).toLocaleString()}
                          </span>
                        </div>
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Description</TableHead>
                              <TableHead>Unit Cost</TableHead>
                              <TableHead>Quantity</TableHead>
                              <TableHead>Total</TableHead>
                              <TableHead className="w-20">Actions</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {items.map((item) => (
                              <TableRow key={item.id}>
                                <TableCell>{item.description}</TableCell>
                                <TableCell>${item.unitCost.toLocaleString()}</TableCell>
                                <TableCell>{item.quantity}</TableCell>
                                <TableCell className="font-medium">
                                  ${item.total.toLocaleString()}
                                </TableCell>
                                <TableCell>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => deleteBidItem(item.id)}
                                    className="text-red-600 hover:text-red-800"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
}
