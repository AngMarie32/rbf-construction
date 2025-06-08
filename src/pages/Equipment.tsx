
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
  Building
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { NewEquipmentDialog } from '@/components/equipment/NewEquipmentDialog';
import { MaintenanceDialog } from '@/components/equipment/MaintenanceDialog';
import { AllMaintenanceView } from '@/components/equipment/AllMaintenanceView';
import { EquipmentEstimator } from '@/components/equipment/EquipmentEstimator';

interface Equipment {
  id: string;
  name: string;
  category: string;
  hourly_rate: number;
  year?: number;
  value?: number;
  status: string;
  image?: string;
  description?: string;
  created_at: string;
  updated_at: string;
}

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
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [allMaintenanceOpen, setAllMaintenanceOpen] = useState(false);
  const [estimatorOpen, setEstimatorOpen] = useState(false);
  const [selectedEstimatorEquipment, setSelectedEstimatorEquipment] = useState<EstimatorItem[]>([]);
  const [viewMode, setViewMode] = useState<'equipment' | 'maintenance' | 'estimator'>('equipment');

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
      setEquipment(data || []);
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
    // Save functionality already implemented in EquipmentEstimator
  };

  const handleExportEstimate = () => {
    // Export functionality already implemented in EquipmentEstimator
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
            <NewEquipmentDialog onEquipmentCreated={fetchEquipment} />
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
                      <Badge className={`${getStatusColor(eq.status)} text-white`}>
                        {eq.status}
                      </Badge>
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

                    <div className="flex gap-2 pt-2">
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

        {/* Maintenance Dialog */}
        {selectedEquipment && (
          <MaintenanceDialog
            equipmentId={selectedEquipment.id}
            equipmentName={selectedEquipment.name}
            open={maintenanceDialogOpen}
            onOpenChange={setMaintenanceDialogOpen}
          />
        )}

        {/* All Maintenance View */}
        <AllMaintenanceView
          open={allMaintenanceOpen}
          onOpenChange={setAllMaintenanceOpen}
        />

        {/* Equipment Estimator */}
        {estimatorOpen && (
          <EquipmentEstimator
            selectedEquipment={selectedEstimatorEquipment}
            onRemoveEquipment={handleRemoveFromEstimator}
            onUpdateDuration={handleUpdateDuration}
            onSaveEstimate={handleSaveEstimate}
            onExportEstimate={handleExportEstimate}
            onClose={() => setEstimatorOpen(false)}
          />
        )}
      </div>
    </Layout>
  );
}
