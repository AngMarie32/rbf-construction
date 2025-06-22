
import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Search, 
  Plus, 
  Package, 
  Users, 
  Mail,
  Calendar,
  FileText,
  Building,
  HelpCircle,
  Target,
  Send,
  Download
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CreateBidPackageDialog } from '@/components/bid-packages/CreateBidPackageDialog';
import { CreateBidInvitationDialog } from '@/components/bid-packages/CreateBidInvitationDialog';
import { BidInvitationsList } from '@/components/bid-packages/BidInvitationsList';

export default function BidPackages() {
  const [bidPackages, setBidPackages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    fetchBidPackages();
  }, [refreshTrigger]);

  const fetchBidPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('bid_packages')
        .select(`
          *,
          project:projects(name, client),
          bid_package_documents(count),
          bid_invitations(count)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBidPackages(data || []);
    } catch (error) {
      console.error('Error fetching bid packages:', error);
      toast.error('Failed to load bid packages');
    } finally {
      setLoading(false);
    }
  };

  const handlePackageCreated = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const handleInvitationCreated = () => {
    setRefreshTrigger(prev => prev + 1);
  };

  const filteredPackages = bidPackages.filter(pkg =>
    pkg.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pkg.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    pkg.project?.name?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Layout title="Bid Packages" subtitle="Manage bid packages and invitations">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Bid Packages" subtitle="Manage bid packages and invitations">
      <div className="space-y-8">
        {/* Quick Start Guide */}
        <Card className="border-blue-200 bg-blue-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-blue-800">
              <HelpCircle className="w-5 h-5" />
              Quick Start Guide - Bid Packages & Invitations
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid md:grid-cols-3 gap-4">
              <div className="bg-white p-4 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-4 h-4 text-blue-600" />
                  <h4 className="font-semibold text-blue-800">1. Create Package</h4>
                </div>
                <p className="text-sm text-blue-700">Start by creating a bid package with project details, scope, and documentation.</p>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="w-4 h-4 text-blue-600" />
                  <h4 className="font-semibold text-blue-800">2. Select Subcontractors</h4>
                </div>
                <p className="text-sm text-blue-700">Choose qualified subcontractors from your database to invite for bidding.</p>
              </div>
              
              <div className="bg-white p-4 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Send className="w-4 h-4 text-blue-600" />
                  <h4 className="font-semibold text-blue-800">3. Send Invitations</h4>
                </div>
                <p className="text-sm text-blue-700">Send professional bid invitations with all necessary documents and deadlines.</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="packages" className="w-full">
          <div className="flex justify-between items-center mb-6">
            <TabsList>
              <TabsTrigger value="packages">Bid Packages</TabsTrigger>
              <TabsTrigger value="invitations">Bid Invitations</TabsTrigger>
            </TabsList>
            
            <div className="flex gap-2">
              <CreateBidPackageDialog onPackageCreated={handlePackageCreated} />
              <CreateBidInvitationDialog onInvitationCreated={handleInvitationCreated} />
            </div>
          </div>

          <TabsContent value="packages">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <Package className="w-5 h-5" />
                    Bid Packages
                  </CardTitle>
                  <div className="relative max-w-md">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                    <Input
                      placeholder="Search packages..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredPackages.length > 0 ? (
                  <div className="space-y-4">
                    {filteredPackages.map((pkg) => (
                      <div key={pkg.id} className="border rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <h3 className="font-semibold text-lg">{pkg.name}</h3>
                            <p className="text-sm text-gray-600">{pkg.project?.name}</p>
                          </div>
                          <Badge variant="outline">{pkg.status}</Badge>
                        </div>
                        
                        {pkg.description && (
                          <p className="text-gray-700 mb-3">{pkg.description}</p>
                        )}
                        
                        <div className="flex justify-between items-center text-sm text-gray-500">
                          <div className="flex gap-4">
                            <span className="flex items-center gap-1">
                              <FileText className="w-4 h-4" />
                              {pkg.bid_package_documents?.[0]?.count || 0} documents
                            </span>
                            <span className="flex items-center gap-1">
                              <Mail className="w-4 h-4" />
                              {pkg.bid_invitations?.[0]?.count || 0} invitations
                            </span>
                          </div>
                          <span>
                            Due: {pkg.due_date ? new Date(pkg.due_date).toLocaleDateString() : 'No date set'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Bid Packages Found</h3>
                    <p className="text-gray-500 mb-6">
                      {searchTerm ? 'No packages match your search criteria.' : 'Create your first bid package to get started.'}
                    </p>
                    {!searchTerm && (
                      <CreateBidPackageDialog onPackageCreated={handlePackageCreated} />
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="invitations">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Mail className="w-5 h-5" />
                  Bid Invitations
                </CardTitle>
              </CardHeader>
              <CardContent>
                <BidInvitationsList refreshTrigger={refreshTrigger} />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
