import * as XLSX from 'xlsx';
import { localDateISO } from '@/utils/dates';
import {
  CostCodeRef,
  ProjectRef,
  matchCostCodeText,
  matchProjectName,
  normalize,
  parseWorkbook,
} from '@/utils/qbImport';

export type Destination = 'project_cost' | 'labor' | 'operating' | 'revenue' | 'skip';
export type ReportKind = 'pl' | 'pl_by_job' | 'job_summary' | 'detail';
type Section = 'income' | 'cogs' | 'expense' | 'other_income' | 'other_expense' | 'unknown';

export interface ReportLine {
  key: string;
  account: string;
  section: Section;
  job: string;
  amount: number;
  date: string | null;
  vendor: string;
  memo: string;
  destination: Destination;
  projectId: string | null;
  costCodeId: string | null;
  reason: string;
}

export interface ParsedReport {
  kind: ReportKind;
  title: string;
  periodStart: string;
  periodEnd: string;
  lines: ReportLine[];
}

export const KIND_LABEL: Record<ReportKind, string> = {
  pl: 'Profit & Loss',
  pl_by_job: 'Profit & Loss by Job',
  job_summary: 'Job Profitability / Estimates vs. Actuals',
  detail: 'Job cost detail (transactions)',
};

export const DEST_LABEL: Record<Destination, string> = {
  project_cost: 'Project cost',
  labor: 'Labor cost',
  operating: 'Operating cost',
  revenue: 'Revenue / billing',
  skip: 'Skip',
};

const LABOR = /labor|labour|payroll|wage|salar|crew/i;
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];

function toNumber(v: any): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null;
  const s = String(v ?? '').replace(/[$,\s]/g, '');
  if (!s || !/^\(?-?\d*\.?\d+\)?$/.test(s)) return null;
  const n = parseFloat(s.replace(/[()]/g, ''));
  return /^\(.*\)$/.test(s) ? -n : n;
}

function sectionOf(label: string): Section | null {
  const n = normalize(label).replace(/^\d+\s*/, '');
  if (/^ordinary income expense$/.test(n)) return null;
  if (/^other income$/.test(n)) return 'other_income';
  if (/^other expenses?$/.test(n)) return 'other_expense';
  if (/^(income|revenue|sales)$/.test(n)) return 'income';
  if (/^(cost of goods sold|cogs|cost of sales|job costs?|direct costs?)$/.test(n)) return 'cogs';
  if (/^(expenses?|operating expenses|overhead)$/.test(n)) return 'expense';
  return null;
}

function isTotal(label: string) {
  const n = normalize(label);
  return /^total\b/.test(n) || /^(gross profit|net income|net ordinary income|net other income|net profit)/.test(n);
}

function cleanAccount(label: string) {
  // "5100 · Materials" -> keep the readable part but leave the number for cost-code matching
  return label.replace(/\s*·\s*/g, ' · ').trim();
}

/** Guess where a line belongs from its P&L section and name. */
export function guessDestination(section: Section, account: string, hasJob: boolean): Destination {
  if (section === 'income' || section === 'other_income') return 'revenue';
  if (section === 'cogs') return LABOR.test(account) ? 'labor' : 'project_cost';
  if (section === 'expense' || section === 'other_expense') {
    if (hasJob) return LABOR.test(account) ? 'labor' : 'project_cost';
    return 'operating';
  }
  const a = account.toLowerCase();
  if (/income|revenue|sales|contract|progress bill/.test(a)) return 'revenue';
  if (/rent|insurance|office|utilit|phone|software|accounting|legal|advertis|bank|interest|depreciation|dues|license/.test(a))
    return 'operating';
  if (LABOR.test(a)) return 'labor';
  return hasJob ? 'project_cost' : 'operating';
}

function monthIdx(s: string) {
  return MONTHS.indexOf(s.slice(0, 3).toLowerCase());
}

function fullYear(y: string) {
  const n = parseInt(y, 10);
  return n < 100 ? 2000 + n : n;
}

/** Read the report period from QuickBooks title rows / column headers. */
function findPeriod(texts: string[]): { start: string; end: string } | null {
  const joined = texts.join(' | ');
  // "January 1 through October 6, 2026"  /  "January 2026 through October 2026"
  let m = joined.match(/([A-Za-z]{3,9})\s+(\d{1,2})?,?\s*(\d{4})?\s+through\s+([A-Za-z]{3,9})\s+(\d{1,2})?,?\s*(\d{2,4})/i);
  if (m && monthIdx(m[1]) >= 0 && monthIdx(m[4]) >= 0) {
    const endY = fullYear(m[6]);
    const startY = m[3] ? fullYear(m[3]) : endY;
    const start = new Date(startY, monthIdx(m[1]), m[2] ? parseInt(m[2]) : 1);
    const end = m[5]
      ? new Date(endY, monthIdx(m[4]), parseInt(m[5]))
      : new Date(endY, monthIdx(m[4]) + 1, 0);
    return { start: localDateISO(start), end: localDateISO(end) };
  }
  // "Oct 1 - 31, 26"
  m = joined.match(/([A-Za-z]{3,9})\s+(\d{1,2})\s*-\s*(\d{1,2}),?\s*(\d{2,4})/);
  if (m && monthIdx(m[1]) >= 0) {
    const y = fullYear(m[4]);
    return {
      start: localDateISO(new Date(y, monthIdx(m[1]), parseInt(m[2]))),
      end: localDateISO(new Date(y, monthIdx(m[1]), parseInt(m[3]))),
    };
  }
  // "As of October 6, 2026" or "October 2026"
  m = joined.match(/([A-Za-z]{3,9})\s+(\d{1,2},\s*)?(\d{4})/);
  if (m && monthIdx(m[1]) >= 0) {
    const y = parseInt(m[3]);
    return {
      start: localDateISO(new Date(y, monthIdx(m[1]), 1)),
      end: localDateISO(new Date(y, monthIdx(m[1]) + 1, 0)),
    };
  }
  return null;
}

function bestGrid(wb: XLSX.WorkBook): any[][] {
  let best: any[][] = [];
  let bestNums = -1;
  for (const name of wb.SheetNames) {
    const g = XLSX.utils.sheet_to_json<any[]>(wb.Sheets[name], { header: 1, raw: true, defval: '' });
    const nums = g.reduce((s, r) => s + (r || []).filter((c) => typeof c === 'number').length, 0);
    if (nums > bestNums) {
      bestNums = nums;
      best = g;
    }
  }
  return best;
}

function isDetailReport(grid: any[][]) {
  for (let i = 0; i < Math.min(grid.length, 25); i++) {
    const cells = (grid[i] || []).map((c) => normalize(c));
    const hits = ['type', 'date', 'num', 'name', 'memo', 'amount', 'debit', 'split'].filter((h) => cells.includes(h));
    if (hits.length >= 3) return true;
  }
  return false;
}

export function parseFinancialReport(
  data: ArrayBuffer,
  projects: ProjectRef[],
  costCodes: CostCodeRef[]
): ParsedReport {
  const wb = XLSX.read(data, { type: 'array', cellDates: true });
  const grid = bestGrid(wb);
  const topText = grid
    .slice(0, 8)
    .flat()
    .filter((c) => typeof c === 'string' && c.trim())
    .map((c) => String(c).trim());
  const title = topText.find((t) => /profit|loss|job|estimate|income/i.test(t)) || topText[0] || 'Financial report';

  const withMatches = (l: Omit<ReportLine, 'projectId' | 'costCodeId' | 'reason' | 'destination'> & { destination?: Destination }): ReportLine => {
    const destination = l.destination ?? guessDestination(l.section, l.account, Boolean(l.job));
    const proj = l.job ? matchProjectName(l.job, projects) : { id: null, score: 0, reason: '' };
    const code =
      destination === 'project_cost' || destination === 'labor'
        ? matchCostCodeText(`${l.account} ${l.memo} ${l.vendor}`, l.account, costCodes)
        : { id: null, score: 0, reason: '' };
    return {
      ...l,
      destination,
      projectId: proj.id,
      costCodeId: code.id,
      reason: [proj.id ? proj.reason : l.job ? 'No matching project' : '', code.reason].filter(Boolean).join(' · '),
    };
  };

  // ----- Transaction-level job cost detail -----
  if (isDetailReport(grid)) {
    const parsed = parseWorkbook(data);
    const period = findPeriod(topText);
    const dates = parsed.map((p) => p.date).filter(Boolean).sort() as string[];
    let section: Section = 'unknown';
    const lines = parsed.map((p, i) => {
      const s = sectionOf(p.account);
      if (s) section = s;
      return withMatches({
        key: `d${i}`,
        account: p.account || 'Uncategorized',
        section: s ?? (p.account ? 'unknown' : section),
        job: p.jobName,
        amount: p.amount,
        date: p.date,
        vendor: p.vendor,
        memo: p.memo,
      });
    });
    return {
      kind: 'detail',
      title,
      periodStart: period?.start || dates[0] || localDateISO(),
      periodEnd: period?.end || dates[dates.length - 1] || localDateISO(),
      lines,
    };
  }

  // ----- Summary reports (QuickBooks Desktop indented layout) -----
  const width = Math.max(...grid.map((r) => (r || []).length), 0);
  const numericCols = new Set<number>();
  for (let c = 0; c < width; c++) {
    const nums = grid.filter((r) => typeof r?.[c] === 'number').length;
    if (nums >= 2) numericCols.add(c);
  }
  // header row = last row before data where numeric columns hold text
  let headerRow = -1;
  for (let i = 0; i < Math.min(grid.length, 30); i++) {
    const row = grid[i] || [];
    const texts = [...numericCols].filter((c) => typeof row[c] === 'string' && row[c].trim()).length;
    if (texts >= Math.max(1, Math.ceil(numericCols.size / 2))) headerRow = i;
    if ([...numericCols].some((c) => typeof row[c] === 'number')) break;
  }
  const headers: Record<number, string> = {};
  numericCols.forEach((c) => {
    headers[c] = headerRow >= 0 ? String(grid[headerRow][c] ?? '').trim() : '';
  });
  const labelCols = Array.from({ length: width }, (_, c) => c).filter((c) => !numericCols.has(c));
  const period = findPeriod([...topText, ...Object.values(headers)]) || {
    start: localDateISO(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
    end: localDateISO(),
  };

  const hn = Object.fromEntries(Object.entries(headers).map(([c, h]) => [c, normalize(h)]));
  const colWhere = (re: RegExp) => Number(Object.keys(hn).find((c) => re.test(hn[Number(c)])) ?? -1);
  const actCost = colWhere(/^act\w* cost|^actual cost|^cost$/);
  const actRev = colWhere(/^act\w* rev|^actual rev|^revenue$/);

  const rowLabel = (row: any[]) => {
    for (const c of labelCols) {
      const v = row[c];
      if (typeof v === 'string' && v.trim()) return v.trim();
    }
    return '';
  };

  const lines: ReportLine[] = [];

  if (actCost >= 0 || actRev >= 0) {
    // Job Profitability Summary / Job Estimates vs Actuals: one row per job
    grid.slice(headerRow + 1).forEach((row, i) => {
      const label = rowLabel(row || []);
      if (!label || isTotal(label)) return;
      const cost = actCost >= 0 ? toNumber(row[actCost]) : null;
      const rev = actRev >= 0 ? toNumber(row[actRev]) : null;
      if (cost) lines.push(withMatches({ key: `c${i}`, account: 'Job costs', section: 'cogs', job: label, amount: cost, date: period.end, vendor: '', memo: '', destination: 'project_cost' }));
      if (rev) lines.push(withMatches({ key: `r${i}`, account: 'Job revenue', section: 'income', job: label, amount: rev, date: period.end, vendor: '', memo: '', destination: 'revenue' }));
    });
    return { kind: 'job_summary', title, periodStart: period.start, periodEnd: period.end, lines };
  }

  const skipHeader = (h: string) => /^total|%|percent|^\s*$/.test(normalize(h)) || /% of/i.test(h);
  const valueCols = [...numericCols].filter((c) => !skipHeader(headers[c]));
  const looksLikeDate = (h: string) => monthIdx(h) >= 0 && /\d/.test(h);
  const jobCols = valueCols.filter((c) => !looksLikeDate(headers[c]));
  const byJob = jobCols.length >= 1 && valueCols.length >= 2 && jobCols.length === valueCols.length;

  // single-column P&L: use the TOTAL column when present, else the first value column
  const totalCol = [...numericCols].find((c) => /^total$/.test(normalize(headers[c])));
  const amountCols = byJob ? jobCols : [valueCols.length === 1 ? valueCols[0] : totalCol ?? valueCols[0]].filter((c) => c != null);

  let section: Section = 'unknown';
  grid.slice(headerRow + 1).forEach((row, i) => {
    const label = rowLabel(row || []);
    if (!label) return;
    const s = sectionOf(label);
    if (s) {
      section = s;
      return;
    }
    if (isTotal(label)) return;
    amountCols.forEach((c) => {
      const amt = toNumber(row[c]);
      if (!amt) return;
      const rawJob = byJob ? headers[c] : '';
      const job = /no customer|unassigned|not specified|^other$/i.test(rawJob) ? '' : rawJob;
      // Expense sections report cost as positive; a negative is a credit.
      lines.push(
        withMatches({
          key: `${i}-${c}`,
          account: cleanAccount(label),
          section,
          job,
          amount: amt,
          date: period.end,
          vendor: '',
          memo: '',
        })
      );
    });
  });

  return { kind: byJob ? 'pl_by_job' : 'pl', title, periodStart: period.start, periodEnd: period.end, lines };
}

/** Pick the overhead frequency that best matches the report period so Operating Costs spreads it correctly. */
export function overheadForPeriod(amount: number, start: string, end: string) {
  const days = Math.max(1, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 86400000) + 1);
  if (days >= 28 && days <= 31) return { amount, frequency: 'monthly' as const };
  if (days >= 89 && days <= 92) return { amount, frequency: 'quarterly' as const };
  if (days >= 365 && days <= 366) return { amount, frequency: 'yearly' as const };
  if (days === 7) return { amount, frequency: 'weekly' as const };
  return { amount: amount / days, frequency: 'daily' as const };
}

/**
 * Stable identity for a report line, independent of the report's period and amount,
 * so re-uploading an overlapping period (e.g. March then May) matches the same line
 * and updates it instead of duplicating. Summary lines use the period end as their
 * date, which changes between reports, so that date is excluded; detail lines keep
 * their real transaction date.
 */
export function reportRef(l: ReportLine, start: string, end: string) {
  const d = l.date && l.date !== end ? l.date : '';
  return ['rpt', l.destination, normalize(l.account), normalize(l.job), normalize(l.vendor), d].join('|');
}
