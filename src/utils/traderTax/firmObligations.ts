/**
 * TraderTaxHQ — the practice's own compliance calendar.
 *
 * These are the dates that belong to the firm rather than to any one client:
 * credential renewals, the security program's own review cycle, information
 * return deadlines, and the season's operational milestones.
 *
 * Dates marked `confirmAnnually` move year to year (the MeF shutdown is the
 * usual offender). The seeded date is a planning placeholder — the UI says so,
 * and the preparer is expected to correct it once the IRS publishes.
 */

import { Recurrence } from '@/types/tradertax';
import { dueDate } from './taxYearConfig';

export interface FirmObligationTemplate {
  code: string;
  title: string;
  category: 'credential' | 'security' | 'compliance' | 'operations';
  detail: string;
  authority?: string;
  recurrence: Recurrence;
  /** Month index (0-11) and day the obligation lands on. */
  month: number;
  day: number;
  /** Shift off weekends and federal holidays under IRC 7503. */
  businessDayShift?: boolean;
  confirmAnnually?: boolean;
  reminderDays: number;
}

export const FIRM_OBLIGATION_CATALOG: FirmObligationTemplate[] = [
  // --- Credentials --------------------------------------------------------
  {
    code: 'PTIN_RENEWAL',
    title: 'Renew PTIN',
    category: 'credential',
    detail:
      'Every preparer who is paid to prepare or assist in preparing federal returns needs a current PTIN. Renewal opens in mid-October and the current PTIN expires December 31.',
    authority: 'IRC sec. 6109(a)(4); Treas. Reg. sec. 1.6109-2',
    recurrence: 'annual',
    month: 11,
    day: 31,
    reminderDays: 45,
  },
  {
    code: 'CE_HOURS',
    title: 'Complete continuing education hours',
    category: 'credential',
    detail:
      'Close out the calendar-year CE requirement for your credential (EA, CPA, or AFSP) and file the certificates with the firm records.',
    authority: 'Circular 230 sec. 10.6(d)',
    recurrence: 'annual',
    month: 11,
    day: 31,
    reminderDays: 60,
  },
  {
    code: 'EFIN_CHECK',
    title: 'Verify EFIN status and e-Services account',
    category: 'credential',
    detail:
      'Log in to e-Services, confirm the EFIN is active, and check the return volume reported against the EFIN for signs of misuse. Update the application within 30 days of any change to the firm.',
    authority: 'IRS Pub. 3112',
    recurrence: 'annual',
    month: 0,
    day: 10,
    reminderDays: 21,
  },

  // --- Security program ---------------------------------------------------
  {
    code: 'WISP_REVIEW',
    title: 'Review and re-adopt the written information security plan',
    category: 'security',
    detail:
      'Reassess risks, update the safeguards register, and have the qualified individual re-sign the plan. Reassessment is required when the business materially changes, and at least annually as a matter of practice.',
    authority: '16 CFR 314.4(b), (i); IRS Pub. 4557',
    recurrence: 'annual',
    month: 6,
    day: 1,
    reminderDays: 30,
  },
  {
    code: 'SECURITY_TRAINING',
    title: 'Run annual security awareness training',
    category: 'security',
    detail:
      'Train everyone with access to taxpayer data, including seasonal staff, and log completion before the season starts.',
    authority: '16 CFR 314.4(e)',
    recurrence: 'annual',
    month: 10,
    day: 15,
    reminderDays: 30,
  },
  {
    code: 'ACCESS_REVIEW',
    title: 'Review user access and remove departed users',
    category: 'security',
    detail:
      'Walk every system that touches client data — this app, TitanFile, the tax software, email, the bank — and confirm each account still belongs to someone who needs it. Verify MFA is on.',
    authority: '16 CFR 314.4(c)(1)',
    recurrence: 'quarterly',
    month: 0,
    day: 15,
    reminderDays: 14,
  },
  {
    code: 'BACKUP_TEST',
    title: 'Test a restore from backup',
    category: 'security',
    detail:
      'A backup that has never been restored is a hypothesis. Restore a real file and record the result.',
    authority: '16 CFR 314.4(d)',
    recurrence: 'annual',
    month: 5,
    day: 15,
    reminderDays: 21,
  },
  {
    code: 'VENDOR_REVIEW',
    title: 'Review service providers that touch client data',
    category: 'security',
    detail:
      'Reconfirm each provider in the register: contract on file, security posture reviewed, MFA enforced, access still needed.',
    authority: '16 CFR 314.4(f)',
    recurrence: 'annual',
    month: 7,
    day: 1,
    reminderDays: 30,
  },
  {
    code: 'CYBER_INSURANCE',
    title: 'Renew cyber liability insurance',
    category: 'security',
    detail: 'Confirm the limit still matches the number of client records held, and that breach response is covered.',
    recurrence: 'annual',
    month: 9,
    day: 1,
    reminderDays: 45,
  },

  // --- Filing / compliance ------------------------------------------------
  {
    code: 'INFO_RETURNS',
    title: 'File Forms W-2 and 1099-NEC',
    category: 'compliance',
    detail:
      'Recipient copies and the government copies are both due January 31 — there is no automatic extension for either.',
    authority: 'IRC sec. 6071(c)',
    recurrence: 'annual',
    month: 0,
    day: 31,
    businessDayShift: true,
    reminderDays: 21,
  },
  {
    code: 'FIRM_RETURN',
    title: 'File the firm’s own pass-through return',
    category: 'compliance',
    detail: 'Form 1065 or 1120-S for the practice itself. The one return every firm files late.',
    authority: 'IRC sec. 6072(b)',
    recurrence: 'annual',
    month: 2,
    day: 15,
    businessDayShift: true,
    reminderDays: 30,
  },
  {
    code: 'MEF_SHUTDOWN',
    title: 'Individual e-file (MeF) shutdown — confirm the date',
    category: 'compliance',
    detail:
      'The IRS closes individual e-file in late November for year-end maintenance. Anything not transmitted by then is paper until filing season reopens. THE EXACT DATE CHANGES EVERY YEAR — confirm against the IRS QuickAlerts announcement and correct this entry.',
    authority: 'IRS MeF operational status',
    recurrence: 'annual',
    month: 10,
    day: 20,
    confirmAnnually: true,
    reminderDays: 30,
  },
  {
    code: 'RETENTION_PURGE',
    title: 'Run the records retention purge',
    category: 'compliance',
    detail:
      'Dispose of client records past the firm’s retention period using a documented method. Holding data longer than needed is itself a Safeguards Rule finding.',
    authority: '16 CFR 314.4(c)(6); Circular 230 sec. 10.28',
    recurrence: 'annual',
    month: 5,
    day: 1,
    reminderDays: 30,
  },

  // --- Operations ---------------------------------------------------------
  {
    code: 'ENGAGEMENT_REFRESH',
    title: 'Refresh engagement letters and section 7216 consents for the season',
    category: 'operations',
    detail:
      'New year, new engagement letter. Consents to disclose or use tax return information have to be signed before the disclosure, and they do not carry over.',
    authority: 'IRC sec. 7216; Treas. Reg. sec. 301.7216-3',
    recurrence: 'annual',
    month: 11,
    day: 1,
    reminderDays: 30,
  },
  {
    code: 'FEE_REVIEW',
    title: 'Review the fee schedule before the season',
    category: 'operations',
    detail: 'Reprice against last season’s realization per return before the first engagement letter goes out.',
    recurrence: 'annual',
    month: 10,
    day: 1,
    reminderDays: 21,
  },
  {
    code: 'CAPACITY_PLAN',
    title: 'Set the season capacity cap',
    category: 'operations',
    detail:
      'Decide the maximum number of returns the firm will accept, and the date new clients get pushed to extension.',
    recurrence: 'annual',
    month: 11,
    day: 15,
    reminderDays: 21,
  },
];

export interface BuiltFirmDeadline {
  code: string;
  title: string;
  category: string;
  detail: string;
  authority: string | null;
  due_date: string;
  recurrence: Recurrence;
  reminder_days: number;
  status: 'open';
}

/**
 * Materializes the catalog for a calendar year. Anything already past is
 * rolled to next year, so seeding mid-season produces a forward-looking list
 * rather than a wall of overdue items.
 */
export function buildFirmDeadlines(year: number, today: Date = new Date()): BuiltFirmDeadline[] {
  const todayIso = today.toISOString().slice(0, 10);

  return FIRM_OBLIGATION_CATALOG.map((t) => {
    const compute = (y: number) =>
      t.businessDayShift
        ? dueDate(y, t.month, t.day)
        : new Date(Date.UTC(y, t.month, t.day)).toISOString().slice(0, 10);

    let date = compute(year);
    if (date < todayIso) date = compute(year + 1);

    return {
      code: t.code,
      title: t.confirmAnnually ? `${t.title}` : t.title,
      category: t.category,
      detail: t.detail,
      authority: t.authority ?? null,
      due_date: date,
      recurrence: t.recurrence,
      reminder_days: t.reminderDays,
      status: 'open' as const,
    };
  });
}
