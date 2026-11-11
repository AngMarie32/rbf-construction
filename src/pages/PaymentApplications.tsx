import { WorkflowStepper } from '@/components/workflow/WorkflowStepper';
import { sortProjectsOpenFirst } from '@/utils/projectOrder';
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Eye, FileText, DollarSign, CheckSquare, FileSignature, Printer, Trash2, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/ui/empty-state';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { G702Dialog } from '@/components/forms/G702Dialog';
import { SendForSignatureButton } from '@/components/esign/SendForSignatureButton';
import { LienWaiverDialog } from '@/components/payment-applications/LienWaiverDialog';
import { LienWaiverTracker } from '@/components/payment-applications/LienWaiverTracker';
import { CheckCircle2, ShieldAlert } from 'lucide-react';

interface PaymentApplication {
  id: string;
  project_id: string;
  application_number: number;
  period_to: string;
  original_contract_sum: number;
  net_change_by_change_orders: number;
  contract_sum_to_date: number;
  total_completed_and_stored?: number;
  total_retainage?: number;
  current_payment_due: number;
  created_at: string;
  payment_status?: string;
  paid_at?: string | null;
  projects?: {
    name: string;
    client: string;
  };
}

interface Project {
  id: string;
  name: string;
  status: string;
}

export default function PaymentApplications() {
  const navigate = useNavigate();
  const [applications, setApplications] = useState<PaymentApplication[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>(new URLSearchParams(window.location.search).get('project') || '');
  const [loading, setLoading] = useState(true);
  const [selectedApplication, setSelectedApplication] = useState<PaymentApplication | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [waiverApp, setWaiverApp] = useState<PaymentApplication | null>(null);
  const [trackerApp, setTrackerApp] = useState<PaymentApplication | null>(null);
  const [waiverSummaries, setWaiverSummaries] = useState<Record<string, { received: number; total: number; allCleared: boolean }>>({});

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchApplications();
    }
  }, [selectedProject]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, status').is('archived_at', null)
        .order('name');

      if (error) throw error;
      setProjects(sortProjectsOpenFirst(data || []));

      // Honor ?project= deep links (e.g. from the Bid Estimator), else select first project
      if (data && data.length > 0) {
        const param = new URLSearchParams(window.location.search).get('project');
        const match = param ? data.find((p) => p.id === param) : null;
        setSelectedProject(match ? match.id : sortProjectsOpenFirst(data)[0].id);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    }
  };

  const fetchApplications = async () => {
    if (!selectedProject) return;
    
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('payment_applications_g702')
        .select(`
          *,
          projects (
            name,
            client
          )
        `)
        .eq('project_id', selectedProject)
        .order('application_number', { ascending: false });

      if (error) throw error;
      
      setApplications(data || []);
      // Fetch waiver summary for all apps in one query
      const ids = (data || []).map((a: any) => a.id);
      if (ids.length) {
        const { data: wRows } = await supabase
          .from('payment_app_lien_waivers')
          .select('payment_app_id, status')
          .in('payment_app_id', ids);
        const summary: Record<string, { received: number; total: number; allCleared: boolean }> = {};
        ids.forEach(id => { summary[id] = { received: 0, total: 0, allCleared: false }; });
        ((wRows as any[]) || []).forEach(r => {
          const s = summary[r.payment_app_id];
          s.total += 1;
          if (r.status === 'received' || r.status === 'waived') s.received += 1;
        });
        Object.values(summary).forEach(s => { s.allCleared = s.total > 0 && s.received === s.total; });
        setWaiverSummaries(summary);
      } else {
        setWaiverSummaries({});
      }
    } catch (error) {
      console.error('Error fetching applications:', error);
      toast.error('Failed to load payment applications');
    } finally {
      setLoading(false);
    }
  };

  const handleNewApplication = () => {
    if (selectedProject) {
      navigate(`/payment-applications/create/${selectedProject}`);
    }
  };

  const handleEditApplication = (application: PaymentApplication) => {
    navigate(`/payment-applications/edit/${selectedProject}/${application.id}`);
  };

  const handleDeleteApplication = async (id: string, applicationNumber: number) => {
    if (!confirm('Are you sure you want to delete this payment application? This will also reset SOV progress for this application.')) {
      return;
    }

    try {
      // Get the application to delete
      const { data: appToDelete, error: fetchError } = await supabase
        .from('payment_applications_g702')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Get all applications for this project with higher application numbers
      const { data: laterApps, error: laterAppsError } = await supabase
        .from('payment_applications_g702')
        .select('*')
        .eq('project_id', selectedProject)
        .gt('application_number', applicationNumber);

      if (laterAppsError) throw laterAppsError;

      if (laterApps && laterApps.length > 0) {
        toast.error('Cannot delete this application. Please delete applications in reverse order (delete newer applications first).');
        return;
      }

      // Get SOV items for this project
      const { data: sovItems, error: sovError } = await supabase
        .from('sov_items')
        .select('*')
        .eq('project_id', selectedProject);

      if (sovError) throw sovError;

      // Get previous applications to recalculate SOV item state
      const { data: previousApps, error: prevError } = await supabase
        .from('payment_applications_g702')
        .select('*')
        .eq('project_id', selectedProject)
        .lt('application_number', applicationNumber)
        .order('application_number', { ascending: true });

      if (prevError) throw prevError;

      console.log('Recalculating SOV items for applications:', previousApps?.map(app => app.application_number));

      // For each SOV item, recalculate its state based on remaining applications
      for (const item of sovItems || []) {
        let cumulativePreviousApplications = 0;
        
        // Sum up all the "this_period" amounts from remaining applications
        // Note: We don't have historical "this_period" data, so we need to reconstruct it
        // For now, we'll reset to the state before this application
        
        // If this is application #1 being deleted, reset everything to 0
        if (applicationNumber === 1) {
          await supabase
            .from('sov_items')
            .update({
              previous_applications: 0,
              this_period: 0,
              percent_complete: 0,
              // Preserve change_orders and other fields
              change_orders: item.change_orders
            })
            .eq('id', item.id);
        } else {
          // For applications > 1, we need to recalculate based on remaining applications
          // This is complex without historical data, so for now we'll approximate
          // by reducing the previous_applications by the amount that was likely added in this application
          
          const estimatedThisPeriodAmount = Math.max(0, 
            (item.previous_applications || 0) - (previousApps?.length > 0 ? item.previous_applications / previousApps.length : 0)
          );
          
          const newPreviousApplications = Math.max(0, (item.previous_applications || 0) - estimatedThisPeriodAmount);
          const totalContract = (item.scheduled_value || 0) + (item.change_orders || 0);
          const newPercentComplete = totalContract > 0 ? (newPreviousApplications / totalContract) * 100 : 0;
          
          await supabase
            .from('sov_items')
            .update({
              previous_applications: newPreviousApplications,
              this_period: 0,
              percent_complete: Math.min(newPercentComplete, 100),
              // Preserve change_orders and other fields
              change_orders: item.change_orders
            })
            .eq('id', item.id);
        }
      }

      // Delete the application
      const { error: deleteError } = await supabase
        .from('payment_applications_g702')
        .delete()
        .eq('id', id);

      if (deleteError) throw deleteError;
      
      toast.success('Payment application deleted and SOV progress reset successfully');
      fetchApplications();
    } catch (error) {
      console.error('Error deleting application:', error);
      toast.error('Failed to delete payment application');
    }
  };

  const handleApplicationSaved = () => {
    fetchApplications();
    setDialogOpen(false);
    setSelectedApplication(null);
  };

  const handleMarkPaid = async (app: PaymentApplication) => {
    const summary = waiverSummaries[app.id];
    if (!summary || !summary.allCleared) {
      toast.error('Cannot mark paid: all lien waivers must be received first.');
      return;
    }
    const { error } = await supabase
      .from('payment_applications_g702')
      .update({ payment_status: 'paid', paid_at: new Date().toISOString() })
      .eq('id', app.id);
    if (error) return toast.error(error.message);
    toast.success(`Application #${app.application_number} marked as paid`);
    fetchApplications();
  };

  const handleMarkUnpaid = async (app: PaymentApplication) => {
    const { error } = await supabase
      .from('payment_applications_g702')
      .update({ payment_status: 'unpaid', paid_at: null })
      .eq('id', app.id);
    if (error) return toast.error(error.message);
    fetchApplications();
  };

  // ---- Summary (latest application carries the running totals) ----
  const latestApplication = applications[0];
  const contractToDate = latestApplication?.contract_sum_to_date || latestApplication?.original_contract_sum || 0;
  const completedToDate = latestApplication?.total_completed_and_stored || 0;
  const retainageHeld = latestApplication?.total_retainage || 0;
  const totalRequested = applications.reduce((sum, app) => sum + (app.current_payment_due || 0), 0);
  const paidApps = applications.filter((a) => a.payment_status === 'paid');
  const paidTotal = paidApps.reduce((sum, a) => sum + (a.current_payment_due || 0), 0);
  const unpaidTotal = totalRequested - paidTotal;
  const pctComplete = contractToDate > 0 ? Math.min(100, (completedToDate / contractToDate) * 100) : 0;
  const money = (n: number) => `$${Math.round(n || 0).toLocaleString()}`;

  const selectedProjectData = projects.find((p) => p.id === selectedProject);

  const appState = (app: PaymentApplication) => {
    const w = waiverSummaries[app.id] || { received: 0, total: 0, allCleared: false };
    if (app.payment_status === 'paid') return { label: 'Paid', tone: 'success' as const, w };
    if (w.total > 0 && !w.allCleared) return { label: 'Waivers pending', tone: 'warning' as const, w };
    return { label: 'Awaiting payment', tone: 'info' as const, w };
  };

  const projectPicker = (
    <Select value={selectedProject} onValueChange={setSelectedProject}>
      <SelectTrigger className="w-72">
        <SelectValue placeholder="Choose a project" />
      </SelectTrigger>
      <SelectContent>
        {projects.map((project) => (
          <SelectItem key={project.id} value={project.id}>
            <span className="flex items-center gap-2">
              {project.name}
              <span className="text-xs text-muted-foreground">{project.status}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  if (loading && !selectedProject) {
    return (
      <Layout title="Payment Applications" subtitle="AIA G702 / G703 billing for each job">
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-64 w-full" />
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title="Payment Applications"
      subtitle="AIA G702 / G703 billing for each job"
      actions={
        <>
          {projectPicker}
          <Button onClick={handleNewApplication} disabled={!selectedProject}>
            <Plus className="w-4 h-4" /> New application
          </Button>
        </>
      }
    >
      <div className="space-y-6">
        <WorkflowStepper projectId={selectedProject} />

        {!selectedProject ? (
          <EmptyState
            icon={FileText}
            title="Choose a project"
            description="Pick a job at the top right to see its payment applications."
          />
        ) : (
          <>
            {/* Contract summary band */}
            <Card className="overflow-hidden p-0">
              <div className="relative overflow-hidden bg-[hsl(222_47%_13%)] px-6 py-6 text-white">
                <div aria-hidden className="absolute -right-20 -top-20 h-60 w-60 rounded-full bg-orange-500/25 blur-3xl" />
                <div className="relative flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.2em] text-orange-300">Billing summary</p>
                    <h2 className="mt-1 font-display text-2xl font-extrabold tracking-tight">{selectedProjectData?.name}</h2>
                    <p className="mt-1 text-sm text-white/60">
                      {applications.length === 0
                        ? 'No applications yet'
                        : `${applications.length} application${applications.length === 1 ? '' : 's'} · latest #${latestApplication.application_number}, period ending ${format(new Date(latestApplication.period_to), 'MMM d, yyyy')}`}
                    </p>
                  </div>
                  <div className="w-full max-w-md">
                    <div className="flex justify-between text-xs text-white/70">
                      <span>Completed & stored to date</span>
                      <span className="font-semibold text-white">{pctComplete.toFixed(0)}% of contract</span>
                    </div>
                    <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-white/15">
                      <div className="h-full rounded-full bg-gradient-to-r from-orange-400 to-amber-300" style={{ width: `${pctComplete}%` }} />
                    </div>
                    <div className="mt-1.5 flex justify-between text-xs text-white/60">
                      <span>{money(completedToDate)}</span>
                      <span>{money(contractToDate)}</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-3 sm:divide-y-0 lg:grid-cols-5">
                {[
                  { label: 'Contract sum to date', value: money(contractToDate), sub: 'Incl. change orders', icon: DollarSign },
                  { label: 'Requested to date', value: money(totalRequested), sub: `${applications.length} application${applications.length === 1 ? '' : 's'}`, icon: FileText },
                  { label: 'Paid', value: money(paidTotal), sub: `${paidApps.length} paid`, icon: CheckCircle2, tone: 'text-emerald-600 dark:text-emerald-400' },
                  { label: 'Awaiting payment', value: money(unpaidTotal), sub: `${applications.length - paidApps.length} open`, icon: Clock, tone: unpaidTotal > 0 ? 'text-amber-600 dark:text-amber-400' : '' },
                  { label: 'Retainage held', value: money(retainageHeld), sub: 'Bill at closeout', icon: ShieldAlert },
                ].map((k) => (
                  <div key={k.label} className="p-4">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{k.label}</span>
                      <k.icon className="h-4 w-4" />
                    </div>
                    <p className={`mt-1.5 text-xl font-bold tabular-nums ${k.tone || ''}`}>{k.value}</p>
                    <p className="text-xs text-muted-foreground">{k.sub}</p>
                  </div>
                ))}
              </div>
            </Card>

            {/* Applications */}
            {loading ? (
              <div className="space-y-3">{[0, 1].map((i) => <Skeleton key={i} className="h-36 w-full rounded-xl" />)}</div>
            ) : applications.length === 0 ? (
              <EmptyState
                icon={FileText}
                title="Create the first pay application"
                description="Bill the owner each period from your Schedule of Values. Each application builds the G702 summary and G703 continuation sheet, tracks retainage and collects lien waivers before you mark it paid."
                action={{ label: 'Create first application', onClick: handleNewApplication }}
                secondaryAction={{ label: 'Set up Schedule of Values', icon: CheckSquare, to: `/schedule-of-values?project=${selectedProject}` }}
                steps={['Set up the Schedule of Values', 'Enter work completed this period', 'Send for signature, collect waivers, mark paid']}
              />
            ) : (
              <div className="space-y-3">
                {applications.map((app) => {
                  const st = appState(app);
                  const appPct = (app.contract_sum_to_date || app.original_contract_sum) > 0
                    ? Math.min(100, ((app.total_completed_and_stored || 0) / (app.contract_sum_to_date || app.original_contract_sum)) * 100)
                    : 0;
                  return (
                    <Card key={app.id} className="p-0 overflow-hidden">
                      <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-center">
                        {/* Number + period */}
                        <div className="flex items-center gap-4 lg:w-64 lg:shrink-0">
                          <div className="flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <span className="text-[10px] font-semibold uppercase leading-none">App</span>
                            <span className="font-display text-xl font-extrabold leading-tight">#{app.application_number}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs text-muted-foreground">Period ending</p>
                            <p className="font-semibold">{format(new Date(app.period_to), 'MMM d, yyyy')}</p>
                            <Badge variant={st.tone} className="mt-1">{st.label}</Badge>
                          </div>
                        </div>

                        {/* Amounts */}
                        <div className="grid flex-1 grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
                          <div>
                            <p className="text-xs text-muted-foreground">Contract sum</p>
                            <p className="font-semibold tabular-nums">{money(app.contract_sum_to_date || app.original_contract_sum)}</p>
                            {app.net_change_by_change_orders ? (
                              <p className="text-xs text-muted-foreground">{app.net_change_by_change_orders > 0 ? '+' : ''}{money(app.net_change_by_change_orders)} COs</p>
                            ) : null}
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Completed & stored</p>
                            <p className="font-semibold tabular-nums">{money(app.total_completed_and_stored || 0)}</p>
                            <div className="mt-1 h-1.5 w-24 overflow-hidden rounded-full bg-muted">
                              <div className="h-full rounded-full bg-primary" style={{ width: `${appPct}%` }} />
                            </div>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Retainage</p>
                            <p className="font-semibold tabular-nums">{money(app.total_retainage || 0)}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">Payment due</p>
                            <p className="font-display text-xl font-bold tabular-nums text-primary">{money(app.current_payment_due)}</p>
                            {app.payment_status === 'paid' && app.paid_at && (
                              <p className="text-xs text-emerald-600 dark:text-emerald-400">Paid {format(new Date(app.paid_at), 'MMM d')}</p>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-2 border-t bg-muted/30 px-5 py-3">
                        <Button size="sm" onClick={() => handleEditApplication(app)}>
                          <Eye className="w-4 h-4" /> Open
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => navigate(`/payment-applications/edit/${selectedProject}/${app.id}?doc=g702&print=1`)}>
                          <Printer className="w-4 h-4" /> Print G702
                        </Button>
                        <SendForSignatureButton
                          source="invoice"
                          sourceId={app.id}
                          projectId={app.project_id}
                          title={`Payment Application #${app.application_number} – ${app.projects?.name || ''}`.trim()}
                          company={app.projects?.client}
                          paymentAppNumber={app.application_number}
                          documentType="Payment Application"
                          variant="outline"
                          size="sm"
                        />
                        <Button size="sm" variant="outline" onClick={() => setWaiverApp(app)} title="Generate a lien waiver">
                          <FileSignature className="w-4 h-4" /> Lien waiver
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setTrackerApp(app)} title="Track lien waivers">
                          <ShieldAlert className={`w-4 h-4 ${st.w.total === 0 ? 'text-muted-foreground' : st.w.allCleared ? 'text-emerald-600' : 'text-amber-600'}`} />
                          Waivers {st.w.total > 0 ? `${st.w.received}/${st.w.total}` : ''}
                        </Button>
                        <div className="ml-auto flex items-center gap-2">
                          {app.payment_status === 'paid' ? (
                            <Button size="sm" variant="ghost" onClick={() => handleMarkUnpaid(app)} title="Mark as not paid">
                              Undo paid
                            </Button>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleMarkPaid(app)}
                              disabled={!st.w.allCleared}
                              title={st.w.allCleared ? 'Mark this application as paid' : 'All lien waivers must be received before marking paid'}
                              className="border-emerald-500/40 text-emerald-700 hover:bg-emerald-500/10 dark:text-emerald-400"
                            >
                              <CheckCircle2 className="w-4 h-4" /> Mark paid
                            </Button>
                          )}
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9 text-destructive hover:text-destructive"
                            onClick={() => handleDeleteApplication(app.id, app.application_number)}
                            aria-label={`Delete application #${app.application_number}`}
                            title="Delete (newest application first)"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}
      </div>

      {/* G702 Dialog */}
      <G702Dialog 
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        projectId={selectedProject}
        applicationId={selectedApplication?.id}
        onSave={handleApplicationSaved}
      />

      {waiverApp && (
        <LienWaiverDialog
          open={!!waiverApp}
          onOpenChange={(v) => { if (!v) { setWaiverApp(null); fetchApplications(); } }}
          paymentApp={{
            id: waiverApp.id,
            application_number: waiverApp.application_number,
            project_id: waiverApp.project_id,
            period_to: waiverApp.period_to,
            current_payment_due: waiverApp.current_payment_due,
            project_name: waiverApp.projects?.name,
            client: waiverApp.projects?.client,
          }}
        />
      )}

      {trackerApp && (
        <LienWaiverTracker
          open={!!trackerApp}
          onOpenChange={(v) => !v && setTrackerApp(null)}
          paymentApp={{ id: trackerApp.id, application_number: trackerApp.application_number }}
          onChanged={fetchApplications}
        />
      )}
    </Layout>
  );
}
