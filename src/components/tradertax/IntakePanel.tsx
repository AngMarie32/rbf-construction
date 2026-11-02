import { useEffect, useMemo, useRef, useState } from 'react';
import { tth, generateIntakeToken, intakeLinkFor } from '@/integrations/supabase/tradertax';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Check, Copy, Link2, Loader2, Save } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { IntakeAnswers, TthEngagement, TthIntake } from '@/types/tradertax';
import { IntakeFormRenderer } from './IntakeFormRenderer';
import {
  INTAKE_SCHEMA_VERSION,
  intakeCompletion,
  missingAnalysisFields,
  missingRequiredFields,
} from '@/utils/traderTax/intakeSchema';
import { shortDate } from '@/utils/traderTax/labels';

interface IntakePanelProps {
  engagement: TthEngagement;
  clientId: string;
  intake: TthIntake | null;
  answers: IntakeAnswers;
  onAnswersChange: (answers: IntakeAnswers) => void;
  onRefresh: () => Promise<void> | void;
}

export function IntakePanel({
  engagement,
  clientId,
  intake,
  answers,
  onAnswersChange,
  onRefresh,
}: IntakePanelProps) {
  const { user } = useAuth();
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const dirty = useRef(false);

  const completion = useMemo(() => intakeCompletion(answers), [answers]);
  const missingRequired = useMemo(() => missingRequiredFields(answers), [answers]);
  const missingAnalysis = useMemo(() => missingAnalysisFields(answers), [answers]);

  useEffect(() => {
    setCopied(false);
  }, [intake?.access_token]);

  const ensureIntake = async (): Promise<TthIntake | null> => {
    if (intake) return intake;
    const { data, error } = await tth
      .from('tth_intakes')
      .insert({
        engagement_id: engagement.id,
        client_id: clientId,
        tax_year: engagement.tax_year,
        schema_version: INTAKE_SCHEMA_VERSION,
        status: 'draft',
        answers: {},
        created_by: user?.id ?? null,
      })
      .select('*')
      .single();
    if (error) {
      toast.error('Could not create the intake', { description: error.message });
      return null;
    }
    return data as TthIntake;
  };

  const handleSave = async () => {
    setBusy('save');
    try {
      const row = await ensureIntake();
      if (!row) return;
      const { error } = await tth
        .from('tth_intakes')
        .update({
          answers,
          completion_pct: completion,
          status: row.status === 'draft' ? 'in_progress' : row.status,
        })
        .eq('id', row.id);
      if (error) throw new Error(error.message);
      dirty.current = false;
      toast.success('Intake saved');
      await onRefresh();
    } catch (e) {
      toast.error('Could not save', { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const handleGenerateLink = async () => {
    setBusy('link');
    try {
      const row = await ensureIntake();
      if (!row) return;
      const token = generateIntakeToken();
      const expires = new Date();
      expires.setDate(expires.getDate() + 45);

      const { error } = await tth
        .from('tth_intakes')
        .update({
          access_token: token,
          token_expires_at: expires.toISOString(),
          status: row.status === 'submitted' ? row.status : 'sent',
          sent_at: new Date().toISOString(),
        })
        .eq('id', row.id);
      if (error) throw new Error(error.message);

      await tth.from('tth_activity').insert({
        client_id: clientId,
        engagement_id: engagement.id,
        kind: 'intake_link_generated',
        message: 'Client intake link generated (valid 45 days).',
        actor: user?.id ?? null,
      });

      await navigator.clipboard.writeText(intakeLinkFor(token)).catch(() => undefined);
      setCopied(true);
      toast.success('Intake link generated and copied');
      await onRefresh();
    } catch (e) {
      toast.error('Could not generate the link', { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const handleMarkReviewed = async () => {
    if (!intake) return;
    setBusy('review');
    try {
      const { error } = await tth
        .from('tth_intakes')
        .update({ status: 'reviewed', reviewed_at: new Date().toISOString() })
        .eq('id', intake.id);
      if (error) throw new Error(error.message);
      toast.success('Intake marked reviewed');
      await onRefresh();
    } catch (e) {
      toast.error('Could not update', { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const link = intake?.access_token ? intakeLinkFor(intake.access_token) : null;

  return (
    <div className="space-y-4">
      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">Client questionnaire</h3>
              {intake && <Badge variant="outline">{intake.status.replace(/_/g, ' ')}</Badge>}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              {intake?.submitted_at
                ? `Submitted ${shortDate(intake.submitted_at)} · ${completion.toFixed(0)}% complete`
                : `${completion.toFixed(0)}% complete · ${missingRequired.length} required question${
                    missingRequired.length === 1 ? '' : 's'
                  } outstanding`}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" onClick={handleGenerateLink} disabled={busy === 'link'}>
              {busy === 'link' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Link2 className="mr-2 h-4 w-4" />
              )}
              {link ? 'Regenerate link' : 'Generate client link'}
            </Button>
            {intake?.status === 'submitted' && (
              <Button size="sm" variant="outline" onClick={handleMarkReviewed} disabled={busy === 'review'}>
                Mark reviewed
              </Button>
            )}
            <Button size="sm" onClick={handleSave} disabled={busy === 'save'}>
              {busy === 'save' ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Save className="mr-2 h-4 w-4" />
              )}
              Save answers
            </Button>
          </div>
        </div>

        {link && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Input readOnly value={link} className="max-w-xl font-mono text-xs" />
            <Button
              size="sm"
              variant="outline"
              onClick={async () => {
                await navigator.clipboard.writeText(link);
                setCopied(true);
                toast.success('Link copied');
              }}
            >
              {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
            </Button>
            {intake?.token_expires_at && (
              <span className="text-xs text-muted-foreground">
                expires {shortDate(intake.token_expires_at)}
              </span>
            )}
          </div>
        )}

        {missingAnalysis.length > 0 && (
          <div className="mt-4 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
            <p className="font-medium">
              {missingAnalysis.length} answer{missingAnalysis.length === 1 ? '' : 's'} the analysis engine
              needs {missingAnalysis.length === 1 ? 'is' : 'are'} still blank
            </p>
            <p className="mt-1">
              {missingAnalysis
                .slice(0, 6)
                .map((m) => m.label)
                .join(' · ')}
              {missingAnalysis.length > 6 ? ` · +${missingAnalysis.length - 6} more` : ''}
            </p>
          </div>
        )}
      </Card>

      <IntakeFormRenderer
        answers={answers}
        showAnalysisMarkers
        onChange={(key, value) => {
          dirty.current = true;
          onAnswersChange({ ...answers, [key]: value });
        }}
      />

      <div className="flex justify-end">
        <Button onClick={handleSave} disabled={busy === 'save'}>
          {busy === 'save' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Save answers
        </Button>
      </div>
    </div>
  );
}
