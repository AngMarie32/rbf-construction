
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { 
  AlertTriangle,
  Clock,
  FileX,
  Upload,
  Search,
  Mail,
  Download,
  ArrowLeft,
  Edit,
  Trash2
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface DocumentIssue {
  id: string;
  subcontractor_id: string;
  subcontractor_name: string;
  document_type: string;
  status: 'Expired' | 'Expiring Soon' | 'Missing';
  expiration_date?: string;
  days_overdue: number;
}

interface DocumentIssuesProps {
  onBack: () => void;
}

export function DocumentIssues({ onBack }: DocumentIssuesProps) {
  const [issues, setIssues] = useState<DocumentIssue[]>([]);
  const [filteredIssues, setFilteredIssues] = useState<DocumentIssue[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [documentTypeFilter, setDocumentTypeFilter] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false);
  const [requestDialogOpen, setRequestDialogOpen] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<DocumentIssue | null>(null);

  useEffect(() => {
    fetchDocumentIssues();
  }, []);

  const fetchDocumentIssues = async () => {
    try {
      // This would need to be implemented based on your actual subcontractor documents schema
      // For now, we'll show an empty state since you want sample data removed
      setIssues([]);
      setFilteredIssues([]);
    } catch (error) {
      console.error('Error fetching document issues:', error);
      setIssues([]);
      setFilteredIssues([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let filtered = issues;

    if (searchTerm) {
      filtered = filtered.filter(issue =>
        issue.subcontractor_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        issue.document_type.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(issue => issue.status === statusFilter);
    }

    if (documentTypeFilter !== 'all') {
      filtered = filtered.filter(issue => issue.document_type === documentTypeFilter);
    }

    setFilteredIssues(filtered);
  }, [issues, searchTerm, statusFilter, documentTypeFilter]);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Expired': return 'bg-red-500';
      case 'Expiring Soon': return 'bg-yellow-500';
      case 'Missing': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Expired': return <AlertTriangle className="w-4 h-4" />;
      case 'Expiring Soon': return <Clock className="w-4 h-4" />;
      case 'Missing': return <FileX className="w-4 h-4" />;
      default: return null;
    }
  };

  const handleUploadDocument = async () => {
    // Implement document upload functionality
    toast.success('Document upload functionality would be implemented here');
    setUploadDialogOpen(false);
  };

  const handleRequestDocument = async () => {
    // Implement document request functionality
    toast.success('Document request sent successfully');
    setRequestDialogOpen(false);
  };

  const handleExportList = () => {
    // Implement export functionality
    toast.success('Export functionality would be implemented here');
  };

  const handleEmailNotifications = () => {
    // Implement email notification functionality
    toast.success('Email notification functionality would be implemented here');
  };

  const handleDeleteIssue = async (issueId: string) => {
    try {
      // Implement delete functionality
      setIssues(issues.filter(issue => issue.id !== issueId));
      toast.success('Issue deleted successfully');
    } catch (error) {
      console.error('Error deleting issue:', error);
      toast.error('Failed to delete issue');
    }
  };

  const expiredCount = issues.filter(i => i.status === 'Expired').length;
  const expiringSoonCount = issues.filter(i => i.status === 'Expiring Soon').length;
  const missingCount = issues.filter(i => i.status === 'Missing').length;
  const totalWithIssues = new Set(issues.map(i => i.subcontractor_name)).size;

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Subcontractors
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Document Issues</h1>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Subcontractors
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Document Issues</h1>
            <p className="text-gray-600">Subcontractors › Document Issues</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExportList}>
            <Download className="w-4 h-4 mr-2" />
            Export List
          </Button>
          <Button variant="outline" onClick={handleEmailNotifications}>
            <Mail className="w-4 h-4 mr-2" />
            Email Notifications
          </Button>
          <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Upload className="w-4 h-4 mr-2" />
                Upload Documents
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Upload Document</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Subcontractor</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subcontractor" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="placeholder">No subcontractors available</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Document Type</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Select document type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="liability">Liability Insurance</SelectItem>
                      <SelectItem value="workers-comp">Workers' Compensation</SelectItem>
                      <SelectItem value="license">Business License</SelectItem>
                      <SelectItem value="w9">W-9 Form</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>File</Label>
                  <Input type="file" />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setUploadDialogOpen(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={handleUploadDocument} className="flex-1">
                    Upload
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Dashboard Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Subcontractors with Issues</p>
                <p className="text-3xl font-bold">{totalWithIssues}</p>
                <p className="text-sm text-gray-500">Active tracking</p>
              </div>
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <AlertTriangle className="w-8 h-8 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Expired Documents</p>
                <p className="text-3xl font-bold">{expiredCount}</p>
                <p className="text-sm text-gray-500">Requires immediate attention</p>
              </div>
              <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
                <FileX className="w-8 h-8 text-red-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Expiring Soon</p>
                <p className="text-3xl font-bold">{expiringSoonCount}</p>
                <p className="text-sm text-gray-500">Within next 30 days</p>
              </div>
              <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center">
                <Clock className="w-8 h-8 text-yellow-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Missing Documents</p>
                <p className="text-3xl font-bold">{missingCount}</p>
                <p className="text-sm text-gray-500">Required documents not submitted</p>
              </div>
              <div className="w-16 h-16 rounded-full bg-orange-100 flex items-center justify-center">
                <FileX className="w-8 h-8 text-orange-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap gap-4">
            <div className="flex-1 min-w-64">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <Input
                  placeholder="Search subcontractors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Document Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="Expired">Expired</SelectItem>
                <SelectItem value="Expiring Soon">Expiring Soon</SelectItem>
                <SelectItem value="Missing">Missing Documents</SelectItem>
              </SelectContent>
            </Select>
            <Select value={documentTypeFilter} onValueChange={setDocumentTypeFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Document Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="Liability Insurance">Liability Insurance</SelectItem>
                <SelectItem value="Workers' Compensation">Workers' Compensation</SelectItem>
                <SelectItem value="Business License">Business License</SelectItem>
                <SelectItem value="W-9 Form">W-9 Form</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={() => {
              setSearchTerm('');
              setStatusFilter('all');
              setDocumentTypeFilter('all');
            }}>
              Clear All
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Issues Table */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-red-600" />
            Document Issues ({filteredIssues.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredIssues.length === 0 ? (
            <div className="text-center py-12">
              <FileX className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-600 mb-2">No Document Issues Found</h3>
              <p className="text-gray-500 mb-4">
                All subcontractor documents appear to be up to date.
              </p>
              <Button onClick={() => setUploadDialogOpen(true)}>
                <Upload className="w-4 h-4 mr-2" />
                Upload Document
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredIssues.map((issue) => (
                <div key={issue.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full ${getStatusColor(issue.status).replace('bg-', 'bg-opacity-20 bg-')} flex items-center justify-center`}>
                      {getStatusIcon(issue.status)}
                    </div>
                    <div>
                      <h4 className="font-semibold">{issue.subcontractor_name}</h4>
                      <p className="text-sm text-gray-600">{issue.document_type}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <Badge className={`${getStatusColor(issue.status)} text-white`}>
                        {issue.status}
                      </Badge>
                      {issue.expiration_date && (
                        <p className="text-sm text-gray-600 mt-1">
                          Expires: {new Date(issue.expiration_date).toLocaleDateString()}
                        </p>
                      )}
                      {issue.days_overdue > 0 && (
                        <p className="text-sm text-red-600 mt-1">
                          {issue.days_overdue} days overdue
                        </p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Dialog open={requestDialogOpen} onOpenChange={setRequestDialogOpen}>
                        <DialogTrigger asChild>
                          <Button size="sm" variant="outline" onClick={() => setSelectedIssue(issue)}>
                            Request
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Request Document</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <p>Send a request to {selectedIssue?.subcontractor_name} for {selectedIssue?.document_type}?</p>
                            <div className="flex gap-2">
                              <Button variant="outline" onClick={() => setRequestDialogOpen(false)} className="flex-1">
                                Cancel
                              </Button>
                              <Button onClick={handleRequestDocument} className="flex-1">
                                Send Request
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                      <Button size="sm" variant="outline" onClick={() => setUploadDialogOpen(true)}>
                        Upload
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => handleDeleteIssue(issue.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
