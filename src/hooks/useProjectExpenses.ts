
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ProjectExpenses {
  [projectId: string]: number;
}

export function useProjectExpenses(projectIds: string[]) {
  const [expenses, setExpenses] = useState<ProjectExpenses>({});
  const [loading, setLoading] = useState(true);

  const fetchExpenses = useCallback(async () => {
    if (projectIds.length === 0) {
      setExpenses({});
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('expenses')
        .select('project_id, amount')
        .in('project_id', projectIds)
        .in('status', ['Approved', 'Paid']);

      if (error) throw error;

      const expensesByProject: ProjectExpenses = {};
      
      // Initialize all project IDs with 0
      projectIds.forEach(id => {
        expensesByProject[id] = 0;
      });

      // Sum up expenses by project
      (data || []).forEach(expense => {
        if (expense.project_id && expense.amount) {
          expensesByProject[expense.project_id] = 
            (expensesByProject[expense.project_id] || 0) + Number(expense.amount);
        }
      });

      setExpenses(expensesByProject);
    } catch (error) {
      console.error('Error fetching project expenses:', error);
      const defaultExpenses: ProjectExpenses = {};
      projectIds.forEach(id => {
        defaultExpenses[id] = 0;
      });
      setExpenses(defaultExpenses);
    } finally {
      setLoading(false);
    }
  }, [projectIds]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  return { expenses, loading, refetch: fetchExpenses };
}
