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
  Building,
  HelpCircle,
  Target,
  List
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
  const [selectedProjectData, setSelectedProjectData] = useState<any>(null);
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
      fetchSelectedProjectData();
    } else {
      setSovItems([]);
      setSelectedProjectData(null);
    }
  }, [selectedProject]);

  // Listen for payment application changes to update SOV data
  useEffect(() => {
    if (selectedProject) {
      const channel = supabase
        .channel('payment-application-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'payment_applications_g702',
            filter: `project_id=eq.${selectedProject}`
          },
          () => {
            console.log('Payment application changed, refreshing SOV items');
            fetchSOVItems();
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'sov_items',
            filter: `project_id=eq.${selectedProject}`
          },
          () => {
            console.log('SOV items changed, refreshing data');
            fetchSOVItems();
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
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

  const fetchSelectedProjectData = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', selectedProject)
        .single();

      if (error) throw error;
      setSelectedProjectData(data);
    } catch (error) {
      console.error('Error fetching project data:', error);
      toast.error('Failed to load project data');
    }
  };

  const fetchSOVItems = async () => {
    try {
      const { data, error } = await supabase
        .from('sov_items')
        .select(`
          id,
          project_id,
          item_number,
          category,
          subcategory,
          description,
          scheduled_value,
          change_orders,
          previous_applications,
          this_period,
          materials_stored,
          total_completed_and_stored,
          percent_complete,
          retainage_percentage,
          work_completed_from_previous,
          materials_presently_stored,
          created_at,
          updated_at
        `)
        .eq('project_id', selectedProject)
        .order('item_number', { ascending: true });

      if (error) throw error;
      
      // Ensure all numeric fields are properly converted and include subcategory
      const processedItems = (data || []).map(item => ({
        ...item,
        scheduled_value: Number(item.scheduled_value) || 0,
        change_orders: Number(item.change_orders) || 0,
        previous_applications: Number(item.previous_applications) || 0,
        this_period: Number(item.this_period) || 0,
        materials_stored: Number(item.materials_stored) || 0,
        total_completed_and_stored: Number(item.total_completed_and_stored) || 0,
        percent_complete: Number(item.percent_complete) || 0,
        retainage_percentage: Number(item.retainage_percentage) || 0,
        subcategory: item.subcategory || null // Ensure subcategory is included
      }));
      
      setSovItems(processedItems);
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
    item.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.subcategory?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalScheduledValue = sovItems.reduce((sum, item) => sum + (Number(item.scheduled_value) || 0), 0);
  const totalWorkCompleted = sovItems.reduce((sum, item) => sum + (Number(item.work_completed_to_date) || 0), 0);
  const totalMaterialsStored = sovItems.reduce((sum, item) => sum + (Number(item.materials_stored) || 0), 0);
  const totalPercentComplete = sovItems.length > 0 ? sovItems.reduce((sum, item) => sum + (Number(item.percent_complete) || 0), 0) / sovItems.length : 0;

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
      <div className="space-y-8">
        {/* Project Selection */}
        <Card className="bg-white border-2 border-dashed border-primary/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Project Selection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-center">
              <select
                className="flex-1 max-w-md bg-background border border-input px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 rounded-md"
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
              >
                <option value="">Choose a project for SOV management</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name} - {project.client}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        {selectedProject ? (
          <Card className="bg-white">
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

                {/* Summary Cards */}
                {selectedProject && (
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-white p-4 rounded-lg border-2 border-blue-200">
                      <div className="text-sm font-medium text-blue-800">Total Scheduled Value</div>
                      <div className="text-2xl font-bold text-blue-900">${totalScheduledValue.toLocaleString()}</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border-2 border-green-200">
                      <div className="text-sm font-medium text-green-800">Total Work Completed</div>
                      <div className="text-2xl font-bold text-green-900">${totalWorkCompleted.toLocaleString()}</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border-2 border-yellow-200">
                      <div className="text-sm font-medium text-yellow-800">Total Materials Stored</div>
                      <div className="text-2xl font-bold text-yellow-900">${totalMaterialsStored.toLocaleString()}</div>
                    </div>
                    <div className="bg-white p-4 rounded-lg border-2 border-purple-200">
                      <div className="text-sm font-medium text-purple-800">Average % Complete</div>
                      <div className="text-2xl font-bold text-purple-900">{totalPercentComplete.toFixed(1)}%</div>
                    </div>
                  </div>
                )}

                {/* SOV Items Table */}
                {filteredItems.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse border border-gray-200">
                      <thead>
                        <tr className="bg-gray-50">
                          <th className="border border-gray-200 px-4 py-2 text-left">#</th>
                          <th className="border border-gray-200 px-4 py-2 text-left">Description</th>
                          <th className="border border-gray-200 px-4 py-2 text-left">Category</th>
                          <th className="border border-gray-200 px-4 py-2 text-left">Subcategory</th>
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
                            <td className="border border-gray-200 px-4 py-2">
                              {item.subcategory ? (
                                <Badge variant="secondary" className="text-xs">
                                  {item.subcategory}
                                </Badge>
                              ) : (
                                <span className="text-gray-400 text-xs">-</span>
                              )}
                            </td>
                            <td className="border border-gray-200 px-4 py-2 text-right font-medium">
                              ${(Number(item.scheduled_value) || 0).toLocaleString()}
                            </td>
                            <td className="border border-gray-200 px-4 py-2 text-right">
                              ${(Number(item.work_completed_to_date) || 0).toLocaleString()}
                            </td>
                            <td className="border border-gray-200 px-4 py-2 text-right">
                              ${(Number(item.materials_stored) || 0).toLocaleString()}
                            </td>
                            <td className="border border-gray-200 px-4 py-2 text-right">
                              {((Number(item.percent_complete) || 0) * 100).toFixed(1)}%
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
        ) : (
          <Card className="bg-white border-2 border-dashed border-gray-200">
            <CardContent className="text-center py-16">
              <List className="w-20 h-20 text-gray-300 mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Schedule of Values Management</h3>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">
                Select a project above to start managing schedule of values and track project completion progress.
              </p>
              {projects.length === 0 && (
                <div className="mt-6">
                  <p className="text-gray-400 mb-4">No projects found. Create a project first to start SOV management.</p>
                  <Button onClick={() => window.location.href = '/projects'} variant="outline">
                    <Building className="w-4 h-4 mr-2" />
                    Go to Projects
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick Start Guide */}
        <Card className="bg-white border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <HelpCircle className="w-5 h-5" />
              Quick Start Guide - Schedule of Values
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg border-2 border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Target className="w-4 h-4 text-blue-600" />
                  <h4 className="font-semibold text-blue-800">1. Select Project</h4>
                </div>
                <p className="text-sm text-blue-700">Choose an existing project from the dropdown above to begin SOV management.</p>
              </div>
              
              <div className="bg-white p-4 rounded-lg border-2 border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Plus className="w-4 h-4 text-blue-600" />
                  <h4 className="font-semibold text-blue-800">2. Add SOV Items</h4>
                </div>
                <p className="text-sm text-blue-700">Create schedule of values items with descriptions, categories, and scheduled values.</p>
              </div>
              
              <div className="bg-white p-4 rounded-lg border-2 border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Download className="w-4 h-4 text-blue-600" />
                  <h4 className="font-semibold text-blue-800">3. Track Progress</h4>
                </div>
                <p className="text-sm text-blue-700">Monitor completion percentages and generate professional SOV reports.</p>
              </div>
            </div>
          </CardContent>
        </Card>

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
          projectData={selectedProjectData}
          sovItems={sovItems}
        />
      </div>
    </Layout>
  );
}
