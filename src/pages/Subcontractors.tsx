
import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, Users, Star, Phone, Mail } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Subcontractor {
  id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  address?: string;
  specialties?: string[];
  rating?: number;
  status: 'Active' | 'Inactive' | 'Blacklisted';
  notes?: string;
}

const STATUS_OPTIONS = [
  { value: 'Active', label: 'Active', color: 'bg-green-500' },
  { value: 'Inactive', label: 'Inactive', color: 'bg-gray-500' },
  { value: 'Blacklisted', label: 'Blacklisted', color: 'bg-red-500' }
];

const SPECIALTY_OPTIONS = [
  'Electrical',
  'Plumbing',
  'HVAC',
  'Concrete',
  'Framing',
  'Roofing',
  'Flooring',
  'Drywall',
  'Painting',
  'Landscaping',
  'Excavation',
  'Masonry',
  'Windows & Doors',
  'Insulation',
  'Tile Work'
];

export default function Subcontractors() {
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingSubcontractor, setEditingSubcontractor] = useState<Subcontractor | null>(null);
  
  const [newSubcontractor, setNewSubcontractor] = useState({
    name: '',
    company: '',
    email: '',
    phone: '',
    address: '',
    specialties: [] as string[],
    rating: '',
    status: 'Active' as 'Active' | 'Inactive' | 'Blacklisted',
    notes: ''
  });

  useEffect(() => {
    fetchSubcontractors();
  }, []);

  const fetchSubcontractors = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('subcontractors')
        .select('*')
        .order('name');

      if (error) throw error;

      const mappedSubcontractors = (data || []).map(sub => ({
        id: sub.id,
        name: sub.name,
        company: sub.company,
        email: sub.email,
        phone: sub.phone,
        address: sub.address,
        specialties: sub.specialties || [],
        rating: sub.rating,
        status: sub.status as Subcontractor['status'],
        notes: sub.notes
      }));

      setSubcontractors(mappedSubcontractors);
    } catch (error) {
      console.error('Error fetching subcontractors:', error);
      toast.error('Failed to load subcontractors');
    } finally {
      setLoading(false);
    }
  };

  const saveSubcontractor = async () => {
    if (!newSubcontractor.name) {
      toast.error('Please enter a name');
      return;
    }

    try {
      const subcontractorData = {
        name: newSubcontractor.name,
        company: newSubcontractor.company || null,
        email: newSubcontractor.email || null,
        phone: newSubcontractor.phone || null,
        address: newSubcontractor.address || null,
        specialties: newSubcontractor.specialties.length > 0 ? newSubcontractor.specialties : null,
        rating: newSubcontractor.rating ? parseFloat(newSubcontractor.rating) : null,
        status: newSubcontractor.status,
        notes: newSubcontractor.notes || null
      };

      if (editingSubcontractor) {
        const { error } = await supabase
          .from('subcontractors')
          .update(subcontractorData)
          .eq('id', editingSubcontractor.id);

        if (error) throw error;
        toast.success('Subcontractor updated successfully');
      } else {
        const { error } = await supabase
          .from('subcontractors')
          .insert(subcontractorData);

        if (error) throw error;
        toast.success('Subcontractor created successfully');
      }

      setDialogOpen(false);
      setEditingSubcontractor(null);
      resetForm();
      fetchSubcontractors();
    } catch (error) {
      console.error('Error saving subcontractor:', error);
      toast.error('Failed to save subcontractor');
    }
  };

  const deleteSubcontractor = async (id: string) => {
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

  const editSubcontractor = (subcontractor: Subcontractor) => {
    setEditingSubcontractor(subcontractor);
    setNewSubcontractor({
      name: subcontractor.name,
      company: subcontractor.company || '',
      email: subcontractor.email || '',
      phone: subcontractor.phone || '',
      address: subcontractor.address || '',
      specialties: subcontractor.specialties || [],
      rating: subcontractor.rating?.toString() || '',
      status: subcontractor.status,
      notes: subcontractor.notes || ''
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setNewSubcontractor({
      name: '',
      company: '',
      email: '',
      phone: '',
      address: '',
      specialties: [],
      rating: '',
      status: 'Active',
      notes: ''
    });
  };

  const toggleSpecialty = (specialty: string) => {
    const updatedSpecialties = newSubcontractor.specialties.includes(specialty)
      ? newSubcontractor.specialties.filter(s => s !== specialty)
      : [...newSubcontractor.specialties, specialty];
    
    setNewSubcontractor({ ...newSubcontractor, specialties: updatedSpecialties });
  };

  const getStatusColor = (status: string) => {
    return STATUS_OPTIONS.find(s => s.value === status)?.color || 'bg-gray-500';
  };

  const renderStars = (rating?: number) => {
    if (!rating) return 'No rating';
    
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={cn(
              "w-4 h-4",
              star <= rating ? "text-yellow-400 fill-current" : "text-gray-300"
            )}
          />
        ))}
        <span className="ml-2 text-sm text-gray-600">({rating})</span>
      </div>
    );
  };

  const activeSubcontractors = subcontractors.filter(sub => sub.status === 'Active').length;
  const averageRating = subcontractors.filter(sub => sub.rating).length > 0
    ? subcontractors.filter(sub => sub.rating).reduce((sum, sub) => sum + (sub.rating || 0), 0) / subcontractors.filter(sub => sub.rating).length
    : 0;

  return (
    <Layout title="Subcontractors" subtitle="Manage subcontractor database and relationships">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Subcontractors</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{subcontractors.length}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active</CardTitle>
              <Users className="h-4 w-4 text-green-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">
                {activeSubcontractors}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Rating</CardTitle>
              <Star className="h-4 w-4 text-yellow-600" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-600">
                {averageRating.toFixed(1)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Specialties Covered</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {new Set(subcontractors.flatMap(sub => sub.specialties || [])).size}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Subcontractors Management */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Subcontractors</CardTitle>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingSubcontractor(null);
                  resetForm();
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Subcontractor
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{editingSubcontractor ? 'Edit Subcontractor' : 'Add New Subcontractor'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        value={newSubcontractor.name}
                        onChange={(e) => setNewSubcontractor({ ...newSubcontractor, name: e.target.value })}
                        placeholder="John Smith"
                      />
                    </div>

                    <div>
                      <Label htmlFor="company">Company</Label>
                      <Input
                        id="company"
                        value={newSubcontractor.company}
                        onChange={(e) => setNewSubcontractor({ ...newSubcontractor, company: e.target.value })}
                        placeholder="ABC Construction"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={newSubcontractor.email}
                        onChange={(e) => setNewSubcontractor({ ...newSubcontractor, email: e.target.value })}
                        placeholder="john@abcconstruction.com"
                      />
                    </div>

                    <div>
                      <Label htmlFor="phone">Phone</Label>
                      <Input
                        id="phone"
                        value={newSubcontractor.phone}
                        onChange={(e) => setNewSubcontractor({ ...newSubcontractor, phone: e.target.value })}
                        placeholder="(555) 123-4567"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="address">Address</Label>
                    <Textarea
                      id="address"
                      value={newSubcontractor.address}
                      onChange={(e) => setNewSubcontractor({ ...newSubcontractor, address: e.target.value })}
                      placeholder="123 Main St, City, State 12345"
                      rows={2}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="rating">Rating (1-5)</Label>
                      <Input
                        id="rating"
                        type="number"
                        min="1"
                        max="5"
                        step="0.1"
                        value={newSubcontractor.rating}
                        onChange={(e) => setNewSubcontractor({ ...newSubcontractor, rating: e.target.value })}
                        placeholder="4.5"
                      />
                    </div>

                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select value={newSubcontractor.status} onValueChange={(value: 'Active' | 'Inactive' | 'Blacklisted') => setNewSubcontractor({ ...newSubcontractor, status: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_OPTIONS.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label>Specialties</Label>
                    <div className="grid grid-cols-3 gap-2 mt-2">
                      {SPECIALTY_OPTIONS.map((specialty) => (
                        <div key={specialty} className="flex items-center space-x-2">
                          <input
                            type="checkbox"
                            id={specialty}
                            checked={newSubcontractor.specialties.includes(specialty)}
                            onChange={() => toggleSpecialty(specialty)}
                            className="rounded"
                          />
                          <Label htmlFor={specialty} className="text-sm">
                            {specialty}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="notes">Notes</Label>
                    <Textarea
                      id="notes"
                      value={newSubcontractor.notes}
                      onChange={(e) => setNewSubcontractor({ ...newSubcontractor, notes: e.target.value })}
                      placeholder="Additional notes about this subcontractor..."
                      rows={3}
                    />
                  </div>

                  <Button onClick={saveSubcontractor} className="w-full">
                    {editingSubcontractor ? 'Update Subcontractor' : 'Add Subcontractor'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading subcontractors...</div>
            ) : subcontractors.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No subcontractors found. Add your first subcontractor to get started.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Company</TableHead>
                    <TableHead>Contact</TableHead>
                    <TableHead>Specialties</TableHead>
                    <TableHead>Rating</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {subcontractors.map((subcontractor) => (
                    <TableRow key={subcontractor.id}>
                      <TableCell className="font-medium">{subcontractor.name}</TableCell>
                      <TableCell>{subcontractor.company || 'N/A'}</TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {subcontractor.email && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Mail className="w-3 h-3 mr-1" />
                              {subcontractor.email}
                            </div>
                          )}
                          {subcontractor.phone && (
                            <div className="flex items-center text-sm text-gray-600">
                              <Phone className="w-3 h-3 mr-1" />
                              {subcontractor.phone}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(subcontractor.specialties || []).slice(0, 3).map((specialty) => (
                            <Badge key={specialty} variant="outline" className="text-xs">
                              {specialty}
                            </Badge>
                          ))}
                          {(subcontractor.specialties || []).length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{(subcontractor.specialties || []).length - 3}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>{renderStars(subcontractor.rating)}</TableCell>
                      <TableCell>
                        <Badge className={cn("text-white", getStatusColor(subcontractor.status))}>
                          {subcontractor.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => editSubcontractor(subcontractor)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteSubcontractor(subcontractor.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
