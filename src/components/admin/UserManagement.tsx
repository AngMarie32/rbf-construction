
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Users, Clock, CheckCircle, XCircle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface RoleChangeRequest {
  id: string;
  user_id: string;
  requested_role: string;
  existing_role: string;
  reason: string | null;
  status: string;
  requested_at: string;
  profiles: {
    name: string;
    email: string;
  };
}

export const UserManagement: React.FC = () => {
  const [requests, setRequests] = useState<RoleChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [adminNotes, setAdminNotes] = useState<{ [key: string]: string }>({});
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchRoleChangeRequests();
  }, []);

  const fetchRoleChangeRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('role_change_requests')
        .select(`
          id,
          user_id,
          requested_role,
          existing_role,
          reason,
          status,
          requested_at,
          profiles (
            name,
            email
          )
        `)
        .order('requested_at', { ascending: false });

      if (error) {
        console.error('Error fetching role change requests:', error);
        toast({
          title: "Error",
          description: "Failed to load role change requests",
          variant: "destructive",
        });
        return;
      }

      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching role change requests:', error);
      toast({
        title: "Error",
        description: "Failed to load role change requests",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      const { error } = await supabase.rpc('approve_role_change', {
        request_id: requestId,
        admin_notes: adminNotes[requestId] || null
      });

      if (error) {
        console.error('Error approving role change:', error);
        toast({
          title: "Error",
          description: "Failed to approve role change request",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Request Approved",
        description: "Role change request has been approved and user role updated",
      });

      fetchRoleChangeRequests();
    } catch (error) {
      console.error('Error approving role change:', error);
      toast({
        title: "Error",
        description: "Failed to approve role change request",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    setActionLoading(requestId);
    try {
      const { error } = await supabase
        .from('role_change_requests')
        .update({
          status: 'rejected',
          reviewed_at: new Date().toISOString(),
          reviewed_by: user?.id,
          admin_notes: adminNotes[requestId] || null
        })
        .eq('id', requestId);

      if (error) {
        console.error('Error rejecting role change:', error);
        toast({
          title: "Error",
          description: "Failed to reject role change request",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Request Rejected",
        description: "Role change request has been rejected",
      });

      fetchRoleChangeRequests();
    } catch (error) {
      console.error('Error rejecting role change:', error);
      toast({
        title: "Error",
        description: "Failed to reject role change request",
        variant: "destructive",
      });
    } finally {
      setActionLoading(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return (
          <Badge className="bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </Badge>
        );
      case 'approved':
        return (
          <Badge className="bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case 'rejected':
        return (
          <Badge className="bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </Badge>
        );
      default:
        return <Badge>{status}</Badge>;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="w-5 h-5" />
            User Management
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading role change requests...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="w-5 h-5" />
          User Management
        </CardTitle>
        <p className="text-sm text-gray-600">
          Review and approve user role change requests
        </p>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            No role change requests found
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div key={request.id} className="border rounded-lg p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">{request.profiles.name}</h3>
                    <p className="text-sm text-gray-600">{request.profiles.email}</p>
                  </div>
                  {getStatusBadge(request.status)}
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="font-medium">Current Role:</span> {request.existing_role}
                  </div>
                  <div>
                    <span className="font-medium">Requested Role:</span> {request.requested_role}
                  </div>
                </div>

                {request.reason && (
                  <div>
                    <span className="font-medium text-sm">Reason:</span>
                    <p className="text-sm text-gray-600 mt-1">{request.reason}</p>
                  </div>
                )}

                <div className="text-xs text-gray-500">
                  Requested: {new Date(request.requested_at).toLocaleDateString()}
                </div>

                {request.status === 'pending' && (
                  <div className="space-y-3 pt-3 border-t">
                    <div>
                      <label className="text-sm font-medium">Admin Notes (Optional)</label>
                      <Textarea
                        value={adminNotes[request.id] || ''}
                        onChange={(e) => setAdminNotes(prev => ({
                          ...prev,
                          [request.id]: e.target.value
                        }))}
                        placeholder="Add any notes about this decision..."
                        rows={2}
                        className="mt-1"
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        onClick={() => handleApproveRequest(request.id)}
                        disabled={actionLoading === request.id}
                        className="bg-green-600 hover:bg-green-700"
                      >
                        {actionLoading === request.id ? 'Processing...' : 'Approve'}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleRejectRequest(request.id)}
                        disabled={actionLoading === request.id}
                        className="border-red-300 text-red-600 hover:bg-red-50"
                      >
                        Reject
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
