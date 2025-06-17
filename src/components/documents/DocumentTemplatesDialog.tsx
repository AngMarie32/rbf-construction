
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { FileText, Download, Plus, Search, Trash2, Edit } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';

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

const initialTemplates: DocumentTemplate[] = [
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
  const [templates, setTemplates] = useState<DocumentTemplate[]>(initialTemplates);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: '',
    category: '',
    tags: ''
  });

  const categories = Array.from(new Set(templates.map(t => t.category)));

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    
    return matchesSearch && matchesCategory;
  });

  const handleCreateTemplate = () => {
    if (!newTemplate.name.trim() || !newTemplate.category.trim()) {
      toast.error('Name and category are required');
      return;
    }

    const template: DocumentTemplate = {
      id: Date.now().toString(),
      name: newTemplate.name,
      description: newTemplate.description,
      category: newTemplate.category,
      downloadUrl: '#',
      tags: newTemplate.tags.split(',').map(tag => tag.trim()).filter(Boolean)
    };

    setTemplates([...templates, template]);
    setNewTemplate({ name: '', description: '', category: '', tags: '' });
    setShowCreateForm(false);
    toast.success('Template created successfully');
  };

  const handleDeleteTemplate = (templateId: string) => {
    if (!confirm('Are you sure you want to delete this template?')) return;
    
    setTemplates(templates.filter(t => t.id !== templateId));
    toast.success('Template deleted successfully');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Document Templates
            </DialogTitle>
            <Button onClick={() => setShowCreateForm(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Create Template
            </Button>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-hidden flex flex-col space-y-4">
          {/* Create Template Form */}
          {showCreateForm && (
            <Card className="border-2 border-blue-200">
              <CardHeader>
                <CardTitle className="text-lg">Create New Template</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    placeholder="Template name"
                    value={newTemplate.name}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, name: e.target.value }))}
                  />
                  <Input
                    placeholder="Category"
                    value={newTemplate.category}
                    onChange={(e) => setNewTemplate(prev => ({ ...prev, category: e.target.value }))}
                  />
                </div>
                <Input
                  placeholder="Description"
                  value={newTemplate.description}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, description: e.target.value }))}
                />
                <Input
                  placeholder="Tags (comma-separated)"
                  value={newTemplate.tags}
                  onChange={(e) => setNewTemplate(prev => ({ ...prev, tags: e.target.value }))}
                />
                <div className="flex gap-2">
                  <Button onClick={handleCreateTemplate}>Create Template</Button>
                  <Button variant="outline" onClick={() => setShowCreateForm(false)}>Cancel</Button>
                </div>
              </CardContent>
            </Card>
          )}

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
                      <div className="flex items-center gap-1">
                        <Badge variant="secondary" className="text-xs">
                          {template.category}
                        </Badge>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                              <Plus className="w-3 h-3 rotate-45" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => onUseTemplate(template)}>
                              <Plus className="w-4 h-4 mr-2" />
                              Use Template
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => window.open(template.downloadUrl, '_blank')}>
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </DropdownMenuItem>
                            <DropdownMenuItem 
                              onClick={() => handleDeleteTemplate(template.id)}
                              className="text-red-600"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
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
                <p>Try adjusting your search criteria or create a new template</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
