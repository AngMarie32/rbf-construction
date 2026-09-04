export type OverheadFrequency =
  | 'daily'
  | 'weekly'
  | 'biweekly'
  | 'monthly'
  | 'quarterly'
  | 'yearly';

export const FREQUENCIES: { value: OverheadFrequency; label: string }[] = [
  { value: 'daily', label: 'Per day' },
  { value: 'weekly', label: 'Per week' },
  { value: 'biweekly', label: 'Every 2 weeks' },
  { value: 'monthly', label: 'Per month' },
  { value: 'quarterly', label: 'Per quarter' },
  { value: 'yearly', label: 'Per year' },
];

export const DAYS_PER_YEAR = 365.25;
export const DAYS_PER_MONTH = DAYS_PER_YEAR / 12;

/** Convert an amount at a given frequency into an equivalent daily cost. */
export function toDaily(amount: number, frequency: OverheadFrequency): number {
  const a = Number(amount) || 0;
  switch (frequency) {
    case 'daily':
      return a;
    case 'weekly':
      return a / 7;
    case 'biweekly':
      return a / 14;
    case 'monthly':
      return (a * 12) / DAYS_PER_YEAR;
    case 'quarterly':
      return (a * 4) / DAYS_PER_YEAR;
    case 'yearly':
      return a / DAYS_PER_YEAR;
    default:
      return 0;
  }
}

export interface RunRate {
  daily: number;
  weekly: number;
  monthly: number;
  yearly: number;
}

export function runRateFromDaily(daily: number): RunRate {
  const d = Number(daily) || 0;
  return {
    daily: d,
    weekly: d * 7,
    monthly: d * DAYS_PER_MONTH,
    yearly: d * DAYS_PER_YEAR,
  };
}

export function addRunRates(a: RunRate, b: RunRate): RunRate {
  return {
    daily: a.daily + b.daily,
    weekly: a.weekly + b.weekly,
    monthly: a.monthly + b.monthly,
    yearly: a.yearly + b.yearly,
  };
}

export const EMPTY_RUN_RATE: RunRate = { daily: 0, weekly: 0, monthly: 0, yearly: 0 };
