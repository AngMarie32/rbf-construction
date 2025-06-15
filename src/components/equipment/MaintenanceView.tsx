import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Calendar, Search, Filter, SortAsc, SortDesc, Wrench, Clock, Check, Trash2, AlertTriangle } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MaintenanceRecord {
  id: string;
  date: Date;
  description: string;
  cost: number;
  nextDue: Date | null;
  equipmentId: string;
  equipmentName: string;
  type: 'completed' | 'scheduled';
  isCompleted?: boolean;
}

interface MaintenanceViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function MaintenanceView({ open, onOpenChange }: MaintenanceViewProps) {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  
  // Filter and sort states
  const [searchTerm, setSearchTerm] = useState('');
  const [equipmentFilter, setEquipmentFilter] = useState('all');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  
  const [equipment, setEquipment] = useState<Array<{ id: string; name: string }>>([]);

  useEffect(() => {
    if (open) {
      fetchAllMaintenanceRecords();
      fetchEquipment();
    }
  }, [open]);

  useEffect(() => {
    applyFiltersAndSort();
  }, [records, searchTerm, equipmentFilter, sortBy, sortOrder, statusFilter, activeTab, dateFrom, dateTo]);

  const fetchEquipment = async () => {
    try {
      const { data, error } = await supabase
        .from('equipment')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setEquipment(data || []);
    } catch (error) {
      console.error('Error fetching equipment:', error);
    }
  };

  const fetchAllMaintenanceRecords = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('maintenance_logs')
        .select(`
          *,
          equipment:equipment_id(name)
        `)
        .order('date', { ascending: false });

      if (error) throw error;

      const mappedRecords: MaintenanceRecord[] = (data || []).map(record => ({
        id: record.id,
        date: new Date(record.date),
        description: record.description,
        cost: record.cost || 0,
        nextDue: record.next_due ? new Date(record.next_due) : null,
        equipmentId: record.equipment_id,
        equipmentName: record.equipment?.name || 'Unknown Equipment',
        type: record.next_due && new Date(record.next_due) > new Date() ? 'scheduled' : 'completed',
        isCompleted: record.next_due ? new Date(record.next_due) <= new Date() : true
      }));

      setRecords(mappedRecords);
    } catch (error) {
      console.error('Error fetching maintenance records:', error);
      toast.error('Failed to load maintenance records');
    } finally {
      setLoading(false);
    }
  };

  const applyFiltersAndSort = () => {
    let filtered = records;

    // Apply tab filter
    if (activeTab === 'completed') {
      filtered = filtered.filter(r => r.type === 'completed' || r.isCompleted);
    } else if (activeTab === 'scheduled') {
      filtered = filtered.filter(r => r.type === 'scheduled' && !r.isCompleted);
    } else if (activeTab === 'overdue') {
      filtered = filtered.filter(r => 
        r.nextDue && r.nextDue < new Date() && r.type === 'scheduled'
      );
    }

    // Apply date filter
    if (dateFrom || dateTo) {
      filtered = filtered.filter(r => {
        const recordDate = r.date;
        const fromDate = dateFrom ? new Date(dateFrom) : null;
        const toDate = dateTo ? new Date(dateTo) : null;
        
        if (fromDate && toDate) {
          return recordDate >= fromDate && recordDate <= toDate;
        } else if (fromDate) {
          return recordDate >= fromDate;
        } else if (toDate) {
          return recordDate <= toDate;
        }
        return true;
      });
    }

    // Apply search filter
    if (searchTerm) {
      const search = searchTerm.toLowerCase();
      filtered = filtered.filter(r =>
        r.description.toLowerCase().includes(search) ||
        r.equipmentName.toLowerCase().includes(search)
      );
    }

    // Apply equipment filter
    if (equipmentFilter !== 'all') {
      filtered = filtered.filter(r => r.equipmentId === equipmentFilter);
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'overdue') {
        filtered = filtered.filter(r => 
          r.nextDue && r.nextDue < new Date() && r.type === 'scheduled'
        );
      } else if (statusFilter === 'upcoming') {
        const oneWeekFromNow = new Date();
        oneWeekFromNow.setDate(oneWeekFromNow.getDate() + 7);
        filtered = filtered.filter(r => 
          r.nextDue && r.nextDue >= new Date() && r.nextDue <= oneWeekFromNow
        );
      }
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue: any;
      let bValue: any;

      switch (sortBy) {
        case 'date':
          aValue = a.date.getTime();
          bValue = b.date.getTime();
          break;
        case 'equipment':
          aValue = a.equipmentName.toLowerCase();
          bValue = b.equipmentName.toLowerCase();
          break;
        case 'cost':
          aValue = a.cost;
          bValue = b.cost;
          break;
        case 'nextDue':
          aValue = a.nextDue ? a.nextDue.getTime() : 0;
          bValue = b.nextDue ? b.nextDue.getTime() : 0;
          break;
        default:
          aValue = a.date.getTime();
          bValue = b.date.getTime();
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredRecords(filtered);
  };

  const deleteMaintenanceRecord = async (recordId: string) => {
    if (!confirm('Are you sure you want to delete this maintenance record?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('maintenance_logs')
        .delete()
        .eq('id', recordId);

      if (error) throw error;

      toast.success('Maintenance record deleted successfully');
      fetchAllMaintenanceRecords();
    } catch (error) {
      console.error('Error deleting maintenance record:', error);
      toast.error('Failed to delete maintenance record');
    }
  };

  const markAsCompleted = async (recordId: string) => {
    try {
      const { error } = await supabase
        .from('maintenance_logs')
        .update({ 
          date: new Date().toISOString().split('T')[0],
          next_due: null 
        })
        .eq('id', recordId);

      if (error) throw error;

      toast.success('Maintenance marked as completed');
      fetchAllMaintenanceRecords();
    } catch (error) {
      console.error('Error marking maintenance as completed:', error);
      toast.error('Failed to update maintenance status');
    }
  };

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  const completedRecords = records.filter(r => r.type === 'completed' || r.isCompleted);
  const scheduledRecords = records.filter(r => r.type === 'scheduled' && !r.isCompleted);
  const overdueRecords = records.filter(r => 
    r.nextDue && r.nextDue < new Date() && r.type === 'scheduled'
  );
  const totalMaintenanceCost = completedRecords.reduce((sum, record) => sum + record.cost, 0);

  if (!open) return null;

  return (
    <Layout title="Maintenance" subtitle="Manage all equipment maintenance">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Records</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{records.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Completed</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{completedRecords.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Scheduled</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{scheduledRecords.length}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Total Cost</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">${totalMaintenanceCost.toLocaleString()}</div>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5" />
              Filters & Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-6 gap-4">
              <div>
                <label className="text-sm font-medium mb-1 block">Search</label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder=""
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Date From</label>
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Date To</label>
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Equipment</label>
                <Select value={equipmentFilter} onValueChange={setEquipmentFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Equipment" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Equipment</SelectItem>
                    {equipment.map((eq) => (
                      <SelectItem key={eq.id} value={eq.id}>
                        {eq.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="overdue">Overdue</SelectItem>
                    <SelectItem value="upcoming">Due This Week</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="text-sm font-medium mb-1 block">Sort By</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="equipment">Equipment</SelectItem>
                    <SelectItem value="cost">Cost</SelectItem>
                    <SelectItem value="nextDue">Next Due</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Maintenance Records */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Maintenance Records</CardTitle>
            <Button onClick={() => onOpenChange(false)} variant="outline">
              Back to Equipment
            </Button>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">All ({records.length})</TabsTrigger>
                <TabsTrigger value="completed">Completed ({completedRecords.length})</TabsTrigger>
                <TabsTrigger value="scheduled">Scheduled ({scheduledRecords.length})</TabsTrigger>
                <TabsTrigger value="overdue" className="text-red-600">
                  Overdue ({overdueRecords.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value={activeTab} className="mt-4">
                {loading ? (
                  <div className="text-center py-8">Loading maintenance records...</div>
                ) : filteredRecords.length === 0 ? (
                  <div className="text-center py-8 text-gray-500">
                    <AlertTriangle className="w-12 h-12 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold mb-2">No maintenance records found</h3>
                    <p>No records match your current filters.</p>
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleSort('date')}
                            className="h-auto p-0 font-medium"
                          >
                            Date
                            {sortBy === 'date' && (
                              sortOrder === 'asc' ? <SortAsc className="w-4 h-4 ml-1" /> : <SortDesc className="w-4 h-4 ml-1" />
                            )}
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleSort('equipment')}
                            className="h-auto p-0 font-medium"
                          >
                            Equipment
                            {sortBy === 'equipment' && (
                              sortOrder === 'asc' ? <SortAsc className="w-4 h-4 ml-1" /> : <SortDesc className="w-4 h-4 ml-1" />
                            )}
                          </Button>
                        </TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleSort('cost')}
                            className="h-auto p-0 font-medium"
                          >
                            Cost
                            {sortBy === 'cost' && (
                              sortOrder === 'asc' ? <SortAsc className="w-4 h-4 ml-1" /> : <SortDesc className="w-4 h-4 ml-1" />
                            )}
                          </Button>
                        </TableHead>
                        <TableHead>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => toggleSort('nextDue')}
                            className="h-auto p-0 font-medium"
                          >
                            Next Due
                            {sortBy === 'nextDue' && (
                              sortOrder === 'asc' ? <SortAsc className="w-4 h-4 ml-1" /> : <SortDesc className="w-4 h-4 ml-1" />
                            )}
                          </Button>
                        </TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredRecords.map((record) => (
                        <TableRow key={record.id}>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Calendar className="w-4 h-4 text-gray-400" />
                              <span>{format(record.date, 'MMM dd, yyyy')}</span>
                            </div>
                          </TableCell>
                          <TableCell className="font-medium">
                            {record.equipmentName}
                          </TableCell>
                          <TableCell>
                            <div className="max-w-xs truncate" title={record.description}>
                              {record.description}
                            </div>
                          </TableCell>
                          <TableCell>${record.cost.toLocaleString()}</TableCell>
                          <TableCell>
                            {record.nextDue ? (
                              <div className="flex items-center space-x-2">
                                <Clock className="w-4 h-4 text-gray-400" />
                                <span>{format(record.nextDue, 'MMM dd, yyyy')}</span>
                              </div>
                            ) : (
                              'N/A'
                            )}
                          </TableCell>
                          <TableCell>
                            {record.type === 'scheduled' && !record.isCompleted ? (
                              record.nextDue && record.nextDue < new Date() ? (
                                <Badge variant="destructive">Overdue</Badge>
                              ) : (
                                <Badge variant="secondary">Scheduled</Badge>
                              )
                            ) : (
                              <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">
                                Completed
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              {record.type === 'scheduled' && !record.isCompleted && (
                                <Button
                                  size="sm"
                                  onClick={() => markAsCompleted(record.id)}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <Check className="w-4 h-4 mr-1" />
                                  Mark Done
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deleteMaintenanceRecord(record.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}

const fetchEquipment = async () => {
  try {
    const { data, error } = await supabase
      .from('equipment')
      .select('id, name')
      .order('name');

    if (error) throw error;
    setEquipment(data || []);
  } catch (error) {
    console.error('Error fetching equipment:', error);
  }
};

const fetchAllMaintenanceRecords = async () => {
  try {
    setLoading(true);
    const { data, error } = await supabase
      .from('maintenance_logs')
      .select(`
        *,
        equipment:equipment_id(name)
      `)
      .order('date', { ascending: false });

    if (error) throw error;

    const mappedRecords: MaintenanceRecord[] = (data || []).map(record => ({
      id: record.id,
      date: new Date(record.date),
      description: record.description,
      cost: record.cost || 0,
      nextDue: record.next_due ? new Date(record.next_due) : null,
      equipmentId: record.equipment_id,
      equipmentName: record.equipment?.name || 'Unknown Equipment',
      type: record.next_due && new Date(record.next_due) > new Date() ? 'scheduled' : 'completed',
      isCompleted: record.next_due ? new Date(record.next_due) <= new Date() : true
    }));

    setRecords(mappedRecords);
  } catch (error) {
    console.error('Error fetching maintenance records:', error);
    toast.error('Failed to load maintenance records');
  } finally {
    setLoading(false);
  }
};

const deleteMaintenanceRecord = async (recordId: string) => {
  if (!confirm('Are you sure you want to delete this maintenance record?')) {
    return;
  }

  try {
    const { error } = await supabase
      .from('maintenance_logs')
      .delete()
      .eq('id', recordId);

    if (error) throw error;

    toast.success('Maintenance record deleted successfully');
    fetchAllMaintenanceRecords();
  } catch (error) {
    console.error('Error deleting maintenance record:', error);
    toast.error('Failed to delete maintenance record');
  }
};

const markAsCompleted = async (recordId: string) => {
  try {
    const { error } = await supabase
      .from('maintenance_logs')
      .update({ 
        date: new Date().toISOString().split('T')[0],
        next_due: null 
      })
      .eq('id', recordId);

    if (error) throw error;

    toast.success('Maintenance marked as completed');
    fetchAllMaintenanceRecords();
  } catch (error) {
    console.error('Error marking maintenance as completed:', error);
    toast.error('Failed to update maintenance status');
  }
};

const toggleSort = (field: string) => {
  if (sortBy === field) {
    setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
  } else {
    setSortBy(field);
    setSortOrder('desc');
  }
};
