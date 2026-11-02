import { useCallback, useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { CheckCircle2, Loader2, Lock, ShieldAlert } from 'lucide-react';
import { IntakeFormRenderer } from '@/components/tradertax/IntakeFormRenderer';
import { IntakeAnswers } from '@/types/tradertax';
import { intakeCompletion, missingRequiredFields } from '@/utils/traderTax/intakeSchema';

interface PublicIntakeState {
  tax_year: number;
  status: string;
  answers: IntakeAnswers;
  completion_pct: number;
  submitted_at: string | null;
  client_name: string | null;
}

/**
 * Client-facing questionnaire, reached by opaque token. No login: the token is
 * the credential, and every read and write goes through the tth-intake-public
 * edge function rather than the browser Supabase client.
 */
export default function PublicIntake() {
  const { token } = useParams<{ token: string }>();
  const [intake, setIntake] = useState<PublicIntakeState | null>(null);
  const [answers, setAnswers] = useState<IntakeAnswers>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const dirty = useRef(false);

  const call = useCallback(
    async (action: 'get' | 'save' | 'submit', payload: Record<string, unknown> = {}) => {
      const { data, error: fnError } = await supabase.functions.invoke('tth-intake-public', {
        body: { action, token, ...payload },
      });
      if (fnError) throw new Error(fnError.message);
      if ((data as { error?: string })?.error) throw new Error((data as { error: string }).error);
      return data as { intake: PublicIntakeState };
    },
    [token]
  );

  useEffect(() => {
    if (!token) {
      setError('This link is not valid.');
      setLoading(false);
      return;
    }
    call('get')
      .then(({ intake: loaded }) => {
        setIntake(loaded);
        setAnswers(loaded.answers ?? {});
      })
      .catch((e: Error) => setError(e.message))
      .finally(() => setLoading(false));
  }, [token, call]);

  // Autosave a few seconds after typing stops.
  useEffect(() => {
    if (!intake || intake.submitted_at || !dirty.current) return;
    const t = setTimeout(async () => {
      setSaving(true);
      try {
        await call('save', { answers, completion_pct: intakeCompletion(answers) });
        setLastSaved(new Date());
        dirty.current = false;
      } catch {
        // Silent — the client can still submit, and submit resends everything.
      } finally {
        setSaving(false);
      }
    }, 2500);
    return () => clearTimeout(t);
  }, [answers, intake, call]);

  const handleChange = (key: string, value: IntakeAnswers[string]) => {
    dirty.current = true;
    setAnswers((prev) => ({ ...prev, [key]: value }));
  };

  const handleSubmit = async () => {
    const missing = missingRequiredFields(answers);
    if (missing.length) {
      toast.error(`${missing.length} required question${missing.length === 1 ? '' : 's'} still to answer`, {
        description: missing
          .slice(0, 4)
          .map((m) => m.label)
          .join(', '),
      });
      return;
    }
    setSubmitting(true);
    try {
      const { intake: updated } = await call('submit', {
        answers,
        completion_pct: intakeCompletion(answers),
      });
      setIntake(updated);
      toast.success('Questionnaire submitted');
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <CenteredShell>
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </CenteredShell>
    );
  }

  if (error || !intake) {
    return (
      <CenteredShell>
        <Card className="max-w-md p-8 text-center">
          <ShieldAlert className="mx-auto mb-4 h-10 w-10 text-destructive" />
          <h1 className="text-lg font-semibold">This questionnaire isn’t available</h1>
          <p className="mt-2 text-sm text-muted-foreground">{error ?? 'Unknown error.'}</p>
          <p className="mt-4 text-sm text-muted-foreground">
            Contact your preparer for a new link.
          </p>
        </Card>
      </CenteredShell>
    );
  }

  if (intake.submitted_at) {
    return (
      <CenteredShell>
        <Card className="max-w-md p-8 text-center">
          <CheckCircle2 className="mx-auto mb-4 h-10 w-10 text-emerald-600" />
          <h1 className="text-lg font-semibold">Thank you — we have your answers</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your {intake.tax_year} questionnaire was submitted on{' '}
            {new Date(intake.submitted_at).toLocaleDateString('en-US', { dateStyle: 'long' })}.
          </p>
          <p className="mt-4 text-sm text-muted-foreground">
            Next step: upload your documents to the secure TitanFile channel we shared with you. Please
            don’t email tax documents.
          </p>
        </Card>
      </CenteredShell>
    );
  }

  return (
    <div className="min-h-screen bg-muted/30">
      <header className="border-b bg-background">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-6 py-5">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              TraderTaxHQ
            </p>
            <h1 className="text-xl font-semibold">
              {intake.tax_year} Trader Tax Questionnaire
            </h1>
            {intake.client_name && (
              <p className="text-sm text-muted-foreground">Prepared for {intake.client_name}</p>
            )}
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Lock className="h-3.5 w-3.5" />
            {saving ? 'Saving…' : lastSaved ? `Saved ${lastSaved.toLocaleTimeString()}` : 'Answers save automatically'}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        <Card className="mb-6 border-amber-200 bg-amber-50/60 p-4">
          <div className="flex gap-3">
            <Badge variant="outline" className="h-fit border-amber-400 text-amber-800">
              Before you start
            </Badge>
            <div className="text-sm text-amber-900">
              <p>
                Answer from your broker’s year-end activity report rather than memory — trade counts,
                days traded, and holding period drive whether trader tax status is defensible.
              </p>
              <p className="mt-2">
                Never enter full account numbers or your Social Security number here. Documents go in the
                secure TitanFile channel, not in this form.
              </p>
            </div>
          </div>
        </Card>

        <IntakeFormRenderer answers={answers} onChange={handleChange} />

        <div className="sticky bottom-0 mt-8 border-t bg-background/95 py-4 backdrop-blur">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-muted-foreground">
              You can close this page and come back with the same link.
            </p>
            <Button onClick={handleSubmit} disabled={submitting} size="lg">
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit questionnaire
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
}

function CenteredShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-6">{children}</div>
  );
}
