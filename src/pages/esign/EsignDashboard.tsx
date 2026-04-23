import { Layout } from '@/components/layout/Layout';
import { useEnvelopes } from '@/hooks/useEsign';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { FileText, FileCheck, Clock, AlertCircle, Plus, Upload, LayoutTemplate } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { STATUS_COLORS, STATUS_LABELS } from '@/types/esign';
import { formatDistanceToNow } from 'date-fns';

export default function EsignDashboard() {
  const { data: envelopes = [], isLoading } = useEnvelopes();
  const navigate = useNavigate();

  const stats = {
    total: envelopes.length,
    pending: envelopes.filter(e => ['sent', 'partially_signed'].includes(e.status)).length,
    completed: envelopes.filter(e => e.status === 'completed').length,
    drafts: envelopes.filter(e => e.status === 'draft').length,
  };

  const recent = envelopes.slice(0, 5);

  return (
    <Layout title="E-Sign" subtitle="Send, sign, and track documents">
      <div className="space-y-6">
        {/* Hero header */}
        <div className="rounded-xl bg-gradient-to-br from-primary/10 via-primary/5 to-background border p-6 md:p-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight">E-Signature</h1>
              <p className="text-muted-foreground mt-1">Securely send documents for signature with full audit trails.</p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => navigate('/esign/new')} size="lg">
                <Plus className="h-4 w-4 mr-2" /> New Document
              </Button>
              <Button variant="outline" onClick={() => navigate('/esign/templates')} size="lg">
                <LayoutTemplate className="h-4 w-4 mr-2" /> Templates
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatTile icon={FileText} label="Total" value={stats.total} color="text-foreground" />
          <StatTile icon={Clock} label="Pending" value={stats.pending} color="text-amber-500" />
          <StatTile icon={FileCheck} label="Completed" value={stats.completed} color="text-emerald-500" />
          <StatTile icon={AlertCircle} label="Drafts" value={stats.drafts} color="text-muted-foreground" />
        </div>

        {/* Recent + actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="p-6 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold">Recent Documents</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/esign/documents')}>View all</Button>
            </div>
            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : recent.length === 0 ? (
              <EmptyState onCreate={() => navigate('/esign/new')} />
            ) : (
              <div className="space-y-2">
                {recent.map(env => (
                  <button
                    key={env.id}
                    onClick={() => navigate(`/esign/documents/${env.id}`)}
                    className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-muted transition text-left"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                      <div className="min-w-0">
                        <p className="font-medium truncate">{env.title}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDistanceToNow(new Date(env.created_at), { addSuffix: true })}
                        </p>
                      </div>
                    </div>
                    <Badge className={STATUS_COLORS[env.status]} variant="outline">{STATUS_LABELS[env.status]}</Badge>
                  </button>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-6">
            <h2 className="font-semibold mb-4">Quick Actions</h2>
            <div className="space-y-2">
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/esign/new')}>
                <Upload className="h-4 w-4 mr-2" /> Upload PDF
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/esign/templates')}>
                <LayoutTemplate className="h-4 w-4 mr-2" /> Use Template
              </Button>
              <Button variant="outline" className="w-full justify-start" onClick={() => navigate('/esign/documents')}>
                <FileText className="h-4 w-4 mr-2" /> All Documents
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}

function StatTile({ icon: Icon, label, value, color }: any) {
  return (
    <Card className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs text-muted-foreground uppercase tracking-wide">{label}</p>
          <p className={`text-2xl font-bold mt-1 ${color}`}>{value}</p>
        </div>
        <Icon className={`h-8 w-8 ${color} opacity-50`} />
      </div>
    </Card>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="text-center py-12 border-2 border-dashed border-border rounded-lg">
      <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
      <p className="font-medium mb-1">No documents yet</p>
      <p className="text-sm text-muted-foreground mb-4">Upload a PDF to get started.</p>
      <Button onClick={onCreate}><Plus className="h-4 w-4 mr-2" /> New Document</Button>
    </div>
  );
}