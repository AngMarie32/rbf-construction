
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Package, Calendar, DollarSign, FileText, Mail, Users, Trash2, ArrowUpDown } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { CreateBidInvitationDialog } from '@/components/bid-packages/CreateBidInvitationDialog';
import { SubcontractorGroupsDialog } from '@/components/bid-packages/SubcontractorGroupsDialog';
import { BidInvitationsList } from '@/components/bid-packages/BidInvitationsList';
import { CreateBidPackageDialog } from '@/components/bid-packages/CreateBidPackageDialog';
import { Layout } from '@/components/layout/Layout';

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
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const { toast } = useToast();

  useEffect(() => {
    fetchBidPackages();
  }, [sortBy, sortOrder]);

  const fetchBidPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('bid_packages')
        .select(`
          *,
          project:projects(name)
        `)
        .order(sortBy === 'project' ? 'project(name)' : sortBy, { ascending: sortOrder === 'asc' });

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

  const handleDeletePackage = async (packageId: string) => {
    try {
      // First delete related bid invitations and their recipients
      const { data: invitations } = await supabase
        .from('bid_invitations')
        .select('id')
        .eq('bid_package_id', packageId);

      if (invitations && invitations.length > 0) {
        const invitationIds = invitations.map(inv => inv.id);
        
        // Delete invitation recipients
        await supabase
          .from('bid_invitation_recipients')
          .delete()
          .in('bid_invitation_id', invitationIds);

        // Delete invitation documents
        await supabase
          .from('bid_invitation_documents')
          .delete()
          .in('bid_invitation_id', invitationIds);

        // Delete invitations
        await supabase
          .from('bid_invitations')
          .delete()
          .eq('bid_package_id', packageId);
      }

      // Delete bid package items
      await supabase
        .from('bid_package_items')
        .delete()
        .eq('bid_package_id', packageId);

      // Finally delete the bid package
      const { error } = await supabase
        .from('bid_packages')
        .delete()
        .eq('id', packageId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Bid package deleted successfully",
      });

      fetchBidPackages();
    } catch (error) {
      console.error('Error deleting bid package:', error);
      toast({
        title: "Error",
        description: "Failed to delete bid package",
        variant: "destructive",
      });
    }
  };

  const handleInvitationCreated = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handlePackageCreated = () => {
    fetchBidPackages();
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

  const toggleSort = (field: string) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  };

  if (loading) {
    return (
      <Layout title="Bid Packages" subtitle="Manage bid packages and send invitations to subcontractors">
        <div className="flex items-center justify-center min-h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
            <p className="text-gray-600">Loading bid packages...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Bid Packages" subtitle="Manage bid packages and send invitations to subcontractors">
      <div className="space-y-6">
        <div className="flex justify-end gap-3">
          <SubcontractorGroupsDialog />
          <CreateBidInvitationDialog onInvitationCreated={handleInvitationCreated} />
        </div>

        <Tabs defaultValue="packages" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="packages" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Bid Packages
            </TabsTrigger>
            <TabsTrigger value="invitations" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Bid Invitations
            </TabsTrigger>
          </TabsList>

          <TabsContent value="packages" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">Active Bid Packages</h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <ArrowUpDown className="w-4 h-4 text-gray-500" />
                  <Select value={sortBy} onValueChange={(value) => setSortBy(value)}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Sort by" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="created_at">Date Created</SelectItem>
                      <SelectItem value="name">Package Name</SelectItem>
                      <SelectItem value="due_date">Due Date</SelectItem>
                      <SelectItem value="estimated_value">Value</SelectItem>
                      <SelectItem value="project">Project</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  >
                    {sortOrder === 'asc' ? '↑' : '↓'}
                  </Button>
                </div>
                <div className="text-sm text-gray-500">
                  {bidPackages.length} package{bidPackages.length !== 1 ? 's' : ''} found
                </div>
                <CreateBidPackageDialog onPackageCreated={handlePackageCreated} />
              </div>
            </div>

            {bidPackages.length === 0 ? (
              <Card className="border-dashed border-2 border-gray-200">
                <CardContent className="text-center py-12">
                  <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No bid packages found</h3>
                  <p className="text-gray-600 mb-6 max-w-md mx-auto">
                    Create your first bid package to get started. You can then send bid invitations to subcontractors.
                  </p>
                  <CreateBidPackageDialog onPackageCreated={handlePackageCreated} />
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-6">
                {bidPackages.map(pkg => (
                  <Card key={pkg.id} className="hover:shadow-lg transition-all duration-200 border-l-4 border-l-blue-500">
                    <CardHeader className="pb-4">
                      <div className="flex justify-between items-start">
                        <div className="space-y-1">
                          <CardTitle className="text-xl text-gray-900">{pkg.name}</CardTitle>
                          <p className="text-sm text-gray-600 font-medium">{pkg.project?.name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={`${getStatusColor(pkg.status)} font-medium`}>
                            {pkg.status}
                          </Badge>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700 hover:bg-red-50">
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Bid Package</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete "{pkg.name}"? This will also delete all related bid invitations and cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeletePackage(pkg.id)}
                                  className="bg-red-600 hover:bg-red-700"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {pkg.description && (
                        <p className="text-gray-700 bg-gray-50 p-3 rounded-md">{pkg.description}</p>
                      )}
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-center gap-3 p-3 bg-green-50 rounded-lg">
                          <DollarSign className="w-5 h-5 text-green-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Estimated Value</p>
                            <p className="text-lg font-semibold text-green-700">
                              ${pkg.estimated_value?.toLocaleString() || 'TBD'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-lg">
                          <Calendar className="w-5 h-5 text-blue-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Due Date</p>
                            <p className="text-lg font-semibold text-blue-700">
                              {pkg.due_date ? format(new Date(pkg.due_date), 'MMM d, yyyy') : 'No date set'}
                            </p>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-3 p-3 bg-purple-50 rounded-lg">
                          <FileText className="w-5 h-5 text-purple-600" />
                          <div>
                            <p className="text-sm font-medium text-gray-700">Created</p>
                            <p className="text-lg font-semibold text-purple-700">
                              {format(new Date(pkg.created_at), 'MMM d, yyyy')}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                        <div className="flex gap-2">
                          <Button size="sm" variant="outline" className="hover:bg-gray-50">
                            Edit Package
                          </Button>
                          <Button size="sm" variant="outline" className="hover:bg-gray-50">
                            View Items
                          </Button>
                        </div>
                        
                        <CreateBidInvitationDialog 
                          bidPackageId={pkg.id}
                          onInvitationCreated={handleInvitationCreated}
                        />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="invitations" className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-800">Bid Invitations</h2>
              <CreateBidInvitationDialog onInvitationCreated={handleInvitationCreated} />
            </div>
            
            <BidInvitationsList refreshTrigger={refreshTrigger} />
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
};

export default BidPackages;
