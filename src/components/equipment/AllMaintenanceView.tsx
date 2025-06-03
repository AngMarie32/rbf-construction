
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Download, Calendar } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MaintenanceRecord {
  id: string;
  equipment_id: string;
  equipment_name: string;
  description: string;
  cost: number;
  date: string;
  next_due?: string;
}

interface AllMaintenanceViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AllMaintenanceView({ open, onOpenChange }: AllMaintenanceViewProps) {
  const [maintenanceRecords, setMaintenanceRecords] = useState<MaintenanceRecord[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [endDateFilter, setEndDateFilter] = useState('');

  useEffect(() => {
    if (open) {
      fetchMaintenanceRecords();
    }
  }, [open]);

  useEffect(() => {
    filterRecords();
  }, [maintenanceRecords, searchTerm, dateFilter, endDateFilter]);

  const fetchMaintenanceRecords = async () => {
    setLoading(true);
    try {
      const { data: maintenanceData, error: maintenanceError } = await supabase
        .from('maintenance_logs')
        .select('*')
        .order('date', { ascending: false });

      if (maintenanceError) throw maintenanceError;

      const { data: equipmentData, error: equipmentError } = await supabase
        .from('equipment')
        .select('id, name');

      if (equipmentError) throw equipmentError;

      const equipmentMap = new Map(equipmentData.map(eq => [eq.id, eq.name]));

      const mappedRecords: MaintenanceRecord[] = (maintenanceData || []).map(record => ({
        id: record.id,
        equipment_id: record.equipment_id,
        equipment_name: equipmentMap.get(record.equipment_id) || 'Unknown Equipment',
        description: record.description,
        cost: record.cost || 0,
        date: record.date,
        next_due: record.next_due
      }));

      setMaintenanceRecords(mappedRecords);
    } catch (error) {
      console.error('Error fetching maintenance records:', error);
      toast.error('Failed to load maintenance records');
    } finally {
      setLoading(false);
    }
  };

  const filterRecords = () => {
    let filtered = maintenanceRecords;

    if (searchTerm) {
      filtered = filtered.filter(record =>
        record.equipment_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        record.description.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (dateFilter) {
      filtered = filtered.filter(record => new Date(record.date) >= new Date(dateFilter));
    }

    if (endDateFilter) {
      filtered = filtered.filter(record => new Date(record.date) <= new Date(endDateFilter));
    }

    setFilteredRecords(filtered);
  };

  const exportRecords = () => {
    let csvContent = "Equipment,Date,Cost,Next Due,Description\n";
    filteredRecords.forEach(record => {
      csvContent += `"${record.equipment_name}","${record.date}",${record.cost},"${record.next_due || 'N/A'}","${record.description}"\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `maintenance-records-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    toast.success('Maintenance records exported successfully');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-xl">All Maintenance Records</DialogTitle>
            <Button onClick={exportRecords} variant="outline" size="sm">
              <Download className="w-4 h-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </DialogHeader>

        <div className="flex flex-col space-y-4 flex-1 overflow-hidden">
          {/* Filters */}
          <div className="flex flex-wrap gap-4 items-center">
            <div className="relative flex-1 min-w-[300px]">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search equipment, description..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full"
              />
            </div>

            <div className="flex items-center space-x-2">
              <Calendar className="w-4 h-4 text-gray-500" />
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-36"
                placeholder="From date"
              />
              <span className="text-gray-500">to</span>
              <Input
                type="date"
                value={endDateFilter}
                onChange={(e) => setEndDateFilter(e.target.value)}
                className="w-36"
                placeholder="To date"
              />
            </div>
          </div>

          <div className="text-sm text-gray-600">
            Showing {filteredRecords.length} of {maintenanceRecords.length} records
          </div>

          {/* Table */}
          <div className="flex-1 overflow-auto border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Equipment</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Cost</TableHead>
                  <TableHead>Next Due</TableHead>
                  <TableHead>Description</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8">
                      Loading maintenance records...
                    </TableCell>
                  </TableRow>
                ) : filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                      No maintenance records found
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium">{record.equipment_name}</TableCell>
                      <TableCell>{new Date(record.date).toLocaleDateString()}</TableCell>
                      <TableCell>${record.cost?.toLocaleString() || '0'}</TableCell>
                      <TableCell>
                        {record.next_due ? new Date(record.next_due).toLocaleDateString() : 'N/A'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">{record.description}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
