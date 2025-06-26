
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
  Plus, 
  Star, 
  StarOff, 
  Edit, 
  Trash2, 
  Mail, 
  Phone, 
  MapPin,
  Users,
  Filter,
  Download,
  Calendar,
  FileText,
  AlertTriangle,
  CheckCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { AddSubcontractorDialog } from '@/components/subcontractors/AddSubcontractorDialog';
import { BulkAddSubcontractorDialog } from '@/components/subcontractors/BulkAddSubcontractorDialog';

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
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [specialtyFilter, setSpecialtyFilter] = useState<string>('all');

  useEffect(() => {
    fetchSubcontractors();
  }, []);

  useEffect(() => {
    filterSubcontractors();
  }, [subcontractors, searchTerm, statusFilter, specialtyFilter]);

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

    if (statusFilter !== 'all') {
      filtered = filtered.filter(sub => sub.status === statusFilter);
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

  const updateSubcontractorStatus = async (id: string, newStatus: string) => {
    try {
      const { error } = await supabase
        .from('subcontractors')
        .update({ status: newStatus })
        .eq('id', id);

      if (error) throw error;

      toast.success(`Subcontractor ${newStatus.toLowerCase()}`);
      fetchSubcontractors();
    } catch (error) {
      console.error('Error updating subcontractor:', error);
      toast.error('Failed to update subcontractor');
    }
  };

  const exportToCSV = () => {
    const csvContent = [
      ['Name', 'Company', 'Email', 'Phone', 'Specialties', 'Status', 'Rating', 'W9 on File', 'Insurance Expiry'].join(','),
      ...filteredSubcontractors.map(sub => [
        `"${sub.name}"`,
        `"${sub.company || ''}"`,
        `"${sub.email || ''}"`,
        `"${sub.phone || ''}"`,
        `"${sub.specialties?.join(', ') || ''}"`,
        sub.status,
        sub.rating || '',
        sub.w9_on_file ? 'Yes' : 'No',
        sub.insurance_expiry || ''
      ].join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subcontractors-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-500';
      case 'Inactive': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getRatingStars = (rating: number | null) => {
    if (!rating) return null;
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  const getInsuranceStatus = (expiryDate: string | null) => {
    if (!expiryDate) return null;
    
    const expiry = new Date(expiryDate);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) {
      return <Badge variant="destructive">Expired</Badge>;
    } else if (daysUntilExpiry <= 30) {
      return <Badge className="bg-yellow-500">Expires Soon</Badge>;
    } else {
      return <Badge className="bg-green-500">Valid</Badge>;
    }
  };

  const activeSubcontractors = subcontractors.filter(s => s.status === 'Active').length;
  const inactiveSubcontractors = subcontractors.filter(s => s.status === 'Inactive').length;
  const expiringSoon = subcontractors.filter(s => {
    if (!s.insurance_expiry) return false;
    const expiry = new Date(s.insurance_expiry);
    const today = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return daysUntilExpiry <= 30 && daysUntilExpiry >= 0;
  }).length;

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

  return (
    <Layout title="Subcontractors" subtitle="Manage your network of subcontractors">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Subcontractors</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{subcontractors.length}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{activeSubcontractors}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Inactive</CardTitle>
              <Users className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-600">{inactiveSubcontractors}</div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Insurance Expiring</CardTitle>
              <AlertTriangle className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">{expiringSoon}</div>
            </CardContent>
          </Card>
        </div>

        {/* Controls */}
        <Card>
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
                
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full sm:w-32">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="Active">Active</SelectItem>
                    <SelectItem value="Inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
                
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
                <Button onClick={exportToCSV} variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                </Button>
                <BulkAddSubcontractorDialog onSubcontractorsCreated={fetchSubcontractors} />
                <AddSubcontractorDialog onSubcontractorCreated={fetchSubcontractors} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Subcontractors Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>NAME</TableHead>
                  <TableHead>COMPANY</TableHead>
                  <TableHead>CONTACT</TableHead>
                  <TableHead>SPECIALTIES</TableHead>
                  <TableHead>STATUS</TableHead>
                  <TableHead>RATING</TableHead>
                  <TableHead>COMPLIANCE</TableHead>
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
                      <Badge className={`${getStatusColor(subcontractor.status)} text-white`}>
                        {subcontractor.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        {getRatingStars(subcontractor.rating)}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs">W9:</span>
                          {subcontractor.w9_on_file ? (
                            <CheckCircle className="w-4 h-4 text-green-500" />
                          ) : (
                            <AlertTriangle className="w-4 h-4 text-yellow-500" />
                          )}
                        </div>
                        {subcontractor.insurance_expiry && (
                          <div className="flex items-center gap-2">
                            <span className="text-xs">Insurance:</span>
                            {getInsuranceStatus(subcontractor.insurance_expiry)}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            const newStatus = subcontractor.status === 'Active' ? 'Inactive' : 'Active';
                            updateSubcontractorStatus(subcontractor.id, newStatus);
                          }}
                        >
                          {subcontractor.status === 'Active' ? 'Deactivate' : 'Activate'}
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => deleteSubcontractor(subcontractor.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
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
                <AddSubcontractorDialog onSubcontractorCreated={fetchSubcontractors} />
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
