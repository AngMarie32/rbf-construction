
import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Building, Save, Settings as SettingsIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function Settings() {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [companyInfo, setCompanyInfo] = useState({
    company_name: 'BuildPro Construction',
    company_address: '',
    company_phone: '',
    company_email: '',
    logo_url: '',
    default_tax_rate: 0,
    default_retainage_rate: 10
  });

  useEffect(() => {
    fetchCompanySettings();
  }, []);

  const fetchCompanySettings = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setCompanyInfo(data);
      }
    } catch (error) {
      console.error('Error fetching company settings:', error);
      toast.error('Failed to load company settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const { data: existingData } = await supabase
        .from('company_settings')
        .select('id')
        .limit(1)
        .maybeSingle();

      if (existingData) {
        const { error } = await supabase
          .from('company_settings')
          .update(companyInfo)
          .eq('id', existingData.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('company_settings')
          .insert(companyInfo);

        if (error) throw error;
      }

      toast.success('Company settings saved successfully');
    } catch (error) {
      console.error('Error saving company settings:', error);
      toast.error('Failed to save company settings');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Layout title="Settings" subtitle="Manage company information and preferences">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Settings" subtitle="Manage company information and preferences">
      <div className="max-w-4xl mx-auto space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="w-5 h-5" />
              Company Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="company_name">Company Name *</Label>
                <Input
                  id="company_name"
                  value={companyInfo.company_name}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, company_name: e.target.value })}
                  placeholder="Your Company Name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_email">Company Email</Label>
                <Input
                  id="company_email"
                  type="email"
                  value={companyInfo.company_email}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, company_email: e.target.value })}
                  placeholder="contact@company.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="company_phone">Company Phone</Label>
                <Input
                  id="company_phone"
                  value={companyInfo.company_phone}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, company_phone: e.target.value })}
                  placeholder="(555) 123-4567"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="logo_url">Logo URL</Label>
                <Input
                  id="logo_url"
                  type="url"
                  value={companyInfo.logo_url}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, logo_url: e.target.value })}
                  placeholder="https://example.com/logo.png"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="company_address">Company Address</Label>
              <Textarea
                id="company_address"
                value={companyInfo.company_address}
                onChange={(e) => setCompanyInfo({ ...companyInfo, company_address: e.target.value })}
                placeholder="123 Main Street, City, State 12345"
                rows={3}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="default_tax_rate">Default Tax Rate (%)</Label>
                <Input
                  id="default_tax_rate"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={companyInfo.default_tax_rate}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, default_tax_rate: parseFloat(e.target.value) || 0 })}
                  placeholder="8.25"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="default_retainage_rate">Default Retainage Rate (%)</Label>
                <Input
                  id="default_retainage_rate"
                  type="number"
                  step="0.1"
                  min="0"
                  max="100"
                  value={companyInfo.default_retainage_rate}
                  onChange={(e) => setCompanyInfo({ ...companyInfo, default_retainage_rate: parseFloat(e.target.value) || 10 })}
                  placeholder="10"
                />
              </div>
            </div>

            <div className="flex justify-end pt-4">
              <Button onClick={handleSave} disabled={saving || !companyInfo.company_name}>
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
