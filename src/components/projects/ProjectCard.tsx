
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Calendar, DollarSign, MapPin, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { Project } from '@/types';
import { useNavigate } from 'react-router-dom';

interface ProjectCardProps {
  project: Project;
  onUpdate?: () => void;
}

export function ProjectCard({ project }: ProjectCardProps) {
  const navigate = useNavigate();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Planning': return 'bg-blue-500 hover:bg-blue-600';
      case 'Open': return 'bg-green-500 hover:bg-green-600';
      case 'Closed': return 'bg-gray-500 hover:bg-gray-600';
      default: return 'bg-gray-500 hover:bg-gray-600';
    }
  };

  const handleCardClick = () => {
    navigate(`/project/${project.id}`);
  };

  return (
    <Card 
      className="hover:shadow-lg transition-shadow cursor-pointer group"
      onClick={handleCardClick}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-lg font-semibold truncate group-hover:text-blue-600 transition-colors">
              {project.name}
            </CardTitle>
            <p className="text-sm text-gray-600 mt-1">{project.projectCode}</p>
          </div>
          <Badge className={`${getStatusColor(project.status)} text-white ml-2`}>
            {project.status}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center text-sm">
            <FileText className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
            <span className="text-gray-600 truncate">{project.type}</span>
          </div>
          
          <div className="flex items-center text-sm">
            <DollarSign className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
            <span className="font-medium">${project.contractValue.toLocaleString()}</span>
          </div>
          
          {project.address && (
            <div className="flex items-center text-sm">
              <MapPin className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
              <span className="text-gray-600 truncate">{project.address}</span>
            </div>
          )}
          
          <div className="flex items-center text-sm">
            <Calendar className="w-4 h-4 text-gray-400 mr-2 flex-shrink-0" />
            <span className="text-gray-600">
              Due: {format(project.dueDate, 'MMM dd, yyyy')}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-center text-sm">
            <span className="text-gray-600">Progress</span>
            <span className="font-medium">{project.completionPercentage}%</span>
          </div>
          <Progress value={project.completionPercentage} className="h-2" />
        </div>

        {project.client && (
          <div className="pt-2 border-t">
            <p className="text-sm text-gray-600">
              <span className="font-medium">Client:</span> {project.client}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
