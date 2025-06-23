import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plus, 
  Search, 
  Filter, 
  Package, 
  Users, 
  Calendar,
  DollarSign,
  FileText,
  Info,
  CheckCircle,
  Clock,
  AlertCircle
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CreateBidPackageDialog } from '@/components/bid-packages/CreateBidPackageDialog';
import { CreateBidInvitationDialog } from '@/components/bid-packages/CreateBidInvitationDialog';
import { BidInvitationsList } from '@/components/bid-packages/BidInvitationsList';
import { format } from 'date-fns';

interface BidPackage {
  id: string;
  title: string;
  description: string;
  status: 'Draft' | 'Published' | 'Closed';
  created_at: string;
  project_id: string;
}

interface BidInvitation {
  id: string;
  bid_package_id: string;
  subcontractor_id: string;
  due_date: string;
  status: 'Sent' | 'Viewed' | 'Submitted' | 'Declined';
  created_at: string;
}

interface Subcontractor {
  id: string;
  name: string;
  contact_person: string;
  email: string;
  phone: string;
  trade: string;
}

export default function BidPackages() {
  const [bidPackages, setBidPackages] = useState<BidPackage[]>([]);
  const [bidInvitations, setBidInvitations] = useState<BidInvitation[]>([]);
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [activeTab, setActiveTab] = useState('packages');
  const [createPackageOpen, setCreatePackageOpen] = useState(false);
  const [createInvitationOpen, setCreateInvitationOpen] = useState(false);
  const [selectedPackage, setSelectedPackage] = useState<BidPackage | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBidPackages();
    fetchBidInvitations();
    fetchSubcontractors();
  }, []);

  const fetchBidPackages = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bid_packages')
        .select('*')
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

  const fetchBidInvitations = async () => {
    try {
      const { data, error } = await supabase
        .from('bid_invitations')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setBidInvitations(data || []);
    } catch (error) {
      console.error('Error fetching bid invitations:', error);
      toast.error('Failed to load bid invitations');
    }
  };

  const fetchSubcontractors = async () => {
    try {
      const { data, error } = await supabase
        .from('subcontractors')
        .select('*')
        .order('name');

      if (error) throw error;
      setSubcontractors(data || []);
    } catch (error) {
      console.error('Error fetching subcontractors:', error);
      toast.error('Failed to load subcontractors');
    }
  };

  const filteredBidPackages = bidPackages.filter(pkg => {
    const matchesSearch = pkg.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           pkg.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || pkg.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handlePackageCreated = (newPackage: BidPackage) => {
    setBidPackages(prev => [newPackage, ...prev]);
    setCreatePackageOpen(false);
    toast.success('Bid package created successfully');
  };

  const handleInvitationSent = (newInvitation: BidInvitation) => {
    setBidInvitations(prev => [newInvitation, ...prev]);
    setCreateInvitationOpen(false);
    toast.success('Bid invitation sent successfully');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'bg-gray-400';
      case 'Published': return 'bg-green-500';
      case 'Closed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  return (
    <Layout title="Bid Packages" subtitle="Manage bid packages and subcontractor invitations">
      <div className="space-y-6">
        {/* Enhanced Header with Quick Guide */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-200">
          <div className="flex flex-col gap-4">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 mb-2">Bid Packages & Invitations</h1>
                <p className="text-gray-600">Create bid packages and send invitations to subcontractors</p>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Button onClick={() => setCreatePackageOpen(true)} className="bg-blue-600 hover:bg-blue-700">
                  <Package className="w-4 h-4 mr-2" />
                  New Bid Package
                </Button>
                <Button variant="outline" onClick={() => setCreateInvitationOpen(true)}>
                  <Users className="w-4 h-4 mr-2" />
                  Send Invitation
                </Button>
              </div>
            </div>

            {/* Quick Start Guide */}
            <div className="bg-white rounded-lg border border-blue-200 p-4">
              <div className="flex items-start gap-3">
                <Info className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                <div>
                  <h3 className="text-lg font-semibold text-blue-900 mb-3">Quick Start Guide</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">1</div>
                        <h4 className="font-medium text-blue-800">Create Bid Package</h4>
                      </div>
                      <p className="text-sm text-blue-700 ml-8">Define scope, timeline, and requirements for your project work package</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">2</div>
                        <h4 className="font-medium text-blue-800">Send Invitations</h4>
                      </div>
                      <p className="text-sm text-blue-700 ml-8">Invite qualified subcontractors to submit bids on your packages</p>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">3</div>
                        <h4 className="font-medium text-blue-800">Track Responses</h4>
                      </div>
                      <p className="text-sm text-blue-700 ml-8">Monitor bid submissions and compare proposals from subcontractors</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Input
              type="text"
              placeholder="Search bid packages..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="md:w-80"
            />
            <Search className="w-4 h-4 text-gray-500" />
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-500" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border rounded px-3 py-2"
            >
              <option value="All">All Statuses</option>
              <option value="Draft">Draft</option>
              <option value="Published">Published</option>
              <option value="Closed">Closed</option>
            </select>
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="packages">Bid Packages</TabsTrigger>
            <TabsTrigger value="invitations">Bid Invitations</TabsTrigger>
          </TabsList>
          <TabsContent value="packages" className="mt-6">
            {loading ? (
              <div className="text-center py-8">Loading bid packages...</div>
            ) : filteredBidPackages.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBidPackages.map(pkg => (
                  <Card key={pkg.id} className="bg-white shadow-md rounded-lg overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <CardTitle className="text-sm font-medium">{pkg.title}</CardTitle>
                      <Badge className={`${getStatusColor(pkg.status)} text-white`}>
                        {pkg.status}
                      </Badge>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600">{pkg.description}</p>
                      <div className="text-xs text-gray-500 mt-2">
                        Created: {format(new Date(pkg.created_at), 'MMM dd, yyyy')}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">No bid packages found.</div>
            )}
          </TabsContent>

          <TabsContent value="invitations" className="mt-6">
            <BidInvitationsList invitations={bidInvitations} subcontractors={subcontractors} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Create Bid Package Dialog */}
      <CreateBidPackageDialog
        open={createPackageOpen}
        onOpenChange={setCreatePackageOpen}
        onPackageCreated={handlePackageCreated}
      />

      {/* Create Bid Invitation Dialog */}
      <CreateBidInvitationDialog
        open={createInvitationOpen}
        onOpenChange={setCreateInvitationOpen}
        bidPackages={bidPackages}
        subcontractors={subcontractors}
        onInvitationSent={handleInvitationSent}
      />
    </Layout>
  );
}
