
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Building } from 'lucide-react';

interface Project {
  id: string;
  name: string;
}

interface ProjectSelectionHeaderProps {
  selectedProjects: string[];
  projects: Project[];
}

export function ProjectSelectionHeader({ selectedProjects, projects }: ProjectSelectionHeaderProps) {
  const getSelectedProjectNames = () => {
    const selectedProjectsData = projects.filter(p => selectedProjects.includes(p.id));
    if (selectedProjectsData.length === 0) return 'No projects selected';
    if (selectedProjectsData.length === 1) return selectedProjectsData[0].name;
    if (selectedProjectsData.length <= 3) {
      return selectedProjectsData.map(p => p.name).join(', ');
    }
    return `${selectedProjectsData.slice(0, 2).map(p => p.name).join(', ')} and ${selectedProjectsData.length - 2} others`;
  };

  if (selectedProjects.length === 0) {
    return (
      <Card className="border-dashed border-2 border-gray-300">
        <CardContent className="pt-6">
          <div className="text-center text-gray-500">
            <Building className="w-12 h-12 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-semibold mb-2">No Projects Selected</h3>
            <p className="text-sm">
              Please select one or more projects from the filters above to view burn analysis data.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-blue-50 border-blue-200">
      <CardContent className="pt-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Building className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-semibold text-blue-900">
              Analyzing: {getSelectedProjectNames()}
            </h3>
          </div>
          <div className="flex items-center justify-center gap-2">
            <Badge variant="secondary" className="bg-blue-100 text-blue-800">
              {selectedProjects.length} project{selectedProjects.length > 1 ? 's' : ''} selected
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
