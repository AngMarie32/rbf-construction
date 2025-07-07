
import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { G702Form } from '@/components/forms/G702Form';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

export default function CreatePaymentApplication() {
  const { projectId, applicationId } = useParams();
  const navigate = useNavigate();
  const [project, setProject] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (projectId) {
      fetchProject();
    }
  }, [projectId]);

  const fetchProject = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      setProject(data);
    } catch (error) {
      console.error('Error fetching project:', error);
      toast.error('Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    toast.success('Payment application saved successfully');
    navigate(`/payment-applications?project=${projectId}`);
  };

  const handleBack = () => {
    navigate(`/payment-applications?project=${projectId}`);
  };

  if (loading) {
    return (
      <Layout title="Payment Application" subtitle="Loading...">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
        </div>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout title="Payment Application" subtitle="Project not found">
        <div className="text-center py-8">
          <p>Project not found</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout 
      title={applicationId ? "Edit Payment Application" : "Create Payment Application"} 
      subtitle={`${project.name} - ${project.client || 'No Client'}`}
    >
      <div className="mb-6">
        <Button 
          variant="outline" 
          onClick={handleBack}
          className="flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Payment Applications
        </Button>
      </div>
      
      <G702Form 
        projectId={projectId!} 
        applicationId={applicationId}
        onSave={handleSave}
      />
    </Layout>
  );
}
