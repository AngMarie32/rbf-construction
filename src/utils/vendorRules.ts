import type { Destination } from '@/utils/financialReportImport';

export interface VendorRule {
  key: string;
  vendorName: string;
  destination: Destination;
  projectId: string | null;
  costCodeId: string | null;
  updatedAt: string;
}

export interface VendorRuleLine {
  account: string;
  vendor: string;
  destination: Destination;
  projectId: string | null;
  costCodeId: string | null;
}

const STORAGE_KEY = 'rbf-report-vendor-rules-v1';
const scopeFor = (companyId?: string | null) => companyId || 'all-companies';

export function vendorRuleKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ');
}

function readAll(): Record<string, VendorRule[]> {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch {
    return {};
  }
}

function writeAll(value: Record<string, VendorRule[]>) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(value));
}

export function loadVendorRules(companyId?: string | null): VendorRule[] {
  return readAll()[scopeFor(companyId)] || [];
}

export function saveVendorRule(
  companyId: string | null | undefined,
  line: Pick<VendorRuleLine, 'account' | 'vendor' | 'destination' | 'projectId' | 'costCodeId'>
) {
  const vendorName = line.account.trim() || line.vendor.trim();
  if (!vendorName) return;
  const all = readAll();
  const scope = scopeFor(companyId);
  const rule: VendorRule = {
    key: vendorRuleKey(vendorName),
    vendorName,
    destination: line.destination,
    projectId: line.projectId,
    costCodeId: line.costCodeId,
    updatedAt: new Date().toISOString(),
  };
  all[scope] = [...(all[scope] || []).filter((item) => item.key !== rule.key), rule];
  writeAll(all);
}

export function deleteVendorRule(companyId: string | null | undefined, key: string) {
  const all = readAll();
  const scope = scopeFor(companyId);
  all[scope] = (all[scope] || []).filter((rule) => rule.key !== key);
  writeAll(all);
}

/** Saved line/account names take priority, with the report's vendor column as a fallback. */
export function applyVendorRules<T extends VendorRuleLine>(lines: T[], rules: VendorRule[]): T[] {
  const byKey = new Map(rules.map((rule) => [rule.key, rule]));
  return lines.map((line) => {
    const rule = byKey.get(vendorRuleKey(line.account)) || byKey.get(vendorRuleKey(line.vendor));
    return rule
      ? { ...line, destination: rule.destination, projectId: rule.projectId, costCodeId: rule.costCodeId }
      : line;
  });
}
