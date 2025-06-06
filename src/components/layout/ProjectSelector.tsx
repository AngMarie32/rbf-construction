
import { useState, useEffect } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';

interface Project {
  id: string;
  name: string;
  client: string;
}

interface ProjectSelectorProps {
  selectedProjectId: string;
  onProjectChange: (projectId: string) => void;
  label?: string;
  placeholder?: string;
  className?: string;
}

export function ProjectSelector({ 
  selectedProjectId, 
  onProjectChange, 
  label = "Project",
  placeholder = "Select a project",
  className 
}: ProjectSelectorProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, client')
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={className}>
      {label && <Label className="text-sm font-medium">{label}</Label>}
      <Select 
        value={selectedProjectId} 
        onValueChange={onProjectChange}
        disabled={loading}
      >
        <SelectTrigger>
          <SelectValue placeholder={loading ? "Loading..." : placeholder} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all-projects">All Projects</SelectItem>
          {projects.map((project) => (
            <SelectItem key={project.id} value={project.id}>
              {project.name} - {project.client}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
