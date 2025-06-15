
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Plus, Trash2, Edit, Download, ArrowUpDown } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Template {
  id: string;
  name: string;
  description: string;
  items: any[];
  projectType?: string;
  createdAt?: Date;
}

interface ProposalTemplateDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTemplateSelect: (template: Template) => void;
}

export function ProposalTemplateDialog({ open, onOpenChange, onTemplateSelect }: ProposalTemplateDialogProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [sortField, setSortField] = useState<'name' | 'projectType' | 'createdAt'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    projectType: '',
    items: []
  });

  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open]);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      // Fetch real templates from Supabase bid_templates table
      const { data: bidTemplates, error } = await supabase
        .from('bid_templates')
        .select(`
          *,
          bid_template_items (*)
        `);

      if (error) {
        console.error('Error fetching templates:', error);
        // Fall back to mock data if real data fails
        setTemplates(getMockTemplates());
      } else if (bidTemplates && bidTemplates.length > 0) {
        const mappedTemplates: Template[] = bidTemplates.map((template: any) => ({
          id: template.id,
          name: template.name,
          description: template.description || 'No description available',
          projectType: template.is_default ? 'Default' : 'Custom',
          createdAt: new Date(template.created_at),
          items: template.bid_template_items?.map((item: any) => ({
            description: item.description,
            quantity: 1,
            unit: item.unit || 'each',
            unitPrice: item.unit_cost || 0,
            total: item.unit_cost || 0
          })) || []
        }));
        setTemplates(mappedTemplates);
      } else {
        // No templates found in database, use mock data
        setTemplates(getMockTemplates());
      }
    } catch (error) {
      console.error('Error fetching templates:', error);
      setTemplates(getMockTemplates());
    } finally {
      setLoading(false);
    }
  };

  const getMockTemplates = (): Template[] => [
    {
      id: '1',
      name: 'Kitchen Remodel',
      description: 'Complete kitchen renovation including cabinets, countertops, appliances, and flooring',
      projectType: 'Residential',
      createdAt: new Date('2024-01-15'),
      items: [
        { description: 'Cabinet removal and installation', quantity: 1, unit: 'job', unitPrice: 8500, total: 8500 },
        { description: 'Granite countertop installation', quantity: 30, unit: 'sq ft', unitPrice: 85, total: 2550 },
        { description: 'Appliance installation package', quantity: 1, unit: 'set', unitPrice: 1200, total: 1200 },
        { description: 'Tile flooring installation', quantity: 150, unit: 'sq ft', unitPrice: 12, total: 1800 },
        { description: 'Plumbing and electrical updates', quantity: 1, unit: 'job', unitPrice: 2500, total: 2500 }
      ]
    },
    {
      id: '2',
      name: 'Bathroom Renovation',
      description: 'Full bathroom remodel with modern fixtures and tile work',
      projectType: 'Residential',
      createdAt: new Date('2024-02-01'),
      items: [
        { description: 'Demolition and prep work', quantity: 1, unit: 'job', unitPrice: 1500, total: 1500 },
        { description: 'Ceramic tile installation', quantity: 120, unit: 'sq ft', unitPrice: 18, total: 2160 },
        { description: 'Vanity and mirror installation', quantity: 1, unit: 'set', unitPrice: 2200, total: 2200 },
        { description: 'Shower/tub installation', quantity: 1, unit: 'unit', unitPrice: 3500, total: 3500 },
        { description: 'Plumbing fixture installation', quantity: 1, unit: 'job', unitPrice: 1800, total: 1800 }
      ]
    },
    {
      id: '3',
      name: 'Office Build-out',
      description: 'Commercial office space construction with modern amenities',
      projectType: 'Commercial',
      createdAt: new Date('2024-01-20'),
      items: [
        { description: 'Framing and drywall', quantity: 2000, unit: 'sq ft', unitPrice: 8, total: 16000 },
        { description: 'Electrical rough-in and finishing', quantity: 1, unit: 'job', unitPrice: 12000, total: 12000 },
        { description: 'HVAC installation', quantity: 1, unit: 'system', unitPrice: 8500, total: 8500 },
        { description: 'Flooring installation', quantity: 1800, unit: 'sq ft', unitPrice: 15, total: 27000 },
        { description: 'Paint and finishing work', quantity: 1, unit: 'job', unitPrice: 6000, total: 6000 }
      ]
    },
    {
      id: '4',
      name: 'Deck Construction',
      description: 'Outdoor deck construction with railings and stairs',
      projectType: 'Residential',
      createdAt: new Date('2024-02-10'),
      items: [
        { description: 'Foundation and footings', quantity: 8, unit: 'piers', unitPrice: 150, total: 1200 },
        { description: 'Pressure treated lumber framing', quantity: 400, unit: 'sq ft', unitPrice: 12, total: 4800 },
        { description: 'Composite decking installation', quantity: 350, unit: 'sq ft', unitPrice: 25, total: 8750 },
        { description: 'Railing installation', quantity: 80, unit: 'linear ft', unitPrice: 45, total: 3600 },
        { description: 'Stairs and finishing', quantity: 1, unit: 'set', unitPrice: 1800, total: 1800 }
      ]
    }
  ];

  const handleSort = (field: 'name' | 'projectType' | 'createdAt') => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedTemplates = [...templates].sort((a, b) => {
    let aValue: string | Date;
    let bValue: string | Date;

    switch (sortField) {
      case 'name':
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
        break;
      case 'projectType':
        aValue = (a.projectType || '').toLowerCase();
        bValue = (b.projectType || '').toLowerCase();
        break;
      case 'createdAt':
        aValue = a.createdAt || new Date(0);
        bValue = b.createdAt || new Date(0);
        break;
      default:
        aValue = a.name.toLowerCase();
        bValue = b.name.toLowerCase();
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const createTemplate = async () => {
    if (!newTemplate.name.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    setLoading(true);
    try {
      const newTemplateWithId: Template = {
        id: Date.now().toString(),
        name: newTemplate.name,
        description: newTemplate.description,
        projectType: newTemplate.projectType,
        createdAt: new Date(),
        items: newTemplate.items
      };

      setTemplates(prev => [...prev, newTemplateWithId]);
      toast.success('Template created successfully');
      resetForm();
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Failed to create template');
    } finally {
      setLoading(false);
    }
  };

  const updateTemplate = async () => {
    if (!editingTemplate || !newTemplate.name.trim()) {
      toast.error('Please enter a template name');
      return;
    }

    setLoading(true);
    try {
      setTemplates(prev => prev.map(template => 
        template.id === editingTemplate.id 
          ? { 
              ...template, 
              name: newTemplate.name, 
              description: newTemplate.description,
              projectType: newTemplate.projectType,
              items: newTemplate.items
            }
          : template
      ));
      toast.success('Template updated successfully');
      resetForm();
    } catch (error) {
      console.error('Error updating template:', error);
      toast.error('Failed to update template');
    } finally {
      setLoading(false);
    }
  };

  const deleteTemplate = async (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) {
      return;
    }

    setLoading(true);
    try {
      setTemplates(prev => prev.filter(template => template.id !== templateId));
      toast.success('Template deleted successfully');
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    } finally {
      setLoading(false);
    }
  };

  const selectTemplate = (template: Template) => {
    console.log('Selecting template:', template);
    onTemplateSelect(template);
    onOpenChange(false);
  };

  const startEdit = (template: Template) => {
    setEditingTemplate(template);
    setNewTemplate({
      name: template.name,
      description: template.description,
      projectType: template.projectType || '',
      items: template.items || []
    });
    setShowCreateForm(true);
  };

  const resetForm = () => {
    setEditingTemplate(null);
    setNewTemplate({ name: '', description: '', projectType: '', items: [] });
    setShowCreateForm(false);
  };

  const importFromBidPlanner = async () => {
    setLoading(true);
    try {
      const { data: bidTemplates, error } = await supabase
        .from('bid_templates')
        .select(`
          *,
          bid_template_items (*)
        `)
        .eq('is_default', false);

      if (error) throw error;

      if (bidTemplates && bidTemplates.length > 0) {
        const importedTemplates: Template[] = bidTemplates.map((bidTemplate: any) => ({
          id: `imported-${bidTemplate.id}`,
          name: bidTemplate.name,
          description: bidTemplate.description || 'Imported from Bid Planner',
          projectType: 'Imported',
          createdAt: new Date(bidTemplate.created_at),
          items: bidTemplate.bid_template_items?.map((item: any) => ({
            description: item.description,
            quantity: 1,
            unit: item.unit || 'each',
            unitPrice: item.unit_cost || 0,
            total: item.unit_cost || 0
          })) || []
        }));

        setTemplates(prev => [...prev, ...importedTemplates]);
        toast.success(`Successfully imported ${importedTemplates.length} templates from Bid Planner`);
      } else {
        toast.info('No bid templates found to import');
      }
    } catch (error) {
      console.error('Error importing from bid planner:', error);
      toast.error('Failed to import from Bid Planner');
    } finally {
      setLoading(false);
    }
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return <ArrowUpDown className="w-4 h-4 ml-1 opacity-50" />;
    return <ArrowUpDown className={`w-4 h-4 ml-1 ${sortDirection === 'desc' ? 'rotate-180' : ''}`} />;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Proposal Templates</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!showCreateForm ? (
            <>
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Template Library</h3>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={importFromBidPlanner}>
                    <Download className="w-4 h-4 mr-2" />
                    Import from Bid Planner
                  </Button>
                  <Button onClick={() => setShowCreateForm(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    New Template
                  </Button>
                </div>
              </div>

              {loading ? (
                <div className="flex justify-center items-center h-32">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : templates.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  <FileText className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg mb-2">No templates found</p>
                  <p className="text-sm">Create your first template or import from bid planner to get started!</p>
                </div>
              ) : (
                <div className="border rounded-lg overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead 
                          className="cursor-pointer hover:bg-gray-50 select-none"
                          onClick={() => handleSort('name')}
                        >
                          <div className="flex items-center">
                            Template Name
                            {getSortIcon('name')}
                          </div>
                        </TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-gray-50 select-none"
                          onClick={() => handleSort('projectType')}
                        >
                          <div className="flex items-center">
                            Project Type
                            {getSortIcon('projectType')}
                          </div>
                        </TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Total Value</TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-gray-50 select-none"
                          onClick={() => handleSort('createdAt')}
                        >
                          <div className="flex items-center">
                            Created
                            {getSortIcon('createdAt')}
                          </div>
                        </TableHead>
                        <TableHead className="w-[140px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedTemplates.map((template) => {
                        const totalValue = template.items?.reduce((sum, item) => sum + (item.total || 0), 0) || 0;
                        return (
                          <TableRow 
                            key={template.id} 
                            className="cursor-pointer hover:bg-gray-50"
                            onClick={() => selectTemplate(template)}
                          >
                            <TableCell className="font-medium">
                              {template.name}
                            </TableCell>
                            <TableCell className="max-w-xs truncate">
                              {template.description || 'No description'}
                            </TableCell>
                            <TableCell>
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {template.projectType || 'General'}
                              </span>
                            </TableCell>
                            <TableCell>
                              {template.items?.length || 0} items
                            </TableCell>
                            <TableCell className="font-medium">
                              ${totalValue.toLocaleString()}
                            </TableCell>
                            <TableCell>
                              {template.createdAt?.toLocaleDateString() || 'N/A'}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startEdit(template);
                                  }}
                                  title="Edit template"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteTemplate(template.id);
                                  }}
                                  className="text-red-600 hover:text-red-800 hover:bg-red-50"
                                  title="Delete template"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>{editingTemplate ? 'Edit Template' : 'Create New Template'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="templateName">Template Name *</Label>
                    <Input
                      id="templateName"
                      value={newTemplate.name}
                      onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                      placeholder="e.g., Kitchen Remodel, Office Build-out"
                    />
                  </div>
                  <div>
                    <Label htmlFor="projectType">Project Type</Label>
                    <Input
                      id="projectType"
                      value={newTemplate.projectType}
                      onChange={(e) => setNewTemplate({ ...newTemplate, projectType: e.target.value })}
                      placeholder="e.g., Residential, Commercial, Industrial"
                    />
                  </div>
                </div>
                <div>
                  <Label htmlFor="templateDescription">Description</Label>
                  <Textarea
                    id="templateDescription"
                    value={newTemplate.description}
                    onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                    placeholder="Brief description of this template and when to use it..."
                    rows={3}
                  />
                </div>
                <div className="flex space-x-2 pt-4">
                  <Button 
                    onClick={editingTemplate ? updateTemplate : createTemplate} 
                    disabled={loading || !newTemplate.name.trim()}
                  >
                    {loading ? (editingTemplate ? 'Updating...' : 'Creating...') : (editingTemplate ? 'Update Template' : 'Create Template')}
                  </Button>
                  <Button variant="outline" onClick={resetForm}>
                    Cancel
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
