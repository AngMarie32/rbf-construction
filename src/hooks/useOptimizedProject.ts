
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Project {
  id: string;
  name: string;
  client: string;
  status: string;
  start_date: string;
  due_date: string;
  contract_value: number;
  completion_percentage: number;
  description?: string;
  field_leader?: string;
  address?: string;
  project_code?: string;
  type?: string;
}

export const useOptimizedProject = (projectId: string | undefined) => {
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProject = useCallback(async () => {
    if (!projectId) {
      setError('No project ID provided');
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log('Fetching project with ID:', projectId);
      
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .maybeSingle();

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }
      
      if (!data) {
        console.log('No project found with ID:', projectId);
        setError('Project not found');
        return;
      }

      console.log('Project data loaded:', data);
      setProject(data);
    } catch (error) {
      console.error('Error fetching project:', error);
      setError('Failed to load project details');
      toast.error('Failed to load project details');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  const updateProject = useCallback(async (updates: Partial<Project>) => {
    if (!projectId || !project) return false;

    try {
      const { error } = await supabase
        .from('projects')
        .update(updates)
        .eq('id', projectId);

      if (error) {
        console.error('Error updating project:', error);
        toast.error('Failed to update project');
        return false;
      }

      setProject(prev => prev ? { ...prev, ...updates } : null);
      toast.success('Project updated successfully');
      return true;
    } catch (error) {
      console.error('Error updating project:', error);
      toast.error('Failed to update project');
      return false;
    }
  }, [projectId, project]);

  useEffect(() => {
    fetchProject();
  }, [fetchProject]);

  return {
    project,
    loading,
    error,
    refetch: fetchProject,
    updateProject
  };
};
