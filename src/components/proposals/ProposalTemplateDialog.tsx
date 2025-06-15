
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText, Plus } from 'lucide-react';
import { toast } from 'sonner';

interface Template {
  id: string;
  name: string;
  description: string;
  items: any[];
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
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
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
        items: [
          { description: 'Framing', quantity: 1, unit: 'job', unitPrice: 2000, total: 2000 },
          { description: 'Decking material', quantity: 400, unit: 'sq ft', unitPrice: 8, total: 3200 },
          { description: 'Railing installation', quantity: 80, unit: 'linear ft', unitPrice: 25, total: 2000 }
        ]
      }
    ];
    
    setTemplates(mockTemplates);
  };

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
        items: []
      };

      setTemplates(prev => [...prev, newTemplateWithId]);
      toast.success('Template created successfully');
      setNewTemplate({ name: '', description: '', items: [] });
      setShowCreateForm(false);
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Failed to create template');
    } finally {
      setLoading(false);
    }
  };

  const selectTemplate = (template: Template) => {
    onTemplateSelect(template);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Proposal Templates</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {!showCreateForm ? (
            <>
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Select a Template</h3>
                <Button variant="outline" onClick={() => setShowCreateForm(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  New Template
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {templates.map((template) => (
                  <Card key={template.id} className="cursor-pointer hover:bg-gray-50" onClick={() => selectTemplate(template)}>
                    <CardHeader>
                      <CardTitle className="flex items-center text-sm">
                        <FileText className="w-4 h-4 mr-2" />
                        {template.name}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-gray-600">{template.description}</p>
                      {template.items && template.items.length > 0 && (
                        <p className="text-xs text-gray-500 mt-2">
                          {template.items.length} items included
                        </p>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {templates.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p>No templates found. Create your first template to get started!</p>
                </div>
              )}
            </>
          ) : (
            <Card>
              <CardHeader>
                <CardTitle>Create New Template</CardTitle>
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
                  <Button onClick={createTemplate} disabled={loading}>
                    {loading ? 'Creating...' : 'Create Template'}
                  </Button>
                  <Button variant="outline" onClick={() => setShowCreateForm(false)}>
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
