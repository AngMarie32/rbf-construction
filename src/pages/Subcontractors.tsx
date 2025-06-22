
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
  Edit, 
  Trash2, 
  Users, 
  Phone, 
  Mail, 
  MapPin,
  FileText,
  AlertCircle,
  Grid3X3,
  List,
  Building
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BulkSubcontractorDialog } from '@/components/subcontractors/BulkSubcontractorDialog';
import { DocumentIssues } from '@/components/subcontractors/DocumentIssues';

export default function Subcontractors() {
  const [subcontractors, setSubcontractors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false);

  useEffect(() => {
    fetchSubcontractors();
  }, []);

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
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSubcontractor = async (id: string) => {
    try {
      const { error } = await supabase
        .from('subcontractors')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Subcontractor deleted successfully');
      fetchSubcontractors();
    } catch (error) {
      console.error('Error deleting subcontractor:', error);
      toast.error('Failed to delete subcontractor');
    }
  };

  const filteredSubcontractors = subcontractors.filter(sub =>
    sub.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.trade?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const renderGridView = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {filteredSubcontractors.map((sub) => (
        <Card key={sub.id} className="hover:shadow-lg transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <CardTitle className="text-lg">{sub.name}</CardTitle>
                <p className="text-sm text-gray-600 font-medium">{sub.company}</p>
              </div>
              <Badge variant="outline" className="ml-2">
                {sub.trade}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              {sub.email && (
                <div className="flex items-center gap-2 text-sm">
                  <Mail className="w-4 h-4 text-gray-400" />
                  <span className="truncate">{sub.email}</span>
                </div>
              )}
              
              {sub.phone && (
                <div className="flex items-center gap-2 text-sm">
                  <Phone className="w-4 h-4 text-gray-400" />
                  <span>{sub.phone}</span>
                </div>
              )}
              
              {sub.address && (
                <div className="flex items-center gap-2 text-sm">
                  <MapPin className="w-4 h-4 text-gray-400" />
                  <span className="truncate">{sub.address}</span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-3 border-t">
              <Badge 
                variant={sub.status === 'Active' ? 'default' : 'secondary'}
                className="text-xs"
              >
                {sub.status}
              </Badge>
              
              <div className="flex gap-1">
                <Button variant="outline" size="sm">
                  <Edit className="w-4 h-4" />
                </Button>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => handleDeleteSubcontractor(sub.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderListView = () => (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse border border-gray-200">
        <thead>
          <tr className="bg-gray-50">
            <th className="border border-gray-200 px-4 py-2 text-left">Name</th>
            <th className="border border-gray-200 px-4 py-2 text-left">Company</th>
            <th className="border border-gray-200 px-4 py-2 text-left">Trade</th>
            <th className="border border-gray-200 px-4 py-2 text-left">Contact</th>
            <th className="border border-gray-200 px-4 py-2 text-left">Status</th>
            <th className="border border-gray-200 px-4 py-2 text-center">Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredSubcontractors.map((sub) => (
            <tr key={sub.id} className="hover:bg-gray-50">
              <td className="border border-gray-200 px-4 py-2 font-medium">{sub.name}</td>
              <td className="border border-gray-200 px-4 py-2">{sub.company}</td>
              <td className="border border-gray-200 px-4 py-2">
                <Badge variant="outline">{sub.trade}</Badge>
              </td>
              <td className="border border-gray-200 px-4 py-2">
                <div className="space-y-1">
                  {sub.email && <div className="text-sm">{sub.email}</div>}
                  {sub.phone && <div className="text-sm text-gray-600">{sub.phone}</div>}
                </div>
              </td>
              <td className="border border-gray-200 px-4 py-2">
                <Badge variant={sub.status === 'Active' ? 'default' : 'secondary'}>
                  {sub.status}
                </Badge>
              </td>
              <td className="border border-gray-200 px-4 py-2">
                <div className="flex justify-center gap-2">
                  <Button variant="outline" size="sm">
                    <Edit className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleDeleteSubcontractor(sub.id)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  if (loading) {
    return (
      <Layout title="Subcontractors" subtitle="Manage your subcontractor network">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="Subcontractors" subtitle="Manage your subcontractor network">
      <div className="space-y-8">
        <Tabs defaultValue="list" className="w-full">
          <div className="flex justify-between items-center mb-6">
            <TabsList>
              <TabsTrigger value="list">Subcontractors</TabsTrigger>
              <TabsTrigger value="issues">Document Issues</TabsTrigger>
            </TabsList>
            
            <div className="flex gap-2">
              <Button onClick={() => setBulkDialogOpen(true)}>
                <Plus className="w-4 h-4 mr-2" />
                Add Subcontractors
              </Button>
            </div>
          </div>

          <TabsContent value="list">
            <Card>
              <CardHeader>
                <div className="flex justify-between items-center">
                  <CardTitle className="flex items-center gap-2">
                    <Users className="w-5 h-5" />
                    Subcontractors ({filteredSubcontractors.length})
                  </CardTitle>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2">
                      <Button
                        variant={viewMode === 'grid' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('grid')}
                      >
                        <Grid3X3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant={viewMode === 'list' ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setViewMode('list')}
                      >
                        <List className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="relative max-w-md">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                      <Input
                        placeholder="Search subcontractors..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10"
                      />
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {filteredSubcontractors.length > 0 ? (
                  viewMode === 'grid' ? renderGridView() : renderListView()
                ) : (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No Subcontractors Found</h3>
                    <p className="text-gray-500 mb-6">
                      {searchTerm ? 'No subcontractors match your search criteria.' : 'Add your first subcontractor to get started.'}
                    </p>
                    {!searchTerm && (
                      <Button onClick={() => setBulkDialogOpen(true)}>
                        <Plus className="w-4 h-4 mr-2" />
                        Add First Subcontractor
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="issues">
            <DocumentIssues />
          </TabsContent>
        </Tabs>

        <BulkSubcontractorDialog
          open={bulkDialogOpen}
          onOpenChange={setBulkDialogOpen}
          onSubcontractorsAdded={fetchSubcontractors}
        />
      </div>
    </Layout>
  );
}
