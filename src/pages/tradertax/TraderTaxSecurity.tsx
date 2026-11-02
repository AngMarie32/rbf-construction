import { useCallback, useEffect, useMemo, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { AlertTriangle, Download, FileText, Loader2, Plus, Save, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCompanies } from '@/contexts/CompanyContext';
import { tth } from '@/integrations/supabase/tradertax';
import {
  ControlStatus,
  TthFirmProfile,
  TthSecurityControl,
  TthSecurityIncident,
  TthSecurityTraining,
  TthServiceProvider,
} from '@/types/tradertax';
import {
  DEFAULT_SERVICE_PROVIDERS,
  assessSecurityReadiness,
  buildSecurityControls,
  reviewDueDate,
} from '@/utils/traderTax/securityProgram';
import { downloadWisp } from '@/utils/traderTax/wispDocument';
import { shortDate } from '@/utils/traderTax/labels';

const STATUS_OPTIONS: { value: ControlStatus; label: string }[] = [
  { value: 'not_started', label: 'Not started' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'implemented', label: 'Implemented' },
  { value: 'not_applicable', label: 'Not applicable' },
];

const emptyIncident = {
  occurred_at: new Date().toISOString().slice(0, 16),
  severity: 'low',
  category: 'phishing',
  summary: '',
  systems_affected: '',
  clients_affected: '0',
  taxpayer_data_involved: false,
  containment: '',
};

export default function TraderTaxSecurity() {
  const { user } = useAuth();
  const { selectedIds } = useCompanies();
  const companyId = selectedIds.length === 1 ? selectedIds[0] : null;

  const [profile, setProfile] = useState<TthFirmProfile | null>(null);
  const [form, setForm] = useState<Partial<TthFirmProfile>>({});
  const [controls, setControls] = useState<TthSecurityControl[]>([]);
  const [providers, setProviders] = useState<TthServiceProvider[]>([]);
  const [training, setTraining] = useState<TthSecurityTraining[]>([]);
  const [incidents, setIncidents] = useState<TthSecurityIncident[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [incidentOpen, setIncidentOpen] = useState(false);
  const [incident, setIncident] = useState({ ...emptyIncident });
  const [trainingOpen, setTrainingOpen] = useState(false);
  const [trainee, setTrainee] = useState({ person_name: '', role: '', completed_on: '', provider: '' });

  const load = useCallback(async () => {
    setLoading(true);
    const [{ data: p }, { data: c }, { data: sp }, { data: tr }, { data: inc }] = await Promise.all([
      tth.from('tth_firm_profile').select('*').limit(1).maybeSingle(),
      tth.from('tth_security_controls').select('*').order('sort_order'),
      tth.from('tth_service_providers').select('*').order('name'),
      tth.from('tth_security_training').select('*').order('completed_on', { ascending: false }),
      tth.from('tth_security_incidents').select('*').order('occurred_at', { ascending: false }),
    ]);

    const loaded = (p as TthFirmProfile) ?? null;
    setProfile(loaded);
    setForm(loaded ?? { firm_name: '', wisp_version: '1.0', retention_years: 7 });
    setControls((c ?? []) as TthSecurityControl[]);
    setProviders((sp ?? []) as TthServiceProvider[]);
    setTraining((tr ?? []) as TthSecurityTraining[]);
    setIncidents((inc ?? []) as TthSecurityIncident[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const readiness = useMemo(() => assessSecurityReadiness(controls), [controls]);

  const byCategory = useMemo(
    () =>
      controls.reduce<Record<string, TthSecurityControl[]>>((acc, c) => {
        (acc[c.category] ||= []).push(c);
        return acc;
      }, {}),
    [controls]
  );

  const saveProfile = async () => {
    if (!form.firm_name?.trim()) {
      toast.error('Firm name is required');
      return;
    }
    setBusy('profile');
    const payload = {
      company_id: companyId,
      firm_name: form.firm_name.trim(),
      legal_entity: form.legal_entity ?? null,
      ein_last4: form.ein_last4 ?? null,
      ptin: form.ptin ?? null,
      efin: form.efin ?? null,
      street: form.street ?? null,
      city: form.city ?? null,
      state: form.state ?? null,
      postal_code: form.postal_code ?? null,
      phone: form.phone ?? null,
      email: form.email ?? null,
      security_officer_name: form.security_officer_name ?? null,
      security_officer_title: form.security_officer_title ?? null,
      security_officer_email: form.security_officer_email ?? null,
      wisp_adopted_on: form.wisp_adopted_on || null,
      wisp_last_reviewed_on: form.wisp_last_reviewed_on || null,
      wisp_version: form.wisp_version || '1.0',
      retention_years: Number(form.retention_years ?? 7),
      breach_counsel: form.breach_counsel ?? null,
      cyber_insurer: form.cyber_insurer ?? null,
      cyber_policy_number: form.cyber_policy_number ?? null,
      created_by: user?.id ?? null,
    };

    const { error } = profile
      ? await tth.from('tth_firm_profile').update(payload).eq('id', profile.id)
      : await tth.from('tth_firm_profile').insert(payload);

    setBusy(null);
    if (error) {
      toast.error('Could not save the firm profile', { description: error.message });
      return;
    }
    toast.success('Firm profile saved');
    await load();
  };

  const loadControls = async () => {
    setBusy('controls');
    try {
      const existing = new Set(controls.map((c) => c.code));
      const rows = buildSecurityControls()
        .filter((r) => !existing.has(r.code))
        .map((r) => ({ ...r, company_id: companyId }));
      if (!rows.length) {
        toast.info('The control register is already loaded');
        return;
      }
      const { error } = await tth.from('tth_security_controls').insert(rows);
      if (error) throw new Error(error.message);

      const provRows = DEFAULT_SERVICE_PROVIDERS.filter(
        (d) => !providers.some((p) => p.name === d.name)
      ).map((d) => ({ ...d, company_id: companyId }));
      if (provRows.length) await tth.from('tth_service_providers').insert(provRows);

      toast.success(`Loaded ${rows.length} controls`, {
        description: 'Work down the list and mark what is actually in place — not what you intend to do.',
      });
      await load();
    } catch (e) {
      toast.error('Could not load the register', { description: (e as Error).message });
    } finally {
      setBusy(null);
    }
  };

  const updateControl = async (id: string, patch: Partial<TthSecurityControl>) => {
    const next = { ...patch } as Record<string, unknown>;
    if (patch.status === 'implemented') {
      const row = controls.find((c) => c.id === id);
      const todayIso = new Date().toISOString().slice(0, 10);
      if (!row?.implemented_on) next.implemented_on = todayIso;
      next.last_reviewed_on = todayIso;
    }
    const { error } = await tth.from('tth_security_controls').update(next).eq('id', id);
    if (error) {
      toast.error('Could not update', { description: error.message });
      return;
    }
    await load();
  };

  const generatePlan = () => {
    if (!profile) {
      toast.error('Save the firm profile first');
      return;
    }
    if (!profile.security_officer_name) {
      toast.error('Name the qualified individual first', {
        description: '16 CFR 314.4(a) requires one named person to own the program.',
      });
      return;
    }
    downloadWisp({ profile, controls, providers, training });
    toast.success('Draft plan generated', {
      description: 'Read it end to end and correct anything that overstates what the firm actually does.',
    });
  };

  const logIncident = async () => {
    if (!incident.summary.trim()) {
      toast.error('Describe what happened');
      return;
    }
    setBusy('incident');
    const { error } = await tth.from('tth_security_incidents').insert({
      company_id: companyId,
      occurred_at: new Date(incident.occurred_at).toISOString(),
      discovered_at: new Date().toISOString(),
      severity: incident.severity,
      category: incident.category,
      summary: incident.summary.trim(),
      systems_affected: incident.systems_affected || null,
      clients_affected: Number(incident.clients_affected || 0),
      taxpayer_data_involved: incident.taxpayer_data_involved,
      containment: incident.containment || null,
      status: 'open',
      created_by: user?.id ?? null,
    });
    setBusy(null);
    if (error) {
      toast.error('Could not log the incident', { description: error.message });
      return;
    }
    toast.success('Incident logged', {
      description: incident.taxpayer_data_involved
        ? 'Taxpayer data involved — contact your IRS Stakeholder Liaison and counsel now.'
        : undefined,
    });
    setIncident({ ...emptyIncident });
    setIncidentOpen(false);
    await load();
  };

  const logTraining = async () => {
    if (!trainee.person_name.trim() || !trainee.completed_on) {
      toast.error('Name and completion date are required');
      return;
    }
    const next = new Date(`${trainee.completed_on}T00:00:00Z`);
    next.setUTCFullYear(next.getUTCFullYear() + 1);
    setBusy('training');
    const { error } = await tth.from('tth_security_training').insert({
      company_id: companyId,
      person_name: trainee.person_name.trim(),
      role: trainee.role || null,
      completed_on: trainee.completed_on,
      next_due_on: next.toISOString().slice(0, 10),
      provider: trainee.provider || null,
    });
    setBusy(null);
    if (error) {
      toast.error('Could not log training', { description: error.message });
      return;
    }
    toast.success('Training logged');
    setTrainee({ person_name: '', role: '', completed_on: '', provider: '' });
    setTrainingOpen(false);
    await load();
  };

  if (loading) {
    return (
      <Layout title="Security program" subtitle="Loading…">
        <div className="flex items-center justify-center p-16 text-muted-foreground">
          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
          Loading…
        </div>
      </Layout>
    );
  }

  return (
    <Layout
      title="Security program"
      subtitle="FTC Safeguards Rule and IRS Pub. 4557 — controls, plan, training, and incidents"
    >
      <Card className="border-amber-300 bg-amber-50 p-4">
        <div className="flex gap-3">
          <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
          <div className="text-sm text-amber-900">
            <p className="font-medium">This is a tracking tool, not legal advice.</p>
            <p className="mt-1">
              A paid preparer is a financial institution under the Gramm-Leach-Bliley Act and falls under
              the FTC Safeguards Rule (16 CFR part 314). The register below follows that rule and IRS Pub.
              4557. A firm holding data on fewer than 5,000 consumers is exempt from a few specific
              paragraphs — the written risk assessment, penetration testing, the written incident response
              plan, and the annual written report — but not from the rest. Have counsel review the plan
              before you rely on it.
            </p>
          </div>
        </div>
      </Card>

      <div className="mt-4 grid gap-4 md:grid-cols-4">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-muted-foreground">
            <ShieldCheck className="h-4 w-4" />
            <span className="text-xs uppercase tracking-wide">Readiness</span>
          </div>
          <p className="mt-2 text-2xl font-semibold">{readiness.score}%</p>
          <Progress value={readiness.score} className="mt-3 h-1.5" />
          <p className="mt-2 text-xs text-muted-foreground">
            {readiness.requiredImplemented}/{readiness.requiredTotal} required controls
          </p>
        </Card>
        <Card className="p-4">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Open gaps</span>
          <p className="mt-2 text-2xl font-semibold">{readiness.gaps.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">{readiness.inProgress} in progress</p>
        </Card>
        <Card className="p-4">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Reviews overdue</span>
          <p className="mt-2 text-2xl font-semibold">{readiness.overdueReviews.length}</p>
          <p className="mt-1 text-xs text-muted-foreground">An unreviewed control is a claim, not a control</p>
        </Card>
        <Card className="p-4">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">Plan</span>
          <p className="mt-2 text-lg font-semibold">
            {profile?.wisp_adopted_on ? `v${profile.wisp_version}` : 'Not adopted'}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {profile?.wisp_last_reviewed_on
              ? `Reviewed ${shortDate(profile.wisp_last_reviewed_on)}`
              : 'No review recorded'}
          </p>
        </Card>
      </div>

      <Tabs defaultValue="controls" className="mt-4">
        <TabsList className="flex-wrap">
          <TabsTrigger value="controls">Controls</TabsTrigger>
          <TabsTrigger value="plan">Plan &amp; firm profile</TabsTrigger>
          <TabsTrigger value="providers">Service providers</TabsTrigger>
          <TabsTrigger value="training">Training</TabsTrigger>
          <TabsTrigger value="incidents">
            Incidents
            {incidents.filter((i) => i.status !== 'closed').length > 0 && (
              <span className="ml-2 rounded-full bg-destructive/15 px-1.5 text-[10px] text-destructive">
                {incidents.filter((i) => i.status !== 'closed').length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ---------------- CONTROLS ---------------- */}
        <TabsContent value="controls" className="mt-4 space-y-4">
          {controls.length === 0 ? (
            <Card className="p-12 text-center">
              <p className="font-medium">The control register is empty</p>
              <p className="mx-auto mt-1 max-w-lg text-sm text-muted-foreground">
                Load the standard register — 27 controls drawn from 16 CFR 314.4 and IRS Pub. 4557, each
                with the requirement, the citation, and what evidence to record.
              </p>
              <Button className="mt-4" onClick={loadControls} disabled={busy === 'controls'}>
                {busy === 'controls' ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Plus className="mr-2 h-4 w-4" />
                )}
                Load control register
              </Button>
            </Card>
          ) : (
            Object.entries(byCategory).map(([category, list]) => (
              <Card key={category} className="p-5">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                  {category}
                </h3>
                <div className="space-y-2">
                  {list.map((c) => {
                    const due = reviewDueDate(c);
                    const overdue = due !== null && due < new Date().toISOString().slice(0, 10);
                    return (
                      <div key={c.id} className="rounded-lg border p-3">
                        <div className="flex flex-wrap items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="font-medium">{c.title}</span>
                              {c.applicability === 'recommended' && (
                                <Badge variant="outline" className="text-[10px]">
                                  recommended
                                </Badge>
                              )}
                              {c.status === 'implemented' && !overdue && (
                                <Badge variant="success" className="text-[10px]">
                                  implemented
                                </Badge>
                              )}
                              {overdue && (
                                <Badge variant="warning" className="text-[10px]">
                                  review overdue
                                </Badge>
                              )}
                            </div>
                            <p className="mt-1 text-sm text-muted-foreground">{c.requirement}</p>
                            {c.authority && (
                              <p className="mt-1 text-xs italic text-muted-foreground">{c.authority}</p>
                            )}
                            <div className="mt-2 flex flex-wrap gap-2">
                              <Input
                                className="h-8 w-56 text-xs"
                                placeholder="Owner"
                                defaultValue={c.owner ?? ''}
                                onBlur={(e) =>
                                  e.target.value !== (c.owner ?? '') &&
                                  updateControl(c.id, { owner: e.target.value || null })
                                }
                              />
                              <Input
                                className="h-8 flex-1 text-xs"
                                placeholder={c.notes ?? 'Evidence'}
                                defaultValue={c.evidence ?? ''}
                                onBlur={(e) =>
                                  e.target.value !== (c.evidence ?? '') &&
                                  updateControl(c.id, { evidence: e.target.value || null })
                                }
                              />
                            </div>
                            {due && (
                              <p className="mt-2 text-xs text-muted-foreground">
                                Next review {shortDate(due)} · every {c.review_months} months
                              </p>
                            )}
                          </div>
                          <Select
                            value={c.status}
                            onValueChange={(v) => updateControl(c.id, { status: v as ControlStatus })}
                          >
                            <SelectTrigger className="w-40">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map((s) => (
                                <SelectItem key={s.value} value={s.value}>
                                  {s.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            ))
          )}
        </TabsContent>

        {/* ---------------- PLAN ---------------- */}
        <TabsContent value="plan" className="mt-4 space-y-4">
          <Card className="p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="font-semibold">Written information security plan</h3>
                <p className="text-sm text-muted-foreground">
                  Generated from the firm profile and the control register. Open gaps are printed rather
                  than hidden.
                </p>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={generatePlan}>
                  <FileText className="mr-2 h-4 w-4" />
                  Generate WISP
                </Button>
                <Button onClick={saveProfile} disabled={busy === 'profile'}>
                  {busy === 'profile' ? (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="mr-2 h-4 w-4" />
                  )}
                  Save profile
                </Button>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="mb-4 font-semibold">Firm profile</h3>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Firm name" value={form.firm_name} onChange={(v) => setForm({ ...form, firm_name: v })} />
              <Field label="Legal entity" value={form.legal_entity} onChange={(v) => setForm({ ...form, legal_entity: v })} />
              <Field label="EIN (last 4)" value={form.ein_last4} onChange={(v) => setForm({ ...form, ein_last4: v })} />
              <Field label="PTIN" value={form.ptin} onChange={(v) => setForm({ ...form, ptin: v })} />
              <Field label="EFIN" value={form.efin} onChange={(v) => setForm({ ...form, efin: v })} />
              <Field label="Phone" value={form.phone} onChange={(v) => setForm({ ...form, phone: v })} />
              <Field label="Street" value={form.street} onChange={(v) => setForm({ ...form, street: v })} />
              <Field label="City" value={form.city} onChange={(v) => setForm({ ...form, city: v })} />
              <div className="grid grid-cols-2 gap-3">
                <Field label="State" value={form.state} onChange={(v) => setForm({ ...form, state: v })} />
                <Field label="ZIP" value={form.postal_code} onChange={(v) => setForm({ ...form, postal_code: v })} />
              </div>
            </div>

            <h4 className="mb-3 mt-6 text-sm font-semibold">Qualified individual — 16 CFR 314.4(a)</h4>
            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Name" value={form.security_officer_name} onChange={(v) => setForm({ ...form, security_officer_name: v })} />
              <Field label="Title" value={form.security_officer_title} onChange={(v) => setForm({ ...form, security_officer_title: v })} />
              <Field label="Email" value={form.security_officer_email} onChange={(v) => setForm({ ...form, security_officer_email: v })} />
            </div>

            <h4 className="mb-3 mt-6 text-sm font-semibold">Plan status and incident contacts</h4>
            <div className="grid gap-4 md:grid-cols-3">
              <Field type="date" label="Adopted on" value={form.wisp_adopted_on} onChange={(v) => setForm({ ...form, wisp_adopted_on: v })} />
              <Field type="date" label="Last reviewed" value={form.wisp_last_reviewed_on} onChange={(v) => setForm({ ...form, wisp_last_reviewed_on: v })} />
              <Field label="Plan version" value={form.wisp_version} onChange={(v) => setForm({ ...form, wisp_version: v })} />
              <Field
                type="number"
                label="Records retention (years)"
                value={String(form.retention_years ?? 7)}
                onChange={(v) => setForm({ ...form, retention_years: Number(v) })}
              />
              <Field label="Breach counsel" value={form.breach_counsel} onChange={(v) => setForm({ ...form, breach_counsel: v })} />
              <Field label="Cyber insurer" value={form.cyber_insurer} onChange={(v) => setForm({ ...form, cyber_insurer: v })} />
            </div>
          </Card>
        </TabsContent>

        {/* ---------------- PROVIDERS ---------------- */}
        <TabsContent value="providers" className="mt-4">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Service providers</h3>
                <p className="text-sm text-muted-foreground">
                  Everyone who touches client data. 16 CFR 314.4(f) requires selecting them carefully and
                  reviewing them periodically.
                </p>
              </div>
            </div>
            {providers.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No providers recorded. Loading the control register also seeds the usual suspects.
              </p>
            ) : (
              <div className="space-y-2">
                {providers.map((p) => (
                  <div key={p.id} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className="font-medium">{p.name}</span>
                          {p.contract_on_file ? (
                            <Badge variant="success" className="text-[10px]">contract on file</Badge>
                          ) : (
                            <Badge variant="warning" className="text-[10px]">no contract</Badge>
                          )}
                          {p.mfa_enforced ? (
                            <Badge variant="success" className="text-[10px]">MFA</Badge>
                          ) : (
                            <Badge variant="warning" className="text-[10px]">no MFA</Badge>
                          )}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{p.purpose}</p>
                        {p.data_accessed && (
                          <p className="text-xs text-muted-foreground">Data: {p.data_accessed}</p>
                        )}
                        <p className="mt-1 text-xs text-muted-foreground">
                          {p.security_review_on
                            ? `Reviewed ${shortDate(p.security_review_on)}`
                            : 'Never reviewed'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <label className="flex items-center gap-2 text-xs">
                          <Switch
                            checked={p.contract_on_file}
                            onCheckedChange={async (v) => {
                              await tth.from('tth_service_providers').update({ contract_on_file: v }).eq('id', p.id);
                              await load();
                            }}
                          />
                          Contract
                        </label>
                        <label className="flex items-center gap-2 text-xs">
                          <Switch
                            checked={p.mfa_enforced}
                            onCheckedChange={async (v) => {
                              await tth.from('tth_service_providers').update({ mfa_enforced: v }).eq('id', p.id);
                              await load();
                            }}
                          />
                          MFA
                        </label>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={async () => {
                            const today = new Date().toISOString().slice(0, 10);
                            const next = new Date();
                            next.setFullYear(next.getFullYear() + 1);
                            await tth
                              .from('tth_service_providers')
                              .update({ security_review_on: today, next_review_on: next.toISOString().slice(0, 10) })
                              .eq('id', p.id);
                            toast.success(`${p.name} marked reviewed`);
                            await load();
                          }}
                        >
                          Mark reviewed
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ---------------- TRAINING ---------------- */}
        <TabsContent value="training" className="mt-4">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Security awareness training</h3>
                <p className="text-sm text-muted-foreground">
                  Everyone with access, including seasonal staff, annually — 16 CFR 314.4(e).
                </p>
              </div>
              <Button size="sm" onClick={() => setTrainingOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Log training
              </Button>
            </div>
            {training.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">Nothing logged yet.</p>
            ) : (
              <div className="space-y-2">
                {training.map((t) => {
                  const overdue = t.next_due_on && t.next_due_on < new Date().toISOString().slice(0, 10);
                  return (
                    <div key={t.id} className="flex items-center justify-between rounded-lg border p-3">
                      <div>
                        <span className="font-medium">{t.person_name}</span>
                        {t.role && <span className="ml-2 text-sm text-muted-foreground">{t.role}</span>}
                        <p className="text-xs text-muted-foreground">
                          {t.topic} · completed {shortDate(t.completed_on)}
                          {t.provider ? ` · ${t.provider}` : ''}
                        </p>
                      </div>
                      <Badge variant={overdue ? 'warning' : 'success'}>
                        {overdue ? 'Due now' : `Next ${shortDate(t.next_due_on)}`}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            )}
          </Card>
        </TabsContent>

        {/* ---------------- INCIDENTS ---------------- */}
        <TabsContent value="incidents" className="mt-4">
          <Card className="p-5">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h3 className="font-semibold">Incident log</h3>
                <p className="text-sm text-muted-foreground">
                  On a client data theft, contact your IRS Stakeholder Liaison promptly, then state agencies
                  and affected clients.
                </p>
              </div>
              <Button size="sm" variant="outline" onClick={() => setIncidentOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Log incident
              </Button>
            </div>
            {incidents.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No incidents recorded. A near miss is worth logging too — it is the cheapest training material
                you will ever get.
              </p>
            ) : (
              <div className="space-y-2">
                {incidents.map((i) => (
                  <div key={i.id} className="rounded-lg border p-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge
                        variant={
                          i.severity === 'critical' || i.severity === 'high'
                            ? 'destructive'
                            : i.severity === 'medium'
                            ? 'warning'
                            : 'default'
                        }
                        className="text-[10px] uppercase"
                      >
                        {i.severity}
                      </Badge>
                      <span className="text-xs uppercase tracking-wide text-muted-foreground">
                        {i.category}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {new Date(i.occurred_at).toLocaleString('en-US')}
                      </span>
                      <Badge variant={i.status === 'closed' ? 'success' : 'warning'} className="ml-auto text-[10px]">
                        {i.status}
                      </Badge>
                    </div>
                    <p className="mt-2 font-medium">{i.summary}</p>
                    {i.taxpayer_data_involved && (
                      <p className="mt-1 text-sm text-destructive">
                        Taxpayer data involved · {i.clients_affected} client(s)
                        {!i.reported_irs_at && ' · IRS not yet notified'}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      {/* Dialogs */}
      <Dialog open={incidentOpen} onOpenChange={setIncidentOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Log a security incident</DialogTitle>
            <DialogDescription>
              Record it now, correct it later. Containment comes before documentation.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>When it happened</Label>
              <Input
                type="datetime-local"
                value={incident.occurred_at}
                onChange={(e) => setIncident({ ...incident, occurred_at: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Severity</Label>
              <Select value={incident.severity} onValueChange={(v) => setIncident({ ...incident, severity: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={incident.category} onValueChange={(v) => setIncident({ ...incident, category: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="phishing">Phishing</SelectItem>
                  <SelectItem value="credential">Credential compromise</SelectItem>
                  <SelectItem value="malware">Malware / ransomware</SelectItem>
                  <SelectItem value="lost_device">Lost or stolen device</SelectItem>
                  <SelectItem value="misdirected">Misdirected disclosure</SelectItem>
                  <SelectItem value="vendor">Service provider breach</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Clients affected</Label>
              <Input
                type="number"
                value={incident.clients_affected}
                onChange={(e) => setIncident({ ...incident, clients_affected: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>What happened</Label>
              <Textarea
                rows={3}
                value={incident.summary}
                onChange={(e) => setIncident({ ...incident, summary: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Containment taken</Label>
              <Textarea
                rows={2}
                value={incident.containment}
                onChange={(e) => setIncident({ ...incident, containment: e.target.value })}
              />
            </div>
            <label className="flex items-center gap-3 sm:col-span-2">
              <Switch
                checked={incident.taxpayer_data_involved}
                onCheckedChange={(v) => setIncident({ ...incident, taxpayer_data_involved: v })}
              />
              <span className="text-sm">Taxpayer data was involved</span>
            </label>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIncidentOpen(false)}>Cancel</Button>
            <Button onClick={logIncident} disabled={busy === 'incident'}>
              {busy === 'incident' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Log incident
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={trainingOpen} onOpenChange={setTrainingOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Log training completion</DialogTitle></DialogHeader>
          <div className="grid gap-4 py-2 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Name</Label>
              <Input value={trainee.person_name} onChange={(e) => setTrainee({ ...trainee, person_name: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Input value={trainee.role} onChange={(e) => setTrainee({ ...trainee, role: e.target.value })} />
            </div>
            <div className="space-y-2">
              <Label>Completed on</Label>
              <Input type="date" value={trainee.completed_on} onChange={(e) => setTrainee({ ...trainee, completed_on: e.target.value })} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label>Provider</Label>
              <Input value={trainee.provider} onChange={(e) => setTrainee({ ...trainee, provider: e.target.value })} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setTrainingOpen(false)}>Cancel</Button>
            <Button onClick={logTraining} disabled={busy === 'training'}>
              {busy === 'training' && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Log
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}

function Field({
  label,
  value,
  onChange,
  type = 'text',
}: {
  label: string;
  value: string | null | undefined;
  onChange: (v: string) => void;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs">{label}</Label>
      <Input type={type} value={value ?? ''} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}
