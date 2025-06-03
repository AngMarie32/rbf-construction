
import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { NewEquipmentDialog } from '@/components/equipment/NewEquipmentDialog';
import { MaintenanceDialog } from '@/components/equipment/MaintenanceDialog';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, Plus, Grid, List, MoreHorizontal, Wrench, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Equipment } from '@/types';
import { cn } from '@/lib/utils';

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
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedEquipment, setSelectedEquipment] = useState<string>('');
  const [showMaintenance, setShowMaintenance] = useState(false);

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

  const openMaintenance = (equipmentId: string) => {
    setSelectedEquipment(equipmentId);
    setShowMaintenance(true);
  };

  const categories = ['Heavy Machinery', 'Vehicles', 'Trailers', 'Other'];

  if (loading) {
    return (
      <Layout title="Equipment Tracker & Cost Estimator" subtitle="Manage and track equipment for your construction projects">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Equipment Tracker & Cost Estimator" subtitle="Manage and track equipment for your construction projects">
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
                  <SelectValue placeholder="All Equipment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Equipment</SelectItem>
                  {categories.map(category => (
                    <SelectItem key={category} value={category}>{category}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="All Status" />
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
          <div className="flex items-center space-x-2">
            <Button
              variant={viewMode === 'grid' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('grid')}
            >
              <Grid className="w-4 h-4" />
            </Button>
            <Button
              variant={viewMode === 'list' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setViewMode('list')}
            >
              <List className="w-4 h-4" />
            </Button>
            <NewEquipmentDialog onEquipmentCreated={fetchEquipment} />
          </div>
        </div>

        {/* Category Tabs */}
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg w-fit">
          <Button
            variant={categoryFilter === 'all' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setCategoryFilter('all')}
            className="rounded-md"
          >
            All Equipment
          </Button>
          {categories.map(category => (
            <Button
              key={category}
              variant={categoryFilter === category ? 'default' : 'ghost'}
              size="sm"
              onClick={() => setCategoryFilter(category)}
              className="rounded-md"
            >
              {category}
            </Button>
          ))}
        </div>

        <div className="text-sm text-gray-600">Showing {filteredEquipment.length} items</div>

        {/* Equipment Content */}
        {filteredEquipment.length === 0 ? (
          <Card>
            <CardContent className="text-center py-12">
              <div className="text-gray-500 text-lg mb-4">
                {searchTerm || categoryFilter !== 'all' || statusFilter !== 'all' 
                  ? 'No equipment matches your filters' 
                  : 'No equipment found. Add your first equipment to get started!'}
              </div>
              {!searchTerm && categoryFilter === 'all' && statusFilter === 'all' && (
                <NewEquipmentDialog onEquipmentCreated={fetchEquipment} />
              )}
            </CardContent>
          </Card>
        ) : viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEquipment.map((item) => (
              <Card key={item.id} className="hover:shadow-lg transition-shadow">
                <CardContent className="p-0">
                  <div className="relative">
                    <div className="h-48 bg-gray-200 rounded-t-lg flex items-center justify-center">
                      {item.image ? (
                        <img src={item.image} alt={item.name} className="w-full h-full object-cover rounded-t-lg" />
                      ) : (
                        <div className="text-gray-400">No Image</div>
                      )}
                    </div>
                    <Badge className={cn("absolute top-2 right-2", getStatusColor(item.status))}>
                      {item.status}
                    </Badge>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-lg mb-1">{item.name}</h3>
                    <p className="text-gray-600 mb-2">Year: {item.year}</p>
                    <p className="text-gray-600 mb-2">Value: ${item.value.toLocaleString()}</p>
                    <p className="text-blue-600 font-semibold mb-3">${item.hourlyRate}/hr</p>
                    <Badge variant="secondary" className="mb-3">{item.category}</Badge>
                    <div className="flex justify-between items-center">
                      <Button 
                        size="sm" 
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => openMaintenance(item.id)}
                      >
                        <Wrench className="w-4 h-4 mr-1" />
                        Maintenance
                      </Button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem>View</DropdownMenuItem>
                          <DropdownMenuItem>Edit</DropdownMenuItem>
                          <DropdownMenuItem 
                            className="text-red-600"
                            onClick={() => deleteEquipment(item.id)}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Hourly Rate</TableHead>
                    <TableHead>Year</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-[160px]">Actions</TableHead>
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
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => openMaintenance(item.id)}
                          >
                            <Wrench className="w-4 h-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>View</DropdownMenuItem>
                              <DropdownMenuItem>Edit</DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => deleteEquipment(item.id)}
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        {/* Selected Equipment Sidebar */}
        {selectedEquipment && (
          <div className="fixed right-0 top-0 h-full w-80 bg-white border-l shadow-lg p-6 z-50">
            <h3 className="text-lg font-semibold mb-4">Selected Equipment</h3>
            <div className="text-center text-gray-500">
              Drag and drop equipment here or use the Add button
            </div>
          </div>
        )}
      </div>

      <MaintenanceDialog
        open={showMaintenance}
        onOpenChange={setShowMaintenance}
        equipmentId={selectedEquipment}
        equipmentName={equipment.find(e => e.id === selectedEquipment)?.name || ''}
      />
    </Layout>
  );
}
