import type { ReminderKind } from '@/lib/reminders';

/** Per-browser alert preferences: which alert types show, and which alerts were deleted. */
export const REMINDER_KIND_LABELS: Record<ReminderKind, string> = {
  invoice_overdue: 'Overdue invoices',
  insurance_expired: 'Subcontractor insurance expired',
  insurance_expiring: 'Subcontractor insurance expiring',
  inspection_soon: 'Permit inspections today/tomorrow',
  permit_expiring: 'Permits expiring',
  cost_spike: 'Job cost jumps',
};

const KEY = 'rbf-reminder-prefs';

export interface ReminderPrefs {
  disabled: ReminderKind[];
  dismissed: string[];
}

export function loadPrefs(): ReminderPrefs {
  try {
    const p = JSON.parse(localStorage.getItem(KEY) || '{}');
    return { disabled: p.disabled || [], dismissed: p.dismissed || [] };
  } catch {
    return { disabled: [], dismissed: [] };
  }
}

export function savePrefs(p: ReminderPrefs) {
  localStorage.setItem(KEY, JSON.stringify(p));
}
