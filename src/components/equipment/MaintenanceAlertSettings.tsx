
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Bell, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface MaintenanceAlertSettingsProps {
  equipmentId?: string;
  equipmentName?: string;
}

interface AlertSetting {
  id: string;
  equipment_id: string;
  alert_days_before: number;
  alert_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export function MaintenanceAlertSettings({ equipmentId, equipmentName }: MaintenanceAlertSettingsProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [alertSettings, setAlertSettings] = useState<AlertSetting[]>([]);
  const [newAlert, setNewAlert] = useState({
    alert_days_before: 7,
    alert_type: 'maintenance' as 'maintenance' | 'inspection' | 'service'
  });

  useEffect(() => {
    if (open && equipmentId) {
      fetchAlertSettings();
    }
  }, [open, equipmentId]);

  const fetchAlertSettings = async () => {
    if (!equipmentId) return;

    try {
      const { data, error } = await supabase
        .from('equipment_alert_settings')
        .select('*')
        .eq('equipment_id', equipmentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAlertSettings(data || []);
    } catch (error) {
      console.error('Error fetching alert settings:', error);
      toast.error('Failed to load alert settings');
    }
  };

  const handleAddAlert = async () => {
    if (!equipmentId) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('equipment_alert_settings')
        .insert([{
          equipment_id: equipmentId,
          alert_days_before: newAlert.alert_days_before,
          alert_type: newAlert.alert_type,
          is_active: true
        }])
        .select();

      if (error) throw error;

      toast.success('Alert setting added successfully');
      setNewAlert({ alert_days_before: 7, alert_type: 'maintenance' });
      fetchAlertSettings();
    } catch (error) {
      console.error('Error adding alert setting:', error);
      toast.error('Failed to add alert setting');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleAlert = async (alertId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('equipment_alert_settings')
        .update({ is_active: !isActive })
        .eq('id', alertId);

      if (error) throw error;

      toast.success(`Alert ${!isActive ? 'enabled' : 'disabled'}`);
      fetchAlertSettings();
    } catch (error) {
      console.error('Error toggling alert:', error);
      toast.error('Failed to update alert');
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    if (!confirm('Are you sure you want to delete this alert?')) return;

    try {
      const { error } = await supabase
        .from('equipment_alert_settings')
        .delete()
        .eq('id', alertId);

      if (error) throw error;

      toast.success('Alert deleted successfully');
      fetchAlertSettings();
    } catch (error) {
      console.error('Error deleting alert:', error);
      toast.error('Failed to delete alert');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="flex items-center gap-2">
          <Settings className="w-4 h-4" />
          Maintenance Alerts
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="w-5 h-5" />
            Maintenance Alert Settings
            {equipmentName && <span className="text-sm font-normal">- {equipmentName}</span>}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add New Alert */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Add New Alert</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="alert_type">Alert Type</Label>
                  <Select
                    value={newAlert.alert_type}
                    onValueChange={(value: 'maintenance' | 'inspection' | 'service') => 
                      setNewAlert(prev => ({ ...prev, alert_type: value }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="maintenance">Maintenance</SelectItem>
                      <SelectItem value="inspection">Inspection</SelectItem>
                      <SelectItem value="service">Service</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="alert_days">Days Before Alert</Label>
                  <Input
                    id="alert_days"
                    type="number"
                    min="1"
                    max="365"
                    value={newAlert.alert_days_before}
                    onChange={(e) => setNewAlert(prev => ({ 
                      ...prev, 
                      alert_days_before: parseInt(e.target.value) || 7 
                    }))}
                    placeholder="Days before maintenance"
                  />
                </div>
              </div>
              <Button 
                onClick={handleAddAlert} 
                disabled={loading}
                className="w-full"
              >
                {loading ? 'Adding...' : 'Add Alert'}
              </Button>
            </CardContent>
          </Card>

          {/* Existing Alerts */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Current Alert Settings</CardTitle>
            </CardHeader>
            <CardContent>
              {alertSettings.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <AlertTriangle className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No alert settings configured</p>
                  <p className="text-sm">Add an alert above to get notified about upcoming maintenance</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {alertSettings.map((alert) => (
                    <div key={alert.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-3 h-3 rounded-full ${alert.is_active ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <div>
                          <div className="font-medium capitalize">{alert.alert_type}</div>
                          <div className="text-sm text-gray-500 flex items-center gap-1">
                            <Clock className="w-3 h-3" />
                            Alert {alert.alert_days_before} days before due
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleToggleAlert(alert.id, alert.is_active)}
                        >
                          {alert.is_active ? 'Disable' : 'Enable'}
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDeleteAlert(alert.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </DialogContent>
    </Dialog>
  );
}
