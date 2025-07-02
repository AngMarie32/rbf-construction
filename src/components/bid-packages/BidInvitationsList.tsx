
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  Eye, 
  Mail, 
  Calendar, 
  FileText, 
  Users, 
  Search,
  Filter,
  Send,
  Clock,
  CheckCircle2,
  AlertCircle,
  MoreHorizontal,
  Download,
  Edit,
  Trash2
} from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface BidInvitation {
  id: string;
  title: string;
  message: string;
  due_date: string;
  status: string;
  created_at: string;
  sent_at: string;
  bid_package: {
    name: string;
    project: {
      name: string;
    };
  };
  bid_invitation_recipients: {
    status: string;
    subcontractor: {
      name: string;
      company: string;
    };
  }[];
  bid_invitation_documents: {
    document: {
      name: string;
    };
  }[];
}

interface BidInvitationsListProps {
  refreshTrigger: number;
}

export const BidInvitationsList: React.FC<BidInvitationsListProps> = ({ refreshTrigger }) => {
  const [invitations, setInvitations] = useState<BidInvitation[]>([]);
  const [filteredInvitations, setFilteredInvitations] = useState<BidInvitation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const { toast } = useToast();

  useEffect(() => {
    fetchInvitations();
  }, [refreshTrigger]);

  useEffect(() => {
    filterInvitations();
  }, [invitations, searchQuery, statusFilter]);

  const fetchInvitations = async () => {
    try {
      const { data, error } = await supabase
        .from('bid_invitations')
        .select(`
          *,
          bid_package:bid_packages(
            name,
            project:projects(name)
          ),
          bid_invitation_recipients(
            status,
            subcontractor:subcontractors(name, company)
          ),
          bid_invitation_documents(
            document:documents(name)
          )
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setInvitations(data || []);
    } catch (error) {
      console.error('Error fetching invitations:', error);
      toast({
        title: "Error",
        description: "Failed to load bid invitations",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filterInvitations = () => {
    let filtered = invitations;

    if (searchQuery) {
      filtered = filtered.filter(invitation =>
        invitation.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invitation.bid_package?.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        invitation.bid_package?.project?.name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (statusFilter !== 'All') {
      filtered = filtered.filter(invitation => invitation.status === statusFilter);
    }

    setFilteredInvitations(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'bg-gray-100 text-gray-800 border-gray-200';
      case 'Sent': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Responded': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Draft': return <Clock className="w-4 h-4" />;
      case 'Sent': return <Send className="w-4 h-4" />;
      case 'Responded': return <CheckCircle2 className="w-4 h-4" />;
      default: return <AlertCircle className="w-4 h-4" />;
    }
  };

  const getRecipientCounts = (recipients: any[]) => {
    const total = recipients.length;
    const responded = recipients.filter(r => r.status === 'Responded').length;
    const opened = recipients.filter(r => r.status === 'Opened').length;
    return { total, responded, opened };
  };

  const handleResendInvitation = async (invitationId: string) => {
    try {
      // Call your send invitation function here
      toast({
        title: "Success",
        description: "Invitation resent successfully",
      });
      fetchInvitations();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to resend invitation",
        variant: "destructive",
      });
    }
  };

  const handleDeleteInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('bid_invitations')
        .delete()
        .eq('id', invitationId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Invitation deleted successfully",
      });
      fetchInvitations();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete invitation",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardHeader>
              <div className="h-6 bg-gray-200 rounded w-3/4"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="h-4 bg-gray-200 rounded"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (invitations.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="text-center py-12">
          <Mail className="w-16 h-16 mx-auto mb-4 text-gray-300" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">No bid invitations yet</h3>
          <p className="text-gray-600 mb-4">Create your first bid invitation to get started</p>
          <Button>
            <Mail className="w-4 h-4 mr-2" />
            Create Invitation
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Enhanced Filters */}
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="flex flex-1 items-center space-x-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <Input
              placeholder="Search invitations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Status</SelectItem>
              <SelectItem value="Draft">Draft</SelectItem>
              <SelectItem value="Sent">Sent</SelectItem>
              <SelectItem value="Responded">Responded</SelectItem>
            </SelectContent>
          </Select>
        </div>
        
        {/* Summary Stats */}
        <div className="flex items-center space-x-4 text-sm text-gray-600">
          <span>{filteredInvitations.length} invitations</span>
          <span>•</span>
          <span>{filteredInvitations.filter(i => i.status === 'Sent').length} active</span>
        </div>
      </div>

      {/* Enhanced Invitations List */}
      <div className="space-y-4">
        {filteredInvitations.map(invitation => {
          const { total, responded, opened } = getRecipientCounts(invitation.bid_invitation_recipients);
          const responseRate = total > 0 ? Math.round((responded / total) * 100) : 0;
          
          return (
            <Card key={invitation.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg flex items-center gap-2">
                      {invitation.title}
                      <Badge className={`${getStatusColor(invitation.status)} border`}>
                        {getStatusIcon(invitation.status)}
                        <span className="ml-1">{invitation.status}</span>
                      </Badge>
                    </CardTitle>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                      <span className="font-medium">{invitation.bid_package?.project?.name}</span>
                      <span>•</span>
                      <span>{invitation.bid_package?.name}</span>
                    </div>
                  </div>
                  
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="sm">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem>
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit
                      </DropdownMenuItem>
                      {invitation.status === 'Sent' && (
                        <DropdownMenuItem onClick={() => handleResendInvitation(invitation.id)}>
                          <Send className="w-4 h-4 mr-2" />
                          Resend
                        </DropdownMenuItem>
                      )}
                      <DropdownMenuItem>
                        <Download className="w-4 h-4 mr-2" />
                        Export
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        className="text-red-600"
                        onClick={() => handleDeleteInvitation(invitation.id)}
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardHeader>
              
              <CardContent>
                <div className="space-y-4">
                  {invitation.message && (
                    <p className="text-sm text-gray-700 bg-gray-50 p-3 rounded-lg border-l-4 border-blue-200">
                      {invitation.message}
                    </p>
                  )}
                  
                  {/* Enhanced Stats Grid */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="flex items-center gap-2 text-sm">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="font-medium">Due Date</div>
                        <div className="text-gray-600">
                          {invitation.due_date ? format(new Date(invitation.due_date), 'MMM d, yyyy') : 'Not set'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <Users className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="font-medium">Recipients</div>
                        <div className="text-gray-600">{total} invited</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <CheckCircle2 className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="font-medium">Response Rate</div>
                        <div className="text-gray-600">{responseRate}% ({responded}/{total})</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2 text-sm">
                      <FileText className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="font-medium">Documents</div>
                        <div className="text-gray-600">{invitation.bid_invitation_documents.length} files</div>
                      </div>
                    </div>
                  </div>

                  {/* Recipients Preview */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-medium text-gray-700">Recipients</span>
                      {invitation.sent_at && (
                        <span className="text-xs text-gray-500">
                          Sent {format(new Date(invitation.sent_at), 'MMM d, h:mm a')}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {invitation.bid_invitation_recipients.slice(0, 4).map((recipient, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {recipient.subcontractor.name}
                          {recipient.status === 'Responded' && (
                            <CheckCircle2 className="w-3 h-3 ml-1 text-green-500" />
                          )}
                        </Badge>
                      ))}
                      {total > 4 && (
                        <Badge variant="outline" className="text-xs text-gray-500">
                          +{total - 4} more
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex justify-between items-center pt-2 border-t">
                    <div className="text-xs text-gray-500">
                      Created {format(new Date(invitation.created_at), 'MMM d, yyyy')}
                    </div>
                    
                    <div className="flex gap-2">
                      {invitation.status === 'Draft' && (
                        <Button size="sm" variant="outline">
                          <Send className="w-4 h-4 mr-2" />
                          Send Now
                        </Button>
                      )}
                      <Button size="sm" variant="outline">
                        <Eye className="w-4 h-4 mr-2" />
                        View Details
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};
