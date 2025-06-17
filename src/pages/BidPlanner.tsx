
import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { ProjectSelector } from '@/components/layout/ProjectSelector';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Calculator, FileText, Download, Upload } from 'lucide-react';
import { BidCreationView } from '@/components/bid-planner/BidCreationView';
import { BidOverview } from '@/components/bid-planner/BidOverview';
import { BidAnalysis } from '@/components/bid-planner/BidAnalysis';
import { TemplateLibrary } from '@/components/bid-planner/TemplateLibrary';
import { CreateBidDialog } from '@/components/bid-planner/CreateBidDialog';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Project {
  id: string;
  name: string;
  status: string;
}

interface CompanySettings {
  profit_margin: number;
  overhead_percentage: number;
  default_tax_rate: number;
  default_retainage_rate: number;
}

export default function BidPlanner() {
  const [selectedProject, setSelectedProject] = useState('');
  const [activeTab, setActiveTab] = useState('overview');
  const [showCreateBid, setShowCreateBid] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [companySettings, setCompanySettings] = useState<CompanySettings>({
    profit_margin: 0,
    overhead_percentage: 0,
    default_tax_rate: 0,
    default_retainage_rate: 10
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProjects();
    fetchCompanySettings();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, status')
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

  const fetchCompanySettings = async () => {
    try {
      const { data, error } = await supabase
        .from('company_settings')
        .select('profit_margin, overhead_percentage, default_tax_rate, default_retainage_rate')
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching company settings:', error);
        // Continue with default settings if fetch fails
        return;
      }
      
      if (data) {
        setCompanySettings({
          profit_margin: data.profit_margin || 0,
          overhead_percentage: data.overhead_percentage || 0,
          default_tax_rate: data.default_tax_rate || 0,
          default_retainage_rate: data.default_retainage_rate || 10
        });
      }
    } catch (error) {
      console.error('Error fetching company settings:', error);
      // Continue with default settings
    }
  };

  if (!selectedProject) {
    return (
      <Layout title="Bid Planner" subtitle="Create and manage project bids">
        <ProjectSelector
          selectedProject={selectedProject}
          onProjectSelect={setSelectedProject}
          title="Select Project for Bid Planning"
          subtitle="Choose a project to create or manage bids"
        />
      </Layout>
    );
  }

  const selectedProjectData = projects.find(p => p.id === selectedProject);

  return (
    <Layout title="Bid Planner" subtitle={`Bid Planning - ${selectedProjectData?.name || 'Unknown Project'}`}>
      <div className="space-y-6">
        {/* Project Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">Bid Planning</h1>
            <p className="text-gray-600">Project: {selectedProjectData?.name}</p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={() => setSelectedProject('')}>
              Change Project
            </Button>
            <Button onClick={() => setShowCreateBid(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create New Bid
            </Button>
          </div>
        </div>

        {/* Company Settings Summary */}
        <Card>
          <CardContent className="p-4">
            <div className="grid grid-cols-4 gap-4 text-center">
              <div>
                <p className="text-sm text-gray-600">Profit Margin</p>
                <p className="text-lg font-semibold">{companySettings.profit_margin}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Overhead</p>
                <p className="text-lg font-semibold">{companySettings.overhead_percentage}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Tax Rate</p>
                <p className="text-lg font-semibold">{companySettings.default_tax_rate}%</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Retainage</p>
                <p className="text-lg font-semibold">{companySettings.default_retainage_rate}%</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Main Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">
              <FileText className="w-4 h-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="create">
              <Plus className="w-4 h-4 mr-2" />
              Create Bid
            </TabsTrigger>
            <TabsTrigger value="analysis">
              <Calculator className="w-4 h-4 mr-2" />
              Analysis
            </TabsTrigger>
            <TabsTrigger value="templates">
              <Upload className="w-4 h-4 mr-2" />
              Templates
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="mt-6">
            <BidOverview 
              projectId={selectedProject} 
              companySettings={companySettings}
            />
          </TabsContent>

          <TabsContent value="create" className="mt-6">
            <BidCreationView 
              projectId={selectedProject}
              companySettings={companySettings}
            />
          </TabsContent>

          <TabsContent value="analysis" className="mt-6">
            <BidAnalysis 
              projectId={selectedProject}
              companySettings={companySettings}
            />
          </TabsContent>

          <TabsContent value="templates" className="mt-6">
            <TemplateLibrary 
              open={true}
              onOpenChange={() => {}}
              onTemplateSelected={() => {}}
            />
          </TabsContent>
        </Tabs>
      </div>

      <CreateBidDialog
        open={showCreateBid}
        onOpenChange={setShowCreateBid}
        projectId={selectedProject}
        companySettings={companySettings}
      />
    </Layout>
  );
}
