import { describe, expect, test } from 'bun:test';
import { getScheduledMonthlyRent, validateRentBumps } from './leaseTerms';

describe('lease rent bumps', () => {
  test('applies a period increase once and holds it through the period', () => {
    const bumps = [{ start_year: 6, end_year: 10, increase_percent: 10 }];
    expect(getScheduledMonthlyRent(1000, bumps, 5)).toBe(1000);
    expect(getScheduledMonthlyRent(1000, bumps, 6)).toBe(1100);
    expect(getScheduledMonthlyRent(1000, bumps, 10)).toBe(1100);
  });

  test('applies later period increases to the preceding scheduled rent', () => {
    const bumps = [
      { start_year: 3, end_year: 5, increase_percent: 10 },
      { start_year: 6, end_year: 8, increase_percent: 5 },
    ];
    expect(getScheduledMonthlyRent(1000, bumps, 6)).toBe(1155);
  });

  test('rejects overlapping lease-year periods', () => {
    expect(validateRentBumps([
      { start_year: 1, end_year: 5, increase_percent: 0 },
      { start_year: 5, end_year: 8, increase_percent: 3 },
    ])).toBe('Rent bump periods cannot overlap.');
  });

  test('accepts sequential periods', () => {
    expect(validateRentBumps([
      { start_year: 1, end_year: 5, increase_percent: 0 },
      { start_year: 6, end_year: 10, increase_percent: 3 },
    ])).toBeNull();
  });
});
