
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Wrench, 
  Zap, 
  Droplets, 
  Flame, 
  Building, 
  HardHat, 
  Search,
  Star
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface Template {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
  itemCount?: number;
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

      // Properly map the Supabase data to match the Template interface
      const enhancedTemplates: Template[] = (data || []).map(template => ({
        id: template.id,
        name: template.name,
        description: template.description || '',
        isDefault: template.is_default || false,
        itemCount: Math.floor(Math.random() * 50) + 10 // Mock item count
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

  return (
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
                No templates found matching your criteria.
              </div>
            ) : (
              filteredTemplates.map((template) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow cursor-pointer">
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Building className="w-5 h-5" />
                        <CardTitle className="text-sm">{template.name}</CardTitle>
                      </div>
                      {template.isDefault && (
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <p className="text-sm text-gray-600 mb-3 line-clamp-2">
                      {template.description || 'No description available'}
                    </p>
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">
                        {template.itemCount} items
                      </span>
                      <Button
                        size="sm"
                        onClick={() => {
                          onTemplateSelected(template.id);
                          onOpenChange(false);
                        }}
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
      </DialogContent>
    </Dialog>
  );
}
