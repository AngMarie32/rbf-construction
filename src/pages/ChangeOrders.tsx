
import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Search, Plus, FileText, DollarSign, Calendar, Eye, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { CreateChangeOrderDialog } from '@/components/change-orders/CreateChangeOrderDialog';

export default function ChangeOrders() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [changeOrders, setChangeOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchChangeOrders();
    } else {
      setChangeOrders([]);
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

  const fetchChangeOrders = async () => {
    try {
      const { data, error } = await supabase
        .from('change_orders')
        .select('*')
        .eq('project_id', selectedProject)
        .order('number');

      if (error) throw error;
      setChangeOrders(data || []);
    } catch (error) {
      console.error('Error fetching change orders:', error);
      toast.error('Failed to load change orders');
    }
  };

  const handleCreateNew = () => {
    if (!selectedProject) {
      toast.error('Please select a project first');
      return;
    }
    setCreateDialogOpen(true);
  };

  const viewChangeOrder = (co: any) => {
    // Simple alert for now - could be enhanced with a proper view modal
    alert(`Change Order: ${co.number}\nDescription: ${co.description}\nAmount: $${co.amount.toLocaleString()}\nStatus: ${co.status}\nDate: ${format(new Date(co.date), 'MMM dd, yyyy')}`);
  };

  const editChangeOrder = (co: any) => {
    // For now, we'll use a simple prompt - could be enhanced with a proper edit modal
    const newDescription = prompt('Edit description:', co.description);
    const newAmount = prompt('Edit amount:', co.amount.toString());
    
    if (newDescription !== null && newAmount !== null) {
      updateChangeOrder(co.id, {
        description: newDescription,
        amount: parseFloat(newAmount) || co.amount
      });
    }
  };

  const updateChangeOrder = async (id: string, updates: any) => {
    try {
      const { error } = await supabase
        .from('change_orders')
        .update(updates)
        .eq('id', id);

      if (error) throw error;

      toast.success('Change order updated successfully');
      fetchChangeOrders();
    } catch (error) {
      console.error('Error updating change order:', error);
      toast.error('Failed to update change order');
    }
  };

  const deleteChangeOrder = async (id: string) => {
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

  const filteredChangeOrders = changeOrders.filter(co => {
    const matchesSearch = co.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         co.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || co.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const totalAmount = changeOrders.reduce((sum, co) => sum + (co.amount || 0), 0);
  const approvedAmount = changeOrders
    .filter(co => co.status === 'Approved')
    .reduce((sum, co) => sum + (co.amount || 0), 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'bg-gray-500';
      case 'Submitted': return 'bg-blue-500';
      case 'Approved': return 'bg-green-500';
      case 'Rejected': return 'bg-red-500';
      default: return 'bg-gray-500';
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

  return (
    <Layout title="Change Orders" subtitle="Manage project change orders">
      <div className="space-y-6">
        {/* Project Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Project</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-full max-w-md">
                <SelectValue placeholder="Choose a project to view change orders" />
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
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Change Orders</CardTitle>
                  <FileText className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">
                    {changeOrders.length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    All change orders
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Amount</CardTitle>
                  <DollarSign className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    ${totalAmount.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    All change orders
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Approved Amount</CardTitle>
                  <DollarSign className="h-4 w-4 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    ${approvedAmount.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Approved change orders
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending</CardTitle>
                  <FileText className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">
                    {changeOrders.filter(co => co.status === 'Submitted').length}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Awaiting approval
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Controls */}
            <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
              <div className="flex gap-4 flex-1">
                <div className="relative max-w-md">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search change orders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Submitted">Submitted</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreateNew}>
                <Plus className="w-4 h-4 mr-2" />
                New Change Order
              </Button>
            </div>

            {/* Change Orders List */}
            <Card>
              <CardHeader>
                <CardTitle>Change Orders</CardTitle>
              </CardHeader>
              <CardContent>
                {filteredChangeOrders.length > 0 ? (
                  <div className="space-y-4">
                    {filteredChangeOrders.map((co) => (
                      <div key={co.id} className="flex justify-between items-center p-4 border rounded-lg hover:bg-gray-50">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 className="font-semibold">CO #{co.number}</h4>
                            <Badge className={`${getStatusColor(co.status)} text-white`}>
                              {co.status}
                            </Badge>
                            <div className="flex items-center text-sm text-gray-500">
                              <Calendar className="w-4 h-4 mr-1" />
                              {format(new Date(co.date), 'MMM dd, yyyy')}
                            </div>
                          </div>
                          <p className="text-gray-600 mb-2">{co.description}</p>
                          <div className="flex items-center gap-4 text-sm">
                            <span className="text-gray-500">Amount:</span>
                            <span className={`font-medium ${co.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {co.amount >= 0 ? '+' : ''}${co.amount.toLocaleString()}
                            </span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => viewChangeOrder(co)}
                          >
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => editChangeOrder(co)}
                          >
                            <Edit className="w-4 h-4 mr-1" />
                            Edit
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => deleteChangeOrder(co.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4 mr-1" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : changeOrders.length === 0 ? (
                  <div className="text-center py-8">
                    <p className="text-gray-500 text-lg">No change orders found for this project.</p>
                    <p className="text-gray-400 mt-2">Create your first change order to get started.</p>
                    <Button className="mt-4" onClick={handleCreateNew}>
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Change Order
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-gray-500">No change orders match your search criteria.</p>
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
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Change Orders</h3>
              <p className="text-gray-500 mb-6">
                Select a project above to view and manage change orders.
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

        <CreateChangeOrderDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          projectId={selectedProject}
          onSave={fetchChangeOrders}
        />
      </div>
    </Layout>
  );
}
