
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Calendar, DollarSign, MoreVertical, Edit2, ExternalLink, Trash2 } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { cn } from '@/lib/utils';
import { Project } from '@/types';
import { EditProjectDialog } from './EditProjectDialog';
import { useNavigate } from 'react-router-dom';

interface ProjectCardProps {
  project: Project;
  showDeleteButton?: boolean;
  onDelete?: (projectId: string) => void;
  onUpdate?: () => void;
  totalExpenses?: number;
  totalBilled?: number;
  totalReceived?: number;
}

export function ProjectCard({ 
  project, 
  showDeleteButton = false, 
  onDelete, 
  onUpdate,
  totalExpenses = 0,
  totalBilled = 0,
  totalReceived = 0
}: ProjectCardProps) {
  const [showEditDialog, setShowEditDialog] = useState(false);
  const navigate = useNavigate();

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-500 text-white';
      case 'active':
      case 'open':
        return 'bg-blue-500 text-white';
      case 'on hold':
        return 'bg-yellow-500 text-white';
      case 'planning':
        return 'bg-purple-500 text-white';
      case 'closed':
        return 'bg-gray-500 text-white';
      default:
        return 'bg-gray-500 text-white';
    }
  };

  const getUrgencyLevel = () => {
    const daysUntilDue = differenceInDays(project.dueDate, new Date());
    if (daysUntilDue < 0) return 'overdue';
    if (daysUntilDue <= 7) return 'urgent';
    if (daysUntilDue <= 30) return 'upcoming';
    return 'normal';
  };

  const urgencyLevel = getUrgencyLevel();
  const progressPercentage = project.completionPercentage || 0;

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if clicking on buttons or dropdown
    if ((e.target as HTMLElement).closest('button') || (e.target as HTMLElement).closest('[role="menu"]')) {
      return;
    }
    navigate(`/projects/${project.id}`);
  };

  const handleProjectUpdated = () => {
    setShowEditDialog(false);
    if (onUpdate) {
      onUpdate();
    }
  };

  return (
    <>
      <Card 
        className={cn(
          "hover:shadow-lg transition-all duration-200 cursor-pointer",
          urgencyLevel === 'overdue' && "border-red-500 bg-red-50",
          urgencyLevel === 'urgent' && "border-yellow-500 bg-yellow-50"
        )}
        onClick={handleCardClick}
      >
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1 min-w-0 space-y-2">
              <CardTitle className="text-lg font-semibold truncate">{project.name}</CardTitle>
              
              {project.client && (
                <p className="text-sm font-medium text-gray-700">Client: {project.client}</p>
              )}
              
              {project.projectCode && (
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-xs">
                    {project.projectCode}
                  </Badge>
                  <Badge className={getStatusColor(project.status)} variant="default">
                    {project.status}
                  </Badge>
                </div>
              )}
              
              {project.address && (
                <p className="text-sm text-gray-600 truncate">{project.address}</p>
              )}
            </div>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  setShowEditDialog(true);
                }}>
                  <Edit2 className="mr-2 h-4 w-4" />
                  Edit Project
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  navigate(`/projects/${project.id}`);
                }}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                {showDeleteButton && onDelete && (
                  <DropdownMenuItem 
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(project.id);
                    }}
                    className="text-red-600 focus:text-red-600"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete Project
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Progress */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Progress</span>
              <span className="font-medium">{progressPercentage}%</span>
            </div>
            <Progress value={progressPercentage} className="w-full" />
          </div>

          {/* Financial Summary */}
          <div className="grid grid-cols-1 gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm text-gray-600">
                <DollarSign className="w-4 h-4" />
                Contract Value
              </div>
              <span className="font-medium text-blue-600">
                ${project.contractValue.toLocaleString()}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">Total Billed</div>
              <span className="font-medium text-green-600">
                ${totalBilled.toLocaleString()}
              </span>
            </div>
            
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">Total Received</div>
              <span className="font-medium text-emerald-600">
                ${totalReceived.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Timeline */}
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2 text-gray-600">
                <Calendar className="w-4 h-4" />
                Timeline
              </div>
            </div>
            <div className="text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-gray-600">Start:</span>
                <span>{format(project.startDate, 'MMM dd, yyyy')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Due:</span>
                <span className={cn(
                  urgencyLevel === 'overdue' && "text-red-600 font-medium",
                  urgencyLevel === 'urgent' && "text-yellow-600 font-medium"
                )}>
                  {format(project.dueDate, 'MMM dd, yyyy')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Days Remaining:</span>
                <span className={cn(
                  urgencyLevel === 'overdue' && "text-red-600 font-medium",
                  urgencyLevel === 'urgent' && "text-yellow-600 font-medium"
                )}>
                  {differenceInDays(project.dueDate, new Date())} days
                </span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <EditProjectDialog
        project={project}
        onProjectUpdated={handleProjectUpdated}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
      />
    </>
  );
}
