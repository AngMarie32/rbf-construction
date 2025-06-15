
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, Edit, Trash2, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface ChangeOrderTemplate {
  id: string;
  name: string;
  description: string;
  estimatedAmount: number;
  category: string;
  isDefault: boolean;
}

interface ChangeOrderTemplatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectTemplate: (template: ChangeOrderTemplate) => void;
}

export function ChangeOrderTemplatesDialog({ 
  open, 
  onOpenChange, 
  onSelectTemplate 
}: ChangeOrderTemplatesDialogProps) {
  const [templates, setTemplates] = useState<ChangeOrderTemplate[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<ChangeOrderTemplate | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    estimatedAmount: 0,
    category: '',
    isDefault: false
  });

  useEffect(() => {
    if (open) {
      loadTemplates();
    }
  }, [open]);

  const loadTemplates = () => {
    // Load from localStorage for demo (in real app, this would be from database)
    const savedTemplates = JSON.parse(localStorage.getItem('change_order_templates') || '[]');
    const defaultTemplates: ChangeOrderTemplate[] = [
      {
        id: '1',
        name: 'Material Price Increase',
        description: 'Adjustment for material cost increases beyond contractor control',
        estimatedAmount: 5000,
        category: 'Material',
        isDefault: true
      },
      {
        id: '2',
        name: 'Scope Addition',
        description: 'Additional work requested by owner',
        estimatedAmount: 10000,
        category: 'Scope Change',
        isDefault: true
      },
      {
        id: '3',
        name: 'Unforeseen Conditions',
        description: 'Work required due to unforeseen site conditions',
        estimatedAmount: 7500,
        category: 'Site Conditions',
        isDefault: true
      }
    ];
    
    setTemplates([...defaultTemplates, ...savedTemplates]);
  };

  const handleSaveTemplate = () => {
    if (!formData.name || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    const newTemplate: ChangeOrderTemplate = {
      id: editingTemplate?.id || crypto.randomUUID(),
      ...formData
    };

    const existingTemplates = JSON.parse(localStorage.getItem('change_order_templates') || '[]');
    
    if (editingTemplate) {
      const updatedTemplates = existingTemplates.map((t: ChangeOrderTemplate) => 
        t.id === editingTemplate.id ? newTemplate : t
      );
      localStorage.setItem('change_order_templates', JSON.stringify(updatedTemplates));
    } else {
      existingTemplates.push(newTemplate);
      localStorage.setItem('change_order_templates', JSON.stringify(existingTemplates));
    }

    loadTemplates();
    setShowCreateForm(false);
    setEditingTemplate(null);
    setFormData({ name: '', description: '', estimatedAmount: 0, category: '', isDefault: false });
    toast.success(editingTemplate ? 'Template updated' : 'Template created');
  };

  const handleEditTemplate = (template: ChangeOrderTemplate) => {
    if (template.isDefault) {
      toast.error('Cannot edit default templates');
      return;
    }
    setEditingTemplate(template);
    setFormData({
      name: template.name,
      description: template.description,
      estimatedAmount: template.estimatedAmount,
      category: template.category,
      isDefault: template.isDefault
    });
    setShowCreateForm(true);
  };

  const handleDeleteTemplate = (template: ChangeOrderTemplate) => {
    if (template.isDefault) {
      toast.error('Cannot delete default templates');
      return;
    }

    const existingTemplates = JSON.parse(localStorage.getItem('change_order_templates') || '[]');
    const updatedTemplates = existingTemplates.filter((t: ChangeOrderTemplate) => t.id !== template.id);
    localStorage.setItem('change_order_templates', JSON.stringify(updatedTemplates));
    
    loadTemplates();
    toast.success('Template deleted');
  };

  const handleUseTemplate = (template: ChangeOrderTemplate) => {
    onSelectTemplate(template);
    onOpenChange(false);
    toast.success(`Using template: ${template.name}`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Change Order Templates</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {!showCreateForm ? (
            <>
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  Select a template to quickly create a change order
                </p>
                <Button onClick={() => setShowCreateForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Template
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
                {templates.map((template) => (
                  <Card key={template.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <CardTitle className="text-lg">{template.name}</CardTitle>
                          <div className="flex gap-2 mt-2">
                            <Badge variant="outline">{template.category}</Badge>
                            {template.isDefault && (
                              <Badge variant="secondary">Default</Badge>
                            )}
                          </div>
                        </div>
                        {!template.isDefault && (
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEditTemplate(template)}
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteTemplate(template)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600 mb-4">{template.description}</p>
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-semibold text-green-600">
                          ${template.estimatedAmount.toLocaleString()}
                        </span>
                        <Button onClick={() => handleUseTemplate(template)}>
                          Use Template
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </>
          ) : (
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">
                  {editingTemplate ? 'Edit Template' : 'Create New Template'}
                </h3>
                <Button variant="outline" onClick={() => {
                  setShowCreateForm(false);
                  setEditingTemplate(null);
                  setFormData({ name: '', description: '', estimatedAmount: 0, category: '', isDefault: false });
                }}>
                  Cancel
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Template Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder="e.g., Material Price Increase"
                  />
                </div>
                <div>
                  <Label htmlFor="category">Category *</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="e.g., Material, Scope Change"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="description">Description *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe the type of change this template covers..."
                  rows={3}
                />
              </div>

              <div>
                <Label htmlFor="estimatedAmount">Estimated Amount</Label>
                <Input
                  id="estimatedAmount"
                  type="number"
                  value={formData.estimatedAmount}
                  onChange={(e) => setFormData({ ...formData, estimatedAmount: Number(e.target.value) })}
                  placeholder="0"
                />
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => {
                  setShowCreateForm(false);
                  setEditingTemplate(null);
                }}>
                  Cancel
                </Button>
                <Button onClick={handleSaveTemplate}>
                  {editingTemplate ? 'Update Template' : 'Create Template'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
