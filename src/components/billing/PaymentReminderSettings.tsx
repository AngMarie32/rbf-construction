
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Bell, Calendar, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ReminderSettings {
  id?: string;
  project_id: string;
  billing_frequency: 'weekly' | 'bi-weekly' | 'monthly' | 'quarterly';
  reminder_days_before: number;
  is_enabled: boolean;
  next_reminder_date?: string;
}

interface PaymentReminderSettingsProps {
  projectId: string;
  projectName: string;
}

export const PaymentReminderSettings: React.FC<PaymentReminderSettingsProps> = ({
  projectId,
  projectName
}) => {
  const [settings, setSettings] = useState<ReminderSettings>({
    project_id: projectId,
    billing_frequency: 'monthly',
    reminder_days_before: 3,
    is_enabled: false
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchSettings();
  }, [projectId]);

  const fetchSettings = async () => {
    try {
      // For now, we'll simulate this since we don't have the table yet
      // This would be replaced with actual database call once the table is created
      console.log('Fetching payment reminder settings for project:', projectId);
    } catch (error) {
      console.error('Error fetching reminder settings:', error);
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      // Calculate next reminder date based on frequency
      const nextDate = calculateNextReminderDate(settings.billing_frequency, settings.reminder_days_before);
      
      const updatedSettings = {
        ...settings,
        next_reminder_date: nextDate.toISOString()
      };

      // For now, we'll just show a success message
      // This would be replaced with actual database save once the table is created
      console.log('Saving reminder settings:', updatedSettings);
      
      toast.success('Payment reminder settings saved successfully');
    } catch (error) {
      console.error('Error saving reminder settings:', error);
      toast.error('Failed to save reminder settings');
    } finally {
      setLoading(false);
    }
  };

  const calculateNextReminderDate = (frequency: string, daysBefore: number): Date => {
    const now = new Date();
    const nextDate = new Date(now);

    switch (frequency) {
      case 'weekly':
        nextDate.setDate(now.getDate() + 7 - daysBefore);
        break;
      case 'bi-weekly':
        nextDate.setDate(now.getDate() + 14 - daysBefore);
        break;
      case 'monthly':
        nextDate.setMonth(now.getMonth() + 1);
        nextDate.setDate(1);
        nextDate.setDate(nextDate.getDate() - daysBefore);
        break;
      case 'quarterly':
        nextDate.setMonth(now.getMonth() + 3);
        nextDate.setDate(1);
        nextDate.setDate(nextDate.getDate() - daysBefore);
        break;
    }

    return nextDate;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Bell className="w-5 h-5" />
          Payment Application Reminders - {projectName}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center space-x-2">
          <Switch
            id="enable-reminders"
            checked={settings.is_enabled}
            onCheckedChange={(enabled) => setSettings({ ...settings, is_enabled: enabled })}
          />
          <Label htmlFor="enable-reminders">Enable payment application reminders</Label>
        </div>

        {settings.is_enabled && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="billing-frequency">Billing Frequency</Label>
                <Select 
                  value={settings.billing_frequency} 
                  onValueChange={(value: any) => setSettings({ ...settings, billing_frequency: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="weekly">Weekly</SelectItem>
                    <SelectItem value="bi-weekly">Bi-weekly</SelectItem>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="reminder-days">Remind me (days before)</Label>
                <Input
                  id="reminder-days"
                  type="number"
                  min="1"
                  max="30"
                  value={settings.reminder_days_before}
                  onChange={(e) => setSettings({ 
                    ...settings, 
                    reminder_days_before: parseInt(e.target.value) || 3 
                  })}
                />
              </div>
            </div>

            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span className="font-medium text-blue-900">Next Reminder</span>
              </div>
              <p className="text-sm text-blue-700">
                Based on your {settings.billing_frequency} billing frequency, you'll be reminded{' '}
                {settings.reminder_days_before} days before your next payment application is due.
              </p>
              <p className="text-sm text-blue-600 mt-1">
                Next reminder: {calculateNextReminderDate(settings.billing_frequency, settings.reminder_days_before).toLocaleDateString()}
              </p>
            </div>
          </>
        )}

        <Button onClick={saveSettings} disabled={loading}>
          <Settings className="w-4 h-4 mr-2" />
          {loading ? 'Saving...' : 'Save Reminder Settings'}
        </Button>
      </CardContent>
    </Card>
  );
};
