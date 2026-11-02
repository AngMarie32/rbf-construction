/**
 * TraderTaxHQ — per-tax-year parameters.
 *
 * IMPORTANT
 * ---------
 * Every year below ships with `status: 'unverified'`. That is deliberate: the
 * figures are seeded from published inflation-adjustment guidance but nothing
 * here has been tied out by a human. Flip a year's `status` to `'verified'`
 * only after checking it against the IRS revenue procedure named in
 * `sourceNote`. Any analysis produced against an unverified year is stamped as
 * such in the UI and in the exported memo.
 */

import { FilingStatus } from '@/types/tradertax';

export interface Bracket {
  /** Upper bound of the bracket (taxable income). Infinity for the top band. */
  upTo: number;
  rate: number;
}

export interface TaxYearConfig {
  year: number;
  status: 'verified' | 'unverified';
  sourceNote: string;
  standardDeduction: Record<FilingStatus, number>;
  ordinaryBrackets: Record<FilingStatus, Bracket[]>;
  ltcgBrackets: Record<FilingStatus, Bracket[]>;
  niitThreshold: Record<FilingStatus, number>;
  additionalMedicareThreshold: Record<FilingStatus, number>;
  socialSecurityWageBase: number;
  socialSecurityRate: number;
  medicareRate: number;
  additionalMedicareRate: number;
  niitRate: number;
  capitalLossLimit: Record<FilingStatus, number>;
  elective401kDeferral: number;
  catchUp401kAge50: number;
  catchUp401kAge60to63: number;
  definedContributionLimit: number;
  compensationLimit: number;
  qbiThresholdStart: Record<FilingStatus, number>;
  qbiPhaseInRange: Record<FilingStatus, number>;
  fbarThreshold: number;
  form8938Thresholds: {
    domesticSingleYearEnd: number;
    domesticSingleAnyTime: number;
    domesticJointYearEnd: number;
    domesticJointAnyTime: number;
  };
  safeHarborHighIncomeAgi: number;
  safeHarborPriorYearPct: number;
  safeHarborHighIncomePct: number;
  safeHarborCurrentYearPct: number;
  sec1256ShortPortion: number;
  sec1256LongPortion: number;
  /** Approximate count of US market trading days — used for frequency ratios. */
  marketTradingDays: number;
}

const commonNiit: Record<FilingStatus, number> = {
  single: 200000,
  mfj: 250000,
  mfs: 125000,
  hoh: 200000,
  qw: 250000,
};

const commonCapitalLossLimit: Record<FilingStatus, number> = {
  single: 3000,
  mfj: 3000,
  mfs: 1500,
  hoh: 3000,
  qw: 3000,
};

function brackets(pairs: [number, number][]): Bracket[] {
  return pairs.map(([upTo, rate]) => ({ upTo, rate }));
}

const CONFIGS: Record<number, TaxYearConfig> = {
  2024: {
    year: 2024,
    status: 'unverified',
    sourceNote: 'Seeded from Rev. Proc. 2023-34 and Notice 2023-75. Verify before use.',
    standardDeduction: { single: 14600, mfj: 29200, mfs: 14600, hoh: 21900, qw: 29200 },
    ordinaryBrackets: {
      single: brackets([[11600, 0.1], [47150, 0.12], [100525, 0.22], [191950, 0.24], [243725, 0.32], [609350, 0.35], [Infinity, 0.37]]),
      mfj: brackets([[23200, 0.1], [94300, 0.12], [201050, 0.22], [383900, 0.24], [487450, 0.32], [731200, 0.35], [Infinity, 0.37]]),
      mfs: brackets([[11600, 0.1], [47150, 0.12], [100525, 0.22], [191950, 0.24], [243725, 0.32], [365600, 0.35], [Infinity, 0.37]]),
      hoh: brackets([[16550, 0.1], [63100, 0.12], [100500, 0.22], [191950, 0.24], [243700, 0.32], [609350, 0.35], [Infinity, 0.37]]),
      qw: brackets([[23200, 0.1], [94300, 0.12], [201050, 0.22], [383900, 0.24], [487450, 0.32], [731200, 0.35], [Infinity, 0.37]]),
    },
    ltcgBrackets: {
      single: brackets([[47025, 0], [518900, 0.15], [Infinity, 0.2]]),
      mfj: brackets([[94050, 0], [583750, 0.15], [Infinity, 0.2]]),
      mfs: brackets([[47025, 0], [291850, 0.15], [Infinity, 0.2]]),
      hoh: brackets([[63000, 0], [551350, 0.15], [Infinity, 0.2]]),
      qw: brackets([[94050, 0], [583750, 0.15], [Infinity, 0.2]]),
    },
    niitThreshold: commonNiit,
    additionalMedicareThreshold: commonNiit,
    socialSecurityWageBase: 168600,
    socialSecurityRate: 0.124,
    medicareRate: 0.029,
    additionalMedicareRate: 0.009,
    niitRate: 0.038,
    capitalLossLimit: commonCapitalLossLimit,
    elective401kDeferral: 23000,
    catchUp401kAge50: 7500,
    catchUp401kAge60to63: 7500,
    definedContributionLimit: 69000,
    compensationLimit: 345000,
    qbiThresholdStart: { single: 191950, mfj: 383900, mfs: 191950, hoh: 191950, qw: 383900 },
    qbiPhaseInRange: { single: 50000, mfj: 100000, mfs: 50000, hoh: 50000, qw: 100000 },
    fbarThreshold: 10000,
    form8938Thresholds: {
      domesticSingleYearEnd: 50000,
      domesticSingleAnyTime: 75000,
      domesticJointYearEnd: 100000,
      domesticJointAnyTime: 150000,
    },
    safeHarborHighIncomeAgi: 150000,
    safeHarborPriorYearPct: 1.0,
    safeHarborHighIncomePct: 1.1,
    safeHarborCurrentYearPct: 0.9,
    sec1256ShortPortion: 0.4,
    sec1256LongPortion: 0.6,
    marketTradingDays: 252,
  },
  2025: {
    year: 2025,
    status: 'unverified',
    sourceNote:
      'Seeded from Rev. Proc. 2024-40 as adjusted by P.L. 119-21 (OBBBA) and Notice 2024-80. Verify before use.',
    standardDeduction: { single: 15750, mfj: 31500, mfs: 15750, hoh: 23625, qw: 31500 },
    ordinaryBrackets: {
      single: brackets([[11925, 0.1], [48475, 0.12], [103350, 0.22], [197300, 0.24], [250525, 0.32], [626350, 0.35], [Infinity, 0.37]]),
      mfj: brackets([[23850, 0.1], [96950, 0.12], [206700, 0.22], [394600, 0.24], [501050, 0.32], [751600, 0.35], [Infinity, 0.37]]),
      mfs: brackets([[11925, 0.1], [48475, 0.12], [103350, 0.22], [197300, 0.24], [250525, 0.32], [375800, 0.35], [Infinity, 0.37]]),
      hoh: brackets([[17000, 0.1], [64850, 0.12], [103350, 0.22], [197300, 0.24], [250500, 0.32], [626350, 0.35], [Infinity, 0.37]]),
      qw: brackets([[23850, 0.1], [96950, 0.12], [206700, 0.22], [394600, 0.24], [501050, 0.32], [751600, 0.35], [Infinity, 0.37]]),
    },
    ltcgBrackets: {
      single: brackets([[48350, 0], [533400, 0.15], [Infinity, 0.2]]),
      mfj: brackets([[96700, 0], [600050, 0.15], [Infinity, 0.2]]),
      mfs: brackets([[48350, 0], [300000, 0.15], [Infinity, 0.2]]),
      hoh: brackets([[64750, 0], [566700, 0.15], [Infinity, 0.2]]),
      qw: brackets([[96700, 0], [600050, 0.15], [Infinity, 0.2]]),
    },
    niitThreshold: commonNiit,
    additionalMedicareThreshold: commonNiit,
    socialSecurityWageBase: 176100,
    socialSecurityRate: 0.124,
    medicareRate: 0.029,
    additionalMedicareRate: 0.009,
    niitRate: 0.038,
    capitalLossLimit: commonCapitalLossLimit,
    elective401kDeferral: 23500,
    catchUp401kAge50: 7500,
    catchUp401kAge60to63: 11250,
    definedContributionLimit: 70000,
    compensationLimit: 350000,
    qbiThresholdStart: { single: 197300, mfj: 394600, mfs: 197300, hoh: 197300, qw: 394600 },
    qbiPhaseInRange: { single: 50000, mfj: 100000, mfs: 50000, hoh: 50000, qw: 100000 },
    fbarThreshold: 10000,
    form8938Thresholds: {
      domesticSingleYearEnd: 50000,
      domesticSingleAnyTime: 75000,
      domesticJointYearEnd: 100000,
      domesticJointAnyTime: 150000,
    },
    safeHarborHighIncomeAgi: 150000,
    safeHarborPriorYearPct: 1.0,
    safeHarborHighIncomePct: 1.1,
    safeHarborCurrentYearPct: 0.9,
    sec1256ShortPortion: 0.4,
    sec1256LongPortion: 0.6,
    marketTradingDays: 252,
  },
  2026: {
    year: 2026,
    status: 'unverified',
    sourceNote:
      'Seeded from Rev. Proc. 2025-32 and Notice 2025-67 (post-OBBBA). QBI phase-in range widened to $75k/$150k. Verify before use.',
    standardDeduction: { single: 16100, mfj: 32200, mfs: 16100, hoh: 24150, qw: 32200 },
    ordinaryBrackets: {
      single: brackets([[12400, 0.1], [50400, 0.12], [105700, 0.22], [201775, 0.24], [256225, 0.32], [640600, 0.35], [Infinity, 0.37]]),
      mfj: brackets([[24800, 0.1], [100800, 0.12], [211400, 0.22], [403550, 0.24], [512450, 0.32], [768700, 0.35], [Infinity, 0.37]]),
      mfs: brackets([[12400, 0.1], [50400, 0.12], [105700, 0.22], [201775, 0.24], [256225, 0.32], [384350, 0.35], [Infinity, 0.37]]),
      hoh: brackets([[17700, 0.1], [67450, 0.12], [105700, 0.22], [201775, 0.24], [256200, 0.32], [640600, 0.35], [Infinity, 0.37]]),
      qw: brackets([[24800, 0.1], [100800, 0.12], [211400, 0.22], [403550, 0.24], [512450, 0.32], [768700, 0.35], [Infinity, 0.37]]),
    },
    ltcgBrackets: {
      single: brackets([[49450, 0], [545500, 0.15], [Infinity, 0.2]]),
      mfj: brackets([[98900, 0], [613700, 0.15], [Infinity, 0.2]]),
      mfs: brackets([[49450, 0], [306850, 0.15], [Infinity, 0.2]]),
      hoh: brackets([[66200, 0], [579600, 0.15], [Infinity, 0.2]]),
      qw: brackets([[98900, 0], [613700, 0.15], [Infinity, 0.2]]),
    },
    niitThreshold: commonNiit,
    additionalMedicareThreshold: commonNiit,
    socialSecurityWageBase: 184500,
    socialSecurityRate: 0.124,
    medicareRate: 0.029,
    additionalMedicareRate: 0.009,
    niitRate: 0.038,
    capitalLossLimit: commonCapitalLossLimit,
    elective401kDeferral: 24500,
    catchUp401kAge50: 8000,
    catchUp401kAge60to63: 11250,
    definedContributionLimit: 72000,
    compensationLimit: 360000,
    qbiThresholdStart: { single: 201775, mfj: 403550, mfs: 201775, hoh: 201775, qw: 403550 },
    qbiPhaseInRange: { single: 75000, mfj: 150000, mfs: 75000, hoh: 75000, qw: 150000 },
    fbarThreshold: 10000,
    form8938Thresholds: {
      domesticSingleYearEnd: 50000,
      domesticSingleAnyTime: 75000,
      domesticJointYearEnd: 100000,
      domesticJointAnyTime: 150000,
    },
    safeHarborHighIncomeAgi: 150000,
    safeHarborPriorYearPct: 1.0,
    safeHarborHighIncomePct: 1.1,
    safeHarborCurrentYearPct: 0.9,
    sec1256ShortPortion: 0.4,
    sec1256LongPortion: 0.6,
    marketTradingDays: 252,
  },
};

export const SUPPORTED_TAX_YEARS = Object.keys(CONFIGS)
  .map(Number)
  .sort((a, b) => b - a);

export const DEFAULT_TAX_YEAR = Math.max(...SUPPORTED_TAX_YEARS);

/**
 * Returns the config for a year, falling back to the nearest supported year
 * (with the fallback recorded in `sourceNote`) so the engine never throws.
 */
export function getTaxYearConfig(year: number): TaxYearConfig {
  const exact = CONFIGS[year];
  if (exact) return exact;

  const nearest = SUPPORTED_TAX_YEARS.reduce((best, y) =>
    Math.abs(y - year) < Math.abs(best - year) ? y : best
  );
  const base = CONFIGS[nearest];
  return {
    ...base,
    year,
    status: 'unverified',
    sourceNote: `No parameters loaded for ${year}. Using ${nearest} figures as a placeholder — do not rely on these numbers.`,
  };
}

// ---------------------------------------------------------------------------
// Bracket helpers
// ---------------------------------------------------------------------------

export function taxFromBrackets(taxableIncome: number, bands: Bracket[]): number {
  let remaining = Math.max(0, taxableIncome);
  let previous = 0;
  let tax = 0;
  for (const band of bands) {
    if (remaining <= 0) break;
    const width = band.upTo - previous;
    const slice = Math.min(remaining, width);
    tax += slice * band.rate;
    remaining -= slice;
    previous = band.upTo;
  }
  return tax;
}

export function marginalRate(taxableIncome: number, bands: Bracket[]): number {
  const income = Math.max(0, taxableIncome);
  for (const band of bands) {
    if (income <= band.upTo) return band.rate;
  }
  return bands[bands.length - 1].rate;
}

// ---------------------------------------------------------------------------
// Date helpers (deadlines shift for weekends + federal / DC holidays)
// ---------------------------------------------------------------------------

function iso(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function utc(year: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex, day));
}

/** Nth weekday of a month, e.g. nthWeekday(2026, 0, 1, 3) = 3rd Monday of Jan. */
function nthWeekday(year: number, monthIndex: number, weekday: number, n: number): Date {
  const first = utc(year, monthIndex, 1);
  const offset = (weekday - first.getUTCDay() + 7) % 7;
  return utc(year, monthIndex, 1 + offset + (n - 1) * 7);
}

function lastWeekday(year: number, monthIndex: number, weekday: number): Date {
  const last = utc(year, monthIndex + 1, 0);
  const offset = (last.getUTCDay() - weekday + 7) % 7;
  return utc(year, monthIndex, last.getUTCDate() - offset);
}

/** Federal holidays that can push a filing deadline, plus DC Emancipation Day. */
export function federalHolidays(year: number): string[] {
  const fixed = [
    utc(year, 0, 1), // New Year's Day
    utc(year, 5, 19), // Juneteenth
    utc(year, 6, 4), // Independence Day
    utc(year, 10, 11), // Veterans Day
    utc(year, 11, 25), // Christmas
    utc(year, 3, 16), // DC Emancipation Day (affects the April filing deadline)
  ];
  const floating = [
    nthWeekday(year, 0, 1, 3), // MLK Day
    nthWeekday(year, 1, 1, 3), // Washington's Birthday
    lastWeekday(year, 4, 1), // Memorial Day
    nthWeekday(year, 8, 1, 1), // Labor Day
    nthWeekday(year, 9, 1, 2), // Columbus Day
    nthWeekday(year, 10, 4, 4), // Thanksgiving
  ];

  const observed: string[] = [];
  [...fixed, ...floating].forEach((d) => {
    observed.push(iso(d));
    // A Saturday holiday is observed the preceding Friday, a Sunday holiday the
    // following Monday — both of which can shift a due date.
    if (d.getUTCDay() === 6) observed.push(iso(new Date(d.getTime() - 86400000)));
    if (d.getUTCDay() === 0) observed.push(iso(new Date(d.getTime() + 86400000)));
  });
  return Array.from(new Set(observed));
}

/**
 * Shifts a date forward to the next day that is not a weekend or holiday.
 * IRC 7503 / Reg. 301.7503-1.
 */
export function nextBusinessDay(date: Date): Date {
  const holidays = new Set([
    ...federalHolidays(date.getUTCFullYear()),
    ...federalHolidays(date.getUTCFullYear() + 1),
  ]);
  const d = new Date(date.getTime());
  for (let i = 0; i < 10; i += 1) {
    const day = d.getUTCDay();
    if (day !== 0 && day !== 6 && !holidays.has(iso(d))) return d;
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return d;
}

/** Returns an ISO date for month/day in `year`, shifted per IRC 7503. */
export function dueDate(year: number, monthIndex: number, day: number): string {
  return iso(nextBusinessDay(utc(year, monthIndex, day)));
}

export function daysUntil(isoDate: string, from: Date = new Date()): number {
  const target = new Date(`${isoDate}T00:00:00Z`).getTime();
  const start = Date.UTC(from.getUTCFullYear(), from.getUTCMonth(), from.getUTCDate());
  return Math.round((target - start) / 86400000);
}

export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return iso(d);
}

export function isoFromDate(d: Date): string {
  return iso(d);
}
