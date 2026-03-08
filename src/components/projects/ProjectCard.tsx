
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
  const [changeOrdersTotal, setChangeOrdersTotal] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProjectFinancials();
  }, [project.id]);

  const fetchProjectFinancials = async () => {
    try {
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

      const { data: billing, error: billingError } = await supabase
        .from('project_billing')
        .select('billed_amount, paid_amount')
        .eq('project_id', project.id);

      if (billingError) throw billingError;

      const totalBilledFromDB = billing?.reduce((sum, bill) => sum + bill.billed_amount, 0) || 0;
      const totalReceivedFromDB = billing?.reduce((sum, bill) => sum + bill.paid_amount, 0) || 0;

      setBilledAmount(totalBilledFromDB);
      setReceivedAmount(totalReceivedFromDB);

      const { data: changeOrders, error: changeOrdersError } = await supabase
        .from('change_orders')
        .select('amount')
        .eq('project_id', project.id)
        .eq('status', 'Approved');

      if (changeOrdersError) throw changeOrdersError;

      const totalChangeOrders = changeOrders?.reduce((sum, co) => sum + co.amount, 0) || 0;
      setChangeOrdersTotal(totalChangeOrders);

      const remaining = project.contractValue - totalBilledFromDB;
      setRemainingAmount(remaining);
    } catch (error) {
      console.error('Error fetching project financials:', error);
    }
  };

  const getStatusClasses = (status: string) => {
    switch (status) {
      case 'Active': 
      case 'Open': 
        return 'status-active';
      case 'Planning': 
        return 'status-planning';
      case 'On Hold': 
      case 'Pending': 
        return 'status-hold';
      case 'Completed': 
        return 'status-completed';
      default: 
        return 'bg-muted text-muted-foreground';
    }
  };

  const calculateEstimatedProfit = () => {
    const totalContractWithChanges = project.contractValue + changeOrdersTotal;
    const estimatedTotalExpenses = paidExpenses + pendingExpenses;
    return totalContractWithChanges - estimatedTotalExpenses;
  };

  const calculateActualProfit = () => {
    return receivedAmount - paidExpenses;
  };

  const calculateContingencyAvailable = () => {
    if (!project.contingency_value || project.contingency_value === 0) return 0;
    const contingencyAmount = project.contingency_type === 'percentage' 
      ? (project.contractValue * project.contingency_value) / 100
      : project.contingency_value;
    return Math.max(0, contingencyAmount - changeOrdersTotal);
  };

  const handleCardClick = () => navigate(`/projects/${project.id}`);

  const handleDelete = () => {
    if (onDelete && confirm('Are you sure you want to delete this project?')) {
      onDelete(project.id);
    }
  };

  const contingencyAvailable = calculateContingencyAvailable();

  return (
    <>
      <Card className="hover:shadow-xl transition-all duration-300 cursor-pointer group" onClick={handleCardClick}>
        <CardHeader className="pb-3">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <CardTitle className="text-lg mb-2 group-hover:text-primary transition-colors">{project.name}</CardTitle>
              <Badge className={getStatusClasses(project.status)}>
                {project.status}
              </Badge>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="sm" className="opacity-0 group-hover:opacity-100 transition-opacity">
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
                  }} className="text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            {project.client && (
              <div className="flex items-center text-sm text-muted-foreground">
                <User className="w-4 h-4 mr-2 flex-shrink-0" />
                {project.client}
              </div>
            )}
            {project.address && (
              <div className="flex items-center text-sm text-muted-foreground">
                <MapPin className="w-4 h-4 mr-2 flex-shrink-0" />
                <span className="truncate">{project.address}</span>
              </div>
            )}
            {project.dueDate && new Date(project.dueDate).getFullYear() > 1970 && (
              <div className="flex items-center text-sm text-muted-foreground">
                <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                Due: {format(project.dueDate, 'MMM dd, yyyy')}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-foreground">Progress</span>
              <span className="text-sm text-muted-foreground">{project.completionPercentage}%</span>
            </div>
            <Progress value={project.completionPercentage} className="h-2" />
          </div>

          {/* Financial Snapshot */}
          <div className="bg-muted/50 dark:bg-secondary/30 rounded-lg p-3 space-y-3 border border-border/50">
            <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider border-b border-border/50 pb-1.5">
              Financial Snapshot
            </h4>
            
            <div className="grid grid-cols-2 gap-2">
              <FinancialCell icon={DollarSign} label="Contract" value={project.contractValue} colorClass="text-primary" />
              <FinancialCell icon={TrendingUp} label="Remaining" value={remainingAmount} colorClass="text-success" />
              <FinancialCell icon={CreditCard} label="Billed" value={billedAmount} colorClass="text-primary" />
              <FinancialCell icon={CheckCircle} label="Received" value={receivedAmount} colorClass="text-success" />
              <FinancialCell icon={TrendingDown} label="Expenses Paid" value={paidExpenses} colorClass="text-destructive" />
              <FinancialCell icon={Clock} label="Pending" value={pendingExpenses} colorClass="text-accent" />
              <FinancialCell 
                icon={TrendingUp} 
                label="Est. Profit" 
                value={calculateEstimatedProfit()} 
                colorClass={calculateEstimatedProfit() >= 0 ? 'text-primary' : 'text-destructive'} 
              />
              <FinancialCell 
                icon={DollarSign} 
                label="Actual Profit" 
                value={calculateActualProfit()} 
                colorClass={calculateActualProfit() >= 0 ? 'text-success' : 'text-destructive'} 
              />
            </div>

            <div className="border-t border-border/50 pt-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-muted-foreground flex items-center">
                  <Shield className="w-3 h-3 mr-1" />
                  Contingency Available:
                </span>
                <span className="font-medium text-foreground">
                  ${contingencyAvailable.toLocaleString()}
                </span>
              </div>
              {changeOrdersTotal > 0 && (
                <div className="flex justify-between items-center text-xs mt-1">
                  <span className="text-muted-foreground">Change Orders Used:</span>
                  <span className="text-foreground">
                    ${changeOrdersTotal.toLocaleString()}
                  </span>
                </div>
              )}
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

function FinancialCell({ icon: Icon, label, value, colorClass }: { 
  icon: React.ElementType; 
  label: string; 
  value: number; 
  colorClass: string;
}) {
  return (
    <div className="bg-card p-2 rounded-md border border-border/50 text-center">
      <div className={`flex items-center justify-center text-xs ${colorClass} mb-1`}>
        <Icon className="w-3 h-3 mr-1" />
        {label}
      </div>
      <div className={`text-sm font-bold ${colorClass}`}>
        ${value.toLocaleString()}
      </div>
    </div>
  );
}
