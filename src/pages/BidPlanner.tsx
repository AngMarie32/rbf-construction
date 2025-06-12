
import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { 
  Search, 
  Plus, 
  Calculator, 
  FileText, 
  TrendingUp, 
  Target,
  Building2,
  DollarSign,
  BarChart3,
  Layers
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BidCreationView } from '@/components/bid-planner/BidCreationView';
import { BidOverview } from '@/components/bid-planner/BidOverview';
import { TemplateLibrary } from '@/components/bid-planner/TemplateLibrary';
import { CreateBidDialog } from '@/components/bid-planner/CreateBidDialog';

export default function BidPlanner() {
  const [projects, setProjects] = useState<any[]>([]);
  const [bidItems, setBidItems] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [templateLibraryOpen, setTemplateLibraryOpen] = useState(false);
  const [activeView, setActiveView] = useState<'overview' | 'create' | 'templates'>('overview');

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

  const handleTemplateSelected = (templateId: string) => {
    toast.success('Template selected');
    // Handle template selection logic here
  };

  const totalBidValue = bidItems.reduce((sum, item) => sum + (item.total || 0), 0);
  const itemCount = bidItems.length;
  const categories = [...new Set(bidItems.map(item => item.category))].length;
  const selectedProjectData = projects.find(p => p.id === selectedProject);

  if (loading) {
    return (
      <Layout title="Bid Planner" subtitle="Create and manage construction bids">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (selectedProject && activeView !== 'overview') {
    switch (activeView) {
      case 'create':
        return (
          <Layout title="Bid Planner" subtitle="Create detailed construction bids">
            <BidCreationView 
              projectId={selectedProject} 
              onBack={() => setActiveView('overview')}
              onBidCreated={fetchBidItems}
            />
          </Layout>
        );
      case 'templates':
        return (
          <Layout title="Bid Templates" subtitle="Manage bid templates and presets">
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Button variant="outline" onClick={() => setActiveView('overview')}>
                  Back to Bid Planner
                </Button>
                <h1 className="text-2xl font-bold">Template Library</h1>
              </div>
              <TemplateLibrary 
                open={true}
                onOpenChange={(open) => !open && setActiveView('overview')}
                onTemplateSelected={handleTemplateSelected}
              />
            </div>
          </Layout>
        );
    }
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
          </CardContent>
        </Card>

        {selectedProject && (
          <>
            {/* Summary Dashboard */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-blue-700">Total Bid Value</CardTitle>
                  <DollarSign className="h-5 w-5 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-800">${totalBidValue.toLocaleString()}</div>
                  <p className="text-xs text-blue-600 mt-1">Estimated project cost</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-green-700">Bid Items</CardTitle>
                  <BarChart3 className="h-5 w-5 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-800">{itemCount}</div>
                  <p className="text-xs text-green-600 mt-1">Line items defined</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-orange-700">Categories</CardTitle>
                  <Layers className="h-5 w-5 text-orange-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-800">{categories}</div>
                  <p className="text-xs text-orange-600 mt-1">Work categories</p>
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium text-purple-700">Average Item</CardTitle>
                  <Calculator className="h-5 w-5 text-purple-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-purple-800">
                    ${itemCount > 0 ? (totalBidValue / itemCount).toLocaleString(undefined, { maximumFractionDigits: 0 }) : '0'}
                  </div>
                  <p className="text-xs text-purple-600 mt-1">Per line item</p>
                </CardContent>
              </Card>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveView('create')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <Plus className="w-6 h-6 text-primary" />
                    Create New Bid
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Start building a detailed bid with line items, quantities, and pricing.
                  </p>
                  <Button className="w-full" onClick={() => setActiveView('create')}>
                    Start Building
                  </Button>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-shadow" onClick={() => setActiveView('templates')}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <FileText className="w-6 h-6 text-accent" />
                    Template Library
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Browse and use pre-built templates to speed up your bid creation process.
                  </p>
                  <Button variant="outline" className="w-full" onClick={() => setActiveView('templates')}>
                    Browse Templates
                  </Button>
                </CardContent>
              </Card>

              <Card className="cursor-pointer hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg">
                    <TrendingUp className="w-6 h-6 text-success" />
                    Bid Analysis
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-600 mb-4">
                    Analyze your bid components, compare costs, and optimize pricing strategies.
                  </p>
                  <Button variant="outline" className="w-full" disabled>
                    Coming Soon
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Current Bid Overview */}
            {itemCount > 0 && (
              <BidOverview 
                totalEstimate={totalBidValue}
                itemCount={itemCount}
                categoryCount={categories}
                projectName={selectedProjectData?.name}
              />
            )}
          </>
        )}

        {!selectedProject && (
          <Card className="border-2 border-dashed border-gray-200">
            <CardContent className="text-center py-16">
              <Calculator className="w-20 h-20 text-gray-300 mx-auto mb-6" />
              <h3 className="text-xl font-semibold text-gray-900 mb-3">Professional Bid Planning</h3>
              <p className="text-gray-500 mb-8 max-w-md mx-auto">
                Select a project above to start creating detailed construction bids with accurate cost estimates and professional formatting.
              </p>
              {projects.length === 0 && (
                <div className="mt-6">
                  <p className="text-gray-400 mb-4">No projects found. Create a project first to start bid planning.</p>
                  <Button onClick={() => window.location.href = '/projects'} variant="outline">
                    Go to Projects
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        )}

        <CreateBidDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          projectId={selectedProject}
          onBidCreated={fetchBidItems}
        />
      </div>
    </Layout>
  );
}
