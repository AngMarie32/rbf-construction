export const PERMIT_TYPES = ['Building', 'Electrical', 'Plumbing', 'Mechanical', 'Fire', 'Demolition', 'Grading', 'Other'] as const;
export const PERMIT_STATUSES = ['Not Applied', 'Application Submitted', 'Under Review', 'Approved', 'Issued', 'Expired', 'Rejected'] as const;
export const INSPECTION_RESULTS = ['Scheduled', 'Passed', 'Partial', 'Failed', 'Cancelled'] as const;

/** A permit row as stored in the `permits` table (dates are ISO yyyy-mm-dd strings). */
export interface Permit {
  id: string;
  project_id: string;
  permit_type: string;
  permit_number: string | null;
  description: string;
  issuing_authority: string;
  status: string;
  application_date: string | null;
  issued_date: string | null;
  expiration_date: string | null;
  fee_amount: number | null;
  fee_paid: boolean;
  notes: string | null;
  created_at: string;
  updated_at: string;
  projects?: { name: string } | null;
  permit_inspections?: PermitInspection[];
}

export interface PermitInspection {
  id: string;
  permit_id: string;
  inspection_type: string;
  scheduled_date: string;
  scheduled_time: string | null;
  inspector: string | null;
  result: string;
  notes: string | null;
}

/** Days from today until an ISO date (negative = in the past). */
export function daysUntil(isoDate: string, today = new Date()) {
  const d = new Date(`${isoDate}T00:00:00`);
  const t = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  return Math.round((d.getTime() - t.getTime()) / 86_400_000);
}

/** Next inspection that hasn't happened yet, if any. */
export function nextInspection(p: Permit): PermitInspection | undefined {
  return (p.permit_inspections || [])
    .filter((i) => i.result === 'Scheduled' && daysUntil(i.scheduled_date) >= 0)
    .sort((a, b) => a.scheduled_date.localeCompare(b.scheduled_date))[0];
}
