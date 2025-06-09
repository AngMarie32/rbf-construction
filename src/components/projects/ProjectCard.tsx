
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Calendar, DollarSign, MapPin, Trash2, TrendingUp, CreditCard } from 'lucide-react';
import { format } from 'date-fns';
import { Project } from '@/types';
import { useNavigate } from 'react-router-dom';

interface ProjectCardProps {
  project: Project;
  showDeleteButton?: boolean;
  onDelete?: (projectId: string) => void;
}

export function ProjectCard({ project, showDeleteButton = false, onDelete }: ProjectCardProps) {
  const navigate = useNavigate();

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Planning': return 'bg-blue-500';
      case 'Active': return 'bg-green-500';
      case 'On Hold': return 'bg-yellow-500';
      case 'Completed': return 'bg-gray-500';
      case 'Closed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const handleCardClick = () => {
    navigate(`/projects/${project.id}`);
  };

  const handleDeleteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onDelete) {
      onDelete(project.id);
    }
  };

  // Calculate financial metrics
  const originalContract = project.contractValue || 0;
  const billed = originalContract * (project.completionPercentage / 100);
  const remaining = originalContract - billed;

  return (
    <Card 
      className="cursor-pointer hover:shadow-lg transition-shadow duration-200"
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg line-clamp-2">{project.name}</CardTitle>
          <Badge className={`${getStatusColor(project.status)} text-white ml-2 flex-shrink-0`}>
            {project.status}
          </Badge>
        </div>
        {project.projectCode && (
          <p className="text-sm text-gray-600">{project.projectCode}</p>
        )}
      </CardHeader>
      
      <CardContent className="space-y-4">
        {project.client && (
          <div className="flex items-center text-sm text-gray-600">
            <span className="font-medium">Client:</span>
            <span className="ml-2">{project.client}</span>
          </div>
        )}
        
        {project.address && (
          <div className="flex items-center text-sm text-gray-600">
            <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="line-clamp-2">{project.address}</span>
          </div>
        )}
        
        {/* Financial Information */}
        <div className="space-y-2 bg-gray-50 p-3 rounded-lg">
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center text-gray-600">
              <DollarSign className="w-4 h-4 mr-1" />
              <span>Original Contract:</span>
            </div>
            <span className="font-semibold">${originalContract.toLocaleString()}</span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center text-green-600">
              <CreditCard className="w-4 h-4 mr-1" />
              <span>Billed:</span>
            </div>
            <span className="font-semibold text-green-600">${billed.toLocaleString()}</span>
          </div>
          
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center text-blue-600">
              <TrendingUp className="w-4 h-4 mr-1" />
              <span>Remaining:</span>
            </div>
            <span className="font-semibold text-blue-600">${remaining.toLocaleString()}</span>
          </div>
        </div>
        
        <div className="flex items-center text-sm text-gray-600">
          <Calendar className="w-4 h-4 mr-2" />
          <span>
            {format(project.startDate, 'MMM dd')} - {format(project.dueDate, 'MMM dd, yyyy')}
          </span>
        </div>
        
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{project.completionPercentage}%</span>
          </div>
          <Progress value={project.completionPercentage} className="h-2" />
        </div>

        {showDeleteButton && (
          <div className="pt-4 border-t">
            <Button 
              variant="destructive" 
              size="sm" 
              onClick={handleDeleteClick}
              className="w-full"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete Project
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
