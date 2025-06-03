
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, Plus, Wrench } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MaintenanceRecord {
  id: string;
  date: Date;
  description: string;
  cost: number;
  nextDue: Date | null;
}

interface MaintenanceDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  equipmentId: string;
  equipmentName: string;
}

export function MaintenanceDialog({ open, onOpenChange, equipmentId, equipmentName }: MaintenanceDialogProps) {
  const [records, setRecords] = useState<MaintenanceRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRecord, setNewRecord] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    cost: '',
    nextDue: ''
  });

  useEffect(() => {
    if (open && equipmentId) {
      fetchMaintenanceRecords();
    }
  }, [open, equipmentId]);

  const fetchMaintenanceRecords = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('maintenance_logs')
        .select('*')
        .eq('equipment_id', equipmentId)
        .order('date', { ascending: false });

      if (error) throw error;

      const mappedRecords: MaintenanceRecord[] = (data || []).map(record => ({
        id: record.id,
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

  const addMaintenanceRecord = async () => {
    if (!newRecord.description || !newRecord.date) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('maintenance_logs')
        .insert({
          equipment_id: equipmentId,
          date: newRecord.date,
          description: newRecord.description,
          cost: parseFloat(newRecord.cost) || 0,
          next_due: newRecord.nextDue || null
        });

      if (error) throw error;

      toast.success('Maintenance record added successfully');
      setNewRecord({
        date: new Date().toISOString().split('T')[0],
        description: '',
        cost: '',
        nextDue: ''
      });
      setShowAddForm(false);
      fetchMaintenanceRecords();
    } catch (error) {
      console.error('Error adding maintenance record:', error);
      toast.error('Failed to add maintenance record');
    }
  };

  const totalMaintenanceCost = records.reduce((sum, record) => sum + record.cost, 0);
  const upcomingMaintenance = records.filter(record => 
    record.nextDue && record.nextDue > new Date()
  ).length;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Wrench className="w-5 h-5" />
            <span>Maintenance - {equipmentName}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-3 gap-4">
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
                <div className="text-2xl font-bold">{upcomingMaintenance}</div>
              </CardContent>
            </Card>
          </div>

          {/* Add New Record Form */}
          {showAddForm && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add Maintenance Record</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date">Date *</Label>
                    <Input
                      id="date"
                      type="date"
                      value={newRecord.date}
                      onChange={(e) => setNewRecord({ ...newRecord, date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="cost">Cost</Label>
                    <Input
                      id="cost"
                      type="number"
                      step="0.01"
                      value={newRecord.cost}
                      onChange={(e) => setNewRecord({ ...newRecord, cost: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={newRecord.description}
                    onChange={(e) => setNewRecord({ ...newRecord, description: e.target.value })}
                    placeholder="Describe the maintenance work performed..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label htmlFor="nextDue">Next Due Date</Label>
                  <Input
                    id="nextDue"
                    type="date"
                    value={newRecord.nextDue}
                    onChange={(e) => setNewRecord({ ...newRecord, nextDue: e.target.value })}
                  />
                </div>
                <div className="flex space-x-2">
                  <Button onClick={addMaintenanceRecord}>Add Record</Button>
                  <Button variant="outline" onClick={() => setShowAddForm(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Records Table */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Maintenance History</CardTitle>
              {!showAddForm && (
                <Button onClick={() => setShowAddForm(true)} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Record
                </Button>
              )}
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="text-center py-8">Loading maintenance records...</div>
              ) : records.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No maintenance records found. Add your first record to get started.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Cost</TableHead>
                      <TableHead>Next Due</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record) => (
                      <TableRow key={record.id}>
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
