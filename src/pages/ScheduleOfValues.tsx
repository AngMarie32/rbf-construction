import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Search, Plus, FileText, DollarSign, Calculator, Building2, TrendingUp, BarChart3, Target } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { CreateSOVDialog } from '@/components/schedule/CreateSOVDialog';

export default function ScheduleOfValues() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [sovItems, setSovItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
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
        .select('id, name, status, contract_value')
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

  const handleCreateNew = () => {
    if (!selectedProject) {
      toast.error('Please select a project first');
      return;
    }
    setCreateDialogOpen(true);
  };

  const filteredItems = sovItems.filter(item =>
    item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.item_number.toString().includes(searchTerm)
  );

  const totalContractValue = sovItems.reduce((sum, item) => sum + (item.scheduled_value || 0), 0);
  const totalCompleted = sovItems.reduce((sum, item) => sum + (item.work_completed_to_date || 0), 0);
  const totalRetainage = sovItems.reduce((sum, item) => sum + (item.retainage || 0), 0);
  const completionPercentage = totalContractValue > 0 ? (totalCompleted / totalContractValue) * 100 : 0;

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
    <Layout title="Schedule of Values" subtitle="Manage project schedule of values and track completion">
      <div className="space-y-8">
        {/* Project Selection */}
        <Card className="border-2 border-dashed border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Project Selection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-full max-w-md bg-background">
                <SelectValue placeholder="Choose a project to manage SOV" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    <div className="flex items-center justify-between w-full">
                      <span>{project.name}</span>
                      <Badge variant="outline" className="ml-2">
                        {project.status}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedProject && (
          <>
            {/* Summary Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-blue-700">Total Contract Value</CardTitle>
                  <DollarSign className="h-5 w-5 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-800">${totalContractValue.toLocaleString()}</div>
                  <p className="text-xs text-blue-600 mt-1">{sovItems.length} line items</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-green-700">Work Completed</CardTitle>
                  <BarChart3 className="h-5 w-5 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-800">${totalCompleted.toLocaleString()}</div>
                  <p className="text-xs text-green-600 mt-1">{completionPercentage.toFixed(1)}% complete</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-orange-700">Total Retainage</CardTitle>
                  <Calculator className="h-5 w-5 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-800">${totalRetainage.toLocaleString()}</div>
                  <p className="text-xs text-orange-600 mt-1">Held back amounts</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-purple-700">Balance to Finish</CardTitle>
                  <TrendingUp className="h-5 w-5 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-800">
                    ${(totalContractValue - totalCompleted).toLocaleString()}
                  </div>
                  <p className="text-xs text-purple-600 mt-1">Remaining work value</p>
                </CardContent>
              </Card>
            </div>

            {/* Progress Overview */}
            <Card className="bg-gradient-to-r from-background to-primary/5 border-primary/20">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="w-5 h-5 text-primary" />
                  Project Completion Overview
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm font-medium">
                    <span>Overall Progress</span>
                    <span>{completionPercentage.toFixed(1)}%</span>
                  </div>
                  <Progress value={completionPercentage} className="h-3" />
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Completed:</span>
                    <span className="ml-2 font-semibold text-green-600">${totalCompleted.toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Remaining:</span>
                    <span className="ml-2 font-semibold text-blue-600">
                      ${(totalContractValue - totalCompleted).toLocaleString()}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
              <div className="relative max-w-md flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search SOV items..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button onClick={handleCreateNew} className="bg-primary hover:bg-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Add SOV Item
              </Button>
            </div>

            {/* SOV Items */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="w-5 h-5" />
                  Schedule of Values Items
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredItems.length > 0 ? (
                  <div className="space-y-3">
                    {filteredItems.map((item) => (
                      <div key={item.id} className="p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <Badge variant="outline" className="font-mono">
                                #{item.item_number}
                              </Badge>
                              <h4 className="font-semibold">{item.description}</h4>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                              <div>
                                <span className="text-muted-foreground">Scheduled Value:</span>
                                <div className="font-semibold">${(item.scheduled_value || 0).toLocaleString()}</div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Work Completed:</span>
                                <div className="font-semibold text-green-600">
                                  ${(item.work_completed_to_date || 0).toLocaleString()}
                                </div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Retainage:</span>
                                <div className="font-semibold text-orange-600">
                                  ${(item.retainage || 0).toLocaleString()}
                                </div>
                              </div>
                              <div>
                                <span className="text-muted-foreground">Balance:</span>
                                <div className="font-semibold text-blue-600">
                                  ${((item.scheduled_value || 0) - (item.work_completed_to_date || 0)).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Progress</span>
                            <span>
                              {item.scheduled_value > 0 
                                ? ((item.work_completed_to_date / item.scheduled_value) * 100).toFixed(1)
                                : 0}%
                            </span>
                          </div>
                          <Progress 
                            value={item.scheduled_value > 0 ? (item.work_completed_to_date / item.scheduled_value) * 100 : 0} 
                            className="h-2"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : sovItems.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No SOV Items Found</h3>
                    <p className="text-gray-500 mb-6">Get started by creating your first schedule of values item.</p>
                    <Button onClick={handleCreateNew} className="bg-primary hover:bg-primary/90">
                      <Plus className="w-4 h-4 mr-2" />
                      Create First SOV Item
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No SOV items match your search criteria.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </>
        )}

        {!selectedProject && (
          <Card className="border-2 border-dashed border-gray-200">
            <CardContent className="text-center py-16">
              <Building2 className="w-20 h-20 text-gray-300 mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Schedule of Values Management</h3>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">
                Select a project above to view and manage its schedule of values, track completion progress, and monitor financial milestones.
              </p>
              {projects.length === 0 && (
                <div className="mt-6">
                  <p className="text-gray-400 mb-4">No projects found. Create a project first to get started.</p>
                  <Button onClick={() => navigate('/projects')} variant="outline">
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
      </div>
    </Layout>
  );
}
