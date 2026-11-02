/**
 * TraderTaxHQ — small helpers used by the dashboard.
 */

import { daysUntil as daysUntilIso, DEFAULT_TAX_YEAR as DEFAULT_YEAR } from './taxYearConfig';
import { electionStatementDeadline } from './electionEngine';

export const DEFAULT_TAX_YEAR = DEFAULT_YEAR;
export const daysUntil = daysUntilIso;

/**
 * The next open Section 475(f) election window, so the dashboard can surface it
 * before it quietly closes on April 15.
 */
export function electionWindowSummary(currentYear: number) {
  const thisYear = electionStatementDeadline(currentYear);
  const remaining = daysUntilIso(thisYear);

  if (remaining >= 0) {
    return {
      year: currentYear,
      dueDate: thisYear,
      daysRemaining: remaining,
      note: `${remaining} days to file the election statement for ${currentYear}.`,
    };
  }

  const nextYear = electionStatementDeadline(currentYear + 1);
  return {
    year: currentYear + 1,
    dueDate: nextYear,
    daysRemaining: daysUntilIso(nextYear),
    note: `The ${currentYear} window has closed. Next window is for ${currentYear + 1}.`,
  };
}
