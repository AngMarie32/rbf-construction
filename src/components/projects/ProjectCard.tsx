
import { useState, useEffect } from 'react';
import { normalizeProjectStatus } from '@/lib/projectStatus';
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
  Shield,
  Archive,
  ArchiveRestore
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
  onArchive?: (id: string, archive: boolean) => void;
  totalExpenses?: number;
  totalBilled?: number;
  totalReceived?: number;
}

export function ProjectCard({
  project,
  showDeleteButton = false,
  onDelete,
  onUpdate,
  onArchive,
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
    if (onDelete && confirm(`Delete "${project.name}" permanently?\n\nIts expenses, billing, change orders, schedule, time entries and permits are deleted too. Documents are kept but unlinked.\n\nTo just hide a finished job, use Archive instead.`)) {
      onDelete(project.id);
    }
  };

  const contingencyAvailable = calculateContingencyAvailable();

  return (
    <>
      <Card className="group cursor-pointer p-5 transition-all hover:border-primary/40 hover:shadow-md" onClick={handleCardClick}>
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <h3 className="font-semibold leading-tight truncate group-hover:text-primary transition-colors">{project.name}</h3>
            <p className="mt-1 text-xs text-muted-foreground truncate">
              {project.client || 'No client'}
              {project.dueDate && new Date(project.dueDate).getFullYear() > 1970 && ` · Due ${format(project.dueDate, 'MMM d, yyyy')}`}
            </p>
          </div>
          <div className="flex items-center gap-1">
            <Badge variant="secondary" className={statusTone(project.status)}>{project.status}</Badge>
            <DropdownMenu>
              <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Project actions">
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setEditDialogOpen(true); }}>
                  <Edit className="w-4 h-4 mr-2" /> Edit
                </DropdownMenuItem>
                {onArchive && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onArchive(project.id, !project.archivedAt); }}>
                    {project.archivedAt ? (<><ArchiveRestore className="w-4 h-4 mr-2" />Restore</>) : (<><Archive className="w-4 h-4 mr-2" />Archive</>)}
                  </DropdownMenuItem>
                )}
                {showDeleteButton && (
                  <DropdownMenuItem onClick={(e) => { e.stopPropagation(); handleDelete(); }} className="text-destructive">
                    <Trash2 className="w-4 h-4 mr-2" /> Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {project.address && (
          <p className="mt-2 flex items-center gap-1 text-xs text-muted-foreground truncate">
            <MapPin className="h-3 w-3 shrink-0" />{project.address}
          </p>
        )}

        <div className="mt-4 space-y-1.5">
          <div className="flex justify-between text-xs">
            <span className="text-muted-foreground">Complete</span>
            <span className="font-medium">{project.completionPercentage}%</span>
          </div>
          <Progress value={project.completionPercentage} className="h-1.5" />
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-x-2 gap-y-3 border-t pt-4 text-xs">
          <Stat label="Contract" value={project.contractValue} />
          <Stat label="Billed" value={billedAmount} />
          <Stat label="Received" value={receivedAmount} />
          <Stat label="Costs paid" value={paidExpenses} />
          <Stat label="Pending" value={pendingExpenses} muted />
          <Stat label="Left to bill" value={remainingAmount} muted />
        </dl>

        <div className="mt-4 flex items-center justify-between rounded-lg bg-muted/50 px-3 py-2 text-xs">
          <span className="text-muted-foreground">Est. profit</span>
          <span className={`font-semibold tabular-nums ${calculateEstimatedProfit() >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-destructive'}`}>
            {money(calculateEstimatedProfit())}
          </span>
        </div>
        {(contingencyAvailable > 0 || changeOrdersTotal > 0) && (
          <div className="mt-2 flex justify-between px-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1"><Shield className="h-3 w-3" />Contingency left {money(contingencyAvailable)}</span>
            {changeOrdersTotal > 0 && <span>COs {money(changeOrdersTotal)}</span>}
          </div>
        )}
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

const money = (n: number) => {
  const abs = Math.abs(n || 0);
  if (abs >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (abs >= 10_000) return `$${Math.round(n / 1000)}K`;
  return `$${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
};

function statusTone(status: string) {
  switch (normalizeProjectStatus(status)) {
    case 'Active': return 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300';
    case 'Planning': return 'bg-blue-500/15 text-blue-700 dark:text-blue-300';
    case 'On Hold': return 'bg-amber-500/15 text-amber-700 dark:text-amber-300';
    default: return 'bg-muted text-muted-foreground';
  }
}

function Stat({ label, value, muted = false }: { label: string; value: number; muted?: boolean }) {
  return (
    <div>
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={`mt-0.5 font-semibold tabular-nums ${muted ? 'text-muted-foreground' : ''}`}>{money(value)}</dd>
    </div>
  );
}
