export interface LeaseRentBump {
  start_year: number;
  end_year: number;
  increase_percent: number;
}

/**
 * A bump is applied once at the start of its lease-year range. For example,
 * a 10% bump for years 6–10 raises year 6 rent and stays flat through year 10.
 */
export function getScheduledMonthlyRent(baseRent: number, bumps: LeaseRentBump[], leaseYear: number): number {
  if (leaseYear < 1) return baseRent;
  return bumps
    .filter((bump) => bump.start_year > 1 && bump.start_year <= leaseYear)
    .sort((a, b) => a.start_year - b.start_year)
    .reduce((rent, bump) => rent * (1 + bump.increase_percent / 100), baseRent);
}

export function validateRentBumps(bumps: LeaseRentBump[]): string | null {
  const ordered = [...bumps].sort((a, b) => a.start_year - b.start_year);
  for (const bump of ordered) {
    if (!Number.isInteger(bump.start_year) || !Number.isInteger(bump.end_year) || bump.start_year < 1 || bump.end_year < bump.start_year) {
      return 'Each rent bump needs a valid lease-year range.';
    }
    if (!Number.isFinite(bump.increase_percent) || bump.increase_percent < 0) {
      return 'Rent increases must be zero or greater.';
    }
  }
  for (let index = 1; index < ordered.length; index += 1) {
    if (ordered[index].start_year <= ordered[index - 1].end_year) {
      return 'Rent bump periods cannot overlap.';
    }
  }
  return null;
}
