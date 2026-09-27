import { sortProjectsOpenFirst } from '@/utils/projectOrder';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Project {
  id: string;
  name: string;
}

interface ProjectSelectorProps {
  selectedProject: string;
  onProjectSelect: (projectId: string) => void;
  title?: string;
  subtitle?: string;
  showTitle?: boolean;
}

export function ProjectSelector({ 
  selectedProject, 
  onProjectSelect, 
  title = "Select Project",
  subtitle = "Choose a project to continue",
  showTitle = true 
}: ProjectSelectorProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      console.log('Fetching projects for selector...');
      setLoading(true);
      
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, status')
        .order('name');

      if (error) {
        console.error('Error fetching projects:', error);
        throw error;
      }
      
      console.log('Projects loaded for selector:', data?.length || 0);
      setProjects(sortProjectsOpenFirst(data || []));
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const handleProjectChange = (value: string) => {
    console.log('Project selected:', value);
    onProjectSelect(value);
  };

  if (showTitle) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{title}</CardTitle>
            <p className="text-gray-600">{subtitle}</p>
          </CardHeader>
          <CardContent>
            <Select value={selectedProject} onValueChange={handleProjectChange} disabled={loading}>
              <SelectTrigger>
                <SelectValue placeholder={loading ? "Loading projects..." : "Choose a project"} />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <Select value={selectedProject} onValueChange={handleProjectChange} disabled={loading}>
      <SelectTrigger>
        <SelectValue placeholder={loading ? "Loading projects..." : "Choose a project"} />
      </SelectTrigger>
      <SelectContent>
        {projects.map((project) => (
          <SelectItem key={project.id} value={project.id}>
            {project.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
