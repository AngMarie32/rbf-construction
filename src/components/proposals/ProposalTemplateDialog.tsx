
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { FileText, Plus, Trash2, Edit } from 'lucide-react';
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
    // For now, we'll use mock data since the proposal_templates table doesn't exist yet
    // This would normally fetch from supabase once the table is created
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
        name: 'Deck Construction',
        description: 'Outdoor deck building template',
        projectType: 'Commercial',
        createdAt: new Date('2024-01-20'),
        items: [
          { description: 'Framing', quantity: 1, unit: 'job', unitPrice: 2000, total: 2000 },
          { description: 'Decking material', quantity: 400, unit: 'sq ft', unitPrice: 8, total: 3200 },
          { description: 'Railing installation', quantity: 80, unit: 'linear ft', unitPrice: 25, total: 2000 }
        ]
      }
    ];
    
    setTemplates(mockTemplates);
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
        aValue = a.name;
        bValue = b.name;
        break;
      case 'projectType':
        aValue = a.projectType || '';
        bValue = b.projectType || '';
        break;
      case 'createdAt':
        aValue = a.createdAt || new Date();
        bValue = b.createdAt || new Date();
        break;
      default:
        aValue = a.name;
        bValue = b.name;
    }

    if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
    return 0;
  });

  const createTemplate = async () => {
    if (!newTemplate.name) {
      toast.error('Please enter a template name');
      return;
    }

    setLoading(true);
    try {
      // For now, we'll just add to the mock data
      // This would normally save to supabase once the table is created
      const newTemplateWithId: Template = {
        id: Date.now().toString(),
        name: newTemplate.name,
        description: newTemplate.description,
        projectType: newTemplate.projectType,
        createdAt: new Date(),
        items: []
      };

      setTemplates(prev => [...prev, newTemplateWithId]);
      toast.success('Template created successfully');
      setNewTemplate({ name: '', description: '', projectType: '', items: [] });
      setShowCreateForm(false);
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Failed to create template');
    } finally {
      setLoading(false);
    }
  };

  const updateTemplate = async () => {
    if (!editingTemplate || !newTemplate.name) {
      toast.error('Please enter a template name');
      return;
    }

    setLoading(true);
    try {
      // For now, we'll just update the mock data
      // This would normally update in supabase once the table is created
      setTemplates(prev => prev.map(template => 
        template.id === editingTemplate.id 
          ? { 
              ...template, 
              name: newTemplate.name, 
              description: newTemplate.description,
              projectType: newTemplate.projectType
            }
          : template
      ));
      toast.success('Template updated successfully');
      setNewTemplate({ name: '', description: '', projectType: '', items: [] });
      setEditingTemplate(null);
      setShowCreateForm(false);
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
      // For now, we'll just remove from the mock data
      // This would normally delete from supabase once the table is created
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
  };

  const startEdit = (template: Template) => {
    setEditingTemplate(template);
    setNewTemplate({
      name: template.name,
      description: template.description,
      projectType: template.projectType || '',
      items: template.items
    });
    setShowCreateForm(true);
  };

  const cancelEdit = () => {
    setEditingTemplate(null);
    setNewTemplate({ name: '', description: '', projectType: '', items: [] });
    setShowCreateForm(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle>Proposal Templates</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!showCreateForm ? (
            <>
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Manage Templates</h3>
                <Button variant="outline" onClick={() => setShowCreateForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Template
                </Button>
              </div>

              {templates.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No templates found. Create your first template to get started!</p>
                </div>
              ) : (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead 
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => handleSort('name')}
                        >
                          Template Name {sortField === 'name' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => handleSort('projectType')}
                        >
                          Project Type {sortField === 'projectType' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead 
                          className="cursor-pointer hover:bg-gray-50"
                          onClick={() => handleSort('createdAt')}
                        >
                          Created {sortField === 'createdAt' && (sortDirection === 'asc' ? '↑' : '↓')}
                        </TableHead>
                        <TableHead className="w-[120px]">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {sortedTemplates.map((template) => (
                        <TableRow key={template.id} className="cursor-pointer hover:bg-gray-50">
                          <TableCell 
                            className="font-medium"
                            onClick={() => selectTemplate(template)}
                          >
                            {template.name}
                          </TableCell>
                          <TableCell onClick={() => selectTemplate(template)}>
                            {template.description}
                          </TableCell>
                          <TableCell onClick={() => selectTemplate(template)}>
                            {template.projectType || 'N/A'}
                          </TableCell>
                          <TableCell onClick={() => selectTemplate(template)}>
                            {template.items?.length || 0} items
                          </TableCell>
                          <TableCell onClick={() => selectTemplate(template)}>
                            {template.createdAt?.toLocaleDateString() || 'N/A'}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  startEdit(template);
                                }}
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
                </div>
              )}
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>{editingTemplate ? 'Edit Template' : 'Create New Template'}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="templateName">Template Name</Label>
                  <Input
                    id="templateName"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                    placeholder="e.g., Kitchen Remodel, Bathroom Renovation"
                  />
                </div>
                <div>
                  <Label htmlFor="projectType">Project Type</Label>
                  <Input
                    id="projectType"
                    value={newTemplate.projectType}
                    onChange={(e) => setNewTemplate({ ...newTemplate, projectType: e.target.value })}
                    placeholder="e.g., Residential, Commercial"
                  />
                </div>
                <div>
                  <Label htmlFor="templateDescription">Description</Label>
                  <Textarea
                    id="templateDescription"
                    value={newTemplate.description}
                    onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                    placeholder="Brief description of this template..."
                    rows={3}
                  />
                </div>
                <div className="flex space-x-2">
                  <Button 
                    onClick={editingTemplate ? updateTemplate : createTemplate} 
                    disabled={loading}
                  >
                    {loading ? (editingTemplate ? 'Updating...' : 'Creating...') : (editingTemplate ? 'Update Template' : 'Create Template')}
                  </Button>
                  <Button variant="outline" onClick={cancelEdit}>
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
