
import { Layout } from '@/components/layout/Layout';
import { PunchListManager } from '@/components/quality/PunchListManager';

export default function PunchList() {
  return (
    <Layout 
      title="Punch List Management" 
      subtitle="Track and manage construction punch list items and quality control"
    >
      <PunchListManager />
    </Layout>
  );
}
