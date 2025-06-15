
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building, User, Mail, Settings as SettingsIcon } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Layout } from '@/components/layout/Layout';
import { EmailSettings } from '@/components/profile/EmailSettings';

const Settings = () => {
  const [companySettings, setCompanySettings] = useState({
    company_name: '',
    company_address: '',
    company_phone: '',
    company_email: '',
    default_tax_rate: 0,
    default_retainage_rate: 10,
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchCompanySettings();
  }, []);

  const fetchCompanySettings = async () => {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        setCompanySettings(data);
      }
    } catch (error) {
      console.error('Error fetching company settings:', error);
      toast({
        title: "Error",
        description: "Failed to load company settings",
        variant: "destructive",
      });
    }
  };

  const handleSaveCompanySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('company_settings')
        .upsert(companySettings);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Company settings saved successfully",
      });
    } catch (error) {
      console.error('Error saving company settings:', error);
      toast({
        title: "Error",
        description: "Failed to save company settings",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout title="Settings" subtitle="Manage your application preferences and company information">
      <div className="max-w-4xl mx-auto space-y-6">
        <Tabs defaultValue="company" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="company" className="flex items-center gap-2">
              <Building className="w-4 h-4" />
              Company
            </TabsTrigger>
            <TabsTrigger value="profile" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Profile
            </TabsTrigger>
            <TabsTrigger value="email" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Email
            </TabsTrigger>
          </TabsList>

          <TabsContent value="company">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building className="w-5 h-5" />
                  Company Information
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Manage your company details and default settings
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveCompanySettings} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="company_name">Company Name</Label>
                      <Input
                        id="company_name"
                        value={companySettings.company_name}
                        onChange={(e) => setCompanySettings(prev => ({ ...prev, company_name: e.target.value }))}
                        placeholder="Enter company name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="company_email">Company Email</Label>
                      <Input
                        id="company_email"
                        type="email"
                        value={companySettings.company_email}
                        onChange={(e) => setCompanySettings(prev => ({ ...prev, company_email: e.target.value }))}
                        placeholder="Enter company email"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company_address">Company Address</Label>
                    <Input
                      id="company_address"
                      value={companySettings.company_address}
                      onChange={(e) => setCompanySettings(prev => ({ ...prev, company_address: e.target.value }))}
                      placeholder="Enter company address"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company_phone">Company Phone</Label>
                    <Input
                      id="company_phone"
                      value={companySettings.company_phone}
                      onChange={(e) => setCompanySettings(prev => ({ ...prev, company_phone: e.target.value }))}
                      placeholder="Enter company phone"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="default_tax_rate">Default Tax Rate (%)</Label>
                      <Input
                        id="default_tax_rate"
                        type="number"
                        step="0.01"
                        value={companySettings.default_tax_rate}
                        onChange={(e) => setCompanySettings(prev => ({ ...prev, default_tax_rate: parseFloat(e.target.value) || 0 }))}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="default_retainage_rate">Default Retainage Rate (%)</Label>
                      <Input
                        id="default_retainage_rate"
                        type="number"
                        step="0.01"
                        value={companySettings.default_retainage_rate}
                        onChange={(e) => setCompanySettings(prev => ({ ...prev, default_retainage_rate: parseFloat(e.target.value) || 0 }))}
                        placeholder="10.00"
                      />
                    </div>
                  </div>

                  <Button type="submit" disabled={loading}>
                    {loading ? 'Saving...' : 'Save Company Settings'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <User className="w-5 h-5" />
                  Profile Settings
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Manage your personal profile information
                </p>
              </CardHeader>
              <CardContent>
                <p className="text-gray-500">Profile settings coming soon...</p>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="email">
            <EmailSettings />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default Settings;
