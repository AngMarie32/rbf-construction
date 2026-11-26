/** Per-browser Morning Briefing preferences: which sections show, their order, and the last day it was reviewed. */
export type BriefingSection =
  | 'tasks_today' | 'inspections' | 'insurance' | 'permits'
  | 'invoices_overdue' | 'pending_approvals' | 'cost_spikes' | 'lease_expirations'
  | 'exec_snapshot' | 'exec_profit_erosion' | 'exec_receivables';

export const BRIEFING_SECTION_LABELS: Record<BriefingSection, string> = {
  exec_snapshot: 'Executive snapshot',
  exec_profit_erosion: 'Projects losing profit',
  exec_receivables: 'Receivables past due',
  tasks_today: 'Schedule activities today',
  inspections: 'Permit inspections today/tomorrow',
  insurance: 'Subcontractor insurance',
  permits: 'Permits expiring',
  invoices_overdue: 'Overdue invoices',
  pending_approvals: 'Bills awaiting approval',
  cost_spikes: 'Job cost jumps',
  lease_expirations: 'Leases ending soon',
};

export const DEFAULT_ORDER = Object.keys(BRIEFING_SECTION_LABELS) as BriefingSection[];

export interface BriefingPrefs {
  enabled: boolean;
  order: BriefingSection[];
  hidden: BriefingSection[];
  autoOpen: boolean;
  leaseWindowDays: number;
  reviewedOn: string | null;
}

const KEY = 'rbf-briefing-prefs';
export const DEFAULT_PREFS: BriefingPrefs = { enabled: true, order: DEFAULT_ORDER, hidden: [], autoOpen: true, leaseWindowDays: 60, reviewedOn: null };

export function normalizePrefs(raw: Partial<BriefingPrefs> | null | undefined): BriefingPrefs {
  const p = raw || {};
  const known = (p.order || []).filter((s): s is BriefingSection => s in BRIEFING_SECTION_LABELS);
  const order = [...new Set([...known, ...DEFAULT_ORDER])];
  const days = Number(p.leaseWindowDays);
  return {
    enabled: p.enabled !== false,
    order,
    hidden: (p.hidden || []).filter((s) => s in BRIEFING_SECTION_LABELS),
    autoOpen: p.autoOpen !== false,
    leaseWindowDays: Number.isFinite(days) && days >= 1 ? Math.min(365, Math.round(days)) : 60,
    reviewedOn: p.reviewedOn || null,
  };
}

export function loadBriefingPrefs(): BriefingPrefs {
  try { return normalizePrefs(JSON.parse(localStorage.getItem(KEY) || '{}')); } catch { return { ...DEFAULT_PREFS }; }
}
export const BRIEFING_PREFS_EVENT = 'rbf-briefing-prefs-changed';
export function saveBriefingPrefs(p: BriefingPrefs) {
  localStorage.setItem(KEY, JSON.stringify(p));
  try { window.dispatchEvent(new Event(BRIEFING_PREFS_EVENT)); } catch { /* non-browser */ }
}

/** Local (Eastern for the user) calendar day key. */
export function localDayKey(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function shouldAutoOpen(p: BriefingPrefs, today = new Date()) {
  return p.enabled && p.autoOpen && p.reviewedOn !== localDayKey(today);
}

export function moveSection(order: BriefingSection[], s: BriefingSection, dir: -1 | 1) {
  const i = order.indexOf(s); const j = i + dir;
  if (i < 0 || j < 0 || j >= order.length) return order;
  const next = [...order]; [next[i], next[j]] = [next[j], next[i]]; return next;
}
