
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Calendar, MapPin, User, DollarSign, Eye } from 'lucide-react';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { Project } from '@/types';
import { supabase } from '@/integrations/supabase/client';

interface ProjectCardProps {
  project: Project;
  onUpdate?: () => void;
}

export function ProjectCard({ project, onUpdate }: ProjectCardProps) {
  const navigate = useNavigate();
  const [financialData, setFinancialData] = useState({
    totalBilled: 0,
    totalReceived: 0,
    totalExpenses: 0
  });

  useEffect(() => {
    fetchFinancialData();
  }, [project.id]);

  const fetchFinancialData = async () => {
    try {
      const { data: billingData, error } = await supabase
        .from('project_billing')
        .select('billed_amount, paid_amount')
        .eq('project_id', project.id);

      if (error) throw error;

      const totals = (billingData || []).reduce((acc, billing) => ({
        totalBilled: acc.totalBilled + (billing.billed_amount || 0),
        totalReceived: acc.totalReceived + (billing.paid_amount || 0)
      }), { totalBilled: 0, totalReceived: 0 });

      setFinancialData({
        ...totals,
        totalExpenses: 0 // Will be updated when expense tracking is implemented
      });
    } catch (error) {
      console.error('Error fetching financial data:', error);
    }
  };

  const getStatusColor = (status: Project['status']) => {
    switch (status) {
      case 'Planning':
        return 'bg-yellow-500';
      case 'Open':
        return 'bg-green-500';
      case 'Closed':
        return 'bg-gray-500';
      default:
        return 'bg-gray-500';
    }
  };

  const handleViewProject = () => {
    navigate(`/projects/${project.id}`);
  };

  return (
    <Card className="hover:shadow-lg transition-shadow duration-200">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Badge className={`${getStatusColor(project.status)} text-white`}>
                {project.status}
              </Badge>
              <span className="text-sm text-gray-500">#{project.projectCode || 'No Code'}</span>
            </div>
            <CardTitle className="text-xl">{project.name}</CardTitle>
          </div>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleViewProject}
            className="shrink-0"
          >
            <Eye className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Project Details */}
        <div className="space-y-2">
          <div className="flex items-center text-sm text-gray-600">
            <User className="w-4 h-4 mr-2" />
            <span>{project.client || 'No client specified'}</span>
          </div>
          <div className="flex items-center text-sm text-gray-600">
            <MapPin className="w-4 h-4 mr-2" />
            <span className="truncate">{project.address || 'No address specified'}</span>
          </div>
        </div>

        {/* Contract Value */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600">Contract Value</span>
          <span className="text-lg font-bold">${project.contractValue.toLocaleString()}</span>
        </div>

        {/* Financial Summary */}
        <div className="grid grid-cols-3 gap-4 text-center border-t pt-4">
          <div>
            <div className="text-lg font-bold text-red-600">
              ${financialData.totalExpenses.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">Expenses</div>
          </div>
          <div>
            <div className="text-lg font-bold text-blue-600">
              ${financialData.totalBilled.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">Billed</div>
          </div>
          <div>
            <div className="text-lg font-bold text-green-600">
              ${financialData.totalReceived.toLocaleString()}
            </div>
            <div className="text-xs text-gray-500">Received</div>
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Completion</span>
            <span className="font-medium">{project.completionPercentage}%</span>
          </div>
          <Progress value={project.completionPercentage} className="h-2" />
        </div>

        {/* Dates */}
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center text-gray-600">
            <Calendar className="w-4 h-4 mr-1" />
            <span>Started: {format(project.startDate, 'MMM dd, yyyy')}</span>
          </div>
        </div>
        
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center text-gray-600">
            <Calendar className="w-4 h-4 mr-1" />
            <span>Due: {format(project.dueDate, 'MMM dd, yyyy')}</span>
          </div>
        </div>

        {/* View Project Button */}
        <Button 
          onClick={handleViewProject} 
          className="w-full mt-4"
        >
          View Project
        </Button>
      </CardContent>
    </Card>
  );
}
