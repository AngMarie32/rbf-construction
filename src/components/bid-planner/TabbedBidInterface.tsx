
import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BidItemForm } from './BidItemForm';
import { BidSettings } from './BidSettings';
import { TemplateLibrary } from './TemplateLibrary';
import { Button } from '@/components/ui/button';
import { Download, Library } from 'lucide-react';

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
  const [showTemplateLibrary, setShowTemplateLibrary] = useState(false);
  const [bidSettings, setBidSettings] = useState({
    contingencyType: 'percentage' as 'percentage' | 'dollar',
    contingencyValue: 0,
    profitMargin: 0,
    overhead: 0,
    bondingCost: 0
  });

  const handleTemplateSelected = async (templateId: string) => {
    // Implementation for applying template to bid items
    console.log('Template selected:', templateId);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Bid Planning</h2>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowTemplateLibrary(true)}
          >
            <Library className="w-4 h-4 mr-2" />
            Template Library
          </Button>
          <Button onClick={onExportReport}>
            <Download className="w-4 h-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      <Tabs defaultValue="items" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="items">Bid Items</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>
        
        <TabsContent value="items" className="space-y-6">
          <BidItemForm 
            items={bidItems} 
            onItemsChange={onItemsChange} 
          />
        </TabsContent>
        
        <TabsContent value="settings" className="space-y-6">
          <BidSettings 
            projectId={projectId}
            onSettingsChange={setBidSettings}
          />
        </TabsContent>
      </Tabs>

      <TemplateLibrary
        open={showTemplateLibrary}
        onOpenChange={setShowTemplateLibrary}
        onTemplateSelected={handleTemplateSelected}
      />
    </div>
  );
}
