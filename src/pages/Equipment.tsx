
import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { NewEquipmentDialog } from '@/components/equipment/NewEquipmentDialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Filter, Settings, Trash2, Edit, Eye } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Equipment } from '@/types';

interface DatabaseEquipment {
  id: string;
  name: string;
  category: string | null;
  hourly_rate: number;
  year: number | null;
  value: number | null;
  status: string | null;
  image: string | null;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export default function EquipmentPage() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [filteredEquipment, setFilteredEquipment] = useState<Equipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  useEffect(() => {
    fetchEquipment();
  }, []);

  useEffect(() => {
    filterEquipment();
  }, [equipment, searchTerm, categoryFilter, statusFilter]);

  const fetchEquipment = async () => {
    try {
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      const mappedEquipment: Equipment[] = (data || []).map((dbEquipment: DatabaseEquipment) => ({
        id: dbEquipment.id,
        name: dbEquipment.name,
        category: (dbEquipment.category as Equipment['category']) || 'Other',
        hourlyRate: dbEquipment.hourly_rate,
        year: dbEquipment.year || new Date().getFullYear(),
        value: dbEquipment.value || 0,
        status: (dbEquipment.status as Equipment['status']) || 'Available',
        image: dbEquipment.image || undefined,
        description: dbEquipment.description || ''
      }));
      
      setEquipment(mappedEquipment);
    } catch (error) {
      console.error('Error fetching equipment:', error);
      toast.error('Failed to load equipment');
    } finally {
      setLoading(false);
    }
  };

  const filterEquipment = () => {
    let filtered = equipment;

    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    setFilteredEquipment(filtered);
  };

  const deleteEquipment = async (id: string) => {
    if (!confirm('Are you sure you want to delete this equipment?')) return;

    try {
      const { error } = await supabase
        .from('equipment')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Equipment deleted successfully');
      fetchEquipment();
    } catch (error) {
      console.error('Error deleting equipment:', error);
      toast.error('Failed to delete equipment');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available': return 'bg-green-100 text-green-800';
      case 'In Use': return 'bg-blue-100 text-blue-800';
      case 'Maintenance': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const categories = ['Heavy Machinery', 'Vehicles', 'Trailers', 'Other'];
  const totalValue = equipment.reduce((sum, item) => sum + item.value, 0);

  if (loading) {
    return (
      <Layout title="Equipment" subtitle="Manage your construction equipment">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Equipment" subtitle="Manage your construction equipment">
      <div className="space-y-6">
        {/* Header Actions */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search equipment..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[160px]">
                  <Filter className="w-4 h-4 mr-2" />
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="Available">Available</SelectItem>
                  <SelectItem value="In Use">In Use</SelectItem>
                  <SelectItem value="Maintenance">Maintenance</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <NewEquipmentDialog onEquipmentCreated={fetchEquipment} />
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">{equipment.length}</div>
              <p className="text-sm text-gray-600">Total Equipment</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-green-600">
                {equipment.filter(e => e.status === 'Available').length}
              </div>
              <p className="text-sm text-gray-600">Available</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold text-blue-600">
                {equipment.filter(e => e.status === 'In Use').length}
              </div>
              <p className="text-sm text-gray-600">In Use</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <div className="text-2xl font-bold">
                ${(totalValue / 1000000).toFixed(1)}M
              </div>
              <p className="text-sm text-gray-600">Total Value</p>
            </CardContent>
          </Card>
        </div>

        {/* Equipment Table */}
        <Card>
          <CardHeader>
            <CardTitle>Equipment ({filteredEquipment.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {filteredEquipment.length === 0 ? (
              <div className="text-center py-8">
                <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 text-lg mb-4">
                  {searchTerm || categoryFilter !== 'all' || statusFilter !== 'all' 
                    ? 'No equipment matches your filters' 
                    : 'No equipment found. Add your first equipment to get started!'}
                </p>
                {!searchTerm && categoryFilter === 'all' && statusFilter === 'all' && (
                  <NewEquipmentDialog onEquipmentCreated={fetchEquipment} />
                )}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Hourly Rate</TableHead>
                      <TableHead>Year</TableHead>
                      <TableHead>Value</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="w-[120px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredEquipment.map((item) => (
                      <TableRow key={item.id}>
                        <TableCell className="font-medium">
                          <div>
                            <div>{item.name}</div>
                            {item.description && (
                              <div className="text-sm text-gray-500 truncate max-w-[200px]">
                                {item.description}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">{item.category}</Badge>
                        </TableCell>
                        <TableCell>${item.hourlyRate}/hr</TableCell>
                        <TableCell>{item.year}</TableCell>
                        <TableCell>${item.value.toLocaleString()}</TableCell>
                        <TableCell>
                          <Badge className={getStatusColor(item.status)}>
                            {item.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="w-4 h-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              onClick={() => deleteEquipment(item.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
