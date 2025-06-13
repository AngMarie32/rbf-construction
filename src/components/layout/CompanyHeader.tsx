
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CompanyInfo {
  company_name: string;
  logo_url: string;
}

export function CompanyHeader() {
  const [companyInfo, setCompanyInfo] = useState<CompanyInfo>({
    company_name: 'BuildPro Construction',
    logo_url: ''
  });

  useEffect(() => {
    fetchCompanyInfo();
  }, []);

  const fetchCompanyInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('company_name, logo_url')
        .limit(1)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setCompanyInfo(data);
      }
    } catch (error) {
      console.error('Error fetching company info:', error);
    }
  };

  return (
    <div className="flex items-center gap-3 mb-4">
      {companyInfo.logo_url && (
        <img 
          src={companyInfo.logo_url} 
          alt={`${companyInfo.company_name} logo`}
          className="h-10 w-auto object-contain"
        />
      )}
      <h1 className="text-2xl font-bold text-gray-900">{companyInfo.company_name}</h1>
    </div>
  );
}
