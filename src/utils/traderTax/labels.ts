/**
 * TraderTaxHQ — display labels and badge tones shared across the module.
 */

import {
  DocumentRequestStatus,
  EngagementStatus,
  FilingStatusCode,
  FindingSeverity,
  PositionStatus,
  RiskLevel,
  TtsTier,
} from '@/types/tradertax';

export type BadgeTone =
  | 'default'
  | 'primary'
  | 'secondary'
  | 'destructive'
  | 'outline'
  | 'success'
  | 'warning'
  | 'info';

const ENGAGEMENT_LABELS: Record<EngagementStatus, string> = {
  intake: 'Intake',
  docs_pending: 'Docs pending',
  analysis: 'Analysis',
  consult_scheduled: 'Consult scheduled',
  consult_complete: 'Consult complete',
  prep: 'Preparation',
  review: 'Review',
  filed: 'Filed',
  closed: 'Closed',
};

export const ENGAGEMENT_PIPELINE: EngagementStatus[] = [
  'intake',
  'docs_pending',
  'analysis',
  'consult_scheduled',
  'consult_complete',
  'prep',
  'review',
  'filed',
  'closed',
];

export function engagementStatusLabel(status: string): string {
  return ENGAGEMENT_LABELS[status as EngagementStatus] ?? status;
}

export function engagementTone(status: string): BadgeTone {
  switch (status) {
    case 'intake':
    case 'docs_pending':
      return 'warning';
    case 'analysis':
    case 'consult_scheduled':
      return 'info';
    case 'consult_complete':
    case 'prep':
    case 'review':
      return 'primary';
    case 'filed':
      return 'success';
    default:
      return 'default';
  }
}

export function statusTone(status: string): BadgeTone {
  switch (status) {
    case 'active':
      return 'success';
    case 'onboarding':
      return 'info';
    case 'lead':
      return 'warning';
    case 'inactive':
    case 'archived':
      return 'default';
    default:
      return 'default';
  }
}

export function docStatusTone(status: DocumentRequestStatus | string): BadgeTone {
  switch (status) {
    case 'received':
      return 'info';
    case 'reviewed':
      return 'success';
    case 'waived':
      return 'default';
    case 'rejected':
      return 'destructive';
    default:
      return 'warning';
  }
}

export function severityTone(severity: FindingSeverity): BadgeTone {
  switch (severity) {
    case 'critical':
      return 'destructive';
    case 'high':
      return 'warning';
    case 'medium':
      return 'info';
    default:
      return 'default';
  }
}

export function riskTone(risk: RiskLevel): BadgeTone {
  switch (risk) {
    case 'high':
      return 'destructive';
    case 'medium':
      return 'warning';
    default:
      return 'success';
  }
}

export function ttsTone(tier: TtsTier): BadgeTone {
  switch (tier) {
    case 'strong':
      return 'success';
    case 'defensible':
      return 'info';
    case 'weak':
      return 'warning';
    case 'not_supported':
      return 'destructive';
    default:
      return 'default';
  }
}

export function positionStatusTone(status: PositionStatus | string): BadgeTone {
  switch (status) {
    case 'accepted':
      return 'info';
    case 'implemented':
      return 'success';
    case 'declined':
      return 'destructive';
    case 'deferred':
      return 'warning';
    default:
      return 'default';
  }
}

export function filingStatusTone(status: FilingStatusCode | string): BadgeTone {
  switch (status) {
    case 'accepted':
      return 'success';
    case 'efiled':
    case 'paper_filed':
      return 'info';
    case 'rejected':
      return 'destructive';
    case 'ready_for_review':
    case 'client_review':
    case 'in_progress':
      return 'warning';
    case 'n_a':
      return 'default';
    default:
      return 'default';
  }
}

export const money = (n: number | null | undefined, fractionDigits = 0) =>
  n === null || n === undefined || !Number.isFinite(Number(n))
    ? '—'
    : Number(n).toLocaleString('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: fractionDigits,
        maximumFractionDigits: fractionDigits,
      });

export const shortDate = (value: string | null | undefined) =>
  value ? new Date(value.length <= 10 ? `${value}T00:00:00` : value).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
