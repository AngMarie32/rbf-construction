import { Layout } from '@/components/layout/Layout';
import { useEnvelopes, useDeleteEnvelope } from '@/hooks/useEsign';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Plus, Search, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { STATUS_COLORS, STATUS_LABELS, type EnvelopeStatus } from '@/types/esign';
import { formatDistanceToNow } from 'date-fns';

export default function EsignDocuments() {
  const { data: envelopes = [], isLoading } = useEnvelopes();
  const navigate = useNavigate();
  const del = useDeleteEnvelope();
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const filtered = envelopes.filter(e => {
    const matchQ = !q || e.title.toLowerCase().includes(q.toLowerCase());
    const matchS = statusFilter === 'all' || e.status === statusFilter;
    return matchQ && matchS;
  });

  return (
    <Layout title="Documents" subtitle="All e-sign documents">
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-1 gap-2">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search documents…" className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {(Object.keys(STATUS_LABELS) as EnvelopeStatus[]).map(s => (
                  <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={() => navigate('/esign/new')}><Plus className="h-4 w-4 mr-2" /> New Document</Button>
        </div>

        <Card>
          {isLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading…</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="font-medium">No documents found</p>
              <p className="text-sm text-muted-foreground">Try adjusting filters or create a new one.</p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map(env => (
                <div key={env.id} className="flex items-center justify-between p-4 hover:bg-muted/50 transition group">
                  <button onClick={() => navigate(`/esign/documents/${env.id}`)} className="flex items-center gap-3 flex-1 text-left min-w-0">
                    <FileText className="h-5 w-5 text-muted-foreground shrink-0" />
                    <div className="min-w-0">
                      <p className="font-medium truncate">{env.title}</p>
                      <p className="text-xs text-muted-foreground">
                        Created {formatDistanceToNow(new Date(env.created_at), { addSuffix: true })}
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-3">
                    <Badge className={STATUS_COLORS[env.status]} variant="outline">{STATUS_LABELS[env.status]}</Badge>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => { e.stopPropagation(); if (confirm('Delete this document?')) del.mutate(env.id); }}
                      className="opacity-0 group-hover:opacity-100"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}