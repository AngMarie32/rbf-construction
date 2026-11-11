import { useParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { PaymentApplicationEditor } from '@/components/payapp/PaymentApplicationEditor';

export default function CreatePaymentApplication() {
  const { projectId, applicationId } = useParams();
  return (
    <Layout hideTitle title={applicationId ? 'Edit Payment Application' : 'New Payment Application'}>
      <PaymentApplicationEditor key={applicationId || 'new'} projectId={projectId!} applicationId={applicationId} />
    </Layout>
  );
}
