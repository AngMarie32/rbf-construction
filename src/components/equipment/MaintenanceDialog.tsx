import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Calendar, Plus, Wrench, Check, Clock, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MaintenanceRecord {
  id: string;
  date: Date;
  description: string;
  cost: number;
  nextDue: Date | null;
  type: 'completed' | 'scheduled';
  isCompleted?: boolean;
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
  const [activeTab, setActiveTab] = useState('completed');
  const [showAddForm, setShowAddForm] = useState(false);
  const [newRecord, setNewRecord] = useState({
    date: new Date().toISOString().split('T')[0],
    description: '',
    cost: '',
    nextDue: '',
    type: 'completed' as 'completed' | 'scheduled'
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
        nextDue: record.next_due ? new Date(record.next_due) : null,
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

  const addMaintenanceRecord = async () => {
    if (!newRecord.description || !newRecord.date) {
      toast.error('Please fill in required fields');
      return;
    }

    try {
      const recordData = {
        equipment_id: equipmentId,
        date: newRecord.type === 'completed' ? newRecord.date : new Date().toISOString().split('T')[0],
        description: newRecord.description,
        cost: parseFloat(newRecord.cost) || 0,
        next_due: newRecord.type === 'scheduled' ? newRecord.date : (newRecord.nextDue || null)
      };

      const { error } = await supabase
        .from('maintenance_logs')
        .insert(recordData);

      if (error) throw error;

      toast.success(`${newRecord.type === 'completed' ? 'Maintenance record' : 'Scheduled maintenance'} added successfully`);
      setNewRecord({
        date: new Date().toISOString().split('T')[0],
        description: '',
        cost: '',
        nextDue: '',
        type: 'completed'
      });
      setShowAddForm(false);
      fetchMaintenanceRecords();
    } catch (error) {
      console.error('Error adding maintenance record:', error);
      toast.error('Failed to add maintenance record');
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
      fetchMaintenanceRecords();
    } catch (error) {
      console.error('Error marking maintenance as completed:', error);
      toast.error('Failed to update maintenance status');
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
      fetchMaintenanceRecords();
    } catch (error) {
      console.error('Error deleting maintenance record:', error);
      toast.error('Failed to delete maintenance record');
    }
  };

  const completedRecords = records.filter(r => r.type === 'completed' || r.isCompleted);
  const scheduledRecords = records.filter(r => r.type === 'scheduled' && !r.isCompleted);
  const totalMaintenanceCost = completedRecords.reduce((sum, record) => sum + record.cost, 0);

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

          {/* Add New Record Form */}
          {showAddForm && (
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Add Maintenance Record</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex gap-4">
                  <Button
                    type="button"
                    variant={newRecord.type === 'completed' ? 'default' : 'outline'}
                    onClick={() => setNewRecord({ ...newRecord, type: 'completed' })}
                  >
                    Completed Maintenance
                  </Button>
                  <Button
                    type="button"
                    variant={newRecord.type === 'scheduled' ? 'default' : 'outline'}
                    onClick={() => setNewRecord({ ...newRecord, type: 'scheduled' })}
                  >
                    Schedule Future Maintenance
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="date">
                      {newRecord.type === 'completed' ? 'Date Completed *' : 'Date Due *'}
                    </Label>
                    <Input
                      id="date"
                      type="date"
                      value={newRecord.date}
                      onChange={(e) => setNewRecord({ ...newRecord, date: e.target.value })}
                    />
                  </div>
                  {newRecord.type === 'completed' && (
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
                  )}
                </div>

                <div>
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    value={newRecord.description}
                    onChange={(e) => setNewRecord({ ...newRecord, description: e.target.value })}
                    placeholder={newRecord.type === 'completed' ? 'Describe the maintenance work performed...' : 'Describe the maintenance work needed...'}
                    rows={3}
                  />
                </div>

                {newRecord.type === 'completed' && (
                  <div>
                    <Label htmlFor="nextDue">Next Due Date (Optional)</Label>
                    <Input
                      id="nextDue"
                      type="date"
                      value={newRecord.nextDue}
                      onChange={(e) => setNewRecord({ ...newRecord, nextDue: e.target.value })}
                    />
                  </div>
                )}

                <div className="flex space-x-2">
                  <Button onClick={addMaintenanceRecord}>
                    Add {newRecord.type === 'completed' ? 'Record' : 'Schedule'}
                  </Button>
                  <Button variant="outline" onClick={() => setShowAddForm(false)}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Records Tabs */}
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Maintenance Records</CardTitle>
              {!showAddForm && (
                <Button onClick={() => setShowAddForm(true)} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Record
                </Button>
              )}
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="completed">Completed ({completedRecords.length})</TabsTrigger>
                  <TabsTrigger value="scheduled">Scheduled ({scheduledRecords.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="completed" className="mt-4">
                  {loading ? (
                    <div className="text-center py-8">Loading maintenance records...</div>
                  ) : completedRecords.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No completed maintenance records found.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Date</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Cost</TableHead>
                          <TableHead>Next Due</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {completedRecords.map((record) => (
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
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => deleteMaintenanceRecord(record.id)}
                                className="text-red-600 hover:text-red-700 hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </TabsContent>

                <TabsContent value="scheduled" className="mt-4">
                  {loading ? (
                    <div className="text-center py-8">Loading scheduled maintenance...</div>
                  ) : scheduledRecords.length === 0 ? (
                    <div className="text-center py-8 text-gray-500">
                      No scheduled maintenance found.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Due Date</TableHead>
                          <TableHead>Description</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {scheduledRecords.map((record) => (
                          <TableRow key={record.id}>
                            <TableCell>
                              <div className="flex items-center space-x-2">
                                <Clock className="w-4 h-4 text-gray-400" />
                                <span>{record.nextDue ? format(record.nextDue, 'MMM dd, yyyy') : 'N/A'}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="max-w-xs truncate" title={record.description}>
                                {record.description}
                              </div>
                            </TableCell>
                            <TableCell>
                              {record.nextDue && record.nextDue < new Date() ? (
                                <Badge variant="destructive">Overdue</Badge>
                              ) : (
                                <Badge variant="secondary">Scheduled</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  size="sm"
                                  onClick={() => markAsCompleted(record.id)}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <Check className="w-4 h-4 mr-1" />
                                  Mark Done
                                </Button>
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
      </DialogContent>
    </Dialog>
  );
}
