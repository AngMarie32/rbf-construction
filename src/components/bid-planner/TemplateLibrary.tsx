
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Building, 
  Search,
  Star,
  Trash2,
  Eye
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Template {
  id: string;
  name: string;
  description: string;
  is_default: boolean;
  itemCount?: number;
}

interface TemplateItem {
  category: string;
  subcategory: string;
  description: string;
  unit: string;
  unit_cost: number;
}

interface TemplateLibraryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTemplateSelected: (templateId: string) => void;
}

export function TemplateLibrary({ open, onOpenChange, onTemplateSelected }: TemplateLibraryProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);
  const [previewTemplate, setPreviewTemplate] = useState<string | null>(null);
  const [previewItems, setPreviewItems] = useState<TemplateItem[]>([]);

  useEffect(() => {
    if (open) {
      fetchTemplates();
    }
  }, [open]);

  useEffect(() => {
    filterTemplates();
  }, [templates, searchTerm]);

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bid_templates')
        .select('*')
        .order('name');

      if (error) throw error;

      // Get item counts for each template
      const templatesWithCounts = await Promise.all(
        (data || []).map(async (template) => {
          const { data: items } = await supabase
            .from('bid_template_items')
            .select('id')
            .eq('template_id', template.id);
          
          return {
            ...template,
            itemCount: items?.length || 0
          };
        })
      );

      setTemplates(templatesWithCounts);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setLoading(false);
    }
  };

  const filterTemplates = () => {
    let filtered = templates;

    if (searchTerm) {
      filtered = filtered.filter(template =>
        template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        template.description?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    setFilteredTemplates(filtered);
  };

  const handleDeleteTemplate = async (templateId: string, templateName: string) => {
    if (!confirm(`Are you sure you want to delete the template "${templateName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      // Delete template items first
      const { error: itemsError } = await supabase
        .from('bid_template_items')
        .delete()
        .eq('template_id', templateId);

      if (itemsError) throw itemsError;

      // Delete template
      const { error: templateError } = await supabase
        .from('bid_templates')
        .delete()
        .eq('id', templateId);

      if (templateError) throw templateError;

      // Update local state
      setTemplates(templates.filter(t => t.id !== templateId));
      toast.success(`Template "${templateName}" deleted successfully`);
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  const handlePreviewTemplate = async (templateId: string) => {
    try {
      const { data: items, error } = await supabase
        .from('bid_template_items')
        .select('category, subcategory, description, unit, unit_cost')
        .eq('template_id', templateId)
        .order('category');

      if (error) throw error;

      setPreviewItems(items || []);
      setPreviewTemplate(templateId);
    } catch (error) {
      console.error('Error fetching template items:', error);
      toast.error('Failed to load template preview');
    }
  };

  const groupedPreviewItems = previewItems.reduce((acc, item) => {
    if (!acc[item.category]) {
      acc[item.category] = [];
    }
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, TemplateItem[]>);

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Template Library</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Search */}
            <div className="flex gap-4">
              <div className="flex-1">
                <Label htmlFor="search">Search Templates</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Search by name or description..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full"
                  />
                </div>
              </div>
            </div>

            {/* Templates Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {loading ? (
                <div className="col-span-full text-center py-8">Loading templates...</div>
              ) : filteredTemplates.length === 0 ? (
                <div className="col-span-full text-center py-8 text-gray-500">
                  {searchTerm ? 'No templates match your search.' : 'No templates found.'}
                </div>
              ) : (
                filteredTemplates.map((template) => (
                  <Card key={template.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-2 flex-1">
                          <Building className="w-5 h-5" />
                          <CardTitle className="text-sm truncate">{template.name}</CardTitle>
                        </div>
                        <div className="flex items-center gap-1">
                          {template.is_default && (
                            <Star className="w-4 h-4 text-yellow-500 fill-current" />
                          )}
                          {!template.is_default && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteTemplate(template.id, template.name);
                              }}
                              className="text-red-600 hover:text-red-700 hover:bg-red-50 p-1 h-auto"
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                        {template.description || 'No description available'}
                      </p>
                      <div className="flex justify-between items-center">
                        <Badge variant="outline">
                          {template.itemCount} items
                        </Badge>
                        <div className="flex gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePreviewTemplate(template.id)}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            onClick={() => {
                              onTemplateSelected(template.id);
                              onOpenChange(false);
                            }}
                          >
                            Use
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Template Preview Dialog */}
      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplate(null)}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              Template Preview: {templates.find(t => t.id === previewTemplate)?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-6">
            {Object.entries(groupedPreviewItems).map(([category, items]) => (
              <div key={category}>
                <h3 className="font-semibold text-lg mb-3 text-blue-600 border-b pb-1">{category}</h3>
                <div className="grid gap-2">
                  {items.map((item, index) => (
                    <div key={index} className="grid grid-cols-12 gap-2 text-sm py-1 border-b border-gray-100">
                      <div className="col-span-4 font-medium">{item.description}</div>
                      <div className="col-span-2 text-gray-600">{item.subcategory || '-'}</div>
                      <div className="col-span-2 text-center">{item.unit}</div>
                      <div className="col-span-2 text-right">${item.unit_cost.toFixed(2)}</div>
                      <div className="col-span-2 text-right text-gray-500">Qty: -</div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setPreviewTemplate(null)}>
                Close
              </Button>
              <Button onClick={() => {
                if (previewTemplate) {
                  onTemplateSelected(previewTemplate);
                  setPreviewTemplate(null);
                  onOpenChange(false);
                }
              }}>
                Use This Template
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
