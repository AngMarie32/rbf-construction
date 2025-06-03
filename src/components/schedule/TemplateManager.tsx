import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Save, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface ScheduleTemplate {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  items: ScheduleTemplateItem[];
}

interface ScheduleTemplateItem {
  id: string;
  title: string;
  description: string;
  duration: number;
  category: string;
  dependencies: string[];
  templateId: string;
}

interface TemplateManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTemplateApplied: (tasks: any[]) => void;
}

export function TemplateManager({ open, onOpenChange, onTemplateApplied }: TemplateManagerProps) {
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('browse');
  
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    items: [] as any[]
  });

  const [selectedTemplate, setSelectedTemplate] = useState<ScheduleTemplate | null>(null);

  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data: templatesData, error: templatesError } = await supabase
        .from('schedule_templates')
        .select('*')
        .order('name');

      if (templatesError) throw templatesError;

      const { data: itemsData, error: itemsError } = await supabase
        .from('schedule_template_items')
        .select('*');

      if (itemsError) throw itemsError;

      const templatesWithItems = (templatesData || []).map(template => ({
        id: template.id,
        name: template.name,
        description: template.description,
        isDefault: template.is_default,
        items: (itemsData || []).filter(item => item.template_id === template.id).map(item => ({
          id: item.id,
          title: item.title,
          description: item.description,
          duration: item.duration,
          category: item.category,
          dependencies: item.dependencies || [],
          templateId: item.template_id
        }))
      }));

      setTemplates(templatesWithItems);
    } catch (error) {
      console.error('Error fetching schedule templates:', error);
      toast.error('Failed to load schedule templates');
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
        .from('schedule_templates')
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
          title: item.title,
          description: item.description,
          duration: item.duration,
          category: item.category,
          dependencies: item.dependencies || []
        }));

        const { error: itemsError } = await supabase
          .from('schedule_template_items')
          .insert(itemsToInsert);

        if (itemsError) throw itemsError;
      }

      toast.success('Schedule template saved successfully');
      fetchTemplates();
      setActiveTab('browse');
      setNewTemplate({ name: '', description: '', items: [] });
    } catch (error) {
      console.error('Error saving schedule template:', error);
      toast.error('Failed to save schedule template');
    } finally {
      setLoading(false);
    }
  };

  const deleteTemplate = async (id: string) => {
    try {
      const { error } = await supabase
        .from('schedule_templates')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Schedule template deleted successfully');
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting schedule template:', error);
      toast.error('Failed to delete schedule template');
    }
  };

  const applyTemplate = (template: ScheduleTemplate) => {
    // Create a copy of the template items to avoid modifying the original
    const templateTasks = template.items.map((item, index) => ({
      id: `temp-${Date.now()}-${index}`,
      item: item.title,
      description: item.description,
      startDate: new Date(),
      duration: item.duration,
      dependencies: [],
      projectId: '',
      category: item.category
    }));

    // Apply template and close dialog
    onTemplateApplied(templateTasks);
    toast.success(`Applied template: ${template.name}`);
  };

  const previewTemplate = (template: ScheduleTemplate) => {
    setSelectedTemplate(template);
    setActiveTab('preview');
  };

  const addTemplateItem = () => {
    const newItem = {
      id: `temp-${Date.now()}`,
      title: '',
      description: '',
      duration: 1,
      category: '',
      dependencies: []
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
            {selectedTemplate && <TabsTrigger value="preview">Preview Template</TabsTrigger>}
          </TabsList>

          <TabsContent value="browse" className="space-y-4 overflow-y-auto max-h-[70vh]">
            {loading ? (
              <div className="text-center py-8">Loading schedule templates...</div>
            ) : templates.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                No schedule templates found. Create your first template to get started.
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
                      {template.items.length} tasks
                    </div>
                    
                    <div className="flex gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => previewTemplate(template)}
                        variant="outline"
                        className="flex-1"
                      >
                        Preview
                      </Button>
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

          {selectedTemplate && (
            <TabsContent value="preview" className="space-y-4 overflow-y-auto max-h-[70vh]">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold">{selectedTemplate.name}</h3>
                  {selectedTemplate.description && (
                    <p className="text-gray-600">{selectedTemplate.description}</p>
                  )}
                </div>

                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Duration</TableHead>
                        <TableHead>Category</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedTemplate.items.map((item) => (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">{item.title}</TableCell>
                          <TableCell>{item.description}</TableCell>
                          <TableCell>{item.duration} days</TableCell>
                          <TableCell>{item.category}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex gap-2">
                  <Button onClick={() => applyTemplate(selectedTemplate)}>
                    <Copy className="w-4 h-4 mr-2" />
                    Apply This Template
                  </Button>
                  <Button variant="outline" onClick={() => setActiveTab('browse')}>
                    Back to Templates
                  </Button>
                </div>
              </div>
            </TabsContent>
          )}

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
                <h4 className="font-medium">Template Tasks</h4>
                <Button onClick={addTemplateItem} size="sm">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Task
                </Button>
              </div>

              {newTemplate.items.length > 0 && (
                <div className="border rounded-lg">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Title</TableHead>
                        <TableHead>Description</TableHead>
                        <TableHead>Duration (Days)</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead className="w-20">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {newTemplate.items.map((item, index) => (
                        <TableRow key={item.id}>
                          <TableCell>
                            <Input
                              value={item.title}
                              onChange={(e) => updateTemplateItem(index, 'title', e.target.value)}
                              placeholder="Task title"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.description}
                              onChange={(e) => updateTemplateItem(index, 'description', e.target.value)}
                              placeholder="Task description"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              value={item.duration}
                              onChange={(e) => updateTemplateItem(index, 'duration', parseInt(e.target.value) || 1)}
                              placeholder="1"
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
