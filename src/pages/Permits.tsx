
import React, { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FileCheck, Clock, AlertTriangle, CheckCircle } from 'lucide-react';
import { PermitCard } from '@/components/permits/PermitCard';
import { NewPermitDialog } from '@/components/permits/NewPermitDialog';
import { PermitFiltersComponent } from '@/components/permits/PermitFilters';
import { Permit, PermitFilters as PermitFiltersType } from '@/types/permits';

// Mock data for development
const mockPermits: Permit[] = [
  {
    id: '1',
    project_id: 'proj-1',
    permit_number: 'BP-2024-001',
    permit_type: 'Building',
    description: 'New residential construction - 2,400 sq ft',
    issuing_authority: 'City of Springfield Building Department',
    application_date: new Date('2024-01-15'),
    issued_date: new Date('2024-02-01'),
    expiration_date: new Date('2025-02-01'),
    status: 'Issued',
    fee_amount: 2500,
    fee_paid: true,
    notes: 'Includes foundation, framing, electrical rough-in',
    created_at: new Date('2024-01-10'),
    updated_at: new Date('2024-02-01'),
  },
  {
    id: '2',
    project_id: 'proj-1',
    permit_number: 'EP-2024-045',
    permit_type: 'Electrical',
    description: 'Electrical service upgrade - 200A panel',
    issuing_authority: 'County Electrical Inspector',
    application_date: new Date('2024-02-10'),
    status: 'Under Review',
    fee_amount: 150,
    fee_paid: true,
    notes: 'Waiting for inspector availability',
    created_at: new Date('2024-02-05'),
    updated_at: new Date('2024-02-10'),
  },
  {
    id: '3',
    project_id: 'proj-2',
    permit_type: 'Plumbing',
    description: 'Kitchen and bathroom renovation plumbing',
    issuing_authority: 'City of Springfield Plumbing Division',
    status: 'Not Applied',
    fee_amount: 200,
    fee_paid: false,
    notes: 'Need to submit plans first',
    created_at: new Date('2024-02-15'),
    updated_at: new Date('2024-02-15'),
  },
  {
    id: '4',
    project_id: 'proj-3',
    permit_number: 'DP-2024-012',
    permit_type: 'Demolition',
    description: 'Interior wall demolition',
    issuing_authority: 'City Building Department',
    application_date: new Date('2024-01-20'),
    issued_date: new Date('2024-01-25'),
    expiration_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // Expires in 15 days
    status: 'Issued',
    fee_amount: 75,
    fee_paid: true,
    created_at: new Date('2024-01-15'),
    updated_at: new Date('2024-01-25'),
  },
];

const mockProjects = [
  { id: 'proj-1', name: 'Springfield Residential' },
  { id: 'proj-2', name: 'Downtown Office Renovation' },
  { id: 'proj-3', name: 'Warehouse Expansion' },
];

export default function Permits() {
  const [permits, setPermits] = useState<Permit[]>(mockPermits);
  const [filteredPermits, setFilteredPermits] = useState<Permit[]>(mockPermits);
  const [filters, setFilters] = useState<PermitFiltersType>({});
  const [newPermitDialogOpen, setNewPermitDialogOpen] = useState(false);

  // Apply filters
  useEffect(() => {
    let filtered = permits;

    if (filters.project_id) {
      filtered = filtered.filter(permit => permit.project_id === filters.project_id);
    }
    
    if (filters.permit_type) {
      filtered = filtered.filter(permit => permit.permit_type === filters.permit_type);
    }
    
    if (filters.status) {
      filtered = filtered.filter(permit => permit.status === filters.status);
    }
    
    if (filters.expiring_soon) {
      const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      filtered = filtered.filter(permit => 
        permit.expiration_date && new Date(permit.expiration_date) <= thirtyDaysFromNow
      );
    }

    setFilteredPermits(filtered);
  }, [permits, filters]);

  const handlePermitCreated = () => {
    // In real implementation, this would refetch data
    console.log('Permit created successfully');
  };

  const handleEditPermit = (permit: Permit) => {
    console.log('Edit permit:', permit);
    // TODO: Implement edit dialog
  };

  const handleViewPermit = (permit: Permit) => {
    console.log('View permit:', permit);
    // TODO: Implement detailed view dialog
  };

  // Calculate summary stats
  const stats = {
    total: permits.length,
    issued: permits.filter(p => p.status === 'Issued').length,
    pending: permits.filter(p => ['Under Review', 'Application Submitted'].includes(p.status)).length,
    expiring: permits.filter(p => {
      if (!p.expiration_date) return false;
      const thirtyDaysFromNow = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      return new Date(p.expiration_date) <= thirtyDaysFromNow;
    }).length,
  };

  return (
    <Layout title="Permit Tracking" subtitle="Manage construction permits and compliance">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Permits</CardTitle>
              <FileCheck className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Issued</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.issued}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Pending</CardTitle>
              <Clock className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{stats.pending}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Expiring Soon</CardTitle>
              <AlertTriangle className="h-4 w-4 text-red-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-600">{stats.expiring}</div>
            </CardContent>
          </Card>
        </div>

        {/* Actions and Filters */}
        <div className="flex justify-between items-center">
          <PermitFiltersComponent
            filters={filters}
            onFiltersChange={setFilters}
            projects={mockProjects}
          />
          
          <Button onClick={() => setNewPermitDialogOpen(true)}>
            <Plus className="w-4 h-4 mr-2" />
            Add Permit
          </Button>
        </div>

        {/* Permits Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPermits.map((permit) => (
            <PermitCard
              key={permit.id}
              permit={permit}
              onEdit={handleEditPermit}
              onView={handleViewPermit}
            />
          ))}
        </div>

        {filteredPermits.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <FileCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No permits found</h3>
              <p className="text-muted-foreground mb-4">
                {Object.keys(filters).length > 0 
                  ? "Try adjusting your filters or add a new permit."
                  : "Get started by adding your first permit."
                }
              </p>
              <Button onClick={() => setNewPermitDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Permit
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      <NewPermitDialog
        open={newPermitDialogOpen}
        onOpenChange={setNewPermitDialogOpen}
        onPermitCreated={handlePermitCreated}
      />
    </Layout>
  );
}
