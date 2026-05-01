
import React, { useState, useEffect, useCallback } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Edit, Users, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Mail, MapPin, Building, Phone } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { format } from "date-fns"
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { EditSubcontractorDialog } from '@/components/subcontractors/EditSubcontractorDialog';
import { AddSubcontractorDialog } from '@/components/subcontractors/AddSubcontractorDialog';
import { DocumentIssues } from '@/components/subcontractors/DocumentIssues';
import { SendForSignatureButton } from '@/components/esign/SendForSignatureButton';

interface Subcontractor {
  id: string;
  name: string;
  company: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  specialties: string[] | null;
  status: string;
  rating: number | null;
  notes: string | null;
  w9_on_file: boolean;
  insurance_expiry: string | null;
  travel_radius: number | null;
  region: string | null;
}

type SortField = 'company' | 'name' | 'specialties' | 'region' | 'insurance_expiry' | 'w9_on_file';
type SortDirection = 'asc' | 'desc' | null;

export default function Subcontractors() {
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [filteredSubcontractors, setFilteredSubcontractors] = useState<Subcontractor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [selectedRegion, setSelectedRegion] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [editingSubcontractor, setEditingSubcontractor] = useState<Subcontractor | null>(null);
  const [showDocumentIssues, setShowDocumentIssues] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Sorting state
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const specialties = [
    'Concrete', 'Electrical', 'HVAC', 'Insulation', 'Landscaping', 'Masonry',
    'Painting', 'Plumbing', 'Roofing', 'Siding', 'Tile/Flooring', 'Windows/Doors'
  ].sort();

  // Get unique regions from subcontractors
  const regions = [...new Set(subcontractors.map(s => s.region).filter(Boolean))].sort() as string[];

  const fetchSubcontractors = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('subcontractors')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      // Add region property with default value if not present in database
      const subsWithRegion = (data || []).map(sub => ({
        ...sub,
        region: (sub as any).region || null
      }));
      setSubcontractors(subsWithRegion);
    } catch (error) {
      console.error('Error fetching subcontractors:', error);
      toast.error('Failed to load subcontractors');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSubcontractors();
  }, [fetchSubcontractors]);

  useEffect(() => {
    let filtered = [...subcontractors];

    // Search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name?.toLowerCase().includes(search) ||
          s.company?.toLowerCase().includes(search) ||
          s.email?.toLowerCase().includes(search) ||
          s.phone?.toLowerCase().includes(search) ||
          s.region?.toLowerCase().includes(search) ||
          s.specialties?.some(sp => sp.toLowerCase().includes(search))
      );
    }

    // Status filter
    if (selectedStatus !== 'All') {
      filtered = filtered.filter((s) => s.status === selectedStatus);
    }

    // Specialties filter
    if (selectedSpecialties.length > 0) {
      filtered = filtered.filter(
        (s) => s.specialties && s.specialties.some((r) => selectedSpecialties.includes(r))
      );
    }

    // Region filter
    if (selectedRegion !== 'All') {
      filtered = filtered.filter((s) => s.region === selectedRegion);
    }

    // Sorting
    if (sortField && sortDirection) {
      filtered.sort((a, b) => {
        let aVal: any;
        let bVal: any;

        switch (sortField) {
          case 'company':
            aVal = a.company?.toLowerCase() || '';
            bVal = b.company?.toLowerCase() || '';
            break;
          case 'name':
            aVal = a.name?.toLowerCase() || '';
            bVal = b.name?.toLowerCase() || '';
            break;
          case 'specialties':
            aVal = a.specialties?.join(', ').toLowerCase() || '';
            bVal = b.specialties?.join(', ').toLowerCase() || '';
            break;
          case 'region':
            aVal = a.region?.toLowerCase() || '';
            bVal = b.region?.toLowerCase() || '';
            break;
          case 'insurance_expiry':
            aVal = a.insurance_expiry || '';
            bVal = b.insurance_expiry || '';
            break;
          case 'w9_on_file':
            aVal = a.w9_on_file ? 1 : 0;
            bVal = b.w9_on_file ? 1 : 0;
            break;
          default:
            return 0;
        }

        if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
        return 0;
      });
    }

    setFilteredSubcontractors(filtered);
  }, [subcontractors, searchTerm, selectedStatus, selectedSpecialties, selectedRegion, sortField, sortDirection]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDirection === 'asc') {
        setSortDirection('desc');
      } else if (sortDirection === 'desc') {
        setSortField(null);
        setSortDirection(null);
      }
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" />;
    }
    if (sortDirection === 'asc') {
      return <ArrowUp className="w-4 h-4 ml-1" />;
    }
    return <ArrowDown className="w-4 h-4 ml-1" />;
  };

  const deleteSubcontractor = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subcontractor?')) {
      return;
    }

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

  const clearFilters = () => {
    setSearchTerm('');
    setSelectedStatus('All');
    setSelectedSpecialties([]);
    setSelectedRegion('All');
    setSortField(null);
    setSortDirection(null);
  };

  const hasActiveFilters = searchTerm || selectedStatus !== 'All' || selectedSpecialties.length > 0 || selectedRegion !== 'All';

  if (showDocumentIssues) {
    return (
      <Layout title="Document Issues" subtitle="Manage subcontractor document compliance">
        <DocumentIssues onBack={() => setShowDocumentIssues(false)} />
      </Layout>
    );
  }

  return (
    <Layout title="Subcontractors" subtitle="Manage your network of subcontractors">
      <div className="space-y-6">
        {/* Controls */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 flex-1">
            <Input
              type="search"
              placeholder="Search subcontractors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="max-w-sm"
            />
          </div>

          <div className="flex items-center flex-wrap gap-2">
            <AddSubcontractorDialog onSubcontractorCreated={fetchSubcontractors} />
            
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Statuses</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
                <SelectItem value="Suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>

            <Select value={selectedRegion} onValueChange={setSelectedRegion}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="Region" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Regions</SelectItem>
                {regions.map(region => (
                  <SelectItem key={region} value={region}>{region}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm">
                  <Users className="w-4 h-4 mr-2" />
                  Specialties {selectedSpecialties.length > 0 && `(${selectedSpecialties.length})`}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-56 p-2" align="end">
                <div className="space-y-1">
                  <div className="font-medium text-sm mb-2">Filter Specialties</div>
                  {specialties.map((specialty) => (
                    <div
                      key={specialty}
                      className="flex items-center justify-between p-2 hover:bg-muted rounded cursor-pointer"
                      onClick={() => {
                        if (selectedSpecialties.includes(specialty)) {
                          setSelectedSpecialties(selectedSpecialties.filter((s) => s !== specialty));
                        } else {
                          setSelectedSpecialties([...selectedSpecialties, specialty]);
                        }
                      }}
                    >
                      <span className="text-sm">{specialty}</span>
                      <Checkbox
                        checked={selectedSpecialties.includes(specialty)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedSpecialties([...selectedSpecialties, specialty]);
                          } else {
                            setSelectedSpecialties(selectedSpecialties.filter((s) => s !== specialty));
                          }
                        }}
                      />
                    </div>
                  ))}
                  {selectedSpecialties.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="w-full mt-2"
                      onClick={() => setSelectedSpecialties([])}
                    >
                      Clear All
                    </Button>
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={clearFilters}>
                Clear Filters
              </Button>
            )}

            <Switch id="list-view" checked={viewMode === 'list'} onCheckedChange={(checked) => setViewMode(checked ? 'list' : 'grid')} />
            <Label htmlFor="list-view" className="text-sm">
              {viewMode === 'list' ? 'List View' : 'Grid View'}
            </Label>
          </div>
        </div>

        {/* Subcontractors Content */}
        {viewMode === 'list' ? (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('company')}
                    >
                      <div className="flex items-center">
                        COMPANY
                        {getSortIcon('company')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('name')}
                    >
                      <div className="flex items-center">
                        CONTACT
                        {getSortIcon('name')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('specialties')}
                    >
                      <div className="flex items-center">
                        SPECIALTIES
                        {getSortIcon('specialties')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('region')}
                    >
                      <div className="flex items-center">
                        REGION
                        {getSortIcon('region')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('insurance_expiry')}
                    >
                      <div className="flex items-center">
                        INSURANCE
                        {getSortIcon('insurance_expiry')}
                      </div>
                    </TableHead>
                    <TableHead 
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleSort('w9_on_file')}
                    >
                      <div className="flex items-center">
                        W9
                        {getSortIcon('w9_on_file')}
                      </div>
                    </TableHead>
                    <TableHead>ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubcontractors.map((subcontractor) => (
                    <TableRow key={subcontractor.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{subcontractor.company?.charAt(0).toUpperCase() || subcontractor.name?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
                          </Avatar>
                          <span>{subcontractor.company || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell>{subcontractor.name || 'N/A'}</TableCell>
                      <TableCell>
                        {subcontractor.specialties ? subcontractor.specialties.join(', ') : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {subcontractor.region ? (
                          <Badge variant="outline">{subcontractor.region}</Badge>
                        ) : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {subcontractor.insurance_expiry ? format(new Date(subcontractor.insurance_expiry), 'MMM dd, yyyy') : 'N/A'}
                      </TableCell>
                      <TableCell>
                        {subcontractor.w9_on_file ? 'Yes' : 'No'}
                      </TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setEditingSubcontractor(subcontractor)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <SendForSignatureButton
                            source="subcontractor"
                            sourceId={subcontractor.id}
                            title={`Subcontractor Agreement – ${subcontractor.company || subcontractor.name}`}
                            company={subcontractor.company || subcontractor.name}
                            documentType="Subcontract"
                            variant="outline"
                            size="sm"
                            iconOnly
                          />
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => deleteSubcontractor(subcontractor.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            Delete
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              
              {filteredSubcontractors.length === 0 && (
                <div className="text-center py-12">
                  <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No subcontractors found</h3>
                  <p className="text-gray-500 mb-6">Start building your network of trusted subcontractors.</p>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSubcontractors.map((subcontractor) => (
              <Card key={subcontractor.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <div className="flex items-center">
                    <Avatar className="mr-4">
                      <AvatarFallback>{subcontractor.company?.charAt(0).toUpperCase() || subcontractor.name?.charAt(0).toUpperCase() || '?'}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <CardTitle className="text-lg font-semibold">{subcontractor.company || 'No Company'}</CardTitle>
                      {subcontractor.name && <div className="text-sm text-gray-500">Contact: {subcontractor.name}</div>}
                      {subcontractor.region && <Badge variant="outline">{subcontractor.region}</Badge>}
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Building className="w-4 h-4 text-gray-500" />
                    <span>{subcontractor.specialties ? subcontractor.specialties.join(', ') : 'N/A'}</span>
                  </div>
                  {(subcontractor.address || subcontractor.city || subcontractor.state) && (
                    <div className="flex items-center space-x-2">
                      <MapPin className="w-4 h-4 text-gray-500" />
                      <span>{[subcontractor.address, subcontractor.city, subcontractor.state].filter(Boolean).join(', ')}</span>
                    </div>
                  )}
                  {subcontractor.email && (
                    <div className="flex items-center space-x-2">
                      <Mail className="w-4 h-4 text-gray-500" />
                      <a href={`mailto:${subcontractor.email}`}>{subcontractor.email}</a>
                    </div>
                  )}
                  {subcontractor.phone && (
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-gray-500" />
                      <span>{subcontractor.phone}</span>
                    </div>
                  )}
                </CardContent>
                <CardFooter className="flex justify-end p-4">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingSubcontractor(subcontractor)}
                  >
                    View & Edit
                  </Button>
                </CardFooter>
              </Card>
            ))}
            
            {filteredSubcontractors.length === 0 && (
              <div className="col-span-full text-center py-12">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No subcontractors found</h3>
                <p className="text-gray-500 mb-6">Start building your network of trusted subcontractors.</p>
              </div>
            )}
          </div>
        )}

        {/* Edit Dialog */}
        {editingSubcontractor && (
          <EditSubcontractorDialog
            subcontractor={editingSubcontractor}
            open={!!editingSubcontractor}
            onOpenChange={(open) => !open && setEditingSubcontractor(null)}
            onSubcontractorUpdated={fetchSubcontractors}
          />
        )}
      </div>
    </Layout>
  );
}
