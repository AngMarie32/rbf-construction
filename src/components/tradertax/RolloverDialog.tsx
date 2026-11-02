import { useMemo, useState } from 'react';
import { tth } from '@/integrations/supabase/tradertax';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import {
  ConsultationAnalysis,
  IntakeAnswers,
  TthAnalysis,
  TthClient,
  TthEngagement,
  TthFiling,
  TthIntake,
  TthPosition,
} from '@/types/tradertax';
import {
  buildRolloverPlan,
  rollForwardFilings,
  rollForwardPositions,
} from '@/utils/traderTax/rollover';
import { INTAKE_SCHEMA_VERSION } from '@/utils/traderTax/intakeSchema';
import { SUPPORTED_TAX_YEARS } from '@/utils/traderTax/taxYearConfig';
import { money } from '@/utils/traderTax/labels';

interface RolloverDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: TthClient;
  /** The engagement to roll forward from. */
  priorEngagement: TthEngagement;
  priorIntake: TthIntake | null;
  priorAnalysis: TthAnalysis | null;
  priorFilings: TthFiling[];
  priorPositions: TthPosition[];
  existingYears: number[];
  onCreated: (engagementId: string) => void;
}

export function RolloverDialog({
  open,
  onOpenChange,
  client,
  priorEngagement,
  priorIntake,
  priorAnalysis,
  priorFilings,
  priorPositions,
  existingYears,
  onCreated,
}: RolloverDialogProps) {
  const { user } = useAuth();
  const [busy, setBusy] = useState(false);
  const [carryFilings, setCarryFilings] = useState(true);
  const [carryPositions, setCarryPositions] = useState(true);

  const available = SUPPORTED_TAX_YEARS.filter((y) => !existingYears.includes(y));
  const [taxYear, setTaxYear] = useState<number>(
    available.find((y) => y > priorEngagement.tax_year) ?? available[0] ?? priorEngagement.tax_year + 1
  );

  const computed = (priorAnalysis?.computed as ConsultationAnalysis) ?? null;

  const plan = useMemo(
    () =>
      buildRolloverPlan(
        {
          taxYear: priorEngagement.tax_year,
          answers: (priorIntake?.answers ?? {}) as IntakeAnswers,
          capitalLossCarryforward: computed?.projection?.capitalLossCarryforward ?? null,
          priorYearTotalTax: computed?.projection?.estimatedFederalTax
            ? Math.round(computed.projection.estimatedFederalTax)
            : null,
          priorYearAgi: computed?.projection?.estimatedTaxableIncome
            ? Math.round(computed.projection.estimatedTaxableIncome)
            : null,
        },
        taxYear
      ),
    [priorEngagement.tax_year, priorIntake, computed, taxYear]
  );

  const filingsToCarry = useMemo(
    () => rollForwardFilings(priorFilings, taxYear),
    [priorFilings, taxYear]
  );
  const positionsToCarry = useMemo(() => rollForwardPositions(priorPositions), [priorPositions]);

  const run = async () => {
    setBusy(true);
    try {
      const { data: engagement, error } = await tth
        .from('tth_engagements')
        .insert({
          client_id: client.id,
          company_id: client.company_id,
          tax_year: taxYear,
          service_type: priorEngagement.service_type,
          status: 'intake',
          fee: priorEngagement.fee,
          rolled_from_engagement_id: priorEngagement.id,
          rolled_at: new Date().toISOString(),
          created_by: user?.id ?? null,
        })
        .select('*')
        .single();
      if (error || !engagement) throw new Error(error?.message ?? 'Engagement not created');

      const { error: intakeError } = await tth.from('tth_intakes').insert({
        engagement_id: engagement.id,
        client_id: client.id,
        tax_year: taxYear,
        schema_version: INTAKE_SCHEMA_VERSION,
        status: 'draft',
        answers: plan.answers,
        rolled_keys: plan.carried.map((c) => c.key),
        created_by: user?.id ?? null,
      });
      if (intakeError) throw new Error(intakeError.message);

      if (carryFilings && filingsToCarry.length) {
        await tth.from('tth_filings').insert(
          filingsToCarry.map((f, i) => ({
            ...f,
            engagement_id: engagement.id,
            tax_year: taxYear,
            status: 'not_started',
            sort_order: i,
          }))
        );
      }

      if (carryPositions && positionsToCarry.length) {
        await tth.from('tth_positions').insert(
          positionsToCarry.map((p, i) => ({
            ...p,
            engagement_id: engagement.id,
            sort_order: i,
          }))
        );
      }

      await tth.from('tth_activity').insert({
        client_id: client.id,
        engagement_id: engagement.id,
        kind: 'engagement_rolled',
        message: `Rolled forward from ${priorEngagement.tax_year}: ${plan.carried.length} answers carried, ${plan.cleared.length} period figures cleared${
          carryFilings ? `, ${filingsToCarry.length} filings` : ''
        }${carryPositions ? `, ${positionsToCarry.length} open positions` : ''}.`,
        actor: user?.id ?? null,
      });

      toast.success(`${taxYear} engagement created from ${priorEngagement.tax_year}`);
      onOpenChange(false);
      onCreated(engagement.id);
    } catch (e) {
      toast.error('Rollover failed', { description: (e as Error).message });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Roll forward from {priorEngagement.tax_year}
            <ArrowRight className="mx-2 inline h-4 w-4" />
            {taxYear}
          </DialogTitle>
          <DialogDescription>
            Carries the answers that describe who the client is. Clears everything that describes what
            happened in a particular year — a stale figure carried forward silently is worse than asking
            again.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex items-center gap-3">
            <Label className="w-24">New tax year</Label>
            <Select value={String(taxYear)} onValueChange={(v) => setTaxYear(Number(v))}>
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(available.length ? available : [priorEngagement.tax_year + 1]).map((y) => (
                  <SelectItem key={y} value={String(y)}>
                    {y}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            <Stat label="Answers carried" value={plan.carried.length} tone="info" />
            <Stat label="Figures cleared" value={plan.cleared.length} tone="warning" />
            <Stat label="Derived forward" value={plan.derived.length} tone="success" />
          </div>

          {plan.derived.length > 0 && (
            <div className="rounded-lg border p-3">
              <h4 className="text-sm font-medium">Carried from last year’s results</h4>
              <div className="mt-2 space-y-2">
                {plan.derived.map((d) => (
                  <div key={d.key} className="text-sm">
                    <div className="flex justify-between gap-3">
                      <span>{d.label}</span>
                      <span className="font-medium tabular-nums">
                        {typeof d.value === 'number' ? money(d.value) : String(d.value)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground">{d.basis}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="rounded-lg border p-3">
            <h4 className="text-sm font-medium">Cleared — the client re-enters these</h4>
            <p className="mt-1 text-xs text-muted-foreground">
              {plan.cleared.length
                ? plan.cleared.map((c) => c.label).slice(0, 12).join(' · ') +
                  (plan.cleared.length > 12 ? ` · +${plan.cleared.length - 12} more` : '')
                : 'Nothing to clear — the prior intake had no period figures recorded.'}
            </p>
          </div>

          <div className="space-y-3 rounded-lg border p-3">
            <label className="flex items-center justify-between gap-3">
              <div>
                <span className="text-sm font-medium">Carry the filing checklist</span>
                <p className="text-xs text-muted-foreground">
                  {filingsToCarry.length} recurring form{filingsToCarry.length === 1 ? '' : 's'}. One-off
                  items like Form 3115 and extensions are not carried.
                </p>
              </div>
              <Switch checked={carryFilings} onCheckedChange={setCarryFilings} />
            </label>
            <label className="flex items-center justify-between gap-3">
              <div>
                <span className="text-sm font-medium">Carry open action items</span>
                <p className="text-xs text-muted-foreground">
                  {positionsToCarry.length} position{positionsToCarry.length === 1 ? '' : 's'} still open
                  at year end.
                </p>
              </div>
              <Switch checked={carryPositions} onCheckedChange={setCarryPositions} />
            </label>
          </div>

          {plan.notes.map((n, i) => (
            <p key={i} className="text-sm text-muted-foreground">
              {n}
            </p>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={run} disabled={busy}>
            {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Create {taxYear} engagement
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: string }) {
  return (
    <div className="rounded-lg border p-3">
      <div className="text-xs uppercase tracking-wide text-muted-foreground">{label}</div>
      <div className="mt-1 flex items-center gap-2">
        <span className="text-xl font-semibold tabular-nums">{value}</span>
        <Badge variant={tone as never} className="text-[10px]">
          {tone === 'warning' ? 're-enter' : tone === 'success' ? 'derived' : 'confirm'}
        </Badge>
      </div>
    </div>
  );
}
