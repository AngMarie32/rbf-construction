
import { Layout } from '@/components/layout/Layout';
import { PunchListManager } from '@/components/quality/PunchListManager';

export default function PunchList() {
  return (
    <Layout 
      title="Punch List"
      subtitle="Track items that must be fixed or finished before the job is closed out"
    >
      <PunchListManager projectId={new URLSearchParams(window.location.search).get('project') || undefined} />
    </Layout>
  );
}
