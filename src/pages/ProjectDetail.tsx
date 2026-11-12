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
          startDate: data.start_date ? new Date(data.start_date) : new Date(),
          dueDate: data.due_date ? new Date(data.due_date) : new Date(),
          contractValue: data.contract_value,
          completionPercentage: data.completion_percentage,
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
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const paidExpenses = expenses.filter((e) => e.status === 'Paid').reduce((sum, e) => sum + (e.amount || 0), 0);
  const totalBilled = billing.reduce((sum, b) => sum + (b.billed_amount || 0), 0);
  const totalReceived = billing.reduce((sum, b) => sum + (b.paid_amount || 0), 0);
  const approvedCOs = changeOrders.filter((c) => c.status === 'Approved').reduce((s, c) => s + (c.amount || 0), 0);
  const revisedContract = (project.contractValue || 0) + approvedCOs;
  const estProfit = revisedContract - totalExpenses;
  const margin = revisedContract > 0 ? (estProfit / revisedContract) * 100 : 0;
  const budgetUsed = revisedContract > 0 ? Math.min(100, (totalExpenses / revisedContract) * 100) : 0;
  const outstanding = totalBilled - totalReceived;

  const stats = [
    { label: 'Contract (incl. approved COs)', value: money(revisedContract), hint: approvedCOs ? `${money(approvedCOs)} in change orders` : 'Original contract', icon: DollarSign },
    { label: 'Costs to date', value: money(totalExpenses), hint: `${budgetUsed.toFixed(0)}% of contract`, icon: Receipt },
    { label: 'Billed / received', value: `${money(totalBilled)}`, hint: outstanding > 0 ? `${money(outstanding)} still owed to you` : `${money(totalReceived)} received`, icon: CreditCard },
    { label: 'Projected profit', value: money(estProfit), hint: `${margin.toFixed(1)}% margin`, icon: TrendingUp, tone: estProfit >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400' },
  ];

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
        {/* Breadcrumb + header */}
        <div className="space-y-3">
          <nav className="flex items-center gap-1 text-sm text-muted-foreground" aria-label="Breadcrumb">
            <Link to="/projects" className="hover:text-foreground">Projects</Link>
            <ChevronRight className="h-4 w-4" />
            <span className="text-foreground font-medium truncate">{project.name}</span>
          </nav>
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-display text-2xl sm:text-3xl font-extrabold tracking-tight">{project.name}</h1>
                <Badge variant="secondary" className={statusTone[project.status] || ''}>{project.status}</Badge>
                {project.projectCode && <span className="text-sm text-muted-foreground">#{project.projectCode}</span>}
              </div>
              <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm text-muted-foreground">
                {project.client && <span className="inline-flex items-center gap-1.5"><User className="h-4 w-4" />{project.client}</span>}
                {project.address && <span className="inline-flex items-center gap-1.5"><MapPin className="h-4 w-4" />{project.address}</span>}
                {project.fieldLeader && <span className="inline-flex items-center gap-1.5"><HardHat className="h-4 w-4" />{project.fieldLeader}</span>}
                {project.type && <span>{project.type}</span>}
              </div>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <Button variant="outline" onClick={reuseCostsForBid} disabled={reusing} title="Create a bid template from this job's actual costs">
                {reusing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Copy className="w-4 h-4" />}
                Reuse costs for a bid
              </Button>
              <Button variant="outline" onClick={() => setEditDialogOpen(true)}>
                <Edit className="w-4 h-4" />
                Edit project
              </Button>
            </div>
          </div>
        </div>

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
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {stats.map((s) => (
            <Card key={s.label} className="p-0">
              <CardContent className="p-5">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <span>{s.label}</span>
                  <s.icon className="h-4 w-4" />
                </div>
                <div className={cn('mt-2 text-2xl font-bold tabular-nums', s.tone)}>{s.value}</div>
                <div className="mt-1 text-xs text-muted-foreground">{s.hint}</div>
              </CardContent>
            </Card>
          ))}
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

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-base">Progress</CardTitle></CardHeader>
                <CardContent className="space-y-5">
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Work complete</span>
                      <span className="font-medium">{project.completionPercentage || 0}%</span>
                    </div>
                    <Progress value={project.completionPercentage || 0} className="h-2" />
                  </div>
                  <div>
                    <div className="flex justify-between text-sm mb-2">
                      <span>Contract spent on costs</span>
                      <span className="font-medium">{budgetUsed.toFixed(0)}%</span>
                    </div>
                    <Progress value={budgetUsed} className="h-2" />
                    {budgetUsed > (project.completionPercentage || 0) + 10 && (
                      <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">
                        Costs are running ahead of progress. Check Burn Analysis.
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Start date</p>
                      <p className="font-medium">{project.startDate?.toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Due date</p>
                      <p className="font-medium">{project.dueDate?.toLocaleDateString()}</p>
                    </div>
                  </div>
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
