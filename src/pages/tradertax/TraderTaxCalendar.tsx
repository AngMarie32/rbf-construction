import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  AlarmClock,
  CalendarDays,
  CheckCircle2,
  Download,
  Loader2,
  Plus,
  Search,
  Gavel,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanies } from '@/contexts/CompanyContext';
import { tth } from '@/integrations/supabase/tradertax';
import {
  Obligation,
  ObligationKind,
  TthClient,
  TthDocumentRequest,
  TthEngagement,
  TthFiling,
  TthFirmDeadline,
  TthIntake,
  TthPosition,
} from '@/types/tradertax';
import {
  BUCKET_LABELS,
  KIND_LABELS,
  buildObligations,
  groupByBucket,
  groupByMonth,
  monthLabel,
  nextOccurrence,
  obligationsToCsv,
  obligationsToIcs,
} from '@/utils/traderTax/deadlineEngine';
import { buildFirmDeadlines } from '@/utils/traderTax/firmObligations';
import { severityTone, shortDate } from '@/utils/traderTax/labels';

const KIND_ORDER: ObligationKind[] = [
  'filing',
  'extension',
  'election',
  'consultation',
  'document',
  'position',
  'firm',
];

function download(filename: string, contents: string, mime: string) {
  const blob = new Blob([contents], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function TraderTaxCalendar() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedIds } = useCompanies();

  const [obligations, setObligations] = useState<Obligation[]>([]);
  const [firmDeadlines, setFirmDeadlines] = useState<TthFirmDeadline[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [search, setSearch] = useState('');
  const [kindFilter, setKindFilter] = useState<string>('all');
  const [ownerFilter, setOwnerFilter] = useState<string>('all');
  const [view, setView] = useState<'buckets' | 'months'>('buckets');
  const [horizon, setHorizon] = useState<string>('180');

  const companyId = selectedIds.length === 1 ? selectedIds[0] : null;

  const load = useCallback(async () => {
    setLoading(true);
    const [
      { data: clients },
      { data: engagements },
      { data: filings },
      { data: intakes },
      { data: documents },
      { data: positions },
      { data: firm },
    ] = await Promise.all([
      tth.from('tth_clients').select('*'),
      tth.from('tth_engagements').select('*'),
      tth.from('tth_filings').select('*'),
      tth.from('tth_intakes').select('*'),
      tth.from('tth_document_requests').select('*'),
      tth.from('tth_positions').select('*'),
      tth.from('tth_firm_deadlines').select('*').order('due_date'),
    ]);

    const firmRows = (firm ?? []) as TthFirmDeadline[];
    setFirmDeadlines(firmRows);
    setObligations(
      buildObligations({
        clients: (clients ?? []) as TthClient[],
        engagements: (engagements ?? []) as TthEngagement[],
        filings: (filings ?? []) as TthFiling[],
        intakes: (intakes ?? []) as TthIntake[],
        documents: (documents ?? []) as TthDocumentRequest[],
        positions: (positions ?? []) as TthPosition[],
        firmDeadlines: firmRows,
      })
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const owners = useMemo(
    () => Array.from(new Set(obligations.map((o) => o.owner).filter(Boolean) as string[])).sort(),
    [obligations]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    const limit = horizon === 'all' ? Infinity : Number(horizon);
    return obligations.filter((o) => {
      if (o.daysRemaining > limit) return false;
      if (kindFilter !== 'all' && o.kind !== kindFilter) return false;
      if (ownerFilter !== 'all' && (o.owner ?? '') !== ownerFilter) return false;
      if (!q) return true;
      return [o.title, o.clientName, o.detail].some((v) => v?.toLowerCase().includes(q));
    });
  }, [obligations, search, kindFilter, ownerFilter, horizon]);

  const counts = useMemo(
    () => ({
      overdue: obligations.filter((o) => o.bucket === 'overdue').length,
      week: obligations.filter((o) => o.bucket === 'week').length,
      month: obligations.filter((o) => o.bucket === 'month').length,
      statutorySoon: obligations.filter((o) => o.statutory && o.daysRemaining <= 30).length,
    }),
    [obligations]
  );

  const seedFirmCalendar = async () => {
    setSeeding(true);
    try {
      const existing = new Set(firmDeadlines.map((f) => f.code));
      const rows = buildFirmDeadlines(new Date().getFullYear())
        .filter((r) => !existing.has(r.code))
        .map((r) => ({ ...r, company_id: companyId, created_by: user?.id ?? null }));

      if (!rows.length) {
        toast.info('The firm calendar is already loaded');
        return;
      }
      const { error } = await tth.from('tth_firm_deadlines').insert(rows);
      if (error) throw new Error(error.message);
      toast.success(`Added ${rows.length} firm deadline${rows.length === 1 ? '' : 's'}`, {
        description: 'Confirm the e-file shutdown date against the IRS announcement — it moves every year.',
      });
      await load();
    } catch (e) {
      toast.error('Could not load the firm calendar', { description: (e as Error).message });
    } finally {
      setSeeding(false);
    }
  };

  /** Completing a recurring firm deadline rolls it to its next occurrence. */
  const completeFirmDeadline = async (obligationId: string) => {
    const id = obligationId.replace('firm:', '');
    const row = firmDeadlines.find((f) => f.id === id);
    if (!row) return;

    const next = nextOccurrence(row.due_date, row.recurrence);
    const { error } = next
      ? await tth
          .from('tth_firm_deadlines')
          .update({ due_date: next, completed_at: new Date().toISOString(), status: 'open' })
          .eq('id', id)
      : await tth
          .from('tth_firm_deadlines')
          .update({ status: 'done', completed_at: new Date().toISOString() })
          .eq('id', id);

    if (error) {
      toast.error('Could not update', { description: error.message });
      return;
    }
    toast.success(next ? `Done — rolled forward to ${shortDate(next)}` : 'Marked done');
    await load();
  };

  const exportIcs = () => {
    download('tradertaxhq-deadlines.ics', obligationsToIcs(filtered), 'text/calendar');
    toast.success(`Exported ${filtered.length} obligations`, {
      description: 'Import into Google Calendar or Outlook. Re-export after changes — this is a snapshot, not a live feed.',
    });
  };

  const groups: [string, Obligation[]][] =
    view === 'buckets'
      ? groupByBucket(filtered).map(([b, list]) => [BUCKET_LABELS[b], list])
      : groupByMonth(filtered).map(([m, list]) => [monthLabel(m), list]);

  return (
    <Layout
      title="Deadline calendar"
      subtitle="Every filing, election window, consultation, and firm obligation in one list"
    >
      {loading ? (
        <div className="flex items-center justify-center p-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Building the calendar…
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card className={`p-4 ${counts.overdue ? 'border-destructive/40' : ''}`}>
              <div className="flex items-center gap-2 text-muted-foreground">
                <AlarmClock className="h-4 w-4" />
                <span className="text-xs uppercase tracking-wide">Overdue</span>
              </div>
              <p className={`mt-2 text-2xl font-semibold ${counts.overdue ? 'text-destructive' : ''}`}>
                {counts.overdue}
              </p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <CalendarDays className="h-4 w-4" />
                <span className="text-xs uppercase tracking-wide">Next 7 days</span>
              </div>
              <p className="mt-2 text-2xl font-semibold">{counts.week}</p>
            </Card>
            <Card className="p-4">
              <span className="text-xs uppercase tracking-wide text-muted-foreground">Next 30 days</span>
              <p className="mt-2 text-2xl font-semibold">{counts.month}</p>
            </Card>
            <Card className="p-4">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Gavel className="h-4 w-4" />
                <span className="text-xs uppercase tracking-wide">Statutory ≤ 30 days</span>
              </div>
              <p className="mt-2 text-2xl font-semibold">{counts.statutorySoon}</p>
              <p className="mt-1 text-xs text-muted-foreground">Dates set by statute, not by the firm</p>
            </Card>
          </div>

          <Card className="mt-4 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="w-56 pl-9"
                  placeholder="Search deadlines…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={kindFilter} onValueChange={setKindFilter}>
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All types</SelectItem>
                  {KIND_ORDER.map((k) => (
                    <SelectItem key={k} value={k}>
                      {KIND_LABELS[k]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {owners.length > 0 && (
                <Select value={ownerFilter} onValueChange={setOwnerFilter}>
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Owner" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All owners</SelectItem>
                    {owners.map((o) => (
                      <SelectItem key={o} value={o}>
                        {o}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
              <Select value={horizon} onValueChange={setHorizon}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">Next 30 days</SelectItem>
                  <SelectItem value="90">Next 90 days</SelectItem>
                  <SelectItem value="180">Next 180 days</SelectItem>
                  <SelectItem value="365">Next 12 months</SelectItem>
                  <SelectItem value="all">Everything</SelectItem>
                </SelectContent>
              </Select>
              <Select value={view} onValueChange={(v) => setView(v as typeof view)}>
                <SelectTrigger className="w-36">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="buckets">By urgency</SelectItem>
                  <SelectItem value="months">By month</SelectItem>
                </SelectContent>
              </Select>

              <div className="ml-auto flex flex-wrap gap-2">
                <Button size="sm" variant="outline" onClick={seedFirmCalendar} disabled={seeding}>
                  {seeding ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Plus className="mr-2 h-4 w-4" />
                  )}
                  Load firm calendar
                </Button>
                <Button size="sm" variant="outline" onClick={exportIcs}>
                  <Download className="mr-2 h-4 w-4" />
                  .ics
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => download('tradertaxhq-deadlines.csv', obligationsToCsv(filtered), 'text/csv')}
                >
                  <Download className="mr-2 h-4 w-4" />
                  CSV
                </Button>
              </div>
            </div>
          </Card>

          {filtered.length === 0 ? (
            <Card className="mt-4 p-12 text-center">
              <p className="font-medium">Nothing in this window</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Widen the horizon, or load the firm calendar to track credential renewals and the security
                program review cycle.
              </p>
            </Card>
          ) : (
            <div className="mt-4 space-y-4">
              {groups.map(([label, items]) => (
                <Card key={label} className="p-5">
                  <div className="mb-3 flex items-center justify-between">
                    <h3 className="font-semibold">{label}</h3>
                    <span className="text-sm text-muted-foreground">{items.length}</span>
                  </div>
                  <div className="space-y-2">
                    {items.map((o) => (
                      <div
                        key={o.id}
                        className={`flex flex-wrap items-start gap-3 rounded-lg border p-3 ${
                          o.bucket === 'overdue' ? 'border-destructive/30 bg-destructive/5' : ''
                        }`}
                      >
                        <div className="w-28 shrink-0">
                          <div className="font-medium tabular-nums">{shortDate(o.dueDate)}</div>
                          <Badge variant={severityTone(o.severity)} className="mt-1 text-[10px]">
                            {o.daysRemaining < 0
                              ? `${Math.abs(o.daysRemaining)}d overdue`
                              : `${o.daysRemaining}d`}
                          </Badge>
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="font-medium">{o.title}</span>
                            <Badge variant="outline" className="text-[10px]">
                              {KIND_LABELS[o.kind]}
                            </Badge>
                            {o.statutory && (
                              <Badge variant="outline" className="text-[10px]">
                                statutory
                              </Badge>
                            )}
                            {o.taxYear && (
                              <span className="text-xs text-muted-foreground">TY {o.taxYear}</span>
                            )}
                            {o.owner && <span className="text-xs text-muted-foreground">· {o.owner}</span>}
                          </div>
                          {o.detail && (
                            <p className="mt-1 text-sm text-muted-foreground">{o.detail}</p>
                          )}
                          {o.authority && (
                            <p className="mt-1 text-xs italic text-muted-foreground">{o.authority}</p>
                          )}
                        </div>

                        <div className="flex gap-2">
                          {o.kind === 'firm' ? (
                            <Button size="sm" variant="outline" onClick={() => completeFirmDeadline(o.id)}>
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Done
                            </Button>
                          ) : o.href ? (
                            <Button size="sm" variant="ghost" onClick={() => navigate(o.href!)}>
                              Open
                            </Button>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </Layout>
  );
}
