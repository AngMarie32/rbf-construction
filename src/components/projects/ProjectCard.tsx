
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
  Receipt,
  CreditCard
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

      const totalBilledCalc = billing?.reduce((sum, bill) => sum + (bill.billed_amount || 0), 0) || 0;
      const totalReceivedCalc = billing?.reduce((sum, bill) => sum + (bill.paid_amount || 0), 0) || 0;

      setBilledAmount(totalBilledCalc);
      setReceivedAmount(totalReceivedCalc);

      // Calculate remaining amount (contract value - total billed)
      const remaining = project.contractValue - totalBilledCalc;
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
    navigate(`/project/${project.id}`);
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
              <Badge className={`${getStatusColor(project.status)} text-white`}>
                {project.status}
              </Badge>
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

          {/* Financial Snapshot - Better formatted */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t">
            <div className="bg-blue-50 p-2 rounded-lg">
              <div className="flex items-center gap-1 mb-1">
                <DollarSign className="w-3 h-3 text-blue-600" />
                <span className="text-xs font-medium text-blue-600">Contract</span>
              </div>
              <div className="text-sm font-bold text-gray-900">
                ${project.contractValue.toLocaleString()}
              </div>
            </div>
            
            <div className="bg-green-50 p-2 rounded-lg">
              <div className="flex items-center gap-1 mb-1">
                <TrendingUp className="w-3 h-3 text-green-600" />
                <span className="text-xs font-medium text-green-600">Remaining</span>
              </div>
              <div className="text-sm font-bold text-green-600">
                ${remainingAmount.toLocaleString()}
              </div>
            </div>

            <div className="bg-purple-50 p-2 rounded-lg">
              <div className="flex items-center gap-1 mb-1">
                <Receipt className="w-3 h-3 text-purple-600" />
                <span className="text-xs font-medium text-purple-600">Billed</span>
              </div>
              <div className="text-sm font-bold text-purple-600">
                ${billedAmount.toLocaleString()}
              </div>
            </div>

            <div className="bg-emerald-50 p-2 rounded-lg">
              <div className="flex items-center gap-1 mb-1">
                <CreditCard className="w-3 h-3 text-emerald-600" />
                <span className="text-xs font-medium text-emerald-600">Received</span>
              </div>
              <div className="text-sm font-bold text-emerald-600">
                ${receivedAmount.toLocaleString()}
              </div>
            </div>

            <div className="bg-red-50 p-2 rounded-lg">
              <div className="flex items-center gap-1 mb-1">
                <TrendingDown className="w-3 h-3 text-red-600" />
                <span className="text-xs font-medium text-red-600">Paid Expenses</span>
              </div>
              <div className="text-sm font-bold text-red-600">
                ${paidExpenses.toLocaleString()}
              </div>
            </div>

            <div className="bg-orange-50 p-2 rounded-lg">
              <div className="flex items-center gap-1 mb-1">
                <Clock className="w-3 h-3 text-orange-600" />
                <span className="text-xs font-medium text-orange-600">Pending</span>
              </div>
              <div className="text-sm font-bold text-orange-600">
                ${pendingExpenses.toLocaleString()}
              </div>
            </div>
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
