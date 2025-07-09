
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
  TableCaption,
  TableCell,
  TableFooter,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Calendar } from 'lucide-react';
import { Edit, Users } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { MoreVertical, FileText, User, Phone, Mail, MapPin, Building } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { format } from "date-fns"
import { DateRange } from "react-day-picker"
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { EditSubcontractorDialog } from '@/components/subcontractors/EditSubcontractorDialog';
import { AddSubcontractorDialog } from '@/components/subcontractors/AddSubcontractorDialog';
import { DocumentIssues } from '@/components/subcontractors/DocumentIssues';

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
}

export default function Subcontractors() {
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [filteredSubcontractors, setFilteredSubcontractors] = useState<Subcontractor[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatus, setSelectedStatus] = useState<string>('All');
  const [selectedSpecialties, setSelectedSpecialties] = useState<string[]>([]);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [editingSubcontractor, setEditingSubcontractor] = useState<Subcontractor | null>(null);
  const [showDocumentIssues, setShowDocumentIssues] = useState(false);
  const [loading, setLoading] = useState(true);

  const [date, setDate] = React.useState<DateRange | undefined>({
    from: new Date(2023, 0, 20),
    to: new Date(2023, 0, 22),
  })

  const specialties = [
    'Concrete', 'Electrical', 'HVAC', 'Insulation', 'Landscaping', 'Masonry',
    'Painting', 'Plumbing', 'Roofing', 'Siding', 'Tile/Flooring', 'Windows/Doors'
  ].sort();

  const fetchSubcontractors = useCallback(async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('subcontractors')
        .select('*')
        .order('name', { ascending: true });

      if (error) throw error;
      setSubcontractors(data || []);
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

    if (searchTerm) {
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          (s.company && s.company.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (s.email && s.email.toLowerCase().includes(searchTerm.toLowerCase())) ||
          (s.phone && s.phone.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (selectedStatus !== 'All') {
      filtered = filtered.filter((s) => s.status === selectedStatus);
    }

    if (selectedSpecialties.length > 0) {
      filtered = filtered.filter(
        (s) => s.specialties && s.specialties.some((r) => selectedSpecialties.includes(r))
      );
    }

    setFilteredSubcontractors(filtered);
  }, [subcontractors, searchTerm, selectedStatus, selectedSpecialties]);

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

  // Calculate trades statistics
  const tradeStats = subcontractors.reduce((acc: { [key: string]: number }, s) => {
    s.specialties?.forEach((trade) => {
      acc[trade] = (acc[trade] || 0) + 1;
    });
    return acc;
  }, {});

  const topTrades = Object.entries(tradeStats)
    .sort(([a], [b]) => a.localeCompare(b)) // Sort alphabetically
    .slice(0, 4);

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
        {/* Trade Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {topTrades.map(([trade, count]) => (
            <Card key={trade} className="bg-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{trade}</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{count}</div>
                <p className="text-xs text-muted-foreground">subcontractors</p>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Controls */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center">
            <Input
              type="search"
              placeholder="Search subcontractors..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Button variant="outline" size="sm" className="ml-2">
              <Calendar className="w-4 h-4 mr-2" />
              Filters
            </Button>
          </div>

          <div className="flex items-center space-x-2">
            <AddSubcontractorDialog onSubcontractorCreated={fetchSubcontractors} />
            
            <Select value={selectedStatus} onValueChange={setSelectedStatus}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Statuses</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="Inactive">Inactive</SelectItem>
                <SelectItem value="Suspended">Suspended</SelectItem>
              </SelectContent>
            </Select>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Users className="w-4 h-4 mr-2" />
                  Specialties
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56">
                <DropdownMenuLabel>Filter Specialties</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {specialties.map((specialty) => (
                  <DropdownMenuItem key={specialty} className="p-2">
                    <label
                      htmlFor={`specialty-${specialty}`}
                      className="flex items-center justify-between w-full cursor-pointer"
                    >
                      {specialty}
                      <Checkbox
                        id={`specialty-${specialty}`}
                        checked={selectedSpecialties.includes(specialty)}
                        onCheckedChange={(checked) => {
                          if (checked) {
                            setSelectedSpecialties([...selectedSpecialties, specialty]);
                          } else {
                            setSelectedSpecialties(selectedSpecialties.filter((s) => s !== specialty));
                          }
                        }}
                      />
                    </label>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

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
                    <TableHead>COMPANY</TableHead>
                    <TableHead>CONTACT</TableHead>
                    <TableHead>SPECIALTIES</TableHead>
                    <TableHead>TRAVEL RADIUS</TableHead>
                    <TableHead>INSURANCE</TableHead>
                    <TableHead>W9</TableHead>
                    <TableHead>ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubcontractors.map((subcontractor) => (
                    <TableRow key={subcontractor.id}>
                      <TableCell>
                        <div className="flex items-center space-x-2">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback>{subcontractor.company?.charAt(0).toUpperCase() || subcontractor.name.charAt(0).toUpperCase()}</AvatarFallback>
                          </Avatar>
                          <span>{subcontractor.company || 'N/A'}</span>
                        </div>
                      </TableCell>
                      <TableCell>{subcontractor.name}</TableCell>
                      <TableCell>
                        {subcontractor.specialties ? subcontractor.specialties.join(', ') : 'N/A'}
                      </TableCell>
                      <TableCell>{subcontractor.travel_radius ? `${subcontractor.travel_radius} miles` : 'N/A'}</TableCell>
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
                      <AvatarFallback>{subcontractor.company?.charAt(0).toUpperCase() || subcontractor.name.charAt(0).toUpperCase()}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-1">
                      <CardTitle className="text-lg font-semibold">{subcontractor.name}</CardTitle>
                      <div className="text-sm text-gray-500">{subcontractor.company || 'N/A'}</div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Building className="w-4 h-4 text-gray-500" />
                    <span>{subcontractor.specialties ? subcontractor.specialties.join(', ') : 'N/A'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span>{subcontractor.address}, {subcontractor.city}, {subcontractor.state}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Mail className="w-4 h-4 text-gray-500" />
                    <a href={`mailto:${subcontractor.email}`}>{subcontractor.email}</a>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Phone className="w-4 h-4 text-gray-500" />
                    <span>{subcontractor.phone}</span>
                  </div>
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
