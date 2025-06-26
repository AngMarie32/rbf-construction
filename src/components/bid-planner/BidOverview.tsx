
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { BidReportDialog } from './BidReportDialog';

interface BidOverviewProps {
  projectId: string;
  onExportReport: () => void;
}

export function BidOverview({ projectId, onExportReport }: BidOverviewProps) {
  const [bidItems, setBidItems] = useState<any[]>([]);
  const [projectData, setProjectData] = useState<any>(null);
  const [reportDialogOpen, setReportDialogOpen] = useState(false);

  useEffect(() => {
    fetchBidItems();
    fetchProjectData();
  }, [projectId]);

  const fetchBidItems = async () => {
    try {
      const { data, error } = await supabase
        .from('bid_items')
        .select('*')
        .eq('project_id', projectId);

      if (error) throw error;
      setBidItems(data || []);
    } catch (error) {
      console.error('Error fetching bid items:', error);
    }
  };

  const fetchProjectData = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      setProjectData(data);
    } catch (error) {
      console.error('Error fetching project data:', error);
    }
  };

  const totalBidValue = bidItems.reduce((sum, item) => sum + (item.total || 0), 0);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Bid Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{bidItems.length}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Total Bid Value</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">${totalBidValue.toLocaleString()}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Set(bidItems.map(item => item.category)).size}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Bid Items</CardTitle>
        </CardHeader>
        <CardContent>
          {bidItems.length > 0 ? (
            <div className="space-y-4">
              {bidItems.slice(0, 5).map((item) => (
                <div key={item.id} className="flex justify-between items-center border-b pb-2">
                  <div>
                    <div className="font-medium">{item.description}</div>
                    <div className="text-sm text-gray-600">{item.category} - {item.subcategory}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">${item.total?.toLocaleString()}</div>
                    <div className="text-sm text-gray-600">{item.quantity} {item.unit}</div>
                  </div>
                </div>
              ))}
              {bidItems.length > 5 && (
                <div className="text-sm text-gray-600 text-center">
                  And {bidItems.length - 5} more items...
                </div>
              )}
              <div className="pt-4 border-t">
                <Button onClick={() => setReportDialogOpen(true)} className="w-full">
                  <Download className="w-4 h-4 mr-2" />
                  Generate Detailed Report
                </Button>
              </div>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
              <p>No bid items found for this project.</p>
              <p className="text-sm">Create your first bid to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>

      <BidReportDialog
        open={reportDialogOpen}
        onOpenChange={setReportDialogOpen}
        projectData={projectData}
        bidItems={bidItems}
      />
    </div>
  );
}
