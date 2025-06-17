import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ProjectBilling {
  [projectId: string]: {
    totalBilled: number;
    totalReceived: number;
    totalOutstanding: number;
    billingByStatus: Record<string, number>;
    recentBilling: any[];
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
        initialBilling[id] = { 
          totalBilled: 0, 
          totalReceived: 0, 
          totalOutstanding: 0,
          billingByStatus: {},
          recentBilling: []
        };
      });
      
      setBilling(initialBilling);

      if (!supabase) {
        console.warn('Supabase client not available');
        setLoading(false);
        return;
      }

      const { data, error } = await supabase
        .from('project_billing')
        .select('project_id, billed_amount, paid_amount, status, billing_period_start, billing_period_end, invoice_number')
        .in('project_id', projectIds)
        .order('billing_period_end', { ascending: false });

      if (error) {
        console.error('Error fetching project billing:', error);
        setLoading(false);
        return;
      }

      const billingByProject: ProjectBilling = { ...initialBilling };

      if (data && Array.isArray(data)) {
        data.forEach(billing => {
          if (billing.project_id && billingByProject[billing.project_id]) {
            const projectBilling = billingByProject[billing.project_id];
            const billedAmount = Number(billing.billed_amount || 0);
            const paidAmount = Number(billing.paid_amount || 0);
            
            projectBilling.totalBilled += billedAmount;
            projectBilling.totalReceived += paidAmount;
            projectBilling.totalOutstanding += (billedAmount - paidAmount);
            
            // Group by status
            const status = billing.status || 'Draft';
            projectBilling.billingByStatus[status] = 
              (projectBilling.billingByStatus[status] || 0) + billedAmount;
            
            // Keep recent billing records (last 5)
            if (projectBilling.recentBilling.length < 5) {
              projectBilling.recentBilling.push(billing);
            }
          }
        });
      }

      setBilling(billingByProject);
    } catch (error) {
      console.error('Network error fetching project billing:', error);
      const defaultBilling: ProjectBilling = {};
      projectIds.forEach(id => {
        defaultBilling[id] = { 
          totalBilled: 0, 
          totalReceived: 0, 
          totalOutstanding: 0,
          billingByStatus: {},
          recentBilling: []
        };
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
