import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, FileText, DollarSign, TrendingUp, Calendar, Eye, Download, Settings, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { CreateSOVDialog } from '@/components/schedule/CreateSOVDialog';
import { EditSOVItemDialog } from '@/components/schedule/EditSOVItemDialog';
import { SOVReportDialog } from '@/components/schedule/SOVReportDialog';
import { G702Dialog } from '@/components/forms/G702Dialog';

export default function ScheduleOfValues() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [sovItems, setSovItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<any>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);
  const [g702DialogOpen, setG702DialogOpen] = useState(false);
  const [projectData, setProjectData] = useState<any>(null);
  const [viewMode, setViewMode] = useState('all');
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchSOVItems();
      fetchProjectData();
    } else {
      setSovItems([]);
      setProjectData(null);
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

  const fetchProjectData = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', selectedProject)
        .single();

      if (error) throw error;
      setProjectData(data);
    } catch (error) {
      console.error('Error fetching project data:', error);
    }
  };

  const fetchSOVItems = async () => {
    try {
      // First, fetch SOV items
      const { data: sovData, error: sovError } = await supabase
        .from('sov_items')
        .select('*')
        .eq('project_id', selectedProject)
        .order('item_number');

      if (sovError) throw sovError;

      // Then, fetch payment applications for this project
      const { data: paymentData, error: paymentError } = await supabase
        .from('payment_applications_g702')
        .select('*')
        .eq('project_id', selectedProject)
        .order('period_to', { ascending: false });

      if (paymentError) {
        console.error('Error fetching payment applications:', paymentError);
        // If no payment applications exist, just use SOV data
        setSovItems(sovData || []);
        return;
      }

      // Update SOV items with latest payment application data
      const updatedItems = sovData?.map(item => {
        // Find the latest payment application
        const latestPayment = paymentData?.[0]; // Most recent due to ordering

        return {
          ...item,
          total_completed_and_stored: latestPayment?.total_completed_and_stored || item.total_completed_and_stored || 0,
          percent_complete: item.scheduled_value ? 
            Math.round(((latestPayment?.total_completed_and_stored || item.total_completed_and_stored || 0) / item.scheduled_value) * 100) : 0
        };
      }) || [];

      setSovItems(updatedItems);
    } catch (error) {
      console.error('Error fetching SOV items:', error);
      toast.error('Failed to load SOV items');
    }
  };

  const handleCreateNew = () => {
    if (!selectedProject) {
      toast.error('Please select a project first');
      return;
    }
    setCreateDialogOpen(true);
  };

  const handleEditItem = (item: any) => {
    setEditingItem(item);
    setEditDialogOpen(true);
  };

  const handleDeleteItem = async (item: any) => {
    if (!confirm('Are you sure you want to delete this SOV item?')) return;

    try {
      const { error } = await supabase
        .from('sov_items')
        .delete()
        .eq('id', item.id);

      if (error) throw error;

      toast.success('SOV item deleted successfully');
      fetchSOVItems();
    } catch (error) {
      console.error('Error deleting SOV item:', error);
      toast.error('Failed to delete SOV item');
    }
  };

  const handleG702G703 = () => {
    if (!selectedProject) {
      toast.error('Please select a project first');
      return;
    }
    setG702DialogOpen(true);
  };

  const handleViewReport = () => {
    if (!selectedProject) {
      toast.error('Please select a project first');
      return;
    }
    setReportDialogOpen(true);
  };

  const handleExport = (format: string) => {
    if (!selectedProject) {
      toast.error('Please select a project first');
      return;
    }
    
    if (format === 'csv') {
      const csvData = sovItems.map(item => ({
        'Item Number': item.item_number,
        'Category': item.category,
        'Description': item.description,
        'Scheduled Value': item.scheduled_value,
        'Completed Value': item.total_completed_and_stored || 0,
        'Percent Complete': item.percent_complete || 0,
        'Balance': (item.scheduled_value || 0) - (item.total_completed_and_stored || 0)
      }));

      const csvContent = [
        Object.keys(csvData[0]).join(','),
        ...csvData.map(row => Object.values(row).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `sov-${selectedProject}-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      toast.success('SOV exported successfully');
    } else {
      toast.info(`${format.toUpperCase()} export coming soon`);
    }
  };

  const handleEditValues = () => {
    if (!selectedProject) {
      toast.error('Please select a project first');
      return;
    }
    navigate(`/projects/${selectedProject}/billing`);
  };

  const filteredItems = sovItems.filter(item => {
    const matchesSearch = item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.item_number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.category.toLowerCase().includes(searchTerm.toLowerCase());

    if (viewMode === 'completed') {
      return matchesSearch && (item.percent_complete || 0) === 100;
    } else if (viewMode === 'in-progress') {
      return matchesSearch && (item.percent_complete || 0) > 0 && (item.percent_complete || 0) < 100;
    } else if (viewMode === 'not-started') {
      return matchesSearch && (item.percent_complete || 0) === 0;
    }
    
    return matchesSearch;
  });

  const totalScheduledValue = sovItems.reduce((sum, item) => sum + (item.scheduled_value || 0), 0);
  const totalCompleted = sovItems.reduce((sum, item) => sum + (item.total_completed_and_stored || 0), 0);
  const completionPercentage = totalScheduledValue ? Math.round((totalCompleted / totalScheduledValue) * 100) : 0;

  // Group items by category for better organization
  const groupedItems = filteredItems.reduce((acc, item) => {
    const category = item.category || 'Other';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {} as Record<string, any[]>);

  const getLastUpdated = () => {
    if (sovItems.length === 0) return null;
    
    const lastUpdate = sovItems.reduce((latest, item) => {
      const itemDate = new Date(item.updated_at || item.created_at);
      return itemDate > latest ? itemDate : latest;
    }, new Date(0));

    const daysAgo = Math.floor((Date.now() - lastUpdate.getTime()) / (1000 * 60 * 60 * 24));
    return {
      date: lastUpdate.toLocaleDateString(),
      daysAgo
    };
  };

  const lastUpdated = getLastUpdated();

  if (loading) {
    return (
      <Layout title="Schedule of Values" subtitle="Manage project schedule of values">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  const selectedProjectData = projects.find(p => p.id === selectedProject);

  return (
    <Layout title="Schedule of Values" subtitle="Manage project schedule of values">
      <div className="space-y-6">
        {/* Header with Project Selection */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-80">
                <SelectValue placeholder="Select a project to view SOV" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name} ({project.status})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {selectedProject && (
            <div className="flex gap-2">
              <Button onClick={handleCreateNew}>
                <Plus className="w-4 h-4 mr-2" />
                Add Item
              </Button>
              <Button variant="outline" onClick={handleG702G703}>
                <FileText className="w-4 h-4 mr-2" />
                G703 & G702
              </Button>
              <Button variant="outline" onClick={handleViewReport}>
                <Eye className="w-4 h-4 mr-2" />
                View Report
              </Button>
              <Select onValueChange={handleExport}>
                <SelectTrigger className="w-32">
                  <SelectValue placeholder="Export" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="pdf">PDF</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={handleEditValues}>
                <Settings className="w-4 h-4 mr-2" />
                Edit Values
              </Button>
            </div>
          )}
        </div>

        {selectedProject && selectedProjectData && (
          <>
            {/* Project Header Info */}
            <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">{selectedProjectData.name}</h2>
                  <p className="text-gray-600">Project #{selectedProject.slice(-8).toUpperCase()}</p>
                </div>
                <Badge variant="outline" className="text-sm">
                  {selectedProjectData.status}
                </Badge>
              </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-blue-600">Total Contract Sum</CardTitle>
                  <DollarSign className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    ${totalScheduledValue.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Including approved change orders
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-green-600">Completed to Date</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    ${totalCompleted.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {completionPercentage}% of total contract value
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-purple-600">Remaining Balance</CardTitle>
                  <DollarSign className="h-4 w-4 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-600">
                    ${(totalScheduledValue - totalCompleted).toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {100 - completionPercentage}% of total contract value
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-orange-600">Last Updated</CardTitle>
                  <Calendar className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {lastUpdated ? lastUpdated.date : 'N/A'}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {lastUpdated ? `${lastUpdated.daysAgo} days ago` : 'No data available'}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Search and Filter */}
            <div className="flex gap-4 items-center">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search SOV items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={viewMode} onValueChange={setViewMode}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Items</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="in-progress">In Progress</SelectItem>
                  <SelectItem value="not-started">Not Started</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* SOV Items Table */}
            <Card>
              <CardHeader>
                <CardTitle>Schedule of Values</CardTitle>
              </CardHeader>
              <CardContent>
                {Object.keys(groupedItems).length > 0 ? (
                  <div className="space-y-6">
                    {Object.entries(groupedItems).map(([category, items]) => (
                      <div key={category}>
                        <h3 className="text-lg font-semibold mb-3 text-gray-700">{category}</h3>
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead>
                              <tr className="border-b bg-gray-50">
                                <th className="text-left py-3 px-4 font-medium">Item/Division</th>
                                <th className="text-left py-3 px-4 font-medium">Description of Work</th>
                                <th className="text-right py-3 px-4 font-medium">Scheduled Value</th>
                                <th className="text-right py-3 px-4 font-medium">Work Completed</th>
                                <th className="text-center py-3 px-4 font-medium">% Complete</th>
                                <th className="text-right py-3 px-4 font-medium">Balance to Finish</th>
                                <th className="text-center py-3 px-4 font-medium">Actions</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Array.isArray(items) && items.map((item) => {
                                const completionPercent = item.scheduled_value ? 
                                  Math.round(((item.total_completed_and_stored || 0) / item.scheduled_value) * 100) : 0;
                                const balance = (item.scheduled_value || 0) - (item.total_completed_and_stored || 0);
                                
                                return (
                                  <tr key={item.id} className="border-b hover:bg-gray-50">
                                    <td className="py-3 px-4 font-medium">{item.item_number}</td>
                                    <td className="py-3 px-4">{item.description}</td>
                                    <td className="py-3 px-4 text-right font-medium">
                                      ${item.scheduled_value.toLocaleString()}
                                    </td>
                                    <td className="py-3 px-4 text-right font-medium">
                                      ${(item.total_completed_and_stored || 0).toLocaleString()}
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                      <div className="flex items-center justify-center gap-2">
                                        <div className={`w-16 h-2 rounded-full ${
                                          completionPercent === 100 ? 'bg-green-500' : 
                                          completionPercent >= 80 ? 'bg-blue-500' : 'bg-blue-300'
                                        }`}>
                                          <div 
                                            className="h-full bg-current rounded-full transition-all duration-300"
                                            style={{ width: `${completionPercent}%` }}
                                          />
                                        </div>
                                        <span className="text-sm font-medium">{completionPercent}%</span>
                                      </div>
                                    </td>
                                    <td className="py-3 px-4 text-right font-medium">
                                      ${balance.toLocaleString()}
                                    </td>
                                    <td className="py-3 px-4 text-center">
                                      <div className="flex items-center justify-center gap-1">
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          onClick={() => handleEditItem(item)}
                                        >
                                          <Edit className="w-4 h-4" />
                                        </Button>
                                        <Button 
                                          variant="ghost" 
                                          size="sm"
                                          onClick={() => handleDeleteItem(item)}
                                          className="text-red-600 hover:text-red-700"
                                        >
                                          <Trash2 className="w-4 h-4" />
                                        </Button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : sovItems.length === 0 ? (
                  <div className="text-center py-16">
                    <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                      <FileText className="w-8 h-8 text-gray-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No SOV items found for this project</h3>
                    <p className="text-gray-500 mb-6">Get started by creating your first schedule of values.</p>
                    <Button onClick={handleCreateNew}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create First SOV Item
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

        <CreateSOVDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          projectId={selectedProject}
          onSave={fetchSOVItems}
        />

        <EditSOVItemDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          item={editingItem}
          onSave={fetchSOVItems}
        />

        <SOVReportDialog
          open={reportDialogOpen}
          onOpenChange={setReportDialogOpen}
          projectData={projectData}
          sovItems={sovItems}
        />

        <G702Dialog
          open={g702DialogOpen}
          onOpenChange={setG702DialogOpen}
          projectId={selectedProject}
          onSave={() => {}}
        />
      </div>
    </Layout>
  );
}
