
import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  Filter,
  MapPin,
  Phone,
  Mail,
  Star,
  FileText,
  AlertTriangle,
  Grid3X3,
  List,
  Edit,
  Trash2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { BulkSubcontractorDialog } from '@/components/subcontractors/BulkSubcontractorDialog';
import { DocumentIssues } from '@/components/subcontractors/DocumentIssues';

interface Subcontractor {
  id: string;
  company: string;
  name: string;
  email?: string;
  phone?: string;
  specialties?: string[];
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  rating?: number;
  status: string;
  notes?: string;
  w9_on_file?: boolean;
  travel_radius?: number;
  insurance_expiry?: string;
}

export default function Subcontractors() {
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDocumentIssues, setShowDocumentIssues] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');

  useEffect(() => {
    fetchSubcontractors();
  }, []);

  const fetchSubcontractors = async () => {
    try {
      const { data, error } = await supabase
        .from('subcontractors')
        .select('*')
        .order('company');

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
      
      setSubcontractors(subcontractors.filter(sub => sub.id !== id));
      toast.success('Subcontractor deleted successfully');
    } catch (error) {
      console.error('Error deleting subcontractor:', error);
      toast.error('Failed to delete subcontractor');
    }
  };

  const filteredSubcontractors = subcontractors.filter(sub =>
    sub.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sub.specialties?.some(spec => spec.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  if (showDocumentIssues) {
    return (
      <Layout title="Document Issues" subtitle="Manage subcontractor document compliance">
        <DocumentIssues onBack={() => setShowDocumentIssues(false)} />
      </Layout>
    );
  }

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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search subcontractors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-96"
              />
            </div>
            <Button variant="outline">
              <Filter className="w-4 h-4 mr-2" />
              Filters
            </Button>
            <div className="flex border rounded-md">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 className="w-4 h-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setViewMode('list')}
              >
                <List className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline"
              onClick={() => setShowDocumentIssues(true)}
            >
              <AlertTriangle className="w-4 h-4 mr-2" />
              Document Issues
            </Button>
            <BulkSubcontractorDialog onSubcontractorsCreated={fetchSubcontractors} />
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Subcontractor
            </Button>
          </div>
        </div>

        {/* Subcontractors Display */}
        {viewMode === 'grid' ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredSubcontractors.map((subcontractor) => (
              <Card key={subcontractor.id} className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-lg">{subcontractor.company}</CardTitle>
                      <p className="text-sm text-gray-600">{subcontractor.name}</p>
                    </div>
                    <div className="flex items-center gap-1">
                      {subcontractor.w9_on_file && (
                        <FileText className="w-4 h-4 text-green-600" />
                      )}
                      <Badge variant={subcontractor.status === 'Active' ? 'default' : 'secondary'}>
                        {subcontractor.status}
                      </Badge>
                      <div className="flex gap-1 ml-2">
                        <Button size="sm" variant="ghost">
                          <Edit className="w-3 h-3" />
                        </Button>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          onClick={() => handleDeleteSubcontractor(subcontractor.id)}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {subcontractor.specialties && subcontractor.specialties.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {subcontractor.specialties.slice(0, 3).map((specialty, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {specialty}
                        </Badge>
                      ))}
                      {subcontractor.specialties.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{subcontractor.specialties.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}

                  <div className="space-y-2">
                    {subcontractor.email && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Mail className="w-4 h-4 mr-2" />
                        {subcontractor.email}
                      </div>
                    )}
                    {subcontractor.phone && (
                      <div className="flex items-center text-sm text-gray-600">
                        <Phone className="w-4 h-4 mr-2" />
                        {subcontractor.phone}
                      </div>
                    )}
                    {subcontractor.city && subcontractor.state && (
                      <div className="flex items-center text-sm text-gray-600">
                        <MapPin className="w-4 h-4 mr-2" />
                        {subcontractor.city}, {subcontractor.state}
                      </div>
                    )}
                  </div>

                  {subcontractor.rating && (
                    <div className="flex items-center">
                      <Star className="w-4 h-4 text-yellow-400 mr-1" />
                      <span className="text-sm font-medium">{subcontractor.rating}/5</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="divide-y">
                {filteredSubcontractors.map((subcontractor) => (
                  <div key={subcontractor.id} className="p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <h3 className="font-semibold text-lg">{subcontractor.company}</h3>
                          <p className="text-sm text-gray-600">{subcontractor.name}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {subcontractor.email && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Mail className="w-4 h-4 mr-1" />
                              {subcontractor.email}
                            </div>
                          )}
                          {subcontractor.phone && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Phone className="w-4 h-4 mr-1" />
                              {subcontractor.phone}
                            </div>
                          )}
                          {subcontractor.city && subcontractor.state && (
                            <div className="flex items-center text-sm text-gray-600">
                              <MapPin className="w-4 h-4 mr-1" />
                              {subcontractor.city}, {subcontractor.state}
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        {subcontractor.specialties && subcontractor.specialties.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {subcontractor.specialties.slice(0, 2).map((specialty, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {specialty}
                              </Badge>
                            ))}
                            {subcontractor.specialties.length > 2 && (
                              <Badge variant="outline" className="text-xs">
                                +{subcontractor.specialties.length - 2}
                              </Badge>
                            )}
                          </div>
                        )}
                        <div className="flex items-center gap-2">
                          {subcontractor.w9_on_file && (
                            <FileText className="w-4 h-4 text-green-600" />
                          )}
                          <Badge variant={subcontractor.status === 'Active' ? 'default' : 'secondary'}>
                            {subcontractor.status}
                          </Badge>
                          {subcontractor.rating && (
                            <div className="flex items-center">
                              <Star className="w-4 h-4 text-yellow-400 mr-1" />
                              <span className="text-sm font-medium">{subcontractor.rating}/5</span>
                            </div>
                          )}
                          <div className="flex gap-1">
                            <Button size="sm" variant="ghost">
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleDeleteSubcontractor(subcontractor.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {filteredSubcontractors.length === 0 && (
          <div className="text-center py-12">
            <div className="text-gray-500">
              <h3 className="text-lg font-semibold mb-2">No subcontractors found</h3>
              <p>Try adjusting your search terms or add a new subcontractor.</p>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
