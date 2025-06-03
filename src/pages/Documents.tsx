
import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { FolderSidebar } from '@/components/documents/FolderSidebar';
import { DocumentUploadDialog } from '@/components/documents/DocumentUploadDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Upload, Search, Filter, FileText, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Document {
  id: string;
  projectId?: string;
  name: string;
  category: string;
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

export default function Documents() {
  const [documents, setDocuments] = useState<Document[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showUploadDialog, setShowUploadDialog] = useState(false);

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
        category: doc.category || 'General',
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

  const handleUpload = async (documentData: any) => {
    try {
      const { error } = await supabase
        .from('documents')
        .insert({
          name: documentData.name,
          description: documentData.description || null,
          category: documentData.folder || 'General',
          project_id: documentData.project_id || null,
          tags: documentData.tags.length > 0 ? documentData.tags : null,
          version: 1,
          is_current_version: true
        });

      if (error) throw error;
      toast.success('Document uploaded successfully');
      fetchDocuments();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document');
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

  // Filter documents based on search and selected folder
  const filteredDocuments = documents.filter(doc => {
    const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (doc.description && doc.description.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFolder = selectedFolder === 'all' || 
                         doc.category.toLowerCase().replace(/\s+/g, '-') === selectedFolder;
    
    return matchesSearch && matchesFolder;
  });

  return (
    <Layout title="Document Management" subtitle="Store, organize, and share project documents">
      <div className="flex h-[calc(100vh-200px)]">
        <FolderSidebar 
          selectedFolder={selectedFolder}
          onFolderSelect={setSelectedFolder}
          documentCount={documents.length}
        />
        
        <div className="flex-1 p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">
                {selectedFolder === 'all' ? 'All Documents' : 
                 selectedFolder.charAt(0).toUpperCase() + selectedFolder.slice(1).replace('-', ' ')}
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              <Button onClick={() => setShowUploadDialog(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Document
              </Button>
            </div>
          </div>

          {/* Search and Filter */}
          <div className="flex items-center space-x-4 mb-6">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search documents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" size="sm">
              <Filter className="w-4 h-4 mr-2" />
              Filter
            </Button>
          </div>

          {/* Documents Content */}
          <Card>
            <CardContent className="p-0">
              {loading ? (
                <div className="text-center py-12">Loading documents...</div>
              ) : filteredDocuments.length === 0 ? (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
                  <p className="text-gray-500 mb-4">Upload documents to get started</p>
                  <Button onClick={() => setShowUploadDialog(true)}>
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Document
                  </Button>
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
                      <TableHead className="w-12"></TableHead>
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
                          <Badge variant="secondary">
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
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreHorizontal className="w-4 h-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>View</DropdownMenuItem>
                              <DropdownMenuItem>Edit</DropdownMenuItem>
                              <DropdownMenuItem>Download</DropdownMenuItem>
                              <DropdownMenuItem 
                                className="text-red-600"
                                onClick={() => deleteDocument(document.id)}
                              >
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      <DocumentUploadDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        onUpload={handleUpload}
        projects={projects}
      />
    </Layout>
  );
}
