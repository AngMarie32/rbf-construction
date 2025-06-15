
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ProjectBilling {
  [projectId: string]: {
    totalBilled: number;
    totalReceived: number;
  };
}

export function useProjectBilling(projectIds: string[]) {
  const [billing, setBilling] = useState<ProjectBilling>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectIds.length === 0) {
      setBilling({});
      setLoading(false);
      return;
    }

    fetchBilling();
  }, [projectIds]);

  const fetchBilling = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('project_billing')
        .select('project_id, billed_amount, paid_amount')
        .in('project_id', projectIds);

      if (error) throw error;

      const billingByProject: ProjectBilling = {};
      
      // Initialize all project IDs with 0
      projectIds.forEach(id => {
        billingByProject[id] = { totalBilled: 0, totalReceived: 0 };
      });

      // Sum up billing by project
      (data || []).forEach(billing => {
        if (billing.project_id) {
          billingByProject[billing.project_id].totalBilled += Number(billing.billed_amount || 0);
          billingByProject[billing.project_id].totalReceived += Number(billing.paid_amount || 0);
        }
      });

      setBilling(billingByProject);
    } catch (error) {
      console.error('Error fetching project billing:', error);
      setBilling({});
    } finally {
      setLoading(false);
    }
  };

  return { billing, loading, refetch: fetchBilling };
}
