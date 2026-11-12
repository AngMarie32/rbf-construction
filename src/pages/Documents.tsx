import { sortProjectsOpenFirst } from '@/utils/projectOrder';
import { useState, useEffect } from 'react';
import { EmptyState } from '@/components/ui/empty-state';
import { DataTable, type DataTableColumn } from '@/components/ui/data-table';
import { Layout } from '@/components/layout/Layout';
import { FolderSidebar } from '@/components/documents/FolderSidebar';
import { DocumentUploadDialog } from '@/components/documents/DocumentUploadDialog';
import { DocumentEditDialog, type DocumentEditValues } from '@/components/documents/DocumentEditDialog';
import { DocumentPreviewDialog } from '@/components/documents/DocumentPreviewDialog';
import { DocumentTemplatesDialog } from '@/components/documents/DocumentTemplatesDialog';
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
import { PageHero, heroButton, heroButtonPrimary } from '@/components/ui/page-hero';
import { AccentStat } from '@/components/ui/accent-stat';
import { FileWarning } from 'lucide-react';
import { DOCUMENTS_BUCKET, bucketFor, documentUrl, safeFileName } from '@/lib/documentFiles';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

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
  sourceType?: string | null;
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
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [documentToEdit, setDocumentToEdit] = useState<Document | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Document | null>(null);
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
    selectedProject: new URLSearchParams(window.location.search).get('project') || 'all',
    selectedTags: [] as string[],
    dateRange: {} as { from?: Date; to?: Date },
    fileType: 'all',
    uploadedBy: 'all'
  });

  // Mock data for enhanced features
  const [favoriteDocuments, setFavoriteDocuments] = useState<string[]>([]);
  const [archivedDocuments, setArchivedDocuments] = useState<string[]>([]);

  const availableTags = ['urgent', 'review', 'approved', 'pending', 'contract', 'safety', 'inspection'];
  const uploaders: string[] = [];

  useEffect(() => {
    fetchDocuments();
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, status')
        .is('archived_at', null)
        .order('name');

      if (error) throw error;
      setProjects(sortProjectsOpenFirst(data || []));
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
        updatedAt: new Date(doc.updated_at),
        sourceType: doc.source_type,
      }));

      setDocuments(mappedDocuments);
      // Favorites and archive are stored on the record (falls back to this session if the column isn't there yet)
      if ((data || []).some((d: any) => 'is_favorite' in d)) {
        setFavoriteDocuments((data || []).filter((d: any) => d.is_favorite).map((d: any) => d.id));
        setArchivedDocuments((data || []).filter((d: any) => d.archived_at).map((d: any) => d.id));
      }
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast.error('Failed to load documents');
    } finally {
      setLoading(false);
    }
  };

  const handleUpload = async (documentData: any) => {
    const file: File | undefined = documentData.file;
    try {
      const { data: auth } = await supabase.auth.getUser();
      let filePath: string | null = null;
      if (file) {
        filePath = `${documentData.project_id || 'general'}/${Date.now()}-${safeFileName(file.name)}`;
        const { error: upErr } = await supabase.storage.from(DOCUMENTS_BUCKET).upload(filePath, file, { contentType: file.type || undefined });
        if (upErr) {
          throw new Error(
            /bucket/i.test(upErr.message)
              ? 'Document storage is not set up yet. Ask an admin to run the "project documents storage" database update.'
              : `The file didn't upload: ${upErr.message}`
          );
        }
      }
      const { error } = await supabase.from('documents').insert({
        name: documentData.name,
        description: documentData.description || null,
        category: documentData.folder || 'general',
        project_id: documentData.project_id || null,
        tags: documentData.tags.length > 0 ? documentData.tags : null,
        file_path: filePath,
        file_size: file?.size ?? null,
        mime_type: file?.type || null,
        uploaded_by: auth?.user?.id ?? null,
        is_current_version: true,
      });
      if (error) {
        if (filePath) await supabase.storage.from(DOCUMENTS_BUCKET).remove([filePath]);
        throw error;
      }
      toast.success(`${documentData.name} uploaded`);
      await fetchDocuments();
    } catch (error) {
      console.error('Error uploading document:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload document');
    }
  };

  const deleteDocument = async (document: Document) => {
    setDeletingId(document.id);
    try {
      const { error, count } = await supabase
        .from('documents')
        .delete({ count: 'exact' })
        .eq('id', document.id);

      if (error) throw error;
      if (count === 0) throw new Error('The document was not deleted. You may not have permission to delete it.');
      if (document.filePath && bucketFor(document) === DOCUMENTS_BUCKET) {
        await supabase.storage.from(DOCUMENTS_BUCKET).remove([document.filePath]);
      }

      setDocuments((current) => current.filter((item) => item.id !== document.id));
      setFavoriteDocuments((current) => current.filter((id) => id !== document.id));
      setArchivedDocuments((current) => current.filter((id) => id !== document.id));
      if (previewDocument?.id === document.id) setShowPreviewDialog(false);
      if (documentToEdit?.id === document.id) setShowEditDialog(false);
      toast.success(`${document.name} deleted`);
    } catch (error) {
      console.error('Error deleting document:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to delete document');
    } finally {
      setDeletingId(null);
    }
  };

  const viewDocument = (document: Document) => {
    setPreviewDocument(document);
    setShowPreviewDialog(true);
  };

  const editDocument = (document: Document) => {
    setShowPreviewDialog(false);
    setDocumentToEdit(document);
    setShowEditDialog(true);
  };

  const updateDocument = async (values: DocumentEditValues) => {
    if (!documentToEdit) return;

    const { data, error } = await supabase
      .from('documents')
      .update({
        name: values.name,
        description: values.description || null,
        category: values.category,
        project_id: values.projectId,
        tags: values.tags.length ? values.tags : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', documentToEdit.id)
      .select('id')
      .maybeSingle();

    if (error) throw error;
    if (!data) throw new Error('The document was not updated. You may not have permission to edit it.');

    toast.success('Document updated');
    await fetchDocuments();
  };

  const downloadDocument = async (document: Document) => {
    if (!document.filePath) {
      toast.error(`${document.name} has no file attached. Upload it again to keep a copy.`);
      return;
    }
    try {
      const ext = document.filePath.match(/\.[a-z0-9]+$/i)?.[0] || '';
      const url = await documentUrl(document, { download: /\.[a-z0-9]+$/i.test(document.name) ? document.name : `${document.name}${ext}` });
      if (!url) return;
      const a = window.document.createElement('a');
      a.href = url;
      a.rel = 'noopener';
      window.document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e: any) {
      toast.error(`Couldn't download ${document.name}: ${e.message || 'file not found'}`);
    }
  };

  const showVersionHistory = (document: Document) => {
    setVersionDocument(document);
    setShowVersionDialog(true);
  };

  const showCollaboration = (document: Document) => {
    setCollaborationDocument(document);
    setShowCollaborationDialog(true);
  };

  const persist = async (documentId: string, patch: Record<string, unknown>) => {
    const { error } = await supabase.from('documents').update(patch as any).eq('id', documentId);
    if (error && /column|schema cache/i.test(error.message)) {
      toast.message('Saved for this session only', { description: 'Favorites and archive need the "project documents storage" database update to be remembered.' });
    } else if (error) {
      toast.error(error.message);
    }
  };

  const toggleFavorite = (documentId: string) => {
    const on = !favoriteDocuments.includes(documentId);
    setFavoriteDocuments((prev) => (on ? [...prev, documentId] : prev.filter((id) => id !== documentId)));
    persist(documentId, { is_favorite: on });
  };

  const toggleArchive = (documentId: string) => {
    const on = !archivedDocuments.includes(documentId);
    setArchivedDocuments((prev) => (on ? [...prev, documentId] : prev.filter((id) => id !== documentId)));
    persist(documentId, { archived_at: on ? new Date().toISOString() : null });
    toast.success(on ? 'Archived' : 'Restored');
  };

  const handleUseTemplate = (template: any) => {
    setShowTemplatesDialog(false);
    setShowUploadDialog(true);
    toast.message(`Upload your filled-in "${template.name}"`, { description: 'Templates are starting points. Fill one in, then upload it here.' });
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
  const docStats = (() => {
    const active = documents.filter((d) => !archivedDocuments.includes(d.id));
    const weekAgo = Date.now() - 7 * 86400000;
    return {
      active: active.length,
      bytes: active.reduce((s, d) => s + (d.fileSize || 0), 0),
      week: active.filter((d) => d.createdAt.getTime() >= weekAgo).length,
      noFile: active.filter((d) => !d.filePath).length,
      projects: new Set(active.map((d) => d.projectId).filter(Boolean)).size,
    };
  })();


  const projectName = (id?: string) => (id ? projects.find((p) => p.id === id)?.name || 'Unknown' : 'General');
  const fileSize = (b?: number) => (!b ? '—' : b > 1048576 ? `${(b / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

  const docColumns: DataTableColumn<Document>[] = [
    {
      id: 'name',
      header: 'Name',
      value: (d) => d.name,
      cell: (d) => (
        <button type="button" onClick={() => viewDocument(d)} className="flex items-center gap-3 text-left">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <FileText className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="flex items-center gap-1.5 font-medium hover:text-primary">
              {favoriteDocuments.includes(d.id) && <Star className="h-3.5 w-3.5 fill-current text-yellow-500" />}
              <span className="truncate max-w-[260px]">{d.name}</span>
            </span>
            {d.description && <span className="block max-w-xs truncate text-xs text-muted-foreground">{d.description}</span>}
          </span>
        </button>
      ),
    },
    { id: 'project', header: 'Project', value: (d) => projectName(d.projectId), cell: (d) => projectName(d.projectId) },
    { id: 'category', header: 'Category', value: (d) => d.category, cell: (d) => <Badge variant="secondary">{d.category}</Badge> },
    {
      id: 'tags',
      header: 'Tags',
      value: (d) => (d.tags || []).join(', '),
      cell: (d) => (
        <div className="flex flex-wrap gap-1">
          {(d.tags || []).slice(0, 2).map((tag) => <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>)}
          {(d.tags || []).length > 2 && <Badge variant="outline" className="text-xs">+{(d.tags || []).length - 2}</Badge>}
        </div>
      ),
    },
    {
      id: 'size',
      header: 'Size',
      align: 'right',
      value: (d) => d.fileSize || 0,
      cell: (d) => (d.filePath ? <span className="text-muted-foreground">{fileSize(d.fileSize)}</span> : <Badge variant="warning">No file</Badge>),
    },
    { id: 'created', header: 'Added', value: (d) => d.createdAt, cell: (d) => <span className="whitespace-nowrap">{format(d.createdAt, 'MMM d, yyyy')}</span> },
    {
      id: 'actions',
      header: '',
      align: 'right',
      cell: (d) => (
        <div className="flex justify-end gap-0.5">
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Download" aria-label={`Download ${d.name}`} onClick={() => downloadDocument(d)}>
            <Download className="w-4 h-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" title="Edit" aria-label={`Edit ${d.name}`} onClick={() => editDocument(d)}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive"
            title="Delete"
            aria-label={`Delete ${d.name}`}
            disabled={deletingId === d.id}
            onClick={() => setConfirmDelete(d)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="More actions"><MoreHorizontal className="w-4 h-4" /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => viewDocument(d)}><Eye className="w-4 h-4 mr-2" />Preview</DropdownMenuItem>
              <DropdownMenuItem onClick={() => editDocument(d)}><Edit className="w-4 h-4 mr-2" />Edit</DropdownMenuItem>
              <DropdownMenuItem onClick={() => downloadDocument(d)}><Download className="w-4 h-4 mr-2" />Download</DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleFavorite(d.id)}>
                <Star className="w-4 h-4 mr-2" />{favoriteDocuments.includes(d.id) ? 'Remove from favorites' : 'Add to favorites'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toggleArchive(d.id)}>
                <Archive className="w-4 h-4 mr-2" />{archivedDocuments.includes(d.id) ? 'Unarchive' : 'Archive'}
              </DropdownMenuItem>
              <DropdownMenuItem className="text-destructive" onClick={() => setConfirmDelete(d)}>
                <Trash2 className="w-4 h-4 mr-2" />Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ),
    },
  ];

  return (
    <Layout hideTitle title="Documents">
      <div className="space-y-6">
      <PageHero
        eyebrow="Project management"
        title="Documents"
        subtitle="Contracts, drawings, permits, insurance and photos, filed by project so the office and the field see the latest version."
        actions={
          <>
            <button type="button" className={heroButtonPrimary} onClick={() => setShowUploadDialog(true)}>
              <Upload className="h-4 w-4" /> Upload document
            </button>
            <button type="button" className={heroButton} onClick={() => setShowTemplatesDialog(true)}>
              <FileText className="h-4 w-4" /> Templates
            </button>
          </>
        }
        stats={[
          { label: 'Documents', value: loading ? '…' : String(docStats.active) },
          { label: 'Storage used', value: loading ? '…' : fileSize(docStats.bytes) },
        ]}
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <AccentStat label="Documents" value={docStats.active} icon={FileText} accent="blue" loading={loading} hint={`${docStats.projects} project${docStats.projects === 1 ? '' : 's'}`} />
        <AccentStat label="Added this week" value={docStats.week} icon={Upload} accent="emerald" loading={loading} hint="Last 7 days" />
        <button type="button" className="rounded-xl text-left" onClick={() => setActiveTab(activeTab === 'favorites' ? 'all' : 'favorites')}>
          <AccentStat label="Favorites" value={favoriteDocuments.length} icon={Star} accent="amber" loading={loading} hint="Click to show" />
        </button>
        <AccentStat
          label="Missing a file"
          value={docStats.noFile}
          icon={FileWarning}
          accent="rose"
          tone={docStats.noFile ? 'warn' : undefined}
          loading={loading}
          hint="Saved before uploads stored files"
        />
      </div>

      <div className="flex h-[calc(100vh-200px)] min-h-[560px] overflow-hidden rounded-xl border bg-card">
        <FolderSidebar
          selectedFolder={selectedFolder}
          onFolderSelect={setSelectedFolder}
          documentCount={documents.length}
        />

        <div className="flex-1 min-w-0 p-4 sm:p-6 overflow-hidden flex flex-col">
          <h2 className="mb-4 text-lg font-semibold">
            {selectedFolder === 'all' ? 'All documents' : selectedFolder.charAt(0).toUpperCase() + selectedFolder.slice(1).replace('-', ' ')}
          </h2>

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
                  <EmptyState
                    className="m-4"
                    icon={FileText}
                    filtered={documents.length > 0}
                    title="Upload your first document"
                    description="Store contracts, drawings, permits, insurance certificates and photos by project, so the office and the field always have the latest version."
                    action={{ label: 'Upload your first document', icon: Upload, onClick: () => setShowUploadDialog(true) }}
                  />
                ) : viewMode === 'list' ? (
                  <DataTable
                    className="rounded-none border-0"
                    columns={docColumns}
                    rows={filteredDocuments}
                    totalCount={documents.length}
                    getRowId={(d) => d.id}
                    searchable={false}
                    exportFilename="documents"
                    initialSort={{ id: 'created', desc: true }}
                  />
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
                                  <DropdownMenuContent align="end" className="bg-card border shadow-lg z-50">
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
                                      onClick={() => setConfirmDelete(document)}
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
                              <p className="text-xs text-muted-foreground mb-3 line-clamp-2">
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

                              <div className="text-xs text-muted-foreground">
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

      </div>

      {/* Dialogs */}
      <DocumentUploadDialog
        open={showUploadDialog}
        onOpenChange={setShowUploadDialog}
        onUpload={handleUpload}
        projects={projects}
      />

      <DocumentEditDialog
        document={documentToEdit}
        open={showEditDialog}
        onOpenChange={setShowEditDialog}
        onSave={updateDocument}
        projects={projects}
      />

      <DocumentPreviewDialog
        document={previewDocument}
        open={showPreviewDialog}
        onOpenChange={setShowPreviewDialog}
        onEdit={editDocument}
        onDownload={downloadDocument}
      />

      <DocumentTemplatesDialog
        open={showTemplatesDialog}
        onOpenChange={setShowTemplatesDialog}
        onUseTemplate={handleUseTemplate}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {confirmDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>The record and its file are removed permanently. To keep it out of the way instead, archive it.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (confirmDelete) deleteDocument(confirmDelete);
                setConfirmDelete(null);
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Layout>
  );
}
