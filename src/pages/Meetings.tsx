
import { Layout } from '@/components/layout/Layout';
import { MeetingManager } from '@/components/meetings/MeetingManager';

export default function Meetings() {
  return (
    <Layout 
      title="Meeting Management" 
      subtitle="Schedule meetings, take notes, and track action items"
    >
      <MeetingManager />
    </Layout>
  );
}
