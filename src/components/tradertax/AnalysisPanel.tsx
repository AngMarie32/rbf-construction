import { useMemo, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { tth } from '@/integrations/supabase/tradertax';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { toast } from 'sonner';
import {
  AlertTriangle,
  Calculator,
  Download,
  FileText,
  Loader2,
  RefreshCw,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  ConsultationAnalysis,
  IntakeAnswers,
  TthAnalysis,
  TthClient,
  TthDocumentRequest,
  TthEngagement,
  TthPosition,
} from '@/types/tradertax';
import { runConsultationAnalysis } from '@/utils/traderTax/consultationEngine';
import { downloadConsultationMemo } from '@/utils/traderTax/consultationPdf';
import { ttsTierLabel } from '@/utils/traderTax/ttsAnalysis';
import { money, riskTone, severityTone, shortDate, ttsTone } from '@/utils/traderTax/labels';

interface AnalysisPanelProps {
  client: TthClient;
  engagement: TthEngagement;
  answers: IntakeAnswers;
  documents: TthDocumentRequest[];
  analyses: TthAnalysis[];
  positions: TthPosition[];
  onRefresh: () => Promise<void> | void;
}

export function AnalysisPanel({
  client,
  engagement,
  answers,
  documents,
  analyses,
  positions,
  onRefresh,
}: AnalysisPanelProps) {
  const { user } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [memoDraft, setMemoDraft] = useState<string>(analyses[0]?.ai_memo ?? '');

  const latest = analyses[0] ?? null;

  // The deterministic engine is cheap and pure — recompute on every render so
  // the preparer always sees the analysis for the answers currently on screen.
  const live: ConsultationAnalysis = useMemo(
    () =>
      runConsultationAnalysis({
        taxYear: engagement.tax_year,
        answers,
        documents: documents.map((d) => ({
          code: d.code,
          name: d.name,
          is_required: d.is_required,
          status: d.status,
        })),
      }),
    [answers, documents, engagement.tax_year]
  );

  const handleDraftMemo = async () => {
    setBusy('ai');
    try {
      const { data, error } = await supabase.functions.invoke('tth-analyze', {
        body: {
          engagement_id: engagement.id,
          analysis: live,
          client_profile: {
            display_name: client.display_name,
            entity_type: client.entity_type,
            filing_status: client.filing_status,
            home_state: client.home_state,
            other_states: client.other_states,
            service_type: engagement.service_type,
          },
          documents: documents.map((d) => ({ name: d.name, status: d.status, required: d.is_required })),
        },
      });
      if (error) throw new Error(error.message);
      const body = data as { error?: string; memo?: string };
      if (body?.error) throw new Error(body.error);

      setMemoDraft(body.memo ?? '');
      toast.success('Draft memo generated — review before sending');
      await onRefresh();
    } catch (e) {
      toast.error('Could not draft the memo', { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const handleSaveSnapshot = async () => {
    setBusy('snapshot');
    try {
      const { error } = await tth.from('tth_analyses').insert({
        engagement_id: engagement.id,
        tax_year: engagement.tax_year,
        engine_version: live.engineVersion,
        computed: live,
        ai_memo: memoDraft || null,
        status: 'draft',
        generated_by: user?.id ?? null,
      });
      if (error) throw new Error(error.message);
      toast.success('Analysis snapshot saved');
      await onRefresh();
    } catch (e) {
      toast.error('Could not save the snapshot', { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const handlePushPositions = async () => {
    setBusy('positions');
    try {
      const existing = new Set(positions.map((p) => p.code));
      const rows = live.positions
        .filter((p) => !existing.has(p.code))
        .map((p, i) => ({
          engagement_id: engagement.id,
          analysis_id: latest?.id ?? null,
          code: p.code,
          title: p.title,
          category: p.category,
          recommendation: p.recommendation,
          rationale: p.rationale,
          authority: p.authority,
          risk_level: p.riskLevel,
          impact_estimate: p.impactEstimate,
          due_date: p.dueDate,
          status: 'proposed',
          sort_order: i,
        }));

      if (!rows.length) {
        toast.info('All proposed positions are already on the action plan');
        return;
      }
      const { error } = await tth.from('tth_positions').insert(rows);
      if (error) throw new Error(error.message);
      toast.success(`Added ${rows.length} position${rows.length === 1 ? '' : 's'} to the action plan`);
      await onRefresh();
    } catch (e) {
      toast.error('Could not add positions', { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const handlePushFilings = async () => {
    setBusy('filings');
    try {
      const { data: existing } = await tth
        .from('tth_filings')
        .select('form_code, jurisdiction')
        .eq('engagement_id', engagement.id);
      const seen = new Set((existing ?? []).map((f) => `${f.form_code}|${f.jurisdiction}`));

      const rows = live.filings
        .filter((f) => !seen.has(`${f.formCode}|${f.jurisdiction}`))
        .map((f, i) => ({
          engagement_id: engagement.id,
          tax_year: engagement.tax_year,
          form_code: f.formCode,
          form_name: f.formName,
          jurisdiction: f.jurisdiction,
          entity_scope: f.entityScope,
          due_date: f.dueDate,
          extended_due_date: f.extendedDueDate,
          status: 'not_started',
          notes: [f.reason, f.notes].filter(Boolean).join(' '),
          sort_order: i,
        }));

      if (!rows.length) {
        toast.info('Filing checklist already covers these forms');
        return;
      }
      const { error } = await tth.from('tth_filings').insert(rows);
      if (error) throw new Error(error.message);
      toast.success(`Added ${rows.length} filing${rows.length === 1 ? '' : 's'}`);
      await onRefresh();
    } catch (e) {
      toast.error('Could not add filings', { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const handleExport = () => {
    downloadConsultationMemo({
      client,
      engagement,
      analysis: live,
      positions,
      memoNarrative: memoDraft || null,
      preparerName: user?.email ?? undefined,
      firmName: 'TraderTaxHQ',
    });
  };

  return (
    <div className="space-y-4">
      {live.configStatus !== 'verified' && (
        <Card className="border-amber-300 bg-amber-50 p-4">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
            <div className="text-sm text-amber-900">
              <p className="font-medium">Tax year {live.taxYear} parameters are unverified.</p>
              <p className="mt-1">{live.configNote}</p>
              <p className="mt-1">
                Confirm the figures in <code>src/utils/traderTax/taxYearConfig.ts</code> and flip that
                year’s <code>status</code> to <code>verified</code> before delivering numbers.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* --- Actions ---------------------------------------------------- */}
      <Card className="flex flex-wrap items-center justify-between gap-3 p-4">
        <div className="flex items-center gap-2">
          <Calculator className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            Engine {live.engineVersion} · recomputed live from the current intake
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={handleSaveSnapshot} disabled={busy === 'snapshot'}>
            {busy === 'snapshot' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Save snapshot
          </Button>
          <Button size="sm" variant="outline" onClick={handlePushPositions} disabled={busy === 'positions'}>
            Add positions to plan
          </Button>
          <Button size="sm" variant="outline" onClick={handlePushFilings} disabled={busy === 'filings'}>
            Build filing checklist
          </Button>
          <Button size="sm" onClick={handleDraftMemo} disabled={busy === 'ai'}>
            {busy === 'ai' ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="mr-2 h-4 w-4" />
            )}
            Draft memo
          </Button>
          <Button size="sm" variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export PDF
          </Button>
        </div>
      </Card>

      {/* --- Funded account (the headline for prop clients) ---------------- */}
      {live.propFirm && (
        <Card className="mt-4 border-primary/30 p-5">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h3 className="font-semibold">Funded account income</h3>
            <Badge variant="info">{live.propFirm.characterization.replace(/_/g, ' ')}</Badge>
            {live.propFirm.hobbyLossRisk !== 'none' && (
              <Badge variant="warning">profit motive: {live.propFirm.hobbyLossRisk}</Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{live.propFirm.characterizationNote}</p>

          <div className="mt-4 grid gap-x-6 gap-y-1 sm:grid-cols-2">
            <Metric label="Gross payouts" value={money(live.propFirm.grossPayouts)} />
            <Metric label="Evaluation and platform fees" value={money(-live.propFirm.deductibleFees)} />
            <Metric label="Net profit" value={money(live.propFirm.netProfit)} />
            <Metric label="Self-employment tax" value={money(live.propFirm.selfEmploymentTax)} />
            <Metric label="QBI deduction" value={money(live.propFirm.qbiEstimate)} />
            <Metric label="Solo 401(k) capacity" value={money(live.propFirm.retirementCapacity)} />
          </div>

          {live.propFirm.qbiNote && (
            <p className="mt-3 text-sm text-muted-foreground">{live.propFirm.qbiNote}</p>
          )}

          {live.propFirm.scenarios.length > 0 && (
            <div className="mt-4 space-y-2">
              <p className="text-sm font-medium">Structure</p>
              {live.propFirm.scenarios.map((sc) => (
                <div
                  key={sc.key}
                  className={`rounded-md border p-3 ${
                    sc.key === live.propFirm!.recommendedStructure
                      ? 'border-primary/50 bg-primary/5'
                      : ''
                  }`}
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-medium">{sc.label}</span>
                    <span className="text-sm font-semibold tabular-nums">
                      {sc.key === 'sole_prop' ? 'baseline' : `Net ${money(sc.netBenefit)}`}
                    </span>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{sc.description}</p>
                  <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm md:grid-cols-3">
                    {sc.reasonableComp > 0 && (
                      <Metric label="Reasonable comp" value={money(sc.reasonableComp)} />
                    )}
                    <Metric label="Employment tax" value={money(-sc.employmentTax)} />
                    {sc.adminCost > 0 && <Metric label="Admin" value={money(-sc.adminCost)} />}
                  </div>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                    {sc.notes.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* --- Headline metrics -------------------------------------------- */}
      <div className="grid gap-4 md:grid-cols-4">
        {live.propFirm && live.projection.selfEmploymentTax > 0 ? (
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Self-employment tax</p>
            <p className="mt-2 text-2xl font-semibold">
              {money(live.projection.selfEmploymentTax)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              On {money(live.projection.propNetProfit)} of funded-account profit
            </p>
          </Card>
        ) : (
          <Card className="p-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Trader tax status</p>
            <div className="mt-2 flex items-center gap-2">
              <span className="text-2xl font-semibold">{live.tts.score}</span>
              <Badge variant={ttsTone(live.tts.tier)}>{ttsTierLabel(live.tts.tier)}</Badge>
            </div>
            <Progress value={live.tts.score} className="mt-3 h-1.5" />
          </Card>
        )}
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Projected federal tax</p>
          <p className="mt-2 text-2xl font-semibold">{money(live.projection.estimatedFederalTax)}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Balance due {money(live.projection.projectedBalanceDue)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Marginal rate</p>
          <p className="mt-2 text-2xl font-semibold">
            {Math.round(live.projection.marginalRate * 100)}%
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Quarterly {money(live.projection.quarterlyRecommendation)}
          </p>
        </Card>
        <Card className="p-4">
          <p className="text-xs uppercase tracking-wide text-muted-foreground">Readiness</p>
          <p className="mt-2 text-2xl font-semibold">
            {live.readiness.intakeCompletion.toFixed(0)}%
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {live.readiness.documentsReceived}/{live.readiness.documentsRequired} required docs ·{' '}
            {live.readiness.readyForConsult ? 'ready for consult' : 'gaps outstanding'}
          </p>
        </Card>
      </div>

      {/* --- Findings ------------------------------------------------------ */}
      <Card className="p-5">
        <h3 className="mb-3 font-semibold">Findings</h3>
        <div className="space-y-3">
          {live.findings.map((f) => (
            <div key={f.id} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={severityTone(f.severity)} className="text-[10px] uppercase">
                  {f.severity}
                </Badge>
                <span className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {f.area}
                </span>
                {f.estimatedImpact ? (
                  <span className="ml-auto text-sm font-medium">{money(f.estimatedImpact)}</span>
                ) : null}
              </div>
              <p className="mt-2 font-medium">{f.statement}</p>
              <p className="mt-1 text-sm text-muted-foreground">{f.detail}</p>
              {f.authority && (
                <p className="mt-1 text-xs italic text-muted-foreground">{f.authority}</p>
              )}
            </div>
          ))}
        </div>
      </Card>

      {/* --- Detail accordions --------------------------------------------- */}
      <Accordion type="multiple" className="space-y-3">
        <AccordionItem value="tts" className="rounded-lg border px-4">
          <AccordionTrigger className="text-sm font-semibold">
            Trader tax status — factor detail
          </AccordionTrigger>
          <AccordionContent>
            <p className="mb-4 text-sm text-muted-foreground">{live.tts.narrative}</p>
            <div className="space-y-3">
              {live.tts.factors.map((f) => (
                <div key={f.key} className="rounded-md border p-3">
                  <div className="flex items-center justify-between gap-3">
                    <span className="font-medium">{f.label}</span>
                    <span className="text-sm tabular-nums text-muted-foreground">
                      {Math.round(f.score * 100)}% · weight {Math.round(f.weight * 100)}%
                    </span>
                  </div>
                  <Progress value={f.score * 100} className="mt-2 h-1.5" />
                  <dl className="mt-2 space-y-1 text-sm">
                    <div className="flex gap-2">
                      <dt className="w-24 shrink-0 text-muted-foreground">Observed</dt>
                      <dd>{f.observed}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-24 shrink-0 text-muted-foreground">Benchmark</dt>
                      <dd>{f.benchmark}</dd>
                    </div>
                    <div className="flex gap-2">
                      <dt className="w-24 shrink-0 text-muted-foreground">Read</dt>
                      <dd>{f.comment}</dd>
                    </div>
                  </dl>
                  <p className="mt-2 text-xs italic text-muted-foreground">{f.authority}</p>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="elections" className="rounded-lg border px-4">
          <AccordionTrigger className="text-sm font-semibold">
            Section 475(f) and elections
          </AccordionTrigger>
          <AccordionContent className="space-y-4">
            <p className="text-sm">{live.elections.currentState}</p>
            <div>
              <p className="text-sm font-medium">Recommendation</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {live.elections.rationale.map((r, i) => (
                  <li key={i}>{r}</li>
                ))}
              </ul>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm font-medium text-emerald-700">Advantages</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {live.elections.tradeoffs.pro.map((p, i) => (
                    <li key={i}>{p}</li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-sm font-medium text-amber-700">Costs</p>
                <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                  {live.elections.tradeoffs.con.map((c, i) => (
                    <li key={i}>{c}</li>
                  ))}
                </ul>
              </div>
            </div>
            <Separator />
            <div className="space-y-2">
              {live.elections.deadlines.map((d) => (
                <div key={d.code} className="flex flex-wrap items-start gap-3 rounded-md border p-3">
                  <div className="min-w-[120px]">
                    <p className="font-medium tabular-nums">{shortDate(d.dueDate)}</p>
                    <Badge
                      variant={
                        d.status === 'past'
                          ? 'destructive'
                          : d.status === 'already_made'
                          ? 'success'
                          : (d.daysRemaining ?? 0) < 45
                          ? 'warning'
                          : 'info'
                      }
                      className="mt-1 text-[10px]"
                    >
                      {d.status === 'open' ? `${d.daysRemaining} days` : d.status.replace(/_/g, ' ')}
                    </Badge>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{d.label}</p>
                    <p className="text-sm text-muted-foreground">{d.description}</p>
                    <p className="mt-1 text-xs italic text-muted-foreground">{d.authority}</p>
                  </div>
                </div>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="entity" className="rounded-lg border px-4">
          <AccordionTrigger className="text-sm font-semibold">Entity and retirement structure</AccordionTrigger>
          <AccordionContent className="space-y-3">
            {live.entity.scenarios.map((s) => (
              <div
                key={s.key}
                className={`rounded-md border p-3 ${
                  s.key === live.entity.recommended ? 'border-primary/50 bg-primary/5' : ''
                }`}
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium">{s.label}</span>
                  <span className="text-sm font-semibold tabular-nums">
                    Net {money(s.netBenefit)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{s.description}</p>
                <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1 text-sm md:grid-cols-3">
                  <Metric label="W-2 comp" value={money(s.officerComp)} />
                  <Metric label="Retirement" value={money(s.retirementDeduction)} />
                  <Metric label="Health" value={money(s.healthInsuranceDeduction)} />
                  <Metric label="Payroll tax" value={money(-s.payrollTaxCost)} />
                  <Metric label="Admin" value={money(-s.adminCost)} />
                  <Metric label="Deduction value" value={money(s.taxBenefit)} />
                </div>
                {s.notes.length > 0 && (
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
                    {s.notes.map((n, i) => (
                      <li key={i}>{n}</li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
            <div className="text-sm text-muted-foreground">
              {live.entity.rationale.map((r, i) => (
                <p key={i} className="mt-1">
                  {r}
                </p>
              ))}
              {live.entity.cautions.map((c, i) => (
                <p key={`c${i}`} className="mt-1 text-amber-700">
                  {c}
                </p>
              ))}
            </div>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="projection" className="rounded-lg border px-4">
          <AccordionTrigger className="text-sm font-semibold">Federal projection</AccordionTrigger>
          <AccordionContent>
            <div className="grid gap-x-6 gap-y-2 sm:grid-cols-2">
              <Metric label="Ordinary income" value={money(live.projection.ordinaryIncome)} />
              <Metric label="Trading ordinary (475/988)" value={money(live.projection.tradingOrdinary)} />
              <Metric label="Short-term capital" value={money(live.projection.capitalShortTerm)} />
              <Metric label="Long-term capital" value={money(live.projection.capitalLongTerm)} />
              <Metric label="Section 1256 net" value={money(live.projection.sec1256Net)} />
              <Metric label="Capital loss used" value={money(live.projection.allowableCapitalLoss)} />
              <Metric
                label="Capital loss carryforward"
                value={money(live.projection.capitalLossCarryforward)}
              />
              <Metric label="Wash sales disallowed" value={money(live.projection.washSaleAddback)} />
              <Metric label="Taxable income" value={money(live.projection.estimatedTaxableIncome)} />
              <Metric label="Estimated federal tax" value={money(live.projection.estimatedFederalTax)} />
              <Metric label="Net investment income tax" value={money(live.projection.niitExposure)} />
              <Metric label="Payments made" value={money(live.projection.estimatedPaymentsMade)} />
              <Metric label="Safe harbor target" value={money(live.projection.safeHarborTarget)} />
              <Metric
                label="Recommended quarterly"
                value={money(live.projection.quarterlyRecommendation)}
              />
            </div>
            <Separator className="my-4" />
            <p className="text-sm font-medium">Assumptions</p>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
              {live.projection.assumptions.map((a, i) => (
                <li key={i}>{a}</li>
              ))}
            </ul>
          </AccordionContent>
        </AccordionItem>

        <AccordionItem value="agenda" className="rounded-lg border px-4">
          <AccordionTrigger className="text-sm font-semibold">
            Consultation agenda and open questions
          </AccordionTrigger>
          <AccordionContent className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-medium">Agenda</p>
              <ol className="mt-1 list-decimal space-y-1 pl-5 text-sm text-muted-foreground">
                {live.consultAgenda.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ol>
            </div>
            <div>
              <p className="text-sm font-medium">Ask the client</p>
              <ul className="mt-1 list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {live.clientQuestions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          </AccordionContent>
        </AccordionItem>
      </Accordion>

      {/* --- Memo ----------------------------------------------------------- */}
      <Card className="p-5">
        <div className="mb-3 flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold">Client memo (draft)</h3>
          {latest?.ai_model && (
            <Badge variant="outline" className="text-[10px]">
              {latest.ai_model}
            </Badge>
          )}
        </div>
        <Textarea
          rows={16}
          value={memoDraft}
          onChange={(e) => setMemoDraft(e.target.value)}
          placeholder="Draft the memo with the button above, then edit it here before exporting. Nothing leaves this screen until you export or send it."
          className="font-mono text-sm"
        />
        <p className="mt-2 text-xs text-muted-foreground">
          Preparer work product. Review every figure and citation before this goes to a client.
        </p>
      </Card>

      {latest?.ai_call_script && (
        <Card className="p-5">
          <h3 className="mb-2 font-semibold">Call script</h3>
          <pre className="whitespace-pre-wrap text-sm text-muted-foreground">
            {latest.ai_call_script}
          </pre>
        </Card>
      )}

      {/* --- Proposed positions --------------------------------------------- */}
      <Card className="p-5">
        <h3 className="mb-3 font-semibold">Proposed positions</h3>
        <div className="space-y-2">
          {live.positions.map((p) => (
            <div key={p.code} className="rounded-lg border p-3">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-medium">{p.title}</span>
                <Badge variant={riskTone(p.riskLevel)} className="text-[10px]">
                  {p.riskLevel} risk
                </Badge>
                {p.dueDate && (
                  <span className="text-xs text-muted-foreground">due {shortDate(p.dueDate)}</span>
                )}
                {p.impactEstimate ? (
                  <span className="ml-auto text-sm font-medium">{money(p.impactEstimate)}</span>
                ) : null}
              </div>
              <p className="mt-1 text-sm">{p.recommendation}</p>
              <p className="mt-1 text-xs italic text-muted-foreground">{p.authority}</p>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-dashed py-1">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className="text-sm font-medium tabular-nums">{value}</span>
    </div>
  );
}
