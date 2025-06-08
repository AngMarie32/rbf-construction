
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarIcon, DollarSign, X, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

interface MaintenanceLog {
  id: string;
  equipment_id: string;
  date: string;
  description: string;
  cost: number;
  next_due: string | null;
  equipment: {
    name: string;
  };
}

interface AllMaintenanceViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AllMaintenanceView({ open, onOpenChange }: AllMaintenanceViewProps) {
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceLog[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      fetchMaintenanceLogs();
    }
  }, [open]);

  const fetchMaintenanceLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('maintenance_logs')
        .select(`
          *,
          equipment:equipment_id (
            name
          )
        `)
        .order('date', { ascending: false });

      if (error) throw error;
      setMaintenanceLogs(data || []);
    } catch (error) {
      console.error('Error fetching maintenance logs:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportToCSV = () => {
    const csvContent = "data:text/csv;charset=utf-8," + 
      "Equipment,Date,Description,Cost,Next Due\n" +
      maintenanceLogs.map(log => 
        `"${log.equipment.name}","${format(new Date(log.date), 'MM/dd/yyyy')}","${log.description}",${log.cost},"${log.next_due ? format(new Date(log.next_due), 'MM/dd/yyyy') : 'N/A'}"`
      ).join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `maintenance_log_${format(new Date(), 'yyyy-MM-dd')}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader className="border-b pb-4">
          <div className="flex justify-between items-center">
            <DialogTitle>All Maintenance Records</DialogTitle>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={exportToCSV}
                className="flex items-center gap-2"
              >
                <Download className="w-4 h-4" />
                Export CSV
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onOpenChange(false)}
                className="h-8 w-8 p-0"
              >
                <X className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </DialogHeader>
        
        <div className="flex-1 overflow-auto">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : maintenanceLogs.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              No maintenance records found
            </div>
          ) : (
            <div className="space-y-4 p-1">
              {maintenanceLogs.map((log) => (
                <Card key={log.id}>
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <CardTitle className="text-lg">{log.equipment.name}</CardTitle>
                      <div className="flex items-center gap-2">
                        <Badge variant="outline" className="flex items-center gap-1">
                          <CalendarIcon className="w-3 h-3" />
                          {format(new Date(log.date), 'MMM dd, yyyy')}
                        </Badge>
                        <Badge variant="secondary" className="flex items-center gap-1">
                          <DollarSign className="w-3 h-3" />
                          ${log.cost.toLocaleString()}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700 mb-3">{log.description}</p>
                    {log.next_due && (
                      <div className="text-sm text-muted-foreground">
                        Next maintenance due: {format(new Date(log.next_due), 'MMM dd, yyyy')}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
