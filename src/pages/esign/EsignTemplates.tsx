import { Layout } from '@/components/layout/Layout';
import { useTemplates, useDeleteTemplate } from '@/hooks/useEsign';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, ArrowRight, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function EsignTemplates() {
  const { data: templates = [], isLoading } = useTemplates();
  const navigate = useNavigate();
  const del = useDeleteTemplate();

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
                  <div className="flex items-center gap-1.5">
                    {(t as any).document_type && (
                      <Badge variant="outline" className="text-xs">{(t as any).document_type}</Badge>
                    )}
                    {t.is_system && <Badge variant="outline" className="text-xs">System</Badge>}
                  </div>
                </div>
                <h3 className="font-semibold mb-1">{t.name}</h3>
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{t.description}</p>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="flex-1 justify-between"
                    onClick={() => navigate(`/esign/new?template=${t.id}`)}
                  >
                    Use template <ArrowRight className="h-4 w-4" />
                  </Button>
                  {!t.is_system && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm(`Delete template "${t.name}"?`)) del.mutate(t.id);
                      }}
                      title="Delete template"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}