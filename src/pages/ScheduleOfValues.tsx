
import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Plus, 
  Edit, 
  Trash2, 
  Download,
  FileText,
  Calculator,
  Building
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CreateSOVDialog } from '@/components/schedule/CreateSOVDialog';
import { EditSOVItemDialog } from '@/components/schedule/EditSOVItemDialog';
import { SOVReportDialog } from '@/components/schedule/SOVReportDialog';

export default function ScheduleOfValues() {
  const [sovItems, setSovItems] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [selectedSOVItem, setSelectedSOVItem] = useState<any>(null);

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
        .select('id, name, client')
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
        .order('item_number', { ascending: true });

      if (error) throw error;
      setSovItems(data || []);
    } catch (error) {
      console.error('Error fetching SOV items:', error);
      toast.error('Failed to load SOV items');
    }
  };

  const handleDeleteSOVItem = async (itemId: string) => {
    try {
      const { error } = await supabase
        .from('sov_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      toast.success('SOV item deleted successfully');
      fetchSOVItems();
    } catch (error) {
      console.error('Error deleting SOV item:', error);
      toast.error('Failed to delete SOV item');
    }
  };

  const handleEditSOVItem = (item: any) => {
    setSelectedSOVItem(item);
    setEditDialogOpen(true);
  };

  const filteredItems = sovItems.filter(item =>
    item.item_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalScheduledValue = sovItems.reduce((sum, item) => sum + (item.scheduled_value || 0), 0);
  const totalWorkCompleted = sovItems.reduce((sum, item) => sum + (item.work_completed_to_date || 0), 0);
  const totalMaterialsStored = sovItems.reduce((sum, item) => sum + (item.materials_stored || 0), 0);
  const totalPercentComplete = sovItems.reduce((sum, item) => sum + (item.percent_complete || 0), 0) / sovItems.length || 0;

  if (loading) {
    return (
      <Layout title="Schedule of Values" subtitle="Manage project schedule of values and track completion">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Schedule of Values" subtitle="Manage project schedule of values and track completion">
      <Card className="border-2 border-dashed border-primary/20 bg-primary/5">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building className="w-5 h-5 text-primary" />
            Project Selection
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="project" className="block text-sm font-medium text-gray-700">
                Select Project
              </label>
              <select
                id="project"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm rounded-md"
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
              >
                <option value="">Choose a project</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name} - {project.client}
                  </option>
                ))}
              </select>
            </div>
            {selectedProject && (
              <div className="flex items-center justify-end gap-4">
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Total Scheduled Value:</span> ${totalScheduledValue.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Total Work Completed:</span> ${totalWorkCompleted.toLocaleString()}
                </div>
                <div className="text-sm text-gray-600">
                  <span className="font-medium">Total Materials Stored:</span> ${totalMaterialsStored.toLocaleString()}
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {selectedProject && (
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Schedule of Values Items
              </CardTitle>
              <div className="flex gap-2">
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add SOV Item
                </Button>
                <Button variant="outline" onClick={() => setReportDialogOpen(true)} disabled={sovItems.length === 0}>
                  <Download className="w-4 h-4 mr-2" />
                  Generate Report
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search SOV items..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              {filteredItems.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse border border-gray-200">
                    <thead>
                      <tr className="bg-gray-50">
                        <th className="border border-gray-200 px-4 py-2 text-left">#</th>
                        <th className="border border-gray-200 px-4 py-2 text-left">Description</th>
                        <th className="border border-gray-200 px-4 py-2 text-left">Category</th>
                        <th className="border border-gray-200 px-4 py-2 text-right">Scheduled Value</th>
                        <th className="border border-gray-200 px-4 py-2 text-right">Work Completed</th>
                        <th className="border border-gray-200 px-4 py-2 text-right">Materials Stored</th>
                        <th className="border border-gray-200 px-4 py-2 text-right">% Complete</th>
                        <th className="border border-gray-200 px-4 py-2 text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredItems.map((item) => (
                        <tr key={item.id} className="hover:bg-gray-50">
                          <td className="border border-gray-200 px-4 py-2">{item.item_number}</td>
                          <td className="border border-gray-200 px-4 py-2">{item.description}</td>
                          <td className="border border-gray-200 px-4 py-2">
                            <Badge variant="outline">{item.category}</Badge>
                          </td>
                          <td className="border border-gray-200 px-4 py-2 text-right font-medium">
                            ${(item.scheduled_value || 0).toLocaleString()}
                          </td>
                          <td className="border border-gray-200 px-4 py-2 text-right">
                            ${(item.work_completed_to_date || 0).toLocaleString()}
                          </td>
                          <td className="border border-gray-200 px-4 py-2 text-right">
                            ${(item.materials_stored || 0).toLocaleString()}
                          </td>
                          <td className="border border-gray-200 px-4 py-2 text-right">
                            {((item.percent_complete || 0) * 100).toFixed(1)}%
                          </td>
                          <td className="border border-gray-200 px-4 py-2">
                            <div className="flex justify-center gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleEditSOVItem(item)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleDeleteSOVItem(item.id)}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Building className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No SOV Items Found</h3>
                  <p className="text-gray-500 mb-6">
                    {searchTerm ? 'No items match your search criteria.' : 'Get started by creating your first schedule of values item.'}
                  </p>
                  {!searchTerm && (
                    <Button onClick={() => setCreateDialogOpen(true)}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create First SOV Item
                    </Button>
                  )}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      <CreateSOVDialog
        open={createDialogOpen}
        onOpenChange={setCreateDialogOpen}
        projectId={selectedProject}
        onSave={fetchSOVItems}
      />

      <EditSOVItemDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        sovItem={selectedSOVItem}
        onSave={fetchSOVItems}
      />

      <SOVReportDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        sovItems={sovItems}
      />
    </Layout>
  );
}
