
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calculator, FileText, Download, Settings, BarChart3, Plus } from 'lucide-react';
import { BidTemplateSelector } from './BidTemplateSelector';
import { BidCreationView } from './BidCreationView';
import { BidOverview } from './BidOverview';
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

  const handleTemplateSelected = (template: any) => {
    setSelectedTemplate(template);
    setShowCreateView(true);
  };

  const handleCreateNew = () => {
    setSelectedTemplate(null);
    setShowCreateView(true);
  };

  const handleExportSOV = () => {
    // Navigate to SOV page or export SOV
    window.location.href = '/schedule-of-values';
  };

  const handleCreateProposal = () => {
    // Navigate to proposals page
    window.location.href = '/proposals';
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="overview" className="space-y-6">
        <div className="flex justify-between items-center">
          <TabsList className="grid grid-cols-4 w-full max-w-xl">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="templates" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Templates
            </TabsTrigger>
            <TabsTrigger value="create" className="flex items-center gap-2">
              <Calculator className="w-4 h-4" />
              Create Bid
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center gap-2">
              <Settings className="w-4 h-4" />
              Settings
            </TabsTrigger>
          </TabsList>

          <div className="flex gap-2">
            <Button onClick={handleExportSOV} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export to SOV
            </Button>
            <Button onClick={handleCreateProposal} variant="outline">
              <Plus className="w-4 h-4 mr-2" />
              Create Proposal
            </Button>
            <Button onClick={onExportReport} variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
          </div>
        </div>

        <TabsContent value="overview">
          <BidOverview 
            projectId={projectId}
            bidItems={bidItems}
            onExportReport={onExportReport}
          />
        </TabsContent>

        <TabsContent value="templates">
          <BidTemplateSelector
            onTemplateSelected={handleTemplateSelected}
            onCreateNew={handleCreateNew}
          />
        </TabsContent>

        <TabsContent value="create">
          <BidCreationView
            projectId={projectId}
            selectedTemplate={selectedTemplate}
            onItemsChange={onItemsChange}
            showCreateView={showCreateView}
            onShowCreateViewChange={setShowCreateView}
          />
        </TabsContent>

        <TabsContent value="settings">
          <BidSettings projectId={projectId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
