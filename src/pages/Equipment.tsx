import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Plus, 
  Search, 
  Settings2, 
  Calendar,
  DollarSign,
  Clock,
  Truck,
  Wrench,
  Building,
  Edit2,
  Trash2,
  Upload,
  X
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { NewEquipmentDialog } from '@/components/equipment/NewEquipmentDialog';
import { MaintenanceDialog } from '@/components/equipment/MaintenanceDialog';
import { AllMaintenanceView } from '@/components/equipment/AllMaintenanceView';
import { EquipmentEstimator } from '@/components/equipment/EquipmentEstimator';
import { EditEquipmentDialog } from '@/components/equipment/EditEquipmentDialog';
import type { Equipment } from '@/types';
import { toast } from 'sonner';

interface EstimatorItem {
  equipment: Equipment;
  duration: number;
  unit: 'hours' | 'days';
}

export default function Equipment() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [filteredEquipment, setFilteredEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [allMaintenanceOpen, setAllMaintenanceOpen] = useState(false);
  const [estimatorOpen, setEstimatorOpen] = useState(false);
  const [selectedEstimatorEquipment, setSelectedEstimatorEquipment] = useState<EstimatorItem[]>([]);
  const [viewMode, setViewMode] = useState<'equipment' | 'maintenance' | 'estimator'>('equipment');
  const [newEquipmentDialogOpen, setNewEquipmentDialogOpen] = useState(false);

  useEffect(() => {
    fetchEquipment();
  }, []);

  useEffect(() => {
    filterEquipment();
  }, [equipment, searchTerm, statusFilter, categoryFilter]);

  const fetchEquipment = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .order('name');

      if (error) throw error;
      
      const typedData = (data || []).map(item => ({
        ...item,
        category: item.category as Equipment['category'],
        status: item.status as Equipment['status']
      })) as Equipment[];
      
      setEquipment(typedData);
    } catch (error) {
      console.error('Error fetching equipment:', error);
    } finally {
      setLoading(false);
    }
  };

  const filterEquipment = () => {
    let filtered = equipment;

    if (searchTerm) {
      filtered = filtered.filter(eq =>
        eq.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        eq.category.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(eq => eq.status === statusFilter);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(eq => eq.category === categoryFilter);
    }

    setFilteredEquipment(filtered);
  };

  const handleDeleteEquipment = async (equipmentId: string) => {
    try {
      const { error } = await supabase
        .from('equipment')
        .delete()
        .eq('id', equipmentId);

      if (error) throw error;

      fetchEquipment();
    } catch (error) {
      console.error('Error deleting equipment:', error);
    }
  };

  const handleImageUpload = async (file: File, equipmentId: string) => {
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${equipmentId}-${Date.now()}.${fileExt}`;
      
      // For now, we'll just show a toast. In a real app, you'd upload to Supabase Storage
      
      // TODO: Implement actual file upload to Supabase Storage
      // const { data, error } = await supabase.storage
      //   .from('equipment-images')
      //   .upload(fileName, file);
      
    } catch (error) {
      console.error('Error uploading image:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available': return 'bg-green-500';
      case 'In Use': return 'bg-blue-500';
      case 'Maintenance': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Heavy Machinery': return <Building className="w-4 h-4" />;
      case 'Vehicles': return <Truck className="w-4 h-4" />;
      case 'Trailers': return <Truck className="w-4 h-4" />;
      default: return <Wrench className="w-4 h-4" />;
    }
  };

  const handleMaintenanceClick = (eq: Equipment) => {
    setSelectedEquipment(eq);
    setMaintenanceDialogOpen(true);
  };

  const handleEditClick = (eq: Equipment) => {
    setEditingEquipment(eq);
  };

  const handleAddToEstimator = (eq: Equipment) => {
    const existingItem = selectedEstimatorEquipment.find(item => item.equipment.id === eq.id);
    if (!existingItem) {
      setSelectedEstimatorEquipment([...selectedEstimatorEquipment, {
        equipment: eq,
        duration: 1,
        unit: 'hours'
      }]);
    }
    setEstimatorOpen(true);
    setViewMode('estimator');
  };

  const handleRemoveFromEstimator = (equipmentId: string) => {
    setSelectedEstimatorEquipment(prev => 
      prev.filter(item => item.equipment.id !== equipmentId)
    );
  };

  const handleUpdateDuration = (equipmentId: string, duration: number, unit: 'hours' | 'days') => {
    setSelectedEstimatorEquipment(prev =>
      prev.map(item =>
        item.equipment.id === equipmentId
          ? { ...item, duration, unit }
          : item
      )
    );
  };

  const handleSaveEstimate = () => {
    toast.success('Estimate saved successfully');
  };

  const handleExportEstimate = () => {
    toast.success('Estimate exported successfully');
  };

  const handleCloseEstimator = () => {
    setEstimatorOpen(false);
    setViewMode('equipment');
  };

  if (loading) {
    return (
      <Layout title="Equipment" subtitle="Manage equipment and maintenance">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Equipment" subtitle="Manage equipment and maintenance">
      <div className="flex">
        {/* Main Content */}
        <div className={`transition-all duration-300 ${estimatorOpen ? 'mr-96' : 'mr-0'} flex-1`}>
          <div className="space-y-6">
            {/* View Toggle */}
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <Button 
                  variant={viewMode === 'equipment' ? 'default' : 'outline'}
                  onClick={() => setViewMode('equipment')}
                >
                  Equipment
                </Button>
                <Button 
                  variant={viewMode === 'maintenance' ? 'default' : 'outline'}
                  onClick={() => {
                    setViewMode('maintenance');
                    setAllMaintenanceOpen(true);
                  }}
                >
                  Maintenance Log
                </Button>
                <Button 
                  variant={viewMode === 'estimator' ? 'default' : 'outline'}
                  onClick={() => {
                    setViewMode('estimator');
                    setEstimatorOpen(true);
                  }}
                >
                  Equipment Estimator
                </Button>
              </div>
              
              {viewMode === 'equipment' && (
                <Button onClick={() => setNewEquipmentDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Equipment
                </Button>
              )}
            </div>

            {viewMode === 'equipment' && (
              <>
                {/* Controls */}
                <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
                  <div className="flex gap-4 flex-1">
                    <div className="relative max-w-md">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search equipment..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                    
                    <Select value={statusFilter} onValueChange={setStatusFilter}>
                      <SelectTrigger className="w-40">
                        <SelectValue placeholder="All Status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Status</SelectItem>
                        <SelectItem value="Available">Available</SelectItem>
                        <SelectItem value="In Use">In Use</SelectItem>
                        <SelectItem value="Maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>

                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger className="w-48">
                        <SelectValue placeholder="All Categories" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Categories</SelectItem>
                        <SelectItem value="Heavy Machinery">Heavy Machinery</SelectItem>
                        <SelectItem value="Vehicles">Vehicles</SelectItem>
                        <SelectItem value="Trailers">Trailers</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {/* Equipment Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredEquipment.map((eq) => (
                    <Card key={eq.id} className="overflow-hidden">
                      {eq.image && (
                        <div className="h-48 overflow-hidden">
                          <img 
                            src={eq.image} 
                            alt={eq.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      <CardHeader className="pb-3">
                        <div className="flex justify-between items-start">
                          <CardTitle className="text-lg">{eq.name}</CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge className={`${getStatusColor(eq.status)} text-white`}>
                              {eq.status}
                            </Badge>
                            <div className="flex gap-1">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleEditClick(eq)}
                                className="h-8 w-8 p-0"
                              >
                                <Edit2 className="w-4 h-4" />
                              </Button>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => handleDeleteEquipment(eq.id)}
                                className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-gray-600">
                          {getCategoryIcon(eq.category)}
                          <span>{eq.category}</span>
                          {eq.year && <span>• {eq.year}</span>}
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        {eq.description && (
                          <p className="text-sm text-gray-600">{eq.description}</p>
                        )}
                        
                        <div className="flex justify-between items-center text-sm">
                          <div className="flex items-center gap-1">
                            <Clock className="w-4 h-4 text-blue-600" />
                            <span>${eq.hourly_rate}/hr</span>
                          </div>
                          {eq.value && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-4 h-4 text-green-600" />
                              <span>${eq.value.toLocaleString()}</span>
                            </div>
                          )}
                        </div>

                        {/* Image Upload */}
                        <div className="flex justify-center">
                          <label className="cursor-pointer">
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handleImageUpload(file, eq.id);
                              }}
                            />
                            <Button variant="outline" size="sm" className="w-full">
                              <Upload className="w-4 h-4 mr-2" />
                              Upload Image
                            </Button>
                          </label>
                        </div>

                        <div className="flex gap-2 pt-2 justify-center">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="flex-1"
                            onClick={() => handleMaintenanceClick(eq)}
                          >
                            <Settings2 className="w-4 h-4 mr-1" />
                            Maintenance
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="flex-1"
                            onClick={() => handleAddToEstimator(eq)}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add to Estimate
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}

                  {filteredEquipment.length === 0 && (
                    <div className="col-span-full text-center py-12 text-gray-500">
                      No equipment found matching your criteria
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Equipment Estimator - Fixed Right Panel */}
        {estimatorOpen && (
          <EquipmentEstimator
            selectedEquipment={selectedEstimatorEquipment}
            onRemoveEquipment={handleRemoveFromEstimator}
            onUpdateDuration={handleUpdateDuration}
            onSaveEstimate={handleSaveEstimate}
            onExportEstimate={handleExportEstimate}
            onClose={handleCloseEstimator}
          />
        )}
      </div>

      {/* New Equipment Dialog */}
      <NewEquipmentDialog
        open={newEquipmentDialogOpen}
        onOpenChange={setNewEquipmentDialogOpen}
        onEquipmentCreated={fetchEquipment}
      />

      {/* Maintenance Dialog */}
      {selectedEquipment && (
        <MaintenanceDialog
          equipmentId={selectedEquipment.id}
          equipmentName={selectedEquipment.name}
          open={maintenanceDialogOpen}
          onOpenChange={setMaintenanceDialogOpen}
        />
      )}

      {/* Edit Equipment Dialog */}
      {editingEquipment && (
        <EditEquipmentDialog
          equipment={editingEquipment}
          open={!!editingEquipment}
          onOpenChange={(open) => !open && setEditingEquipment(null)}
          onEquipmentUpdated={fetchEquipment}
        />
      )}

      {/* All Maintenance View */}
      <AllMaintenanceView
        open={allMaintenanceOpen}
        onOpenChange={setAllMaintenanceOpen}
      />
    </Layout>
  );
}
