
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { 
  Calendar, 
  DollarSign, 
  MapPin, 
  User, 
  Edit,
  Eye,
  MoreVertical
} from 'lucide-react';
import { ProjectContingencyBadge } from './ProjectContingencyBadge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface Project {
  id: string;
  name: string;
  type: string;
  status: string;
  address?: string;
  client?: string;
  field_leader?: string;
  contract_value: number;
  due_date?: string;
  completion_percentage?: number;
  contingency_type?: 'percentage' | 'dollar';
  contingency_value?: number;
}

interface ProjectCardProps {
  project: Project;
  onEdit: (project: Project) => void;
  onView: (project: Project) => void;
}

export function ProjectCard({ project, onEdit, onView }: ProjectCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active':
        return 'bg-green-100 text-green-800';
      case 'Planning':
        return 'bg-blue-100 text-blue-800';
      case 'On Hold':
        return 'bg-yellow-100 text-yellow-800';
      case 'Completed':
        return 'bg-gray-100 text-gray-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg font-semibold leading-tight">
              {project.name}
            </CardTitle>
            <Badge variant="secondary" className="text-xs">
              {project.type}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`text-xs ${getStatusColor(project.status)}`}>
              {project.status}
            </Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => onView(project)}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onEdit(project)}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Project
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Project Details */}
        <div className="space-y-2 text-sm">
          {project.address && (
            <div className="flex items-center text-muted-foreground">
              <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="truncate">{project.address}</span>
            </div>
          )}
          
          {project.client && (
            <div className="flex items-center text-muted-foreground">
              <User className="w-4 h-4 mr-2 flex-shrink-0" />
              <span className="truncate">{project.client}</span>
            </div>
          )}
          
          <div className="flex items-center text-muted-foreground">
            <DollarSign className="w-4 h-4 mr-2 flex-shrink-0" />
            <span className="font-medium">{formatCurrency(project.contract_value)}</span>
          </div>
          
          {project.due_date && (
            <div className="flex items-center text-muted-foreground">
              <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
              <span>{new Date(project.due_date).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {/* Contingency Information */}
        <ProjectContingencyBadge
          contingencyType={project.contingency_type}
          contingencyValue={project.contingency_value}
          projectValue={project.contract_value}
        />

        {/* Progress */}
        {typeof project.completion_percentage === 'number' && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Progress</span>
              <span className="font-medium">{project.completion_percentage}%</span>
            </div>
            <Progress value={project.completion_percentage} className="h-2" />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onView(project)}
            className="flex-1"
          >
            <Eye className="w-4 h-4 mr-2" />
            View
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => onEdit(project)}
            className="flex-1"
          >
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
