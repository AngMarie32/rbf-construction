import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Search, 
  Star, 
  Phone, 
  Mail, 
  MapPin, 
  Building,
  User,
  FileText,
  Trash2,
  Edit
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SubcontractorImportDialog } from '@/components/subcontractors/SubcontractorImportDialog';

interface Subcontractor {
  id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  specialties: string[];
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  rating?: number;
  notes?: string;
  created_at: string;
}

const specialties = [
  'Concrete',
  'Electrical',
  'Plumbing',
  'HVAC',
  'Roofing',
  'Framing',
  'Drywall',
  'Flooring',
  'Painting',
  'Landscaping',
  'Excavation',
  'Masonry',
  'Insulation',
  'Windows & Doors',
  'Asphalt',
  'Other'
];

export default function Subcontractors() {
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [filteredSubcontractors, setFilteredSubcontractors] = useState<Subcontractor[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('all');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubcontractor, setEditingSubcontractor] = useState<Subcontractor | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    specialties: [] as string[],
    address: '',
    city: '',
    state: '',
    zip_code: '',
    rating: '',
    notes: ''
  });

  useEffect(() => {
    fetchSubcontractors();
  }, []);

  useEffect(() => {
    filterSubcontractors();
  }, [subcontractors, searchTerm, specialtyFilter]);

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

  const filterSubcontractors = () => {
    let filtered = subcontractors;

    if (searchTerm) {
      filtered = filtered.filter(sub =>
        sub.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        sub.specialties?.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (specialtyFilter !== 'all') {
      filtered = filtered.filter(sub => sub.specialties?.includes(specialtyFilter));
    }

    setFilteredSubcontractors(filtered);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      company: '',
      email: '',
      phone: '',
      specialties: [],
      address: '',
      city: '',
      state: '',
      zip_code: '',
      rating: '',
      notes: ''
    });
    setEditingSubcontractor(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const submitData = {
        name: formData.name,
        company: formData.company,
        email: formData.email,
        phone: formData.phone,
        specialties: formData.specialties,
        address: formData.address,
        city: formData.city,
        state: formData.state,
        zip_code: formData.zip_code,
        rating: formData.rating ? parseFloat(formData.rating) : null,
        notes: formData.notes
      };

      if (editingSubcontractor) {
        const { error } = await supabase
          .from('subcontractors')
          .update(submitData)
          .eq('id', editingSubcontractor.id);

        if (error) throw error;
        toast.success('Subcontractor updated successfully');
      } else {
        const { error } = await supabase
          .from('subcontractors')
          .insert([submitData]);

        if (error) throw error;
        toast.success('Subcontractor created successfully');
      }

      setDialogOpen(false);
      resetForm();
      fetchSubcontractors();
    } catch (error) {
      console.error('Error saving subcontractor:', error);
      toast.error('Failed to save subcontractor');
    }
  };

  const handleEdit = (subcontractor: Subcontractor) => {
    setFormData({
      name: subcontractor.name || '',
      company: subcontractor.company || '',
      email: subcontractor.email || '',
      phone: subcontractor.phone || '',
      specialties: subcontractor.specialties || ['Other'],
      address: subcontractor.address || '',
      city: subcontractor.city || '',
      state: subcontractor.state || '',
      zip_code: subcontractor.zip_code || '',
      rating: subcontractor.rating?.toString() || '',
      notes: subcontractor.notes || ''
    });
    setEditingSubcontractor(subcontractor);
    setDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this subcontractor?')) return;

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

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

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
        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
          <div className="flex gap-4 flex-1">
            <div className="relative max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search subcontractors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            
            <Select value={specialtyFilter} onValueChange={setSpecialtyFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All Specialties" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Specialties</SelectItem>
                {specialties.map(specialty => (
                  <SelectItem key={specialty} value={specialty}>
                    {specialty}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex gap-2">
            <SubcontractorImportDialog onImportComplete={fetchSubcontractors} />
            <Dialog open={dialogOpen} onOpenChange={(open) => {
              setDialogOpen(open);
              if (!open) resetForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Subcontractor
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>
                    {editingSubcontractor ? 'Edit Subcontractor' : 'Add New Subcontractor'}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Contact Name</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        placeholder="Enter contact name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="company">Company Name</Label>
                      <Input
                        id="company"
                        value={formData.company}
                        onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                        placeholder="Enter company name"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        placeholder="Enter email address"
                      />
                    </div>
                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        placeholder="Enter phone number"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="specialties">Specialties</Label>
                    <Select 
                      value={formData.specialties[0] || ''} 
                      onValueChange={(value) => setFormData({ ...formData, specialties: [value] })}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select specialty" />
                      </SelectTrigger>
                      <SelectContent>
                        {specialties.map(specialty => (
                          <SelectItem key={specialty} value={specialty}>
                            {specialty}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Input
                      id="address"
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                      placeholder="Enter street address"
                    />
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <Label htmlFor="city">City</Label>
                      <Input
                        id="city"
                        value={formData.city}
                        onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                        placeholder="Enter city"
                      />
                    </div>
                    <div>
                      <Label htmlFor="state">State</Label>
                      <Input
                        id="state"
                        value={formData.state}
                        onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                        placeholder="Enter state"
                      />
                    </div>
                    <div>
                      <Label htmlFor="zip_code">Zip Code</Label>
                      <Input
                        id="zip_code"
                        value={formData.zip_code}
                        onChange={(e) => setFormData({ ...formData, zip_code: e.target.value })}
                        placeholder="Enter zip code"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="rating">Rating (1-5)</Label>
                    <Input
                      id="rating"
                      type="number"
                      min="1"
                      max="5"
                      step="0.1"
                      value={formData.rating}
                      onChange={(e) => setFormData({ ...formData, rating: e.target.value })}
                      placeholder="Enter rating"
                    />
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={formData.notes}
                      onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                      placeholder="Enter additional notes"
                      rows={3}
                    />
                  </div>

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingSubcontractor ? 'Update' : 'Create'} Subcontractor
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Subcontractors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredSubcontractors.map((subcontractor) => (
            <Card key={subcontractor.id} className="hover:shadow-lg transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg mb-1 flex items-center gap-2">
                      <Building className="w-5 h-5" />
                      {subcontractor.company || subcontractor.name}
                    </CardTitle>
                    <Badge variant="secondary">
                      {subcontractor.specialties?.[0] || 'Other'}
                    </Badge>
                  </div>
                  <div className="flex gap-1">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleEdit(subcontractor)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDelete(subcontractor.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {subcontractor.name && subcontractor.company && (
                  <div className="flex items-center text-sm text-gray-600">
                    <User className="w-4 h-4 mr-2" />
                    {subcontractor.name}
                  </div>
                )}
                
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
                
                {(subcontractor.address || subcontractor.city) && (
                  <div className="flex items-center text-sm text-gray-600">
                    <MapPin className="w-4 h-4 mr-2" />
                    {[subcontractor.address, subcontractor.city, subcontractor.state]
                      .filter(Boolean)
                      .join(', ')}
                  </div>
                )}
                
                {subcontractor.rating && (
                  <div className="flex items-center gap-2">
                    <div className="flex">
                      {renderStars(subcontractor.rating)}
                    </div>
                    <span className="text-sm text-gray-600">
                      ({subcontractor.rating.toFixed(1)})
                    </span>
                  </div>
                )}
                
                {subcontractor.notes && (
                  <p className="text-sm text-gray-600 line-clamp-2">
                    {subcontractor.notes}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}

          {filteredSubcontractors.length === 0 && (
            <div className="col-span-full text-center py-12 text-gray-500">
              {subcontractors.length === 0 ? (
                <div>
                  <p className="text-lg mb-4">No subcontractors yet</p>
                  <Button onClick={() => setDialogOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Subcontractor
                  </Button>
                </div>
              ) : (
                <p>No subcontractors found matching your criteria</p>
              )}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
