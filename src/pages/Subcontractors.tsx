import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  Search, 
  Mail, 
  Phone, 
  MapPin,
  Users,
  Grid3X3,
  List,
  AlertTriangle,
  Plus
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
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
  created_at: string;
}

export default function Subcontractors() {
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [filteredSubcontractors, setFilteredSubcontractors] = useState<Subcontractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [showDocumentIssues, setShowDocumentIssues] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

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
        sub.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.specialties?.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (specialtyFilter !== 'all') {
      filtered = filtered.filter(sub => 
        sub.specialties?.includes(specialtyFilter)
      );
    }

    setFilteredSubcontractors(filtered);
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

  const allSpecialties = [...new Set(subcontractors.flatMap(s => s.specialties || []))].sort();

  if (loading) {
    return (
      <Layout title="Subcontractors" subtitle="Manage your network of subcontractors">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

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
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Subcontractors</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{subcontractors.length}</div>
            </CardContent>
          </Card>
          
          <Card className="bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <Users className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {subcontractors.filter(s => s.status === 'Active').length}
              </div>
            </CardContent>
          </Card>
          
          <Card className="bg-white">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Document Issues</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">0</div>
              <Button 
                variant="link" 
                className="p-0 h-auto text-sm text-blue-600"
                onClick={() => setShowDocumentIssues(true)}
              >
                View Issues
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <Card className="bg-white">
          <CardContent className="pt-6">
            <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
              <div className="flex flex-col sm:flex-row gap-4 items-center flex-1">
                <div className="relative w-full sm:w-64">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search subcontractors..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                
                <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
                  <SelectTrigger className="w-full sm:w-48">
                    <SelectValue placeholder="Specialty" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Specialties</SelectItem>
                    {allSpecialties.map(specialty => (
                      <SelectItem key={specialty} value={specialty}>
                        {specialty}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex gap-2">
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
                <AddSubcontractorDialog onSubcontractorCreated={fetchSubcontractors} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subcontractors Content */}
        {viewMode === 'list' ? (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>CONTACT NAME</TableHead>
                    <TableHead>COMPANY</TableHead>
                    <TableHead>CONTACT INFO</TableHead>
                    <TableHead>SPECIALTIES</TableHead>
                    <TableHead>ACTIONS</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSubcontractors.map((subcontractor) => (
                    <TableRow key={subcontractor.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{subcontractor.name}</div>
                          {subcontractor.address && (
                            <div className="text-sm text-gray-500 flex items-center">
                              <MapPin className="w-3 h-3 mr-1" />
                              {subcontractor.city}, {subcontractor.state}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{subcontractor.company || '-'}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {subcontractor.email && (
                            <div className="flex items-center text-sm">
                              <Mail className="w-3 h-3 mr-1" />
                              {subcontractor.email}
                            </div>
                          )}
                          {subcontractor.phone && (
                            <div className="flex items-center text-sm">
                              <Phone className="w-3 h-3 mr-1" />
                              {subcontractor.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {subcontractor.specialties?.slice(0, 2).map((specialty, index) => (
                            <Badge key={index} variant="secondary" className="text-xs">
                              {specialty}
                            </Badge>
                          ))}
                          {subcontractor.specialties && subcontractor.specialties.length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{subcontractor.specialties.length - 2} more
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteSubcontractor(subcontractor.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Delete
                        </Button>
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
                  <AddSubcontractorDialog onSubcontractorCreated={fetchSubcontractors} />
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSubcontractors.map((subcontractor) => (
              <Card key={subcontractor.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-lg">{subcontractor.name}</h3>
                      {subcontractor.company && (
                        <p className="text-gray-600">{subcontractor.company}</p>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      {subcontractor.email && (
                        <div className="flex items-center text-sm">
                          <Mail className="w-4 h-4 mr-2" />
                          {subcontractor.email}
                        </div>
                      )}
                      {subcontractor.phone && (
                        <div className="flex items-center text-sm">
                          <Phone className="w-4 h-4 mr-2" />
                          {subcontractor.phone}
                        </div>
                      )}
                      {subcontractor.address && (
                        <div className="flex items-center text-sm">
                          <MapPin className="w-4 h-4 mr-2" />
                          {subcontractor.city}, {subcontractor.state}
                        </div>
                      )}
                    </div>

                    {subcontractor.specialties && subcontractor.specialties.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {subcontractor.specialties.map((specialty, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {specialty}
                          </Badge>
                        ))}
                      </div>
                    )}

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => deleteSubcontractor(subcontractor.id)}
                      className="w-full text-red-600 hover:text-red-700"
                    >
                      Delete
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            
            {filteredSubcontractors.length === 0 && (
              <div className="col-span-full text-center py-12">
                <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-gray-900 mb-2">No subcontractors found</h3>
                <p className="text-gray-500 mb-6">Start building your network of trusted subcontractors.</p>
                <AddSubcontractorDialog onSubcontractorCreated={fetchSubcontractors} />
              </div>
            )}
          </div>
        )}
      </div>
    </Layout>
  );
}
