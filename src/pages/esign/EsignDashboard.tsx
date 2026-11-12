import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { differenceInCalendarDays, format, formatDistanceToNow } from 'date-fns';
import {
  AlertTriangle,
  Archive,
  ArchiveRestore,
  Building2,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  FilePen,
  FileText,
  LayoutTemplate,
  Link2,
  MoreHorizontal,
  PenLine,
  Plus,
  Search,
  Send,
  Timer,
  UsersRound,
} from 'lucide-react';
import { toast } from 'sonner';
import { Layout } from '@/components/layout/Layout';
import { PageHero, heroButton, heroButtonPrimary } from '@/components/ui/page-hero';
import { AccentStat } from '@/components/ui/accent-stat';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useArchiveEnvelope, useEnvelopes, useRecipientGroups, useResendInvitation, useTemplates } from '@/hooks/useEsign';
import { STATUS_COLORS, STATUS_LABELS, type EsignEnvelope } from '@/types/esign';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';

const WAITING = ['sent', 'partially_signed'];
/** A document waiting this many days without being signed is flagged. */
const STALE_DAYS = 3;

type Attention = { env: EsignEnvelope; reason: string; tone: 'bad' | 'warn' | 'muted'; action: 'resend' | 'open' | 'finish' };

export default function EsignDashboard() {
  const navigate = useNavigate();
  const { data: envelopes = [], isLoading } = useEnvelopes();
  const { data: templates = [] } = useTemplates();
  const { data: groups = [] } = useRecipientGroups();
  const resend = useResendInvitation();
  const archive = useArchiveEnvelope();
  const [projects, setProjects] = useState<Record<string, string>>({});
  const [hasSignature, setHasSignature] = useState<boolean | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    supabase
      .from('projects')
      .select('id, name')
      .then(({ data }) => setProjects(Object.fromEntries((data || []).map((p: any) => [p.id, p.name]))));
    (async () => {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth?.user) return;
      const { data, error } = await (supabase as any).from('user_esign_preferences').select('signature_data').eq('user_id', auth.user.id).maybeSingle();
      setHasSignature(error ? null : !!data?.signature_data);
    })();
  }, []);

  const live = useMemo(() => envelopes.filter((e) => !(e as any).archived_at), [envelopes]);

  const stats = useMemo(() => {
    const now = new Date();
    const waiting = live.filter((e) => WAITING.includes(e.status));
    const done30 = live.filter((e) => e.status === 'completed' && e.completed_at && differenceInCalendarDays(now, new Date(e.completed_at)) <= 30);
    const times = live
      .filter((e) => e.status === 'completed' && e.completed_at && e.sent_at)
      .map((e) => (new Date(e.completed_at!).getTime() - new Date(e.sent_at!).getTime()) / 86400000)
      .filter((d) => d >= 0);
    const avgDays = times.length ? times.reduce((a, b) => a + b, 0) / times.length : null;
    return {
      waiting: waiting.length,
      stale: waiting.filter((e) => differenceInCalendarDays(now, new Date(e.sent_at || e.created_at)) >= STALE_DAYS).length,
      done30: done30.length,
      drafts: live.filter((e) => e.status === 'draft').length,
      problems: live.filter((e) => ['declined', 'expired'].includes(e.status)).length,
      avgDays,
    };
  }, [live]);

  const attention: Attention[] = useMemo(() => {
    const now = new Date();
    const list: Attention[] = [];
    live.forEach((env) => {
      if (env.status === 'declined') list.push({ env, reason: 'A signer declined', tone: 'bad', action: 'open' });
      else if (env.status === 'expired') list.push({ env, reason: 'Expired before everyone signed', tone: 'bad', action: 'open' });
      else if (WAITING.includes(env.status)) {
        const days = differenceInCalendarDays(now, new Date(env.sent_at || env.created_at));
        if (days >= STALE_DAYS) list.push({ env, reason: `Waiting ${days} days for signatures`, tone: 'warn', action: 'resend' });
        else if (env.expires_at && differenceInCalendarDays(new Date(env.expires_at), now) <= 3)
          list.push({ env, reason: `Expires ${format(new Date(env.expires_at), 'MMM d')}`, tone: 'warn', action: 'resend' });
      } else if (env.status === 'draft') {
        list.push({ env, reason: `Draft, not sent (started ${formatDistanceToNow(new Date(env.created_at), { addSuffix: true })})`, tone: 'muted', action: 'finish' });
      }
    });
    const rank = { bad: 0, warn: 1, muted: 2 };
    return list.sort((a, b) => rank[a.tone] - rank[b.tone]).slice(0, 6);
  }, [live]);

  const recent = useMemo(() => {
    const q = search.trim().toLowerCase();
    return [...live]
      .filter((e) => !q || e.title.toLowerCase().includes(q) || (e.company || '').toLowerCase().includes(q) || (projects[e.project_id || ''] || '').toLowerCase().includes(q))
      .sort((a, b) => new Date(b.updated_at || b.created_at).getTime() - new Date(a.updated_at || a.created_at).getTime())
      .slice(0, 8);
  }, [live, search, projects]);

  async function copySigningLink(envelopeId: string) {
    const { data, error } = await supabase.from('esign_signers').select('access_token, status').eq('envelope_id', envelopeId).order('order_index');
    if (error || !data?.length) return toast.error('No signers found');
    const pending = data.find((s: any) => s.status !== 'signed') || data[0];
    await navigator.clipboard.writeText(`https://portal.rbfconstruction.com/sign/${pending.access_token}`);
    toast.success('Signing link copied');
  }

  async function downloadSignedPdf(path: string | null) {
    if (!path) return;
    const { data, error } = await supabase.storage.from('esign-documents').createSignedUrl(path, 3600);
    if (error || !data?.signedUrl) return toast.error('Could not get the download link');
    window.open(data.signedUrl, '_blank');
  }

  const rowMeta = (env: EsignEnvelope) =>
    [env.company, env.project_id ? projects[env.project_id] : null, env.payment_app_number ? `Pay App #${env.payment_app_number}` : null].filter(Boolean) as string[];

  const RowMenu = ({ env }: { env: EsignEnvelope }) => {
    const canResend = WAITING.includes(env.status);
    const canDownload = env.status === 'completed' && !!env.signed_pdf_path;
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="More actions" onClick={(e) => e.stopPropagation()}>
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52">
          <DropdownMenuItem disabled={!canResend || resend.isPending} onClick={() => resend.mutate({ envelopeId: env.id })}>
            <Send className="mr-2 h-4 w-4" /> Resend invitation
          </DropdownMenuItem>
          <DropdownMenuItem disabled={!canResend} onClick={() => copySigningLink(env.id)}>
            <Link2 className="mr-2 h-4 w-4" /> Copy signing link
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem disabled={!canDownload} onClick={() => downloadSignedPdf(env.signed_pdf_path)}>
            <Download className="mr-2 h-4 w-4" /> Download signed PDF
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => archive.mutate({ id: env.id, archive: !(env as any).archived_at })}>
            {(env as any).archived_at ? <ArchiveRestore className="mr-2 h-4 w-4" /> : <Archive className="mr-2 h-4 w-4" />}
            {(env as any).archived_at ? 'Restore' : 'Archive'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  const shortcuts = [
    {
      icon: LayoutTemplate,
      title: 'Templates',
      sub: templates.length ? `${templates.length} saved` : 'Save a marked-up PDF to reuse',
      to: '/esign/templates',
    },
    {
      icon: UsersRound,
      title: 'Recipient groups',
      sub: groups.length ? `${groups.length} group${groups.length === 1 ? '' : 's'}` : 'Reusable signer lists',
      to: '/esign/recipient-groups',
    },
    {
      icon: PenLine,
      title: 'My signature',
      sub: hasSignature === false ? 'Not set up yet' : hasSignature ? 'Saved for one-click signing' : 'Your default signature',
      to: '/esign/my-signature',
      warn: hasSignature === false,
    },
  ];

  return (
    <Layout hideTitle title="E-Sign">
      <div className="space-y-6">
        <PageHero
          eyebrow="Quick access"
          title="E-Sign"
          subtitle="Send contracts, change orders, lien waivers and pay apps for signature, and see who still has to sign."
          actions={
            <>
              <button type="button" className={heroButtonPrimary} onClick={() => navigate('/esign/new')}>
                <Plus className="h-4 w-4" /> Send a document
              </button>
              <button type="button" className={heroButton} onClick={() => navigate('/esign/templates')}>
                <LayoutTemplate className="h-4 w-4" /> Start from a template
              </button>
              <button type="button" className={heroButton} onClick={() => navigate('/esign/documents')}>
                <FileText className="h-4 w-4" /> All documents
              </button>
            </>
          }
          stats={[
            { label: 'Waiting on signatures', value: isLoading ? '…' : String(stats.waiting) },
            { label: 'Avg. time to sign', value: isLoading ? '…' : stats.avgDays == null ? '—' : stats.avgDays < 1 ? '< 1 day' : `${stats.avgDays.toFixed(1)} days` },
          ]}
        />

        <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
          <AccentStat label="Waiting on signers" value={stats.waiting} icon={Clock} accent="blue" loading={isLoading} hint={stats.stale ? `${stats.stale} waiting ${STALE_DAYS}+ days` : 'None overdue'} tone={stats.stale ? 'warn' : undefined} />
          <AccentStat label="Completed (30 days)" value={stats.done30} icon={CheckCircle2} accent="emerald" loading={isLoading} hint="Fully signed" />
          <AccentStat label="Drafts" value={stats.drafts} icon={FilePen} accent="slate" loading={isLoading} hint="Started, not sent" />
          <AccentStat label="Declined / expired" value={stats.problems} icon={AlertTriangle} accent="rose" loading={isLoading} tone={stats.problems ? 'bad' : 'good'} hint={stats.problems ? 'Needs a follow-up' : 'None'} />
        </div>

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="space-y-4 lg:col-span-2">
            {/* Needs attention */}
            <Card className="overflow-hidden !p-0">
              <div className="flex items-center justify-between border-b px-5 py-4">
                <div>
                  <h2 className="font-semibold">Needs your attention</h2>
                  <p className="text-xs text-muted-foreground">Declined, expired, waiting {STALE_DAYS}+ days, or never sent</p>
                </div>
                {!!attention.length && <Badge variant="secondary">{attention.length}</Badge>}
              </div>
              {isLoading ? (
                <div className="space-y-2 p-4">
                  <Skeleton className="h-12" />
                  <Skeleton className="h-12" />
                </div>
              ) : attention.length === 0 ? (
                <div className="flex items-center gap-3 px-5 py-6 text-sm text-muted-foreground">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" /> Nothing is stuck. Every sent document is moving.
                </div>
              ) : (
                <ul className="divide-y">
                  {attention.map(({ env, reason, tone, action }) => (
                    <li key={env.id} className="flex items-center gap-3 px-5 py-3">
                      <span
                        className={cn(
                          'h-2 w-2 shrink-0 rounded-full',
                          tone === 'bad' ? 'bg-rose-500' : tone === 'warn' ? 'bg-amber-500' : 'bg-slate-400'
                        )}
                      />
                      <button type="button" className="min-w-0 flex-1 text-left" onClick={() => navigate(`/esign/documents/${env.id}`)}>
                        <p className="truncate font-medium">{env.title}</p>
                        <p className="truncate text-xs text-muted-foreground">{[reason, ...rowMeta(env)].join(' · ')}</p>
                      </button>
                      {action === 'resend' ? (
                        <Button size="sm" variant="outline" disabled={resend.isPending} onClick={() => resend.mutate({ envelopeId: env.id })}>
                          <Send className="h-3.5 w-3.5" /> Send reminder
                        </Button>
                      ) : (
                        <Button size="sm" variant="outline" onClick={() => navigate(`/esign/documents/${env.id}`)}>
                          {action === 'finish' ? 'Finish & send' : 'Review'}
                        </Button>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </Card>

            {/* Recent */}
            <Card className="overflow-hidden !p-0">
              <div className="flex flex-col gap-3 border-b px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="font-semibold">Recent activity</h2>
                  <p className="text-xs text-muted-foreground">Last updated first</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Find a document…" className="h-9 w-full pl-9 sm:w-56" />
                  </div>
                  <Button variant="ghost" size="sm" onClick={() => navigate('/esign/documents')}>
                    View all <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
              {isLoading ? (
                <div className="space-y-2 p-4">
                  {[0, 1, 2].map((i) => <Skeleton key={i} className="h-14" />)}
                </div>
              ) : recent.length === 0 ? (
                <div className="px-5 py-10 text-center">
                  <FileText className="mx-auto mb-3 h-10 w-10 text-muted-foreground" />
                  <p className="font-medium">{live.length ? 'No documents match that search' : 'Nothing sent for signature yet'}</p>
                  <p className="mb-4 text-sm text-muted-foreground">
                    {live.length ? 'Try another name, company or project.' : 'Upload a PDF, add who signs it, place the fields and send. It takes a couple of minutes.'}
                  </p>
                  {!live.length && (
                    <Button onClick={() => navigate('/esign/new')}>
                      <Plus className="h-4 w-4" /> Send a document
                    </Button>
                  )}
                </div>
              ) : (
                <ul className="divide-y">
                  {recent.map((env) => (
                    <li key={env.id} className="flex items-center gap-3 px-5 py-3 hover:bg-muted/40">
                      <button type="button" onClick={() => navigate(`/esign/documents/${env.id}`)} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <FileText className="h-4 w-4" />
                        </span>
                        <span className="min-w-0 flex-1">
                          <span className="flex items-center gap-2">
                            <span className="truncate font-medium">{env.title}</span>
                            {env.document_type && <Badge variant="secondary" className="shrink-0 text-[10px]">{env.document_type}</Badge>}
                          </span>
                          <span className="flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                            {rowMeta(env).map((m, i) => (
                              <span key={i} className="inline-flex items-center gap-1 truncate">
                                {i === 0 && env.company && <Building2 className="h-3 w-3" />}
                                {m}
                              </span>
                            ))}
                            <span>
                              {env.status === 'completed' && env.completed_at
                                ? `Signed ${formatDistanceToNow(new Date(env.completed_at), { addSuffix: true })}`
                                : env.sent_at
                                  ? `Sent ${formatDistanceToNow(new Date(env.sent_at), { addSuffix: true })}`
                                  : `Created ${formatDistanceToNow(new Date(env.created_at), { addSuffix: true })}`}
                            </span>
                          </span>
                        </span>
                      </button>
                      <Badge className={STATUS_COLORS[env.status]} variant="outline">{STATUS_LABELS[env.status]}</Badge>
                      <RowMenu env={env} />
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          {/* Side column */}
          <div className="space-y-4">
            <Card className="p-5">
              <h2 className="mb-1 font-semibold">How sending works</h2>
              <ol className="mt-3 space-y-3 text-sm">
                {[
                  ['Upload the PDF', 'Or start from a saved template.'],
                  ['Add signers and place fields', 'Signature, initials, date, name, text.'],
                  ['Send', 'Signers get an email link. No account needed.'],
                  ['Download the signed copy', 'With a completion certificate.'],
                ].map(([t, d], i) => (
                  <li key={t} className="flex gap-3">
                    <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">{i + 1}</span>
                    <span>
                      <span className="font-medium">{t}</span>
                      <span className="block text-xs text-muted-foreground">{d}</span>
                    </span>
                  </li>
                ))}
              </ol>
              <Button className="mt-4 w-full" onClick={() => navigate('/esign/new')}>
                <Plus className="h-4 w-4" /> Send a document
              </Button>
            </Card>

            <Card className="overflow-hidden !p-0">
              <h2 className="border-b px-5 py-4 font-semibold">Set up once, reuse</h2>
              <ul className="divide-y">
                {shortcuts.map((s) => {
                  const Icon = s.icon;
                  return (
                    <li key={s.title}>
                      <button type="button" onClick={() => navigate(s.to)} className="flex w-full items-center gap-3 px-5 py-3 text-left hover:bg-muted/40">
                        <Icon className="h-5 w-5 shrink-0 text-muted-foreground" />
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-medium">{s.title}</span>
                          <span className={cn('block text-xs', s.warn ? 'text-amber-600 dark:text-amber-400' : 'text-muted-foreground')}>{s.sub}</span>
                        </span>
                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                      </button>
                    </li>
                  );
                })}
              </ul>
            </Card>

            {stats.avgDays != null && (
              <Card className="flex items-center gap-3 p-5">
                <Timer className="h-8 w-8 text-indigo-500" />
                <div>
                  <p className="text-sm font-medium">Documents take {stats.avgDays < 1 ? 'under a day' : `${stats.avgDays.toFixed(1)} days`} to get signed</p>
                  <p className="text-xs text-muted-foreground">Average from sending to the last signature</p>
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}
