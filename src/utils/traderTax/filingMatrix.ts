/**
 * TraderTaxHQ — filing requirements matrix.
 *
 * Maps a client's facts to the forms that have to go out the door, with due
 * dates shifted for weekends and holidays under IRC 7503.
 */

import { FilingRequirement, IntakeAnswers } from '@/types/tradertax';
import { dueDate, getTaxYearConfig } from './taxYearConfig';
import { has, hasInstrument, hasSec1256, list, num, str } from './intakeSchema';

export interface FilingCalendar {
  individualDue: string;
  individualExtended: string;
  passthroughDue: string;
  passthroughExtended: string;
  corporateDue: string;
  corporateExtended: string;
  fbarDue: string;
  fbarExtended: string;
  q1: string;
  q2: string;
  q3: string;
  q4: string;
}

/** Standard calendar-year deadlines for the year following `taxYear`. */
export function filingCalendar(taxYear: number): FilingCalendar {
  const y = taxYear + 1;
  return {
    individualDue: dueDate(y, 3, 15),
    individualExtended: dueDate(y, 9, 15),
    passthroughDue: dueDate(y, 2, 15),
    passthroughExtended: dueDate(y, 8, 15),
    corporateDue: dueDate(y, 3, 15),
    corporateExtended: dueDate(y, 9, 15),
    fbarDue: dueDate(y, 3, 15),
    fbarExtended: dueDate(y, 9, 15),
    q1: dueDate(taxYear, 3, 15),
    q2: dueDate(taxYear, 5, 15),
    q3: dueDate(taxYear, 8, 15),
    q4: dueDate(taxYear + 1, 0, 15),
  };
}

export function buildFilingRequirements(
  answers: IntakeAnswers,
  taxYear: number,
  opts: { ttsSupported: boolean; mtmElected: boolean; form3115Required: boolean }
): FilingRequirement[] {
  const cal = filingCalendar(taxYear);
  const cfg = getTaxYearConfig(taxYear);
  const out: FilingRequirement[] = [];

  const push = (r: FilingRequirement) => out.push(r);

  const ind = (formCode: string, formName: string, reason: string, notes?: string) =>
    push({
      formCode,
      formName,
      jurisdiction: 'federal',
      entityScope: 'individual',
      dueDate: cal.individualDue,
      extendedDueDate: cal.individualExtended,
      reason,
      notes,
    });

  // --- Core individual return ----------------------------------------------
  ind('1040', 'U.S. Individual Income Tax Return', 'Base return for the taxpayer.');

  // A funded trader with no personal account has no own-account dispositions,
  // so Schedule D, Form 8949 and Form 6781 do not belong on their return.
  const ownAccountActivity =
    num(answers, 'total_trades') > 0 ||
    num(answers, 'securities_net_gain') !== 0 ||
    num(answers, 'sec1256_net_gain') !== 0 ||
    num(answers, 'crypto_net_gain') !== 0 ||
    num(answers, 'forex_net_gain') !== 0;
  const propOnly = has(answers, 'prop_firm') && !ownAccountActivity;

  // --- Funded account activity ---------------------------------------------
  const propForm = str(answers, 'prop_1099_type', '');
  const propIsSelfEmployment = has(answers, 'prop_firm') && ['nec', 'misc', 'none_foreign', 'none_unsure'].includes(propForm);

  if (propIsSelfEmployment) {
    ind(
      'SCH_C_PROP',
      'Schedule C — funded account activity',
      'Prop firm payouts are business income, reported with the evaluation, reset, and platform fees against them.',
      'Do not combine this with a separate self-directed trading Schedule C — they are different activities with different income.'
    );
    ind(
      'SCH_SE',
      'Schedule SE — Self-Employment Tax',
      'Self-employment tax on the net profit from funded account activity.',
      'Half of the Social Security and Medicare portion is deducted above the line on Schedule 1.'
    );
    ind(
      '1099_RECON',
      '1099-NEC / 1099-MISC reconciliation',
      'Gross payouts reported by each firm must tie to the Schedule C gross receipts.',
      'Underreporting against a filed 1099 produces an automated notice. If the firm’s number is wrong, reconcile it on the return rather than ignoring it.'
    );
  }

  if (has(answers, 'prop_firm') && propForm === 'k1') {
    ind(
      'K1_PROP',
      'Schedule K-1 from the prop firm',
      'The firm treats the arrangement as a partnership interest.',
      'Read the K-1 codes to establish whether the allocation carries self-employment tax.'
    );
  }

  if (opts.ttsSupported) {
    ind(
      'SCH_C',
      'Schedule C — Profit or Loss From Business',
      'Trader tax status supported; trading business expenses are reported on Schedule C.',
      'Trading gains and losses do NOT go on Schedule C. Only expenses do, which normally produces a Schedule C loss.'
    );
  }

  if (opts.mtmElected) {
    ind(
      '4797',
      'Form 4797 — Sales of Business Property',
      'Section 475(f) ordinary gain or loss on securities is reported in Part II.'
    );
  } else if (!propOnly) {
    ind('SCH_D', 'Schedule D — Capital Gains and Losses', 'Capital treatment for trading results.');
    ind('8949', 'Form 8949 — Sales and Other Dispositions of Capital Assets', 'Detail support for Schedule D.');
  }

  // A 475(f)(2) election makes section 1256 results ordinary on Form 4797, so
  // Form 6781 drops out for contracts held in the trading business.
  const mtmCoversCommodities =
    opts.mtmElected && str(answers, 'sec475_scope', 'securities') !== 'securities';

  if (hasSec1256(answers) && !mtmCoversCommodities && !propOnly) {
    ind(
      '6781',
      'Form 6781 — Gains and Losses From Section 1256 Contracts and Straddles',
      'Section 1256 contracts are marked to market and split 60% long-term / 40% short-term.',
      `Confirm whether the 475 election reaches commodities. Net 1256 loss may be carried back three years on Form 1045 under section 1212(c).`
    );
  }

  if (hasSec1256(answers) && mtmCoversCommodities) {
    ind(
      '4797_1256',
      'Form 4797 — section 1256 contracts under the 475(f)(2) election',
      'The mark-to-market election covers commodities, so section 1256 results are ordinary rather than 60/40.',
      'Confirm this is intended — the election gives up the 60% long-term portion. Form 6781 does not apply to contracts held in the trading business.'
    );
  }

  if (opts.form3115Required) {
    ind(
      '3115',
      'Form 3115 — Application for Change in Accounting Method',
      'Perfects the section 475(f) election in its first effective year.',
      'Original with the return, duplicate copy to the IRS per the automatic change procedures. Include the section 481(a) adjustment.'
    );
  }

  if (has(answers, 'home_office') && opts.ttsSupported) {
    ind('8829', 'Form 8829 — Expenses for Business Use of Your Home', 'Home office claimed against the Schedule C trading business.');
  }

  if (num(answers, 'exp_equipment') > 0) {
    ind('4562', 'Form 4562 — Depreciation and Amortization', 'Equipment placed in service for the trading business.');
  }

  const portfolio = num(answers, 'interest_dividends');
  if (portfolio > 1500 || has(answers, 'foreign_broker')) {
    ind('SCH_B', 'Schedule B — Interest and Ordinary Dividends', 'Interest/dividends reported, and Part III answers the foreign account questions.');
  }

  // --- Investment interest (non-TTS) ---------------------------------------
  if (!opts.ttsSupported && num(answers, 'exp_margin_interest') > 0) {
    ind(
      '4952',
      'Form 4952 — Investment Interest Expense Deduction',
      'Margin interest without trader status is investment interest, limited to net investment income under section 163(d).'
    );
  }

  // --- NIIT / additional Medicare ------------------------------------------
  const totalIncome =
    num(answers, 'w2_income') +
    num(answers, 'spouse_w2_income') +
    num(answers, 'self_employment_income') +
    num(answers, 'rental_k1_income') +
    portfolio +
    Math.max(0, num(answers, 'securities_net_gain')) +
    Math.max(0, num(answers, 'sec1256_net_gain'));
  const filingStatus = (str(answers, 'filing_status', 'single') || 'single') as keyof typeof cfg.niitThreshold;
  if (totalIncome > (cfg.niitThreshold[filingStatus] ?? 200000)) {
    ind('8960', 'Form 8960 — Net Investment Income Tax', 'Income exceeds the section 1411 threshold.');
    ind('8959', 'Form 8959 — Additional Medicare Tax', 'Wages or self-employment income above the section 3101(b)(2) threshold.');
  }

  // --- QBI ------------------------------------------------------------------
  if ((opts.ttsSupported && opts.mtmElected) || propIsSelfEmployment) {
    ind(
      '8995',
      'Form 8995 / 8995-A — Qualified Business Income Deduction',
      'Section 475 ordinary trading income may be qualified business income, but trading is a specified service trade or business, so the deduction phases out above the threshold.',
      `Threshold for ${taxYear}: $${cfg.qbiThresholdStart[filingStatus as keyof typeof cfg.qbiThresholdStart].toLocaleString()}. Capital gains are excluded from QBI in any case.`
    );
  }

  // --- Entity returns -------------------------------------------------------
  const entityType = str(answers, 'entity_type', '');
  if (has(answers, 'entity_exists')) {
    if (entityType === 'partnership') {
      push({
        formCode: '1065',
        formName: 'Form 1065 — U.S. Return of Partnership Income',
        jurisdiction: 'federal',
        entityScope: 'entity',
        dueDate: cal.passthroughDue,
        extendedDueDate: cal.passthroughExtended,
        reason: 'Multi-member LLC or partnership trading entity.',
        notes: 'Schedules K-1 to each partner. Trader expenses flow through separately from trading gains.',
      });
    }
    if (entityType === 's_corp' || has(answers, 's_election_filed')) {
      push({
        formCode: '1120S',
        formName: 'Form 1120-S — U.S. Income Tax Return for an S Corporation',
        jurisdiction: 'federal',
        entityScope: 'entity',
        dueDate: cal.passthroughDue,
        extendedDueDate: cal.passthroughExtended,
        reason: 'S corporation management or trading company.',
        notes: 'Include Form 1125-E officer compensation and reconcile W-2 health premiums.',
      });
    }
    if (entityType === 'c_corp') {
      push({
        formCode: '1120',
        formName: 'Form 1120 — U.S. Corporation Income Tax Return',
        jurisdiction: 'federal',
        entityScope: 'entity',
        dueDate: cal.corporateDue,
        extendedDueDate: cal.corporateExtended,
        reason: 'C corporation in the structure.',
      });
    }
  }

  if (has(answers, 'entity_runs_payroll')) {
    push({
      formCode: 'W2_W3',
      formName: 'Forms W-2 / W-3',
      jurisdiction: 'federal',
      entityScope: 'entity',
      dueDate: dueDate(taxYear + 1, 0, 31),
      extendedDueDate: null,
      reason: 'Entity pays owner compensation.',
      notes: 'January 31 deadline — no extension in practice. S-corp health premiums belong in box 1 and box 14.',
    });
    push({
      formCode: '941_940',
      formName: 'Forms 941 (quarterly) and 940 (annual)',
      jurisdiction: 'federal',
      entityScope: 'entity',
      dueDate: dueDate(taxYear + 1, 0, 31),
      extendedDueDate: null,
      reason: 'Employment tax returns for owner payroll.',
    });
  }

  // --- Foreign reporting ----------------------------------------------------
  const foreignMax = num(answers, 'foreign_max_balance');
  if (has(answers, 'foreign_broker') || foreignMax > 0) {
    if (foreignMax >= cfg.fbarThreshold) {
      push({
        formCode: 'FINCEN_114',
        formName: 'FinCEN Form 114 (FBAR)',
        jurisdiction: 'federal',
        entityScope: 'individual',
        dueDate: cal.fbarDue,
        extendedDueDate: cal.fbarExtended,
        reason: `Aggregate foreign account balance of $${foreignMax.toLocaleString()} exceeded the $${cfg.fbarThreshold.toLocaleString()} threshold.`,
        notes: 'Automatic extension to October — filed with FinCEN, not the IRS. Penalties are severe.',
      });
    }
    const jointFiler = str(answers, 'filing_status') === 'mfj';
    const t8938 = jointFiler
      ? cfg.form8938Thresholds.domesticJointYearEnd
      : cfg.form8938Thresholds.domesticSingleYearEnd;
    if (foreignMax >= t8938) {
      ind(
        '8938',
        'Form 8938 — Statement of Specified Foreign Financial Assets',
        `Specified foreign financial assets exceed the $${t8938.toLocaleString()} reporting threshold.`
      );
    }
  }

  if (has(answers, 'pfic_holdings')) {
    ind(
      '8621',
      'Form 8621 — Information Return by a Shareholder of a PFIC',
      'Foreign mutual fund or PFIC holdings reported on intake.',
      'Consider a QEF or mark-to-market election; the default excess distribution regime is punitive.'
    );
  }

  if (has(answers, 'gifts_inheritance')) {
    ind('3520', 'Form 3520 — Foreign Gifts and Trusts', 'Foreign gift or inheritance over the reporting threshold.');
  }

  // --- Estimated tax --------------------------------------------------------
  push({
    formCode: '1040ES',
    formName: 'Form 1040-ES — Estimated Tax Vouchers',
    jurisdiction: 'federal',
    entityScope: 'individual',
    dueDate: cal.q4,
    extendedDueDate: null,
    reason: 'Trading income is not withheld on.',
    notes: `Quarterly due dates for ${taxYear}: ${cal.q1}, ${cal.q2}, ${cal.q3}, ${cal.q4}.`,
  });

  // --- Extensions -----------------------------------------------------------
  push({
    formCode: '4868',
    formName: 'Form 4868 — Automatic Extension (individual)',
    jurisdiction: 'federal',
    entityScope: 'individual',
    dueDate: cal.individualDue,
    extendedDueDate: null,
    reason: 'Extension of time to file. An election statement under Rev. Proc. 99-17 can ride along with it.',
    notes: 'Extends time to file, not time to pay.',
  });

  if (has(answers, 'entity_exists')) {
    push({
      formCode: '7004',
      formName: 'Form 7004 — Automatic Extension (entity)',
      jurisdiction: 'federal',
      entityScope: 'entity',
      dueDate: cal.passthroughDue,
      extendedDueDate: null,
      reason: 'Extension of time to file the entity return.',
    });
  }

  // --- State ----------------------------------------------------------------
  const homeState = str(answers, 'home_state');
  if (homeState) {
    push({
      formCode: `STATE_${homeState}`,
      formName: `${homeState} resident income tax return`,
      jurisdiction: homeState,
      entityScope: 'individual',
      dueDate: cal.individualDue,
      extendedDueDate: cal.individualExtended,
      reason: 'State of residence.',
      notes:
        'Confirm state conformity to section 475 and to federal business expense treatment — conformity is not universal.',
    });
  }
  list(answers, 'other_states').forEach((st) => {
    push({
      formCode: `STATE_${st}`,
      formName: `${st} nonresident or part-year return`,
      jurisdiction: st,
      entityScope: 'individual',
      dueDate: cal.individualDue,
      extendedDueDate: cal.individualExtended,
      reason: 'Filing exposure reported on intake.',
    });
  });

  if (hasInstrument(answers, 'crypto')) {
    ind(
      'DIGITAL_ASSETS',
      'Digital asset reporting',
      'Digital asset activity reported on intake.',
      'Answer the Form 1040 digital asset question, reconcile Forms 1099-DA, and apply per-wallet basis tracking under the section 1012 regulations.'
    );
  }

  return out;
}
