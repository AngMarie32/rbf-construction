import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader2, ArrowRight, CalendarClock, FileWarning, Users } from 'lucide-react';
import { tth } from '@/integrations/supabase/tradertax';
import {
  TthClient,
  TthDocumentRequest,
  TthEngagement,
  TthFiling,
  TthIntake,
} from '@/types/tradertax';
import {
  ENGAGEMENT_PIPELINE,
  engagementStatusLabel,
  engagementTone,
  shortDate,
} from '@/utils/traderTax/labels';
import { DEFAULT_TAX_YEAR, daysUntil, electionWindowSummary } from '@/utils/traderTax/dashboardHelpers';

interface Row {
  engagement: TthEngagement;
  client: TthClient | undefined;
  intake: TthIntake | undefined;
  openRequiredDocs: number;
  nextFiling: TthFiling | undefined;
}

export default function TraderTaxDashboard() {
  const navigate = useNavigate();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: clients }, { data: engagements }] = await Promise.all([
      tth.from('tth_clients').select('*'),
      tth.from('tth_engagements').select('*').order('tax_year', { ascending: false }),
    ]);

    const engagementList = (engagements ?? []) as TthEngagement[];
    const ids = engagementList.map((e) => e.id);

    let intakes: TthIntake[] = [];
    let docs: TthDocumentRequest[] = [];
    let filings: TthFiling[] = [];
    if (ids.length) {
      const [{ data: i }, { data: d }, { data: f }] = await Promise.all([
        tth.from('tth_intakes').select('*').in('engagement_id', ids),
        tth.from('tth_document_requests').select('*').in('engagement_id', ids),
        tth.from('tth_filings').select('*').in('engagement_id', ids),
      ]);
      intakes = (i ?? []) as TthIntake[];
      docs = (d ?? []) as TthDocumentRequest[];
      filings = (f ?? []) as TthFiling[];
    }

    setRows(
      engagementList.map((e) => ({
        engagement: e,
        client: (clients ?? []).find((c) => c.id === e.client_id) as TthClient | undefined,
        intake: intakes.find((i) => i.engagement_id === e.id),
        openRequiredDocs: docs.filter(
          (d) => d.engagement_id === e.id && d.is_required && d.status === 'requested'
        ).length,
        nextFiling: filings
          .filter(
            (f) =>
              f.engagement_id === e.id &&
              f.due_date &&
              !['accepted', 'efiled', 'paper_filed', 'n_a'].includes(f.status)
          )
          .sort((a, b) => (a.due_date ?? '').localeCompare(b.due_date ?? ''))[0],
      }))
    );
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const active = useMemo(() => rows.filter((r) => r.engagement.status !== 'closed'), [rows]);

  const pipeline = useMemo(() => {
    const counts: Record<string, number> = {};
    ENGAGEMENT_PIPELINE.forEach((s) => {
      counts[s] = active.filter((r) => r.engagement.status === s).length;
    });
    return counts;
  }, [active]);

  const awaitingDocs = active.filter((r) => r.openRequiredDocs > 0);
  const upcomingConsults = active
    .filter((r) => r.engagement.consult_at)
    .sort((a, b) => (a.engagement.consult_at ?? '').localeCompare(b.engagement.consult_at ?? ''))
    .slice(0, 6);
  const dueSoon = active
    .filter((r) => r.nextFiling?.due_date && daysUntil(r.nextFiling.due_date) <= 45)
    .sort((a, b) => (a.nextFiling!.due_date ?? '').localeCompare(b.nextFiling!.due_date ?? ''))
    .slice(0, 8);

  const election = electionWindowSummary(DEFAULT_TAX_YEAR);

  if (loading) {
    return (
      <Layout title="TraderTaxHQ" subtitle="Loading…">
        <div className="flex items-center justify-center p-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading…
        </div>
      </Layout>
    );
  }

  return (
    <Layout title="TraderTaxHQ" subtitle="Consultation and filing pipeline">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Users className="h-4 w-4" />
            <span className="text-xs uppercase tracking-wide">Active engagements</span>
          </div>
          <p className="mt-2 text-2xl font-semibold">{active.length}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <FileWarning className="h-4 w-4" />
            <span className="text-xs uppercase tracking-wide">Awaiting documents</span>
          </div>
          <p className="mt-2 text-2xl font-semibold">{awaitingDocs.length}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <CalendarClock className="h-4 w-4" />
            <span className="text-xs uppercase tracking-wide">Filings due ≤ 45 days</span>
          </div>
          <p className="mt-2 text-2xl font-semibold">{dueSoon.length}</p>
        </Card>
        <Card className="p-4">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            475(f) window — {election.year}
          </span>
          <p className="mt-2 text-lg font-semibold">{shortDate(election.dueDate)}</p>
          <p className="mt-1 text-xs text-muted-foreground">{election.note}</p>
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <h3 className="mb-3 font-semibold">Pipeline</h3>
        <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-5">
          {ENGAGEMENT_PIPELINE.filter((s) => s !== 'closed').map((s) => {
            const count = pipeline[s] ?? 0;
            const pct = active.length ? (count / active.length) * 100 : 0;
            return (
              <div key={s} className="rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">{engagementStatusLabel(s)}</span>
                  <span className="text-sm font-semibold tabular-nums">{count}</span>
                </div>
                <Progress value={pct} className="mt-2 h-1.5" />
              </div>
            );
          })}
        </div>
      </Card>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <h3 className="mb-3 font-semibold">Upcoming consultations</h3>
          {upcomingConsults.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing scheduled.</p>
          ) : (
            <div className="space-y-2">
              {upcomingConsults.map((r) => (
                <button
                  key={r.engagement.id}
                  onClick={() => navigate(`/tradertax/clients/${r.engagement.client_id}`)}
                  className="flex w-full items-center justify-between rounded-md border p-3 text-left hover:bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{r.client?.display_name ?? 'Client'}</p>
                    <p className="text-xs text-muted-foreground">
                      {shortDate(r.engagement.consult_at)} · TY {r.engagement.tax_year}
                    </p>
                  </div>
                  <Badge variant={engagementTone(r.engagement.status)}>
                    {engagementStatusLabel(r.engagement.status)}
                  </Badge>
                </button>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <h3 className="mb-3 font-semibold">Deadlines inside 45 days</h3>
          {dueSoon.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nothing due soon.</p>
          ) : (
            <div className="space-y-2">
              {dueSoon.map((r) => {
                const days = daysUntil(r.nextFiling!.due_date!);
                return (
                  <button
                    key={r.engagement.id}
                    onClick={() => navigate(`/tradertax/clients/${r.engagement.client_id}`)}
                    className="flex w-full items-center justify-between rounded-md border p-3 text-left hover:bg-muted/50"
                  >
                    <div>
                      <p className="font-medium">{r.client?.display_name ?? 'Client'}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.nextFiling!.form_code} · {shortDate(r.nextFiling!.due_date)}
                      </p>
                    </div>
                    <Badge variant={days < 0 ? 'destructive' : days < 14 ? 'warning' : 'info'}>
                      {days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`}
                    </Badge>
                  </button>
                );
              })}
            </div>
          )}
        </Card>
      </div>

      <Card className="mt-4 p-5">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-semibold">Waiting on documents</h3>
          <Button size="sm" variant="ghost" onClick={() => navigate('/tradertax/clients')}>
            All clients <ArrowRight className="ml-1 h-4 w-4" />
          </Button>
        </div>
        {awaitingDocs.length === 0 ? (
          <p className="text-sm text-muted-foreground">Every required document is in.</p>
        ) : (
          <div className="space-y-2">
            {awaitingDocs.slice(0, 10).map((r) => (
              <button
                key={r.engagement.id}
                onClick={() => navigate(`/tradertax/clients/${r.engagement.client_id}`)}
                className="flex w-full items-center justify-between rounded-md border p-3 text-left hover:bg-muted/50"
              >
                <div>
                  <p className="font-medium">{r.client?.display_name ?? 'Client'}</p>
                  <p className="text-xs text-muted-foreground">
                    TY {r.engagement.tax_year} · intake{' '}
                    {r.intake ? `${Number(r.intake.completion_pct).toFixed(0)}%` : 'not started'}
                  </p>
                </div>
                <Badge variant="warning">{r.openRequiredDocs} outstanding</Badge>
              </button>
            ))}
          </div>
        )}
      </Card>
    </Layout>
  );
}
