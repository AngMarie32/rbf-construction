import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Eye, Plus, ArrowLeft, FileText, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { EditChangeOrderDialog } from '@/components/change-orders/EditChangeOrderDialog';
import { ViewChangeOrderDialog } from '@/components/change-orders/ViewChangeOrderDialog';
import { CreateChangeOrderDialog } from '@/components/change-orders/CreateChangeOrderDialog';

interface Project {
  id: string;
  name: string;
  client: string;
  status: string;
  contract_value: number;
  completion_percentage: number;
  net_change_orders?: number;
}

interface ChangeOrder {
  id: string;
  number: string;
  description: string;
  amount: number;
  status: string;
  date: string;
  created_at: string;
}

export default function ChangeOrders() {
  const [view, setView] = useState<'overview' | 'project'>('overview');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingChangeOrder, setEditingChangeOrder] = useState<ChangeOrder | null>(null);
  const [viewingChangeOrder, setViewingChangeOrder] = useState<ChangeOrder | null>(null);

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProject && view === 'project') {
      fetchChangeOrders();
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

  const fetchChangeOrders = async () => {
    if (!selectedProject) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('change_orders')
        .select('*')
        .eq('project_id', selectedProject.id)
        .order('number');

      if (error) throw error;
      setChangeOrders(data || []);
    } catch (error) {
      console.error('Error fetching change orders:', error);
      toast.error('Failed to load change orders');
    } finally {
      setLoading(false);
    }
  };

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    setView('project');
  };

  const deleteChangeOrder = async (id: string) => {
    if (!confirm('Are you sure you want to delete this change order?')) return;

    try {
      const { error } = await supabase
        .from('change_orders')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Change order deleted successfully');
      fetchChangeOrders();
    } catch (error) {
      console.error('Error deleting change order:', error);
      toast.error('Failed to delete change order');
    }
  };

  const filteredProjects = projects.filter(project =>
    project.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    project.client.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': 
      case 'Approved': return 'bg-green-100 text-green-800';
      case 'Planning':
      case 'Draft': return 'bg-blue-100 text-blue-800';
      case 'On Hold':
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Completed':
      case 'Rejected': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <Layout title="Change Orders" subtitle="Manage project change orders">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (view === 'project' && selectedProject) {
    const totalChangeOrders = changeOrders.length;
    const approvedChangeOrders = changeOrders.filter(co => co.status === 'Approved').length;
    const totalChangeOrderValue = changeOrders
      .filter(co => co.status === 'Approved')
      .reduce((sum, co) => sum + co.amount, 0);
    const pendingChangeOrders = changeOrders.filter(co => co.status === 'Pending').length;

    return (
      <Layout title={`Change Orders - ${selectedProject.name}`} subtitle={`Client: ${selectedProject.client}`}>
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
            <CreateChangeOrderDialog 
              projectId={selectedProject.id} 
              onChangeOrderCreated={fetchChangeOrders} 
            />
          </div>

          {/* Project Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold">{totalChangeOrders}</div>
                <p className="text-sm text-gray-600">Total Change Orders</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-green-600">{approvedChangeOrders}</div>
                <p className="text-sm text-gray-600">Approved</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-yellow-600">{pendingChangeOrders}</div>
                <p className="text-sm text-gray-600">Pending</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <div className="text-2xl font-bold text-blue-600">${totalChangeOrderValue.toLocaleString()}</div>
                <p className="text-sm text-gray-600">Total Value (Approved)</p>
              </CardContent>
            </Card>
          </div>

          {/* Change Orders Table */}
          <Card>
            <CardHeader>
              <CardTitle>Change Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {changeOrders.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg mb-4">No change orders found for this project.</p>
                  <CreateChangeOrderDialog 
                    projectId={selectedProject.id} 
                    onChangeOrderCreated={fetchChangeOrders} 
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Number</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="w-[150px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {changeOrders.map((co) => (
                        <TableRow key={co.id}>
                          <TableCell className="font-medium">{co.number}</TableCell>
                          <TableCell>{co.description}</TableCell>
                          <TableCell className={co.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {co.amount >= 0 ? '+' : ''}${co.amount.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(co.status)}>
                              {co.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(co.date).toLocaleDateString()}</TableCell>
                          <TableCell>{new Date(co.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setViewingChangeOrder(co)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setEditingChangeOrder(co)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => deleteChangeOrder(co.id)}
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

          {/* Dialogs */}
          <ViewChangeOrderDialog
            changeOrder={viewingChangeOrder}
            open={!!viewingChangeOrder}
            onClose={() => setViewingChangeOrder(null)}
          />

          <EditChangeOrderDialog
            changeOrder={editingChangeOrder}
            open={!!editingChangeOrder}
            onClose={() => setEditingChangeOrder(null)}
            onChangeOrderUpdated={fetchChangeOrders}
          />
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
    <Layout title="Change Orders" subtitle="Company overview and project management">
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

        {/* Search and Filters */}
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
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Projects with Change Orders</CardTitle>
            <CreateChangeOrderDialog onChangeOrderCreated={fetchProjects} />
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
                    <TableHead>Change Orders</TableHead>
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
                      <TableCell>{project.net_change_orders?.toLocaleString() || 'N/A'}</TableCell>
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

        {/* Project Detail View */}
        {view === 'project' && selectedProject && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{selectedProject.name} - Change Orders</CardTitle>
                <p className="text-sm text-gray-600">Client: {selectedProject.client}</p>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={() => setView('overview')}
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Overview
                </Button>
                <CreateChangeOrderDialog 
                  projectId={selectedProject.id} 
                  onChangeOrderCreated={fetchChangeOrders} 
                />
              </div>
            </CardHeader>
            <CardHeader>
              <CardTitle>Change Orders</CardTitle>
            </CardHeader>
            <CardContent>
              {changeOrders.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg mb-4">No change orders found for this project.</p>
                  <CreateChangeOrderDialog 
                    projectId={selectedProject.id} 
                    onChangeOrderCreated={fetchChangeOrders} 
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Number</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead className="w-[150px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {changeOrders.map((co) => (
                        <TableRow key={co.id}>
                          <TableCell className="font-medium">{co.number}</TableCell>
                          <TableCell>{co.description}</TableCell>
                          <TableCell className={co.amount >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {co.amount >= 0 ? '+' : ''}${co.amount.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge className={getStatusColor(co.status)}>
                              {co.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{new Date(co.date).toLocaleDateString()}</TableCell>
                          <TableCell>{new Date(co.created_at).toLocaleDateString()}</TableCell>
                          <TableCell>
                            <div className="flex gap-1">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setViewingChangeOrder(co)}
                              >
                                <Eye className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => setEditingChangeOrder(co)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => deleteChangeOrder(co.id)}
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
        )}

        {/* Dialogs */}
        <ViewChangeOrderDialog
          changeOrder={viewingChangeOrder}
          open={!!viewingChangeOrder}
          onClose={() => setViewingChangeOrder(null)}
        />

        <EditChangeOrderDialog
          changeOrder={editingChangeOrder}
          open={!!editingChangeOrder}
          onClose={() => setEditingChangeOrder(null)}
          onChangeOrderUpdated={fetchChangeOrders}
        />
      </div>
    </Layout>
  );
}
