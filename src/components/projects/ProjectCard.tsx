
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Button } from '@/components/ui/button';
import { Calendar, DollarSign, MapPin, MoreHorizontal, Edit, Trash2, Eye } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Project } from '@/types';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ProjectCardProps {
  project: Project;
  onUpdate?: () => void;
}

export function ProjectCard({ project, onUpdate }: ProjectCardProps) {
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

  const daysUntilDue = Math.ceil((project.dueDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
  const isOverdue = daysUntilDue < 0;
  const isDueSoon = daysUntilDue <= 7 && daysUntilDue >= 0;

  return (
    <Card className="hover:shadow-lg transition-shadow animate-fade-in">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg mb-2">{project.name}</CardTitle>
            <div className="flex items-center gap-2 mb-2">
              <Badge variant="secondary">{project.type}</Badge>
              <Badge className={getStatusColor(project.status)}>
                {project.status}
              </Badge>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem>
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
        {/* Progress */}
        <div>
          <div className="flex justify-between text-sm mb-2">
            <span>Progress</span>
            <span className="font-medium">{project.completionPercentage}%</span>
          </div>
          <Progress value={project.completionPercentage} className="h-2" />
        </div>

        {/* Contract Value */}
        <div className="flex items-center gap-2 text-sm">
          <DollarSign className="w-4 h-4 text-green-600" />
          <span className="font-medium">${project.contractValue.toLocaleString()}</span>
        </div>

        {/* Due Date */}
        <div className="flex items-center gap-2 text-sm">
          <Calendar className="w-4 h-4 text-blue-600" />
          <span className={`${isOverdue ? 'text-red-600' : isDueSoon ? 'text-orange-600' : 'text-gray-600'}`}>
            {isOverdue 
              ? `Overdue by ${Math.abs(daysUntilDue)} days`
              : isDueSoon 
              ? `Due in ${daysUntilDue} days`
              : `Due ${project.dueDate.toLocaleDateString()}`
            }
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1">
            <Eye className="w-4 h-4 mr-2" />
            View
          </Button>
          <Button variant="outline" size="sm" className="flex-1">
            <Edit className="w-4 h-4 mr-2" />
            Edit
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
