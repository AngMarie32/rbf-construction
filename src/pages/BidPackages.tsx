
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Plus, Calendar, DollarSign, FileText, Mail, Users } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CreateBidInvitationDialog } from '@/components/bid-packages/CreateBidInvitationDialog';
import { SubcontractorGroupsDialog } from '@/components/bid-packages/SubcontractorGroupsDialog';
import { BidInvitationsList } from '@/components/bid-packages/BidInvitationsList';

interface BidPackage {
  id: string;
  name: string;
  description: string;
  estimated_value: number;
  due_date: string;
  status: string;
  created_at: string;
  project: {
    name: string;
  };
}

const BidPackages = () => {
  const [bidPackages, setBidPackages] = useState<BidPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const { toast } = useToast();

  useEffect(() => {
    fetchBidPackages();
  }, []);

  const fetchBidPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('bid_packages')
        .select(`
          *,
          project:projects(name)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBidPackages(data || []);
    } catch (error) {
      console.error('Error fetching bid packages:', error);
      toast({
        title: "Error",
        description: "Failed to load bid packages",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleInvitationCreated = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'bg-gray-100 text-gray-800';
      case 'Active': return 'bg-blue-100 text-blue-800';
      case 'Closed': return 'bg-green-100 text-green-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return <div className="text-center py-8">Loading bid packages...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Bid Packages</h1>
          <p className="text-gray-600 mt-1">Manage bid packages and invitations</p>
        </div>
        <div className="flex gap-2">
          <SubcontractorGroupsDialog />
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Bid Package
          </Button>
        </div>
      </div>

      <Tabs defaultValue="packages" className="space-y-6">
        <TabsList>
          <TabsTrigger value="packages">
            <Package className="w-4 h-4 mr-2" />
            Bid Packages
          </TabsTrigger>
          <TabsTrigger value="invitations">
            <Mail className="w-4 h-4 mr-2" />
            Bid Invitations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="packages" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Active Bid Packages</h2>
            <CreateBidInvitationDialog onInvitationCreated={handleInvitationCreated} />
          </div>

          {bidPackages.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">No bid packages found</h3>
                <p className="text-gray-600 mb-4">Create your first bid package to get started</p>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Create Bid Package
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4">
              {bidPackages.map(pkg => (
                <Card key={pkg.id} className="hover:shadow-md transition-shadow">
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-lg">{pkg.name}</CardTitle>
                        <p className="text-sm text-gray-600 mt-1">{pkg.project?.name}</p>
                      </div>
                      <Badge className={getStatusColor(pkg.status)}>
                        {pkg.status}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      {pkg.description && (
                        <p className="text-sm text-gray-700">{pkg.description}</p>
                      )}
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-4 h-4 text-gray-400" />
                          <span>
                            Est. Value: ${pkg.estimated_value?.toLocaleString() || 'TBD'}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4 text-gray-400" />
                          <span>
                            Due: {pkg.due_date ? format(new Date(pkg.due_date), 'MMM d, yyyy') : 'No date'}
                          </span>
                        </div>
                        
                        <div className="flex items-center gap-2">
                          <FileText className="w-4 h-4 text-gray-400" />
                          <span>Created {format(new Date(pkg.created_at), 'MMM d, yyyy')}</span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline">
                            Edit Package
                          </Button>
                          <Button size="sm" variant="outline">
                            View Items
                          </Button>
                        </div>
                        
                        <CreateBidInvitationDialog 
                          bidPackageId={pkg.id}
                          onInvitationCreated={handleInvitationCreated}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="invitations" className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Bid Invitations</h2>
            <CreateBidInvitationDialog onInvitationCreated={handleInvitationCreated} />
          </div>
          
          <BidInvitationsList refreshTrigger={refreshTrigger} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default BidPackages;
