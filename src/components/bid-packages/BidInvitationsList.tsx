
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Mail, Calendar, FileText, Users } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

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
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchInvitations();
  }, [refreshTrigger]);

  const fetchInvitations = async () => {
    try {
      const { data, error } = await supabase
        .from('bid_invitations')
        .select(`
          *,
          bid_package:bid_packages(name),
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'bg-gray-100 text-gray-800';
      case 'Sent': return 'bg-blue-100 text-blue-800';
      case 'Responded': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRecipientCounts = (recipients: any[]) => {
    const total = recipients.length;
    const responded = recipients.filter(r => r.status === 'Responded').length;
    return { total, responded };
  };

  if (loading) {
    return <div className="text-center py-8">Loading bid invitations...</div>;
  }

  if (invitations.length === 0) {
    return (
      <Card>
        <CardContent className="text-center py-8">
          <Mail className="w-12 h-12 mx-auto mb-4 text-gray-400" />
          <p className="text-gray-600">No bid invitations found</p>
          <p className="text-sm text-gray-500 mt-1">Create your first bid invitation to get started</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {invitations.map(invitation => {
        const { total, responded } = getRecipientCounts(invitation.bid_invitation_recipients);
        
        return (
          <Card key={invitation.id}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{invitation.title}</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    {invitation.bid_package?.name}
                  </p>
                </div>
                <Badge className={getStatusColor(invitation.status)}>
                  {invitation.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {invitation.message && (
                  <p className="text-sm text-gray-700 line-clamp-2">{invitation.message}</p>
                )}
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>
                      Due: {invitation.due_date ? format(new Date(invitation.due_date), 'MMM d, yyyy') : 'No date'}
                    </span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-gray-400" />
                    <span>{responded}/{total} responded</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-gray-400" />
                    <span>{invitation.bid_invitation_documents.length} documents</span>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Mail className="w-4 h-4 text-gray-400" />
                    <span>
                      {invitation.sent_at ? `Sent ${format(new Date(invitation.sent_at), 'MMM d')}` : 'Not sent'}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <div className="flex gap-2">
                    {invitation.bid_invitation_recipients.slice(0, 3).map((recipient, index) => (
                      <Badge key={index} variant="outline" className="text-xs">
                        {recipient.subcontractor.name}
                      </Badge>
                    ))}
                    {total > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{total - 3} more
                      </Badge>
                    )}
                  </div>
                  
                  <Button size="sm" variant="outline">
                    <Eye className="w-4 h-4 mr-2" />
                    View Details
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};
