import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Check, Copy, Link2, Loader2, Search, UserPlus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanies } from '@/contexts/CompanyContext';
import { inquiryLinkFor, tth } from '@/integrations/supabase/tradertax';
import { EntityType, IntakeAnswers, LeadStatus, TthLead } from '@/types/tradertax';
import { LEAD_STATUS_FLOW, leadTierTone, quoteFee, triageLead } from '@/utils/traderTax/leadScoring';
import { DEFAULT_TAX_YEAR } from '@/utils/traderTax/taxYearConfig';
import { money, shortDate } from '@/utils/traderTax/labels';
import { INTAKE_SCHEMA_VERSION } from '@/utils/traderTax/intakeSchema';

const STATUS_LABELS: Record<LeadStatus, string> = {
  new: 'New',
  contacted: 'Contacted',
  qualified: 'Qualified',
  quoted: 'Quoted',
  won: 'Won',
  lost: 'Lost',
  disqualified: 'Disqualified',
};

export default function TraderTaxLeads() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { selectedIds } = useCompanies();
  const companyId = selectedIds.length === 1 ? selectedIds[0] : null;

  const [leads, setLeads] = useState<TthLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('open');
  const [selected, setSelected] = useState<TthLead | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await tth
      .from('tth_leads')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) toast.error('Could not load leads', { description: error.message });
    setLeads((data ?? []) as TthLead[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Triage is recomputed from the stored screening answers rather than trusted
  // from whatever the public form posted.
  const triageFor = useCallback(
    (lead: TthLead) =>
      triageLead((lead.screening ?? {}) as IntakeAnswers, lead.tax_year ?? DEFAULT_TAX_YEAR),
    []
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return leads.filter((l) => {
      if (statusFilter === 'open' && ['won', 'lost', 'disqualified'].includes(l.status)) return false;
      if (statusFilter !== 'open' && statusFilter !== 'all' && l.status !== statusFilter) return false;
      if (!q) return true;
      return [l.name, l.email, l.service_wanted].some((v) => v?.toLowerCase().includes(q));
    });
  }, [leads, search, statusFilter]);

  const stats = useMemo(() => {
    const open = leads.filter((l) => !['won', 'lost', 'disqualified'].includes(l.status));
    const won = leads.filter((l) => l.status === 'won');
    const decided = leads.filter((l) => ['won', 'lost', 'disqualified'].includes(l.status));
    const quotedValue = open
      .filter((l) => l.quoted_fee_low)
      .reduce((s, l) => s + Number(l.quoted_fee_low ?? 0), 0);
    return {
      open: open.length,
      won: won.length,
      conversion: decided.length ? Math.round((won.length / decided.length) * 100) : null,
      pipelineValue: quotedValue,
      needsAction: open.filter(
        (l) => l.next_action_on && l.next_action_on <= new Date().toISOString().slice(0, 10)
      ).length,
    };
  }, [leads]);

  const setStatus = async (lead: TthLead, status: LeadStatus) => {
    const triage = triageFor(lead);
    const { error } = await tth
      .from('tth_leads')
      .update({
        status,
        triage_score: triage.score,
        triage_tier: triage.tier,
        triage_summary: triage.summary,
      })
      .eq('id', lead.id);
    if (error) {
      toast.error('Could not update', { description: error.message });
      return;
    }
    await load();
    setSelected(null);
  };

  const saveQuote = async (lead: TthLead) => {
    const quote = quoteFee(
      (lead.screening ?? {}) as IntakeAnswers,
      lead.service_wanted ?? 'consultation'
    );
    setBusy('quote');
    const { error } = await tth
      .from('tth_leads')
      .update({
        quoted_fee_low: quote.low,
        quoted_fee_high: quote.high,
        quoted_at: new Date().toISOString(),
        status: lead.status === 'new' || lead.status === 'contacted' ? 'quoted' : lead.status,
        complexity: { lines: quote.lines, base: quote.base },
      })
      .eq('id', lead.id);
    setBusy(null);
    if (error) {
      toast.error('Could not save the quote', { description: error.message });
      return;
    }
    toast.success(`Quote saved: ${money(quote.low)}–${money(quote.high)}`);
    await load();
    setSelected(null);
  };

  /** Turns a won lead into a client, an engagement, and a pre-filled intake. */
  const convert = async (lead: TthLead) => {
    setBusy('convert');
    try {
      const screening = (lead.screening ?? {}) as IntakeAnswers;
      const entityType: EntityType = screening.entity_exists === true ? 'smllc' : 'individual';
      const taxYear = lead.tax_year ?? DEFAULT_TAX_YEAR;

      const { data: client, error: clientError } = await tth
        .from('tth_clients')
        .insert({
          company_id: companyId ?? lead.company_id,
          display_name: lead.name,
          email: lead.email,
          phone: lead.phone,
          entity_type: entityType,
          home_state: typeof screening.home_state === 'string' ? screening.home_state : null,
          status: 'onboarding',
          source: lead.source,
          notes: lead.notes,
          created_by: user?.id ?? null,
        })
        .select('*')
        .single();
      if (clientError || !client) throw new Error(clientError?.message ?? 'Client not created');

      const { data: engagement, error: engError } = await tth
        .from('tth_engagements')
        .insert({
          client_id: client.id,
          company_id: companyId ?? lead.company_id,
          tax_year: taxYear,
          service_type: lead.service_wanted ?? 'consultation',
          status: 'intake',
          fee: lead.quoted_fee_low,
          created_by: user?.id ?? null,
        })
        .select('*')
        .single();
      if (engError || !engagement) throw new Error(engError?.message ?? 'Engagement not created');

      // Carry the screening answers into the intake so the client is not asked
      // the same questions twice.
      const { error: intakeError } = await tth.from('tth_intakes').insert({
        engagement_id: engagement.id,
        client_id: client.id,
        tax_year: taxYear,
        schema_version: INTAKE_SCHEMA_VERSION,
        status: 'draft',
        answers: screening,
        created_by: user?.id ?? null,
      });
      if (intakeError) console.error('Intake prefill failed', intakeError);

      await tth
        .from('tth_leads')
        .update({ status: 'won', converted_client_id: client.id, converted_at: new Date().toISOString() })
        .eq('id', lead.id);

      await tth.from('tth_activity').insert({
        client_id: client.id,
        engagement_id: engagement.id,
        kind: 'lead_converted',
        message: `Converted from lead (${lead.source}). Screening answers carried into the intake.`,
        actor: user?.id ?? null,
      });

      toast.success('Lead converted');
      navigate(`/tradertax/clients/${client.id}`);
    } catch (e) {
      toast.error('Could not convert the lead', { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const inquiryLink = inquiryLinkFor(companyId);

  return (
    <Layout title="Leads" subtitle="Inquiries, triage, quotes, and conversion">
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Open leads</span>
          <p className="mt-2 text-2xl font-semibold">{stats.open}</p>
          {stats.needsAction > 0 && (
            <p className="mt-1 text-xs text-amber-700">{stats.needsAction} need follow-up today</p>
          )}
        </Card>
        <Card className="p-4">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Won</span>
          <p className="mt-2 text-2xl font-semibold">{stats.won}</p>
        </Card>
        <Card className="p-4">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Conversion</span>
          <p className="mt-2 text-2xl font-semibold">
            {stats.conversion === null ? '—' : `${stats.conversion}%`}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">Of decided leads</p>
        </Card>
        <Card className="p-4">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Quoted pipeline</span>
          <p className="mt-2 text-2xl font-semibold">{money(stats.pipelineValue)}</p>
          <p className="mt-1 text-xs text-muted-foreground">Low end of open quotes</p>
        </Card>
      </div>

      <Card className="mt-4 p-4">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="w-56 pl-9"
              placeholder="Search leads…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="open">Open</SelectItem>
              <SelectItem value="all">All</SelectItem>
              {LEAD_STATUS_FLOW.map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="ml-auto flex items-center gap-2">
            <Input readOnly value={inquiryLink} className="w-72 font-mono text-xs" />
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(inquiryLink);
                setCopied(true);
                toast.success('Inquiry link copied', {
                  description: 'Put it on the site, in your bio, or at the end of a post.',
                });
              }}
            >
              {copied ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center p-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading leads…
        </div>
      ) : filtered.length === 0 ? (
        <Card className="mt-4 p-12 text-center">
          <p className="font-medium">No leads yet</p>
          <p className="mx-auto mt-1 max-w-lg text-sm text-muted-foreground">
            Share the inquiry link above. Submissions land here scored against the same trader-status
            factors the full analysis uses, with a fee range from your rate card.
          </p>
        </Card>
      ) : (
        <div className="mt-4 space-y-2">
          {filtered.map((lead) => {
            const triage = triageFor(lead);
            return (
              <Card
                key={lead.id}
                className="cursor-pointer p-4 transition-colors hover:bg-muted/40"
                onClick={() => setSelected(lead)}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium">{lead.name}</span>
                      <Badge variant={leadTierTone(triage.tier) as never}>
                        {triage.tier.replace(/_/g, ' ')} · {triage.score}
                      </Badge>
                      <Badge variant="outline" className="text-[10px]">
                        {STATUS_LABELS[lead.status]}
                      </Badge>
                      {lead.service_wanted && (
                        <span className="text-xs text-muted-foreground">
                          {lead.service_wanted.replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {lead.email ?? 'no email'} · {lead.source.replace(/_/g, ' ')} ·{' '}
                      {shortDate(lead.created_at)}
                    </p>
                    <p className="mt-1 text-sm">{triage.suggestedNextAction}</p>
                  </div>
                  <div className="text-right">
                    {lead.quoted_fee_low ? (
                      <div className="font-medium tabular-nums">
                        {money(Number(lead.quoted_fee_low))}–{money(Number(lead.quoted_fee_high))}
                      </div>
                    ) : (
                      <span className="text-sm text-muted-foreground">Not quoted</span>
                    )}
                    {lead.next_action_on && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        Follow up {shortDate(lead.next_action_on)}
                      </p>
                    )}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={Boolean(selected)} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          {selected && <LeadDetail
            lead={selected}
            triage={triageFor(selected)}
            busy={busy}
            onStatus={(s) => setStatus(selected, s)}
            onQuote={() => saveQuote(selected)}
            onConvert={() => convert(selected)}
            onSaveNotes={async (notes, nextAction, nextActionOn) => {
              await tth
                .from('tth_leads')
                .update({ notes, next_action: nextAction, next_action_on: nextActionOn || null })
                .eq('id', selected.id);
              toast.success('Saved');
              await load();
            }}
          />}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

function LeadDetail({
  lead,
  triage,
  busy,
  onStatus,
  onQuote,
  onConvert,
  onSaveNotes,
}: {
  lead: TthLead;
  triage: ReturnType<typeof triageLead>;
  busy: string | null;
  onStatus: (s: LeadStatus) => void;
  onQuote: () => void;
  onConvert: () => void;
  onSaveNotes: (notes: string, nextAction: string, nextActionOn: string) => Promise<void>;
}) {
  const [notes, setNotes] = useState(lead.notes ?? '');
  const [nextAction, setNextAction] = useState(lead.next_action ?? '');
  const [nextActionOn, setNextActionOn] = useState(lead.next_action_on ?? '');

  const screening = (lead.screening ?? {}) as IntakeAnswers;
  const quote = quoteFee(screening, lead.service_wanted ?? 'consultation');

  return (
    <>
      <DialogHeader>
        <DialogTitle>{lead.name}</DialogTitle>
        <DialogDescription>
          {lead.email} · {lead.phone ?? 'no phone'} · via {lead.source.replace(/_/g, ' ')}
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4 py-2">
        <div className="rounded-lg border p-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={leadTierTone(triage.tier) as never}>
              {triage.tier.replace(/_/g, ' ')} · {triage.score}/100
            </Badge>
            <span className="text-xs text-muted-foreground">
              preliminary trader status {triage.ttsScore}/100 ({triage.ttsTier.replace(/_/g, ' ')})
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">{triage.summary}</p>
          {triage.signals.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
              {triage.signals.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          )}
          {triage.concerns.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-700">
              {triage.concerns.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
          )}
          <p className="mt-2 text-sm font-medium">{triage.suggestedNextAction}</p>
        </div>

        <div className="rounded-lg border p-3">
          <div className="flex items-center justify-between">
            <h4 className="font-medium">Fee estimate</h4>
            <span className="font-semibold tabular-nums">
              {money(quote.low)} – {money(quote.high)}
            </span>
          </div>
          <div className="mt-2 space-y-1">
            {quote.lines.map((l) => (
              <div key={l.label} className="flex justify-between text-sm">
                <span className="text-muted-foreground">{l.label}</span>
                <span className="tabular-nums">{money(l.amount)}</span>
              </div>
            ))}
          </div>
          <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
            {quote.caveats.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border p-3">
          <h4 className="mb-2 font-medium">What they told us</h4>
          <dl className="grid gap-x-6 gap-y-1 sm:grid-cols-2">
            {Object.entries(screening)
              .filter(([k]) => !['name', 'email', 'phone'].includes(k))
              .map(([k, v]) => (
                <div key={k} className="flex justify-between gap-3 border-b border-dashed py-1">
                  <dt className="text-xs text-muted-foreground">{k.replace(/_/g, ' ')}</dt>
                  <dd className="text-xs font-medium">
                    {Array.isArray(v) ? v.join(', ') : v === true ? 'yes' : v === false ? 'no' : String(v ?? '—')}
                  </dd>
                </div>
              ))}
          </dl>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Next action</Label>
            <Input value={nextAction} onChange={(e) => setNextAction(e.target.value)} placeholder="Call, send letter…" />
          </div>
          <div className="space-y-2">
            <Label>On</Label>
            <Input type="date" value={nextActionOn} onChange={(e) => setNextActionOn(e.target.value)} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label>Notes</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
      </div>

      <DialogFooter className="flex-wrap gap-2">
        <Button variant="outline" onClick={() => onSaveNotes(notes, nextAction, nextActionOn)}>
          Save notes
        </Button>
        <Select value={lead.status} onValueChange={(v) => onStatus(v as LeadStatus)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(STATUS_LABELS) as LeadStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {STATUS_LABELS[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button variant="outline" onClick={onQuote} disabled={busy === 'quote'}>
          {busy === 'quote' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save quote
        </Button>
        <Button onClick={onConvert} disabled={busy === 'convert' || Boolean(lead.converted_client_id)}>
          {busy === 'convert' ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="mr-2 h-4 w-4" />
          )}
          {lead.converted_client_id ? 'Already converted' : 'Convert to client'}
        </Button>
      </DialogFooter>
    </>
  );
}
