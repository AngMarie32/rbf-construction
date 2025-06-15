
import { useState, useEffect } from 'react';
import { EquipmentService } from '@/services/equipmentService';
import type { Equipment, EquipmentFilters } from '@/types/equipment';
import { toast } from 'sonner';

export function useEquipment() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [filteredEquipment, setFilteredEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedItems, setSelectedItems] = useState<string[]>([]);
  const [filters, setFilters] = useState<EquipmentFilters>({
    search: '',
    status: 'all',
    category: 'all',
    location: 'all',
    project: 'all',
    maintenanceDue: false,
    availableOnly: false
  });

  const fetchEquipment = async () => {
    try {
      setLoading(true);
      const data = await EquipmentService.fetchEquipment();
      setEquipment(data);
    } catch (error) {
      console.error('Error fetching equipment:', error);
      toast.error('Failed to fetch equipment');
    } finally {
      setLoading(false);
    }
  };

  const updateEquipment = async (id: string, updates: Partial<Equipment>) => {
    try {
      await EquipmentService.updateEquipment(id, updates);
      await fetchEquipment();
      toast.success('Equipment updated successfully');
    } catch (error) {
      console.error('Error updating equipment:', error);
      toast.error('Failed to update equipment');
    }
  };

  const deleteEquipment = async (id: string) => {
    try {
      await EquipmentService.deleteEquipment(id);
      await fetchEquipment();
      toast.success('Equipment deleted successfully');
    } catch (error) {
      console.error('Error deleting equipment:', error);
      toast.error('Failed to delete equipment');
    }
  };

  const bulkUpdateStatus = async (status: Equipment['status']) => {
    try {
      await EquipmentService.bulkUpdateStatus(selectedItems, status);
      await fetchEquipment();
      setSelectedItems([]);
      toast.success(`Updated ${selectedItems.length} equipment items`);
    } catch (error) {
      console.error('Error bulk updating equipment:', error);
      toast.error('Failed to update equipment');
    }
  };

  const applyFilters = () => {
    let filtered = equipment;

    // Search filter
    if (filters.search) {
      const search = filters.search.toLowerCase();
      filtered = filtered.filter(eq =>
        eq.name.toLowerCase().includes(search) ||
        eq.category.toLowerCase().includes(search) ||
        eq.description?.toLowerCase().includes(search) ||
        eq.location?.toLowerCase().includes(search)
      );
    }

    // Status filter
    if (filters.status !== 'all') {
      filtered = filtered.filter(eq => eq.status === filters.status);
    }

    // Category filter
    if (filters.category !== 'all') {
      filtered = filtered.filter(eq => eq.category === filters.category);
    }

    // Location filter
    if (filters.location !== 'all') {
      filtered = filtered.filter(eq => eq.location === filters.location);
    }

    // Available only filter
    if (filters.availableOnly) {
      filtered = filtered.filter(eq => eq.status === 'Available');
    }

    setFilteredEquipment(filtered);
  };

  const updateFilters = (newFilters: Partial<EquipmentFilters>) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
  };

  const clearFilters = () => {
    setFilters({
      search: '',
      status: 'all',
      category: 'all',
      location: 'all',
      project: 'all',
      maintenanceDue: false,
      availableOnly: false
    });
  };

  const toggleSelection = (equipmentId: string) => {
    setSelectedItems(prev =>
      prev.includes(equipmentId)
        ? prev.filter(id => id !== equipmentId)
        : [...prev, equipmentId]
    );
  };

  const selectAll = () => {
    setSelectedItems(filteredEquipment.map(eq => eq.id));
  };

  const clearSelection = () => {
    setSelectedItems([]);
  };

  useEffect(() => {
    fetchEquipment();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [equipment, filters]);

  return {
    equipment: filteredEquipment,
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
  };
}
