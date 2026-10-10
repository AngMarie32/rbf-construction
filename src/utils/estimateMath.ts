export interface EstimateSettings {
  contingency_pct: number;
  overhead_pct: number;
  profit_pct: number;
  bond_pct: number;
}

export interface EstimateLine {
  id: string;
  group_key: string;
  group_name: string;
  section_name: string;
  name: string;
  baseline_amount: number;
  override_amount: number | null;
  quantity: number | null;
  unit: string | null;
  unit_cost: number | null;
  confidence: string;
  status: string;
  basis: string | null;
  source: string | null;
  sort_order: number;
}

export const GROUP_ORDER = ['building', 'site', 'building_gc', 'site_gc', 'other'] as const;

export const GROUP_LABELS: Record<string, string> = {
  building: 'BUILDING DIRECT COST',
  site: 'SITE / CIVIL DIRECT COST',
  building_gc: 'BUILDING GENERAL CONDITIONS',
  site_gc: 'SITE GENERAL CONDITIONS',
  other: 'OTHER PROJECT COSTS',
};

/** Live amount for a line — the override when the estimator set one, otherwise the baseline. */
export const lineAmount = (l: Pick<EstimateLine, 'baseline_amount' | 'override_amount'>) =>
  l.override_amount != null ? Number(l.override_amount) : Number(l.baseline_amount);

export const sumGroup = (lines: EstimateLine[], key: string) =>
  lines.filter((l) => l.group_key === key).reduce((s, l) => s + lineAmount(l), 0);

export const sumBaselineGroup = (lines: EstimateLine[], key: string) =>
  lines.filter((l) => l.group_key === key).reduce((s, l) => s + Number(l.baseline_amount), 0);

export interface EstimateRollup {
  building: number;
  site: number;
  buildingGc: number;
  siteGc: number;
  other: number;
  directConstruction: number;
  totalGc: number;
  contingency: number;
  expectedCost: number;
  overhead: number;
  profit: number;
  bond: number;
  recommendedBid: number;
  bidPerSf: number;
  low: number;
  high: number;
}

/**
 * Rolls cost lines up through contingency, overhead, profit and bond to a recommended bid.
 * Contingency covers project uncertainty, overhead is corporate operating cost and profit is
 * intended earnings — they are never blended together.
 */
export function rollup(lines: EstimateLine[], settings: EstimateSettings, areaSf: number): EstimateRollup {
  const building = sumGroup(lines, 'building');
  const site = sumGroup(lines, 'site');
  const buildingGc = sumGroup(lines, 'building_gc');
  const siteGc = sumGroup(lines, 'site_gc');
  const other = sumGroup(lines, 'other');

  const directConstruction = building + site;
  const totalGc = buildingGc + siteGc;
  const preContingency = directConstruction + totalGc + other;
  const contingency = preContingency * (settings.contingency_pct / 100);
  const expectedCost = preContingency + contingency;
  const overhead = expectedCost * (settings.overhead_pct / 100);
  const profit = (expectedCost + overhead) * (settings.profit_pct / 100);
  const preBond = expectedCost + overhead + profit;
  const bond = preBond * (settings.bond_pct / 100);
  const recommendedBid = preBond + bond;

  return {
    building,
    site,
    buildingGc,
    siteGc,
    other,
    directConstruction,
    totalGc,
    contingency,
    expectedCost,
    overhead,
    profit,
    bond,
    recommendedBid,
    bidPerSf: areaSf > 0 ? recommendedBid / areaSf : 0,
    low: recommendedBid * 0.94,
    high: recommendedBid * 1.09,
  };
}

export const CONFIDENCE_NOTE: Record<string, string> = {
  A: 'Verified quantity, strong current pricing',
  B: 'Good quantity, reasonable current pricing',
  C: 'Projected quantity and/or benchmark pricing',
  D: 'Significant unresolved scope or quantity',
  REVIEW: 'Needs additional project information',
};

export const currency = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export const currency2 = (n: number) =>
  n.toLocaleString('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2, maximumFractionDigits: 2 });

export interface LevelableBid {
  raw_amount: number;
  leveling_additions: number;
  leveling_credits: number;
}

/** Raw bid + leveling additions - leveling credits. The submitted amount itself is never altered. */
export const leveledBid = (b: LevelableBid) =>
  Number(b.raw_amount) + Number(b.leveling_additions) - Number(b.leveling_credits);

export function estimateCsv(lines: EstimateLine[]): string {
  const head = ['Group', 'Section', 'Cost line', 'Quantity', 'Unit', 'Unit cost', 'Baseline', 'Current', 'Confidence', 'Status', 'Basis', 'Source'];
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const rows = lines.map((l) =>
    [
      l.group_name,
      l.section_name,
      l.name,
      l.quantity ?? '',
      l.unit ?? '',
      l.unit_cost ?? '',
      l.baseline_amount,
      lineAmount(l),
      l.confidence,
      l.status,
      l.basis ?? '',
      l.source ?? '',
    ]
      .map(esc)
      .join(',')
  );
  return [head.map(esc).join(','), ...rows].join('\n');
}
