
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { UserCheck, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface RoleChangeRequestProps {
  currentRole: string;
  onRequestSubmitted?: () => void;
}

export const RoleChangeRequest: React.FC<RoleChangeRequestProps> = ({ 
  currentRole, 
  onRequestSubmitted 
}) => {
  const [requestedRole, setRequestedRole] = useState('');
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id || !requestedRole || requestedRole === currentRole) {
      toast({
        title: "Error",
        description: "Please select a different role than your current one",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('role_change_requests')
        .insert({
          user_id: user.id,
          requested_role: requestedRole,
          existing_role: currentRole,
          reason: reason.trim() || null,
        });

      if (error) {
        console.error('Error submitting role change request:', error);
        toast({
          title: "Error",
          description: "Failed to submit role change request",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Request Submitted",
        description: "Your role change request has been submitted for admin review",
      });

      setRequestedRole('');
      setReason('');
      onRequestSubmitted?.();
    } catch (error) {
      console.error('Error submitting role change request:', error);
      toast({
        title: "Error",
        description: "Failed to submit role change request",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const availableRoles = ['Field', 'Project Manager', 'Superintendent', 'Estimator', 'Owner', 'Admin']
    .filter(role => role !== currentRole);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="w-5 h-5" />
          Request Role Change
        </CardTitle>
        <p className="text-sm text-gray-600">
          Submit a request to change your role. This will require admin approval.
        </p>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmitRequest} className="space-y-4">
          <div className="space-y-2">
            <Label>Current Role</Label>
            <div className="flex items-center gap-2 p-2 bg-gray-50 rounded">
              <Clock className="w-4 h-4 text-gray-500" />
              <span className="font-medium">{currentRole}</span>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="requested_role">Requested Role</Label>
            <Select value={requestedRole} onValueChange={setRequestedRole}>
              <SelectTrigger>
                <SelectValue placeholder="Select the role you want to request" />
              </SelectTrigger>
              <SelectContent>
                {availableRoles.map((role) => (
                  <SelectItem key={role} value={role}>
                    {role}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="reason">Reason for Role Change (Optional)</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why you need this role change..."
              rows={3}
            />
          </div>

          <Button type="submit" disabled={loading || !requestedRole}>
            {loading ? 'Submitting...' : 'Submit Request'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};
