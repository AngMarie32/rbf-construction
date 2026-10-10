import { sortProjectsOpenFirst } from '@/utils/projectOrder';
import { Layout } from '@/components/layout/Layout';
import { useEnvelopes, useDeleteEnvelope, useDocumentTypes, useArchiveEnvelope } from '@/hooks/useEsign';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Calendar as CalendarComp } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FileText, Plus, Search, Trash2, CalendarRange, X, Archive, ArchiveRestore, MoreHorizontal } from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { STATUS_COLORS, STATUS_LABELS, type EnvelopeStatus } from '@/types/esign';
import { formatDistanceToNow, format, isAfter, isBefore, startOfDay, endOfDay } from 'date-fns';
import type { DateRange } from 'react-day-picker';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';

export default function EsignDocuments() {
  const { data: envelopes = [], isLoading } = useEnvelopes();
  const { data: docTypes = [] } = useDocumentTypes();
  const navigate = useNavigate();
  const del = useDeleteEnvelope();
  const archive = useArchiveEnvelope();
  const [q, setQ] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [dateRange, setDateRange] = useState<DateRange | undefined>();
  const [showArchived, setShowArchived] = useState(false);
  const [projects, setProjects] = useState<{ id: string; name: string }[]>([]);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('projects').select('id, name, status').is('archived_at', null).order('name');
      setProjects(sortProjectsOpenFirst(data || []));
    })();
  }, []);

  const filtered = envelopes.filter(e => {
    const isArchived = !!(e as any).archived_at;
    if (showArchived ? !isArchived : isArchived) return false;
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
    const created = new Date(e.created_at);
    const matchFrom = !dateRange?.from || !isBefore(created, startOfDay(dateRange.from));
    const matchTo = !dateRange?.to || !isAfter(created, endOfDay(dateRange.to));
    return matchQ && matchS && matchP && matchT && matchFrom && matchTo;
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
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn('justify-start font-normal', !dateRange?.from && 'text-muted-foreground')}>
                  <CalendarRange className="h-4 w-4 mr-2" />
                  {dateRange?.from
                    ? dateRange.to
                      ? `${format(dateRange.from, 'MMM d')} – ${format(dateRange.to, 'MMM d, yyyy')}`
                      : format(dateRange.from, 'MMM d, yyyy')
                    : 'Created date'}
                  {dateRange?.from && (
                    <X className="h-3.5 w-3.5 ml-2 opacity-60 hover:opacity-100"
                      onClick={(e) => { e.stopPropagation(); setDateRange(undefined); }} />
                  )}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <CalendarComp
                  mode="range"
                  selected={dateRange}
                  onSelect={setDateRange}
                  numberOfMonths={2}
                  initialFocus
                  className="p-3 pointer-events-auto"
                />
              </PopoverContent>
            </Popover>
            <Button variant={showArchived ? 'default' : 'outline'} onClick={() => setShowArchived(s => !s)}>
              <Archive className="h-4 w-4 mr-2" />
              {showArchived ? 'Showing archived' : 'Archived'}
            </Button>
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
                      <p className="text-xs text-muted-foreground truncate">
                        {[
                          (env as any).company,
                          (env as any).payment_app_number ? `Pay App #${(env as any).payment_app_number}` : null,
                          env.project_id ? projects.find(p => p.id === env.project_id)?.name : null,
                          `Created ${formatDistanceToNow(new Date(env.created_at), { addSuffix: true })}`,
                        ].filter(Boolean).join(' • ')}
                      </p>
                    </div>
                  </button>
                  <div className="flex items-center gap-3">
                    {(env as any).document_type && (
                      <Badge variant="outline" className="text-xs">{(env as any).document_type}</Badge>
                    )}
                    <Badge className={STATUS_COLORS[env.status]} variant="outline">{STATUS_LABELS[env.status]}</Badge>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="opacity-0 group-hover:opacity-100" onClick={(e) => e.stopPropagation()}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => archive.mutate({ id: env.id, archive: !((env as any).archived_at) })}>
                          {(env as any).archived_at ? (
                            <><ArchiveRestore className="h-4 w-4 mr-2" /> Restore</>
                          ) : (
                            <><Archive className="h-4 w-4 mr-2" /> Archive</>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          className="text-destructive"
                          onClick={() => { if (confirm('Delete this document?')) del.mutate(env.id); }}
                        >
                          <Trash2 className="h-4 w-4 mr-2" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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