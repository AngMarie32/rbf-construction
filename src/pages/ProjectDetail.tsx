import { projectProfit } from '@/utils/projectProfit';
import { useState, useEffect } from 'react';
import { normalizeProjectStatus } from '@/lib/projectStatus';
import { Link, useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '@/components/ui/empty-state';
import {
  Edit,
  DollarSign,
  TrendingUp,
  ArrowLeft,
  ArrowRight,
  ChevronRight,
  Plus,
  Upload,
  FileText,
  FileCheck2,
  GitPullRequestArrow,
  Receipt,
  CreditCard,
  ListChecks,
  MapPin,
  User,
  HardHat,
  Copy,
  Loader2,
  BadgeCheck,
} from 'lucide-react';
import { ScanReceiptDialog } from '@/components/expenses/ScanReceiptDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BurnAnalysisTab } from '@/components/projects/BurnAnalysisTab';
import { SafetyMeetingsTab } from '@/components/projects/SafetyMeetingsTab';
import { EditProjectDialog } from '@/components/projects/EditProjectDialog';
import { ProjectScheduleTab } from '@/components/projects/ProjectScheduleTab';
import { ProjectNextSteps } from '@/components/projects/ProjectNextSteps';
import { CreateChangeOrderDialog } from '@/components/change-orders/CreateChangeOrderDialog';
import { Project as GlobalProject } from '@/types';
import { rememberProject } from '@/utils/recentProjects';
import { cn } from '@/lib/utils';
import { PageHero, heroButton, heroButtonPrimary } from '@/components/ui/page-hero';
import { AccentStat } from '@/components/ui/accent-stat';
import { Wallet } from 'lucide-react';

interface DatabaseProject {
  id: string;
  name: string;
  description?: string;
  type: string;
  status: string;
  start_date?: string;
  due_date?: string;
  contract_value: number;
  completion_percentage: number;
  client?: string;
  address?: string;
  field_leader?: string;
  project_code?: string;
  created_at?: string;
  updated_at?: string;
}

export default function ProjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeTab = searchParams.get('tab') || 'overview';
  const setActiveTab = (tab: string) => {
    const next = new URLSearchParams(searchParams);
    if (tab === 'overview') next.delete('tab');
    else next.set('tab', tab);
    setSearchParams(next, { replace: true });
  };
  const [changeOrderOpen, setChangeOrderOpen] = useState(false);
  const [reusing, setReusing] = useState(false);
  const [project, setProject] = useState<GlobalProject | null>(null);
  const [loading, setLoading] = useState(true);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [changeOrders, setChangeOrders] = useState<any[]>([]);
  const [billing, setBilling] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      fetchProject();
      fetchProjectData();
    }
  }, [id]);

  const fetchProject = async () => {
    try {
      setLoading(true);
      console.log('Fetching project details for ID:', id);
      
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', id)
        .single();

      if (error) {
        console.error('Error fetching project:', error);
        throw error;
      }

      if (data) {
        // Map database fields to the GlobalProject interface
        const mappedProject: GlobalProject = {
          id: data.id,
          name: data.name,
          description: data.description,
          type: data.type,
          status: normalizeProjectStatus(data.status) as 'Planning' | 'Active' | 'On Hold' | 'Completed' | 'Closed',
          startDate: data.start_date ? new Date(`${String(data.start_date).slice(0, 10)}T00:00:00`) : (undefined as any),
          dueDate: data.due_date ? new Date(`${String(data.due_date).slice(0, 10)}T00:00:00`) : (undefined as any),
          contractValue: data.contract_value,
          completionPercentage: data.completion_percentage,
          estimatedProfit: (data as any).estimated_profit ?? null,
          client: data.client || '',
          address: data.address || '',
          fieldLeader: data.field_leader,
          projectCode: data.project_code || '',
          createdAt: data.created_at ? new Date(data.created_at) : new Date(),
          updatedAt: data.updated_at ? new Date(data.updated_at) : new Date()
        };
        
        console.log('Project data loaded and mapped:', mappedProject);
        setProject(mappedProject);
        rememberProject({ id: mappedProject.id, name: mappedProject.name });
      }
    } catch (error) {
      console.error('Error fetching project:', error);
      toast.error('Failed to load project details');
      navigate('/projects');
    } finally {
      setLoading(false);
    }
  };

  const fetchProjectData = async () => {
    if (!id) return;

    try {
      // Fetch expenses
      const { data: expensesData } = await supabase
        .from('expenses')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false });

      // Fetch change orders
      const { data: changeOrdersData } = await supabase
        .from('change_orders')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false });

      // Fetch billing
      const { data: billingData } = await supabase
        .from('project_billing')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false });

      // Fetch tasks
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('project_id', id)
        .order('start_date', { ascending: true });

      // Fetch documents
      const { data: documentsData } = await supabase
        .from('documents')
        .select('*')
        .eq('project_id', id)
        .order('created_at', { ascending: false });

      setExpenses(expensesData || []);
      setChangeOrders(changeOrdersData || []);
      setBilling(billingData || []);
      setTasks(tasksData || []);
      setDocuments(documentsData || []);
    } catch (error) {
      console.error('Error fetching project data:', error);
    }
  };

  const handleProjectUpdate = () => {
    fetchProject();
    setEditDialogOpen(false);
  };


  if (loading) {
    return (
      <Layout title="Loading project…" hideTitle>
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout title="Project not found" hideTitle>
        <EmptyState
          icon={HardHat}
          title="We couldn't find that project"
          description="It may have been deleted or you may not have access to it."
          action={{ label: 'Back to projects', icon: ArrowLeft, to: '/projects' }}
        />
      </Layout>
    );
  }

  const money = (n: number) => `$${(n || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
  const statusTone: Record<string, string> = {
    Active: 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300',
    Planning: 'bg-blue-500/15 text-blue-700 dark:text-blue-300',
    'On Hold': 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
    Completed: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
    Closed: 'bg-slate-500/15 text-slate-700 dark:text-slate-300',
  };

  const pid = project.id;
  const qs = `?project=${pid}`;
  // Rejected expenses aren't costs (same rule as the Project performance report).
  const totalExpenses = expenses.filter((e) => e.status !== 'Rejected').reduce((sum, e) => sum + (e.amount || 0), 0);
  const paidExpenses = expenses.filter((e) => e.status === 'Paid').reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalBilled = billing.reduce((sum, b) => sum + (b.billed_amount || 0), 0);
  const totalReceived = billing.reduce((sum, b) => sum + (b.paid_amount || 0), 0);
  const approvedCOs = changeOrders.filter((c) => (c.status || '').toLowerCase() === 'approved').reduce((s, c) => s + (c.amount || 0), 0);
  const revisedContract = (project.contractValue || 0) + approvedCOs;
  const pp = projectProfit(revisedContract, totalExpenses, project.estimatedProfit);
  const estProfit = pp.profit;
  const margin = revisedContract > 0 ? (estProfit / revisedContract) * 100 : 0;
  const budgetUsed = revisedContract > 0 ? Math.min(100, (totalExpenses / revisedContract) * 100) : 0;
  const outstanding = totalBilled - totalReceived;

  const stats = [
    { label: 'Contract (incl. approved COs)', value: money(revisedContract), hint: approvedCOs ? `${money(approvedCOs)} in change orders` : 'Original contract', icon: DollarSign },
    { label: 'Costs to date', value: money(totalExpenses), hint: `${budgetUsed.toFixed(0)}% of contract`, icon: Receipt },
    { label: 'Billed / received', value: `${money(totalBilled)}`, hint: outstanding > 0 ? `${money(outstanding)} still owed to you` : `${money(totalReceived)} received`, icon: CreditCard },
    { label: 'Projected profit', value: money(estProfit), hint: pp.hasTarget ? (pp.overBudget > 0 ? `${money(pp.overBudget)} over cost budget` : `On budget · ${margin.toFixed(1)}% margin`) : `${margin.toFixed(1)}% margin`, icon: TrendingUp, tone: estProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400' },
  ];

  // ---- Job health ----
  const done = Number(project.completionPercentage) || 0;
  const billedPct = revisedContract > 0 ? (totalBilled / revisedContract) * 100 : 0;
  const spentOfBudget = pp.costBudget > 0 ? (totalExpenses / pp.costBudget) * 100 : 0;
  const today0 = new Date();
  today0.setHours(0, 0, 0, 0);
  const hasDue = !!project.dueDate && !isNaN(new Date(project.dueDate).getTime());
  const daysLeft = hasDue ? Math.round((new Date(project.dueDate).getTime() - today0.getTime()) / 86400000) : null;
  const pendingCOs = changeOrders.filter((c) => !['approved', 'rejected', 'void', 'voided'].includes((c.status || '').toLowerCase()));
  const pendingExp = expenses.filter((e) => String(e.status || '').includes('Pending'));
  const overdueTasks = tasks.filter((t) => t.status !== 'Completed' && t.end_date && new Date(`${String(t.end_date).slice(0, 10)}T00:00:00`) < today0);
  const unbilledWork = Math.max(0, (revisedContract * done) / 100 - totalBilled);
  const isOpen = !['Completed', 'Closed'].includes(project.status);
  const alerts: { tone: 'bad' | 'warn' | 'info'; text: string; tab?: string; to?: string }[] = [];
  if (isOpen && daysLeft != null && daysLeft < 0 && done < 100) alerts.push({ tone: 'bad', text: `Past the due date by ${-daysLeft} day${daysLeft === -1 ? '' : 's'} at ${done}% complete.`, tab: 'schedule' });
  if (pp.overBudget > 0) alerts.push({ tone: 'bad', text: `Costs are ${money(pp.overBudget)} over the cost budget, which comes out of profit.`, tab: 'expenses' });
  else if (revisedContract > 0 && budgetUsed > done + 10) alerts.push({ tone: 'warn', text: `${budgetUsed.toFixed(0)}% of the contract is spent at ${done}% complete. Costs are running ahead of progress.`, tab: 'burn-analysis' });
  if (isOpen && unbilledWork > Math.max(1000, revisedContract * 0.05)) alerts.push({ tone: 'warn', text: `About ${money(unbilledWork)} of completed work (${done}% done, ${billedPct.toFixed(0)}% billed) hasn't been billed yet.`, to: `/payment-applications/create/${project.id}` });
  if (billedPct > done + 15 && done > 0) alerts.push({ tone: 'info', text: `Billing (${billedPct.toFixed(0)}%) is ahead of progress (${done}%). Make sure % complete is up to date.`, tab: 'billing' });
  if (outstanding > 0) alerts.push({ tone: 'info', text: `${money(outstanding)} billed and not paid yet.`, tab: 'billing' });
  if (pendingCOs.length) alerts.push({ tone: 'warn', text: `${pendingCOs.length} change order${pendingCOs.length === 1 ? '' : 's'} waiting on approval (${money(pendingCOs.reduce((a, c) => a + (Number(c.amount) || 0), 0))}). Approved ones are added to the Schedule of Values.`, tab: 'change-orders' });
  if (pendingExp.length) alerts.push({ tone: 'info', text: `${pendingExp.length} expense${pendingExp.length === 1 ? '' : 's'} waiting for approval (${money(pendingExp.reduce((a, e) => a + (Number(e.amount) || 0), 0))}).`, to: `/expenses${qs}` });
  if (overdueTasks.length) alerts.push({ tone: 'warn', text: `${overdueTasks.length} schedule task${overdueTasks.length === 1 ? ' is' : 's are'} past due.`, tab: 'schedule' });

  // ---- Recent activity across the job ----
  const activity = [
    ...expenses.filter((e) => e.status !== 'Rejected').map((e) => ({ date: e.date || e.created_at, kind: 'Cost', text: `${e.vendor || e.category || 'Expense'}${e.description ? ` · ${e.description}` : ''}`, amount: Number(e.amount) || 0, tab: 'expenses' })),
    ...billing.map((b) => ({ date: b.invoice_date || b.billing_period_end || b.created_at, kind: 'Billed', text: b.invoice_number || 'Billing', amount: Number(b.billed_amount) || 0, tab: 'billing' })),
    ...changeOrders.map((c) => ({ date: c.date || c.created_at, kind: 'Change order', text: `CO ${c.number} · ${c.description} (${c.status || 'Draft'})`, amount: Number(c.amount) || 0, tab: 'change-orders' })),
    ...documents.map((d) => ({ date: d.created_at, kind: 'Document', text: d.name, amount: null as number | null, tab: 'documents' })),
  ]
    .filter((a) => a.date)
    .sort((a, b) => String(b.date).localeCompare(String(a.date)))
    .slice(0, 8);
  const dayLabel = (v: string) => {
    const d = new Date(String(v).length <= 10 ? `${v}T00:00:00` : v);
    return isNaN(d.getTime()) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  };

  const quickActions = [
    { label: 'Change order', icon: GitPullRequestArrow, onClick: () => setChangeOrderOpen(true) },
    { label: 'Expense', icon: Receipt, to: `/expenses${qs}` },
    { label: 'Pay application', icon: FileCheck2, to: `/payment-applications/create/${pid}` },
    { label: 'Invoice / billing', icon: CreditCard, to: `/billing${qs}` },
    { label: 'Document', icon: Upload, to: `/documents${qs}` },
    { label: 'Punch item', icon: ListChecks, to: `/punch-list${qs}` },
    { label: 'Permit', icon: BadgeCheck, to: `/permits${qs}` },
  ];

  /** Turn this job's real costs into a Bid Template (one line per cost category) for estimating similar work. */
  const reuseCostsForBid = async () => {
    if (expenses.length === 0) {
      toast.info('This job has no recorded costs yet, so there is nothing to reuse.');
      return;
    }
    setReusing(true);
    try {
      const byCategory: Record<string, { total: number; count: number; vendors: Record<string, number> }> = {};
      expenses.forEach((e) => {
        const c = e.category || 'Other';
        const g = (byCategory[c] ||= { total: 0, count: 0, vendors: {} });
        g.total += e.amount || 0;
        g.count += 1;
        if (e.vendor) g.vendors[e.vendor] = (g.vendors[e.vendor] || 0) + (e.amount || 0);
      });
      const { data: tpl, error } = await supabase
        .from('bid_templates')
        .insert({
          name: `Actual costs: ${project.name}`,
          description: `Built from ${expenses.length} recorded costs on ${project.name}${project.client ? ` (${project.client})` : ''}, contract ${money(project.contractValue || 0)}. Adjust quantities and markup for the new bid.`,
        })
        .select('id')
        .single();
      if (error || !tpl) throw error || new Error('No template created');
      const items = Object.entries(byCategory)
        .sort((a, b) => b[1].total - a[1].total)
        .map(([category, g], i) => {
          const topVendors = Object.entries(g.vendors).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([v]) => v);
          return {
            template_id: tpl.id,
            category,
            description: `${category} (actual from ${project.name}, ${g.count} entr${g.count === 1 ? 'y' : 'ies'}${topVendors.length ? `; ${topVendors.join(', ')}` : ''})`,
            quantity: 1,
            unit: 'LS',
            unit_cost: Math.round(g.total * 100) / 100,
            markup_pct: 0,
            sort_order: i,
          };
        });
      const { error: itemsError } = await supabase.from('bid_template_items').insert(items);
      if (itemsError) throw itemsError;
      toast.success('Bid template created from this job\'s actual costs.');
      navigate('/bid-templates');
    } catch (e) {
      console.error(e);
      toast.error('Could not create the bid template.');
    } finally {
      setReusing(false);
    }
  };

  const ViewAll = ({ to, label }: { to: string; label: string }) => (
    <Button asChild variant="ghost" size="sm" className="text-primary">
      <Link to={to}>{label} <ArrowRight className="ml-1 h-4 w-4" /></Link>
    </Button>
  );

  return (
    <Layout title={project.name} hideTitle>
      <div className="space-y-6">
        {/* Header */}
        <PageHero
          eyebrow={[project.projectCode ? `#${project.projectCode}` : null, project.client].filter(Boolean).join(' · ') || 'Project'}
          title={project.name}
          subtitle={
            [
              project.status,
              `${done}% complete`,
              daysLeft == null ? null : daysLeft < 0 ? (isOpen ? `${-daysLeft} days past due` : null) : `${daysLeft} day${daysLeft === 1 ? '' : 's'} left`,
              project.address,
              project.fieldLeader ? `Field leader: ${project.fieldLeader}` : null,
              project.type,
            ]
              .filter(Boolean)
              .join(' · ') || undefined
          }
          actions={
            <>
              <Link to={`/payment-applications/create/${pid}`} className={heroButtonPrimary}>
                <FileCheck2 className="h-4 w-4" /> New pay application
              </Link>
              <button type="button" className={heroButton} onClick={() => setEditDialogOpen(true)}>
                <Edit className="h-4 w-4" /> Edit project
              </button>
              <button type="button" className={heroButton} onClick={reuseCostsForBid} disabled={reusing} title="Create a bid template from this job's actual costs">
                {reusing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Copy className="h-4 w-4" />} Reuse costs for a bid
              </button>
              <Link to="/projects" className={heroButton}>
                <ChevronRight className="h-4 w-4 rotate-180" /> All projects
              </Link>
            </>
          }
        />

        {/* Quick actions */}
        <div className="flex flex-wrap items-center gap-2 rounded-xl border bg-card p-3">
          <span className="mr-1 inline-flex items-center gap-1 text-sm font-medium text-muted-foreground"><Plus className="h-4 w-4" />Add to this job:</span>
          {quickActions.map((a) => {
            const inner = (<><a.icon className="h-4 w-4" />{a.label}</>);
            return a.to ? (
              <Button key={a.label} asChild variant="secondary" size="sm"><Link to={a.to}>{inner}</Link></Button>
            ) : (
              <Button key={a.label} variant="secondary" size="sm" onClick={a.onClick}>{inner}</Button>
            );
          })}
          <ScanReceiptDialog onExpenseCreated={() => fetchProjectData()} defaultProjectId={pid} triggerLabel="Snap receipt" />
        </div>

        {/* Key numbers */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-5">
          <AccentStat label="Contract" value={money(revisedContract)} icon={DollarSign} accent="blue" hint={approvedCOs ? `incl. ${money(approvedCOs)} approved COs` : 'Original contract'} />
          <AccentStat label="Costs to date" value={money(totalExpenses)} icon={Receipt} accent="orange" hint={`${budgetUsed.toFixed(0)}% of contract · ${money(paidExpenses)} paid`} tone={budgetUsed > done + 10 ? 'warn' : undefined} />
          <AccentStat label="Billed" value={money(totalBilled)} icon={CreditCard} accent="indigo" hint={`${billedPct.toFixed(0)}% of contract · ${money(Math.max(0, revisedContract - totalBilled))} left`} />
          <AccentStat label="Owed to you" value={money(outstanding)} icon={Wallet} accent="amber" hint={`${money(totalReceived)} received`} tone={outstanding > 0 ? 'warn' : 'good'} />
          <AccentStat
            label="Projected profit"
            value={money(estProfit)}
            icon={TrendingUp}
            accent="emerald"
            tone={estProfit >= 0 ? 'good' : 'bad'}
            hint={pp.hasTarget ? (pp.overBudget > 0 ? `${money(pp.overBudget)} over cost budget` : `On budget · ${margin.toFixed(1)}% margin`) : `${margin.toFixed(1)}% margin`}
          />
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
          <div className="overflow-x-auto -mx-1 px-1">
            <TabsList className="inline-flex w-max">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
              <TabsTrigger value="change-orders">Change Orders{changeOrders.length ? ` (${changeOrders.length})` : ''}</TabsTrigger>
              <TabsTrigger value="expenses">Costs{expenses.length ? ` (${expenses.length})` : ''}</TabsTrigger>
              <TabsTrigger value="billing">Billing{billing.length ? ` (${billing.length})` : ''}</TabsTrigger>
              <TabsTrigger value="payment-apps">Pay Apps</TabsTrigger>
              <TabsTrigger value="documents">Documents{documents.length ? ` (${documents.length})` : ''}</TabsTrigger>
              <TabsTrigger value="burn-analysis">Burn Analysis</TabsTrigger>
              <TabsTrigger value="safety">Safety</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="overview" className="space-y-6">
            <ProjectNextSteps
              project={project}
              counts={{ tasks: tasks.length, documents: documents.length, expenses: expenses.length, billing: billing.length, changeOrders: changeOrders.length }}
              onEditProject={() => setEditDialogOpen(true)}
              onOpenTab={setActiveTab}
            />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Job health</CardTitle></CardHeader>
                <CardContent className="space-y-5">
                  {([
                    ['Work complete', done, 'bg-blue-600', `${done}%`],
                    [pp.hasTarget ? 'Cost budget used' : 'Contract spent on costs', pp.hasTarget ? spentOfBudget : budgetUsed, spentOfBudget > 100 || budgetUsed > done + 10 ? 'bg-rose-500' : 'bg-orange-500', `${(pp.hasTarget ? spentOfBudget : budgetUsed).toFixed(0)}%`],
                    ['Billed', billedPct, 'bg-indigo-500', `${billedPct.toFixed(0)}%`],
                  ] as const).map(([label, pct, color, text]) => (
                    <div key={label}>
                      <div className="mb-1.5 flex justify-between text-sm">
                        <span>{label}</span>
                        <span className="font-medium tabular-nums">{text}</span>
                      </div>
                      <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                        <div className={cn('h-full rounded-full', color)} style={{ width: `${Math.min(100, Math.max(0, Number(pct)))}%` }} />
                        {label !== 'Work complete' && <div className="absolute top-0 h-full w-0.5 bg-foreground/60" style={{ left: `${Math.min(100, done)}%` }} title="Work complete" />}
                      </div>
                    </div>
                  ))}
                  <p className="text-xs text-muted-foreground">The dark tick on each bar marks % complete, so you can see whether costs and billing are keeping pace.</p>
                  <div className="grid grid-cols-2 gap-4 border-t pt-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Start date</p>
                      <p className="font-medium">{project.startDate && !isNaN(new Date(project.startDate).getTime()) ? new Date(project.startDate).toLocaleDateString() : 'Not set'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Due date</p>
                      <p className="font-medium">{hasDue ? new Date(project.dueDate).toLocaleDateString() : 'Not set'}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Needs attention</CardTitle></CardHeader>
                <CardContent>
                  {alerts.length === 0 ? (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <span className="h-2 w-2 rounded-full bg-emerald-500" /> Nothing needs attention on this job right now.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {alerts.map((al, i) => (
                        <li key={i}>
                          <button
                            type="button"
                            onClick={() => (al.to ? navigate(al.to) : al.tab ? setActiveTab(al.tab) : undefined)}
                            className="flex w-full items-start gap-2 rounded-lg p-2 text-left text-sm hover:bg-muted/50"
                          >
                            <span className={cn('mt-1.5 h-2 w-2 shrink-0 rounded-full', al.tone === 'bad' ? 'bg-rose-500' : al.tone === 'warn' ? 'bg-amber-500' : 'bg-blue-500')} />
                            <span className="flex-1">{al.text}</span>
                            <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <Card>
                <CardHeader className="pb-3"><CardTitle className="text-base">Recent activity</CardTitle></CardHeader>
                <CardContent>
                  {activity.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No costs, billing, change orders or documents on this job yet.</p>
                  ) : (
                    <ul className="divide-y">
                      {activity.map((a, i) => (
                        <li key={i}>
                          <button type="button" onClick={() => setActiveTab(a.tab)} className="flex w-full items-center gap-3 py-2 text-left text-sm hover:bg-muted/40">
                            <span className="w-14 shrink-0 text-xs text-muted-foreground">{dayLabel(String(a.date))}</span>
                            <Badge variant="outline" className="shrink-0 text-[10px]">{a.kind}</Badge>
                            <span className="min-w-0 flex-1 truncate">{a.text}</span>
                            {a.amount != null && <span className="shrink-0 tabular-nums">{money(a.amount)}</span>}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader><CardTitle className="text-base">About this job</CardTitle></CardHeader>
                <CardContent>
                  {project.description ? (
                    <p className="text-sm text-muted-foreground whitespace-pre-line">{project.description}</p>
                  ) : (
                    <div className="text-sm text-muted-foreground">
                      No description yet.{' '}
                      <button className="text-primary hover:underline" onClick={() => setEditDialogOpen(true)}>Add scope notes</button>
                      {' '}so the whole team knows what's included.
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="schedule">
            <ProjectScheduleTab projectId={pid} />
          </TabsContent>

          <TabsContent value="change-orders">
            {changeOrders.length === 0 ? (
              <EmptyState
                compact
                icon={GitPullRequestArrow}
                title="No change orders on this job"
                description="When the owner asks for extra work or the scope changes, write it up as a change order so it's priced, signed and tracked against the contract."
                action={{ label: 'Create your first change order', onClick: () => setChangeOrderOpen(true) }}
              />
            ) : (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Change orders</CardTitle>
                  <div className="flex gap-2">
                    <Button size="sm" onClick={() => setChangeOrderOpen(true)}><Plus className="mr-1 h-4 w-4" />New</Button>
                    <ViewAll to={`/change-orders${qs}`} label="Manage" />
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {changeOrders.map((co) => (
                    <div key={co.id} className="rounded-lg border p-4">
                      <div className="flex justify-between items-start mb-1">
                        <h4 className="font-semibold">CO #{co.number}</h4>
                        <Badge variant="outline">{co.status}</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground mb-2">{co.description}</p>
                      <div className="flex justify-between text-sm">
                        <span className="font-medium tabular-nums">{money(co.amount)}</span>
                        <span className="text-muted-foreground">{co.date ? new Date(co.date).toLocaleDateString() : ''}</span>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="expenses">
            {expenses.length === 0 ? (
              <EmptyState
                compact
                icon={Receipt}
                title="No costs recorded yet"
                description="Log material receipts, sub invoices and other job costs here, or import them from QuickBooks, so you always know what this job is really costing."
                action={{ label: 'Add your first expense', to: `/expenses${qs}` }}
                secondaryAction={{ label: 'Import from QuickBooks', icon: Upload, to: '/report-import' }}
              />
            ) : (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Recent costs</CardTitle>
                  <ViewAll to={`/expenses${qs}`} label={`View all ${expenses.length}`} />
                </CardHeader>
                <CardContent className="space-y-3">
                  {expenses.slice(0, 10).map((e) => (
                    <div key={e.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{e.description || e.category}</p>
                        <p className="text-xs text-muted-foreground">{e.category} · {e.date ? new Date(e.date).toLocaleDateString() : ''}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <Badge variant="outline">{e.status}</Badge>
                        <span className="font-medium tabular-nums">{money(e.amount)}</span>
                      </div>
                    </div>
                  ))}
                  <div className="flex justify-between border-t pt-3 text-sm">
                    <span className="text-muted-foreground">Paid {money(paidExpenses)} · Unpaid {money(totalExpenses - paidExpenses)}</span>
                    <span className="font-semibold tabular-nums">Total {money(totalExpenses)}</span>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="billing">
            {billing.length === 0 ? (
              <EmptyState
                compact
                icon={CreditCard}
                title="Nothing billed on this job yet"
                description="Bill the client as work is completed. Each billing record tracks what you invoiced, what's been paid and what's still owed."
                action={{ label: 'Create your first bill', to: `/billing${qs}` }}
                secondaryAction={{ label: 'Use a pay application (AIA)', icon: FileCheck2, to: `/payment-applications/create/${pid}` }}
              />
            ) : (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Billing</CardTitle>
                  <ViewAll to={`/billing${qs}`} label="Manage billing" />
                </CardHeader>
                <CardContent className="space-y-3">
                  {billing.map((b) => (
                    <div key={b.id} className="rounded-lg border p-4">
                      <div className="flex justify-between items-start mb-2">
                        <h4 className="font-semibold">{b.invoice_number || 'Draft invoice'}</h4>
                        <Badge variant="outline">{b.status}</Badge>
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-sm text-muted-foreground">
                        <div>Billed: <span className="text-foreground tabular-nums">{money(b.billed_amount)}</span></div>
                        <div>Paid: <span className="text-foreground tabular-nums">{money(b.paid_amount)}</span></div>
                        <div>
                          {b.billing_period_start ? new Date(b.billing_period_start).toLocaleDateString() : ''}
                          {b.billing_period_end ? ` – ${new Date(b.billing_period_end).toLocaleDateString()}` : ''}
                        </div>
                      </div>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="payment-apps">
            <EmptyState
              compact
              icon={FileCheck2}
              title="Payment applications"
              description="For jobs billed on a Schedule of Values, create a pay application (G702/G703 style) each period showing work completed, stored materials and retainage."
              action={{ label: 'Create pay application', to: `/payment-applications/create/${pid}` }}
              secondaryAction={{ label: 'See all pay apps for this job', icon: ArrowRight, to: `/payment-applications${qs}` }}
            />
          </TabsContent>

          <TabsContent value="documents">
            {documents.length === 0 ? (
              <EmptyState
                compact
                icon={FileText}
                title="No documents on this job"
                description="Keep the contract, drawings, permits, insurance certificates and photos in one place so the office and the field always have the latest version."
                action={{ label: 'Upload your first document', icon: Upload, to: `/documents${qs}` }}
              />
            ) : (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <CardTitle className="text-base">Documents</CardTitle>
                  <ViewAll to={`/documents${qs}`} label="Open documents" />
                </CardHeader>
                <CardContent className="space-y-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex flex-wrap items-center justify-between gap-2 rounded-lg border p-3">
                      <div className="min-w-0">
                        <p className="font-medium truncate">{doc.name}</p>
                        <p className="text-xs text-muted-foreground">
                          v{doc.version || 1} · {doc.file_size ? `${(doc.file_size / 1024).toFixed(1)} KB` : '—'} · {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : ''}
                        </p>
                      </div>
                      <Badge variant="outline">{doc.category || 'General'}</Badge>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="burn-analysis">
            <BurnAnalysisTab projectId={pid} />
          </TabsContent>

          <TabsContent value="safety">
            <SafetyMeetingsTab projectId={pid} project={project} />
          </TabsContent>
        </Tabs>
      </div>

      <EditProjectDialog
        open={editDialogOpen}
        onOpenChange={setEditDialogOpen}
        project={project}
        onProjectUpdated={handleProjectUpdate}
      />

      <CreateChangeOrderDialog
        open={changeOrderOpen}
        onOpenChange={setChangeOrderOpen}
        projectId={pid}
        onSave={() => fetchProjectData()}
      />
    </Layout>
  );
}
