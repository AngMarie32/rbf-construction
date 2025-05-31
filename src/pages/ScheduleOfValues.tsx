
import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Download, Calculator } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SOVItem {
  id: string;
  project_id: string;
  item_number: string;
  category: string;
  description: string;
  scheduled_value: number;
  previous_applications: number | null;
  this_period: number | null;
  materials_stored: number | null;
  total_completed_and_stored: number | null;
  percent_complete: number | null;
}

interface Project {
  id: string;
  name: string;
}

export default function ScheduleOfValues() {
  const [sovItems, setSovItems] = useState<SOVItem[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

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
      if (data && data.length > 0) {
        setSelectedProject(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    }
  };

  const fetchSOVItems = async () => {
    if (!selectedProject) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sov_items')
        .select('*')
        .eq('project_id', selectedProject)
        .order('item_number');

      if (error) throw error;
      setSovItems(data || []);
    } catch (error) {
      console.error('Error fetching SOV items:', error);
      toast.error('Failed to load schedule of values');
    } finally {
      setLoading(false);
    }
  };

  const filteredItems = sovItems.filter(item =>
    item.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
    item.item_number.includes(searchQuery)
  );

  const calculateTotals = () => {
    return filteredItems.reduce((totals, item) => ({
      scheduledValue: totals.scheduledValue + item.scheduled_value,
      previousApplications: totals.previousApplications + (item.previous_applications || 0),
      thisPeriod: totals.thisPeriod + (item.this_period || 0),
      materialsStored: totals.materialsStored + (item.materials_stored || 0),
      totalCompleted: totals.totalCompleted + (item.total_completed_and_stored || 0)
    }), {
      scheduledValue: 0,
      previousApplications: 0,
      thisPeriod: 0,
      materialsStored: 0,
      totalCompleted: 0
    });
  };

  const totals = calculateTotals();

  return (
    <Layout 
      title="Schedule of Values" 
      subtitle="Track work progress and payment applications"
    >
      <div className="space-y-6">
        {/* Project Selection and Actions */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-64">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Item
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Contract</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totals.scheduledValue.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Previous Apps</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totals.previousApplications.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">This Period</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totals.thisPeriod.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Materials Stored</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totals.materialsStored.toLocaleString()}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">Total Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totals.totalCompleted.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        {/* SOV Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calculator className="w-5 h-5 mr-2" />
              Schedule of Values
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Item #</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Scheduled Value</TableHead>
                      <TableHead className="text-right">Previous Apps</TableHead>
                      <TableHead className="text-right">This Period</TableHead>
                      <TableHead className="text-right">Materials Stored</TableHead>
                      <TableHead className="text-right">Total Complete</TableHead>
                      <TableHead className="text-right">% Complete</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredItems.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">{item.item_number}</TableCell>
                        <TableCell>{item.description}</TableCell>
                        <TableCell>{item.category}</TableCell>
                        <TableCell className="text-right">${item.scheduled_value.toLocaleString()}</TableCell>
                        <TableCell className="text-right">${(item.previous_applications || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right">${(item.this_period || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right">${(item.materials_stored || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right">${(item.total_completed_and_stored || 0).toLocaleString()}</TableCell>
                        <TableCell className="text-right">{(item.percent_complete || 0).toFixed(1)}%</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {filteredItems.length === 0 && (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No schedule of values items found for this project.</p>
                    <Button className="mt-4">
                      <Plus className="w-4 h-4 mr-2" />
                      Add First Item
                    </Button>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
