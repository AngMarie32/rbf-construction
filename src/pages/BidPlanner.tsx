import { WorkflowStepper } from '@/components/workflow/WorkflowStepper';
import { sortProjectsOpenFirst } from '@/utils/projectOrder';

import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calculator, Target, Building2, Plus, Download, FileUp, Database, LayoutTemplate, ListChecks, Layers, DollarSign } from 'lucide-react';
import { PageHero, heroButton } from '@/components/ui/page-hero';
import { ExportMenu, downloadCsv } from '@/components/ui/export-menu';
import { createProposalFromBid, sendBidToSov } from '@/utils/proposalWorkflow';
import { AccentStat } from '@/components/ui/accent-stat';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TabbedBidInterface } from '@/components/bid-planner/TabbedBidInterface';
import { EnhancedBidDialog } from '@/components/bid-planner/EnhancedBidDialog';
import { ImportTakeoffDialog } from '@/components/bid-planner/ImportTakeoffDialog';
import { initializeBidTemplates } from '@/utils/initializeBidTemplates';

export default function BidPlanner() {
  const [projects, setProjects] = useState<any[]>([]);
  const [bidItems, setBidItems] = useState<any[]>([]);
  const [searchParams] = useSearchParams();
  const [selectedProject, setSelectedProject] = useState<string>(searchParams.get('project') || '');
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const navigate = useNavigate();

  const exportBidCsv = () => {
    const p = projects.find((x) => x.id === selectedProject);
    downloadCsv(
      `bid-${(p?.name || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-')}`,
      ['Section', 'Subsection', 'Description', 'Quantity', 'Unit', 'Unit cost', 'Markup %', 'Amount'],
      bidItems.map((i) => [
        i.category,
        i.subcategory || '',
        i.description,
        i.quantity,
        i.unit || '',
        Number(i.unit_cost || 0).toFixed(2),
        Number(i.markup_pct || 0),
        ((Number(i.unit_cost) || 0) * (Number(i.quantity) || 0) * (1 + (Number(i.markup_pct) || 0) / 100)).toFixed(2),
      ])
    );
  };

  useEffect(() => {
    fetchProjects();
    initializeBidTemplates(); // Initialize templates on page load
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchBidItems();
    } else {
      setBidItems([]);
    }
  }, [selectedProject]);

  const fetchProjects = async () => {
    try {
      console.log('Fetching projects for bid planner...');
      setLoading(true);
      
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, status, contract_value, client, address, project_code').is('archived_at', null)
        .order('name');

      if (error) {
        console.error('Error fetching projects:', error);
        throw error;
      }
      
      console.log('Projects loaded for bid planner:', data?.length || 0);
      setProjects(sortProjectsOpenFirst(data || []));
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const fetchBidItems = async () => {
    try {
      console.log('Fetching bid items for project:', selectedProject);
      
      const { data, error } = await supabase
        .from('bid_items')
        .select('*')
        .eq('project_id', selectedProject)
        .order('category', { ascending: true });

      if (error) {
        console.error('Error fetching bid items:', error);
        throw error;
      }
      
      console.log('Bid items loaded:', data?.length || 0);
      setBidItems(data || []);
    } catch (error) {
      console.error('Error fetching bid items:', error);
      toast.error('Failed to load bid items');
    }
  };

  const handleExportReport = async () => {
    try {
      const { data: companyData } = await supabase
        .from('company_settings')
        .select('*')
        .limit(1)
        .maybeSingle();

      const selectedProjectData = projects.find(p => p.id === selectedProject);
      
      const exportData = {
        projectName: selectedProjectData?.name || 'Unnamed Project',
        client: selectedProjectData?.client || 'N/A',
        date: new Date().toLocaleDateString(),
        companyName: companyData?.company_name || 'BuildPro Construction',
        companyAddress: companyData?.company_address || '',
        companyPhone: companyData?.company_phone || '',
        companyEmail: companyData?.company_email || '',
        logoUrl: companyData?.logo_url || '',
        projectAddress: selectedProjectData?.address || '',
        projectCode: selectedProjectData?.project_code || '',
        bidItems: bidItems,
      };

      const { generateBidReport } = await import('@/utils/pdfExport');
      await generateBidReport(exportData);
      
      toast.success('Bid report exported successfully');
    } catch (error) {
      console.error('Error exporting bid report:', error);
      toast.error('Failed to export bid report');
    }
  };

  const handleProjectSelect = (projectId: string) => {
    console.log('Project selected for bid planner:', projectId);
    setSelectedProject(projectId);
  };

  const project = projects.find((p) => p.id === selectedProject);
  const bidTotal = bidItems.reduce((sum, item) => sum + (Number(item.unit_cost) || 0) * (Number(item.quantity) || 0) * (1 + (Number(item.markup_pct) || 0) / 100), 0);
  const sectionCount = new Set(bidItems.map((i) => i.category).filter(Boolean)).size;
  const contract = Number(project?.contract_value) || 0;
  const money0 = (n: number) => n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

  return (
    <Layout hideTitle title="Bid Planner" subtitle="Create and manage construction bids">
      <div className="space-y-6">
        <PageHero
          eyebrow="Bidding"
          title={project ? project.name : 'Bid Planner'}
          subtitle={project ? 'Build the bid line by line, from templates, blueprints or a takeoff file.' : 'Pick a project to build a detailed, line-by-line bid.'}
          actions={
            <>
              {selectedProject && (
                <button type="button" className={heroButton} onClick={() => setImportOpen(true)}>
                  <FileUp className="h-4 w-4" /> Import CAD / takeoff
                </button>
              )}
              {selectedProject && bidItems.length > 0 && (
                <ExportMenu
                  variant="hero"
                  options={[
                    { label: 'Bid report (PDF)', hint: 'Sections, line detail and totals', format: 'pdf', onSelect: handleExportReport },
                    { label: 'Bid lines (CSV)', hint: 'For Excel', format: 'csv', onSelect: exportBidCsv },
                  ]}
                />
              )}
              <Link to="/bid-templates" className={heroButton}>
                <LayoutTemplate className="h-4 w-4" /> Templates
              </Link>
              <Link to="/cost-database" className={heroButton}>
                <Database className="h-4 w-4" /> Cost database
              </Link>
            </>
          }
          stats={
            project
              ? [
                  { label: 'Bid total', value: money0(bidTotal) },
                  { label: 'Contract value', value: contract ? money0(contract) : '—' },
                ]
              : []
          }
        >
          <div className="flex flex-wrap items-center gap-3">
            <Target className="h-4 w-4 text-orange-300" />
            {loading ? (
              <Skeleton className="h-10 w-full max-w-md bg-white/10" />
            ) : (
              <Select value={selectedProject} onValueChange={handleProjectSelect}>
                <SelectTrigger className="w-full max-w-md border-white/15 bg-white/10 text-white [&>span]:truncate">
                  <SelectValue placeholder="Choose a project for bid planning" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="flex items-center gap-2">
                        <span>{p.name}</span>
                        <span className="text-xs text-muted-foreground">{p.status}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>
        </PageHero>

        <WorkflowStepper
          projectId={selectedProject}
          next={
            selectedProject
              ? {
                  label: 'Create proposal from this bid',
                  description: `Starts a draft proposal for ${project?.name || 'this project'} with all ${bidItems.length} bid lines, quantities and markup filled in.`,
                  disabled: !bidItems.length,
                  disabledReason: 'Add at least one bid line, then turn the bid into a proposal in one click.',
                  onClick: async () => {
                    try {
                      await createProposalFromBid(selectedProject, bidItems);
                      toast.success('Draft proposal created from this bid');
                      navigate(`/proposals?project=${selectedProject}`);
                    } catch (e: any) {
                      toast.error(e.message || 'Could not create the proposal');
                    }
                  },
                }
              : undefined
          }
          alternatives={
            selectedProject && bidItems.length
              ? [
                  {
                    label: 'Skip proposal, send to Schedule of Values',
                    description: 'Use the bid lines as billing lines now. Unbilled lines are replaced; billed ones are kept.',
                    onClick: async () => {
                      try {
                        const r = await sendBidToSov(selectedProject);
                        toast.success(`Sent ${r.added} line${r.added === 1 ? '' : 's'} to the Schedule of Values`);
                        navigate(`/schedule-of-values?project=${selectedProject}`);
                      } catch (e: any) {
                        toast.error(e.message || 'Could not send the bid to the Schedule of Values');
                      }
                    },
                  },
                ]
              : []
          }
        />

        {selectedProject && (
          <ImportTakeoffDialog
            open={importOpen}
            onOpenChange={setImportOpen}
            projectId={selectedProject}
            onDone={() => {
              fetchBidItems();
              setReloadKey((k) => k + 1);
            }}
          />
        )}

        {selectedProject ? (
          <>
            <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
              <AccentStat label="Bid lines" value={bidItems.length} icon={ListChecks} accent="blue" />
              <AccentStat label="Sections" value={sectionCount} icon={Layers} accent="indigo" />
              <AccentStat label="Bid total" value={money0(bidTotal)} icon={DollarSign} accent="orange" hint="Incl. markup" />
              <AccentStat
                label="vs. contract value"
                value={contract ? money0(contract - bidTotal) : '—'}
                tone={contract ? (contract - bidTotal >= 0 ? 'good' : 'bad') : undefined}
                accent="emerald"
                hint={contract ? (contract - bidTotal >= 0 ? 'Room under the contract' : 'Bid is over the contract') : 'No contract value on the project'}
              />
            </div>

            <TabbedBidInterface
              key={`${selectedProject}-${reloadKey}`}
              projectId={selectedProject}
              bidItems={bidItems}
              onItemsChange={setBidItems}
              onExportReport={handleExportReport}
              projects={projects}
              onProjectChange={handleProjectSelect}
            />
          </>
        ) : !loading && projects.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="Create a project first"
            description="Bids are built per project. Add the job on the Projects page, then come back here to price it."
            action={{ label: 'Go to Projects', to: '/projects', icon: Building2 }}
          />
        ) : (
          <EmptyState
            icon={Calculator}
            title="Pick a project to start the bid"
            description="Choose a project in the banner above. You can add lines by hand, pull in a saved template, read quantities from blueprints, or import a CAD takeoff."
            secondaryAction={{ label: 'Manage templates', to: '/bid-templates' }}
            steps={['Select the project', 'Add bid items from templates, blueprints or by hand', 'Export the PDF or turn it into a proposal']}
          />
        )}

        <EnhancedBidDialog open={createDialogOpen} onOpenChange={setCreateDialogOpen} onBidCreated={fetchBidItems} projects={projects} />
      </div>
    </Layout>
  );
}
