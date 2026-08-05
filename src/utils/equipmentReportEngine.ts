// Repair classification + weighted fleet cost analytics engine.

export interface RepairRecord {
  id: string;
  equipment_id: string;
  date: string;
  description: string | null;
  cost: number | null;
  next_due?: string | null;
}

export type RepairTypeKey =
  | 'preventive'
  | 'wear'
  | 'tires_tracks'
  | 'hydraulics'
  | 'engine'
  | 'drivetrain'
  | 'electrical'
  | 'body'
  | 'inspection'
  | 'other';

export interface RepairTypeDef {
  key: RepairTypeKey;
  label: string;
  /** How much this cost signals end-of-life risk. 0 = routine, 1 = terminal. */
  severity: number;
  /** Portion of the cost treated as recurring operating expense (rest is one-off). */
  recurring: number;
  /** Typical months between events for a healthy unit (used for cadence checks). */
  cadenceMonths: number;
  keywords: string[];
}

export const REPAIR_TYPES: RepairTypeDef[] = [
  {
    key: 'preventive',
    label: 'Preventive maintenance',
    severity: 0.05,
    recurring: 1,
    cadenceMonths: 3,
    keywords: ['pm ', 'preventive', 'preventative', 'service', 'oil change', 'oil', 'lube', 'grease', 'filter', 'fluid', 'coolant', 'scheduled'],
  },
  {
    key: 'wear',
    label: 'Wear items',
    severity: 0.2,
    recurring: 0.9,
    cadenceMonths: 6,
    keywords: ['brake', 'belt', 'blade', 'cutting edge', 'bucket teeth', 'teeth', 'pad', 'bushing', 'pin', 'seal', 'hose', 'wear'],
  },
  {
    key: 'tires_tracks',
    label: 'Tires & tracks',
    severity: 0.3,
    recurring: 0.7,
    cadenceMonths: 18,
    keywords: ['tire', 'tyre', 'track', 'undercarriage', 'sprocket', 'roller', 'idler', 'wheel'],
  },
  {
    key: 'hydraulics',
    label: 'Hydraulics',
    severity: 0.65,
    recurring: 0.4,
    cadenceMonths: 24,
    keywords: ['hydraulic', 'cylinder', 'pump', 'valve', 'ram', 'boom leak'],
  },
  {
    key: 'engine',
    label: 'Engine / major',
    severity: 1,
    recurring: 0.15,
    cadenceMonths: 60,
    keywords: ['engine', 'motor', 'rebuild', 'overhaul', 'head gasket', 'turbo', 'injector', 'block', 'piston', 'radiator'],
  },
  {
    key: 'drivetrain',
    label: 'Drivetrain',
    severity: 0.8,
    recurring: 0.2,
    cadenceMonths: 48,
    keywords: ['transmission', 'trans ', 'differential', 'axle', 'clutch', 'driveshaft', 'gearbox', 'final drive'],
  },
  {
    key: 'electrical',
    label: 'Electrical',
    severity: 0.4,
    recurring: 0.5,
    cadenceMonths: 18,
    keywords: ['electrical', 'battery', 'alternator', 'starter', 'wiring', 'harness', 'sensor', 'ecu', 'light'],
  },
  {
    key: 'body',
    label: 'Body & cosmetic',
    severity: 0.1,
    recurring: 0.3,
    cadenceMonths: 36,
    keywords: ['paint', 'body', 'glass', 'window', 'mirror', 'seat', 'cab', 'decal', 'dent'],
  },
  {
    key: 'inspection',
    label: 'Inspection & compliance',
    severity: 0.05,
    recurring: 1,
    cadenceMonths: 12,
    keywords: ['inspection', 'dot', 'certification', 'annual', 'compliance', 'registration', 'emission'],
  },
  {
    key: 'other',
    label: 'Uncategorized',
    severity: 0.35,
    recurring: 0.6,
    cadenceMonths: 24,
    keywords: [],
  },
];

export const TYPE_MAP: Record<RepairTypeKey, RepairTypeDef> = REPAIR_TYPES.reduce(
  (acc, t) => ({ ...acc, [t.key]: t }),
  {} as Record<RepairTypeKey, RepairTypeDef>
);

export function classifyRepair(description: string | null | undefined): RepairTypeKey {
  const text = ` ${(description || '').toLowerCase()} `;
  let best: { key: RepairTypeKey; score: number } = { key: 'other', score: 0 };
  for (const type of REPAIR_TYPES) {
    for (const kw of type.keywords) {
      if (text.includes(kw)) {
        // Longer keyword match wins - more specific.
        const score = kw.length + type.severity;
        if (score > best.score) best = { key: type.key, score };
      }
    }
  }
  return best.key;
}

export interface ReportOptions {
  /** Repair type keys included in the calculations. */
  includedTypes: RepairTypeKey[];
  /** Individual maintenance log ids excluded by the user. */
  excludedRepairIds: string[];
  /** Use logged hours for $/hour + utilization math. */
  useHours: boolean;
  /** Apply straight-line depreciation to book value before ratios. */
  useDepreciation: boolean;
  /** Weight costs by repair severity when scoring health. */
  useSeverityWeighting: boolean;
  /** Ignore one-off outliers above this multiple of the unit's median repair. 0 = off. */
  outlierMultiple: number;
  /** Months of history in scope. 0 = all time. */
  months: number;
  /** Annual operating hours assumption when a unit has no logged hours. */
  assumedAnnualHours: number;
  /** Replace-watch threshold: lifetime severity-weighted repairs as % of value. */
  replaceThreshold: number;
}

export const DEFAULT_OPTIONS: ReportOptions = {
  includedTypes: REPAIR_TYPES.map((t) => t.key),
  excludedRepairIds: [],
  useHours: true,
  useDepreciation: true,
  useSeverityWeighting: true,
  outlierMultiple: 0,
  months: 12,
  assumedAnnualHours: 1200,
  replaceThreshold: 50,
};

export interface UnitAnalysis {
  id: string;
  name: string;
  category: string;
  year?: number;
  bookValue: number;
  adjustedValue: number;
  ageYears: number;
  hours: number;
  effectiveHours: number;
  events: number;
  periodSpend: number;
  lifetimeSpend: number;
  weightedSpend: number;
  ratio: number;
  costPerHour: number;
  annualRunRate: number;
  trendPct: number;
  majorShare: number;
  byType: Record<RepairTypeKey, number>;
  healthScore: number;
  verdict: 'Healthy' | 'Monitor' | 'Repair watch' | 'Replace';
  drivers: string[];
  residualValue: number;
}

const monthsBetween = (a: Date, b: Date) =>
  Math.max(
    0.5,
    (b.getFullYear() - a.getFullYear()) * 12 + (b.getMonth() - a.getMonth()) + 1
  );

const median = (nums: number[]) => {
  if (!nums.length) return 0;
  const s = [...nums].sort((x, y) => x - y);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
};

export interface EquipmentLike {
  id: string;
  name: string;
  category: string;
  year?: number;
  value?: number;
  purchase_date?: string;
  depreciation_rate?: number;
  total_hours_used?: number;
  status?: string;
}

export function filterRepairs(
  repairs: RepairRecord[],
  options: ReportOptions
): RepairRecord[] {
  const cutoff = options.months
    ? (() => {
        const d = new Date();
        d.setMonth(d.getMonth() - options.months);
        return d;
      })()
    : null;
  const included = new Set(options.includedTypes);
  const excluded = new Set(options.excludedRepairIds);

  let list = repairs.filter((r) => {
    if (excluded.has(r.id)) return false;
    if (!included.has(classifyRepair(r.description))) return false;
    if (cutoff && new Date(r.date) < cutoff) return false;
    return true;
  });

  if (options.outlierMultiple > 0) {
    const byUnit = new Map<string, number[]>();
    list.forEach((r) => {
      const arr = byUnit.get(r.equipment_id) || [];
      arr.push(Number(r.cost || 0));
      byUnit.set(r.equipment_id, arr);
    });
    list = list.filter((r) => {
      const med = median(byUnit.get(r.equipment_id) || []);
      if (med <= 0) return true;
      return Number(r.cost || 0) <= med * options.outlierMultiple;
    });
  }

  return list;
}

export function analyzeUnit(
  eq: EquipmentLike,
  allRepairs: RepairRecord[],
  scopedRepairs: RepairRecord[],
  options: ReportOptions
): UnitAnalysis {
  const now = new Date();
  const lifetimeLogs = allRepairs.filter((r) => r.equipment_id === eq.id);
  const logs = scopedRepairs.filter((r) => r.equipment_id === eq.id);

  const bookValue = Number(eq.value || 0);
  const ageYears = eq.purchase_date
    ? Math.max(0, (now.getTime() - new Date(eq.purchase_date).getTime()) / 31557600000)
    : eq.year
    ? Math.max(0, now.getFullYear() - eq.year)
    : 0;

  const depRate = Number(eq.depreciation_rate || 0);
  const adjustedValue =
    options.useDepreciation && depRate > 0 && ageYears > 0
      ? Math.max(bookValue * 0.15, bookValue - bookValue * (depRate / 100) * ageYears)
      : bookValue;

  const hours = Number(eq.total_hours_used || 0);
  const effectiveHours =
    options.useHours && hours > 0
      ? hours
      : Math.max(1, (ageYears || 1) * options.assumedAnnualHours);

  const byType = REPAIR_TYPES.reduce(
    (acc, t) => ({ ...acc, [t.key]: 0 }),
    {} as Record<RepairTypeKey, number>
  );

  let weightedSpend = 0;
  let recurringSpend = 0;
  let majorSpend = 0;

  const lifetimeScoped = lifetimeLogs.filter(
    (r) =>
      !options.excludedRepairIds.includes(r.id) &&
      options.includedTypes.includes(classifyRepair(r.description))
  );

  lifetimeScoped.forEach((r) => {
    const type = TYPE_MAP[classifyRepair(r.description)];
    const cost = Number(r.cost || 0);
    byType[type.key] += cost;
    weightedSpend += options.useSeverityWeighting ? cost * (0.5 + type.severity) : cost;
    recurringSpend += cost * type.recurring;
    if (type.severity >= 0.6) majorSpend += cost;
  });

  const periodSpend = logs.reduce((s, r) => s + Number(r.cost || 0), 0);
  const lifetimeSpend = lifetimeScoped.reduce((s, r) => s + Number(r.cost || 0), 0);

  const firstDate = lifetimeScoped.length
    ? new Date(
        lifetimeScoped.reduce((min, r) => (r.date < min ? r.date : min), lifetimeScoped[0].date)
      )
    : now;
  const span = monthsBetween(firstDate, now);
  const annualRunRate = (recurringSpend / span) * 12;

  // Trend: last half of the scoped window vs first half.
  const windowMonths = options.months || Math.max(12, span);
  const mid = new Date();
  mid.setMonth(mid.getMonth() - windowMonths / 2);
  const recent = logs
    .filter((r) => new Date(r.date) >= mid)
    .reduce((s, r) => s + Number(r.cost || 0), 0);
  const prior = logs
    .filter((r) => new Date(r.date) < mid)
    .reduce((s, r) => s + Number(r.cost || 0), 0);
  const trendPct = prior > 0 ? ((recent - prior) / prior) * 100 : recent > 0 ? 100 : 0;

  const valueBase = adjustedValue > 0 ? adjustedValue : bookValue;
  const ratio = valueBase > 0 ? (weightedSpend / valueBase) * 100 : 0;
  const costPerHour = effectiveHours > 0 ? lifetimeSpend / effectiveHours : 0;
  const majorShare = lifetimeSpend > 0 ? (majorSpend / lifetimeSpend) * 100 : 0;

  // Health score: 100 = pristine.
  let score = 100;
  const drivers: string[] = [];
  const ratioHit = Math.min(45, (ratio / options.replaceThreshold) * 45);
  if (ratioHit > 1) {
    score -= ratioHit;
    drivers.push(`Weighted repairs at ${ratio.toFixed(2)}% of value`);
  }
  if (majorShare > 25) {
    const hit = Math.min(25, (majorShare - 25) * 0.5);
    score -= hit;
    drivers.push(`${majorShare.toFixed(2)}% of spend is engine/drivetrain/hydraulic`);
  }
  if (trendPct > 25) {
    const hit = Math.min(15, trendPct / 10);
    score -= hit;
    drivers.push(`Repair spend trending up ${trendPct.toFixed(2)}%`);
  }
  if (ageYears > 10) {
    score -= Math.min(10, (ageYears - 10) * 1.5);
    drivers.push(`${ageYears.toFixed(2)} years old`);
  }
  if (options.useHours && hours > 8000) {
    score -= Math.min(10, (hours - 8000) / 800);
    drivers.push(`${hours.toLocaleString()} logged hours`);
  }
  score = Math.max(0, Math.min(100, score));

  const verdict: UnitAnalysis['verdict'] =
    score >= 80 ? 'Healthy' : score >= 60 ? 'Monitor' : score >= 40 ? 'Repair watch' : 'Replace';

  const residualValue = Math.max(0, valueBase - majorSpend * 0.35);

  return {
    id: eq.id,
    name: eq.name,
    category: eq.category,
    year: eq.year,
    bookValue,
    adjustedValue: valueBase,
    ageYears,
    hours,
    effectiveHours,
    events: logs.length,
    periodSpend,
    lifetimeSpend,
    weightedSpend,
    ratio,
    costPerHour,
    annualRunRate,
    trendPct,
    majorShare,
    byType,
    healthScore: score,
    verdict,
    drivers,
    residualValue,
  };
}

export function buildReport(
  equipment: EquipmentLike[],
  repairs: RepairRecord[],
  options: ReportOptions
) {
  const scoped = filterRepairs(repairs, options);
  const units = equipment
    .map((eq) => analyzeUnit(eq, repairs, scoped, options))
    .sort((a, b) => a.healthScore - b.healthScore);

  const periodSpend = units.reduce((s, u) => s + u.periodSpend, 0);
  const lifetimeSpend = units.reduce((s, u) => s + u.lifetimeSpend, 0);
  const fleetValue = units.reduce((s, u) => s + u.adjustedValue, 0);
  const totalHours = units.reduce((s, u) => s + u.effectiveHours, 0);
  const runRate = units.reduce((s, u) => s + u.annualRunRate, 0);

  const typeTotals = REPAIR_TYPES.map((t) => ({
    key: t.key,
    label: t.label,
    total: units.reduce((s, u) => s + u.byType[t.key], 0),
  }))
    .filter((t) => t.total > 0)
    .sort((a, b) => b.total - a.total);

  const monthly = new Map<string, { month: string; cost: number; events: number }>();
  scoped.forEach((r) => {
    const d = new Date(r.date);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const entry = monthly.get(key) || { month: key, cost: 0, events: 0 };
    entry.cost += Number(r.cost || 0);
    entry.events += 1;
    monthly.set(key, entry);
  });

  return {
    scoped,
    units,
    typeTotals,
    monthly: Array.from(monthly.values()).sort((a, b) => a.month.localeCompare(b.month)),
    totals: {
      periodSpend,
      lifetimeSpend,
      events: scoped.length,
      fleetValue,
      runRate,
      costPerHour: totalHours > 0 ? lifetimeSpend / totalHours : 0,
      pctOfFleet: fleetValue > 0 ? (lifetimeSpend / fleetValue) * 100 : 0,
      replaceCount: units.filter((u) => u.verdict === 'Replace').length,
      watchCount: units.filter((u) => u.verdict === 'Repair watch').length,
      avgHealth: units.length ? units.reduce((s, u) => s + u.healthScore, 0) / units.length : 0,
    },
  };
}

export type ReportData = ReturnType<typeof buildReport>;
