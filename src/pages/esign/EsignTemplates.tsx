import { Layout } from '@/components/layout/Layout';
import { useTemplates } from '@/hooks/useEsign';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, ArrowRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function EsignTemplates() {
  const { data: templates = [], isLoading } = useTemplates();
  const navigate = useNavigate();

  return (
    <Layout title="Templates" subtitle="Pre-built and custom e-sign templates">
      <div className="space-y-4">
        {isLoading ? (
          <div className="text-muted-foreground">Loading…</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {templates.map(t => (
              <Card key={t.id} className="p-5 hover:shadow-md transition group">
                <div className="flex items-start justify-between mb-3">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  {t.is_system && <Badge variant="outline" className="text-xs">System</Badge>}
                </div>
                <h3 className="font-semibold mb-1">{t.name}</h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{t.description}</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-between"
                  onClick={() => navigate(`/esign/new?template=${t.id}`)}
                >
                  Use template <ArrowRight className="h-4 w-4" />
                </Button>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}