
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  AlertTriangle,
  Clock,
  FileX,
  Upload,
  Search,
  Mail,
  Download,
  ArrowLeft
} from 'lucide-react';

interface DocumentIssue {
  id: string;
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

  // Mock data - replace with actual Supabase queries
  useEffect(() => {
    const mockIssues: DocumentIssue[] = [
      {
        id: '1',
        subcontractor_name: 'Solid Masonry Co.',
        document_type: 'Liability Insurance',
        status: 'Expired',
        expiration_date: '2025-05-03',
        days_overdue: 5
      },
      {
        id: '2',
        subcontractor_name: 'Top-Notch Roofing Inc.',
        document_type: 'Workers\' Compensation',
        status: 'Expired',
        expiration_date: '2025-05-01',
        days_overdue: 7
      },
      {
        id: '3',
        subcontractor_name: 'Precision Plumbing Inc.',
        document_type: 'Business License',
        status: 'Expired',
        expiration_date: '2025-04-28',
        days_overdue: 10
      },
      {
        id: '4',
        subcontractor_name: 'ABC Electrical',
        document_type: 'Liability Insurance',
        status: 'Expiring Soon',
        expiration_date: '2025-06-15',
        days_overdue: 0
      },
      {
        id: '5',
        subcontractor_name: 'Quick Concrete LLC',
        document_type: 'W-9 Form',
        status: 'Missing',
        days_overdue: 0
      }
    ];
    setIssues(mockIssues);
    setFilteredIssues(mockIssues);
  }, []);

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

  const expiredCount = issues.filter(i => i.status === 'Expired').length;
  const expiringSoonCount = issues.filter(i => i.status === 'Expiring Soon').length;
  const missingCount = issues.filter(i => i.status === 'Missing').length;
  const totalWithIssues = new Set(issues.map(i => i.subcontractor_name)).size;

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
          <Button variant="outline">
            <Download className="w-4 h-4 mr-2" />
            Export List
          </Button>
          <Button variant="outline">
            <Mail className="w-4 h-4 mr-2" />
            Email Notifications
          </Button>
          <Button>
            <Upload className="w-4 h-4 mr-2" />
            Upload Documents
          </Button>
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
                <p className="text-sm text-gray-500">Out of 24 total subcontractors</p>
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
                    <Button size="sm" variant="outline">
                      Request
                    </Button>
                    <Button size="sm" variant="outline">
                      Upload
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
