
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
import { Plus, Calendar as CalendarIcon, Edit, Trash2, FileText, DollarSign, Package } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface BidPackage {
  id: string;
  projectId?: string;
  name: string;
  description?: string;
  dueDate?: Date;
  status: 'Draft' | 'Sent' | 'Received' | 'Awarded' | 'Cancelled';
  estimatedValue?: number;
  items: BidPackageItem[];
}

interface BidPackageItem {
  id: string;
  category: string;
  description: string;
  quantity: number;
  unit?: string;
  estimatedCost?: number;
}

interface Project {
  id: string;
  name: string;
}

const STATUS_OPTIONS = [
  { value: 'Draft', label: 'Draft', color: 'bg-gray-500' },
  { value: 'Sent', label: 'Sent', color: 'bg-blue-500' },
  { value: 'Received', label: 'Received', color: 'bg-yellow-500' },
  { value: 'Awarded', label: 'Awarded', color: 'bg-green-500' },
  { value: 'Cancelled', label: 'Cancelled', color: 'bg-red-500' }
];

export default function BidPackages() {
  const [bidPackages, setBidPackages] = useState<BidPackage[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<BidPackage | null>(null);
  
  const [newPackage, setNewPackage] = useState({
    projectId: '',
    name: '',
    description: '',
    dueDate: null as Date | null,
    status: 'Draft' as 'Draft' | 'Sent' | 'Received' | 'Awarded' | 'Cancelled',
    estimatedValue: '',
    items: [{ id: '1', category: '', description: '', quantity: 1, unit: 'each', estimatedCost: 0 }]
  });

  useEffect(() => {
    fetchBidPackages();
    fetchProjects();
  }, []);

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

  const fetchBidPackages = async () => {
    try {
      setLoading(true);
      const { data: packagesData, error: packagesError } = await supabase
        .from('bid_packages')
        .select('*')
        .order('created_at', { ascending: false });

      if (packagesError) throw packagesError;

      const packagesWithItems = await Promise.all(
        (packagesData || []).map(async (pkg) => {
          const { data: itemsData, error: itemsError } = await supabase
            .from('bid_package_items')
            .select('*')
            .eq('bid_package_id', pkg.id);

          if (itemsError) throw itemsError;

          return {
            id: pkg.id,
            projectId: pkg.project_id,
            name: pkg.name,
            description: pkg.description,
            dueDate: pkg.due_date ? new Date(pkg.due_date) : undefined,
            status: pkg.status as BidPackage['status'],
            estimatedValue: pkg.estimated_value,
            items: (itemsData || []).map((item: any) => ({
              id: item.id,
              category: item.category,
              description: item.description,
              quantity: item.quantity,
              unit: item.unit,
              estimatedCost: item.estimated_cost
            }))
          };
        })
      );

      setBidPackages(packagesWithItems);
    } catch (error) {
      console.error('Error fetching bid packages:', error);
      toast.error('Failed to load bid packages');
    } finally {
      setLoading(false);
    }
  };

  const addPackageItem = () => {
    const newItem = {
      id: Date.now().toString(),
      category: '',
      description: '',
      quantity: 1,
      unit: 'each',
      estimatedCost: 0
    };
    setNewPackage({ ...newPackage, items: [...newPackage.items, newItem] });
  };

  const removePackageItem = (index: number) => {
    if (newPackage.items.length > 1) {
      const updatedItems = newPackage.items.filter((_, i) => i !== index);
      setNewPackage({ ...newPackage, items: updatedItems });
    }
  };

  const updateItem = (index: number, field: keyof BidPackageItem, value: any) => {
    const updatedItems = [...newPackage.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setNewPackage({ ...newPackage, items: updatedItems });
  };

  const savePackage = async () => {
    if (!newPackage.name) {
      toast.error('Please enter a package name');
      return;
    }

    if (newPackage.items.some(item => !item.category || !item.description)) {
      toast.error('Please fill in all item categories and descriptions');
      return;
    }

    try {
      const packageData = {
        project_id: newPackage.projectId || null,
        name: newPackage.name,
        description: newPackage.description || null,
        due_date: newPackage.dueDate?.toISOString().split('T')[0] || null,
        status: newPackage.status,
        estimated_value: parseFloat(newPackage.estimatedValue) || 0
      };

      let packageId: string;

      if (editingPackage) {
        const { error } = await supabase
          .from('bid_packages')
          .update(packageData)
          .eq('id', editingPackage.id);

        if (error) throw error;
        packageId = editingPackage.id;

        // Delete existing items
        const { error: deleteError } = await supabase
          .from('bid_package_items')
          .delete()
          .eq('bid_package_id', packageId);

        if (deleteError) throw deleteError;
      } else {
        const { data, error } = await supabase
          .from('bid_packages')
          .insert(packageData)
          .select()
          .single();

        if (error) throw error;
        packageId = data.id;
      }

      // Insert package items
      const itemsData = newPackage.items.map(item => ({
        bid_package_id: packageId,
        category: item.category,
        description: item.description,
        quantity: item.quantity,
        unit: item.unit,
        estimated_cost: item.estimatedCost
      }));

      const { error: itemsError } = await supabase
        .from('bid_package_items')
        .insert(itemsData);

      if (itemsError) throw itemsError;

      toast.success(editingPackage ? 'Bid package updated successfully' : 'Bid package created successfully');
      setDialogOpen(false);
      setEditingPackage(null);
      resetForm();
      fetchBidPackages();
    } catch (error) {
      console.error('Error saving bid package:', error);
      toast.error('Failed to save bid package');
    }
  };

  const deletePackage = async (id: string) => {
    try {
      const { error } = await supabase
        .from('bid_packages')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Bid package deleted successfully');
      fetchBidPackages();
    } catch (error) {
      console.error('Error deleting bid package:', error);
      toast.error('Failed to delete bid package');
    }
  };

  const editPackage = (pkg: BidPackage) => {
    setEditingPackage(pkg);
    setNewPackage({
      projectId: pkg.projectId || '',
      name: pkg.name,
      description: pkg.description || '',
      dueDate: pkg.dueDate || null,
      status: pkg.status,
      estimatedValue: pkg.estimatedValue?.toString() || '',
      items: pkg.items
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setNewPackage({
      projectId: '',
      name: '',
      description: '',
      dueDate: null,
      status: 'Draft',
      estimatedValue: '',
      items: [{ id: '1', category: '', description: '', quantity: 1, unit: 'each', estimatedCost: 0 }]
    });
  };

  const getStatusColor = (status: string) => {
    return STATUS_OPTIONS.find(s => s.value === status)?.color || 'bg-gray-500';
  };

  const totalEstimatedValue = bidPackages.reduce((sum, pkg) => sum + (pkg.estimatedValue || 0), 0);
  const awardedValue = bidPackages
    .filter(pkg => pkg.status === 'Awarded')
    .reduce((sum, pkg) => sum + (pkg.estimatedValue || 0), 0);

  return (
    <Layout title="Bid Packages" subtitle="Manage subcontractor bid packages">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Packages</CardTitle>
              <Package className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{bidPackages.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Estimated Value</CardTitle>
              <DollarSign className="h-4 w-4 text-blue-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                ${totalEstimatedValue.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Awarded Value</CardTitle>
              <DollarSign className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                ${awardedValue.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Award Rate</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {bidPackages.length > 0 
                  ? Math.round((bidPackages.filter(pkg => pkg.status === 'Awarded').length / bidPackages.length) * 100)
                  : 0
                }%
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Bid Packages Management */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Bid Packages</CardTitle>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingPackage(null);
                  resetForm();
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Package
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingPackage ? 'Edit Bid Package' : 'Create New Bid Package'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Package Name</Label>
                      <Input
                        id="name"
                        value={newPackage.name}
                        onChange={(e) => setNewPackage({ ...newPackage, name: e.target.value })}
                        placeholder="Electrical Work Package"
                      />
                    </div>

                    <div>
                      <Label htmlFor="project">Project</Label>
                      <Select value={newPackage.projectId} onValueChange={(value) => setNewPackage({ ...newPackage, projectId: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select project..." />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No Project</SelectItem>
                          {projects.map((project) => (
                            <SelectItem key={project.id} value={project.id}>
                              {project.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newPackage.description}
                      onChange={(e) => setNewPackage({ ...newPackage, description: e.target.value })}
                      placeholder="Package description..."
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label>Due Date</Label>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button
                            variant="outline"
                            className={cn(
                              "w-full justify-start text-left font-normal",
                              !newPackage.dueDate && "text-muted-foreground"
                            )}
                          >
                            <CalendarIcon className="mr-2 h-4 w-4" />
                            {newPackage.dueDate ? format(newPackage.dueDate, "PPP") : "Pick a date"}
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0">
                          <Calendar
                            mode="single"
                            selected={newPackage.dueDate || undefined}
                            onSelect={(date) => setNewPackage({ ...newPackage, dueDate: date || null })}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                    </div>

                    <div>
                      <Label htmlFor="estimatedValue">Estimated Value ($)</Label>
                      <Input
                        id="estimatedValue"
                        type="number"
                        step="0.01"
                        value={newPackage.estimatedValue}
                        onChange={(e) => setNewPackage({ ...newPackage, estimatedValue: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>

                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select value={newPackage.status} onValueChange={(value: 'Draft' | 'Sent' | 'Received' | 'Awarded' | 'Cancelled') => setNewPackage({ ...newPackage, status: value })}>
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

                  {/* Package Items */}
                  <div>
                    <div className="flex justify-between items-center mb-4">
                      <Label className="text-lg font-medium">Package Items</Label>
                      <Button type="button" variant="outline" onClick={addPackageItem}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add Item
                      </Button>
                    </div>

                    <div className="space-y-4">
                      {newPackage.items.map((item, index) => (
                        <div key={item.id} className="grid grid-cols-12 gap-4 items-end">
                          <div className="col-span-3">
                            <Label>Category</Label>
                            <Input
                              value={item.category}
                              onChange={(e) => updateItem(index, 'category', e.target.value)}
                              placeholder="Electrical"
                            />
                          </div>
                          <div className="col-span-4">
                            <Label>Description</Label>
                            <Input
                              value={item.description}
                              onChange={(e) => updateItem(index, 'description', e.target.value)}
                              placeholder="Item description"
                            />
                          </div>
                          <div className="col-span-1">
                            <Label>Qty</Label>
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                              placeholder="1"
                            />
                          </div>
                          <div className="col-span-1">
                            <Label>Unit</Label>
                            <Input
                              value={item.unit}
                              onChange={(e) => updateItem(index, 'unit', e.target.value)}
                              placeholder="each"
                            />
                          </div>
                          <div className="col-span-2">
                            <Label>Est. Cost</Label>
                            <Input
                              type="number"
                              step="0.01"
                              value={item.estimatedCost}
                              onChange={(e) => updateItem(index, 'estimatedCost', parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                            />
                          </div>
                          <div className="col-span-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removePackageItem(index)}
                              disabled={newPackage.items.length === 1}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <Button onClick={savePackage} className="w-full">
                    {editingPackage ? 'Update Package' : 'Create Package'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading bid packages...</div>
            ) : bidPackages.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No bid packages found. Create your first package to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Estimated Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bidPackages.map((pkg) => (
                    <TableRow key={pkg.id}>
                      <TableCell className="font-medium">{pkg.name}</TableCell>
                      <TableCell>
                        {pkg.projectId ? projects.find(p => p.id === pkg.projectId)?.name || 'Unknown' : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {pkg.dueDate ? format(pkg.dueDate, "MMM dd, yyyy") : 'N/A'}
                      </TableCell>
                      <TableCell className="font-medium">
                        ${(pkg.estimatedValue || 0).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("text-white", getStatusColor(pkg.status))}>
                          {pkg.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => editPackage(pkg)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deletePackage(pkg.id)}
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
      </div>
    </Layout>
  );
}
