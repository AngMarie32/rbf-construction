
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BidSettingsProps {
  projectId: string;
}

export function BidSettings({ projectId }: BidSettingsProps) {
  const [settings, setSettings] = useState({
    markupPercentage: 15,
    contingencyPercentage: 5,
    includeTax: true,
    taxPercentage: 8.5,
    roundToNearest: 100
  });
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSettings();
  }, [projectId]);

  const loadSettings = async () => {
    if (!projectId) return;
    
    setLoading(true);
    try {
      console.log('Loading bid settings for project:', projectId);
      
      const { data, error } = await supabase
        .from('bid_settings')
        .select('*')
        .eq('project_id', projectId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading bid settings:', error);
        throw error;
      }

      if (data) {
        console.log('Loaded bid settings:', data);
        setSettings({
          markupPercentage: data.markup_percentage || 15,
          contingencyPercentage: data.contingency_percentage || 5,
          includeTax: data.include_tax || true,
          taxPercentage: data.tax_percentage || 8.5,
          roundToNearest: data.round_to_nearest || 100
        });
      } else {
        console.log('No existing bid settings found, using defaults');
      }
    } catch (error) {
      console.error('Error loading bid settings:', error);
      toast.error('Failed to load bid settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!projectId) {
      toast.error('No project selected');
      return;
    }

    setSaving(true);
    try {
      console.log('Saving bid settings:', settings);
      
      const { data, error } = await supabase
        .from('bid_settings')
        .upsert({
          project_id: projectId,
          markup_percentage: settings.markupPercentage,
          contingency_percentage: settings.contingencyPercentage,
          include_tax: settings.includeTax,
          tax_percentage: settings.taxPercentage,
          round_to_nearest: settings.roundToNearest,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'project_id'
        })
        .select();

      if (error) {
        console.error('Error saving bid settings:', error);
        throw error;
      }

      console.log('Bid settings saved successfully:', data);
      toast.success('Bid settings saved successfully');
    } catch (error) {
      console.error('Error saving bid settings:', error);
      toast.error('Failed to save bid settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Bid Settings</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bid Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <Label htmlFor="markup">Mark Up %</Label>
              <Input
                id="markup"
                type="number"
                value={settings.markupPercentage}
                onChange={(e) => setSettings(prev => ({ ...prev, markupPercentage: parseFloat(e.target.value) || 0 }))}
                min="0"
                step="0.1"
              />
            </div>

            <div>
              <Label htmlFor="contingency">Contingency %</Label>
              <Input
                id="contingency"
                type="number"
                value={settings.contingencyPercentage}
                onChange={(e) => setSettings(prev => ({ ...prev, contingencyPercentage: parseFloat(e.target.value) || 0 }))}
                min="0"
                step="0.1"
              />
            </div>

            <div>
              <Label htmlFor="roundTo">Round to Nearest</Label>
              <Input
                id="roundTo"
                type="number"
                value={settings.roundToNearest}
                onChange={(e) => setSettings(prev => ({ ...prev, roundToNearest: parseFloat(e.target.value) || 1 }))}
                min="1"
                step="1"
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Switch
                id="include-tax"
                checked={settings.includeTax}
                onCheckedChange={(checked) => setSettings(prev => ({ ...prev, includeTax: checked }))}
              />
              <Label htmlFor="include-tax">Include Tax</Label>
            </div>

            {settings.includeTax && (
              <div>
                <Label htmlFor="tax">Tax %</Label>
                <Input
                  id="tax"
                  type="number"
                  value={settings.taxPercentage}
                  onChange={(e) => setSettings(prev => ({ ...prev, taxPercentage: parseFloat(e.target.value) || 0 }))}
                  min="0"
                  step="0.1"
                />
              </div>
            )}
          </div>
        </div>

        <Button onClick={handleSave} disabled={saving} className="w-full">
          <Save className="w-4 h-4 mr-2" />
          {saving ? 'Saving...' : 'Save Settings'}
        </Button>
      </CardContent>
    </Card>
  );
}
