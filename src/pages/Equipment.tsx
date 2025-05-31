
import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Filter, Wrench, DollarSign, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';

interface Equipment {
  id: string;
  name: string;
  category: 'Heavy Machinery' | 'Vehicles' | 'Trailers' | 'Other';
  hourlyRate: number;
  year: number;
  value: number;
  status: 'Available' | 'In Use' | 'Maintenance';
  image?: string;
  description: string;
  createdAt: Date;
}

interface MaintenanceLog {
  id: string;
  equipmentId: string;
  date: Date;
  description: string;
  cost: number;
  nextDue: Date | null;
}

export default function Equipment() {
  const [equipment, setEquipment] = useState<Equipment[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [showNewForm, setShowNewForm] = useState(false);
  const [showMaintenanceForm, setShowMaintenanceForm] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<string>('');
  
  const [newEquipment, setNewEquipment] = useState({
    name: '',
    category: 'Other' as Equipment['category'],
    hourlyRate: '',
    year: '',
    value: '',
    status: 'Available' as Equipment['status'],
    description: ''
  });

  const [newMaintenance, setNewMaintenance] = useState({
    date: '',
    description: '',
    cost: '',
    nextDue: ''
  });

  useEffect(() => {
    fetchEquipment();
    fetchMaintenanceLogs();
  }, []);

  const fetchEquipment = async () => {
    try {
      const { data, error } = await supabase
        .from('equipment')
        .select('*')
        .order('name');

      if (error) throw error;

      const mappedEquipment = (data || []).map(item => ({
        id: item.id,
        name: item.name,
        category: item.category as Equipment['category'],
        hourlyRate: item.hourly_rate,
        year: item.year || 0,
        value: item.value || 0,
        status: item.status as Equipment['status'],
        image: item.image,
        description: item.description || '',
        createdAt: new Date(item.created_at)
      }));

      setEquipment(mappedEquipment);
    } catch (error) {
      console.error('Error fetching equipment:', error);
      toast.error('Failed to load equipment');
    } finally {
      setLoading(false);
    }
  };

  const fetchMaintenanceLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('maintenance_logs')
        .select('*')
        .order('date', { ascending: false });

      if (error) throw error;

      const mappedLogs = (data || []).map(log => ({
        id: log.id,
        equipmentId: log.equipment_id,
        date: new Date(log.date),
        description: log.description,
        cost: log.cost || 0,
        nextDue: log.next_due ? new Date(log.next_due) : null
      }));

      setMaintenanceLogs(mappedLogs);
    } catch (error) {
      console.error('Error fetching maintenance logs:', error);
      toast.error('Failed to load maintenance logs');
    }
  };

  const addEquipment = async () => {
    if (!newEquipment.name || !newEquipment.hourlyRate) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('equipment')
        .insert({
          name: newEquipment.name,
          category: newEquipment.category,
          hourly_rate: parseFloat(newEquipment.hourlyRate),
          year: newEquipment.year ? parseInt(newEquipment.year) : null,
          value: newEquipment.value ? parseFloat(newEquipment.value) : 0,
          status: newEquipment.status,
          description: newEquipment.description
        });

      if (error) throw error;

      toast.success('Equipment added successfully');
      setShowNewForm(false);
      setNewEquipment({
        name: '', category: 'Other', hourlyRate: '', year: '', 
        value: '', status: 'Available', description: ''
      });
      fetchEquipment();
    } catch (error) {
      console.error('Error adding equipment:', error);
      toast.error('Failed to add equipment');
    }
  };

  const addMaintenanceLog = async () => {
    if (!selectedEquipment || !newMaintenance.date || !newMaintenance.description) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('maintenance_logs')
        .insert({
          equipment_id: selectedEquipment,
          date: newMaintenance.date,
          description: newMaintenance.description,
          cost: newMaintenance.cost ? parseFloat(newMaintenance.cost) : 0,
          next_due: newMaintenance.nextDue || null
        });

      if (error) throw error;

      toast.success('Maintenance log added successfully');
      setShowMaintenanceForm(false);
      setNewMaintenance({ date: '', description: '', cost: '', nextDue: '' });
      fetchMaintenanceLogs();
    } catch (error) {
      console.error('Error adding maintenance log:', error);
      toast.error('Failed to add maintenance log');
    }
  };

  const updateEquipmentStatus = async (id: string, status: Equipment['status']) => {
    try {
      const { error } = await supabase
        .from('equipment')
        .update({ status })
        .eq('id', id);

      if (error) throw error;

      toast.success('Equipment status updated');
      fetchEquipment();
    } catch (error) {
      console.error('Error updating equipment status:', error);
      toast.error('Failed to update equipment status');
    }
  };

  const filteredEquipment = equipment.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         item.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || item.status === statusFilter;
    const matchesCategory = categoryFilter === 'All' || item.category === categoryFilter;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available': return 'bg-green-100 text-green-800';
      case 'In Use': return 'bg-blue-100 text-blue-800';
      case 'Maintenance': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const totalValue = equipment.reduce((sum, item) => sum + item.value, 0);
  const availableCount = equipment.filter(item => item.status === 'Available').length;
  const inUseCount = equipment.filter(item => item.status === 'In Use').length;

  if (loading) {
    return (
      <Layout title="Equipment" subtitle="Manage your construction equipment and maintenance">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Equipment" subtitle="Manage your construction equipment and maintenance">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="w-5 h-5 mr-2" />
                Total Value
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-blue-600">
                ${totalValue.toLocaleString()}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Total Equipment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{equipment.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Available</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{availableCount}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>In Use</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-orange-600">{inUseCount}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Actions */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-col sm:flex-row gap-4 flex-1">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search equipment..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Status</SelectItem>
                <SelectItem value="Available">Available</SelectItem>
                <SelectItem value="In Use">In Use</SelectItem>
                <SelectItem value="Maintenance">Maintenance</SelectItem>
              </SelectContent>
            </Select>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Categories</SelectItem>
                <SelectItem value="Heavy Machinery">Heavy Machinery</SelectItem>
                <SelectItem value="Vehicles">Vehicles</SelectItem>
                <SelectItem value="Trailers">Trailers</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-2">
            <Button onClick={() => setShowMaintenanceForm(true)}>
              <Wrench className="w-4 h-4 mr-2" />
              Add Maintenance
            </Button>
            <Button onClick={() => setShowNewForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Add Equipment
            </Button>
          </div>
        </div>

        {/* New Equipment Form */}
        {showNewForm && (
          <Card>
            <CardHeader>
              <CardTitle>Add New Equipment</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    value={newEquipment.name}
                    onChange={(e) => setNewEquipment({ ...newEquipment, name: e.target.value })}
                    placeholder="Equipment name"
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category</Label>
                  <Select value={newEquipment.category} onValueChange={(value: Equipment['category']) => setNewEquipment({ ...newEquipment, category: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Heavy Machinery">Heavy Machinery</SelectItem>
                      <SelectItem value="Vehicles">Vehicles</SelectItem>
                      <SelectItem value="Trailers">Trailers</SelectItem>
                      <SelectItem value="Other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="hourlyRate">Hourly Rate ($) *</Label>
                  <Input
                    id="hourlyRate"
                    type="number"
                    step="0.01"
                    value={newEquipment.hourlyRate}
                    onChange={(e) => setNewEquipment({ ...newEquipment, hourlyRate: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="year">Year</Label>
                  <Input
                    id="year"
                    type="number"
                    value={newEquipment.year}
                    onChange={(e) => setNewEquipment({ ...newEquipment, year: e.target.value })}
                    placeholder="2024"
                  />
                </div>
                <div>
                  <Label htmlFor="value">Value ($)</Label>
                  <Input
                    id="value"
                    type="number"
                    step="0.01"
                    value={newEquipment.value}
                    onChange={(e) => setNewEquipment({ ...newEquipment, value: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="status">Status</Label>
                  <Select value={newEquipment.status} onValueChange={(value: Equipment['status']) => setNewEquipment({ ...newEquipment, status: value })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Available">Available</SelectItem>
                      <SelectItem value="In Use">In Use</SelectItem>
                      <SelectItem value="Maintenance">Maintenance</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-4">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={newEquipment.description}
                  onChange={(e) => setNewEquipment({ ...newEquipment, description: e.target.value })}
                  placeholder="Equipment description..."
                  rows={3}
                />
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <Button variant="outline" onClick={() => setShowNewForm(false)}>
                  Cancel
                </Button>
                <Button onClick={addEquipment}>Add Equipment</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* New Maintenance Form */}
        {showMaintenanceForm && (
          <Card>
            <CardHeader>
              <CardTitle>Add Maintenance Log</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <div>
                  <Label htmlFor="equipment">Equipment *</Label>
                  <Select value={selectedEquipment} onValueChange={setSelectedEquipment}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select equipment" />
                    </SelectTrigger>
                    <SelectContent>
                      {equipment.map((item) => (
                        <SelectItem key={item.id} value={item.id}>
                          {item.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="maintenanceDate">Date *</Label>
                  <Input
                    id="maintenanceDate"
                    type="date"
                    value={newMaintenance.date}
                    onChange={(e) => setNewMaintenance({ ...newMaintenance, date: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="maintenanceDescription">Description *</Label>
                  <Input
                    id="maintenanceDescription"
                    value={newMaintenance.description}
                    onChange={(e) => setNewMaintenance({ ...newMaintenance, description: e.target.value })}
                    placeholder="Maintenance performed"
                  />
                </div>
                <div>
                  <Label htmlFor="maintenanceCost">Cost ($)</Label>
                  <Input
                    id="maintenanceCost"
                    type="number"
                    step="0.01"
                    value={newMaintenance.cost}
                    onChange={(e) => setNewMaintenance({ ...newMaintenance, cost: e.target.value })}
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <Label htmlFor="nextDue">Next Due Date</Label>
                  <Input
                    id="nextDue"
                    type="date"
                    value={newMaintenance.nextDue}
                    onChange={(e) => setNewMaintenance({ ...newMaintenance, nextDue: e.target.value })}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2 mt-6">
                <Button variant="outline" onClick={() => setShowMaintenanceForm(false)}>
                  Cancel
                </Button>
                <Button onClick={addMaintenanceLog}>Add Log</Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Equipment Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredEquipment.map((item) => {
            const itemMaintenanceLogs = maintenanceLogs.filter(log => log.equipmentId === item.id);
            const lastMaintenance = itemMaintenanceLogs[0];
            const upcomingMaintenance = itemMaintenanceLogs.find(log => 
              log.nextDue && log.nextDue > new Date()
            );

            return (
              <Card key={item.id} className="hover:shadow-lg transition-shadow duration-200">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-lg">{item.name}</CardTitle>
                    <Badge className={getStatusColor(item.status)}>
                      {item.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-gray-600">{item.category}</p>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Hourly Rate:</span>
                      <div className="font-medium">${item.hourlyRate}/hr</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Year:</span>
                      <div className="font-medium">{item.year || 'N/A'}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Value:</span>
                      <div className="font-medium">${item.value.toLocaleString()}</div>
                    </div>
                    <div>
                      <span className="text-gray-500">Maintenance:</span>
                      <div className="font-medium">{itemMaintenanceLogs.length} logs</div>
                    </div>
                  </div>
                  
                  {item.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {item.description}
                    </p>
                  )}

                  {lastMaintenance && (
                    <div className="text-xs text-gray-500 flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      Last maintenance: {format(lastMaintenance.date, 'MMM dd, yyyy')}
                    </div>
                  )}

                  {upcomingMaintenance && (
                    <div className="text-xs text-orange-600 flex items-center">
                      <Calendar className="w-3 h-3 mr-1" />
                      Next due: {format(upcomingMaintenance.nextDue!, 'MMM dd, yyyy')}
                    </div>
                  )}

                  <div className="flex gap-2 pt-2">
                    <Select
                      value={item.status}
                      onValueChange={(value: Equipment['status']) => updateEquipmentStatus(item.id, value)}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Available">Available</SelectItem>
                        <SelectItem value="In Use">In Use</SelectItem>
                        <SelectItem value="Maintenance">Maintenance</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {filteredEquipment.length === 0 && (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No equipment found matching your criteria.</p>
            <div className="mt-4">
              <Button onClick={() => setShowNewForm(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Equipment
              </Button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
