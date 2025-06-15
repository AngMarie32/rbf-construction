
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
  Plus,
  FileText,
  Save,
  Download
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TabbedBidInterface } from '@/components/bid-planner/TabbedBidInterface';

export default function BidPlanner() {
  const [projects, setProjects] = useState<any[]>([]);
  const [bidItems, setBidItems] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
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
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, status, contract_value')
        .order('name');

      if (error) throw error;
      setProjects(data || []);
      
      // Auto-select first project if available
      if (data && data.length > 0 && !selectedProject) {
        setSelectedProject(data[0].id);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const fetchBidItems = async () => {
    try {
      const { data, error } = await supabase
        .from('bid_items')
        .select('*')
        .eq('project_id', selectedProject)
        .order('category', { ascending: true });

      if (error) throw error;
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
        totalAmount: bidItems.reduce((sum, item) => sum + (item.total || 0), 0)
      };

      const { generateBidReport } = await import('@/utils/pdfExport');
      await generateBidReport(exportData);
      
      toast.success('Bid report exported successfully');
    } catch (error) {
      console.error('Error exporting bid report:', error);
      toast.error('Failed to export bid report');
    }
  };

  const handleCreateNewBid = () => {
    toast.info('Create new bid functionality');
  };

  const handleUseTemplate = () => {
    toast.info('Use template functionality');
  };

  const handleSaveAsTemplate = () => {
    toast.info('Save as template functionality');
  };

  const handleExportToSOV = () => {
    toast.info('Export to SOV functionality');
  };

  const handleCreateProposal = () => {
    toast.info('Create proposal functionality');
  };

  if (loading) {
    return (
      <Layout title="Bid Planner" subtitle="Create and manage construction bids">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  const selectedProjectData = projects.find(p => p.id === selectedProject);

  return (
    <Layout title="Bid Planner" subtitle="Create and manage construction bids">
      <div className="space-y-6">
        {/* Project Selection */}
        <Card>
          <CardContent className="pt-6">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Select Project</h3>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger className="w-full">
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
          <>
            {/* Bid Management Actions */}
            <Card>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold">Bid Management</h3>
                  <div className="flex flex-wrap gap-3">
                    <Button onClick={handleCreateNewBid} className="bg-blue-600 hover:bg-blue-700">
                      <Plus className="w-4 h-4 mr-2" />
                      Create New Bid
                    </Button>
                    <Button variant="outline" onClick={handleUseTemplate}>
                      <FileText className="w-4 h-4 mr-2" />
                      Use Template
                    </Button>
                    <Button variant="outline" onClick={handleSaveAsTemplate}>
                      <Save className="w-4 h-4 mr-2" />
                      Save as Template
                    </Button>
                    <Button variant="outline" onClick={handleExportToSOV} className="bg-blue-100 hover:bg-blue-200 text-blue-700">
                      Export to SOV
                    </Button>
                    <Button variant="outline" onClick={handleExportReport} className="bg-blue-100 hover:bg-blue-200 text-blue-700">
                      <Download className="w-4 h-4 mr-2" />
                      Export PDF
                    </Button>
                    <Button variant="outline" onClick={handleCreateProposal} className="text-gray-500">
                      Create Proposal
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabbed Interface */}
            <TabbedBidInterface
              projectId={selectedProject}
              bidItems={bidItems}
              onItemsChange={setBidItems}
              onCreateNewBid={handleCreateNewBid}
              onExportReport={handleExportReport}
              projectName={selectedProjectData?.name}
            />
          </>
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
      </div>
    </Layout>
  );
}
