
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
  AlertCircle,
  TrendingUp,
  Target,
  Mail
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { CreateBidPackageDialog } from '@/components/bid-packages/CreateBidPackageDialog';
import { CreateBidInvitationDialog } from '@/components/bid-packages/CreateBidInvitationDialog';
import { BidInvitationsList } from '@/components/bid-packages/BidInvitationsList';
import { format } from 'date-fns';

interface BidPackage {
  id: string;
  name: string;
  description: string;
  status: 'Draft' | 'Published' | 'Closed';
  created_at: string;
  project_id: string;
  due_date?: string;
  estimated_value?: number;
}

interface BidInvitation {
  id: string;
  bid_package_id: string;
  title: string;
  message?: string;
  due_date: string;
  status: 'Draft' | 'Sent' | 'Viewed' | 'Submitted' | 'Declined';
  created_at: string;
  sent_at?: string;
}

interface Subcontractor {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  address: string;
  specialties: string[];
  status: string;
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
  const [refreshTrigger, setRefreshTrigger] = useState(0);

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
      
      const mappedData = (data || []).map(item => ({
        id: item.id,
        name: item.name,
        description: item.description || '',
        status: item.status as 'Draft' | 'Published' | 'Closed',
        created_at: item.created_at,
        project_id: item.project_id,
        due_date: item.due_date,
        estimated_value: item.estimated_value
      }));
      
      setBidPackages(mappedData);
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
      
      const mappedData = (data || []).map(item => ({
        id: item.id,
        bid_package_id: item.bid_package_id,
        title: item.title,
        message: item.message,
        due_date: item.due_date,
        status: item.status as 'Draft' | 'Sent' | 'Viewed' | 'Submitted' | 'Declined',
        created_at: item.created_at,
        sent_at: item.sent_at
      }));
      
      setBidInvitations(mappedData);
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
      
      const mappedData = (data || []).map(item => ({
        id: item.id,
        name: item.name,
        company: item.company || '',
        email: item.email || '',
        phone: item.phone || '',
        address: item.address || '',
        specialties: item.specialties || [],
        status: item.status || 'Active'
      }));
      
      setSubcontractors(mappedData);
    } catch (error) {
      console.error('Error fetching subcontractors:', error);
      toast.error('Failed to load subcontractors');
    }
  };

  const filteredBidPackages = bidPackages.filter(pkg => {
    const matchesSearch = pkg.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                           pkg.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'All' || pkg.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handlePackageCreated = () => {
    fetchBidPackages();
    setCreatePackageOpen(false);
    setRefreshTrigger(prev => prev + 1);
    toast.success('Bid package created successfully');
  };

  const handleInvitationSent = () => {
    fetchBidInvitations();
    setCreateInvitationOpen(false);
    setRefreshTrigger(prev => prev + 1);
    toast.success('Bid invitation sent successfully');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'Published': return 'bg-green-100 text-green-800 border-green-200';
      case 'Closed': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Draft': return <Clock className="w-4 h-4" />;
      case 'Published': return <CheckCircle className="w-4 h-4" />;
      case 'Closed': return <AlertCircle className="w-4 h-4" />;
      default: return <Clock className="w-4 h-4" />;
    }
  };

  // Calculate stats
  const stats = {
    packages: {
      total: bidPackages.length,
      draft: bidPackages.filter(p => p.status === 'Draft').length,
      published: bidPackages.filter(p => p.status === 'Published').length,
      closed: bidPackages.filter(p => p.status === 'Closed').length,
    },
    invitations: {
      total: bidInvitations.length,
      sent: bidInvitations.filter(i => i.status === 'Sent').length,
      draft: bidInvitations.filter(i => i.status === 'Draft').length,
    }
  };

  return (
    <Layout title="Bid Packages" subtitle="Manage bid packages and subcontractor invitations">
      <div className="space-y-6">
        {/* Enhanced Header with Stats */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl p-6 border border-blue-200">
          <div className="flex flex-col gap-6">
            <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 mb-2">Bid Management Center</h1>
                <p className="text-gray-600 text-lg">Create packages, send invitations, and track responses</p>
              </div>
              
              <div className="flex flex-wrap gap-2">
                <Button 
                  onClick={() => setCreatePackageOpen(true)} 
                  className="bg-blue-600 hover:bg-blue-700"
                  size="lg"
                >
                  <Package className="w-4 h-4 mr-2" />
                  New Package
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => setCreateInvitationOpen(true)}
                  size="lg"
                >
                  <Mail className="w-4 h-4 mr-2" />
                  Send Invitation
                </Button>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-100 rounded-lg">
                      <Package className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{stats.packages.total}</div>
                      <div className="text-sm text-gray-600">Total Packages</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-green-100 rounded-lg">
                      <TrendingUp className="w-5 h-5 text-green-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{stats.packages.published}</div>
                      <div className="text-sm text-gray-600">Active Packages</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-100 rounded-lg">
                      <Mail className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{stats.invitations.sent}</div>
                      <div className="text-sm text-gray-600">Sent Invitations</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card className="bg-white/80 backdrop-blur-sm border-white/20">
                <CardContent className="p-4">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-orange-100 rounded-lg">
                      <Users className="w-5 h-5 text-orange-600" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold text-gray-900">{subcontractors.length}</div>
                      <div className="text-sm text-gray-600">Subcontractors</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Quick Start Guide */}
            <Card className="bg-white/90 backdrop-blur-sm border-blue-200">
              <CardContent className="p-4">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-blue-600 mt-1 flex-shrink-0" />
                  <div>
                    <h3 className="text-lg font-semibold text-blue-900 mb-3">Quick Start Guide</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">1</div>
                          <h4 className="font-medium text-blue-800">Create Package</h4>
                        </div>
                        <p className="text-sm text-blue-700 ml-8">Define scope, timeline, and requirements</p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">2</div>
                          <h4 className="font-medium text-blue-800">Send Invitations</h4>
                        </div>
                        <p className="text-sm text-blue-700 ml-8">Invite qualified subcontractors to bid</p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center text-xs font-medium text-blue-600">3</div>
                          <h4 className="font-medium text-blue-800">Track & Compare</h4>
                        </div>
                        <p className="text-sm text-blue-700 ml-8">Monitor responses and select winners</p>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Enhanced Filters */}
        <Card>
          <CardContent className="p-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4 flex-1">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    type="text"
                    placeholder="Search packages..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Filter className="w-4 h-4 text-gray-500" />
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="border rounded-lg px-3 py-2 bg-white"
                  >
                    <option value="All">All Statuses</option>
                    <option value="Draft">Draft</option>
                    <option value="Published">Published</option>
                    <option value="Closed">Closed</option>
                  </select>
                </div>
              </div>

              <div className="text-sm text-gray-600">
                Showing {activeTab === 'packages' ? filteredBidPackages.length : stats.invitations.total} results
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Enhanced Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2 h-12">
            <TabsTrigger value="packages" className="flex items-center gap-2">
              <Package className="w-4 h-4" />
              Bid Packages ({stats.packages.total})
            </TabsTrigger>
            <TabsTrigger value="invitations" className="flex items-center gap-2">
              <Mail className="w-4 h-4" />
              Invitations ({stats.invitations.total})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="packages" className="mt-6">
            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader>
                      <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                      <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="h-3 bg-gray-200 rounded"></div>
                        <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredBidPackages.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredBidPackages.map(pkg => (
                  <Card key={pkg.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <CardTitle className="text-lg leading-tight">{pkg.name}</CardTitle>
                        <Badge className={`${getStatusColor(pkg.status)} border flex items-center gap-1`}>
                          {getStatusIcon(pkg.status)}
                          {pkg.status}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <p className="text-sm text-gray-600 line-clamp-2">{pkg.description}</p>
                        
                        <div className="grid grid-cols-2 gap-3 text-xs">
                          {pkg.due_date && (
                            <div className="flex items-center gap-1">
                              <Calendar className="w-3 h-3 text-gray-400" />
                              <span>{format(new Date(pkg.due_date), 'MMM d')}</span>
                            </div>
                          )}
                          {pkg.estimated_value && (
                            <div className="flex items-center gap-1">
                              <DollarSign className="w-3 h-3 text-gray-400" />
                              <span>${pkg.estimated_value.toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="pt-2 border-t text-xs text-gray-500">
                          Created {format(new Date(pkg.created_at), 'MMM dd, yyyy')}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="text-center py-12">
                  <Package className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">No bid packages found</h3>
                  <p className="text-gray-600 mb-4">Create your first bid package to get started</p>
                  <Button onClick={() => setCreatePackageOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create Package
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="invitations" className="mt-6">
            <BidInvitationsList refreshTrigger={refreshTrigger} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Dialogs */}
      <CreateBidPackageDialog
        onPackageCreated={handlePackageCreated}
      />

      <CreateBidInvitationDialog
        onInvitationCreated={handleInvitationSent}
      />
    </Layout>
  );
}
