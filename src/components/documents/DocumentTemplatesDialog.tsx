
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Plus, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';

interface DocumentTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  downloadUrl: string;
  tags: string[];
}

interface DocumentTemplatesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUseTemplate: (template: DocumentTemplate) => void;
}

const mockTemplates: DocumentTemplate[] = [
  {
    id: '1',
    name: 'Project Proposal Template',
    description: 'Standard template for creating project proposals with all necessary sections',
    category: 'Proposals',
    downloadUrl: '#',
    tags: ['proposal', 'project', 'contract']
  },
  {
    id: '2',
    name: 'Change Order Form',
    description: 'Template for documenting project changes and cost adjustments',
    category: 'Change Orders',
    downloadUrl: '#',
    tags: ['change-order', 'form', 'documentation']
  },
  {
    id: '3',
    name: 'Daily Report Template',
    description: 'Template for daily progress reports and site observations',
    category: 'Reports',
    downloadUrl: '#',
    tags: ['daily', 'report', 'progress']
  },
  {
    id: '4',
    name: 'Safety Inspection Checklist',
    description: 'Comprehensive safety inspection checklist for construction sites',
    category: 'Safety',
    downloadUrl: '#',
    tags: ['safety', 'inspection', 'checklist']
  },
  {
    id: '5',
    name: 'Invoice Template',
    description: 'Professional invoice template with company branding',
    category: 'Invoices',
    downloadUrl: '#',
    tags: ['invoice', 'billing', 'payment']
  },
  {
    id: '6',
    name: 'Material Request Form',
    description: 'Template for requesting materials and supplies',
    category: 'Forms',
    downloadUrl: '#',
    tags: ['materials', 'request', 'supplies']
  }
];

export function DocumentTemplatesDialog({
  open,
  onOpenChange,
  onUseTemplate
}: DocumentTemplatesDialogProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');

  const categories = Array.from(new Set(mockTemplates.map(t => t.category)));

  const filteredTemplates = mockTemplates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Document Templates
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Search and Filter */}
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search templates..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant={selectedCategory === 'all' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory('all')}
              >
                All
              </Button>
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
          </div>

          {/* Templates Grid */}
          <div className="flex-1 overflow-auto">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-4">
              {filteredTemplates.map((template) => (
                <Card key={template.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <FileText className="w-8 h-8 text-blue-500 flex-shrink-0" />
                      <Badge variant="secondary" className="text-xs">
                        {template.category}
                      </Badge>
                    </div>
                    <CardTitle className="text-lg">{template.name}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <p className="text-sm text-gray-600 line-clamp-2">
                      {template.description}
                    </p>
                    
                    <div className="flex flex-wrap gap-1">
                      {template.tags.slice(0, 3).map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                      {template.tags.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{template.tags.length - 3}
                        </Badge>
                      )}
                    </div>

                    <div className="flex gap-2 pt-2">
                      <Button
                        size="sm"
                        onClick={() => onUseTemplate(template)}
                        className="flex-1"
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Use Template
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => window.open(template.downloadUrl, '_blank')}
                      >
                        <Download className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {filteredTemplates.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <FileText className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                <h3 className="text-lg font-semibold mb-2">No templates found</h3>
                <p>Try adjusting your search criteria</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
