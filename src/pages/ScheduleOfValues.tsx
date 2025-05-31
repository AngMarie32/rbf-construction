
import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Calculator, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SOVItem {
  id: string;
  itemNumber: string;
  category: string;
  description: string;
  scheduledValue: number;
  previousApplications: number;
  thisPeriod: number;
  materialsStored: number;
  totalCompletedAndStored: number;
  percentComplete: number;
}

interface Project {
  id: string;
  name: string;
}

export default function ScheduleOfValues() {
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [sovItems, setSovItems] = useState<SOVItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [newItem, setNewItem] = useState({
    itemNumber: '',
    category: '',
    description: '',
    scheduledValue: ''
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchSOVItems();
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

  const fetchSOVItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sov_items')
        .select('*')
        .eq('project_id', selectedProject)
        .order('item_number');

      if (error) throw error;

      const mappedItems = (data || []).map(item => ({
        id: item.id,
        itemNumber: item.item_number,
        category: item.category,
        description: item.description,
        scheduledValue: item.scheduled_value,
        previousApplications: item.previous_applications || 0,
        thisPeriod: item.this_period || 0,
        materialsStored: item.materials_stored || 0,
        totalCompletedAndStored: item.total_completed_and_stored || 0,
        percentComplete: item.percent_complete || 0
      }));

      setSovItems(mappedItems);
    } catch (error) {
      console.error('Error fetching SOV items:', error);
      toast.error('Failed to load SOV items');
    } finally {
      setLoading(false);
    }
  };

  const addSOVItem = async () => {
    if (!selectedProject || !newItem.itemNumber || !newItem.description || !newItem.scheduledValue) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('sov_items')
        .insert({
          project_id: selectedProject,
          item_number: newItem.itemNumber,
          category: newItem.category,
          description: newItem.description,
          scheduled_value: parseFloat(newItem.scheduledValue),
          previous_applications: 0,
          this_period: 0,
          materials_stored: 0,
          total_completed_and_stored: 0,
          percent_complete: 0
        });

      if (error) throw error;

      toast.success('SOV item added successfully');
      setNewItem({ itemNumber: '', category: '', description: '', scheduledValue: '' });
      fetchSOVItems();
    } catch (error) {
      console.error('Error adding SOV item:', error);
      toast.error('Failed to add SOV item');
    }
  };

  const updateSOVItem = async (id: string, field: string, value: number) => {
    try {
      const updateData: any = { [field]: value };
      
      // Recalculate totals when updating this period or materials stored
      if (field === 'this_period' || field === 'materials_stored') {
        const item = sovItems.find(i => i.id === id);
        if (item) {
          const thisPeriod = field === 'this_period' ? value : item.thisPeriod;
          const materialsStored = field === 'materials_stored' ? value : item.materialsStored;
          const totalCompletedAndStored = item.previousApplications + thisPeriod + materialsStored;
          const percentComplete = item.scheduledValue > 0 ? (totalCompletedAndStored / item.scheduledValue) * 100 : 0;
          
          updateData.total_completed_and_stored = totalCompletedAndStored;
          updateData.percent_complete = Math.min(percentComplete, 100);
        }
      }

      const { error } = await supabase
        .from('sov_items')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      fetchSOVItems();
    } catch (error) {
      console.error('Error updating SOV item:', error);
      toast.error('Failed to update SOV item');
    }
  };

  const totalScheduledValue = sovItems.reduce((sum, item) => sum + item.scheduledValue, 0);
  const totalCompletedValue = sovItems.reduce((sum, item) => sum + item.totalCompletedAndStored, 0);
  const overallPercentComplete = totalScheduledValue > 0 ? (totalCompletedValue / totalScheduledValue) * 100 : 0;

  return (
    <Layout title="Schedule of Values" subtitle="Track project progress and payment applications">
      <div className="space-y-6">
        {/* Project Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Project</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a project..." />
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
            {/* Add New SOV Item */}
            <Card>
              <CardHeader>
                <CardTitle>Add SOV Item</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                  <div>
                    <Label htmlFor="itemNumber">Item #</Label>
                    <Input
                      id="itemNumber"
                      value={newItem.itemNumber}
                      onChange={(e) => setNewItem({ ...newItem, itemNumber: e.target.value })}
                      placeholder="001"
                    />
                  </div>
                  <div>
                    <Label htmlFor="category">Category</Label>
                    <Input
                      id="category"
                      value={newItem.category}
                      onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                      placeholder="General Conditions"
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
                    <Label htmlFor="scheduledValue">Scheduled Value ($)</Label>
                    <Input
                      id="scheduledValue"
                      type="number"
                      step="0.01"
                      value={newItem.scheduledValue}
                      onChange={(e) => setNewItem({ ...newItem, scheduledValue: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={addSOVItem} className="w-full">
                      <Plus className="w-4 h-4 mr-2" />
                      Add Item
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Calculator className="w-5 h-5 mr-2" />
                    Total Contract Value
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-blue-600">
                    ${totalScheduledValue.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Work Completed</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-green-600">
                    ${totalCompletedValue.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Overall Progress</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-3xl font-bold text-orange-600">
                    {overallPercentComplete.toFixed(1)}%
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* SOV Table */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Schedule of Values</CardTitle>
                <Button variant="outline">
                  <FileText className="w-4 h-4 mr-2" />
                  Generate Application
                </Button>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading SOV items...</div>
                ) : sovItems.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No SOV items found. Add your first item above.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Item #</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Scheduled Value</TableHead>
                          <TableHead>Previous Apps</TableHead>
                          <TableHead>This Period</TableHead>
                          <TableHead>Materials Stored</TableHead>
                          <TableHead>Total Complete</TableHead>
                          <TableHead>% Complete</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {sovItems.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell className="font-medium">{item.itemNumber}</TableCell>
                            <TableCell>
                              <div>
                                <div className="font-medium">{item.description}</div>
                                <div className="text-sm text-gray-500">{item.category}</div>
                              </div>
                            </TableCell>
                            <TableCell>${item.scheduledValue.toLocaleString()}</TableCell>
                            <TableCell>${item.previousApplications.toLocaleString()}</TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                value={item.thisPeriod}
                                onChange={(e) => updateSOVItem(item.id, 'this_period', parseFloat(e.target.value) || 0)}
                                className="w-24"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                step="0.01"
                                value={item.materialsStored}
                                onChange={(e) => updateSOVItem(item.id, 'materials_stored', parseFloat(e.target.value) || 0)}
                                className="w-24"
                              />
                            </TableCell>
                            <TableCell className="font-medium">
                              ${item.totalCompletedAndStored.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <div className="w-16 bg-gray-200 rounded-full h-2">
                                  <div
                                    className="bg-green-600 h-2 rounded-full"
                                    style={{ width: `${Math.min(item.percentComplete, 100)}%` }}
                                  ></div>
                                </div>
                                <span className="text-sm font-medium">
                                  {item.percentComplete.toFixed(1)}%
                                </span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
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
