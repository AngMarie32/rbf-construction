
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BidSettingsProps {
  projectId: string;
}

export function BidSettings({ projectId }: BidSettingsProps) {
  const [contingencyType, setContingencyType] = useState<'percentage' | 'dollar'>('percentage');
  const [contingencyValue, setContingencyValue] = useState<number>(0);
  const [markupPercentage, setMarkupPercentage] = useState<number>(0);
  const [bondRate, setBondRate] = useState<number>(0);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchProjectSettings();
  }, [projectId]);

  const fetchProjectSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('contingency_type, contingency_value')
        .eq('id', projectId)
        .single();

      if (error) throw error;

      if (data) {
        setContingencyType((data.contingency_type as 'percentage' | 'dollar') || 'percentage');
        setContingencyValue(data.contingency_value || 0);
      }

      // Fetch company settings for markup and bond rate
      const { data: companyData, error: companyError } = await supabase
        .from('company_settings')
        .select('profit_margin, overhead_percentage')
        .limit(1)
        .maybeSingle();

      if (companyData) {
        setMarkupPercentage(companyData.profit_margin || 0);
        setBondRate(companyData.overhead_percentage || 0);
      }
    } catch (error) {
      console.error('Error fetching project settings:', error);
    }
  };

  const handleSaveSettings = async () => {
    setLoading(true);
    try {
      // Update project settings
      const { error: projectError } = await supabase
        .from('projects')
        .update({
          contingency_type: contingencyType,
          contingency_value: contingencyValue,
          updated_at: new Date().toISOString()
        })
        .eq('id', projectId);

      if (projectError) throw projectError;

      // Update company settings
      const { data: existingCompany } = await supabase
        .from('company_settings')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (existingCompany) {
        const { error: companyError } = await supabase
          .from('company_settings')
          .update({
            profit_margin: markupPercentage,
            overhead_percentage: bondRate,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingCompany.id);

        if (companyError) throw companyError;
      } else {
        const { error: companyError } = await supabase
          .from('company_settings')
          .insert({
            company_name: 'BuildPro Construction',
            profit_margin: markupPercentage,
            overhead_percentage: bondRate
          });

        if (companyError) throw companyError;
      }

      toast.success('Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('Failed to save settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Bid Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          <h4 className="font-medium">Contingency Settings</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contingency-type">Contingency Type</Label>
              <Select
                value={contingencyType}
                onValueChange={(value) => setContingencyType(value as 'percentage' | 'dollar')}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="percentage">Percentage (%)</SelectItem>
                  <SelectItem value="dollar">Dollar Amount ($)</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="contingency-value">
                Contingency {contingencyType === 'percentage' ? 'Percentage' : 'Amount'}
              </Label>
              <Input
                id="contingency-value"
                type="number"
                value={contingencyValue}
                onChange={(e) => setContingencyValue(parseFloat(e.target.value) || 0)}
                min="0"
                step={contingencyType === 'percentage' ? '0.1' : '0.01'}
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="font-medium">Pricing Settings</h4>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="markup-percentage">Mark % (Profit Margin)</Label>
              <Input
                id="markup-percentage"
                type="number"
                value={markupPercentage}
                onChange={(e) => setMarkupPercentage(parseFloat(e.target.value) || 0)}
                min="0"
                step="0.1"
              />
            </div>

            <div>
              <Label htmlFor="bond-rate">Bond Rate %</Label>
              <Input
                id="bond-rate"
                type="number"
                value={bondRate}
                onChange={(e) => setBondRate(parseFloat(e.target.value) || 0)}
                min="0"
                step="0.1"
              />
            </div>
          </div>
        </div>

        <div className="pt-4 border-t">
          <Button onClick={handleSaveSettings} disabled={loading}>
            {loading ? 'Saving...' : 'Save Settings'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
