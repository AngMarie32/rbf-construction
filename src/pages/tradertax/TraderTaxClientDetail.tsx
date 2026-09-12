import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { ArrowLeft, ExternalLink, Loader2, Plus } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { tth } from '@/integrations/supabase/tradertax';
import {
  ConsultationAnalysis,
  EngagementStatus,
  IntakeAnswers,
  TthActivity,
  TthAnalysis,
  TthClient,
  TthConsultation,
  TthDocumentRequest,
  TthEngagement,
  TthFiling,
  TthIntake,
  TthPosition,
} from '@/types/tradertax';
import { IntakePanel } from '@/components/tradertax/IntakePanel';
import { DocumentsPanel } from '@/components/tradertax/DocumentsPanel';
import { AnalysisPanel } from '@/components/tradertax/AnalysisPanel';
import { ActionPlanPanel } from '@/components/tradertax/ActionPlanPanel';
import { ConsultationPanel } from '@/components/tradertax/ConsultationPanel';
import { FilingsPanel } from '@/components/tradertax/FilingsPanel';
import {
  ENGAGEMENT_PIPELINE,
  engagementStatusLabel,
  engagementTone,
  shortDate,
  statusTone,
} from '@/utils/traderTax/labels';
import { DEFAULT_TAX_YEAR, SUPPORTED_TAX_YEARS } from '@/utils/traderTax/taxYearConfig';

export default function TraderTaxClientDetail() {
  const { clientId } = useParams<{ clientId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [client, setClient] = useState<TthClient | null>(null);
  const [engagements, setEngagements] = useState<TthEngagement[]>([]);
  const [activeEngagementId, setActiveEngagementId] = useState<string | null>(null);
  const [intake, setIntake] = useState<TthIntake | null>(null);
  const [answers, setAnswers] = useState<IntakeAnswers>({});
  const [documents, setDocuments] = useState<TthDocumentRequest[]>([]);
  const [analyses, setAnalyses] = useState<TthAnalysis[]>([]);
  const [positions, setPositions] = useState<TthPosition[]>([]);
  const [filings, setFilings] = useState<TthFiling[]>([]);
  const [consultations, setConsultations] = useState<TthConsultation[]>([]);
  const [activity, setActivity] = useState<TthActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [creatingEngagement, setCreatingEngagement] = useState(false);

  const engagement = useMemo(
    () => engagements.find((e) => e.id === activeEngagementId) ?? null,
    [engagements, activeEngagementId]
  );

  const loadClient = useCallback(async () => {
    if (!clientId) return;
    const [{ data: c }, { data: engs }] = await Promise.all([
      tth.from('tth_clients').select('*').eq('id', clientId).maybeSingle(),
      tth
        .from('tth_engagements')
        .select('*')
        .eq('client_id', clientId)
        .order('tax_year', { ascending: false }),
    ]);

    if (!c) {
      toast.error('Client not found');
      navigate('/tradertax/clients');
      return;
    }
    setClient(c as TthClient);
    const list = (engs ?? []) as TthEngagement[];
    setEngagements(list);
    setActiveEngagementId((prev) => prev ?? list[0]?.id ?? null);
  }, [clientId, navigate]);

  const loadEngagement = useCallback(async (engagementId: string) => {
    const [
      { data: intakeRow },
      { data: docs },
      { data: analysisRows },
      { data: positionRows },
      { data: filingRows },
      { data: consultRows },
      { data: activityRows },
    ] = await Promise.all([
      tth.from('tth_intakes').select('*').eq('engagement_id', engagementId).maybeSingle(),
      tth
        .from('tth_document_requests')
        .select('*')
        .eq('engagement_id', engagementId)
        .order('sort_order'),
      tth
        .from('tth_analyses')
        .select('*')
        .eq('engagement_id', engagementId)
        .order('created_at', { ascending: false }),
      tth.from('tth_positions').select('*').eq('engagement_id', engagementId).order('sort_order'),
      tth.from('tth_filings').select('*').eq('engagement_id', engagementId).order('sort_order'),
      tth
        .from('tth_consultations')
        .select('*')
        .eq('engagement_id', engagementId)
        .order('scheduled_at', { ascending: false }),
      tth
        .from('tth_activity')
        .select('*')
        .eq('engagement_id', engagementId)
        .order('created_at', { ascending: false })
        .limit(40),
    ]);

    const loadedIntake = (intakeRow as TthIntake) ?? null;
    setIntake(loadedIntake);
    setAnswers((loadedIntake?.answers as IntakeAnswers) ?? {});
    setDocuments((docs ?? []) as TthDocumentRequest[]);
    setAnalyses((analysisRows ?? []) as TthAnalysis[]);
    setPositions((positionRows ?? []) as TthPosition[]);
    setFilings((filingRows ?? []) as TthFiling[]);
    setConsultations((consultRows ?? []) as TthConsultation[]);
    setActivity((activityRows ?? []) as TthActivity[]);
  }, []);

  const refresh = useCallback(async () => {
    await loadClient();
    if (activeEngagementId) await loadEngagement(activeEngagementId);
  }, [loadClient, loadEngagement, activeEngagementId]);

  useEffect(() => {
    setLoading(true);
    loadClient().finally(() => setLoading(false));
  }, [loadClient]);

  useEffect(() => {
    if (activeEngagementId) loadEngagement(activeEngagementId);
  }, [activeEngagementId, loadEngagement]);

  const latestAnalysis: ConsultationAnalysis | null =
    (analyses[0]?.computed as ConsultationAnalysis) ?? null;

  const updateEngagementStatus = async (status: EngagementStatus) => {
    if (!engagement) return;
    const { error } = await tth.from('tth_engagements').update({ status }).eq('id', engagement.id);
    if (error) {
      toast.error('Could not update the engagement', { description: error.message });
      return;
    }
    await refresh();
  };

  const createEngagement = async () => {
    if (!client) return;
    const used = new Set(engagements.map((e) => e.tax_year));
    const year = SUPPORTED_TAX_YEARS.find((y) => !used.has(y)) ?? DEFAULT_TAX_YEAR;
    setCreatingEngagement(true);
    const { data, error } = await tth
      .from('tth_engagements')
      .insert({
        client_id: client.id,
        company_id: client.company_id,
        tax_year: year,
        service_type: 'consultation',
        status: 'intake',
        created_by: user?.id ?? null,
      })
      .select('*')
      .single();
    setCreatingEngagement(false);
    if (error) {
      toast.error('Could not create the engagement', { description: error.message });
      return;
    }
    toast.success(`${year} engagement created`);
    await loadClient();
    setActiveEngagementId(data.id);
  };

  if (loading || !client) {
    return (
      <Layout title="TraderTaxHQ" subtitle="Loading client…">
        <div className="flex items-center justify-center p-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading…
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title={client.display_name}
      subtitle={`${client.entity_type.replace(/_/g, ' ')} · ${client.home_state ?? 'state not set'}`}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Button variant="ghost" size="sm" onClick={() => navigate('/tradertax/clients')}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          All clients
        </Button>

        <div className="flex flex-wrap items-center gap-2">
          <Badge variant={statusTone(client.status)}>{client.status}</Badge>
          {client.titanfile_channel_url && (
            <a
              href={client.titanfile_channel_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
            >
              TitanFile <ExternalLink className="h-3.5 w-3.5" />
            </a>
          )}
          <Select value={activeEngagementId ?? ''} onValueChange={setActiveEngagementId}>
            <SelectTrigger className="w-56">
              <SelectValue placeholder="Select engagement" />
            </SelectTrigger>
            <SelectContent>
              {engagements.map((e) => (
                <SelectItem key={e.id} value={e.id}>
                  {e.tax_year} · {e.service_type.replace(/_/g, ' ')}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button size="sm" variant="outline" onClick={createEngagement} disabled={creatingEngagement}>
            {creatingEngagement ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-2 h-4 w-4" />
            )}
            New year
          </Button>
        </div>
      </div>

      {!engagement ? (
        <Card className="mt-4 p-10 text-center">
          <p className="font-medium">No engagement yet</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Create one to open the intake, the document channel, and the filing plan.
          </p>
        </Card>
      ) : (
        <>
          <Card className="mt-4 p-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-sm text-muted-foreground">Pipeline</span>
              <Select
                value={engagement.status}
                onValueChange={(v) => updateEngagementStatus(v as EngagementStatus)}
              >
                <SelectTrigger className="w-52">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ENGAGEMENT_PIPELINE.map((s) => (
                    <SelectItem key={s} value={s}>
                      {engagementStatusLabel(s)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Badge variant={engagementTone(engagement.status)}>
                {engagementStatusLabel(engagement.status)}
              </Badge>
              <div className="ml-auto flex flex-wrap gap-4 text-sm text-muted-foreground">
                <span>Tax year {engagement.tax_year}</span>
                {engagement.consult_at && <span>Consult {shortDate(engagement.consult_at)}</span>}
                {engagement.target_date && <span>Target {shortDate(engagement.target_date)}</span>}
              </div>
            </div>
          </Card>

          <Tabs defaultValue="intake" className="mt-4">
            <TabsList className="flex-wrap">
              <TabsTrigger value="intake">Intake</TabsTrigger>
              <TabsTrigger value="documents">
                Documents
                {documents.filter((d) => d.is_required && d.status === 'requested').length > 0 && (
                  <span className="ml-2 rounded-full bg-amber-100 px-1.5 text-[10px] text-amber-800">
                    {documents.filter((d) => d.is_required && d.status === 'requested').length}
                  </span>
                )}
              </TabsTrigger>
              <TabsTrigger value="analysis">Analysis</TabsTrigger>
              <TabsTrigger value="plan">Action plan</TabsTrigger>
              <TabsTrigger value="consult">Consultation</TabsTrigger>
              <TabsTrigger value="filings">Filings</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="intake" className="mt-4">
              <IntakePanel
                engagement={engagement}
                clientId={client.id}
                intake={intake}
                answers={answers}
                onAnswersChange={setAnswers}
                onRefresh={refresh}
              />
            </TabsContent>

            <TabsContent value="documents" className="mt-4">
              <DocumentsPanel
                client={client}
                engagement={engagement}
                requests={documents}
                answers={answers}
                onRefresh={refresh}
              />
            </TabsContent>

            <TabsContent value="analysis" className="mt-4">
              <AnalysisPanel
                client={client}
                engagement={engagement}
                answers={answers}
                documents={documents}
                analyses={analyses}
                positions={positions}
                onRefresh={refresh}
              />
            </TabsContent>

            <TabsContent value="plan" className="mt-4">
              <ActionPlanPanel engagement={engagement} positions={positions} onRefresh={refresh} />
            </TabsContent>

            <TabsContent value="consult" className="mt-4">
              <ConsultationPanel
                engagement={engagement}
                consultations={consultations}
                analysis={latestAnalysis}
                onRefresh={refresh}
              />
            </TabsContent>

            <TabsContent value="filings" className="mt-4">
              <FilingsPanel engagement={engagement} filings={filings} onRefresh={refresh} />
            </TabsContent>

            <TabsContent value="activity" className="mt-4">
              <Card className="p-5">
                <h3 className="mb-3 font-semibold">Activity</h3>
                {activity.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nothing logged yet.</p>
                ) : (
                  <ol className="space-y-3">
                    {activity.map((a) => (
                      <li key={a.id} className="flex gap-3 border-l-2 border-muted pl-3">
                        <div>
                          <p className="text-sm">{a.message}</p>
                          <p className="text-xs text-muted-foreground">
                            {a.kind.replace(/_/g, ' ')} ·{' '}
                            {new Date(a.created_at).toLocaleString('en-US')}
                          </p>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </Card>
            </TabsContent>
          </Tabs>
        </>
      )}
    </Layout>
  );
}
