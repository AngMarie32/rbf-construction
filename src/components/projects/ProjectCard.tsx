import { useState, useEffect } from 'react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Calendar, 
  DollarSign, 
  MapPin, 
  User, 
  MoreVertical, 
  Edit, 
  Trash2,
  TrendingUp,
  TrendingDown,
  Clock,
  CreditCard,
  CheckCircle,
  Shield
} from 'lucide-react';
import { format } from 'date-fns';
import { EditProjectDialog } from './EditProjectDialog';
import { useNavigate } from 'react-router-dom';
import type { Project } from '@/types';
import { supabase } from '@/integrations/supabase/client';

interface ProjectCardProps {
  project: Project;
  showDeleteButton?: boolean;
  onDelete?: (id: string) => void;
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
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [paidExpenses, setPaidExpenses] = useState(0);
  const [pendingExpenses, setPendingExpenses] = useState(0);
  const [remainingAmount, setRemainingAmount] = useState(0);
  const [billedAmount, setBilledAmount] = useState(0);
  const [receivedAmount, setReceivedAmount] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjectFinancials();
  }, [project.id]);

  const fetchProjectFinancials = async () => {
    try {
      // Get expenses data
      const { data: expenses, error: expensesError } = await supabase
        .from('expenses')
        .select('amount, status')
        .eq('project_id', project.id);

      if (expensesError) throw expensesError;

      const paid = expenses
        ?.filter(exp => exp.status === 'Approved' || exp.status === 'Paid')
        .reduce((sum, exp) => sum + exp.amount, 0) || 0;

      const pending = expenses
        ?.filter(exp => exp.status === 'Pending Field Approval' || exp.status === 'Pending Office Approval')
        .reduce((sum, exp) => sum + exp.amount, 0) || 0;

      setPaidExpenses(paid);
      setPendingExpenses(pending);

      // Get billing data
      const { data: billing, error: billingError } = await supabase
        .from('project_billing')
        .select('billed_amount, paid_amount')
        .eq('project_id', project.id);

      if (billingError) throw billingError;

      const totalBilledFromDB = billing?.reduce((sum, bill) => sum + bill.billed_amount, 0) || 0;
      const totalReceivedFromDB = billing?.reduce((sum, bill) => sum + bill.paid_amount, 0) || 0;

      setBilledAmount(totalBilledFromDB);
      setReceivedAmount(totalReceivedFromDB);

      // Calculate remaining amount (contract value - total billed)
      const remaining = project.contractValue - totalBilledFromDB;
      setRemainingAmount(remaining);
    } catch (error) {
      console.error('Error fetching project financials:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Active': return 'bg-green-500';
      case 'Planning': return 'bg-blue-500';
      case 'On Hold': return 'bg-yellow-500';
      case 'Completed': return 'bg-purple-500';
      case 'Closed': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const handleCardClick = () => {
    navigate(`/projects/${project.id}`);
  };

  const handleDelete = () => {
    if (onDelete && confirm('Are you sure you want to delete this project?')) {
      onDelete(project.id);
    }
  };

  return (
    <>
      <Card className="hover:shadow-lg transition-shadow cursor-pointer" onClick={handleCardClick}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg mb-1">{project.name}</CardTitle>
              <div className="flex items-center gap-2 mb-2">
                <Badge className={`${getStatusColor(project.status)} text-white`}>
                  {project.status}
                </Badge>
                {/* Display contingency if it exists */}
                {project.contingency_value && project.contingency_value > 0 && (
                  <Badge variant="outline" className="flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    {project.contingency_type === 'percentage' 
                      ? `${project.contingency_value}% contingency`
                      : `$${project.contingency_value.toLocaleString()} contingency`
                    }
                  </Badge>
                )}
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  setEditDialogOpen(true);
                }}>
                  <Edit className="w-4 h-4 mr-2" />
                  Edit
                </DropdownMenuItem>
                {showDeleteButton && (
                  <DropdownMenuItem onClick={(e) => {
                    e.stopPropagation();
                    handleDelete();
                  }} className="text-red-600">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-2">
            {project.client && (
              <div className="flex items-center text-sm text-gray-600">
                <User className="w-4 h-4 mr-2" />
                {project.client}
              </div>
            )}
            {project.address && (
              <div className="flex items-center text-sm text-gray-600">
                <MapPin className="w-4 h-4 mr-2" />
                {project.address}
              </div>
            )}
            <div className="flex items-center text-sm text-gray-600">
              <Calendar className="w-4 h-4 mr-2" />
              Due: {format(project.dueDate, 'MMM dd, yyyy')}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Progress</span>
              <span className="text-sm text-gray-600">{project.completionPercentage}%</span>
            </div>
            <Progress value={project.completionPercentage} className="h-2" />
          </div>

          {/* Enhanced Financial Snapshot */}
          <div className="bg-gray-50 rounded-lg p-3 space-y-3">
            <h4 className="text-sm font-semibold text-gray-700 border-b border-gray-200 pb-1">
              Financial Snapshot
            </h4>
            
            <div className="grid grid-cols-2 gap-2">
              <div className="bg-white p-2 rounded border text-center">
                <div className="flex items-center justify-center text-xs text-gray-500 mb-1">
                  <DollarSign className="w-3 h-3 mr-1" />
                  Contract
                </div>
                <div className="text-sm font-bold text-gray-900">
                  ${project.contractValue.toLocaleString()}
                </div>
              </div>
              
              <div className="bg-white p-2 rounded border text-center">
                <div className="flex items-center justify-center text-xs text-green-600 mb-1">
                  <TrendingUp className="w-3 h-3 mr-1" />
                  Remaining
                </div>
                <div className="text-sm font-bold text-green-600">
                  ${remainingAmount.toLocaleString()}
                </div>
              </div>

              <div className="bg-white p-2 rounded border text-center">
                <div className="flex items-center justify-center text-xs text-blue-600 mb-1">
                  <CreditCard className="w-3 h-3 mr-1" />
                  Billed
                </div>
                <div className="text-sm font-bold text-blue-600">
                  ${billedAmount.toLocaleString()}
                </div>
              </div>

              <div className="bg-white p-2 rounded border text-center">
                <div className="flex items-center justify-center text-xs text-green-700 mb-1">
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Received
                </div>
                <div className="text-sm font-bold text-green-700">
                  ${receivedAmount.toLocaleString()}
                </div>
              </div>

              <div className="bg-white p-2 rounded border text-center">
                <div className="flex items-center justify-center text-xs text-red-600 mb-1">
                  <TrendingDown className="w-3 h-3 mr-1" />
                  Expenses Paid
                </div>
                <div className="text-sm font-bold text-red-600">
                  ${paidExpenses.toLocaleString()}
                </div>
              </div>

              <div className="bg-white p-2 rounded border text-center">
                <div className="flex items-center justify-center text-xs text-orange-600 mb-1">
                  <Clock className="w-3 h-3 mr-1" />
                  Pending
                </div>
                <div className="text-sm font-bold text-orange-600">
                  ${pendingExpenses.toLocaleString()}
                </div>
              </div>
            </div>

            {/* Show contingency calculation if exists */}
            {project.contingency_value && project.contingency_value > 0 && (
              <div className="border-t border-gray-200 pt-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-gray-600">Contingency Available:</span>
                  <span className="font-medium text-gray-900">
                    ${project.contingency_type === 'percentage' 
                      ? ((project.contractValue * project.contingency_value) / 100).toLocaleString()
                      : project.contingency_value.toLocaleString()
                    }
                  </span>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <EditProjectDialog
        project={project}
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        onProjectUpdated={() => {
          onUpdate?.();
          fetchProjectFinancials();
        }}
      />
    </>
  );
}
