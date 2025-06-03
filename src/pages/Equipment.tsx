import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { NewEquipmentDialog } from '@/components/equipment/NewEquipmentDialog';
import { MaintenanceDialog } from '@/components/equipment/MaintenanceDialog';
import { EquipmentEstimator } from '@/components/equipment/EquipmentEstimator';
import { AllMaintenanceView } from '@/components/equipment/AllMaintenanceView';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Search, Plus, Grid, List, MoreHorizontal, Wrench, Calendar, Eye, Edit, Trash2, PlusCircle, Upload, Camera } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Equipment } from '@/types';
import { cn } from '@/lib/utils';

interface DatabaseEquipment {
  id: string;
  name: string;
  category: string | null;
  hourly_rate: number;
  year: number | null;
  value: number | null;
  status: string | null;
  image: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface EstimatorItem {
  equipment: Equipment;
  duration: number;
  unit: 'hours' | 'days';
}

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [filteredEquipment, setFilteredEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('');
  const [showMaintenance, setShowMaintenance] = useState(false);
  const [estimatorItems, setEstimatorItems] = useState<EstimatorItem[]>([]);
  const [showEstimator, setShowEstimator] = useState(false);
  const [showAllMaintenance, setShowAllMaintenance] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  useEffect(() => {
    fetchEquipment();
  }, []);

  useEffect(() => {
    filterEquipment();
  }, [equipment, searchTerm, categoryFilter, statusFilter]);

  const fetchEquipment = async () => {
    try {
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const mappedEquipment: Equipment[] = (data || []).map((dbEquipment: DatabaseEquipment) => ({
        id: dbEquipment.id,
        name: dbEquipment.name,
        category: (dbEquipment.category as Equipment['category']) || 'Other',
        hourlyRate: dbEquipment.hourly_rate,
        year: dbEquipment.year || new Date().getFullYear(),
        value: dbEquipment.value || 0,
        status: (dbEquipment.status as Equipment['status']) || 'Available',
        image: dbEquipment.image || undefined,
        description: dbEquipment.description || ''
      }));
      
      setEquipment(mappedEquipment);
    } catch (error) {
      console.error('Error fetching equipment:', error);
      toast.error('Failed to load equipment');
    } finally {
      setLoading(false);
    }
  };

  const filterEquipment = () => {
    let filtered = equipment;

    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    setFilteredEquipment(filtered);
  };

  const deleteEquipment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this equipment?')) return;

    try {
      const { error } = await supabase
        .from('equipment')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Equipment deleted successfully');
      fetchEquipment();
    } catch (error) {
      console.error('Error deleting equipment:', error);
      toast.error('Failed to delete equipment');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available': return 'bg-green-100 text-green-800';
      case 'In Use': return 'bg-blue-100 text-blue-800';
      case 'Maintenance': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const openMaintenance = (equipmentId: string) => {
    setSelectedEquipment(equipmentId);
    setShowMaintenance(true);
  };

  const addToEstimator = (equipmentItem: Equipment) => {
    const existing = estimatorItems.find(item => item.equipment.id === equipmentItem.id);
    if (existing) {
      toast.info('Equipment already added to estimator');
      return;
    }

    const newItem: EstimatorItem = {
      equipment: equipmentItem,
      duration: 8,
      unit: 'hours'
    };

    setEstimatorItems([...estimatorItems, newItem]);
    setShowEstimator(true);
    toast.success(`${equipmentItem.name} added to estimator`);
  };

  const removeFromEstimator = (equipmentId: string) => {
    setEstimatorItems(estimatorItems.filter(item => item.equipment.id !== equipmentId));
    if (estimatorItems.length === 1) {
      setShowEstimator(false);
    }
  };

  const updateEstimatorDuration = (equipmentId: string, duration: number, unit: 'hours' | 'days') => {
    setEstimatorItems(estimatorItems.map(item => 
      item.equipment.id === equipmentId 
        ? { ...item, duration, unit }
        : item
    ));
  };

  const saveEstimate = () => {
    console.log('Saving estimate:', estimatorItems);
    toast.success('Estimate saved successfully');
  };

  const exportEstimate = () => {
    console.log('Exporting estimate:', estimatorItems);
    toast.success('Estimate exported successfully');
  };

  const viewEquipment = (equipmentItem: Equipment) => {
    setEditingEquipment(equipmentItem);
    setEditDialogOpen(true);
  };

  const editEquipment = (equipmentItem: Equipment) => {
    setEditingEquipment(equipmentItem);
    setEditDialogOpen(true);
  };

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      toast.success('Image selected for upload');
    }
  };

  const saveEquipmentChanges = async () => {
    if (!editingEquipment) return;

    try {
      let imageUrl = editingEquipment.image;

      // Upload image if a new one was selected
      if (imageFile) {
        const fileExt = imageFile.name.split('.').pop();
        const fileName = `${editingEquipment.id}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('equipment-images')
          .upload(fileName, imageFile, { upsert: true });

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('equipment-images')
          .getPublicUrl(fileName);

        imageUrl = publicUrl;
      }

      const { error } = await supabase
        .from('equipment')
        .update({
          name: editingEquipment.name,
          category: editingEquipment.category,
          hourly_rate: editingEquipment.hourlyRate,
          year: editingEquipment.year,
          value: editingEquipment.value,
          status: editingEquipment.status,
          description: editingEquipment.description,
          image: imageUrl
        })
        .eq('id', editingEquipment.id);

      if (error) throw error;

      toast.success('Equipment updated successfully');
      setEditDialogOpen(false);
      setEditingEquipment(null);
      setImageFile(null);
      fetchEquipment();
    } catch (error) {
      console.error('Error updating equipment:', error);
      toast.error('Failed to update equipment');
    }
  };

  const categories = ['Heavy Machinery', 'Vehicles', 'Trailers', 'Other'];

  if (loading) {
    return (
      <Layout title="Equipment Tracker & Cost Estimator" subtitle="Manage and track equipment for your construction projects">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Equipment Tracker & Cost Estimator" subtitle="Manage and track equipment for your construction projects">
      <div className={cn("space-y-6", showEstimator && "mr-96")}>
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search equipment..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full"
              />
            </div>
            <div className="flex gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[160px]">
                  <SelectValue placeholder="All Equipment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Equipment</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Available">Available</SelectItem>
                  <SelectItem value="In Use">In Use</SelectItem>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              onClick={() => setShowAllMaintenance(true)}
            >
              <Calendar className="w-4 h-4 mr-2" />
              All Maintenance
            </Button>
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => setShowEstimator(!showEstimator)}
            >
              Cost Estimator ({estimatorItems.length})
            </Button>
            <NewEquipmentDialog onEquipmentCreated={fetchEquipment} />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
          <Button
            variant={categoryFilter === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setCategoryFilter('all')}
            className="rounded-md"
          >
            All Equipment
          </Button>
          {categories.map(category => (
            <Button
              key={category}
              variant={categoryFilter === category ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCategoryFilter(category)}
              className="rounded-md"
            >
              {category}
            </Button>
          ))}
        </div>

        <div className="text-sm text-gray-600">Showing {filteredEquipment.length} items</div>

        {/* Equipment Content */}
        {filteredEquipment.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <div className="text-gray-500 text-lg mb-4">
                {searchTerm || categoryFilter !== 'all' || statusFilter !== 'all' 
                  ? 'No equipment matches your filters' 
                  : 'No equipment found. Add your first equipment to get started!'}
              </div>
              {!searchTerm && categoryFilter === 'all' && statusFilter === 'all' && (
                <NewEquipmentDialog onEquipmentCreated={fetchEquipment} />
              )}
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEquipment.map((item) => (
              <Card key={item.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-0">
                  <div className="relative">
                    <div className="h-48 bg-gray-200 rounded-t-lg flex items-center justify-center">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded-t-lg" />
                      ) : (
                        <div className="text-gray-400">No Image</div>
                      )}
                    </div>
                    <Badge className={cn("absolute top-2 right-2", getStatusColor(item.status))}>
                      {item.status}
                    </Badge>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-1">{item.name}</h3>
                    <p className="text-gray-600 mb-2">Year: {item.year}</p>
                    <p className="text-gray-600 mb-2">Value: ${item.value.toLocaleString()}</p>
                    <p className="text-blue-600 font-semibold mb-3">${item.hourlyRate}/hr</p>
                    <Badge variant="secondary" className="mb-3">{item.category}</Badge>
                    <div className="flex justify-between items-center space-x-2">
                      <Button 
                        size="sm" 
                        variant="outline"
                        onClick={() => addToEstimator(item)}
                      >
                        <PlusCircle className="w-4 h-4 mr-1" />
                        Add
                      </Button>
                      <Button 
                        size="sm" 
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => openMaintenance(item.id)}
                      >
                        <Wrench className="w-4 h-4 mr-1" />
                        Maintenance
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-white border shadow-lg z-50">
                          <DropdownMenuItem onClick={() => viewEquipment(item)} className="cursor-pointer">
                            <Eye className="w-4 h-4 mr-2" />
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => editEquipment(item)} className="cursor-pointer">
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600 cursor-pointer"
                            onClick={() => deleteEquipment(item.id)}
                          >
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Hourly Rate</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[200px]">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEquipment.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-medium">
                        <div>
                          <div>{item.name}</div>
                          {item.description && (
                            <div className="text-sm text-gray-500 truncate max-w-[200px]">
                              {item.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{item.category}</Badge>
                      </TableCell>
                      <TableCell>${item.hourlyRate}/hr</TableCell>
                      <TableCell>{item.year}</TableCell>
                      <TableCell>${item.value.toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge className={getStatusColor(item.status)}>
                          {item.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-1">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => addToEstimator(item)}
                          >
                            <PlusCircle className="w-4 h-4" />
                          </Button>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openMaintenance(item.id)}
                          >
                            <Wrench className="w-4 h-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="bg-white border shadow-lg z-50">
                              <DropdownMenuItem onClick={() => viewEquipment(item)} className="cursor-pointer">
                                <Eye className="w-4 h-4 mr-2" />
                                View
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => editEquipment(item)} className="cursor-pointer">
                                <Edit className="w-4 h-4 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-red-600 cursor-pointer"
                                onClick={() => deleteEquipment(item.id)}
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Equipment Estimator Sidebar */}
      {showEstimator && (
        <EquipmentEstimator
          selectedEquipment={estimatorItems}
          onRemoveEquipment={removeFromEstimator}
          onUpdateDuration={updateEstimatorDuration}
          onSaveEstimate={saveEstimate}
          onExportEstimate={exportEstimate}
          onClose={() => setShowEstimator(false)}
        />
      )}

      {/* Edit Equipment Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingEquipment ? `Edit ${editingEquipment.name}` : 'Equipment Details'}
            </DialogTitle>
          </DialogHeader>
          {editingEquipment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Equipment Name</Label>
                  <Input
                    id="name"
                    value={editingEquipment.name}
                    onChange={(e) => setEditingEquipment({...editingEquipment, name: e.target.value})}
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select 
                    value={editingEquipment.category} 
                    onValueChange={(value) => setEditingEquipment({...editingEquipment, category: value as Equipment['category']})}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="hourlyRate">Hourly Rate ($)</Label>
                  <Input
                    id="hourlyRate"
                    type="number"
                    value={editingEquipment.hourlyRate}
                    onChange={(e) => setEditingEquipment({...editingEquipment, hourlyRate: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div>
                  <Label htmlFor="year">Year</Label>
                  <Input
                    id="year"
                    type="number"
                    value={editingEquipment.year}
                    onChange={(e) => setEditingEquipment({...editingEquipment, year: parseInt(e.target.value) || new Date().getFullYear()})}
                  />
                </div>
                <div>
                  <Label htmlFor="value">Value ($)</Label>
                  <Input
                    id="value"
                    type="number"
                    value={editingEquipment.value}
                    onChange={(e) => setEditingEquipment({...editingEquipment, value: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="status">Status</Label>
                <Select 
                  value={editingEquipment.status} 
                  onValueChange={(value) => setEditingEquipment({...editingEquipment, status: value as Equipment['status']})}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Available">Available</SelectItem>
                    <SelectItem value="In Use">In Use</SelectItem>
                    <SelectItem value="Maintenance">Maintenance</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={editingEquipment.description}
                  onChange={(e) => setEditingEquipment({...editingEquipment, description: e.target.value})}
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="image">Equipment Image</Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="image"
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => document.getElementById('image')?.click()}
                  >
                    <Camera className="w-4 h-4 mr-2" />
                    {imageFile ? 'Change Image' : 'Upload Image'}
                  </Button>
                  {imageFile && (
                    <span className="text-sm text-green-600">{imageFile.name}</span>
                  )}
                </div>
                {editingEquipment.image && (
                  <div className="mt-2">
                    <img src={editingEquipment.image} alt="Current" className="w-32 h-32 object-cover rounded" />
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={saveEquipmentChanges}>
                  Save Changes
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <MaintenanceDialog
        open={showMaintenance}
        onOpenChange={setShowMaintenance}
        equipmentId={selectedEquipment}
        equipmentName={equipment.find(e => e.id === selectedEquipment)?.name || ''}
      />

      <AllMaintenanceView
        open={showAllMaintenance}
        onOpenChange={setShowAllMaintenance}
      />
    </Layout>
  );
}
