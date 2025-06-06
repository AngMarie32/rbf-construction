import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Eye, Plus, ArrowLeft, Edit, Trash2 } from 'lucide-react';
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
  const [view, setView] = useState<'overview' | 'project'>('overview');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [sovItems, setSovItems] = useState<SOVItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingItem, setEditingItem] = useState<SOVItem | null>(null);
  const [viewingItem, setViewingItem] = useState<SOVItem | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProject && view === 'project') {
      fetchSOVItems();
    }
  }, [selectedProject, view]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
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

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    setView('project');
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.client.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-100 text-green-800';
      case 'Planning': return 'bg-blue-100 text-blue-800';
      case 'On Hold': return 'bg-yellow-100 text-yellow-800';
      case 'Completed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Layout title="Schedule of Values" subtitle="Manage project schedules of values">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (view === 'project' && selectedProject) {
    const totalScheduledValue = sovItems.reduce((sum, item) => sum + item.scheduled_value, 0);
    const totalCompleted = sovItems.reduce((sum, item) => sum + (item.total_completed_and_stored || 0), 0);
    const completionPercentage = totalScheduledValue > 0 ? (totalCompleted / totalScheduledValue) * 100 : 0;

    return (
      <Layout title={`Schedule of Values - ${selectedProject.name}`} subtitle={`Client: ${selectedProject.client}`}>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => setView('overview')}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Overview
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
              {sovItems.length === 0 ? (
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
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setViewingItem(item)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingItem(item)}
                              >
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

  // Company Overview
  const totalProjects = projects.length;
  const activeProjects = projects.filter(p => p.status === 'Active').length;
  const totalContractValue = projects.reduce((sum, p) => sum + p.contract_value, 0);
  const avgCompletion = projects.length > 0 
    ? projects.reduce((sum, p) => sum + p.completion_percentage, 0) / projects.length 
    : 0;

  return (
    <Layout title="Schedule of Values" subtitle="Company overview and project management">
      <div className="space-y-6">
        {/* Company Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{totalProjects}</div>
              <p className="text-sm text-gray-600">Total Projects</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">{activeProjects}</div>
              <p className="text-sm text-gray-600">Active Projects</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">${totalContractValue.toLocaleString()}</div>
              <p className="text-sm text-gray-600">Total Contract Value</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">{avgCompletion.toFixed(1)}%</div>
              <p className="text-sm text-gray-600">Average Completion</p>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>

        {/* Projects Table */}
        <Card>
          <CardHeader>
            <CardTitle>Projects with Schedule of Values</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Project Name</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Contract Value</TableHead>
                    <TableHead>Completion</TableHead>
                    <TableHead className="w-[100px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredProjects.map((project) => (
                    <TableRow key={project.id}>
                      <TableCell className="font-medium">{project.name}</TableCell>
                      <TableCell>{project.client}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(project.status)}>
                          {project.status}
                        </Badge>
                      </TableCell>
                      <TableCell>${project.contract_value.toLocaleString()}</TableCell>
                      <TableCell>{project.completion_percentage}%</TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleProjectSelect(project)}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
