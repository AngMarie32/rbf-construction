
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar, Search, Filter, Wrench } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MaintenanceRecord {
  id: string;
  equipment_id: string;
  equipment_name: string;
  date: Date;
  description: string;
  cost: number;
  nextDue: Date | null;
}

interface AllMaintenanceViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AllMaintenanceView({ open, onOpenChange }: AllMaintenanceViewProps) {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  useEffect(() => {
    if (open) {
      fetchAllMaintenanceRecords();
    }
  }, [open]);

  useEffect(() => {
    filterRecords();
  }, [records, searchTerm, statusFilter, startDate, endDate]);

  const fetchAllMaintenanceRecords = async () => {
    try {
      setLoading(true);
      const { data: maintenanceData, error: maintenanceError } = await supabase
        .from('maintenance_logs')
        .select('*')
        .order('date', { ascending: false });

      if (maintenanceError) throw maintenanceError;

      const { data: equipmentData, error: equipmentError } = await supabase
        .from('equipment')
        .select('id, name')
        .order('name');

      if (equipmentError) throw equipmentError;

      const equipmentMap = new Map(equipmentData.map(eq => [eq.id, eq.name]));

      const mappedRecords: MaintenanceRecord[] = (maintenanceData || []).map(record => ({
        id: record.id,
        equipment_id: record.equipment_id,
        equipment_name: equipmentMap.get(record.equipment_id) || 'Unknown Equipment',
        date: new Date(record.date),
        description: record.description,
        cost: record.cost || 0,
        nextDue: record.next_due ? new Date(record.next_due) : null
      }));

      setRecords(mappedRecords);
    } catch (error) {
      console.error('Error fetching maintenance records:', error);
      toast.error('Failed to load maintenance records');
    } finally {
      setLoading(false);
    }
  };

  const filterRecords = () => {
    let filtered = records;

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(record =>
        record.equipment_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(record => {
        if (statusFilter === 'completed') {
          return !record.nextDue;
        } else if (statusFilter === 'scheduled') {
          return record.nextDue && record.nextDue > new Date();
        } else if (statusFilter === 'overdue') {
          return record.nextDue && record.nextDue <= new Date();
        }
        return true;
      });
    }

    // Date range filter
    if (startDate) {
      filtered = filtered.filter(record => record.date >= new Date(startDate));
    }
    if (endDate) {
      filtered = filtered.filter(record => record.date <= new Date(endDate));
    }

    setFilteredRecords(filtered);
  };

  const totalMaintenanceCost = filteredRecords.reduce((sum, record) => sum + record.cost, 0);
  const upcomingMaintenance = filteredRecords.filter(record => 
    record.nextDue && record.nextDue > new Date()
  ).length;
  const overdueMaintenance = filteredRecords.filter(record => 
    record.nextDue && record.nextDue <= new Date()
  ).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Wrench className="w-5 h-5" />
            <span>All Maintenance Records</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Records</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{filteredRecords.length}</div>
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
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Upcoming</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{upcomingMaintenance}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Overdue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{overdueMaintenance}</div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="relative flex-1 min-w-64">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search equipment or description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="completed">Completed</SelectItem>
                <SelectItem value="scheduled">Scheduled</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center space-x-2">
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-40"
                placeholder="Start Date"
              />
              <span className="text-gray-500">to</span>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-40"
                placeholder="End Date"
              />
            </div>
            <Button variant="outline" onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setStartDate('');
              setEndDate('');
            }}>
              <Filter className="w-4 h-4 mr-2" />
              Clear Filters
            </Button>
          </div>

          {/* Records Table */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="text-center py-8">Loading maintenance records...</div>
              ) : filteredRecords.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No maintenance records found.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Equipment</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Next Due</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredRecords.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">
                          {record.equipment_name}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span>{format(record.date, 'MMM dd, yyyy')}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs truncate" title={record.description}>
                            {record.description}
                          </div>
                        </TableCell>
                        <TableCell>${record.cost.toLocaleString()}</TableCell>
                        <TableCell>
                          {record.nextDue ? format(record.nextDue, 'MMM dd, yyyy') : 'N/A'}
                        </TableCell>
                        <TableCell>
                          {record.nextDue ? (
                            record.nextDue > new Date() ? (
                              <Badge variant="secondary">Scheduled</Badge>
                            ) : (
                              <Badge variant="destructive">Overdue</Badge>
                            )
                          ) : (
                            <Badge variant="outline">Completed</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
