import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { FolderSidebar } from '@/components/documents/FolderSidebar';
import { DocumentUploadDialog } from '@/components/documents/DocumentUploadDialog';
import { DocumentPreviewDialog } from '@/components/documents/DocumentPreviewDialog';
import { DocumentVersionDialog } from '@/components/documents/DocumentVersionDialog';
import { DocumentTemplatesDialog } from '@/components/documents/DocumentTemplatesDialog';
import { DocumentCollaborationDialog } from '@/components/documents/DocumentCollaborationDialog';
import { DocumentFilters } from '@/components/documents/DocumentFilters';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Upload, 
  FileText, 
  MoreHorizontal, 
  Download, 
  Edit, 
  Trash2, 
  Eye,
  Users,
  Clock,
  Grid3X3,
  List,
  Star,
  Archive
} from 'lucide-react';
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
  const [showPreviewDialog, setShowPreviewDialog] = useState(false);
  const [previewDocument, setPreviewDocument] = useState<Document | null>(null);
  const [showVersionDialog, setShowVersionDialog] = useState(false);
  const [versionDocument, setVersionDocument] = useState<Document | null>(null);
  const [showTemplatesDialog, setShowTemplatesDialog] = useState(false);
  const [showCollaborationDialog, setShowCollaborationDialog] = useState(false);
  const [collaborationDocument, setCollaborationDocument] = useState<Document | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('list');
  const [activeTab, setActiveTab] = useState('all');
  
  // Advanced filter states
  const [advancedFilters, setAdvancedFilters] = useState({
    selectedCategory: 'all',
    selectedProject: 'all',
    selectedTags: [] as string[],
    dateRange: {} as { from?: Date; to?: Date },
    fileType: 'all',
    uploadedBy: 'all'
  });

  // Mock data for enhanced features
  const [favoriteDocuments, setFavoriteDocuments] = useState<string[]>([]);
  const [archivedDocuments, setArchivedDocuments] = useState<string[]>([]);

  const availableTags = ['urgent', 'review', 'approved', 'pending', 'contract', 'safety', 'inspection'];
  const uploaders = ['John Smith', 'Sarah Johnson', 'Mike Davis', 'Lisa Chen'];

  useEffect(() => {
    fetchDocuments();
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .is('archived_at', null)
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
      console.log('Fetching documents...');
      
      const { data, error } = await supabase
        .from('documents')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching documents:', error);
        throw error;
      }

      console.log('Documents fetched:', data?.length || 0);

      const mappedDocuments = (data || []).map(doc => ({
        id: doc.id,
        projectId: doc.project_id,
        name: doc.name,
        category: doc.category || 'general',
        filePath: doc.file_path,
        fileSize: doc.file_size,
        mimeType: doc.mime_type,
        uploadedBy: doc.uploaded_by,
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
      console.log('Uploading document:', documentData);
      
      const { error } = await supabase
        .from('documents')
        .insert({
          name: documentData.name,
          description: documentData.description || null,
          category: documentData.folder || 'general',
          project_id: documentData.project_id || null,
          tags: documentData.tags.length > 0 ? documentData.tags : null,
          is_current_version: true
        });

      if (error) {
        console.error('Error inserting document:', error);
        throw error;
      }
      
      toast.success('Document uploaded successfully');
      await fetchDocuments(); // Refresh the document list
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error('Failed to upload document');
    }
  };

  const deleteDocument = async (id: string) => {
    if (!confirm('Are you sure you want to delete this document?')) return;
    
    try {
      const { error } = await supabase
        .from('documents')
        .delete()
        .eq('id', id);

      if (error) throw error;
      toast.success('Document deleted successfully');
      await fetchDocuments();
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error('Failed to delete document');
    }
  };

  const viewDocument = (document: Document) => {
    setPreviewDocument(document);
    setShowPreviewDialog(true);
  };

  const editDocument = (document: Document) => {
    console.log('Editing document:', document.name);
    toast.info(`Edit functionality for ${document.name} coming soon`);
  };

  const downloadDocument = (document: Document) => {
    console.log('Downloading document:', document.name);
    toast.success(`Downloaded ${document.name}`);
  };

  const showVersionHistory = (document: Document) => {
    setVersionDocument(document);
    setShowVersionDialog(true);
  };

  const showCollaboration = (document: Document) => {
    setCollaborationDocument(document);
    setShowCollaborationDialog(true);
  };

  const toggleFavorite = (documentId: string) => {
    setFavoriteDocuments(prev => 
      prev.includes(documentId) 
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId]
    );
  };

  const toggleArchive = (documentId: string) => {
    setArchivedDocuments(prev => 
      prev.includes(documentId) 
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId]
    );
  };

  const handleUseTemplate = (template: any) => {
    console.log('Using template:', template.name);
    toast.success(`Created document from template: ${template.name}`);
    setShowTemplatesDialog(false);
  };

  const clearAllFilters = () => {
    setSearchTerm('');
    setSelectedFolder('all');
    setAdvancedFilters({
      selectedCategory: 'all',
      selectedProject: 'all',
      selectedTags: [],
      dateRange: {},
      fileType: 'all',
      uploadedBy: 'all'
    });
  };

  // Enhanced filtering logic
  const getFilteredDocuments = () => {
    let filtered = documents.filter(doc => {
      const matchesSearch = doc.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           (doc.description && doc.description.toLowerCase().includes(searchTerm.toLowerCase()));
      
      const matchesFolder = selectedFolder === 'all' || 
                           doc.category.toLowerCase().replace(/\s+/g, '-') === selectedFolder;

      const matchesCategory = advancedFilters.selectedCategory === 'all' ||
                             doc.category.toLowerCase().replace(/\s+/g, '-') === advancedFilters.selectedCategory;

      const matchesProject = advancedFilters.selectedProject === 'all' ||
                            (advancedFilters.selectedProject === 'general' && !doc.projectId) ||
                            doc.projectId === advancedFilters.selectedProject;

      const matchesTags = advancedFilters.selectedTags.length === 0 ||
                         advancedFilters.selectedTags.every(tag => doc.tags?.includes(tag));

      const matchesDateRange = (!advancedFilters.dateRange.from || doc.createdAt >= advancedFilters.dateRange.from) &&
                              (!advancedFilters.dateRange.to || doc.createdAt <= advancedFilters.dateRange.to);

      const matchesFileType = advancedFilters.fileType === 'all' || 
                             (doc.mimeType && getFileTypeCategory(doc.mimeType) === advancedFilters.fileType);

      return matchesSearch && matchesFolder && matchesCategory && matchesProject && 
             matchesTags && matchesDateRange && matchesFileType;
    });

    // Apply tab filters
    if (activeTab === 'favorites') {
      filtered = filtered.filter(doc => favoriteDocuments.includes(doc.id));
    } else if (activeTab === 'recent') {
      const oneWeekAgo = new Date();
      oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
      filtered = filtered.filter(doc => doc.createdAt >= oneWeekAgo);
    } else if (activeTab === 'archived') {
      filtered = filtered.filter(doc => archivedDocuments.includes(doc.id));
    } else if (activeTab === 'all') {
      filtered = filtered.filter(doc => !archivedDocuments.includes(doc.id));
    }

    return filtered;
  };

  const getFileTypeCategory = (mimeType: string) => {
    if (mimeType.includes('pdf')) return 'pdf';
    if (mimeType.startsWith('image/')) return 'image';
    if (mimeType.includes('word') || mimeType.includes('document')) return 'doc';
    if (mimeType.includes('sheet') || mimeType.includes('excel')) return 'excel';
    if (mimeType.includes('dwg') || mimeType.includes('cad')) return 'cad';
    if (mimeType.startsWith('video/')) return 'video';
    return 'other';
  };

  const filteredDocuments = getFilteredDocuments();

  return (
    <Layout title="Document Management" subtitle="Store, organize, and share project documents">
      <div className="flex h-[calc(100vh-200px)]">
        <FolderSidebar 
          selectedFolder={selectedFolder}
          onFolderSelect={setSelectedFolder}
          documentCount={documents.length}
        />
        
        <div className="flex-1 p-6 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">
                {selectedFolder === 'all' ? 'All Documents' : 
                 selectedFolder.charAt(0).toUpperCase() + selectedFolder.slice(1).replace('-', ' ')}
              </h1>
            </div>
            <div className="flex items-center space-x-3">
              <Button variant="outline" onClick={() => setShowTemplatesDialog(true)}>
                <FileText className="w-4 h-4 mr-2" />
                Templates
              </Button>
              <Button onClick={() => setShowUploadDialog(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Document
              </Button>
            </div>
          </div>

          {/* Enhanced Filters */}
          <div className="mb-6">
            <DocumentFilters
              searchTerm={searchTerm}
              onSearchChange={setSearchTerm}
              selectedCategory={advancedFilters.selectedCategory}
              onCategoryChange={(value) => setAdvancedFilters(prev => ({ ...prev, selectedCategory: value }))}
              selectedProject={advancedFilters.selectedProject}
              onProjectChange={(value) => setAdvancedFilters(prev => ({ ...prev, selectedProject: value }))}
              selectedTags={advancedFilters.selectedTags}
              onTagsChange={(tags) => setAdvancedFilters(prev => ({ ...prev, selectedTags: tags }))}
              dateRange={advancedFilters.dateRange}
              onDateRangeChange={(range) => setAdvancedFilters(prev => ({ ...prev, dateRange: range }))}
              fileType={advancedFilters.fileType}
              onFileTypeChange={(value) => setAdvancedFilters(prev => ({ ...prev, fileType: value }))}
              uploadedBy={advancedFilters.uploadedBy}
              onUploadedByChange={(value) => setAdvancedFilters(prev => ({ ...prev, uploadedBy: value }))}
              onClearFilters={clearAllFilters}
              projects={projects}
              availableTags={availableTags}
              uploaders={uploaders}
            />
          </div>

          {/* Tabs and View Controls */}
          <div className="flex items-center justify-between mb-4">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="all">All ({documents.filter(d => !archivedDocuments.includes(d.id)).length})</TabsTrigger>
                <TabsTrigger value="favorites">
                  <Star className="w-4 h-4 mr-1" />
                  Favorites ({favoriteDocuments.length})
                </TabsTrigger>
                <TabsTrigger value="recent">Recent</TabsTrigger>
                <TabsTrigger value="archived">
                  <Archive className="w-4 h-4 mr-1" />
                  Archived ({archivedDocuments.length})
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="flex items-center gap-2">
              <div className="flex border rounded">
                <Button
                  variant={viewMode === 'list' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('list')}
                >
                  <List className="w-4 h-4" />
                </Button>
                <Button
                  variant={viewMode === 'grid' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => setViewMode('grid')}
                >
                  <Grid3X3 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>

          {/* Documents Content */}
          <div className="flex-1 overflow-hidden">
            <Card className="h-full">
              <CardContent className="p-0 h-full">
                {loading ? (
                  <div className="text-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-2"></div>
                    Loading documents...
                  </div>
                ) : filteredDocuments.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-gray-900 mb-2">No documents found</h3>
                    <p className="text-gray-500 mb-4">
                      {documents.length === 0 ? 'Upload documents to get started' : 'Try adjusting your filters'}
                    </p>
                    {documents.length === 0 && (
                      <Button onClick={() => setShowUploadDialog(true)}>
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Document
                      </Button>
                    )}
                  </div>
                ) : viewMode === 'list' ? (
                  <div className="h-full overflow-auto">
                    <Table>
                      <TableHeader className="sticky top-0 bg-white z-10">
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Project</TableHead>
                          <TableHead>Category</TableHead>
                          <TableHead>Tags</TableHead>
                          <TableHead>Created</TableHead>
                          <TableHead className="w-12"></TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredDocuments.map((document) => (
                          <TableRow key={document.id} className="hover:bg-gray-50">
                            <TableCell>
                              <div className="flex items-center gap-2">
                                {favoriteDocuments.includes(document.id) && (
                                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                                )}
                                <div>
                                  <div className="font-medium">{document.name}</div>
                                  {document.description && (
                                    <div className="text-sm text-gray-500 truncate max-w-xs">
                                      {document.description}
                                    </div>
                                  )}
                                </div>
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
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="sm">
                                    <MoreHorizontal className="w-4 h-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="bg-white border shadow-lg z-50">
                                  <DropdownMenuItem onClick={() => viewDocument(document)} className="cursor-pointer">
                                    <Eye className="w-4 h-4 mr-2" />
                                    Preview
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => editDocument(document)} className="cursor-pointer">
                                    <Edit className="w-4 h-4 mr-2" />
                                    Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => showVersionHistory(document)} className="cursor-pointer">
                                    <Clock className="w-4 h-4 mr-2" />
                                    Versions
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => showCollaboration(document)} className="cursor-pointer">
                                    <Users className="w-4 h-4 mr-2" />
                                    Share
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => downloadDocument(document)} className="cursor-pointer">
                                    <Download className="w-4 h-4 mr-2" />
                                    Download
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => toggleFavorite(document.id)} className="cursor-pointer">
                                    <Star className="w-4 h-4 mr-2" />
                                    {favoriteDocuments.includes(document.id) ? 'Remove from Favorites' : 'Add to Favorites'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => toggleArchive(document.id)} className="cursor-pointer">
                                    <Archive className="w-4 h-4 mr-2" />
                                    {archivedDocuments.includes(document.id) ? 'Unarchive' : 'Archive'}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem 
                                    className="text-red-600 cursor-pointer"
                                    onClick={() => deleteDocument(document.id)}
                                  >
                                    <Trash2 className="w-4 h-4 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <div className="p-6 h-full overflow-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                      {filteredDocuments.map((document) => (
                        <Card key={document.id} className="hover:shadow-md transition-shadow cursor-pointer">
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between mb-3">
                              <FileText className="w-8 h-8 text-blue-500 flex-shrink-0" />
                              <div className="flex gap-1">
                                {favoriteDocuments.includes(document.id) && (
                                  <Star className="w-4 h-4 text-yellow-500 fill-current" />
                                )}
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm">
                                      <MoreHorizontal className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="bg-white border shadow-lg z-50">
                                    <DropdownMenuItem onClick={() => viewDocument(document)} className="cursor-pointer">
                                      <Eye className="w-4 h-4 mr-2" />
                                      Preview
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => editDocument(document)} className="cursor-pointer">
                                      <Edit className="w-4 h-4 mr-2" />
                                      Edit
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => downloadDocument(document)} className="cursor-pointer">
                                      <Download className="w-4 h-4 mr-2" />
                                      Download
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onClick={() => toggleFavorite(document.id)} className="cursor-pointer">
                                      <Star className="w-4 h-4 mr-2" />
                                      {favoriteDocuments.includes(document.id) ? 'Remove Favorite' : 'Add Favorite'}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem 
                                      className="text-red-600 cursor-pointer"
                                      onClick={() => deleteDocument(document.id)}
                                    >
                                      <Trash2 className="w-4 h-4 mr-2" />
                                      Delete
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </div>
                            
                            <h3 className="font-semibold text-sm mb-2 line-clamp-2">{document.name}</h3>
                            
                            {document.description && (
                              <p className="text-xs text-gray-600 mb-3 line-clamp-2">
                                {document.description}
                              </p>
                            )}
                            
                            <div className="space-y-2">
                              <Badge variant="secondary" className="text-xs">
                                {document.category}
                              </Badge>
                              
                              {document.tags && document.tags.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {document.tags.slice(0, 2).map((tag) => (
                                    <Badge key={tag} variant="outline" className="text-xs">
                                      {tag}
                                    </Badge>
                                  ))}
                                  {document.tags.length > 2 && (
                                    <Badge variant="outline" className="text-xs">
                                      +{document.tags.length - 2}
                                    </Badge>
                                  )}
                                </div>
                              )}
                              
                              <div className="text-xs text-gray-500">
                                {format(document.createdAt, "MMM dd, yyyy")}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <DocumentUploadDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        onUpload={handleUpload}
        projects={projects}
      />

      <DocumentPreviewDialog
        document={previewDocument}
        open={showPreviewDialog}
        onOpenChange={setShowPreviewDialog}
        onEdit={editDocument}
        onDownload={downloadDocument}
      />

      <DocumentVersionDialog
        open={showVersionDialog}
        onOpenChange={setShowVersionDialog}
        documentName={versionDocument?.name || ''}
        versions={[]} // Removed mock versions
        onUploadNewVersion={() => toast.info('Upload new version functionality coming soon')}
        onRestoreVersion={(versionId) => toast.success('Version restored successfully')}
        onDownloadVersion={(versionId) => toast.success('Version downloaded')}
        onPreviewVersion={(versionId) => toast.info('Version preview opened')}
      />

      <DocumentTemplatesDialog
        open={showTemplatesDialog}
        onOpenChange={setShowTemplatesDialog}
        onUseTemplate={handleUseTemplate}
      />

      <DocumentCollaborationDialog
        open={showCollaborationDialog}
        onOpenChange={setShowCollaborationDialog}
        documentName={collaborationDocument?.name || ''}
        collaborators={[]} // Removed mock collaborators
        comments={[]} // Removed mock comments
        activities={[]} // Removed mock activities
        onAddCollaborator={(email, role) => toast.success(`Added ${email} as ${role}`)}
        onRemoveCollaborator={(id) => toast.success('Collaborator removed')}
        onUpdateRole={(id, role) => toast.success(`Role updated to ${role}`)}
        onAddComment={(content) => toast.success('Comment added')}
        onResolveComment={(id) => toast.success('Comment resolved')}
      />
    </Layout>
  );
}
