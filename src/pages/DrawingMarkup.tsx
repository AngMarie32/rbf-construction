
import { Layout } from '@/components/layout/Layout';
import { DrawingMarkupTool } from '@/components/drawings/DrawingMarkupTool';

export default function DrawingMarkup() {
  return (
    <Layout 
      title="Drawing Markup & Collaboration" 
      subtitle="Collaborative markup tools for construction drawings and plans"
    >
      <DrawingMarkupTool />
    </Layout>
  );
}
