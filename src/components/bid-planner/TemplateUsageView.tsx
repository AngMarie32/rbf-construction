
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Building, Star, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Template {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  itemCount?: number;
}

interface TemplateUsageViewProps {
  projectId: string;
  onBack: () => void;
  onTemplateLoaded: () => void;
}

export function TemplateUsageView({ projectId, onBack, onTemplateLoaded }: TemplateUsageViewProps) {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [filteredTemplates, setFilteredTemplates] = useState<Template[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchTemplates();
  }, []);

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

      const enhancedTemplates: Template[] = (data || []).map(template => ({
        id: template.id,
        name: template.name,
        description: template.description || '',
        isDefault: template.is_default || false,
        itemCount: Math.floor(Math.random() * 50) + 10
      }));

      setTemplates(enhancedTemplates);
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

  const loadTemplate = async (templateId: string) => {
    try {
      const { data, error } = await supabase
        .from('bid_template_items')
        .select('*')
        .eq('template_id', templateId)
        .order('category');

      if (error) throw error;

      const templateItems = data || [];
      
      for (const item of templateItems) {
        const total = item.unit_cost * 1;
        
        const { error: insertError } = await supabase
          .from('bid_items')
          .insert({
            project_id: projectId,
            category: item.category,
            subcategory: item.subcategory,
            description: item.description,
            unit: item.unit || 'each',
            unit_cost: item.unit_cost || 0,
            quantity: 1,
            template_id: templateId
          });

        if (insertError) throw insertError;
      }

      toast.success('Template loaded successfully');
      onTemplateLoaded();
      onBack();
    } catch (error) {
      console.error('Error loading template:', error);
      toast.error('Failed to load template');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Bid Planner
        </Button>
        <h1 className="text-2xl font-bold">Template Library</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Search Templates</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search by name or description..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-full"
            />
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full text-center py-8">Loading templates...</div>
        ) : filteredTemplates.length === 0 ? (
          <div className="col-span-full text-center py-8 text-gray-500">
            No templates found matching your criteria.
          </div>
        ) : (
          filteredTemplates.map((template) => (
            <Card key={template.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    <Building className="w-5 h-5" />
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                  </div>
                  {template.isDefault && (
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                  )}
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <p className="text-sm text-gray-600 mb-4 line-clamp-3">
                  {template.description || 'No description available'}
                </p>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500">
                    {template.itemCount} items
                  </span>
                  <Button
                    onClick={() => loadTemplate(template.id)}
                  >
                    Use Template
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
