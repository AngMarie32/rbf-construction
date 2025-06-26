import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Calculator } from 'lucide-react';

interface BidSettingsProps {
  projectId: string;
  onSettingsChange?: (settings: BidSettings) => void;
}

interface BidSettings {
  contingencyType: 'percentage' | 'dollar';
  contingencyValue: number;
  profitMargin: number;
  overhead: number;
  bondingCost: number;
}

export function BidSettings({ projectId, onSettingsChange }: BidSettingsProps) {
  const [settings, setSettings] = useState<BidSettings>({
    contingencyType: 'percentage',
    contingencyValue: 0,
    profitMargin: 0,
    overhead: 0,
    bondingCost: 0
  });

  const updateSetting = (field: keyof BidSettings, value: any) => {
    const newSettings = { ...settings, [field]: value };
    setSettings(newSettings);
    onSettingsChange?.(newSettings);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calculator className="w-5 h-5" />
          Bid Settings
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Contingency Settings */}
        <div className="space-y-4">
          <h3 className="font-medium text-lg">Contingency</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contingency-type">Contingency Type</Label>
              <Select
                value={settings.contingencyType}
                onValueChange={(value: 'percentage' | 'dollar') => updateSetting('contingencyType', value)}
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
                Contingency {settings.contingencyType === 'percentage' ? 'Percentage' : 'Amount'}
              </Label>
              <Input
                id="contingency-value"
                type="number"
                value={settings.contingencyValue}
                onChange={(e) => updateSetting('contingencyValue', parseFloat(e.target.value) || 0)}
                min="0"
                step={settings.contingencyType === 'percentage' ? '0.1' : '100'}
                placeholder={settings.contingencyType === 'percentage' ? '0.0' : '0.00'}
              />
            </div>
          </div>
        </div>

        {/* Other Settings */}
        <div className="space-y-4">
          <h3 className="font-medium text-lg">Additional Costs</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="profit-margin">Profit Margin (%)</Label>
              <Input
                id="profit-margin"
                type="number"
                value={settings.profitMargin}
                onChange={(e) => updateSetting('profitMargin', parseFloat(e.target.value) || 0)}
                min="0"
                step="0.1"
                placeholder="0.0"
              />
            </div>
            <div>
              <Label htmlFor="overhead">Overhead (%)</Label>
              <Input
                id="overhead"
                type="number"
                value={settings.overhead}
                onChange={(e) => updateSetting('overhead', parseFloat(e.target.value) || 0)}
                min="0"
                step="0.1"
                placeholder="0.0"
              />
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="bonding-cost">Bonding Cost ($)</Label>
              <Input
                id="bonding-cost"
                type="number"
                value={settings.bondingCost}
                onChange={(e) => updateSetting('bondingCost', parseFloat(e.target.value) || 0)}
                min="0"
                step="100"
                placeholder="0.00"
              />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
