import { Layout } from '@/components/layout/Layout';
import { useEnvelopes, useDocumentTypes, useResendInvitation } from '@/hooks/useEsign';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, FileCheck, Clock, AlertCircle, Plus, Upload, LayoutTemplate, ChevronRight, Building2, Calendar, MoreHorizontal, Send, Link2, Download } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { STATUS_COLORS, STATUS_LABELS } from '@/types/esign';
import { formatDistanceToNow, format } from 'date-fns';
import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export default function EsignDashboard() {
  const { data: envelopes = [], isLoading } = useEnvelopes();
  const { data: docTypes = [] } = useDocumentTypes();
  const navigate = useNavigate();
  const resend = useResendInvitation();
  const [projectFilter, setProjectFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('projects').select('id, name').order('name');
      setProjects(data || []);
    })();
  }, []);

  const filteredEnvelopes = envelopes.filter(e => {
    const matchP = projectFilter === 'all' ? true : projectFilter === 'none' ? !e.project_id : e.project_id === projectFilter;
    const matchT = typeFilter === 'all' ? true : typeFilter === 'none' ? !(e as any).document_type : (e as any).document_type === typeFilter;
    return matchP && matchT;
  });

  const stats = {
    total: filteredEnvelopes.length,
    pending: filteredEnvelopes.filter(e => ['sent', 'partially_signed'].includes(e.status)).length,
    completed: filteredEnvelopes.filter(e => e.status === 'completed').length,
    drafts: filteredEnvelopes.filter(e => e.status === 'draft').length,
  };

  const recent = filteredEnvelopes.slice(0, 5);

  return (
    <Layout title="E-Sign" subtitle="Send, sign, and track documents">
      <div className="space-y-6">
        {/* Header actions */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">E-Signature</h1>
            <p className="text-sm text-muted-foreground mt-1">Send, sign, and track documents in one place.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" onClick={() => navigate('/esign/templates')}>
              <LayoutTemplate className="h-4 w-4 mr-2" /> Templates
            </Button>
            <Button onClick={() => navigate('/esign/new')}>
              <Plus className="h-4 w-4 mr-2" /> New Document
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <StatTile icon={FileText} label="Total" value={stats.total} color="text-foreground" />
          <StatTile icon={Clock} label="Pending" value={stats.pending} color="text-amber-500" />
          <StatTile icon={FileCheck} label="Completed" value={stats.completed} color="text-emerald-500" />
          <StatTile icon={AlertCircle} label="Drafts" value={stats.drafts} color="text-muted-foreground" />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs uppercase tracking-wide text-muted-foreground px-1">Filter</span>
          <Select value={projectFilter} onValueChange={setProjectFilter}>
            <SelectTrigger className="w-[200px]"><SelectValue placeholder="Project" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All projects</SelectItem>
              <SelectItem value="none">No project</SelectItem>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Document type" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="none">Untagged</SelectItem>
              {docTypes.map(t => (
                <SelectItem key={t.id} value={t.name}>{t.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Recent + actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <Card className="lg:col-span-2 !p-0 overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-border">
              <div>
                <h2 className="font-semibold">Recent Documents</h2>
                <p className="text-xs text-muted-foreground mt-0.5">Latest activity across your envelopes</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/esign/documents')}>
                View all <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
            {isLoading ? (
              <div className="p-6 text-sm text-muted-foreground">Loading…</div>
            ) : recent.length === 0 ? (
              <div className="p-6"><EmptyState onCreate={() => navigate('/esign/new')} /></div>
            ) : (
              <ul className="divide-y divide-border">
                {recent.map(env => {
                  const company = (env as any).company as string | null;
                  const payApp = (env as any).payment_app_number as string | null;
                  const docType = (env as any).document_type as string | null;
                  const projectName = env.project_id ? projects.find(p => p.id === env.project_id)?.name : null;
                  const canResend = ['sent', 'partially_signed'].includes(env.status);
                  const canDownload = env.status === 'completed' && !!env.signed_pdf_path;
                  return (
                    <li key={env.id}>
                      <div className="w-full flex items-center gap-4 p-4 hover:bg-muted/50 transition group">
                        <button
                          onClick={() => navigate(`/esign/documents/${env.id}`)}
                          className="flex items-center gap-4 flex-1 min-w-0 text-left"
                        >
                        <div className="h-10 w-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="font-medium truncate">{env.title}</p>
                            {docType && (
                              <Badge variant="secondary" className="text-[10px] font-medium shrink-0">{docType}</Badge>
                            )}
                          </div>
                          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                            {company && (
                              <span className="inline-flex items-center gap-1 truncate"><Building2 className="h-3 w-3" />{company}</span>
                            )}
                            {projectName && <span className="truncate">{projectName}</span>}
                            {payApp && <span>Pay App #{payApp}</span>}
                            <span className="inline-flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(env.created_at), 'MMM d, yyyy')}
                            </span>
                          </div>
                        </div>
                        </button>
                        <div className="flex items-center gap-2 shrink-0">
                          <Badge className={STATUS_COLORS[env.status]} variant="outline">{STATUS_LABELS[env.status]}</Badge>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 opacity-0 group-hover:opacity-100 data-[state=open]:opacity-100 transition"
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48">
                              <DropdownMenuItem
                                disabled={!canResend || resend.isPending}
                                onClick={() => resend.mutate({ envelopeId: env.id })}
                              >
                                <Send className="h-4 w-4 mr-2" /> Resend invitation
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                disabled={!canResend}
                                onClick={() => copySigningLink(env.id)}
                              >
                                <Link2 className="h-4 w-4 mr-2" /> Copy signing link
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                disabled={!canDownload}
                                onClick={() => downloadSignedPdf(env.signed_pdf_path)}
                              >
                                <Download className="h-4 w-4 mr-2" /> Download signed PDF
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
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