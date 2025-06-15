import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Search, Plus, FileText, DollarSign, Calendar, Eye, Edit, Trash2, Building2, AlertCircle, CheckCircle, Clock, XCircle, Paperclip, Filter, MoreHorizontal } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';
import { CreateChangeOrderDialog } from '@/components/change-orders/CreateChangeOrderDialog';
import { AttachChangeOrderDocumentDialog } from '@/components/change-orders/AttachChangeOrderDocumentDialog';
import { ViewChangeOrderDocumentsDialog } from '@/components/change-orders/ViewChangeOrderDocumentsDialog';
import { ChangeOrderSOVDialog } from '@/components/change-orders/ChangeOrderSOVDialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

export default function ChangeOrders() {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [changeOrders, setChangeOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedChangeOrder, setSelectedChangeOrder] = useState<any>(null);
  const [editingChangeOrder, setEditingChangeOrder] = useState<any>(null);
  
  // New state for enhanced features
  const [selectedChangeOrders, setSelectedChangeOrders] = useState<string[]>([]);
  const [attachDocumentDialogOpen, setAttachDocumentDialogOpen] = useState(false);
  const [viewDocumentsDialogOpen, setViewDocumentsDialogOpen] = useState(false);
  const [sovDialogOpen, setSovDialogOpen] = useState(false);
  const [amountFilter, setAmountFilter] = useState<string>('all');
  const [showFilters, setShowFilters] = useState(false);
  
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
    setSelectedChangeOrder(co);
    toast.info(`Viewing Change Order: ${co.number}`);
  };

  const editChangeOrder = (co: any) => {
    setEditingChangeOrder(co);
    toast.info(`Editing Change Order: ${co.number}`);
  };

  const handleDeleteClick = (co: any) => {
    setSelectedChangeOrder(co);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!selectedChangeOrder) return;

    try {
      const { error } = await supabase
        .from('change_orders')
        .delete()
        .eq('id', selectedChangeOrder.id);

      if (error) throw error;

      toast.success('Change order deleted successfully');
      fetchChangeOrders();
      setDeleteDialogOpen(false);
      setSelectedChangeOrder(null);
    } catch (error) {
      console.error('Error deleting change order:', error);
      toast.error('Failed to delete change order');
    }
  };

  const updateChangeOrderStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('change_orders')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      toast.success(`Change order ${newStatus.toLowerCase()} successfully`);
      fetchChangeOrders();
    } catch (error) {
      console.error('Error updating change order:', error);
      toast.error('Failed to update change order');
    }
  };

  const handleSelectAll = () => {
    if (selectedChangeOrders.length === filteredChangeOrders.length) {
      setSelectedChangeOrders([]);
    } else {
      setSelectedChangeOrders(filteredChangeOrders.map(co => co.id));
    }
  };

  const handleSelectChangeOrder = (id: string) => {
    setSelectedChangeOrders(prev =>
      prev.includes(id)
        ? prev.filter(coId => coId !== id)
        : [...prev, id]
    );
  };

  const handleBulkStatusUpdate = async (newStatus: string) => {
    if (selectedChangeOrders.length === 0) {
      toast.error('Please select change orders first');
      return;
    }

    try {
      const { error } = await supabase
        .from('change_orders')
        .update({ status: newStatus })
        .in('id', selectedChangeOrders);

      if (error) throw error;

      toast.success(`Updated ${selectedChangeOrders.length} change orders to ${newStatus}`);
      setSelectedChangeOrders([]);
      fetchChangeOrders();
    } catch (error) {
      console.error('Error updating change orders:', error);
      toast.error('Failed to update change orders');
    }
  };

  const handleAttachDocument = (co: any) => {
    setSelectedChangeOrder(co);
    setAttachDocumentDialogOpen(true);
  };

  const handleViewDocuments = (co: any) => {
    setSelectedChangeOrder(co);
    setViewDocumentsDialogOpen(true);
  };

  const filteredChangeOrders = changeOrders.filter(co => {
    const matchesSearch = co.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         co.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || co.status === statusFilter;
    const matchesAmount = amountFilter === 'all' || 
                         (amountFilter === 'positive' && co.amount > 0) ||
                         (amountFilter === 'negative' && co.amount < 0) ||
                         (amountFilter === 'large' && Math.abs(co.amount) > 10000);
    return matchesSearch && matchesStatus && matchesAmount;
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

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Draft': return <FileText className="w-4 h-4" />;
      case 'Submitted': return <Clock className="w-4 h-4" />;
      case 'Approved': return <CheckCircle className="w-4 h-4" />;
      case 'Rejected': return <XCircle className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
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
    <Layout title="Change Orders" subtitle="Track and manage project modifications efficiently">
      <div className="space-y-8">
        {/* Project Selection */}
        <Card className="border-2 border-dashed border-accent/20 bg-accent/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-accent" />
              Project Selection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-full max-w-md bg-background">
                <SelectValue placeholder="Choose a project to view change orders" />
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
            {/* Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-blue-700">Total Change Orders</CardTitle>
                  <FileText className="h-5 w-5 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-800">{changeOrders.length}</div>
                  <p className="text-xs text-blue-600 mt-1">All change orders</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-green-700">Total Amount</CardTitle>
                  <DollarSign className="h-5 w-5 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-800">${totalAmount.toLocaleString()}</div>
                  <p className="text-xs text-green-600 mt-1">All change orders</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-orange-700">Approved Amount</CardTitle>
                  <CheckCircle className="h-5 w-5 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-800">${approvedAmount.toLocaleString()}</div>
                  <p className="text-xs text-orange-600 mt-1">Approved change orders</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-red-700">Pending</CardTitle>
                  <Clock className="h-5 w-5 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-800">
                    {changeOrders.filter(co => co.status === 'Submitted').length}
                  </div>
                  <p className="text-xs text-red-600 mt-1">Awaiting approval</p>
                </CardContent>
              </Card>
            </div>

            {/* Enhanced Controls */}
            <div className="space-y-4">
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
                  <Button
                    variant="outline"
                    onClick={() => setShowFilters(!showFilters)}
                    className="flex items-center gap-2"
                  >
                    <Filter className="w-4 h-4" />
                    Filters
                  </Button>
                </div>
                <div className="flex gap-2">
                  {changeOrders.filter(co => co.status === 'Approved').length > 0 && (
                    <Button onClick={() => setSovDialogOpen(true)} variant="outline">
                      Add to SOV
                    </Button>
                  )}
                  <Button onClick={handleCreateNew} className="bg-accent hover:bg-accent/90">
                    <Plus className="w-4 h-4 mr-2" />
                    New Change Order
                  </Button>
                </div>
              </div>

              {/* Enhanced Filters */}
              {showFilters && (
                <Card className="p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-2 block">Status</label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger>
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
                    <div>
                      <label className="text-sm font-medium mb-2 block">Amount</label>
                      <Select value={amountFilter} onValueChange={setAmountFilter}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Amounts</SelectItem>
                          <SelectItem value="positive">Positive (Additions)</SelectItem>
                          <SelectItem value="negative">Negative (Deductions)</SelectItem>
                          <SelectItem value="large">Large (&gt; $10,000)</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </Card>
              )}

              {/* Bulk Operations */}
              {selectedChangeOrders.length > 0 && (
                <Card className="p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      {selectedChangeOrders.length} change orders selected
                    </span>
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleBulkStatusUpdate('Approved')}
                      >
                        Bulk Approve
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => handleBulkStatusUpdate('Rejected')}
                      >
                        Bulk Reject
                      </Button>
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => setSelectedChangeOrders([])}
                      >
                        Clear Selection
                      </Button>
                    </div>
                  </div>
                </Card>
              )}
            </div>

            {/* Change Orders List */}
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <FileText className="w-5 h-5" />
                    Change Orders
                  </CardTitle>
                  {filteredChangeOrders.length > 0 && (
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedChangeOrders.length === filteredChangeOrders.length}
                        onCheckedChange={handleSelectAll}
                      />
                      <span className="text-sm text-gray-500">Select All</span>
                    </div>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {filteredChangeOrders.length > 0 ? (
                  <div className="space-y-4">
                    {filteredChangeOrders.map((co) => (
                      <div key={co.id} className="flex items-center gap-4 p-6 border rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
                        <Checkbox
                          checked={selectedChangeOrders.includes(co.id)}
                          onCheckedChange={() => handleSelectChangeOrder(co.id)}
                        />
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <Badge variant="outline" className="font-mono text-sm px-3 py-1">
                              CO #{co.number}
                            </Badge>
                            <Badge className={`${getStatusColor(co.status)} text-white flex items-center gap-1`}>
                              {getStatusIcon(co.status)}
                              {co.status}
                            </Badge>
                            <div className="flex items-center text-sm text-gray-500">
                              <Calendar className="w-4 h-4 mr-1" />
                              {format(new Date(co.date), 'MMM dd, yyyy')}
                            </div>
                          </div>
                          <p className="text-gray-600 mb-3 text-base">{co.description}</p>
                          <div className="flex items-center gap-6 text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500">Amount:</span>
                              <span className={`font-semibold text-lg ${co.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {co.amount >= 0 ? '+' : ''}${co.amount.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-2 ml-4">
                          <Button variant="outline" size="sm" onClick={() => viewChangeOrder(co)}>
                            <Eye className="w-4 h-4 mr-1" />
                            View
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleAttachDocument(co)}>
                            <Paperclip className="w-4 h-4 mr-1" />
                            Attach
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => handleViewDocuments(co)}>
                            <FileText className="w-4 h-4 mr-1" />
                            Documents
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="outline" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem onClick={() => editChangeOrder(co)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              {co.status === 'Submitted' && (
                                <>
                                  <DropdownMenuItem onClick={() => updateChangeOrderStatus(co.id, 'Approved')}>
                                    <CheckCircle className="w-4 h-4 mr-2" />
                                    Approve
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => updateChangeOrderStatus(co.id, 'Rejected')}>
                                    <XCircle className="w-4 h-4 mr-2" />
                                    Reject
                                  </DropdownMenuItem>
                                </>
                              )}
                              <DropdownMenuItem 
                                onClick={() => handleDeleteClick(co)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : changeOrders.length === 0 ? (
                  <div className="text-center py-16">
                    <FileText className="w-20 h-20 text-gray-300 mx-auto mb-6" />
                    <h3 className="text-xl font-semibold text-gray-900 mb-3">No Change Orders Found</h3>
                    <p className="text-gray-500 mb-8 max-w-md mx-auto">
                      Create your first change order to track project modifications and manage approval workflows.
                    </p>
                    <Button onClick={handleCreateNew} className="bg-accent hover:bg-accent/90">
                      <Plus className="w-4 h-4 mr-2" />
                      Create First Change Order
                    </Button>
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <AlertCircle className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                    <p className="text-gray-500">No change orders match your search criteria.</p>
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
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Change Order Management</h3>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">
                Select a project above to view and manage change orders, track modifications, and monitor approval status.
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

        {/* Dialogs */}
        <CreateChangeOrderDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          projectId={selectedProject}
          onSave={fetchChangeOrders}
        />

        <AttachChangeOrderDocumentDialog
          open={attachDocumentDialogOpen}
          onOpenChange={setAttachDocumentDialogOpen}
          changeOrderId={selectedChangeOrder?.id || null}
          changeOrderNumber={selectedChangeOrder?.number || ''}
          onDocumentAttached={fetchChangeOrders}
        />

        <ViewChangeOrderDocumentsDialog
          open={viewDocumentsDialogOpen}
          onOpenChange={setViewDocumentsDialogOpen}
          changeOrderId={selectedChangeOrder?.id || null}
          changeOrderNumber={selectedChangeOrder?.number || ''}
        />

        <ChangeOrderSOVDialog
          open={sovDialogOpen}
          onOpenChange={setSovDialogOpen}
          projectId={selectedProject}
          onSuccess={() => {
            toast.success('Successfully added change orders to SOV');
            fetchChangeOrders();
          }}
        />

        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Change Order</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete Change Order #{selectedChangeOrder?.number}? This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </Layout>
  );
}
