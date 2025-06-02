
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, X } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  color: string;
}

interface ProjectSelectorProps {
  projects: Project[];
  selectedProjects: string[];
  onSelectionChange: (selectedIds: string[]) => void;
}

export function ProjectSelector({ projects, selectedProjects, onSelectionChange }: ProjectSelectorProps) {
  const [open, setOpen] = useState(false);

  const handleProjectToggle = (projectId: string, checked: boolean) => {
    if (checked) {
      onSelectionChange([...selectedProjects, projectId]);
    } else {
      onSelectionChange(selectedProjects.filter(id => id !== projectId));
    }
  };

  const handleSelectAll = () => {
    if (selectedProjects.length === projects.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(projects.map(p => p.id));
    }
  };

  const handleClear = () => {
    onSelectionChange([]);
  };

  const isAllSelected = selectedProjects.length === projects.length;

  return (
    <div className="flex items-center gap-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="justify-between min-w-[200px]">
            {selectedProjects.length === 0
              ? "All Projects"
              : selectedProjects.length === 1
              ? projects.find(p => p.id === selectedProjects[0])?.name
              : `${selectedProjects.length} Projects Selected`
            }
            <ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-80">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="font-medium">Select Projects</h4>
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleSelectAll}
                  className="text-xs"
                >
                  {isAllSelected ? "Deselect All" : "Select All"}
                </Button>
                {selectedProjects.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleClear}
                    className="text-xs"
                  >
                    Clear
                  </Button>
                )}
              </div>
            </div>
            
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {projects.map((project) => (
                <div key={project.id} className="flex items-center space-x-2">
                  <Checkbox
                    id={project.id}
                    checked={selectedProjects.includes(project.id)}
                    onCheckedChange={(checked) => 
                      handleProjectToggle(project.id, checked as boolean)
                    }
                  />
                  <div className="flex items-center gap-2 flex-1">
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: project.color }}
                    />
                    <label 
                      htmlFor={project.id} 
                      className="text-sm font-medium cursor-pointer flex-1"
                    >
                      {project.name}
                    </label>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 border-t">
              <Button 
                onClick={() => setOpen(false)} 
                className="w-full"
                size="sm"
              >
                Apply
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      {/* Selected Projects Badges */}
      {selectedProjects.length > 0 && selectedProjects.length < projects.length && (
        <div className="flex flex-wrap gap-1">
          {selectedProjects.slice(0, 3).map((projectId) => {
            const project = projects.find(p => p.id === projectId);
            return (
              <Badge 
                key={projectId} 
                variant="secondary" 
                className="text-xs px-2"
                style={{ backgroundColor: `${project?.color}20`, color: project?.color }}
              >
                {project?.name}
                <button
                  onClick={() => handleProjectToggle(projectId, false)}
                  className="ml-1 hover:bg-gray-200 rounded-full p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </Badge>
            );
          })}
          {selectedProjects.length > 3 && (
            <Badge variant="secondary" className="text-xs">
              +{selectedProjects.length - 3} more
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
