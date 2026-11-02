/**
 * TraderTaxHQ — practice analytics.
 *
 * The questions this answers: what did the season earn, where did the hours
 * go, what is the firm actually realizing per hour, how long does an
 * engagement take, and how many inquiries turn into clients.
 *
 * Every metric degrades to null rather than to zero when the inputs are
 * missing. A realization rate of "$0/hr" because nobody logged time is a lie;
 * "—" is the truth.
 */

import {
  TthEngagement,
  TthFiling,
  TthIntake,
  TthLead,
  TthTimeEntry,
} from '@/types/tradertax';

const DAY = 86400000;

function daysBetween(a: string | null | undefined, b: string | null | undefined): number | null {
  if (!a || !b) return null;
  const start = new Date(a).getTime();
  const end = new Date(b).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null;
  return Math.round((end - start) / DAY);
}

export function median(values: number[]): number | null {
  const clean = values.filter((v) => Number.isFinite(v)).sort((a, b) => a - b);
  if (clean.length === 0) return null;
  const mid = Math.floor(clean.length / 2);
  return clean.length % 2 ? clean[mid] : (clean[mid - 1] + clean[mid]) / 2;
}

function monthKey(iso: string): string {
  return iso.slice(0, 7);
}

export function monthLabelShort(yyyymm: string): string {
  const [y, m] = yyyymm.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', {
    month: 'short',
    year: '2-digit',
    timeZone: 'UTC',
  });
}

export interface MetricsInput {
  engagements: TthEngagement[];
  filings: TthFiling[];
  intakes: TthIntake[];
  timeEntries: TthTimeEntry[];
  leads: TthLead[];
  months?: number;
}

export interface MonthlyPoint {
  month: string;
  label: string;
  fees: number;
  billableHours: number;
  nonBillableHours: number;
}

export interface ServiceLine {
  service: string;
  engagements: number;
  fees: number;
  hours: number;
  effectiveRate: number | null;
  averageFee: number | null;
}

export interface FunnelStage {
  stage: string;
  count: number;
}

export interface CycleStage {
  stage: string;
  medianDays: number | null;
  sample: number;
}

export interface PersonLoad {
  person: string;
  hours: number;
  engagements: number;
}

export interface PracticeMetrics {
  activeEngagements: number;
  bookedFees: number;
  averageFee: number | null;
  totalHours: number;
  billableHours: number;
  effectiveRate: number | null;
  utilization: number | null;
  onTimeRate: number | null;
  filedCount: number;
  lateCount: number;
  conversionRate: number | null;
  medianDaysToConvert: number | null;
  monthly: MonthlyPoint[];
  byService: ServiceLine[];
  funnel: FunnelStage[];
  cycle: CycleStage[];
  byPerson: PersonLoad[];
  warnings: string[];
}

export function computePracticeMetrics(input: MetricsInput): PracticeMetrics {
  const { engagements, filings, intakes, timeEntries, leads, months = 12 } = input;
  const warnings: string[] = [];

  // --- Headline -----------------------------------------------------------
  const active = engagements.filter((e) => !['closed', 'filed'].includes(e.status));
  const feed = engagements.filter((e) => e.fee !== null && Number(e.fee) > 0);
  const bookedFees = feed.reduce((s, e) => s + Number(e.fee ?? 0), 0);

  const totalMinutes = timeEntries.reduce((s, t) => s + t.minutes, 0);
  const billableMinutes = timeEntries.filter((t) => t.billable).reduce((s, t) => s + t.minutes, 0);
  const totalHours = totalMinutes / 60;
  const billableHours = billableMinutes / 60;

  if (timeEntries.length === 0) {
    warnings.push('No time logged, so realization and effective rate cannot be computed.');
  }
  if (feed.length === 0) {
    warnings.push('No fees recorded on any engagement, so revenue metrics are empty.');
  }

  // --- On-time filing -----------------------------------------------------
  const filed = filings.filter((f) => f.filed_at && (f.due_date || f.extended_due_date));
  const late = filed.filter((f) => {
    const deadline = f.extension_filed_at && f.extended_due_date ? f.extended_due_date : f.due_date;
    return deadline ? f.filed_at!.slice(0, 10) > deadline : false;
  });

  // --- Monthly series -----------------------------------------------------
  const cutoff = new Date();
  cutoff.setMonth(cutoff.getMonth() - (months - 1));
  const cutoffKey = monthKey(cutoff.toISOString());

  const monthMap = new Map<string, MonthlyPoint>();
  const touch = (key: string) => {
    if (!monthMap.has(key)) {
      monthMap.set(key, { month: key, label: monthLabelShort(key), fees: 0, billableHours: 0, nonBillableHours: 0 });
    }
    return monthMap.get(key)!;
  };

  // Seed a continuous axis so a quiet month reads as zero rather than vanishing.
  for (let i = 0; i < months; i += 1) {
    const d = new Date();
    d.setMonth(d.getMonth() - (months - 1 - i));
    touch(monthKey(d.toISOString()));
  }

  feed.forEach((e) => {
    const key = monthKey(e.created_at);
    if (key < cutoffKey) return;
    touch(key).fees += Number(e.fee ?? 0);
  });

  timeEntries.forEach((t) => {
    const key = monthKey(t.entry_date);
    if (key < cutoffKey) return;
    const point = touch(key);
    if (t.billable) point.billableHours += t.minutes / 60;
    else point.nonBillableHours += t.minutes / 60;
  });

  const monthly = [...monthMap.values()]
    .filter((p) => p.month >= cutoffKey)
    .sort((a, b) => a.month.localeCompare(b.month))
    .map((p) => ({
      ...p,
      billableHours: Math.round(p.billableHours * 10) / 10,
      nonBillableHours: Math.round(p.nonBillableHours * 10) / 10,
    }));

  // --- By service ---------------------------------------------------------
  const serviceMap = new Map<string, { engagements: number; fees: number; minutes: number }>();
  engagements.forEach((e) => {
    const row = serviceMap.get(e.service_type) ?? { engagements: 0, fees: 0, minutes: 0 };
    row.engagements += 1;
    row.fees += Number(e.fee ?? 0);
    serviceMap.set(e.service_type, row);
  });
  timeEntries.forEach((t) => {
    const engagement = engagements.find((e) => e.id === t.engagement_id);
    if (!engagement) return;
    const row = serviceMap.get(engagement.service_type);
    if (row) row.minutes += t.minutes;
  });

  const byService: ServiceLine[] = [...serviceMap.entries()]
    .map(([service, row]) => ({
      service: service.replace(/_/g, ' '),
      engagements: row.engagements,
      fees: row.fees,
      hours: Math.round((row.minutes / 60) * 10) / 10,
      effectiveRate: row.minutes > 0 && row.fees > 0 ? row.fees / (row.minutes / 60) : null,
      averageFee: row.engagements > 0 && row.fees > 0 ? row.fees / row.engagements : null,
    }))
    .sort((a, b) => b.fees - a.fees);

  // --- Lead funnel --------------------------------------------------------
  const stageCount = (statuses: string[]) => leads.filter((l) => statuses.includes(l.status)).length;
  const won = leads.filter((l) => l.status === 'won');
  const decided = leads.filter((l) => ['won', 'lost', 'disqualified'].includes(l.status));

  const funnel: FunnelStage[] = [
    { stage: 'Inquiries', count: leads.length },
    { stage: 'Contacted', count: stageCount(['contacted', 'qualified', 'quoted', 'won']) },
    { stage: 'Qualified', count: stageCount(['qualified', 'quoted', 'won']) },
    { stage: 'Quoted', count: stageCount(['quoted', 'won']) },
    { stage: 'Won', count: won.length },
  ];

  const convertDays = won
    .map((l) => daysBetween(l.created_at, l.converted_at))
    .filter((d): d is number => d !== null);

  // --- Cycle time ---------------------------------------------------------
  const intakeByEngagement = new Map(intakes.map((i) => [i.engagement_id, i]));

  const intakeTurnaround = intakes
    .map((i) => daysBetween(i.sent_at, i.submitted_at))
    .filter((d): d is number => d !== null && d >= 0);

  const intakeToConsult = engagements
    .map((e) => {
      const intake = intakeByEngagement.get(e.id);
      return daysBetween(intake?.submitted_at, e.consult_at);
    })
    .filter((d): d is number => d !== null && d >= 0);

  const engagementToFiled = engagements
    .map((e) => {
      const first = filings
        .filter((f) => f.engagement_id === e.id && f.filed_at)
        .map((f) => f.filed_at!)
        .sort()[0];
      return daysBetween(e.created_at, first);
    })
    .filter((d): d is number => d !== null && d >= 0);

  const cycle: CycleStage[] = [
    { stage: 'Intake sent → submitted', medianDays: median(intakeTurnaround), sample: intakeTurnaround.length },
    { stage: 'Intake → consultation', medianDays: median(intakeToConsult), sample: intakeToConsult.length },
    { stage: 'Engaged → first filing', medianDays: median(engagementToFiled), sample: engagementToFiled.length },
  ];

  // --- Workload -----------------------------------------------------------
  const personMap = new Map<string, { minutes: number; engagements: Set<string> }>();
  timeEntries.forEach((t) => {
    const key = t.person ?? 'Unattributed';
    const row = personMap.get(key) ?? { minutes: 0, engagements: new Set<string>() };
    row.minutes += t.minutes;
    if (t.engagement_id) row.engagements.add(t.engagement_id);
    personMap.set(key, row);
  });
  const byPerson: PersonLoad[] = [...personMap.entries()]
    .map(([person, row]) => ({
      person,
      hours: Math.round((row.minutes / 60) * 10) / 10,
      engagements: row.engagements.size,
    }))
    .sort((a, b) => b.hours - a.hours);

  return {
    activeEngagements: active.length,
    bookedFees,
    averageFee: feed.length ? bookedFees / feed.length : null,
    totalHours: Math.round(totalHours * 10) / 10,
    billableHours: Math.round(billableHours * 10) / 10,
    effectiveRate: billableHours > 0 && bookedFees > 0 ? bookedFees / billableHours : null,
    utilization: totalHours > 0 ? billableHours / totalHours : null,
    onTimeRate: filed.length ? (filed.length - late.length) / filed.length : null,
    filedCount: filed.length,
    lateCount: late.length,
    conversionRate: decided.length ? won.length / decided.length : null,
    medianDaysToConvert: median(convertDays),
    monthly,
    byService,
    funnel,
    cycle,
    byPerson,
    warnings,
  };
}
