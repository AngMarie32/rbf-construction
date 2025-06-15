
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
  Plus
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { TabbedBidInterface } from '@/components/bid-planner/TabbedBidInterface';
import { EnhancedBidDialog } from '@/components/bid-planner/EnhancedBidDialog';

export default function BidPlanner() {
  const [projects, setProjects] = useState<any[]>([]);
  const [bidItems, setBidItems] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);

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

  if (loading) {
    return (
      <Layout title="Bid Planner" subtitle="Create and manage construction bids">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
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
              <Select value={selectedProject} onValueChange={setSelectedProject}>
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
              
              {selectedProject && (
                <Button onClick={() => setCreateDialogOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Create New Bid
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {selectedProject ? (
          <TabbedBidInterface
            projectId={selectedProject}
            bidItems={bidItems}
            onItemsChange={setBidItems}
            onCreateNewBid={() => setCreateDialogOpen(true)}
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
