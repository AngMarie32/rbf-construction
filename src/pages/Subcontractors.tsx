
import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SubcontractorImportDialog } from '@/components/subcontractors/SubcontractorImportDialog';
import { SubcontractorForm } from '@/components/subcontractors/SubcontractorForm';
import { SubcontractorCard } from '@/components/subcontractors/SubcontractorCard';
import { SubcontractorFilters } from '@/components/subcontractors/SubcontractorFilters';

interface Subcontractor {
  id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  specialties: string[];
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  rating?: number;
  notes?: string;
  created_at: string;
}

export default function Subcontractors() {
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [filteredSubcontractors, setFilteredSubcontractors] = useState<Subcontractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubcontractor, setEditingSubcontractor] = useState<Subcontractor | null>(null);

  useEffect(() => {
    fetchSubcontractors();
  }, []);

  useEffect(() => {
    filterSubcontractors();
  }, [subcontractors, searchTerm, specialtyFilter]);

  const fetchSubcontractors = async () => {
    try {
      const { data, error } = await supabase
        .from('subcontractors')
        .select('*')
        .order('name');

      if (error) throw error;
      setSubcontractors(data || []);
    } catch (error) {
      console.error('Error fetching subcontractors:', error);
      toast.error('Failed to load subcontractors');
    } finally {
      setLoading(false);
    }
  };

  const filterSubcontractors = () => {
    let filtered = subcontractors;

    if (searchTerm) {
      filtered = filtered.filter(sub =>
        sub.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.specialties?.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (specialtyFilter !== 'all') {
      filtered = filtered.filter(sub => sub.specialties?.includes(specialtyFilter));
    }

    setFilteredSubcontractors(filtered);
  };

  const handleEdit = (subcontractor: Subcontractor) => {
    setEditingSubcontractor(subcontractor);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subcontractor?')) return;

    try {
      const { error } = await supabase
        .from('subcontractors')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Subcontractor deleted successfully');
      fetchSubcontractors();
    } catch (error) {
      console.error('Error deleting subcontractor:', error);
      toast.error('Failed to delete subcontractor');
    }
  };

  const handleFormClose = () => {
    setDialogOpen(false);
    setEditingSubcontractor(null);
  };

  if (loading) {
    return (
      <Layout title="Subcontractors" subtitle="Manage your subcontractor network">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Subcontractors" subtitle="Manage your subcontractor network">
      <div className="space-y-6">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
          <SubcontractorFilters
            searchTerm={searchTerm}
            onSearchChange={setSearchTerm}
            specialtyFilter={specialtyFilter}
            onSpecialtyChange={setSpecialtyFilter}
          />

          <div className="flex gap-2">
            <SubcontractorImportDialog onImportComplete={fetchSubcontractors} />
            <Button onClick={() => setDialogOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Subcontractor
            </Button>
          </div>
        </div>

        {/* Subcontractors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSubcontractors.map((subcontractor) => (
            <SubcontractorCard
              key={subcontractor.id}
              subcontractor={subcontractor}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}

          {filteredSubcontractors.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              {subcontractors.length === 0 ? (
                <div>
                  <p className="text-lg mb-4">No subcontractors yet</p>
                  <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Subcontractor
                  </Button>
                </div>
              ) : (
                <p>No subcontractors found matching your criteria</p>
              )}
            </div>
          )}
        </div>

        <SubcontractorForm
          open={dialogOpen}
          onOpenChange={handleFormClose}
          editingSubcontractor={editingSubcontractor}
          onSuccess={fetchSubcontractors}
        />
      </div>
    </Layout>
  );
}
