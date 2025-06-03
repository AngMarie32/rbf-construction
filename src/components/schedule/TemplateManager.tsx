
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Save, Copy, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Template {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  items: TemplateItem[];
}

interface TemplateItem {
  id: string;
  description: string;
  category: string;
  subcategory?: string;
  unit: string;
  unitCost: number;
  templateId: string;
}

interface Project {
  id: string;
  name: string;
  color: string;
}

interface TemplateManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTemplateApplied: (tasks: any[]) => void;
}

export function TemplateManager({ open, onOpenChange, onTemplateApplied }: TemplateManagerProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('browse');
  
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    items: [] as any[]
  });

  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data: templatesData, error: templatesError } = await supabase
        .from('bid_templates')
        .select('*')
        .order('name');

      if (templatesError) throw templatesError;

      const { data: itemsData, error: itemsError } = await supabase
        .from('bid_template_items')
        .select('*');

      if (itemsError) throw itemsError;

      const templatesWithItems = (templatesData || []).map(template => ({
        id: template.id,
        name: template.name,
        description: template.description,
        isDefault: template.is_default, // Map snake_case to camelCase
        items: (itemsData || []).filter(item => item.template_id === template.id).map(item => ({
          id: item.id,
          description: item.description,
          category: item.category,
          subcategory: item.subcategory,
          unit: item.unit,
          unitCost: item.unit_cost, // Map snake_case to camelCase
          templateId: item.template_id // Map snake_case to camelCase
        }))
      }));

      setTemplates(templatesWithItems);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async () => {
    if (!newTemplate.name) {
      toast.error('Template name is required');
      return;
    }

    try {
      setLoading(true);
      const { data: template, error: templateError } = await supabase
        .from('bid_templates')
        .insert({
          name: newTemplate.name,
          description: newTemplate.description
        })
        .select()
        .single();

      if (templateError) throw templateError;

      if (newTemplate.items.length > 0) {
        const itemsToInsert = newTemplate.items.map(item => ({
          template_id: template.id,
          description: item.description,
          category: item.category,
          subcategory: item.subcategory,
          unit: item.unit,
          unit_cost: item.unitCost
        }));

        const { error: itemsError } = await supabase
          .from('bid_template_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      toast.success('Template saved successfully');
      fetchTemplates();
      setActiveTab('browse');
      setNewTemplate({ name: '', description: '', items: [] });
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    } finally {
      setLoading(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('bid_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Template deleted successfully');
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  const applyTemplate = async (template: Template) => {
    try {
      const tasks = template.items.map((item, index) => ({
        id: `temp-${Date.now()}-${index}`,
        item: item.description,
        description: `${item.category} - ${item.description}`,
        startDate: new Date(),
        duration: 1,
        dependencies: [],
        projectId: '' // Will be set when selecting project
      }));

      onTemplateApplied(tasks);
      toast.success(`Applied template: ${template.name}`);
    } catch (error) {
      console.error('Error applying template:', error);
      toast.error('Failed to apply template');
    }
  };

  const addTemplateItem = () => {
    const newItem = {
      id: `temp-${Date.now()}`,
      description: '',
      category: '',
      subcategory: '',
      unit: 'each',
      unitCost: 0
    };
    setNewTemplate({
      ...newTemplate,
      items: [...newTemplate.items, newItem]
    });
  };

  const updateTemplateItem = (index: number, field: string, value: any) => {
    const updatedItems = [...newTemplate.items];
    updatedItems[index] = { ...updatedItems[index], [field]: value };
    setNewTemplate({ ...newTemplate, items: updatedItems });
  };

  const removeTemplateItem = (index: number) => {
    setNewTemplate({
      ...newTemplate,
      items: newTemplate.items.filter((_, i) => i !== index)
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Schedule Templates</DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsList>
            <TabsTrigger value="browse">Browse Templates</TabsTrigger>
            <TabsTrigger value="create">Create Template</TabsTrigger>
          </TabsList>

          <TabsContent value="browse" className="space-y-4 overflow-y-auto max-h-[70vh]">
            {loading ? (
              <div className="text-center py-8">Loading templates...</div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No templates found. Create your first template to get started.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((template) => (
                  <div key={template.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div>
                        <h3 className="font-semibold">{template.name}</h3>
                        {template.description && (
                          <p className="text-sm text-gray-600">{template.description}</p>
                        )}
                      </div>
                      {template.isDefault && (
                        <Badge variant="secondary" className="text-xs">Default</Badge>
                      )}
                    </div>
                    
                    <div className="text-sm text-gray-500 mb-3">
                      {template.items.length} items
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => applyTemplate(template)}
                        className="flex-1"
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Apply
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => deleteTemplate(template.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="create" className="space-y-4 overflow-y-auto max-h-[70vh]">
            <div className="space-y-4">
              <div>
                <Label htmlFor="template-name">Template Name</Label>
                <Input
                  id="template-name"
                  value={newTemplate.name}
                  onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                  placeholder="Enter template name"
                />
              </div>

              <div>
                <Label htmlFor="template-description">Description</Label>
                <Textarea
                  id="template-description"
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                  placeholder="Enter template description"
                  rows={2}
                />
              </div>

              <div className="flex items-center justify-between">
                <h4 className="font-medium">Template Items</h4>
                <Button onClick={addTemplateItem} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Item
                </Button>
              </div>

              {newTemplate.items.length > 0 && (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Description</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Unit</TableHead>
                        <TableHead>Cost</TableHead>
                        <TableHead className="w-20">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {newTemplate.items.map((item, index) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Input
                              value={item.description}
                              onChange={(e) => updateTemplateItem(index, 'description', e.target.value)}
                              placeholder="Item description"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.category}
                              onChange={(e) => updateTemplateItem(index, 'category', e.target.value)}
                              placeholder="Category"
                            />
                          </TableCell>
                          <TableCell>
                            <Select 
                              value={item.unit} 
                              onValueChange={(value) => updateTemplateItem(index, 'unit', value)}
                            >
                              <SelectTrigger>
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="each">Each</SelectItem>
                                <SelectItem value="days">Days</SelectItem>
                                <SelectItem value="hours">Hours</SelectItem>
                                <SelectItem value="sq ft">Sq Ft</SelectItem>
                                <SelectItem value="linear ft">Linear Ft</SelectItem>
                              </SelectContent>
                            </Select>
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              value={item.unitCost}
                              onChange={(e) => updateTemplateItem(index, 'unitCost', parseFloat(e.target.value) || 0)}
                              placeholder="0.00"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeTemplateItem(index)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button onClick={saveTemplate} disabled={loading}>
                  <Save className="w-4 h-4 mr-2" />
                  {loading ? 'Saving...' : 'Save Template'}
                </Button>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setNewTemplate({ name: '', description: '', items: [] });
                    setActiveTab('browse');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
