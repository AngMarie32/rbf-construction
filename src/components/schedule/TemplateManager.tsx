
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Save, Copy, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { addDays } from 'date-fns';

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

interface Project {
  id: string;
  name: string;
}

interface TemplateManagerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTemplateApplied: (tasks: any[]) => void;
  projects: Project[];
}

export function TemplateManager({ open, onOpenChange, onTemplateApplied, projects }: TemplateManagerProps) {
  const [templates, setTemplates] = useState<ScheduleTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('browse');
  const [selectedProjectId, setSelectedProjectId] = useState('');
  
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    items: [] as Partial<ScheduleTemplateItem>[]
  });

  const [editingTemplate, setEditingTemplate] = useState<ScheduleTemplate | null>(null);
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
          title: item.title || '',
          description: item.description || '',
          duration: item.duration || 1,
          category: item.category || '',
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

  const updateTemplate = async () => {
    if (!editingTemplate || !editingTemplate.name) {
      toast.error('Template name is required');
      return;
    }

    try {
      setLoading(true);
      
      // Update template
      const { error: templateError } = await supabase
        .from('schedule_templates')
        .update({
          name: editingTemplate.name,
          description: editingTemplate.description
        })
        .eq('id', editingTemplate.id);

      if (templateError) throw templateError;

      // Delete existing items
      await supabase
        .from('schedule_template_items')
        .delete()
        .eq('template_id', editingTemplate.id);

      // Insert updated items
      if (editingTemplate.items.length > 0) {
        const itemsToInsert = editingTemplate.items.map(item => ({
          template_id: editingTemplate.id,
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

      toast.success('Template updated successfully');
      fetchTemplates();
      setEditingTemplate(null);
      setActiveTab('browse');
    } catch (error) {
      console.error('Error updating template:', error);
      toast.error('Failed to update template');
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

  // Calculate business days (skip weekends)
  const calculateBusinessDays = (start: Date, days: number): Date => {
    let result = new Date(start);
    let addedDays = 0;
    
    while (addedDays < days) {
      result = addDays(result, 1);
      // Skip weekends (Saturday = 6, Sunday = 0)
      if (result.getDay() !== 0 && result.getDay() !== 6) {
        addedDays++;
      }
    }
    
    return result;
  };

  const applyTemplate = async (template: ScheduleTemplate) => {
    if (!selectedProjectId) {
      toast.error('Please select a project first');
      return;
    }

    try {
      setLoading(true);
      const startDate = new Date();
      
      // Create tasks from template items using business days
      const tasksToCreate = template.items.map((item, index) => {
        const taskStartDate = index === 0 ? startDate : calculateBusinessDays(startDate, index * item.duration);
        const taskEndDate = calculateBusinessDays(taskStartDate, item.duration - 1);
        
        return {
          title: item.title,
          project_id: selectedProjectId,
          start_date: taskStartDate.toISOString().split('T')[0],
          end_date: taskEndDate.toISOString().split('T')[0],
          status: 'Not Started',
          progress: 0,
          dependencies: [] // Will handle dependencies in a second pass
        };
      });

      const { error } = await supabase
        .from('tasks')
        .insert(tasksToCreate);

      if (error) throw error;

      toast.success(`Applied template: ${template.name}`);
      onTemplateApplied(tasksToCreate);
      onOpenChange(false);
    } catch (error) {
      console.error('Error applying template:', error);
      toast.error('Failed to apply template');
    } finally {
      setLoading(false);
    }
  };

  const previewTemplate = (template: ScheduleTemplate) => {
    setSelectedTemplate(template);
    setActiveTab('preview');
  };

  const editTemplate = (template: ScheduleTemplate) => {
    setEditingTemplate({ ...template });
    setActiveTab('edit');
  };

  const addTemplateItem = (isEditing = false) => {
    const newItem: Partial<ScheduleTemplateItem> = {
      id: `temp-${Date.now()}`,
      title: '',
      description: '',
      duration: 1,
      category: '',
      dependencies: [],
      templateId: isEditing && editingTemplate ? editingTemplate.id : ''
    };
    
    if (isEditing && editingTemplate) {
      setEditingTemplate({
        ...editingTemplate,
        items: [...editingTemplate.items, newItem as ScheduleTemplateItem]
      });
    } else {
      setNewTemplate({
        ...newTemplate,
        items: [...newTemplate.items, newItem]
      });
    }
  };

  const updateTemplateItem = (index: number, field: string, value: any, isEditing = false) => {
    if (isEditing && editingTemplate) {
      const updatedItems = [...editingTemplate.items];
      updatedItems[index] = { ...updatedItems[index], [field]: value };
      setEditingTemplate({ ...editingTemplate, items: updatedItems });
    } else {
      const updatedItems = [...newTemplate.items];
      updatedItems[index] = { ...updatedItems[index], [field]: value };
      setNewTemplate({ ...newTemplate, items: updatedItems });
    }
  };

  const removeTemplateItem = (index: number, isEditing = false) => {
    if (isEditing && editingTemplate) {
      setEditingTemplate({
        ...editingTemplate,
        items: editingTemplate.items.filter((_, i) => i !== index)
      });
    } else {
      setNewTemplate({
        ...newTemplate,
        items: newTemplate.items.filter((_, i) => i !== index)
      });
    }
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
            {editingTemplate && <TabsTrigger value="edit">Edit Template</TabsTrigger>}
            {selectedTemplate && <TabsTrigger value="preview">Preview Template</TabsTrigger>}
          </TabsList>

          <TabsContent value="browse" className="space-y-4 overflow-y-auto max-h-[70vh]">
            <div className="mb-4">
              <Label htmlFor="project-select">Select Project for Template Application</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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
                        disabled={!selectedProjectId}
                      >
                        <Copy className="w-4 h-4 mr-2" />
                        Apply
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => editTemplate(template)}
                        className="text-blue-600"
                      >
                        <Edit className="w-4 h-4" />
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

          {editingTemplate && (
            <TabsContent value="edit" className="space-y-4 overflow-y-auto max-h-[70vh]">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="edit-template-name">Template Name</Label>
                  <Input
                    id="edit-template-name"
                    value={editingTemplate.name}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, name: e.target.value })}
                    placeholder="Enter template name"
                  />
                </div>

                <div>
                  <Label htmlFor="edit-template-description">Description</Label>
                  <Textarea
                    id="edit-template-description"
                    value={editingTemplate.description}
                    onChange={(e) => setEditingTemplate({ ...editingTemplate, description: e.target.value })}
                    placeholder="Enter template description"
                    rows={2}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <h4 className="font-medium">Template Tasks</h4>
                  <Button onClick={() => addTemplateItem(true)} size="sm">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Task
                  </Button>
                </div>

                {editingTemplate.items.length > 0 && (
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
                        {editingTemplate.items.map((item, index) => (
                          <TableRow key={item.id}>
                            <TableCell>
                              <Input
                                value={item.title}
                                onChange={(e) => updateTemplateItem(index, 'title', e.target.value, true)}
                                placeholder="Task title"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={item.description}
                                onChange={(e) => updateTemplateItem(index, 'description', e.target.value, true)}
                                placeholder="Task description"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                type="number"
                                min="1"
                                value={item.duration}
                                onChange={(e) => updateTemplateItem(index, 'duration', parseInt(e.target.value) || 1, true)}
                                placeholder="1"
                              />
                            </TableCell>
                            <TableCell>
                              <Input
                                value={item.category}
                                onChange={(e) => updateTemplateItem(index, 'category', e.target.value, true)}
                                placeholder="Category"
                              />
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => removeTemplateItem(index, true)}
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
                  <Button onClick={updateTemplate} disabled={loading}>
                    <Save className="w-4 h-4 mr-2" />
                    {loading ? 'Updating...' : 'Update Template'}
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => {
                      setEditingTemplate(null);
                      setActiveTab('browse');
                    }}
                  >
                    Cancel
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
                <Button onClick={() => addTemplateItem(false)} size="sm">
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
                              value={item.title || ''}
                              onChange={(e) => updateTemplateItem(index, 'title', e.target.value, false)}
                              placeholder="Task title"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.description || ''}
                              onChange={(e) => updateTemplateItem(index, 'description', e.target.value, false)}
                              placeholder="Task description"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              type="number"
                              min="1"
                              value={item.duration || 1}
                              onChange={(e) => updateTemplateItem(index, 'duration', parseInt(e.target.value) || 1, false)}
                              placeholder="1"
                            />
                          </TableCell>
                          <TableCell>
                            <Input
                              value={item.category || ''}
                              onChange={(e) => updateTemplateItem(index, 'category', e.target.value, false)}
                              placeholder="Category"
                            />
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeTemplateItem(index, false)}
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
