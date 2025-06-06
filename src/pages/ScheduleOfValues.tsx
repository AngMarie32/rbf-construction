
import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { ProjectSelector } from '@/components/layout/ProjectSelector';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Edit, Trash2, Plus, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Project {
  id: string;
  name: string;
  client: string;
  status: string;
  contract_value: number;
  completion_percentage: number;
}

interface SOVItem {
  id: string;
  item_number: string;
  category: string;
  description: string;
  scheduled_value: number;
  previous_applications: number;
  this_period: number;
  total_completed_and_stored: number;
  percent_complete: number;
}

export default function ScheduleOfValues() {
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [sovItems, setSovItems] = useState<SOVItem[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedProject) {
      fetchSOVItems();
    }
  }, [selectedProject]);

  const fetchSOVItems = async () => {
    if (!selectedProject) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('sov_items')
        .select('*')
        .eq('project_id', selectedProject.id)
        .order('item_number');

      if (error) throw error;
      setSovItems(data || []);
    } catch (error) {
      console.error('Error fetching SOV items:', error);
      toast.error('Failed to load Schedule of Values items');
    } finally {
      setLoading(false);
    }
  };

  const deleteSOVItem = async (id: string) => {
    if (!confirm('Are you sure you want to delete this SOV item?')) return;

    try {
      const { error } = await supabase
        .from('sov_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('SOV item deleted successfully');
      fetchSOVItems();
    } catch (error) {
      console.error('Error deleting SOV item:', error);
      toast.error('Failed to delete SOV item');
    }
  };

  const handleProjectChange = async (projectId: string) => {
    setSelectedProjectId(projectId);
    if (projectId && projectId !== 'all-projects') {
      try {
        const { data, error } = await supabase
          .from('projects')
          .select('*')
          .eq('id', projectId)
          .single();

        if (error) throw error;
        setSelectedProject(data);
      } catch (error) {
        console.error('Error fetching project:', error);
        toast.error('Failed to load project details');
      }
    } else {
      setSelectedProject(null);
    }
  };

  if (selectedProject) {
    const totalScheduledValue = sovItems.reduce((sum, item) => sum + item.scheduled_value, 0);
    const totalCompleted = sovItems.reduce((sum, item) => sum + (item.total_completed_and_stored || 0), 0);
    const completionPercentage = totalScheduledValue > 0 ? (totalCompleted / totalScheduledValue) * 100 : 0;

    return (
      <Layout title={`Schedule of Values - ${selectedProject.name}`} subtitle={`Client: ${selectedProject.client}`}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setSelectedProject(null)}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Project Selection
            </Button>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add SOV Item
            </Button>
          </div>

          {/* Project Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">${totalScheduledValue.toLocaleString()}</div>
                <p className="text-sm text-gray-600">Total Scheduled Value</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">${totalCompleted.toLocaleString()}</div>
                <p className="text-sm text-gray-600">Total Completed</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">{completionPercentage.toFixed(1)}%</div>
                <p className="text-sm text-gray-600">Completion Percentage</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{sovItems.length}</div>
                <p className="text-sm text-gray-600">Total Items</p>
              </CardContent>
            </Card>
          </div>

          {/* SOV Items Table */}
          <Card>
            <CardHeader>
              <CardTitle>Schedule of Values Items</CardTitle>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : sovItems.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500 text-lg mb-4">No SOV items found for this project.</p>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add First SOV Item
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Item #</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Scheduled Value</TableHead>
                        <TableHead>Previous Applications</TableHead>
                        <TableHead>This Period</TableHead>
                        <TableHead>Total Completed</TableHead>
                        <TableHead>% Complete</TableHead>
                        <TableHead className="w-[150px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sovItems.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.item_number}</TableCell>
                          <TableCell>{item.category}</TableCell>
                          <TableCell>{item.description}</TableCell>
                          <TableCell>${item.scheduled_value.toLocaleString()}</TableCell>
                          <TableCell>${item.previous_applications.toLocaleString()}</TableCell>
                          <TableCell>${item.this_period.toLocaleString()}</TableCell>
                          <TableCell>${(item.total_completed_and_stored || 0).toLocaleString()}</TableCell>
                          <TableCell>{item.percent_complete.toFixed(1)}%</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button variant="ghost" size="sm">
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button variant="ghost" size="sm">
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteSOVItem(item.id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
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
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Schedule of Values" subtitle="Select a project to view its schedule of values">
      <div className="space-y-6">
        <Card className="max-w-2xl mx-auto">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Schedule of Values</CardTitle>
            <p className="text-gray-600">Select a project to manage its schedule of values items</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <ProjectSelector
              selectedProjectId={selectedProjectId}
              onProjectChange={handleProjectChange}
              placeholder="Choose a project to continue..."
              className="w-full"
            />
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
