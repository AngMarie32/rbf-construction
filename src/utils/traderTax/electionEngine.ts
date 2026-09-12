/**
 * TraderTaxHQ — Section 475(f) mark-to-market and related elections.
 *
 * Mechanics implemented here:
 *  - 475(f)(1) securities / 475(f)(2) commodities MTM election
 *  - existing taxpayer deadline: statement filed by the unextended due date of
 *    the return for the year *preceding* the first effective year
 *    (Rev. Proc. 99-17, sec. 5.03(1))
 *  - new taxpayer / new entity: internal election within 2 months and 15 days
 *    of the first day of the tax year (Rev. Proc. 99-17, sec. 5.03(2)) — no
 *    statement is filed with the Service
 *  - perfection on Form 3115 with the first effective year's return, automatic
 *    change with a section 481(a) adjustment
 *  - revocation on the same calendar as the election (Rev. Proc. 2017-30)
 *  - Section 988(a)(1)(B) capital gain election for forex
 *
 * Dates are shifted for weekends and holidays under IRC 7503.
 */

import { ElectionAssessment, ElectionDeadline, IntakeAnswers } from '@/types/tradertax';
import { daysUntil, dueDate, getTaxYearConfig } from './taxYearConfig';
import { has, hasInstrument, hasSec1256, num, str } from './intakeSchema';

const AUTH = {
  revProc9917: 'Rev. Proc. 99-17, 1999-1 C.B. 503',
  sec475: 'IRC sec. 475(f)',
  revProc201730: 'Rev. Proc. 2017-30, sec. 23.02',
  form3115: 'Form 3115, automatic change (DCN 64); Rev. Proc. 2015-13 procedures',
  sec988: 'IRC sec. 988(a)(1)(B); Treas. Reg. sec. 1.988-3(b)',
  sec1256: 'IRC sec. 1256(a)(3)',
  sec1091: 'IRC sec. 1091; Rev. Rul. 2008-5',
  sec1211: 'IRC sec. 1211(b)',
};

function statusFor(iso: string, alreadyMade: boolean): ElectionDeadline['status'] {
  if (alreadyMade) return 'already_made';
  return daysUntil(iso) >= 0 ? 'open' : 'past';
}

/**
 * Election statement deadline for making 475(f) effective for `effectiveYear`
 * as an existing taxpayer: the unextended due date of the prior-year return.
 */
export function electionStatementDeadline(effectiveYear: number): string {
  return dueDate(effectiveYear, 3, 15); // April 15 of the effective year
}

/** Entity-level internal election deadline: 75 days from inception. */
export function newEntityElectionDeadline(inceptionIso: string): string {
  const d = new Date(`${inceptionIso}T00:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() + 2);
  d.setUTCDate(d.getUTCDate() + 15);
  return d.toISOString().slice(0, 10);
}

export function assessElections(answers: IntakeAnswers, taxYear: number): ElectionAssessment {
  const cfg = getTaxYearConfig(taxYear);
  const elected = has(answers, 'sec475_elected');
  const scope = str(answers, 'sec475_scope', 'securities');
  const effectiveYear = num(answers, 'sec475_effective_year', 0);
  const form3115Filed = has(answers, 'sec475_form3115_filed');

  const securitiesNet = num(answers, 'securities_net_gain');
  const shortTerm = num(answers, 'short_term_portion', securitiesNet);
  const sec1256Net = num(answers, 'sec1256_net_gain');
  const washDisallowed = num(answers, 'wash_sale_disallowed');
  const carryforward = num(answers, 'capital_loss_carryforward');
  const unrealized = num(answers, 'unrealized_open_positions');
  const filingStatus = (str(answers, 'filing_status', 'single') || 'single') as keyof typeof cfg.capitalLossLimit;
  const lossLimit = cfg.capitalLossLimit[filingStatus] ?? 3000;

  const deadlines: ElectionDeadline[] = [];
  const rationale: string[] = [];
  const pro: string[] = [];
  const con: string[] = [];

  // ---- Current state -------------------------------------------------------
  const currentState = elected
    ? `Section 475(f) election in place${effectiveYear ? ` effective ${effectiveYear}` : ''} covering ${
        scope === 'both' ? 'securities and commodities' : scope
      }${form3115Filed ? ', perfected on Form 3115' : ', Form 3115 status unconfirmed'}.`
    : 'No Section 475(f) election on file — trading gains and losses are capital, wash sale rules apply, and net capital losses are limited.';

  // ---- Deadlines -----------------------------------------------------------
  const nextYear = taxYear + 1;

  deadlines.push({
    code: 'ELECT_475_CURRENT',
    label: `Elect 475(f) effective for ${taxYear}`,
    dueDate: electionStatementDeadline(taxYear),
    description: `Statement attached to the ${taxYear - 1} return or to the Form 4868 extension request, filed by the unextended due date of the ${taxYear - 1} return.`,
    authority: AUTH.revProc9917,
    status: statusFor(electionStatementDeadline(taxYear), elected && effectiveYear <= taxYear),
    daysRemaining: daysUntil(electionStatementDeadline(taxYear)),
  });

  deadlines.push({
    code: 'ELECT_475_NEXT',
    label: `Elect 475(f) effective for ${nextYear}`,
    dueDate: electionStatementDeadline(nextYear),
    description: `Statement attached to the ${taxYear} return or its extension request. This is the live decision if the ${taxYear} window has already closed.`,
    authority: AUTH.revProc9917,
    status: statusFor(electionStatementDeadline(nextYear), elected && effectiveYear <= nextYear),
    daysRemaining: daysUntil(electionStatementDeadline(nextYear)),
  });

  if (elected) {
    deadlines.push({
      code: 'FORM_3115',
      label: 'Perfect the election on Form 3115',
      dueDate: dueDate(effectiveYear ? effectiveYear + 1 : taxYear + 1, 3, 15),
      description:
        'File Form 3115 with the first effective year’s return (original to the return, copy to the IRS) with the section 481(a) adjustment. An unperfected election is the most common way a 475 position is lost.',
      authority: AUTH.form3115,
      status: statusFor(dueDate(effectiveYear ? effectiveYear + 1 : taxYear + 1, 3, 15), form3115Filed),
      daysRemaining: daysUntil(dueDate(effectiveYear ? effectiveYear + 1 : taxYear + 1, 3, 15)),
    });

    deadlines.push({
      code: 'REVOKE_475',
      label: `Revoke 475(f) effective for ${nextYear}`,
      dueDate: electionStatementDeadline(nextYear),
      description:
        'Revocation statement is due on the same calendar as the election — by the unextended due date of the return for the year preceding the year of revocation.',
      authority: AUTH.revProc201730,
      status: 'open',
      daysRemaining: daysUntil(electionStatementDeadline(nextYear)),
    });
  }

  const entityFormed = str(answers, 'entity_formed_date');
  if (entityFormed && new Date(entityFormed).getUTCFullYear() >= taxYear) {
    const d = newEntityElectionDeadline(entityFormed);
    deadlines.push({
      code: 'NEW_ENTITY_475',
      label: 'New entity internal 475(f) election',
      dueDate: d,
      description:
        'A new taxpayer elects internally within 2 months and 15 days of the first day of its first tax year. Record it in a dated resolution — nothing is filed with the Service in the election year.',
      authority: AUTH.revProc9917,
      status: statusFor(d, elected),
      daysRemaining: daysUntil(d),
    });
  }

  if (hasInstrument(answers, 'forex')) {
    deadlines.push({
      code: 'SEC988_ELECTION',
      label: 'Section 988(a)(1)(B) capital gain election (forex)',
      dueDate: `${taxYear}-12-31`,
      description:
        'Made contemporaneously in the taxpayer’s books and records on a transaction-by-transaction basis before the close of the day the transaction is entered into. It is not filed with the return.',
      authority: AUTH.sec988,
      status: has(answers, 'sec988_capital_election') ? 'already_made' : 'open',
      daysRemaining: daysUntil(`${taxYear}-12-31`),
    });
  }

  // ---- Trade-offs ----------------------------------------------------------
  pro.push('Wash sale deferrals under section 1091 stop applying to securities in the trading business.');
  pro.push(
    `Trading losses become ordinary — they escape the $${lossLimit.toLocaleString()} annual capital loss limitation and can generate an NOL.`
  );
  pro.push('No year-end straddle or holding period gymnastics; positions are marked to market on December 31.');
  pro.push('Ordinary treatment lines up with Schedule C expense deductions for a trader business.');

  con.push('Long-term capital gain rates are given up on securities held in the trading business.');
  con.push('Electing commodities under 475(f)(2) surrenders the 60/40 split on section 1256 contracts.');
  con.push('Unrealized gains at year end are taxed even though nothing was sold.');
  con.push('Segregate any true investment positions and identify them as investments on the day of acquisition, or they get swept into the election.');
  con.push('The election binds future years unless revoked on the same calendar under Rev. Proc. 2017-30.');

  // ---- Recommendation ------------------------------------------------------
  let recommended: ElectionAssessment['recommended'] = 'defer_decision';
  let estimatedImpact: number | null = null;

  const netTradingLoss = securitiesNet < 0;
  const capitalLossTrapped = Math.max(0, -(securitiesNet + carryforward) - lossLimit);
  const washProblem = washDisallowed > Math.max(5000, Math.abs(securitiesNet) * 0.05);

  if (elected) {
    if (sec1256Net > 0 && (scope === 'both' || scope === 'commodities')) {
      recommended = 'revoke_475';
      rationale.push(
        `The election covers commodities while section 1256 contracts show a net gain of $${sec1256Net.toLocaleString()}. Under 60/40 treatment that gain would be taxed at a blended rate; inside 475 it is fully ordinary. Model a revocation for ${nextYear}, or a securities-only election.`
      );
      estimatedImpact = sec1256Net * cfg.sec1256LongPortion * 0.17;
    } else {
      recommended = 'do_not_elect';
      rationale.push('The existing election is working as intended for this fact pattern — keep it and confirm Form 3115 is on file.');
    }
    if (!form3115Filed) {
      rationale.push(
        'Form 3115 has not been confirmed. Without it the accounting method change is not perfected and the Service can unwind the ordinary treatment. Resolve this first.'
      );
    }
  } else if (netTradingLoss && (capitalLossTrapped > 0 || washProblem)) {
    recommended = hasSec1256(answers) && sec1256Net > 0 ? 'elect_475_securities' : 'elect_475_securities';
    rationale.push(
      `Trading losses of $${Math.abs(securitiesNet).toLocaleString()} are capital and only $${lossLimit.toLocaleString()} per year is usable against ordinary income (IRC sec. 1211(b)). A securities-only 475(f) election converts future losses to ordinary.`
    );
    if (washProblem) {
      rationale.push(
        `$${washDisallowed.toLocaleString()} of wash sale losses were disallowed on the 1099-B. Section 475 removes wash sale deferral for securities in the trading business going forward.`
      );
    }
    rationale.push(
      'The election cannot be made retroactively — it applies to the year for which the statement was timely filed. The realistic target is the next open window.'
    );
    estimatedImpact = Math.min(capitalLossTrapped, 100000) * 0.3;
  } else if (!netTradingLoss && securitiesNet > 0 && shortTerm >= securitiesNet * 0.85) {
    recommended = 'elect_475_securities';
    rationale.push(
      'Gains are almost entirely short-term, so the long-term rate given up by the election has little value, while wash sale relief and ordinary loss protection do.'
    );
  } else if (unrealized > Math.max(50000, Math.abs(securitiesNet))) {
    recommended = 'defer_decision';
    rationale.push(
      `Open positions carry $${unrealized.toLocaleString()} of unrealized gain that a first-year election would mark to market and tax immediately. Model the section 481(a) adjustment before committing.`
    );
  } else {
    recommended = 'do_not_elect';
    rationale.push('Nothing in the current facts creates enough wash sale or capital loss friction to justify giving up long-term rates.');
  }

  if (hasSec1256(answers)) {
    rationale.push(
      `Section 1256 contracts already receive 60% long-term / 40% short-term treatment and are marked to market by statute. Keep the 475 election securities-only under 475(f)(1) unless there is a specific reason to sweep commodities in.`
    );
  }

  if (hasInstrument(answers, 'crypto')) {
    rationale.push(
      'Digital assets are treated as property, not securities, so they are outside a 475(f)(1) securities election and outside the section 1091 wash sale rule as currently written. Do not assume either applies — flag for a written position.'
    );
  }

  return {
    currentState,
    recommended,
    rationale,
    tradeoffs: { pro, con },
    deadlines: deadlines.sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    form3115Required: elected ? !form3115Filed : recommended.startsWith('elect_475'),
    estimatedImpact,
  };
}

export const ELECTION_AUTHORITIES = AUTH;
