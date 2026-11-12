import { Layout } from '@/components/layout/Layout';
import { PunchListManager } from '@/components/quality/PunchListManager';

export default function PunchList() {
  return (
    <Layout hideTitle title="Punch List">
      <PunchListManager projectId={new URLSearchParams(window.location.search).get('project') || undefined} />
    </Layout>
  );
}
