
import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Edit, Trash2, FileText, Upload, Download, Search } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Document {
  id: string;
  projectId?: string;
  name: string;
  category: 'General' | 'Contracts' | 'Plans' | 'Photos' | 'Reports' | 'Permits' | 'Invoices' | 'Change Orders';
  filePath?: string;
  fileSize?: number;
  mimeType?: string;
  uploadedBy?: string;
  version?: number;
  isCurrentVersion?: boolean;
  description?: string;
  tags?: string[];
  createdAt: Date;
  updatedAt: Date;
}

interface Project {
  id: string;
  name: string;
}

const CATEGORY_OPTIONS = [
  { value: 'General', label: 'General', color: 'bg-gray-500' },
  { value: 'Contracts', label: 'Contracts', color: 'bg-blue-500' },
  { value: 'Plans', label: 'Plans', color: 'bg-green-500' },
  { value: 'Photos', label: 'Photos', color: 'bg-purple-500' },
  { value: 'Reports', label: 'Reports', color: 'bg-yellow-500' },
  { value: 'Permits', label: 'Permits', color: 'bg-red-500' },
  { value: 'Invoices', label: 'Invoices', color: 'bg-indigo-500' },
  { value: 'Change Orders', label: 'Change Orders', color: 'bg-pink-500' }
];

export default function Documents() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDocument, setEditingDocument] = useState<Document | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  
  const [newDocument, setNewDocument] = useState({
    projectId: '',
    name: '',
    category: 'General' as Document['category'],
    description: '',
    tags: [] as string[],
    tagInput: ''
  });

  useEffect(() => {
    fetchDocuments();
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    }
  };

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const mappedDocuments = (data || []).map(doc => ({
        id: doc.id,
        projectId: doc.project_id,
        name: doc.name,
        category: doc.category as Document['category'],
        filePath: doc.file_path,
        fileSize: doc.file_size,
        mimeType: doc.mime_type,
        uploadedBy: doc.uploaded_by,
        version: doc.version,
        isCurrentVersion: doc.is_current_version,
        description: doc.description,
        tags: doc.tags || [],
        createdAt: new Date(doc.created_at),
        updatedAt: new Date(doc.updated_at)
      }));

      setDocuments(mappedDocuments);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const saveDocument = async () => {
    if (!newDocument.name) {
      toast.error('Please enter a document name');
      return;
    }

    try {
      const documentData = {
        project_id: newDocument.projectId || null,
        name: newDocument.name,
        category: newDocument.category,
        description: newDocument.description || null,
        tags: newDocument.tags.length > 0 ? newDocument.tags : null,
        version: 1,
        is_current_version: true
      };

      if (editingDocument) {
        const { error } = await supabase
          .from('documents')
          .update({
            ...documentData,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingDocument.id);

        if (error) throw error;
        toast.success('Document updated successfully');
      } else {
        const { error } = await supabase
          .from('documents')
          .insert(documentData);

        if (error) throw error;
        toast.success('Document created successfully');
      }

      setDialogOpen(false);
      setEditingDocument(null);
      resetForm();
      fetchDocuments();
    } catch (error) {
      console.error('Error saving document:', error);
      toast.error('Failed to save document');
    }
  };

  const deleteDocument = async (id: string) => {
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Document deleted successfully');
      fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  const editDocument = (document: Document) => {
    setEditingDocument(document);
    setNewDocument({
      projectId: document.projectId || '',
      name: document.name,
      category: document.category,
      description: document.description || '',
      tags: document.tags || [],
      tagInput: ''
    });
    setDialogOpen(true);
  };

  const resetForm = () => {
    setNewDocument({
      projectId: '',
      name: '',
      category: 'General',
      description: '',
      tags: [],
      tagInput: ''
    });
  };

  const addTag = () => {
    if (newDocument.tagInput.trim() && !newDocument.tags.includes(newDocument.tagInput.trim())) {
      setNewDocument({
        ...newDocument,
        tags: [...newDocument.tags, newDocument.tagInput.trim()],
        tagInput: ''
      });
    }
  };

  const removeTag = (tagToRemove: string) => {
    setNewDocument({
      ...newDocument,
      tags: newDocument.tags.filter(tag => tag !== tagToRemove)
    });
  };

  const handleTagInputKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  const getCategoryColor = (category: string) => {
    return CATEGORY_OPTIONS.find(c => c.value === category)?.color || 'bg-gray-500';
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return 'Unknown';
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  // Filter documents based on search and filters
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (doc.description && doc.description.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (doc.tags && doc.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase())));
    
    const matchesCategory = !selectedCategory || doc.category === selectedCategory;
    const matchesProject = !selectedProject || doc.projectId === selectedProject;
    
    return matchesSearch && matchesCategory && matchesProject;
  });

  const documentsByCategory = CATEGORY_OPTIONS.map(category => ({
    ...category,
    count: documents.filter(doc => doc.category === category.value).length
  }));

  return (
    <Layout title="Documents" subtitle="Manage project documents and files">
      <div className="space-y-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Documents</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{documents.length}</div>
            </CardContent>
          </Card>

          {documentsByCategory.slice(0, 3).map(category => (
            <Card key={category.value}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{category.label}</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{category.count}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Filters and Search */}
        <Card>
          <CardHeader>
            <CardTitle>Search & Filter</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="search">Search Documents</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                  <Input
                    id="search"
                    placeholder="Search by name, description, or tags..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="categoryFilter">Category</Label>
                <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="All categories" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {CATEGORY_OPTIONS.map((category) => (
                      <SelectItem key={category.value} value={category.value}>
                        {category.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor="projectFilter">Project</Label>
                <Select value={selectedProject} onValueChange={setSelectedProject}>
                  <SelectTrigger>
                    <SelectValue placeholder="All projects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Projects</SelectItem>
                    {projects.map((project) => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm('');
                    setSelectedCategory('');
                    setSelectedProject('');
                  }}
                  className="w-full"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Documents Management */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Documents ({filteredDocuments.length})</CardTitle>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => {
                  setEditingDocument(null);
                  resetForm();
                }}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Document
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>{editingDocument ? 'Edit Document' : 'Add New Document'}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="name">Document Name *</Label>
                      <Input
                        id="name"
                        value={newDocument.name}
                        onChange={(e) => setNewDocument({ ...newDocument, name: e.target.value })}
                        placeholder="Project Blueprints"
                      />
                    </div>

                    <div>
                      <Label htmlFor="category">Category</Label>
                      <Select value={newDocument.category} onValueChange={(value: Document['category']) => setNewDocument({ ...newDocument, category: value })}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CATEGORY_OPTIONS.map((category) => (
                            <SelectItem key={category.value} value={category.value}>
                              {category.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="project">Project (Optional)</Label>
                    <Select value={newDocument.projectId} onValueChange={(value) => setNewDocument({ ...newDocument, projectId: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select project..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No Project</SelectItem>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      value={newDocument.description}
                      onChange={(e) => setNewDocument({ ...newDocument, description: e.target.value })}
                      placeholder="Document description..."
                      rows={3}
                    />
                  </div>

                  <div>
                    <Label htmlFor="tags">Tags</Label>
                    <div className="flex space-x-2 mb-2">
                      <Input
                        id="tags"
                        value={newDocument.tagInput}
                        onChange={(e) => setNewDocument({ ...newDocument, tagInput: e.target.value })}
                        onKeyPress={handleTagInputKeyPress}
                        placeholder="Add a tag and press Enter"
                      />
                      <Button type="button" variant="outline" onClick={addTag}>
                        Add
                      </Button>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {newDocument.tags.map((tag) => (
                        <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                          {tag} ×
                        </Badge>
                      ))}
                    </div>
                  </div>

                  <Button onClick={saveDocument} className="w-full">
                    {editingDocument ? 'Update Document' : 'Add Document'}
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8">Loading documents...</div>
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                {searchTerm || selectedCategory || selectedProject 
                  ? 'No documents match your search criteria.'
                  : 'No documents found. Add your first document to get started.'
                }
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Tags</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead>Version</TableHead>
                    <TableHead className="w-20">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((document) => (
                    <TableRow key={document.id}>
                      <TableCell>
                        <div>
                          <div className="font-medium">{document.name}</div>
                          {document.description && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {document.description}
                            </div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        {document.projectId 
                          ? projects.find(p => p.id === document.projectId)?.name || 'Unknown'
                          : 'General'
                        }
                      </TableCell>
                      <TableCell>
                        <Badge className={cn("text-white", getCategoryColor(document.category))}>
                          {document.category}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(document.tags || []).slice(0, 2).map((tag) => (
                            <Badge key={tag} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                          {(document.tags || []).length > 2 && (
                            <Badge variant="outline" className="text-xs">
                              +{(document.tags || []).length - 2}
                            </Badge>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">
                          {format(document.createdAt, "MMM dd, yyyy")}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          v{document.version || 1}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <div className="flex space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => editDocument(document)}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => deleteDocument(document.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
