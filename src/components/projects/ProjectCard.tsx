
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Calendar, DollarSign, MapPin, MoreHorizontal, Edit, Trash2, Eye, TrendingUp, Receipt, User, FileText } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Project } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

interface ProjectCardProps {
  project: Project;
  onUpdate?: () => void;
}

export function ProjectCard({ project, onUpdate }: ProjectCardProps) {
  const navigate = useNavigate();
  
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Planning': return 'bg-blue-100 text-blue-800';
      case 'Open': return 'bg-green-100 text-green-800';
      case 'Closed': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const deleteProject = async () => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      const { error } = await supabase
        .from('projects')
        .delete()
        .eq('id', project.id);

      if (error) throw error;

      toast.success('Project deleted successfully');
      onUpdate?.();
    } catch (error) {
      console.error('Error deleting project:', error);
      toast.error('Failed to delete project');
    }
  };

  const handleViewDetails = () => {
    navigate(`/projects/${project.id}`);
  };

  const daysUntilDue = Math.ceil((project.dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const isOverdue = daysUntilDue < 0;
  const isDueSoon = daysUntilDue <= 7 && daysUntilDue >= 0;

  // Mock financial data - in real app this would come from database
  const expensesOccurred = project.contractValue * 0.3; // 30% of contract value
  const projectBilled = project.contractValue * 0.4; // 40% of contract value
  const amountReceived = project.contractValue * 0.35; // 35% of contract value

  return (
    <Card className="hover:shadow-lg transition-shadow animate-fade-in">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Badge className={`${getStatusColor(project.status)} text-xs`}>
                {project.status}
              </Badge>
              {project.projectCode && (
                <span className="text-xs text-gray-500">#{project.projectCode}</span>
              )}
            </div>
            <CardTitle className="text-lg mb-2">{project.name}</CardTitle>
            {project.client && (
              <div className="flex items-center gap-1 text-sm text-gray-600 mb-1">
                <User className="w-3 h-3" />
                <span>{project.client}</span>
              </div>
            )}
            {project.address && (
              <div className="flex items-center gap-1 text-sm text-gray-600 mb-2">
                <MapPin className="w-3 h-3" />
                <span className="truncate">{project.address}</span>
              </div>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleViewDetails}>
                <Eye className="w-4 h-4 mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Edit className="w-4 h-4 mr-2" />
                Edit Project
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={deleteProject}
                className="text-red-600"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Contract Value */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Contract Value</span>
          <span className="font-semibold">${project.contractValue.toLocaleString()}</span>
        </div>

        {/* Progress */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>Completion</span>
            <span className="font-medium">{project.completionPercentage}%</span>
          </div>
          <Progress value={project.completionPercentage} className="h-2" />
        </div>

        {/* Financial Information */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center">
            <div className="font-medium text-red-600">${expensesOccurred.toLocaleString()}</div>
            <div className="text-gray-500">Expenses</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-blue-600">${projectBilled.toLocaleString()}</div>
            <div className="text-gray-500">Billed</div>
          </div>
          <div className="text-center">
            <div className="font-medium text-green-600">${amountReceived.toLocaleString()}</div>
            <div className="text-gray-500">Received</div>
          </div>
        </div>

        {/* Dates */}
        <div className="space-y-1 text-xs text-gray-600">
          {project.startDate && (
            <div className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              <span>Started: {project.startDate.toLocaleDateString()}</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            <span className={`${isOverdue ? 'text-red-600' : isDueSoon ? 'text-orange-600' : ''}`}>
              {isOverdue 
                ? `Overdue by ${Math.abs(daysUntilDue)} days`
                : isDueSoon 
                ? `Due in ${daysUntilDue} days`
                : `Due: ${project.dueDate.toLocaleDateString()}`
              }
            </span>
          </div>
        </div>

        {/* Action Button */}
        <Button 
          variant="outline" 
          size="sm" 
          className="w-full text-blue-600 border-blue-600 hover:bg-blue-50" 
          onClick={handleViewDetails}
        >
          View Project
        </Button>
      </CardContent>
    </Card>
  );
}
