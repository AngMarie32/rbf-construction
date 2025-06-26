
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Search, FileText, Plus, Edit, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { EditBidTemplateDialog } from './EditBidTemplateDialog';

interface BidTemplate {
  id: string;
  name: string;
  description: string;
  created_at: string;
  itemCount?: number;
}

interface BidTemplateSelectorProps {
  onTemplateSelected: (template: BidTemplate) => void;
  onCreateNew: () => void;
}

export function BidTemplateSelector({ onTemplateSelected, onCreateNew }: BidTemplateSelectorProps) {
  const [templates, setTemplates] = useState<BidTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingTemplate, setEditingTemplate] = useState<BidTemplate | null>(null);

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('bid_templates')
        .select('*')
        .order('created_at', { ascending: false });

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
      toast.error('Failed to load bid templates');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteTemplate = async (templateId: string, templateName: string) => {
    if (!confirm(`Are you sure you want to delete the template "${templateName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      // First delete all template items
      await supabase
        .from('bid_template_items')
        .delete()
        .eq('template_id', templateId);

      // Then delete the template
      const { error } = await supabase
        .from('bid_templates')
        .delete()
        .eq('id', templateId);

      if (error) throw error;

      toast.success('Template deleted successfully');
      fetchTemplates();
    } catch (error) {
      console.error('Error deleting template:', error);
      toast.error('Failed to delete template');
    }
  };

  const filteredTemplates = templates.filter(template =>
    template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading templates...</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search templates..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button onClick={onCreateNew}>
          <Plus className="w-4 h-4 mr-2" />
          Start from Scratch
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredTemplates.map((template) => (
          <Card key={template.id} className="hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <CardTitle className="text-lg">{template.name}</CardTitle>
                <Badge variant="outline">
                  {template.itemCount} items
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {template.description || 'No description provided'}
              </p>
              <div className="flex justify-between items-center mb-3">
                <span className="text-xs text-muted-foreground">
                  {new Date(template.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex gap-2">
                <Button 
                  size="sm" 
                  onClick={() => onTemplateSelected(template)}
                  className="flex-1"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Use Template
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setEditingTemplate(template)}
                >
                  <Edit className="w-4 h-4" />
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleDeleteTemplate(template.id, template.name)}
                  className="text-red-600 hover:text-red-700"
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No Templates Found</h3>
            <p className="text-muted-foreground mb-4">
              {searchTerm ? 'No templates match your search.' : 'You haven\'t created any bid templates yet.'}
            </p>
            <Button onClick={onCreateNew}>
              <Plus className="w-4 h-4 mr-2" />
              Start from Scratch
            </Button>
          </CardContent>
        </Card>
      )}

      <EditBidTemplateDialog
        template={editingTemplate}
        open={!!editingTemplate}
        onOpenChange={(open) => !open && setEditingTemplate(null)}
        onTemplateUpdated={fetchTemplates}
      />
    </div>
  );
}
