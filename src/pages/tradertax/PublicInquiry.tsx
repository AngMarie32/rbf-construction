import { useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { toast } from 'sonner';
import { CheckCircle2, Loader2, Lock } from 'lucide-react';
import { IntakeFormRenderer } from '@/components/tradertax/IntakeFormRenderer';
import { IntakeAnswers } from '@/types/tradertax';
import { INQUIRY_SECTIONS } from '@/utils/traderTax/leadScoring';
import { isFieldVisible } from '@/utils/traderTax/intakeSchema';

/**
 * Public inquiry form. No login, no token — this is the top of the funnel, so
 * anyone with the link can submit. It collects only what triage and a fee
 * range need; nothing sensitive is asked for at this stage.
 */
export default function PublicInquiry() {
  const [params] = useSearchParams();
  const firmId = params.get('firm');
  const source = params.get('source') ?? 'inquiry_form';

  // Someone arriving from the calculator has already told us most of this.
  // Asking again is the fastest way to lose them.
  const [answers, setAnswers] = useState<IntakeAnswers>(() => {
    const seed: IntakeAnswers = {};
    const numeric = (key: string) => {
      const raw = params.get(key);
      const n = raw === null ? NaN : Number(raw);
      return Number.isFinite(n) && n >= 0 ? n : null;
    };
    if (params.get('prop') === '1') {
      seed.prop_firm = true;
      seed.service_wanted = 'tax_return';
    }
    const payouts = numeric('payouts');
    if (payouts !== null) seed.prop_payouts_total = payouts;
    const fees = numeric('fees');
    if (fees !== null) seed.prop_eval_fees = fees;
    const filing = params.get('filing');
    if (filing && ['single', 'mfj', 'mfs', 'hoh', 'qw'].includes(filing)) {
      seed.filing_status = filing;
    }
    return seed;
  });
  const prefilled = params.get('prop') === '1';
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const missing = useMemo(
    () =>
      INQUIRY_SECTIONS.flatMap((s) => s.fields)
        .filter((f) => f.required && isFieldVisible(f, answers))
        .filter((f) => {
          const v = answers[f.key];
          if (v === null || v === undefined) return true;
          if (typeof v === 'string') return v.trim().length === 0;
          if (Array.isArray(v)) return v.length === 0;
          return false;
        }),
    [answers]
  );

  const submit = async () => {
    if (missing.length) {
      toast.error(`${missing.length} question${missing.length === 1 ? '' : 's'} left`, {
        description: missing.slice(0, 3).map((m) => m.label).join(', '),
      });
      return;
    }
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('tth-lead-capture', {
        body: { answers, company_id: firmId, source },
      });
      if (error) throw new Error(error.message);
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      setDone(true);
    } catch (e) {
      toast.error('Could not send your inquiry', {
        description: `${(e as Error).message}. Email us instead and we'll pick it up from there.`,
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (done) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">
        <Card className="max-w-md p-8 text-center">
          <CheckCircle2 className="mx-auto mb-4 h-10 w-10 text-emerald-600" />
          <h1 className="text-lg font-semibold">Thanks — we have your details</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            We read every inquiry ourselves. Expect a reply within one business day with either a time to
            talk or a straight answer about whether we are the right fit.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Don't send tax documents by email. If we work together, everything moves through a secure
            channel.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto max-w-3xl px-6 py-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
            TraderTaxHQ
          </p>
          <h1 className="mt-1 text-2xl font-semibold">Tell us about your trading</h1>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Five minutes. We use this to work out whether trader tax status is realistic for you, what
            your return actually involves, and what it would cost — before either of us spends time on a
            call.
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-8">
        <Card className="mb-6 border-amber-200 bg-amber-50/60 p-4">
          <div className="flex gap-3">
            <Lock className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <p className="text-sm text-amber-900">
              Rough numbers are fine. Do not enter your Social Security number, account numbers, or
              upload documents here — none of that is asked for, and we will never request it by email.
            </p>
          </div>
        </Card>

        {prefilled && (
          <Card className="mb-6 border-emerald-200 bg-emerald-50/60 p-4">
            <p className="text-sm text-emerald-900">
              We carried your calculator numbers across. Check them and fill in the rest — it should
              take a couple of minutes.
            </p>
          </Card>
        )}

        <IntakeFormRenderer
          answers={answers}
          sections={INQUIRY_SECTIONS}
          onChange={(key, value) => setAnswers((prev) => ({ ...prev, [key]: value }))}
        />

        <div className="sticky bottom-0 mt-8 border-t bg-background/95 py-4 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              No obligation, and we will tell you if you do not need us.
            </p>
            <Button size="lg" onClick={submit} disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Send inquiry
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}
