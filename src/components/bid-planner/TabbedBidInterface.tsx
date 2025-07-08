
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calculator, FileText, Settings } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BidTemplateSelector } from './BidTemplateSelector';
import { BidCreationView } from './BidCreationView';
import { BidSettings } from './BidSettings';

interface TabbedBidInterfaceProps {
  projectId: string;
  bidItems: any[];
  onItemsChange: (items: any[]) => void;
  onExportReport: () => void;
}

export function TabbedBidInterface({ 
  projectId, 
  bidItems, 
  onItemsChange, 
  onExportReport 
}: TabbedBidInterfaceProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<any>(null);
  const [showCreateView, setShowCreateView] = useState(false);
  const navigate = useNavigate();

  const handleTemplateSelected = (template: any) => {
    setSelectedTemplate(template);
    setShowCreateView(true);
  };

  const handleCreateNew = () => {
    setSelectedTemplate(null);
    setShowCreateView(true);
  };

  const handleExportSOV = async () => {
    try {
      console.log('Exporting bid items to SOV for project:', projectId);
      console.log('Bid items to export:', bidItems);

      if (!bidItems || bidItems.length === 0) {
        toast.error('No bid items to export to Schedule of Values');
        return;
      }

      // Get project details first
      const { data: project, error: projectError } = await supabase
        .from('projects')
        .select('name')
        .eq('id', projectId)
        .single();

      if (projectError) {
        console.error('Error fetching project:', projectError);
        throw new Error('Failed to fetch project details');
      }

      // Convert bid items to SOV format and insert them
      const sovItems = bidItems.map((item, index) => ({
        project_id: projectId,
        item_number: String(index + 1).padStart(3, '0'),
        category: item.category || 'General',
        description: item.description || 'Imported from Bid',
        scheduled_value: (item.unit_cost || 0) * (item.quantity || 1),
        previous_applications: 0,
        this_period: 0,
        materials_stored: 0,
        percent_complete: 0,
        work_completed_from_previous: 0,
        materials_presently_stored: 0,
        retainage_percentage: 10,
        change_orders: 0
      }));

      console.log('Converting to SOV items:', sovItems);

      const { data: insertedItems, error: insertError } = await supabase
        .from('sov_items')
        .insert(sovItems)
        .select();

      if (insertError) {
        console.error('Error inserting SOV items:', insertError);
        throw new Error(`Failed to create SOV items: ${insertError.message}`);
      }

      console.log('SOV items created successfully:', insertedItems);
      
      toast.success(`Successfully exported ${sovItems.length} bid items to Schedule of Values for ${project.name}`);
      
      // Navigate to SOV page
      navigate('/schedule-of-values');
    } catch (error) {
      console.error('Error exporting to SOV:', error);
      toast.error(`Failed to export to SOV: ${error.message || 'Unknown error'}`);
    }
  };

  const handleCreateProposal = () => {
    navigate('/proposals');
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="create" className="space-y-6">
        <div className="flex justify-between items-center">
          <TabsList className="grid grid-cols-3 w-full max-w-xl">
            <TabsTrigger value="create" className="flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              Create Bid
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="create">
          <BidCreationView
            projectId={projectId}
            selectedTemplate={selectedTemplate}
            onItemsChange={onItemsChange}
            showCreateView={showCreateView}
            onShowCreateViewChange={setShowCreateView}
          />
        </TabsContent>

        <TabsContent value="templates">
          <BidTemplateSelector
            onTemplateSelected={handleTemplateSelected}
            onCreateNew={handleCreateNew}
          />
        </TabsContent>

        <TabsContent value="settings">
          <BidSettings projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
