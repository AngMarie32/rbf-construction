import { sortProjectsOpenFirst } from '@/utils/projectOrder';

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { EmptyState } from '@/components/ui/empty-state';
import { StockPhotoCredits } from '@/components/equipment/StockPhotoCredits';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Grid3X3, List, Truck, Wrench, Calculator, Cpu, CheckCircle2, Activity, DollarSign } from 'lucide-react';
import { PageHero, heroButton } from '@/components/ui/page-hero';
import { AccentStat } from '@/components/ui/accent-stat';
import { cn } from '@/lib/utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
    allEquipment,
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
  const [confirmBulkDelete, setConfirmBulkDelete] = useState(false);
  const [serviceDue, setServiceDue] = useState<{ overdue: number; soon: number }>({ overdue: 0, soon: 0 });
  
  const locations = Array.from(new Set(
    equipment.map(eq => eq.location).filter(Boolean)
  )) as string[];

  useEffect(() => {
    fetchProjects();
    // Upcoming service from the latest maintenance entry per unit
    supabase
      .from('maintenance_logs')
      .select('equipment_id, date, next_due')
      .order('date', { ascending: false })
      .then(({ data }) => {
        const latest = new Map<string, string | null>();
        (data || []).forEach((r: any) => !latest.has(r.equipment_id) && latest.set(r.equipment_id, r.next_due));
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        let overdue = 0;
        let soon = 0;
        latest.forEach((due) => {
          if (!due) return;
          const days = (new Date(`${due.slice(0, 10)}T00:00:00`).getTime() - today.getTime()) / 86400000;
          if (days < 0) overdue++;
          else if (days <= 14) soon++;
        });
        setServiceDue({ overdue, soon });
      });
  }, []);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, status')
        .is('archived_at', null)
        .order('name');

      if (error) throw error;
      setProjects(sortProjectsOpenFirst(data || []));
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

  // The estimator panel saves/exports and shows its own confirmation.
  const handleSaveEstimate = () => {};
  const handleExportEstimate = () => {};

  const handleCloseEstimator = () => {
    setEstimatorOpen(false);
  };

  const handleBulkDelete = () => setConfirmBulkDelete(true);

  const doBulkDelete = async () => {
    {
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
    if (selectedItems.length === 1) {
      const eq = allEquipment.find((e) => e.id === selectedItems[0]);
      if (eq) return handleMaintenanceClick(eq);
    }
    setMaintenanceViewOpen(true);
  };

  const fleet = {
    total: allEquipment.length,
    available: allEquipment.filter((e) => e.status === 'Available').length,
    inUse: allEquipment.filter((e) => e.status === 'In Use').length,
    shop: allEquipment.filter((e) => e.status === 'Maintenance').length,
    value: allEquipment.reduce((s, e) => s + (Number(e.value) || 0), 0),
  };
  const utilization = fleet.total ? Math.round((fleet.inUse / fleet.total) * 100) : 0;
  const money0 = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

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
    <Layout hideTitle title="Equipment">
      <div className="flex">
        <div className={`transition-all duration-300 ${estimatorOpen ? 'mr-96' : 'mr-0'} flex-1`}>
          <div className="space-y-6">
            <PageHero
              eyebrow="Equipment"
              title="Fleet"
              subtitle="Machines, trucks and tools: where they are, what they cost to run, and when they need service."
              actions={
                <>
                  <NewEquipmentDialog onEquipmentCreated={fetchEquipment} />
                  <BulkEquipmentDialog onEquipmentCreated={fetchEquipment} />
                  <button type="button" className={heroButton} onClick={() => setMaintenanceViewOpen(true)}>
                    <Wrench className="h-4 w-4" /> Maintenance
                  </button>
                  <button type="button" className={heroButton} onClick={() => setEstimatorOpen(true)}>
                    <Calculator className="h-4 w-4" /> Estimator
                  </button>
                  <button type="button" className={heroButton} onClick={() => navigate('/equipment-insights')}>
                    <Cpu className="h-4 w-4" /> Intelligence
                  </button>
                </>
              }
              stats={[
                { label: 'Fleet value', value: money0(fleet.value) },
                { label: 'In use', value: `${utilization}%` },
              ]}
            />

            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
              {(
                [
                  { key: 'all', label: 'Units', value: fleet.total, icon: Truck, accent: 'blue', hint: 'Show all' },
                  { key: 'Available', label: 'Available', value: fleet.available, icon: CheckCircle2, accent: 'emerald', hint: 'Ready to assign' },
                  { key: 'In Use', label: 'In use', value: fleet.inUse, icon: Activity, accent: 'indigo', hint: `${utilization}% utilization` },
                  { key: 'Maintenance', label: 'In the shop', value: fleet.shop, icon: Wrench, accent: 'amber', hint: 'Status: Maintenance' },
                ] as const
              ).map((c) => (
                <button
                  key={c.key}
                  type="button"
                  onClick={() => updateFilters({ status: filters.status === c.key ? 'all' : c.key })}
                  className={cn('rounded-xl text-left transition-shadow hover:shadow-md', filters.status === c.key && c.key !== 'all' && 'ring-2 ring-orange-500')}
                >
                  <AccentStat label={c.label} value={c.value} icon={c.icon} accent={c.accent} hint={c.hint} />
                </button>
              ))}
              <button type="button" onClick={() => setMaintenanceViewOpen(true)} className="col-span-2 rounded-xl text-left transition-shadow hover:shadow-md lg:col-span-1">
                <AccentStat
                  label="Service due"
                  value={serviceDue.overdue + serviceDue.soon}
                  icon={AlertTriangle}
                  accent="rose"
                  tone={serviceDue.overdue ? 'bad' : serviceDue.soon ? 'warn' : undefined}
                  hint={serviceDue.overdue ? `${serviceDue.overdue} overdue · ${serviceDue.soon} in 14 days` : `${serviceDue.soon} in the next 14 days`}
                />
              </button>
            </div>

            <div className="flex items-center justify-between gap-3">
              <p className="text-sm text-muted-foreground">
                {equipment.length === fleet.total ? `${fleet.total} units` : `${equipment.length} of ${fleet.total} units match the filters`}
              </p>
              <div className="flex rounded-lg bg-muted p-1">
                <Button variant={viewMode === 'grid' ? 'secondary' : 'ghost'} size="sm" className="h-7" onClick={() => setViewMode('grid')} aria-label="Grid view">
                  <Grid3X3 className="h-4 w-4" />
                </Button>
                <Button variant={viewMode === 'list' ? 'secondary' : 'ghost'} size="sm" className="h-7" onClick={() => setViewMode('list')} aria-label="List view">
                  <List className="h-4 w-4" />
                </Button>
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
                <div className="col-span-full">
                  <EmptyState
                    icon={AlertTriangle}
                    title="Add your first piece of equipment"
                    description="List the machines, trucks and tools you own or rent to track maintenance, hours and the true cost of using them on each job."
                    actionSlot={<NewEquipmentDialog onEquipmentCreated={fetchEquipment} />}
                  />
                </div>
              )}
            </div>
            {equipment.length > 0 && (
              <div className="mt-6 text-center"><StockPhotoCredits /></div>
            )}
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

      <AlertDialog open={confirmBulkDelete} onOpenChange={setConfirmBulkDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedItems.length} unit{selectedItems.length === 1 ? '' : 's'}?</AlertDialogTitle>
            <AlertDialogDescription>The selected equipment and its history will be removed. This can't be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                setConfirmBulkDelete(false);
                doBulkDelete();
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

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
