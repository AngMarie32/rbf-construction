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
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Edit, Trash2, Phone, Mail, MoreHorizontal, Grid3X3, List, Search, Filter, Calendar, ArrowUpDown, CheckCircle, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { BulkSubcontractorDialog } from '@/components/subcontractors/BulkSubcontractorDialog';

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
  travelRadius?: number;
  insuranceExpiry?: Date;
  notes?: string;
  w9OnFile?: boolean;
}

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
  'Tile Work',
  'Asphalt',
  'Other'
];

export default function Subcontractors() {
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubcontractor, setEditingSubcontractor] = useState<Subcontractor | null>(null);
  const [viewMode, setViewMode] = useState<'table' | 'grid'>('table');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortField, setSortField] = useState<string>('');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const [newSubcontractor, setNewSubcontractor] = useState({
    company: '',
    name: '',
    email: '',
    phone: '',
    specialty: '',
    travelRadius: '',
    insuranceExpiry: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    notes: '',
    w9OnFile: false
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
        travelRadius: sub.travel_radius,
        insuranceExpiry: sub.insurance_expiry ? new Date(sub.insurance_expiry) : undefined,
        notes: sub.notes,
        w9OnFile: sub.w9_on_file || false
      }));

      setSubcontractors(mappedSubcontractors);
    } catch (error) {
      console.error('Error fetching subcontractors:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveSubcontractor = async () => {
    if (!newSubcontractor.company || !newSubcontractor.name) {
      return;
    }

    try {
      const subcontractorData = {
        company: newSubcontractor.company || null,
        name: newSubcontractor.name || null,
        email: newSubcontractor.email || null,
        phone: newSubcontractor.phone || null,
        address: newSubcontractor.address || null,
        city: newSubcontractor.city || null,
        state: newSubcontractor.state || null,
        zip_code: newSubcontractor.zipCode || null,
        specialties: newSubcontractor.specialty ? [newSubcontractor.specialty] : null,
        travel_radius: newSubcontractor.travelRadius ? parseInt(newSubcontractor.travelRadius) : null,
        insurance_expiry: newSubcontractor.insuranceExpiry || null,
        notes: newSubcontractor.notes || null,
        w9_on_file: newSubcontractor.w9OnFile
      };

      if (editingSubcontractor) {
        const { error } = await supabase
          .from('subcontractors')
          .update(subcontractorData)
          .eq('id', editingSubcontractor.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('subcontractors')
          .insert(subcontractorData);

        if (error) throw error;
      }

      setDialogOpen(false);
      setEditingSubcontractor(null);
      resetForm();
      fetchSubcontractors();
    } catch (error) {
      console.error('Error saving subcontractor:', error);
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
      fetchSubcontractors();
    } catch (error) {
      console.error('Error deleting subcontractor:', error);
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
      travelRadius: subcontractor.travelRadius?.toString() || '',
      insuranceExpiry: subcontractor.insuranceExpiry?.toISOString().split('T')[0] || '',
      address: subcontractor.address || '',
      city: subcontractor.city || '',
      state: subcontractor.state || '',
      zipCode: subcontractor.zipCode || '',
      notes: subcontractor.notes || '',
      w9OnFile: subcontractor.w9OnFile || false
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
      travelRadius: '',
      insuranceExpiry: '',
      address: '',
      city: '',
      state: '',
      zipCode: '',
      notes: '',
      w9OnFile: false
    });
  };

  const getInsuranceStatus = (expiryDate?: Date) => {
    if (!expiryDate) return 'none';
    
    const today = new Date();
    const expiry = new Date(expiryDate);
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry <= 0) return 'expired';
    if (daysUntilExpiry <= 30) return 'warning';
    return 'valid';
  };

  const getInsuranceColor = (status: string) => {
    switch (status) {
      case 'expired': return 'text-red-600 font-semibold';
      case 'warning': return 'text-orange-600 font-semibold';
      case 'valid': return 'text-gray-600';
      default: return 'text-gray-400';
    }
  };

  let filteredAndSortedSubcontractors = subcontractors.filter(sub => {
    const matchesSearch = sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sub.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         sub.email?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  // Apply sorting
  if (sortField) {
    filteredAndSortedSubcontractors.sort((a, b) => {
      let aValue: any = '';
      let bValue: any = '';

      switch (sortField) {
        case 'company':
          aValue = a.company || '';
          bValue = b.company || '';
          break;
        case 'name':
          aValue = a.name;
          bValue = b.name;
          break;
        case 'specialty':
          aValue = (a.specialties && a.specialties[0]) || '';
          bValue = (b.specialties && b.specialties[0]) || '';
          break;
        case 'insurance':
          aValue = a.insuranceExpiry ? a.insuranceExpiry.getTime() : 0;
          bValue = b.insuranceExpiry ? b.insuranceExpiry.getTime() : 0;
          break;
        case 'travelRadius':
          aValue = a.travelRadius || 0;
          bValue = b.travelRadius || 0;
          break;
        default:
          return 0;
      }

      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }

      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  return (
    <Layout title="Subcontractors">
      <div className="space-y-6">
        {/* Header with Add Button */}
        <div className="flex justify-between items-center">
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
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="company">Company Name</Label>
                    <Input
                      id="company"
                      value={newSubcontractor.company}
                      onChange={(e) => setNewSubcontractor({ ...newSubcontractor, company: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="name">Contact Person</Label>
                    <Input
                      id="name"
                      value={newSubcontractor.name}
                      onChange={(e) => setNewSubcontractor({ ...newSubcontractor, name: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      value={newSubcontractor.email}
                      onChange={(e) => setNewSubcontractor({ ...newSubcontractor, email: e.target.value })}
                    />
                  </div>

                  <div>
                    <Label htmlFor="phone">Phone Number</Label>
                    <Input
                      id="phone"
                      value={newSubcontractor.phone}
                      onChange={(e) => setNewSubcontractor({ ...newSubcontractor, phone: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="specialty">Specialty</Label>
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
                    <Label htmlFor="travelRadius">Travel Radius (miles)</Label>
                    <Input
                      id="travelRadius"
                      type="number"
                      value={newSubcontractor.travelRadius}
                      onChange={(e) => setNewSubcontractor({ ...newSubcontractor, travelRadius: e.target.value })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="insuranceExpiry">Insurance Expiry Date</Label>
                    <Input
                      id="insuranceExpiry"
                      type="date"
                      value={newSubcontractor.insuranceExpiry}
                      onChange={(e) => setNewSubcontractor({ ...newSubcontractor, insuranceExpiry: e.target.value })}
                    />
                  </div>

                  <div className="flex items-center space-x-2 pt-6">
                    <Checkbox
                      id="w9OnFile"
                      checked={newSubcontractor.w9OnFile}
                      onCheckedChange={(checked) => setNewSubcontractor({ ...newSubcontractor, w9OnFile: checked as boolean })}
                    />
                    <Label htmlFor="w9OnFile" className="flex items-center gap-2">
                      <FileText className="w-4 h-4" />
                      W-9 on File
                    </Label>
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
                className="pl-10 w-80 pr-4 py-2"
              />
            </div>
          </div>
        </div>

        {/* Content */}
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="text-center py-8">Loading subcontractors...</div>
            ) : filteredAndSortedSubcontractors.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No subcontractors found. Add your first subcontractor to get started.
              </div>
            ) : viewMode === 'table' ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleSort('company')}
                        className="font-semibold"
                      >
                        Company
                        <ArrowUpDown className="w-3 h-3 ml-1" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleSort('specialty')}
                        className="font-semibold"
                      >
                        Specialty
                        <ArrowUpDown className="w-3 h-3 ml-1" />
                      </Button>
                    </TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleSort('travelRadius')}
                        className="font-semibold"
                      >
                        Travel Radius
                        <ArrowUpDown className="w-3 h-3 ml-1" />
                      </Button>
                    </TableHead>
                    <TableHead>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleSort('insurance')}
                        className="font-semibold"
                      >
                        Insurance
                        <ArrowUpDown className="w-3 h-3 ml-1" />
                      </Button>
                    </TableHead>
                    <TableHead>W-9 Status</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAndSortedSubcontractors.map((subcontractor) => (
                    <TableRow key={subcontractor.id}>
                      <TableCell>
                        <div className="font-medium">{subcontractor.company || 'N/A'}</div>
                      </TableCell>
                      <TableCell>
                        {(subcontractor.specialties && subcontractor.specialties[0]) || 'N/A'}
                      </TableCell>
                      <TableCell>
                        <div>
                          <div className="font-medium text-sm">{subcontractor.name || 'N/A'}</div>
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
                        </div>
                      </TableCell>
                      <TableCell>
                        {subcontractor.travelRadius ? `${subcontractor.travelRadius} miles` : 'Not set'}
                      </TableCell>
                      <TableCell>
                        {subcontractor.insuranceExpiry ? (
                          <div className={cn("flex items-center text-sm", getInsuranceColor(getInsuranceStatus(subcontractor.insuranceExpiry)))}>
                            <Calendar className="w-3 h-3 mr-1" />
                            {subcontractor.insuranceExpiry.toLocaleDateString()}
                          </div>
                        ) : (
                          <span className="text-gray-400">Not set</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {subcontractor.w9OnFile ? (
                          <div className="flex items-center text-green-600">
                            <CheckCircle className="w-4 h-4 mr-1" />
                            <span className="text-sm">On File</span>
                          </div>
                        ) : (
                          <div className="flex items-center text-red-600">
                            <FileText className="w-4 h-4 mr-1" />
                            <span className="text-sm">Missing</span>
                          </div>
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
                {filteredAndSortedSubcontractors.map((subcontractor) => (
                  <Card key={subcontractor.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{subcontractor.company}</CardTitle>
                          <p className="text-sm text-gray-600">{(subcontractor.specialties && subcontractor.specialties[0]) || 'N/A'}</p>
                        </div>
                        {subcontractor.w9OnFile ? (
                          <CheckCircle className="w-5 h-5 text-green-600" />
                        ) : (
                          <FileText className="w-5 h-5 text-red-600" />
                        )}
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
                        <div className={cn("text-xs", getInsuranceColor(getInsuranceStatus(subcontractor.insuranceExpiry)))}>
                          Insurance Expires: {subcontractor.insuranceExpiry.toLocaleDateString()}
                        </div>
                      )}

                      <div className="flex justify-end space-x-2">
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
