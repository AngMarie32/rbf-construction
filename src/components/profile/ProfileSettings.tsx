
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { User, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';
import { RoleChangeRequest } from './RoleChangeRequest';

export const ProfileSettings: React.FC = () => {
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    role: 'Field',
  });
  const [loading, setLoading] = useState(false);
  const [fetchLoading, setFetchLoading] = useState(true);
  const [hasAdminRole, setHasAdminRole] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      fetchProfileData();
    }
  }, [user]);

  const fetchProfileData = async () => {
    if (!user?.id) return;
    
    setFetchLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('name, email, role')
        .eq('id', user.id)
        .single();

      if (error) {
        console.error('Error fetching profile data:', error);
        toast({
          title: "Error",
          description: "Failed to load profile data",
          variant: "destructive",
        });
        return;
      }

      if (data) {
        setProfileData({
          name: data.name || '',
          email: data.email || user.email || '',
          role: data.role || 'Field',
        });
        setHasAdminRole(data.role === 'Admin');
      }
    } catch (error) {
      console.error('Error fetching profile data:', error);
      toast({
        title: "Error",
        description: "Failed to load profile data",
        variant: "destructive",
      });
    } finally {
      setFetchLoading(false);
    }
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) {
      toast({
        title: "Error",
        description: "User not authenticated",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          name: profileData.name,
          email: profileData.email,
          // Don't allow direct role updates - they must go through approval process
        })
        .eq('id', user.id);

      if (error) {
        console.error('Error saving profile:', error);
        toast({
          title: "Error",
          description: `Failed to update profile: ${error.message}`,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
    } catch (error) {
      console.error('Error saving profile:', error);
      toast({
        title: "Error",
        description: "Failed to update profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (fetchLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="w-5 h-5" />
            Profile Settings
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-4">Loading profile data...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="profile" className="flex items-center gap-2">
            <User className="w-4 h-4" />
            Profile Info
          </TabsTrigger>
          <TabsTrigger value="role-request" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            Role Change
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile Settings
              </CardTitle>
              <p className="text-sm text-gray-600">
                Manage your personal profile information
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Full Name</Label>
                    <Input
                      id="name"
                      value={profileData.name}
                      onChange={(e) => setProfileData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Enter your full name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="profile_email">Email Address</Label>
                    <Input
                      id="profile_email"
                      type="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="Enter your email address"
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="role">Current Role</Label>
                  <div className="p-2 bg-gray-50 border rounded-md">
                    <span className="font-medium">{profileData.role}</span>
                  </div>
                  <p className="text-sm text-gray-500">
                    To change your role, use the "Role Change" tab to submit a request for admin approval.
                  </p>
                </div>

                <Button type="submit" disabled={loading}>
                  {loading ? 'Saving...' : 'Save Profile'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="role-request">
          <RoleChangeRequest 
            currentRole={profileData.role}
            onRequestSubmitted={() => {
              toast({
                title: "Request Submitted",
                description: "Your role change request has been submitted for review",
              });
            }}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
};
