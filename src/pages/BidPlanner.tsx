
import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Calculator, 
  Target,
  Building2,
  Lightbulb,
  CheckCircle2,
  ArrowRight
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TabbedBidInterface } from '@/components/bid-planner/TabbedBidInterface';
import { EnhancedBidDialog } from '@/components/bid-planner/EnhancedBidDialog';
import { initializeBidTemplates } from '@/utils/initializeBidTemplates';

export default function BidPlanner() {
  const [projects, setProjects] = useState<any[]>([]);
  const [bidItems, setBidItems] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

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
        .select('id, name, status, contract_value')
        .order('name');

      if (error) {
        console.error('Error fetching projects:', error);
        throw error;
      }
      
      console.log('Projects loaded for bid planner:', data?.length || 0);
      setProjects(data || []);
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
        bidItems: bidItems,
        totalAmount: bidItems.reduce((sum, item) => sum + ((item.unit_cost || 0) * (item.quantity || 0)), 0)
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

  if (loading) {
    return (
      <Layout title="Bid Planner" subtitle="Create and manage construction bids">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Bid Planner" subtitle="Create and manage construction bids">
      <div className="space-y-8">
        {/* Project Selection */}
        <Card className="border-2 border-dashed border-primary/20 bg-primary/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Target className="w-5 h-5 text-primary" />
              Project Selection
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex gap-4 items-center">
              <Select value={selectedProject} onValueChange={handleProjectSelect}>
                <SelectTrigger className="w-full max-w-md bg-background">
                  <SelectValue placeholder="Choose a project for bid planning" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      <div className="flex items-center justify-between w-full">
                        <span>{project.name}</span>
                        <Badge variant="outline" className="ml-2">
                          {project.status}
                        </Badge>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {selectedProject ? (
          <TabbedBidInterface
            projectId={selectedProject}
            bidItems={bidItems}
            onItemsChange={setBidItems}
            onExportReport={handleExportReport}
          />
        ) : (
          <Card className="border-2 border-dashed border-gray-200">
            <CardContent className="text-center py-16">
              <Calculator className="w-20 h-20 text-gray-300 mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Bid Planning</h3>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">
                Select a project above to start creating detailed construction bids with accurate cost estimates and formatting.
              </p>
              {projects.length === 0 && (
                <div className="mt-6">
                  <p className="text-gray-400 mb-4">No projects found. Create a project first to start bid planning.</p>
                  <Button onClick={() => window.location.href = '/projects'} variant="outline">
                    <Building2 className="w-4 h-4 mr-2" />
                    Go to Projects
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Quick Start Guide */}
        <Card className="bg-blue-50 border-blue-200">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <Lightbulb className="w-5 h-5" />
              Quick Start Guide
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                  1
                </div>
                <div>
                  <h4 className="font-semibold text-blue-800 mb-1">Select Project</h4>
                  <p className="text-sm text-blue-700">Choose the project you want to create a bid for from the dropdown above.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                  2
                </div>
                <div>
                  <h4 className="font-semibold text-blue-800 mb-1">Add Bid Items</h4>
                  <p className="text-sm text-blue-700">Use templates or add custom items with quantities, costs, and descriptions.</p>
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm font-semibold">
                  3
                </div>
                <div>
                  <h4 className="font-semibold text-blue-800 mb-1">Export Bid</h4>
                  <p className="text-sm text-blue-700">Generate professional PDF bid reports for client presentation.</p>
                </div>
              </div>
            </div>
            
            <div className="bg-white rounded-lg p-4 border border-blue-200">
              <h5 className="font-semibold text-blue-800 mb-2 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                Pro Tips
              </h5>
              <ul className="text-sm text-blue-700 space-y-1">
                <li className="flex items-center gap-2">
                  <ArrowRight className="w-3 h-3" />
                  Use bid templates to speed up the process for similar projects
                </li>
                <li className="flex items-center gap-2">
                  <ArrowRight className="w-3 h-3" />
                  Include detailed descriptions for better client understanding
                </li>
                <li className="flex items-center gap-2">
                  <ArrowRight className="w-3 h-3" />
                  Review and analyze your bid before exporting to ensure accuracy
                </li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <EnhancedBidDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onBidCreated={fetchBidItems}
          projects={projects}
        />
      </div>
    </Layout>
  );
}
