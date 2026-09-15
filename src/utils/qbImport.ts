import * as XLSX from 'xlsx';
import { CSI_COST_CODES } from '@/data/csiCostCodes';

export interface RawRow {
  [key: string]: any;
}

export interface ParsedLine {
  rowIndex: number;
  raw: RawRow;
  date: string | null;
  vendor: string;
  account: string;
  jobName: string;
  memo: string;
  refNumber: string;
  amount: number;
}

export interface MatchRule {
  match_type: 'vendor' | 'account' | 'job';
  match_value: string;
  project_id: string | null;
  cost_code_id: string | null;
  category: string | null;
}

export interface MatchTarget {
  projectId: string | null;
  costCodeId: string | null;
  category: string | null;
  confidence: number;
  reason: string;
}

export interface ProjectRef {
  id: string;
  name: string;
  project_code?: string | null;
  client?: string | null;
}

export interface CostCodeRef {
  id: string;
  code: string;
  name: string;
}

const HEADER_ALIASES: Record<keyof Omit<ParsedLine, 'rowIndex' | 'raw'>, string[]> = {
  date: ['date', 'txn date', 'transaction date', 'trans date', 'post date', 'bill date'],
  vendor: ['vendor', 'name', 'payee', 'source name', 'vendor name', 'supplier'],
  account: ['account', 'item', 'product/service', 'product service', 'expense account', 'service item', 'cost code', 'class', 'category', 'split'],
  jobName: ['customer:job', 'customer job', 'customer', 'job', 'project', 'customer:project', 'job name'],
  memo: ['memo', 'description', 'memo/description', 'notes'],
  refNumber: ['num', 'no.', 'ref', 'ref no', 'reference', 'invoice #', 'doc num', 'number'],
  amount: ['amount', 'total', 'cost', 'debit', 'actual cost', 'paid amount', 'open balance'],
};

export function normalize(value: any): string {
  return String(value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function parseAmount(value: any): number {
  if (typeof value === 'number') return value;
  const cleaned = String(value ?? '').replace(/[$,\s]/g, '');
  if (!cleaned) return 0;
  const negative = /^\(.*\)$/.test(cleaned);
  const n = parseFloat(cleaned.replace(/[()]/g, ''));
  if (Number.isNaN(n)) return 0;
  return negative ? -n : n;
}

function parseDate(value: any): string | null {
  if (value == null || value === '') return null;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'number') {
    const parsed = XLSX.SSF?.parse_date_code?.(value);
    if (parsed) {
      const d = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
      return d.toISOString().slice(0, 10);
    }
  }
  const d = new Date(String(value));
  if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10);
  return null;
}

/** Finds the row that looks like a header row, tolerating QuickBooks title/blank rows on top. */
function findHeaderRow(grid: any[][]): number {
  const wanted = Object.values(HEADER_ALIASES).flat();
  let best = 0;
  let bestScore = 0;
  for (let i = 0; i < Math.min(grid.length, 25); i++) {
    const cells = (grid[i] || []).map((c) => normalize(c)).filter(Boolean);
    if (cells.length < 2) continue;
    const score = cells.filter((c) => wanted.includes(c)).length;
    if (score > bestScore) {
      bestScore = score;
      best = i;
    }
  }
  return bestScore >= 2 ? best : 0;
}

function pick(row: RawRow, keys: string[]): any {
  for (const key of Object.keys(row)) {
    const nk = normalize(key);
    if (keys.includes(nk)) {
      const v = row[key];
      if (v !== '' && v != null) return v;
    }
  }
  // partial match fallback
  for (const key of Object.keys(row)) {
    const nk = normalize(key);
    if (keys.some((k) => nk.includes(k))) {
      const v = row[key];
      if (v !== '' && v != null) return v;
    }
  }
  return '';
}

export function parseWorkbook(data: ArrayBuffer): ParsedLine[] {
  const wb = XLSX.read(data, { type: 'array', cellDates: true });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const grid = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1, raw: true, defval: '' });
  const headerRow = findHeaderRow(grid);
  const headers = (grid[headerRow] || []).map((h, i) => String(h || `Column ${i + 1}`));

  const lines: ParsedLine[] = [];
  for (let i = headerRow + 1; i < grid.length; i++) {
    const cells = grid[i] || [];
    const raw: RawRow = {};
    headers.forEach((h, idx) => {
      raw[h] = cells[idx] ?? '';
    });
    const amount = parseAmount(pick(raw, HEADER_ALIASES.amount));
    const vendor = String(pick(raw, HEADER_ALIASES.vendor) || '').trim();
    const jobName = String(pick(raw, HEADER_ALIASES.jobName) || '').trim();
    const memo = String(pick(raw, HEADER_ALIASES.memo) || '').trim();
    const account = String(pick(raw, HEADER_ALIASES.account) || '').trim();
    if (!amount && !vendor && !jobName && !memo) continue; // blank / subtotal spacer
    const label = normalize(`${vendor} ${jobName} ${memo}`);
    if (label.startsWith('total') || label.includes('total for')) continue;
    lines.push({
      rowIndex: lines.length,
      raw,
      date: parseDate(pick(raw, HEADER_ALIASES.date)),
      vendor,
      account,
      jobName,
      memo,
      refNumber: String(pick(raw, HEADER_ALIASES.refNumber) || '').trim(),
      amount,
    });
  }
  return lines;
}

/** 0..1 token-overlap similarity. */
export function similarity(a: string, b: string): number {
  const na = normalize(a);
  const nb = normalize(b);
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.88;
  const ta = new Set(na.split(' ').filter((t) => t.length > 2));
  const tb = new Set(nb.split(' ').filter((t) => t.length > 2));
  if (!ta.size || !tb.size) return 0;
  let shared = 0;
  ta.forEach((t) => {
    if (tb.has(t)) shared++;
  });
  return shared / Math.max(ta.size, tb.size);
}

function matchProject(line: ParsedLine, projects: ProjectRef[]): { id: string | null; score: number; reason: string } {
  const candidates = [line.jobName, line.memo, line.raw['Customer'] as string].filter(Boolean) as string[];
  let best: { id: string | null; score: number; reason: string } = { id: null, score: 0, reason: '' };
  for (const project of projects) {
    for (const candidate of candidates) {
      const cand = candidate.split(':').pop() || candidate;
      if (project.project_code && normalize(candidate).includes(normalize(project.project_code))) {
        return { id: project.id, score: 1, reason: `Job code ${project.project_code}` };
      }
      const score = Math.max(similarity(cand, project.name), similarity(candidate, project.name));
      if (score > best.score) {
        best = { id: project.id, score, reason: score >= 0.99 ? 'Exact job name' : `Job name looks like "${project.name}"` };
      }
    }
  }
  return best.score >= 0.45 ? best : { id: null, score: 0, reason: 'No job match' };
}

function matchCostCode(line: ParsedLine, costCodes: CostCodeRef[]): { id: string | null; score: number; reason: string } {
  const haystack = normalize(`${line.account} ${line.memo} ${line.vendor}`);
  let best: { id: string | null; score: number; reason: string } = { id: null, score: 0, reason: '' };
  for (const cc of costCodes) {
    if (line.account && normalize(line.account).includes(normalize(cc.code))) {
      return { id: cc.id, score: 1, reason: `Account contains ${cc.code}` };
    }
    const seed = CSI_COST_CODES.find((s) => s.code === cc.code);
    const words = [cc.name.toLowerCase(), ...(seed?.keywords || [])];
    for (const word of words) {
      if (word && haystack.includes(normalize(word))) {
        const score = 0.6 + Math.min(word.length / 40, 0.3);
        if (score > best.score) best = { id: cc.id, score, reason: `Matched "${word}"` };
      }
    }
  }
  return best;
}

export function matchLine(
  line: ParsedLine,
  projects: ProjectRef[],
  costCodes: CostCodeRef[],
  rules: MatchRule[]
): MatchTarget {
  // 1. Saved rules win
  const ruleFor = (type: MatchRule['match_type'], value: string) =>
    rules.find((r) => r.match_type === type && normalize(r.match_value) === normalize(value) && value);

  const jobRule = ruleFor('job', line.jobName);
  const vendorRule = ruleFor('vendor', line.vendor);
  const accountRule = ruleFor('account', line.account);
  const rule = jobRule || vendorRule || accountRule;

  if (rule && (rule.project_id || rule.cost_code_id)) {
    const fallbackCode = matchCostCode(line, costCodes);
    return {
      projectId: rule.project_id ?? matchProject(line, projects).id,
      costCodeId: rule.cost_code_id ?? fallbackCode.id,
      category: rule.category,
      confidence: 0.99,
      reason: 'Saved rule from a previous import',
    };
  }

  const project = matchProject(line, projects);
  const costCode = matchCostCode(line, costCodes);
  const confidence = Math.min(project.score * 0.7 + costCode.score * 0.3, 0.98);

  return {
    projectId: project.id,
    costCodeId: costCode.id,
    category: null,
    confidence: project.id ? confidence : 0,
    reason: [project.reason, costCode.reason].filter(Boolean).join(' · '),
  };
}

export function externalRef(line: ParsedLine): string {
  return [
    normalize(line.vendor),
    line.date || '',
    line.amount.toFixed(2),
    normalize(line.refNumber),
  ].join('|');
}

export function confidenceLabel(confidence: number): 'high' | 'medium' | 'low' {
  if (confidence >= 0.8) return 'high';
  if (confidence >= 0.5) return 'medium';
  return 'low';
}
