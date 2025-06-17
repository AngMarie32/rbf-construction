import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Building, User, Mail, Calculator } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Layout } from '@/components/layout/Layout';
import { EmailSettings } from '@/components/profile/EmailSettings';
import { ProfileSettings } from '@/components/profile/ProfileSettings';

const Settings = () => {
  const [companySettings, setCompanySettings] = useState({
    company_name: '',
    company_address: '',
    company_phone: '',
    company_email: '',
    logo_url: '',
    default_tax_rate: 0,
    default_retainage_rate: 10,
    profit_margin: 0,
    overhead_percentage: 0,
  });
  const [loading, setLoading] = useState(false);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [existingId, setExistingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchCompanySettings();
  }, []);

  const fetchCompanySettings = async () => {
    console.log('Fetching company settings...');
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      console.log('Company settings data:', data);
      console.log('Company settings error:', error);

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data) {
        console.log('Setting existing ID:', data.id);
        setExistingId(data.id);
        setCompanySettings({
          company_name: data.company_name || '',
          company_address: data.company_address || '',
          company_phone: data.company_phone || '',
          company_email: data.company_email || '',
          logo_url: data.logo_url || '',
          default_tax_rate: data.default_tax_rate || 0,
          default_retainage_rate: data.default_retainage_rate || 10,
          profit_margin: data.profit_margin || 0,
          overhead_percentage: data.overhead_percentage || 0,
        });
      } else {
        console.log('No existing company settings found');
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

  const handleLogoUpload = async () => {
    if (!logoFile) return null;

    console.log('Starting logo upload...');
    setUploadingLogo(true);
    try {
      const fileExt = logoFile.name.split('.').pop();
      const fileName = `company-logo-${Date.now()}.${fileExt}`;

      console.log('Uploading file:', fileName);

      const { data, error } = await supabase.storage
        .from('company-assets')
        .upload(fileName, logoFile);

      if (error) {
        console.error('Logo upload error:', error);
        throw error;
      }

      console.log('Logo upload success:', data);

      const { data: { publicUrl } } = supabase.storage
        .from('company-assets')
        .getPublicUrl(fileName);

      console.log('Logo public URL:', publicUrl);
      return publicUrl;
    } catch (error) {
      console.error('Error uploading logo:', error);
      toast({
        title: "Error",
        description: "Failed to upload logo",
        variant: "destructive",
      });
      return null;
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleSaveCompanySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('=== FORM SUBMITTED ===');
    console.log('Starting save company settings...');
    console.log('Current state - existingId:', existingId);
    console.log('Current settings:', companySettings);
    
    setLoading(true);

    try {
      let logoUrl = companySettings.logo_url;

      if (logoFile) {
        console.log('Uploading new logo...');
        const uploadedUrl = await handleLogoUpload();
        if (uploadedUrl) {
          logoUrl = uploadedUrl;
          console.log('New logo URL:', logoUrl);
        }
      }

      const settingsToSave = {
        company_name: companySettings.company_name,
        company_address: companySettings.company_address,
        company_phone: companySettings.company_phone,
        company_email: companySettings.company_email,
        logo_url: logoUrl,
        default_tax_rate: companySettings.default_tax_rate,
        default_retainage_rate: companySettings.default_retainage_rate,
        profit_margin: companySettings.profit_margin,
        overhead_percentage: companySettings.overhead_percentage,
      };

      console.log('Settings to save:', settingsToSave);

      let result;
      if (existingId) {
        console.log('Updating existing record with ID:', existingId);
        result = await supabase
          .from('company_settings')
          .update(settingsToSave)
          .eq('id', existingId);
      } else {
        console.log('Inserting new record...');
        result = await supabase
          .from('company_settings')
          .insert([settingsToSave])
          .select()
          .single();
        
        if (result.data) {
          console.log('New record created with ID:', result.data.id);
          setExistingId(result.data.id);
        }
      }

      console.log('Save result:', result);

      if (result.error) {
        console.error('Save error:', result.error);
        throw result.error;
      }

      setCompanySettings(prev => ({ ...prev, logo_url: logoUrl }));
      setLogoFile(null);

      toast({
        title: "Success",
        description: "Company settings saved successfully",
      });

      console.log('Refreshing company settings...');
      fetchCompanySettings();
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

  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      console.log('Logo file selected:', file.name);
      setLogoFile(file);
    }
  };

  const handleButtonClick = () => {
    console.log('=== SAVE BUTTON CLICKED ===');
    console.log('Button clicked - this should trigger form submission');
  };

  return (
    <Layout title="Settings" subtitle="Manage your application preferences and company information">
      <div className="max-w-4xl mx-auto space-y-6">
        <Tabs defaultValue="company" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="company" className="flex items-center gap-2">
              <Building className="w-4 h-4" />
              Company
            </TabsTrigger>
            <TabsTrigger value="bidding" className="flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              Bidding
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

                  <div className="space-y-2">
                    <Label htmlFor="company_logo">Company Logo</Label>
                    <div className="flex items-center gap-4">
                      {companySettings.logo_url && (
                        <img 
                          src={companySettings.logo_url} 
                          alt="Company logo preview"
                          className="h-16 w-auto object-contain border rounded"
                        />
                      )}
                      <div className="flex-1">
                        <Input
                          id="company_logo"
                          type="file"
                          accept="image/*"
                          onChange={handleLogoFileChange}
                          className="cursor-pointer"
                        />
                        <p className="text-sm text-gray-500 mt-1">
                          Upload a logo image (PNG, JPG, GIF)
                        </p>
                      </div>
                    </div>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={loading || uploadingLogo}
                    onClick={handleButtonClick}
                  >
                    {loading || uploadingLogo ? 'Saving...' : 'Save Company Settings'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bidding">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calculator className="w-5 h-5" />
                  Bidding & Financial Settings
                </CardTitle>
                <p className="text-sm text-gray-600">
                  Configure your company's profit margins and overhead percentages. 
                  Budget totals will be calculated after adding these values to direct costs.
                </p>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSaveCompanySettings} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="profit_margin">Profit Margin (%)</Label>
                      <Input
                        id="profit_margin"
                        type="number"
                        step="0.01"
                        value={companySettings.profit_margin}
                        onChange={(e) => setCompanySettings(prev => ({ 
                          ...prev, 
                          profit_margin: parseFloat(e.target.value) || 0 
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="overhead_percentage">Overhead Percentage (%)</Label>
                      <Input
                        id="overhead_percentage"
                        type="number"
                        step="0.01"
                        value={companySettings.overhead_percentage}
                        onChange={(e) => setCompanySettings(prev => ({ 
                          ...prev, 
                          overhead_percentage: parseFloat(e.target.value) || 0 
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="default_tax_rate">Default Tax Rate (%)</Label>
                      <Input
                        id="default_tax_rate"
                        type="number"
                        step="0.01"
                        value={companySettings.default_tax_rate}
                        onChange={(e) => setCompanySettings(prev => ({ 
                          ...prev, 
                          default_tax_rate: parseFloat(e.target.value) || 0 
                        }))}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="default_retainage_rate">Default Retainage Rate (%)</Label>
                      <Input
                        id="default_retainage_rate"
                        type="number"
                        step="0.01"
                        value={companySettings.default_retainage_rate}
                        onChange={(e) => setCompanySettings(prev => ({ 
                          ...prev, 
                          default_retainage_rate: parseFloat(e.target.value) || 0 
                        }))}
                      />
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-900 mb-2">Budget Calculation Formula:</h4>
                    <p className="text-sm text-blue-700">
                      Total Budget = Direct Costs + (Direct Costs × Overhead %) + (Direct Costs × Profit %)
                    </p>
                  </div>

                  <Button 
                    type="submit" 
                    disabled={loading}
                  >
                    {loading ? 'Saving...' : 'Save Bidding Settings'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="profile">
            <ProfileSettings />
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
