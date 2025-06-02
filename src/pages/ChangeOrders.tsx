import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Plus, Calendar as CalendarIcon, Edit, Trash2, FileText, DollarSign } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface ChangeOrder {
  id: string;
  projectId: string;
  number: string;
  date: Date;
  description: string;
  amount: number;
  status: 'Draft' | 'Pending' | 'Approved' | 'Rejected';
}

interface Project {
  id: string;
  name: string;
}

const STATUS_OPTIONS = [
  { value: 'Draft', label: 'Draft', color: 'bg-gray-500' },
  { value: 'Pending', label: 'Pending', color: 'bg-yellow-500' },
  { value: 'Approved', label: 'Approved', color: 'bg-green-500' },
  { value: 'Rejected', label: 'Rejected', color: 'bg-red-500' }
];

export default function ChangeOrders() {
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [changeOrders, setChangeOrders] = useState<ChangeOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingChangeOrder, setEditingChangeOrder] = useState<ChangeOrder | null>(null);
  
  const [newChangeOrder, setNewChangeOrder] = useState({
    number: '',
    date: new Date(),
    description: '',
    amount: '',
    status: 'Draft' as 'Draft' | 'Pending' | 'Approved' | 'Rejected'
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchChangeOrders();
    }
  }, [selectedProject]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    }
  };

  const fetchChangeOrders = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('change_orders')
        .select('*')
        .eq('project_id', selectedProject)
        .order('date', { ascending: false });

      if (error) throw error;

      const mappedChangeOrders = (data || []).map(co => ({
        id: co.id,
        projectId: co.project_id,
        number: co.number,
        date: new Date(co.date),
        description: co.description,
        amount: co.amount,
        status: co.status as ChangeOrder['status']
      }));

      setChangeOrders(mappedChangeOrders);
    } catch (error) {
      console.error('Error fetching change orders:', error);
      toast.error('Failed to load change orders');
    } finally {
      setLoading(false);
    }
  };

  const generateChangeOrderNumber = async () => {
    const changeOrderCount = changeOrders.length + 1;
    return `CO-${String(changeOrderCount).padStart(3, '0')}`;
  };

  const saveChangeOrder = async () => {
    if (!selectedProject || !newChangeOrder.description || !newChangeOrder.amount) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      const amount = parseFloat(newChangeOrder.amount);
      if (isNaN(amount)) {
        toast.error('Please enter a valid amount');
        return;
      }

      const changeOrderData = {
        project_id: selectedProject,
        number: newChangeOrder.number || await generateChangeOrderNumber(),
        date: newChangeOrder.date.toISOString().split('T')[0],
        description: newChangeOrder.description,
        amount: amount,
        status: newChangeOrder.status
      };

      if (editingChangeOrder) {
        const { error } = await supabase
          .from('change_orders')
          .update(changeOrderData)
          .eq('id', editingChangeOrder.id);

        if (error) throw error;
        toast.success('Change order updated successfully');
      } else {
        const { error } = await supabase
          .from('change_orders')
          .insert(changeOrderData);

        if (error) throw error;
        toast.success('Change order created successfully');
      }

      setDialogOpen(false);
      setEditingChangeOrder(null);
      setNewChangeOrder({
        number: '',
        date: new Date(),
        description: '',
        amount: '',
        status: 'Draft'
      });
      fetchChangeOrders();
    } catch (error) {
      console.error('Error saving change order:', error);
      toast.error('Failed to save change order');
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

  const editChangeOrder = async (changeOrder: ChangeOrder) => {
    setEditingChangeOrder(changeOrder);
    setNewChangeOrder({
      number: changeOrder.number,
      date: changeOrder.date,
      description: changeOrder.description,
      amount: changeOrder.amount.toString(),
      status: changeOrder.status
    });
    setDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    return STATUS_OPTIONS.find(s => s.value === status)?.color || 'bg-gray-500';
  };

  const totalApproved = changeOrders
    .filter(co => co.status === 'Approved')
    .reduce((sum, co) => sum + co.amount, 0);

  const totalPending = changeOrders
    .filter(co => co.status === 'Pending')
    .reduce((sum, co) => sum + co.amount, 0);

  return (
    <Layout title="Change Orders" subtitle="Manage project change orders and modifications">
      <div className="space-y-6">
        {/* Project Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Project</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a project to manage change orders..." />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
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
                  <FileText className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{changeOrders.length}</div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Approved Value</CardTitle>
                  <DollarSign className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    ${totalApproved.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Pending Value</CardTitle>
                  <DollarSign className="h-4 w-4 text-yellow-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-yellow-600">
                    ${totalPending.toLocaleString()}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Approval Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {changeOrders.length > 0 
                      ? Math.round((changeOrders.filter(co => co.status === 'Approved').length / changeOrders.length) * 100)
                      : 0
                    }%
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Change Orders Management */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Change Orders</CardTitle>
                <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                  <DialogTrigger asChild>
                    <Button onClick={async () => {
                      setEditingChangeOrder(null);
                      const nextNumber = await generateChangeOrderNumber();
                      setNewChangeOrder({
                        number: nextNumber,
                        date: new Date(),
                        description: '',
                        amount: '',
                        status: 'Draft'
                      });
                    }}>
                      <Plus className="w-4 h-4 mr-2" />
                      Add Change Order
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle>{editingChangeOrder ? 'Edit Change Order' : 'Add New Change Order'}</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="number">Change Order Number</Label>
                          <Input
                            id="number"
                            value={newChangeOrder.number}
                            onChange={(e) => setNewChangeOrder({ ...newChangeOrder, number: e.target.value })}
                            placeholder="CO-001"
                          />
                        </div>

                        <div>
                          <Label>Date</Label>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                className={cn(
                                  "w-full justify-start text-left font-normal",
                                  !newChangeOrder.date && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="mr-2 h-4 w-4" />
                                {newChangeOrder.date ? format(newChangeOrder.date, "PPP") : "Pick a date"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0">
                              <Calendar
                                mode="single"
                                selected={newChangeOrder.date}
                                onSelect={(date) => date && setNewChangeOrder({ ...newChangeOrder, date })}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>

                      <div>
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                          id="description"
                          value={newChangeOrder.description}
                          onChange={(e) => setNewChangeOrder({ ...newChangeOrder, description: e.target.value })}
                          placeholder="Describe the change order details..."
                          rows={4}
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="amount">Amount ($)</Label>
                          <Input
                            id="amount"
                            type="number"
                            step="0.01"
                            value={newChangeOrder.amount}
                            onChange={(e) => setNewChangeOrder({ ...newChangeOrder, amount: e.target.value })}
                            placeholder="0.00"
                          />
                        </div>

                        <div>
                          <Label htmlFor="status">Status</Label>
                          <Select value={newChangeOrder.status} onValueChange={(value: 'Draft' | 'Pending' | 'Approved' | 'Rejected') => setNewChangeOrder({ ...newChangeOrder, status: value })}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map((status) => (
                                <SelectItem key={status.value} value={status.value}>
                                  {status.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>

                      <Button onClick={saveChangeOrder} className="w-full">
                        {editingChangeOrder ? 'Update Change Order' : 'Create Change Order'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="text-center py-8">Loading change orders...</div>
                ) : changeOrders.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    No change orders found. Add your first change order to get started.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Number</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Amount</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="w-20">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {changeOrders.map((changeOrder) => (
                        <TableRow key={changeOrder.id}>
                          <TableCell className="font-medium">{changeOrder.number}</TableCell>
                          <TableCell>{format(changeOrder.date, "MMM dd, yyyy")}</TableCell>
                          <TableCell className="max-w-xs truncate">{changeOrder.description}</TableCell>
                          <TableCell className={cn(
                            "font-medium",
                            changeOrder.amount >= 0 ? "text-green-600" : "text-red-600"
                          )}>
                            ${Math.abs(changeOrder.amount).toLocaleString()}
                            {changeOrder.amount < 0 && " (Credit)"}
                          </TableCell>
                          <TableCell>
                            <Badge className={cn("text-white", getStatusColor(changeOrder.status))}>
                              {changeOrder.status}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex space-x-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => editChangeOrder(changeOrder)}
                              >
                                <Edit className="w-4 h-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => deleteChangeOrder(changeOrder.id)}
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
                )}
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </Layout>
  );
}
