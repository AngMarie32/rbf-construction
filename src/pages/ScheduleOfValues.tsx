
import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, FileText, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function ScheduleOfValues() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [sovItems, setSovItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchSOVItems();
    } else {
      setSovItems([]);
    }
  }, [selectedProject]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, status')
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const fetchSOVItems = async () => {
    try {
      const { data, error } = await supabase
        .from('sov_items')
        .select('*')
        .eq('project_id', selectedProject)
        .order('item_number');

      if (error) throw error;
      setSovItems(data || []);
    } catch (error) {
      console.error('Error fetching SOV items:', error);
      toast.error('Failed to load SOV items');
    }
  };

  const filteredItems = sovItems.filter(item =>
    item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.item_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalScheduledValue = sovItems.reduce((sum, item) => sum + (item.scheduled_value || 0), 0);
  const totalCompleted = sovItems.reduce((sum, item) => sum + (item.total_completed_and_stored || 0), 0);

  if (loading) {
    return (
      <Layout title="Schedule of Values" subtitle="Manage project schedule of values">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Schedule of Values" subtitle="Manage project schedule of values">
      <div className="space-y-6">
        {/* Project Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Project</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Choose a project to view SOV" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name} ({project.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedProject && (
          <>
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Contract Value</CardTitle>
                  <DollarSign className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    ${totalScheduledValue.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {sovItems.length} line items
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Work Completed</CardTitle>
                  <DollarSign className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    ${totalCompleted.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {totalScheduledValue ? Math.round((totalCompleted / totalScheduledValue) * 100) : 0}% complete
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Remaining Work</CardTitle>
                  <DollarSign className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    ${(totalScheduledValue - totalCompleted).toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Balance to finish
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search SOV items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="flex gap-2">
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add SOV Item
                </Button>
                <Button variant="outline">
                  <FileText className="w-4 h-4 mr-2" />
                  Export SOV
                </Button>
              </div>
            </div>

            {/* SOV Items Table */}
            <Card>
              <CardHeader>
                <CardTitle>Schedule of Values Items</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredItems.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2">Item #</th>
                          <th className="text-left py-2">Description</th>
                          <th className="text-left py-2">Category</th>
                          <th className="text-right py-2">Scheduled Value</th>
                          <th className="text-right py-2">% Complete</th>
                          <th className="text-right py-2">Completed Value</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredItems.map((item) => (
                          <tr key={item.id} className="border-b hover:bg-gray-50">
                            <td className="py-3 font-medium">{item.item_number}</td>
                            <td className="py-3">{item.description}</td>
                            <td className="py-3">
                              <Badge variant="outline">{item.category}</Badge>
                            </td>
                            <td className="py-3 text-right font-medium">
                              ${item.scheduled_value.toLocaleString()}
                            </td>
                            <td className="py-3 text-right">
                              {item.percent_complete || 0}%
                            </td>
                            <td className="py-3 text-right font-medium">
                              ${(item.total_completed_and_stored || 0).toLocaleString()}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : sovItems.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-lg">No SOV items found for this project.</p>
                    <p className="text-gray-400 mt-2">Add items to get started with schedule of values.</p>
                    <Button className="mt-4">
                      <Plus className="w-4 h-4 mr-2" />
                      Add First SOV Item
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No items match your search criteria.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {!selectedProject && (
          <Card>
            <CardContent className="text-center py-16">
              <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Schedule of Values</h3>
              <p className="text-gray-500 mb-6">
                Select a project above to view and manage its schedule of values.
              </p>
              {projects.length === 0 && (
                <div className="mt-4">
                  <p className="text-gray-400 mb-4">No projects found. Create a project first.</p>
                  <Button onClick={() => navigate('/projects')}>
                    Go to Projects
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
