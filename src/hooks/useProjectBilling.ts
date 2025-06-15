import { useState, useEffect, useCallback } from 'react';
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

  const fetchBilling = useCallback(async () => {
    if (projectIds.length === 0) {
      setBilling({});
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      
      // Initialize billing data with 0 values for all projects
      const initialBilling: ProjectBilling = {};
      projectIds.forEach(id => {
        initialBilling[id] = { totalBilled: 0, totalReceived: 0 };
      });
      
      // Set initial values immediately to prevent glitchy display
      setBilling(initialBilling);

      // Check if supabase client is available
      if (!supabase) {
        console.warn('Supabase client not available');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('project_billing')
        .select('project_id, billed_amount, paid_amount')
        .in('project_id', projectIds);

      if (error) {
        console.error('Error fetching project billing:', error);
        // Keep the initialized values and don't throw
        setLoading(false);
        return;
      }

      const billingByProject: ProjectBilling = { ...initialBilling };

      // Sum up billing by project
      if (data && Array.isArray(data)) {
        data.forEach(billing => {
          if (billing.project_id && billingByProject[billing.project_id]) {
            billingByProject[billing.project_id].totalBilled += Number(billing.billed_amount || 0);
            billingByProject[billing.project_id].totalReceived += Number(billing.paid_amount || 0);
          }
        });
      }

      setBilling(billingByProject);
    } catch (error) {
      console.error('Network error fetching project billing:', error);
      // Set default values for all projects to prevent undefined errors
      const defaultBilling: ProjectBilling = {};
      projectIds.forEach(id => {
        defaultBilling[id] = { totalBilled: 0, totalReceived: 0 };
      });
      setBilling(defaultBilling);
    } finally {
      setLoading(false);
    }
  }, [projectIds]);

  useEffect(() => {
    fetchBilling();
  }, [fetchBilling]);

  return { billing, loading, refetch: fetchBilling };
}
