/**
 * TraderTaxHQ — firm-wide obligation calendar.
 *
 * Deadlines live in five different places: filings on an engagement, election
 * windows computed from the tax year, scheduled consultations, document
 * requests with a due date, and the firm's own compliance dates. A missed
 * deadline is the single most expensive failure in a tax practice, so this
 * module flattens all five into one ordered list with a severity bucket.
 *
 * Everything here is pure — feed it rows, get obligations back.
 */

import {
  FindingSeverity,
  IntakeAnswers,
  Obligation,
  ObligationBucket,
  ObligationKind,
  Recurrence,
  TthClient,
  TthDocumentRequest,
  TthEngagement,
  TthFiling,
  TthFirmDeadline,
  TthIntake,
  TthPosition,
} from '@/types/tradertax';
import { daysUntil } from './taxYearConfig';
import { assessElections } from './electionEngine';

/** Statuses that mean an obligation no longer needs attention. */
const CLOSED_FILING_STATUSES = ['accepted', 'efiled', 'paper_filed', 'n_a'];

/** Forms whose deadline is set by statute rather than by the firm. */
const STATUTORY_FORMS = /^(1040|1065|1120|1120S|4868|7004|1040ES|FINCEN_114|W2_W3|941_940|3115|STATE_)/;

function bucketFor(days: number): ObligationBucket {
  if (days < 0) return 'overdue';
  if (days <= 7) return 'week';
  if (days <= 30) return 'month';
  if (days <= 90) return 'quarter';
  return 'later';
}

function severityFor(days: number, statutory: boolean): FindingSeverity {
  if (days < 0) return statutory ? 'critical' : 'high';
  if (days <= 7) return statutory ? 'critical' : 'high';
  if (days <= 30) return 'high';
  if (days <= 90) return 'medium';
  return 'info';
}

export interface CalendarInput {
  clients: TthClient[];
  engagements: TthEngagement[];
  filings: TthFiling[];
  intakes: TthIntake[];
  documents: TthDocumentRequest[];
  positions: TthPosition[];
  firmDeadlines: TthFirmDeadline[];
  /** Reference date — injectable so the calendar is testable. */
  today?: Date;
}

export function buildObligations(input: CalendarInput): Obligation[] {
  const {
    clients,
    engagements,
    filings,
    intakes,
    documents,
    positions,
    firmDeadlines,
    today = new Date(),
  } = input;

  const clientById = new Map(clients.map((c) => [c.id, c]));
  const engagementById = new Map(engagements.map((e) => [e.id, e]));
  const out: Obligation[] = [];

  const push = (
    partial: Omit<Obligation, 'daysRemaining' | 'bucket' | 'severity'> & { statutory: boolean }
  ) => {
    const days = daysUntil(partial.dueDate, today);
    out.push({
      ...partial,
      daysRemaining: days,
      bucket: bucketFor(days),
      severity: severityFor(days, partial.statutory),
    });
  };

  const contextFor = (engagementId: string) => {
    const engagement = engagementById.get(engagementId);
    const client = engagement ? clientById.get(engagement.client_id) : undefined;
    return {
      engagementId,
      clientId: client?.id ?? null,
      clientName: client?.display_name ?? null,
      taxYear: engagement?.tax_year ?? null,
      href: client ? `/tradertax/clients/${client.id}` : null,
    };
  };

  // --- Filings ------------------------------------------------------------
  filings.forEach((f) => {
    if (CLOSED_FILING_STATUSES.includes(f.status)) return;
    const ctx = contextFor(f.engagement_id);
    const statutory = STATUTORY_FORMS.test(f.form_code);

    // An extension already filed moves the live date to the extended one.
    const usingExtended = Boolean(f.extension_filed_at && f.extended_due_date);
    const due = usingExtended ? f.extended_due_date! : f.due_date;
    if (!due) return;

    push({
      id: `filing:${f.id}`,
      kind: usingExtended ? 'extension' : 'filing',
      title: `${f.form_code} — ${ctx.clientName ?? 'Client'}`,
      detail: usingExtended
        ? `${f.form_name}. Extended deadline; the extension was filed ${f.extension_filed_at?.slice(0, 10)}.`
        : f.form_name,
      authority: null,
      dueDate: due,
      statutory,
      owner: f.assigned_to ?? f.preparer ?? null,
      ...ctx,
    });
  });

  // --- Election windows ---------------------------------------------------
  // Computed rather than stored: the window moves with the tax year, and a
  // stored copy would go stale the moment an intake answer changes.
  const intakeByEngagement = new Map(intakes.map((i) => [i.engagement_id, i]));
  engagements.forEach((e) => {
    if (e.status === 'closed') return;
    const intake = intakeByEngagement.get(e.id);
    const answers = (intake?.answers ?? {}) as IntakeAnswers;
    const client = clientById.get(e.client_id);

    let elections;
    try {
      elections = assessElections(answers, e.tax_year);
    } catch {
      return;
    }

    elections.deadlines
      .filter((d) => d.status === 'open' || d.status === 'past')
      .forEach((d) => {
        // A window that closed more than a year ago is history, not a task.
        if (d.status === 'past' && daysUntil(d.dueDate, today) < -365) return;
        push({
          id: `election:${e.id}:${d.code}`,
          kind: 'election',
          title: `${d.label} — ${client?.display_name ?? 'Client'}`,
          detail: d.description,
          authority: d.authority,
          dueDate: d.dueDate,
          statutory: true,
          owner: null,
          engagementId: e.id,
          clientId: client?.id ?? null,
          clientName: client?.display_name ?? null,
          taxYear: e.tax_year,
          href: client ? `/tradertax/clients/${client.id}` : null,
        });
      });
  });

  // --- Consultations ------------------------------------------------------
  engagements.forEach((e) => {
    if (!e.consult_at || e.status === 'closed' || e.status === 'consult_complete') return;
    const client = clientById.get(e.client_id);
    push({
      id: `consult:${e.id}`,
      kind: 'consultation',
      title: `Consultation — ${client?.display_name ?? 'Client'}`,
      detail: `${e.service_type.replace(/_/g, ' ')}, tax year ${e.tax_year}.`,
      authority: null,
      dueDate: e.consult_at.slice(0, 10),
      statutory: false,
      owner: null,
      engagementId: e.id,
      clientId: client?.id ?? null,
      clientName: client?.display_name ?? null,
      taxYear: e.tax_year,
      href: client ? `/tradertax/clients/${client.id}` : null,
    });
  });

  // --- Document requests with a due date ----------------------------------
  documents.forEach((d) => {
    if (!d.due_date || d.status !== 'requested') return;
    const ctx = contextFor(d.engagement_id);
    push({
      id: `doc:${d.id}`,
      kind: 'document',
      title: `${d.name} — ${ctx.clientName ?? 'Client'}`,
      detail: d.description,
      authority: null,
      dueDate: d.due_date,
      statutory: false,
      owner: null,
      ...ctx,
    });
  });

  // --- Action plan items with a due date ----------------------------------
  positions.forEach((p) => {
    if (!p.due_date) return;
    if (['declined', 'implemented'].includes(p.status)) return;
    const ctx = contextFor(p.engagement_id);
    push({
      id: `position:${p.id}`,
      kind: 'position',
      title: `${p.title} — ${ctx.clientName ?? 'Client'}`,
      detail: p.recommendation,
      authority: p.authority,
      dueDate: p.due_date,
      statutory: false,
      owner: p.owner,
      ...ctx,
    });
  });

  // --- Firm obligations ---------------------------------------------------
  firmDeadlines.forEach((f) => {
    if (f.status !== 'open') return;
    push({
      id: `firm:${f.id}`,
      kind: 'firm',
      title: f.title,
      detail: f.detail,
      authority: f.authority,
      dueDate: f.due_date,
      statutory: f.category === 'compliance',
      owner: f.owner,
      engagementId: null,
      clientId: null,
      clientName: null,
      taxYear: null,
      href: '/tradertax/security',
    });
  });

  return out.sort((a, b) => a.dueDate.localeCompare(b.dueDate) || a.title.localeCompare(b.title));
}

// ---------------------------------------------------------------------------
// Grouping helpers
// ---------------------------------------------------------------------------

export const BUCKET_LABELS: Record<ObligationBucket, string> = {
  overdue: 'Overdue',
  week: 'Next 7 days',
  month: 'Next 30 days',
  quarter: 'Next 90 days',
  later: 'Later',
};

export const KIND_LABELS: Record<ObligationKind, string> = {
  filing: 'Filing',
  extension: 'Extended filing',
  election: 'Election',
  consultation: 'Consultation',
  document: 'Document',
  position: 'Action item',
  firm: 'Firm',
};

export function groupByBucket(obligations: Obligation[]): [ObligationBucket, Obligation[]][] {
  const order: ObligationBucket[] = ['overdue', 'week', 'month', 'quarter', 'later'];
  return order
    .map((b) => [b, obligations.filter((o) => o.bucket === b)] as [ObligationBucket, Obligation[]])
    .filter(([, list]) => list.length > 0);
}

export function groupByMonth(obligations: Obligation[]): [string, Obligation[]][] {
  const map = new Map<string, Obligation[]>();
  obligations.forEach((o) => {
    const key = o.dueDate.slice(0, 7);
    const list = map.get(key) ?? [];
    list.push(o);
    map.set(key, list);
  });
  return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
}

export function monthLabel(yyyymm: string): string {
  const [y, m] = yyyymm.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

// ---------------------------------------------------------------------------
// Recurrence
// ---------------------------------------------------------------------------

/** Next occurrence of a recurring firm deadline after it is completed. */
export function nextOccurrence(isoDate: string, recurrence: Recurrence): string | null {
  if (recurrence === 'none') return null;
  const d = new Date(`${isoDate}T00:00:00Z`);
  if (recurrence === 'annual') d.setUTCFullYear(d.getUTCFullYear() + 1);
  if (recurrence === 'quarterly') d.setUTCMonth(d.getUTCMonth() + 3);
  if (recurrence === 'monthly') d.setUTCMonth(d.getUTCMonth() + 1);
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Calendar feed
// ---------------------------------------------------------------------------

function icsEscape(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

/** RFC 5545 requires lines to fold at 75 octets. */
function fold(line: string): string {
  if (line.length <= 73) return line;
  const parts: string[] = [];
  let rest = line;
  while (rest.length > 73) {
    parts.push(rest.slice(0, 73));
    rest = rest.slice(73);
  }
  parts.push(rest);
  return parts.join('\r\n ');
}

/**
 * An .ics feed of every open obligation, so the calendar the firm already
 * lives in shows the same dates this page does.
 */
export function obligationsToIcs(obligations: Obligation[], calendarName = 'TraderTaxHQ'): string {
  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//TraderTaxHQ//Obligation Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${icsEscape(calendarName)}`,
  ];

  obligations.forEach((o) => {
    const date = o.dueDate.replace(/-/g, '');
    const summaryPrefix = o.statutory ? '[Statutory] ' : '';
    lines.push(
      'BEGIN:VEVENT',
      `UID:${o.id.replace(/[^a-zA-Z0-9:_-]/g, '')}@tradertaxhq`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${date}`,
      `DTEND;VALUE=DATE:${date}`,
      fold(`SUMMARY:${icsEscape(summaryPrefix + o.title)}`),
      fold(
        `DESCRIPTION:${icsEscape(
          [KIND_LABELS[o.kind], o.detail, o.authority, o.clientName ? `Client: ${o.clientName}` : null]
            .filter(Boolean)
            .join('\n')
        )}`
      ),
      `CATEGORIES:${KIND_LABELS[o.kind]}`,
      'BEGIN:VALARM',
      'TRIGGER:-P7D',
      'ACTION:DISPLAY',
      fold(`DESCRIPTION:${icsEscape(o.title)} due in 7 days`),
      'END:VALARM',
      'END:VEVENT'
    );
  });

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

export function obligationsToCsv(obligations: Obligation[]): string {
  const header = ['Due', 'Days', 'Type', 'Title', 'Client', 'Tax year', 'Owner', 'Statutory', 'Detail'];
  const cell = (v: unknown) => {
    const s = v === null || v === undefined ? '' : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const rows = obligations.map((o) =>
    [
      o.dueDate,
      o.daysRemaining,
      KIND_LABELS[o.kind],
      o.title,
      o.clientName ?? '',
      o.taxYear ?? '',
      o.owner ?? '',
      o.statutory ? 'yes' : 'no',
      o.detail ?? '',
    ]
      .map(cell)
      .join(',')
  );
  return [header.join(','), ...rows].join('\n');
}
