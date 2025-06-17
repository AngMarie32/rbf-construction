
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface ProjectExpenses {
  [projectId: string]: {
    totalExpenses: number;
    approvedExpenses: number;
    pendingExpenses: number;
    expensesByCategory: Record<string, number>;
  };
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
        .select('project_id, amount, status, category')
        .in('project_id', projectIds);

      if (error) throw error;

      const expensesByProject: ProjectExpenses = {};
      
      // Initialize all project IDs
      projectIds.forEach(id => {
        expensesByProject[id] = {
          totalExpenses: 0,
          approvedExpenses: 0,
          pendingExpenses: 0,
          expensesByCategory: {}
        };
      });

      // Process expenses by project
      (data || []).forEach(expense => {
        if (expense.project_id && expense.amount) {
          const projectId = expense.project_id;
          const amount = Number(expense.amount);
          const category = expense.category || 'Other';
          
          if (!expensesByProject[projectId]) {
            expensesByProject[projectId] = {
              totalExpenses: 0,
              approvedExpenses: 0,
              pendingExpenses: 0,
              expensesByCategory: {}
            };
          }

          expensesByProject[projectId].totalExpenses += amount;
          
          if (expense.status === 'Approved' || expense.status === 'Paid') {
            expensesByProject[projectId].approvedExpenses += amount;
          } else {
            expensesByProject[projectId].pendingExpenses += amount;
          }

          expensesByProject[projectId].expensesByCategory[category] = 
            (expensesByProject[projectId].expensesByCategory[category] || 0) + amount;
        }
      });

      setExpenses(expensesByProject);
    } catch (error) {
      console.error('Error fetching project expenses:', error);
      const defaultExpenses: ProjectExpenses = {};
      projectIds.forEach(id => {
        defaultExpenses[id] = {
          totalExpenses: 0,
          approvedExpenses: 0,
          pendingExpenses: 0,
          expensesByCategory: {}
        };
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
