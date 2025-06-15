
import React from 'react';
import { Layout } from '@/components/layout/Layout';
import { UserManagement } from '@/components/admin/UserManagement';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ShieldAlert } from 'lucide-react';

const AdminUsers = () => {
  const { user } = useAuth();
  const [userRole, setUserRole] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const checkUserRole = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data, error } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (error) {
          console.error('Error checking user role:', error);
          setUserRole(null);
        } else {
          setUserRole(data?.role || null);
        }
      } catch (error) {
        console.error('Error checking user role:', error);
        setUserRole(null);
      } finally {
        setLoading(false);
      }
    };

    checkUserRole();
  }, [user]);

  if (loading) {
    return (
      <Layout title="User Management" subtitle="Loading...">
        <div className="flex justify-center py-8">
          <div className="text-center">Loading...</div>
        </div>
      </Layout>
    );
  }

  if (userRole !== 'Admin') {
    return (
      <Layout title="User Management" subtitle="Access Denied">
        <div className="max-w-2xl mx-auto">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-red-600">
                <ShieldAlert className="w-5 h-5" />
                Access Denied
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-600">
                You don't have permission to access this page. Only administrators can manage user roles and permissions.
              </p>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="User Management" subtitle="Manage user roles and permissions">
      <div className="max-w-6xl mx-auto space-y-6">
        <UserManagement />
      </div>
    </Layout>
  );
};

export default AdminUsers;
