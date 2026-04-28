import { Layout } from '@/components/layout/Layout';
import { useEnvelopes, useDeleteEnvelope, useDocumentTypes } from '@/hooks/useEsign';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Plus, Search, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { STATUS_COLORS, STATUS_LABELS, type EnvelopeStatus } from '@/types/esign';
import { formatDistanceToNow } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';

export default function EsignDocuments() {
  const { data: envelopes = [], isLoading } = useEnvelopes();
  const { data: docTypes = [] } = useDocumentTypes();
  const navigate = useNavigate();
  const del = useDeleteEnvelope();
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('projects').select('id, name').order('name');
      setProjects(data || []);
    })();
  }, []);

  const filtered = envelopes.filter(e => {
    const matchQ = !q || e.title.toLowerCase().includes(q.toLowerCase());
    const matchS = statusFilter === 'all' || e.status === statusFilter;
    const matchP = projectFilter === 'all'
      ? true
      : projectFilter === 'none'
        ? !e.project_id
        : e.project_id === projectFilter;
    const matchT = typeFilter === 'all'
      ? true
      : typeFilter === 'none'
        ? !(e as any).document_type
        : (e as any).document_type === typeFilter;
    return matchQ && matchS && matchP && matchT;
  });

  return (
    <Layout title="Documents" subtitle="All e-sign documents">
      <div className="space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div className="flex flex-1 gap-2 flex-wrap">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search documents…" className="pl-9" />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {(Object.keys(STATUS_LABELS) as EnvelopeStatus[]).map(s => (
                  <SelectItem key={s} value={s}>{STATUS_LABELS[s]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={projectFilter} onValueChange={setProjectFilter}>
              <SelectTrigger className="w-[180px]"><SelectValue placeholder="Project" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All projects</SelectItem>
                <SelectItem value="none">No project</SelectItem>
                {projects.map(p => (
                  <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[170px]"><SelectValue placeholder="Type" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="none">Untagged</SelectItem>
                {docTypes.map(t => (
                  <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
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
                    {(env as any).document_type && (
                      <Badge variant="outline" className="text-xs">{(env as any).document_type}</Badge>
                    )}
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