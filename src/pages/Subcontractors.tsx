
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
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Plus, Edit, Trash2, Phone, Mail, MoreHorizontal, Grid3X3, List, Search, Filter, Eye, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Subcontractor {
  id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  specialties?: string[];
  status: 'Active' | 'Inactive' | 'Blacklisted';
  travelRadius?: number;
  insuranceExpiry?: Date;
  notes?: string;
}

const STATUS_OPTIONS = [
  { value: 'Active', label: 'Active', color: 'bg-green-500' },
  { value: 'Inactive', label: 'Inactive', color: 'bg-gray-500' },
  { value: 'Blacklisted', label: 'Blacklisted', color: 'bg-red-500' }
];

const SPECIALTY_OPTIONS = [
  'Electrical',
  'Plumbing',
  'HVAC',
  'Concrete',
  'Framing',
  'Roofing',
  'Flooring',
  'Drywall',
  'Painting',
  'Landscaping',
  'Excavation',
  'Masonry',
  'Windows & Doors',
  'Insulation',
  'Tile Work'
];

export default function Subcontractors() {
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubcontractor, setEditingSubcontractor] = useState<Subcontractor | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('All Statuses');
  
  const [newSubcontractor, setNewSubcontractor] = useState({
    company: '',
    name: '',
    email: '',
    phone: '',
    specialty: '',
    status: 'Active' as 'Active' | 'Inactive' | 'Blacklisted',
    travelRadius: '',
    insuranceExpiry: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    notes: ''
  });

  useEffect(() => {
    fetchSubcontractors();
  }, []);

  const fetchSubcontractors = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('subcontractors')
        .select('*')
        .order('name');

      if (error) throw error;

      const mappedSubcontractors = (data || []).map(sub => ({
        id: sub.id,
        name: sub.name,
        company: sub.company,
        email: sub.email,
        phone: sub.phone,
        address: sub.address,
        city: sub.city,
        state: sub.state,
        zipCode: sub.zip_code,
        specialties: sub.specialties || [],
        status: sub.status as Subcontractor['status'],
        travelRadius: sub.travel_radius,
        insuranceExpiry: sub.insurance_expiry ? new Date(sub.insurance_expiry) : undefined,
        notes: sub.notes
      }));

      setSubcontractors(mappedSubcontractors);
    } catch (error) {
      console.error('Error fetching subcontractors:', error);
      toast.error('Failed to load subcontractors');
    } finally {
      setLoading(false);
    }
  };

  const saveSubcontractor = async () => {
    if (!newSubcontractor.company || !newSubcontractor.name) {
      toast.error('Please enter company name and contact person');
      return;
    }

    try {
      const subcontractorData = {
        company: newSubcontractor.company,
        name: newSubcontractor.name,
        email: newSubcontractor.email || null,
        phone: newSubcontractor.phone || null,
        address: newSubcontractor.address || null,
        city: newSubcontractor.city || null,
        state: newSubcontractor.state || null,
        zip_code: newSubcontractor.zipCode || null,
        specialties: newSubcontractor.specialty ? [newSubcontractor.specialty] : null,
        status: newSubcontractor.status,
        travel_radius: newSubcontractor.travelRadius ? parseInt(newSubcontractor.travelRadius) : null,
        insurance_expiry: newSubcontractor.insuranceExpiry || null,
        notes: newSubcontractor.notes || null
      };

      if (editingSubcontractor) {
        const { error } = await supabase
          .from('subcontractors')
          .update(subcontractorData)
          .eq('id', editingSubcontractor.id);

        if (error) throw error;
        toast.success('Subcontractor updated successfully');
      } else {
        const { error } = await supabase
          .from('subcontractors')
          .insert(subcontractorData);

        if (error) throw error;
        toast.success('Subcontractor created successfully');
      }

      setDialogOpen(false);
      setEditingSubcontractor(null);
      resetForm();
      fetchSubcontractors();
    } catch (error) {
      console.error('Error saving subcontractor:', error);
      toast.error('Failed to save subcontractor');
    }
  };

  const deleteSubcontractor = async (id: string) => {
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

  const editSubcontractor = (subcontractor: Subcontractor) => {
    setEditingSubcontractor(subcontractor);
    setNewSubcontractor({
      company: subcontractor.company || '',
      name: subcontractor.name,
      email: subcontractor.email || '',
      phone: subcontractor.phone || '',
      specialty: (subcontractor.specialties && subcontractor.specialties[0]) || '',
      status: subcontractor.status,
      travelRadius: subcontractor.travelRadius?.toString() || '',
      insuranceExpiry: subcontractor.insuranceExpiry?.toISOString().split('T')[0] || '',
      address: subcontractor.address || '',
      city: subcontractor.city || '',
      state: subcontractor.state || '',
      zipCode: subcontractor.zipCode || '',
      notes: subcontractor.notes || ''
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setNewSubcontractor({
      company: '',
      name: '',
      email: '',
      phone: '',
      specialty: '',
      status: 'Active',
      travelRadius: '',
      insuranceExpiry: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      notes: ''
    });
  };

  const getStatusColor = (status: string) => {
    return STATUS_OPTIONS.find(s => s.value === status)?.color || 'bg-gray-500';
  };

  const filteredSubcontractors = subcontractors.filter(sub => {
    const matchesSearch = sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sub.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sub.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All Statuses' || sub.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <Layout title="Subcontractors" subtitle="Manage and track subcontractor information">
      <div className="space-y-6">
        {/* Header with Add Button */}
        <div className="flex justify-between items-center">
          <h2 className="text-2xl font-bold">Subcontractor Directory</h2>
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => {
                setEditingSubcontractor(null);
                resetForm();
              }}>
                <Plus className="w-4 h-4 mr-2" />
                Add Subcontractor
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editingSubcontractor ? 'Edit Subcontractor' : 'Add New Subcontractor'}</DialogTitle>
                <p className="text-sm text-gray-600">Enter the subcontractor details. Required fields are marked with an asterisk.</p>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="company">Company Name *</Label>
                    <Input
                      id="company"
                      value={newSubcontractor.company}
                      onChange={(e) => setNewSubcontractor({ ...newSubcontractor, company: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="name">Contact Person *</Label>
                    <Input
                      id="name"
                      value={newSubcontractor.name}
                      onChange={(e) => setNewSubcontractor({ ...newSubcontractor, name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email Address *</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newSubcontractor.email}
                      onChange={(e) => setNewSubcontractor({ ...newSubcontractor, email: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number *</Label>
                    <Input
                      id="phone"
                      value={newSubcontractor.phone}
                      onChange={(e) => setNewSubcontractor({ ...newSubcontractor, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="specialty">Specialty *</Label>
                    <Select value={newSubcontractor.specialty} onValueChange={(value) => setNewSubcontractor({ ...newSubcontractor, specialty: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a specialty" />
                      </SelectTrigger>
                      <SelectContent>
                        {SPECIALTY_OPTIONS.map((specialty) => (
                          <SelectItem key={specialty} value={specialty}>
                            {specialty}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="status">Status</Label>
                    <Select value={newSubcontractor.status} onValueChange={(value: 'Active' | 'Inactive' | 'Blacklisted') => setNewSubcontractor({ ...newSubcontractor, status: value })}>
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="travelRadius">Travel Radius (miles)</Label>
                    <Input
                      id="travelRadius"
                      type="number"
                      value={newSubcontractor.travelRadius}
                      onChange={(e) => setNewSubcontractor({ ...newSubcontractor, travelRadius: e.target.value })}
                    />
                    <p className="text-xs text-gray-500 mt-1">Maximum travel distance from base location</p>
                  </div>

                  <div>
                    <Label htmlFor="insuranceExpiry">Insurance Expiry Date</Label>
                    <Input
                      id="insuranceExpiry"
                      type="date"
                      value={newSubcontractor.insuranceExpiry}
                      onChange={(e) => setNewSubcontractor({ ...newSubcontractor, insuranceExpiry: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={newSubcontractor.address}
                      onChange={(e) => setNewSubcontractor({ ...newSubcontractor, address: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="city">City</Label>
                    <Input
                      id="city"
                      value={newSubcontractor.city}
                      onChange={(e) => setNewSubcontractor({ ...newSubcontractor, city: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="state">State</Label>
                    <Input
                      id="state"
                      value={newSubcontractor.state}
                      onChange={(e) => setNewSubcontractor({ ...newSubcontractor, state: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="zipCode">Zip Code</Label>
                  <Input
                    id="zipCode"
                    value={newSubcontractor.zipCode}
                    onChange={(e) => setNewSubcontractor({ ...newSubcontractor, zipCode: e.target.value })}
                    className="w-32"
                  />
                </div>

                <div>
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    value={newSubcontractor.notes}
                    onChange={(e) => setNewSubcontractor({ ...newSubcontractor, notes: e.target.value })}
                    rows={3}
                  />
                </div>

                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={saveSubcontractor}>
                    {editingSubcontractor ? 'Update Subcontractor' : 'Add Subcontractor'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex border rounded-lg">
              <Button
                variant={viewMode === 'table' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('table')}
                className="rounded-r-none"
              >
                <List className="w-4 h-4 mr-1" />
                Table View
              </Button>
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
                className="rounded-l-none"
              >
                <Grid3X3 className="w-4 h-4 mr-1" />
                Grid View
              </Button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search subcontractors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All Statuses">All Statuses</SelectItem>
                {STATUS_OPTIONS.map((status) => (
                  <SelectItem key={status.value} value={status.value}>
                    {status.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Content */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-8">Loading subcontractors...</div>
            ) : filteredSubcontractors.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No subcontractors found. Add your first subcontractor to get started.
              </div>
            ) : viewMode === 'table' ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company</TableHead>
                    <TableHead>Specialty</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Travel Radius</TableHead>
                    <TableHead>Insurance</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubcontractors.map((subcontractor) => (
                    <TableRow key={subcontractor.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{subcontractor.company}</div>
                          <div className="text-sm text-gray-500">{subcontractor.name}</div>
                        </div>
                      </TableCell>
                      <TableCell>
                        {(subcontractor.specialties && subcontractor.specialties[0]) || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {subcontractor.email && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Mail className="w-3 h-3 mr-1" />
                              {subcontractor.email}
                            </div>
                          )}
                          {subcontractor.phone && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Phone className="w-3 h-3 mr-1" />
                              {subcontractor.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("text-white", getStatusColor(subcontractor.status))}>
                          {subcontractor.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {subcontractor.travelRadius ? `${subcontractor.travelRadius} miles` : 'Not set'}
                      </TableCell>
                      <TableCell>
                        {subcontractor.insuranceExpiry ? (
                          <div className="flex items-center text-sm">
                            <Calendar className="w-3 h-3 mr-1" />
                            {subcontractor.insuranceExpiry.toLocaleDateString()}
                          </div>
                        ) : (
                          'Not set'
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="w-4 h-4 mr-2" />
                              View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => editSubcontractor(subcontractor)}>
                              <Edit className="w-4 h-4 mr-2" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => deleteSubcontractor(subcontractor.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-6">
                {filteredSubcontractors.map((subcontractor) => (
                  <Card key={subcontractor.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{subcontractor.company}</CardTitle>
                          <p className="text-sm text-gray-600">{(subcontractor.specialties && subcontractor.specialties[0]) || 'N/A'}</p>
                        </div>
                        <Badge className={cn("text-white text-xs", getStatusColor(subcontractor.status))}>
                          {subcontractor.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="font-medium text-sm">{subcontractor.name}</p>
                        {subcontractor.phone && (
                          <p className="text-sm text-gray-600">{subcontractor.phone}</p>
                        )}
                        {subcontractor.email && (
                          <p className="text-sm text-gray-600">{subcontractor.email}</p>
                        )}
                      </div>

                      {subcontractor.insuranceExpiry && (
                        <div className="text-xs text-gray-500">
                          Insurance Expires: {subcontractor.insuranceExpiry.toLocaleDateString()}
                        </div>
                      )}

                      <div className="flex justify-end space-x-2">
                        <Button variant="ghost" size="sm">
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => editSubcontractor(subcontractor)}>
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => deleteSubcontractor(subcontractor.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
