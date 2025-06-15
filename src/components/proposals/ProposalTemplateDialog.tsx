
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Plus, Trash2, Edit, Import } from 'lucide-react';
import { toast } from 'sonner';

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
      // Mock data - replace with actual API call when backend is ready
      const mockTemplates: Template[] = [
        {
          id: '1',
          name: 'Kitchen Remodel',
          description: 'Standard kitchen renovation template',
          projectType: 'Residential',
          createdAt: new Date('2024-01-15'),
          items: [
            { description: 'Cabinet installation', quantity: 1, unit: 'set', unitPrice: 5000, total: 5000 },
            { description: 'Countertop installation', quantity: 25, unit: 'sq ft', unitPrice: 75, total: 1875 },
            { description: 'Appliance installation', quantity: 1, unit: 'set', unitPrice: 2500, total: 2500 }
          ]
        },
        {
          id: '2',
          name: 'Bathroom Renovation',
          description: 'Complete bathroom renovation template',
          projectType: 'Residential',
          createdAt: new Date('2024-02-01'),
          items: [
            { description: 'Tile installation', quantity: 100, unit: 'sq ft', unitPrice: 15, total: 1500 },
            { description: 'Fixture installation', quantity: 1, unit: 'set', unitPrice: 1800, total: 1800 },
            { description: 'Plumbing work', quantity: 1, unit: 'job', unitPrice: 1200, total: 1200 }
          ]
        },
        {
          id: '3',
          name: 'Office Build-out',
          description: 'Commercial office space template',
          projectType: 'Commercial',
          createdAt: new Date('2024-01-20'),
          items: [
            { description: 'Framing', quantity: 1, unit: 'job', unitPrice: 2000, total: 2000 },
            { description: 'Drywall installation', quantity: 800, unit: 'sq ft', unitPrice: 3, total: 2400 },
            { description: 'Electrical work', quantity: 1, unit: 'job', unitPrice: 3500, total: 3500 }
          ]
        }
      ];
      
      setTemplates(mockTemplates);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

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
    onTemplateSelect(template);
    onOpenChange(false);
    toast.success(`Template "${template.name}" selected`);
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

  const importFromBidPlanner = () => {
    // TODO: Implement bid planner integration
    toast.info('Bid planner import feature coming soon!');
  };

  const getSortIcon = (field: string) => {
    if (sortField !== field) return '';
    return sortDirection === 'asc' ? ' ↑' : ' ↓';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
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
                    <Import className="w-4 h-4 mr-2" />
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
                          Template Name{getSortIcon('name')}
                        </TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-gray-50 select-none"
                          onClick={() => handleSort('projectType')}
                        >
                          Project Type{getSortIcon('projectType')}
                        </TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-gray-50 select-none"
                          onClick={() => handleSort('createdAt')}
                        >
                          Created{getSortIcon('createdAt')}
                        </TableHead>
                        <TableHead className="w-[140px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedTemplates.map((template) => (
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
                      ))}
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
