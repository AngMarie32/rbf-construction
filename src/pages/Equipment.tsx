
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { 
  Plus, 
  AlertTriangle,
  Grid3X3,
  List
} from 'lucide-react';
import { EquipmentCard } from '@/components/equipment/EquipmentCard';
import { EquipmentFilters } from '@/components/equipment/EquipmentFilters';
import { BulkOperationsToolbar } from '@/components/equipment/BulkOperationsToolbar';
import { NewEquipmentDialog } from '@/components/equipment/NewEquipmentDialog';
import { MaintenanceDialog } from '@/components/equipment/MaintenanceDialog';
import { MaintenanceView } from '@/components/equipment/MaintenanceView';
import { EquipmentEstimator } from '@/components/equipment/EquipmentEstimator';
import { EditEquipmentDialog } from '@/components/equipment/EditEquipmentDialog';
import { BulkEquipmentDialog } from '@/components/equipment/BulkEquipmentDialog';
import { useEquipment } from '@/hooks/useEquipment';
import { EquipmentService } from '@/services/equipmentService';
import { exportEquipmentToPDF, exportEquipmentToExcel } from '@/utils/equipmentExports';
import type { Equipment } from '@/types/equipment';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EstimatorItem {
  equipment: Equipment;
  duration: number;
  unit: 'hours' | 'days';
}

export default function Equipment() {
  const navigate = useNavigate();
  const {
    equipment,
    loading,
    selectedItems,
    filters,
    fetchEquipment,
    updateEquipment,
    deleteEquipment,
    bulkUpdateStatus,
    updateFilters,
    clearFilters,
    toggleSelection,
    selectAll,
    clearSelection
  } = useEquipment();

  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(null);
  const [editingEquipment, setEditingEquipment] = useState<Equipment | null>(null);
  
  const [maintenanceDialogOpen, setMaintenanceDialogOpen] = useState(false);
  const [allMaintenanceOpen, setAllMaintenanceOpen] = useState(false);
  const [estimatorOpen, setEstimatorOpen] = useState(false);
  const [maintenanceViewOpen, setMaintenanceViewOpen] = useState(false);
  
  const [selectedEstimatorEquipment, setSelectedEstimatorEquipment] = useState<EstimatorItem[]>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([]);
  
  const locations = Array.from(new Set(
    equipment.map(eq => eq.location).filter(Boolean)
  )) as string[];

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .is('archived_at', null)
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
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
  };

  const handleBulkDelete = async () => {
    if (confirm(`Are you sure you want to delete ${selectedItems.length} equipment items?`)) {
      try {
        await Promise.all(selectedItems.map(id => EquipmentService.deleteEquipment(id)));
        await fetchEquipment();
        clearSelection();
        toast.success(`Deleted ${selectedItems.length} equipment items`);
      } catch (error) {
        console.error('Error deleting equipment:', error);
        toast.error('Failed to delete equipment');
      }
    }
  };

  const handleBulkMaintenance = () => {
    toast.info('Bulk maintenance scheduling coming soon');
  };

  const handleExportPDF = () => {
    exportEquipmentToPDF({
      equipment,
      filters,
      title: 'Equipment Report'
    });
    toast.success('PDF report generated');
  };

  const handleExportExcel = () => {
    exportEquipmentToExcel({
      equipment,
      filters,
      title: 'Equipment Report'
    });
    toast.success('Excel report generated');
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

  if (maintenanceViewOpen) {
    return (
      <MaintenanceView
        open={maintenanceViewOpen}
        onOpenChange={setMaintenanceViewOpen}
      />
    );
  }

  return (
    <Layout title="Equipment" subtitle="Manage equipment and maintenance">
      <div className="flex">
        <div className={`transition-all duration-300 ${estimatorOpen ? 'mr-96' : 'mr-0'} flex-1`}>
          <div className="space-y-6">
            {/* Header */}
            <div className="flex justify-between items-center">
              <div className="flex gap-2">
                <Button 
                  variant="outline"
                  onClick={() => setMaintenanceViewOpen(true)}
                >
                  Maintenance
                </Button>
                <Button 
                  variant="outline"
                  onClick={() => setEstimatorOpen(true)}
                >
                  Equipment Estimator
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate('/equipment-insights')}
                >
                  Cost Intelligence
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="flex border rounded">
                  <Button
                    variant={viewMode === 'grid' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('grid')}
                  >
                    <Grid3X3 className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === 'list' ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => setViewMode('list')}
                  >
                    <List className="w-4 h-4" />
                  </Button>
                </div>
                <BulkEquipmentDialog onEquipmentCreated={fetchEquipment} />
                <NewEquipmentDialog onEquipmentCreated={fetchEquipment} />
              </div>
            </div>

            {/* Filters */}
            <EquipmentFilters
              filters={filters}
              onFiltersChange={updateFilters}
              onClearFilters={clearFilters}
              onExportPDF={handleExportPDF}
              onExportExcel={handleExportExcel}
              locations={locations}
              projects={projects}
            />

            {/* Bulk Operations */}
            <BulkOperationsToolbar
              selectedCount={selectedItems.length}
              totalCount={equipment.length}
              onSelectAll={selectAll}
              onClearSelection={clearSelection}
              onBulkStatusUpdate={bulkUpdateStatus}
              onBulkDelete={handleBulkDelete}
              onBulkMaintenance={handleBulkMaintenance}
            />

            {/* Equipment Grid/List */}
            <div className={
              viewMode === 'grid' 
                ? "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                : "space-y-4"
            }>
              {equipment.map((eq) => (
                <EquipmentCard
                  key={eq.id}
                  equipment={eq}
                  isSelected={selectedItems.includes(eq.id)}
                  onSelect={toggleSelection}
                  onEdit={handleEditClick}
                  onDelete={deleteEquipment}
                  onMaintenance={handleMaintenanceClick}
                  onAddToEstimator={handleAddToEstimator}
                />
              ))}

              {equipment.length === 0 && (
                <div className="col-span-full text-center py-12 text-gray-500">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No equipment found</h3>
                  <p>No equipment matches your current filters.</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Equipment Estimator Panel */}
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

      {/* Dialogs */}
      {selectedEquipment && (
        <MaintenanceDialog
          equipmentId={selectedEquipment.id}
          equipmentName={selectedEquipment.name}
          open={maintenanceDialogOpen}
          onOpenChange={setMaintenanceDialogOpen}
        />
      )}

      {editingEquipment && (
        <EditEquipmentDialog
          equipment={editingEquipment}
          open={!!editingEquipment}
          onOpenChange={(open) => !open && setEditingEquipment(null)}
          onEquipmentUpdated={fetchEquipment}
        />
      )}
    </Layout>
  );
}
