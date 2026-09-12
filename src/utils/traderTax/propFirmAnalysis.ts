/**
 * TraderTaxHQ — prop firm / funded account analysis.
 *
 * A funded trader is not a trader for tax purposes in the way a self-directed
 * trader is. They are usually being paid by a firm for performance, and the
 * firm usually reports it on a Form 1099-NEC. That single fact changes almost
 * everything:
 *
 *   - the income is ORDINARY and lands on Schedule C, not Schedule D
 *   - it is SELF-EMPLOYMENT income, so 15.3% self-employment tax applies —
 *     the opposite of a self-directed trader, whose gains escape SE tax
 *   - section 475 is largely beside the point: there are no securities held
 *     for the trader's own account to mark to market
 *   - trader tax status matters much less, because Schedule C is already
 *     available for the expenses
 *   - but the income IS earned income, which means a Solo 401(k) works with no
 *     entity at all, and the section 162(l) health insurance deduction is
 *     available
 *   - and an S corporation now serves a completely different purpose: shrinking
 *     the SE tax base rather than creating earned income
 *
 * Nothing here is settled law applied mechanically. Where the characterization
 * is genuinely contested, this module says so rather than picking for you.
 */

import {
  AnalysisFinding,
  FilingStatus,
  IntakeAnswers,
  RecommendedPosition,
} from '@/types/tradertax';
import { getTaxYearConfig, marginalRate } from './taxYearConfig';
import { has, num, str } from './intakeSchema';

export type PropCharacterization =
  | 'schedule_c_se'
  | 'partnership_k1'
  | 'capital_1099b'
  | 'unreported_foreign'
  | 'undetermined'
  | 'not_applicable';

export interface SelfEmploymentTax {
  netProfit: number;
  netEarnings: number;
  socialSecurity: number;
  medicare: number;
  additionalMedicare: number;
  total: number;
  deductibleHalf: number;
}

export interface PropScenario {
  key: 'sole_prop' | 's_corp';
  label: string;
  description: string;
  reasonableComp: number;
  employmentTax: number;
  retirementCapacity: number;
  adminCost: number;
  qbiEstimate: number;
  netBenefit: number;
  notes: string[];
}

export interface PropFirmAssessment {
  applicable: boolean;
  characterization: PropCharacterization;
  characterizationNote: string;
  grossPayouts: number;
  deductibleFees: number;
  netProfit: number;
  se: SelfEmploymentTax | null;
  qbiEstimate: number;
  qbiNote: string;
  retirementCapacity: number;
  healthInsuranceDeduction: number;
  scenarios: PropScenario[];
  recommendedStructure: string;
  hobbyLossRisk: 'none' | 'watch' | 'high';
  findings: AnalysisFinding[];
  positions: RecommendedPosition[];
}

const EMPTY: PropFirmAssessment = {
  applicable: false,
  characterization: 'not_applicable',
  characterizationNote: '',
  grossPayouts: 0,
  deductibleFees: 0,
  netProfit: 0,
  se: null,
  qbiEstimate: 0,
  qbiNote: '',
  retirementCapacity: 0,
  healthInsuranceDeduction: 0,
  scenarios: [],
  recommendedStructure: 'sole_prop',
  hobbyLossRisk: 'none',
  findings: [],
  positions: [],
};

/** Administrative drag of running payroll and a second return. */
const S_CORP_ADMIN_COST = 2400;

/** SE tax applies to 92.35% of net profit (IRC sec. 1402(a)(12)). */
const SE_BASE_FACTOR = 0.9235;

export function computeSelfEmploymentTax(
  netProfit: number,
  taxYear: number,
  filingStatus: FilingStatus,
  /**
   * The taxpayer's OWN W-2 wages. Only these consume their Social Security
   * wage base — a spouse has their own base, so joint filers must not pool
   * them here.
   */
  ownWages = 0,
  /**
   * Wages counted toward the additional Medicare tax threshold, which IS
   * measured on combined income for joint filers. Defaults to own wages.
   */
  householdWages = ownWages
): SelfEmploymentTax {
  const cfg = getTaxYearConfig(taxYear);
  const netEarnings = Math.max(0, netProfit) * SE_BASE_FACTOR;

  const ssRemaining = Math.max(0, cfg.socialSecurityWageBase - Math.max(0, ownWages));
  const ssBase = Math.min(netEarnings, ssRemaining);
  const socialSecurity = ssBase * cfg.socialSecurityRate;
  const medicare = netEarnings * cfg.medicareRate;

  const threshold = cfg.additionalMedicareThreshold[filingStatus] ?? 200000;
  const combined = netEarnings + Math.max(0, householdWages);
  const additionalMedicare = Math.max(0, combined - threshold) * cfg.additionalMedicareRate;

  const total = socialSecurity + medicare + additionalMedicare;

  return {
    netProfit,
    netEarnings,
    socialSecurity,
    medicare,
    additionalMedicare,
    // The employer-equivalent half is deductible above the line; the
    // additional Medicare tax is not.
    deductibleHalf: (socialSecurity + medicare) / 2,
    total,
  };
}

/**
 * Solo 401(k) capacity for a sole proprietor. Unlike a self-directed trader,
 * a funded trader already has earned income, so no entity is required.
 */
export function soloCapacityOnSelfEmployment(
  netProfit: number,
  taxYear: number,
  age: number,
  existingDeferrals = 0
) {
  const cfg = getTaxYearConfig(taxYear);
  const se = computeSelfEmploymentTax(netProfit, taxYear, 'single');
  const base = Math.max(0, netProfit - se.deductibleHalf);

  const catchUp =
    age >= 60 && age <= 63 ? cfg.catchUp401kAge60to63 : age >= 50 ? cfg.catchUp401kAge50 : 0;
  const deferralRoom = Math.max(0, cfg.elective401kDeferral - Math.max(0, existingDeferrals));
  const employee = Math.min(deferralRoom, base);
  // 20% of net earnings for a sole proprietor — the equivalent of 25% of
  // compensation once the contribution's own effect is backed out.
  const employer = Math.min(base * 0.2, Math.max(0, cfg.definedContributionLimit - employee));

  return {
    employee,
    employer,
    catchUp: Math.min(catchUp, Math.max(0, base - employee - employer)),
    total: Math.min(employee + employer + catchUp, cfg.definedContributionLimit + catchUp),
  };
}

function characterize(answers: IntakeAnswers): { code: PropCharacterization; note: string } {
  const form = str(answers, 'prop_1099_type', 'none_unsure');
  switch (form) {
    case 'nec':
      return {
        code: 'schedule_c_se',
        note:
          'The firm reported the payouts on Form 1099-NEC as nonemployee compensation. The default treatment is business income on Schedule C, subject to self-employment tax. Reporting it anywhere else invites a matching notice, so a contrary position needs to be documented before filing, not after.',
      };
    case 'misc':
      return {
        code: 'schedule_c_se',
        note:
          'The firm reported the payouts on Form 1099-MISC. Where the amount is in the nonemployee compensation or other income box, establish which — the box drives whether this is Schedule C business income or other income, and whether self-employment tax applies.',
      };
    case 'k1':
      return {
        code: 'partnership_k1',
        note:
          'The firm issued a Schedule K-1, so the arrangement is being treated as a partnership interest. Whether the allocated income carries self-employment tax depends on the partner’s status and the agreement — read the K-1 codes and the operating agreement rather than assuming.',
      };
    case 'b':
      return {
        code: 'capital_1099b',
        note:
          'The firm issued a Form 1099-B, which means the arrangement is being reported as the trader’s own account activity rather than as compensation. Capital treatment follows, and the self-directed analysis applies instead.',
      };
    case 'none_foreign':
      return {
        code: 'unreported_foreign',
        note:
          'A firm outside the United States generally issues no US information return. The income is still fully reportable. The absence of a 1099 changes nothing about the obligation, and it removes the paper trail that would otherwise support the figures — so the payout records have to come from the firm’s dashboard and the receiving account.',
      };
    default:
      return {
        code: 'undetermined',
        note:
          'No tax form has been identified. Get the actual form from the firm’s portal before filing — the form drives the treatment, and reconstructing it after a notice is far more expensive.',
      };
  }
}

export function assessPropFirm(answers: IntakeAnswers, taxYear: number): PropFirmAssessment {
  if (!has(answers, 'prop_firm')) return EMPTY;

  const cfg = getTaxYearConfig(taxYear);
  const filingStatus = (str(answers, 'filing_status', 'single') || 'single') as FilingStatus;
  const age = num(answers, 'age', 40);
  const otherWages = num(answers, 'w2_income');

  const { code, note } = characterize(answers);

  const grossPayouts = num(answers, 'prop_payouts_total');
  const evalFees = num(answers, 'prop_eval_fees');
  const platformFees = num(answers, 'prop_platform_fees');
  const otherBusinessExpenses =
    num(answers, 'exp_data_software') + num(answers, 'exp_education') + num(answers, 'exp_other');
  const deductibleFees = evalFees + platformFees;
  const netProfit = grossPayouts - deductibleFees - otherBusinessExpenses;

  const findings: AnalysisFinding[] = [];
  const positions: RecommendedPosition[] = [];

  const seApplies = code === 'schedule_c_se' || code === 'unreported_foreign';
  const householdWages = otherWages + num(answers, 'spouse_w2_income');
  const se = seApplies
    ? computeSelfEmploymentTax(netProfit, taxYear, filingStatus, otherWages, householdWages)
    : null;

  // --- Characterization ----------------------------------------------------
  findings.push({
    id: 'prop_characterization',
    area: 'Prop firm income',
    severity: code === 'undetermined' ? 'high' : 'critical',
    statement:
      code === 'schedule_c_se'
        ? `Funded account payouts of $${grossPayouts.toLocaleString()} are self-employment income, not capital gain.`
        : code === 'unreported_foreign'
        ? `Payouts of $${grossPayouts.toLocaleString()} from a non-US firm are reportable with no 1099 to match against.`
        : code === 'partnership_k1'
        ? 'Payouts arrive on a Schedule K-1, so partnership rules govern.'
        : code === 'capital_1099b'
        ? 'The firm reports on Form 1099-B, so this is capital, not compensation.'
        : 'The reporting form for the prop payouts has not been identified.',
    detail: note,
    authority: 'IRC sec. 1401, sec. 1402; IRC sec. 6041A; Treas. Reg. sec. 1.1402(a)-2',
    estimatedImpact: se?.total ?? null,
  });

  if (se && se.total > 0) {
    findings.push({
      id: 'prop_se_tax',
      area: 'Self-employment tax',
      severity: se.total > 5000 ? 'high' : 'medium',
      statement: `Self-employment tax of about $${Math.round(se.total).toLocaleString()} on $${Math.round(
        netProfit
      ).toLocaleString()} of net profit.`,
      detail: `Self-employment tax applies to ${Math.round(
        SE_BASE_FACTOR * 100
      )}% of net profit: $${Math.round(se.socialSecurity).toLocaleString()} Social Security${
        se.medicare ? ` and $${Math.round(se.medicare).toLocaleString()} Medicare` : ''
      }${
        se.additionalMedicare > 0
          ? `, plus $${Math.round(se.additionalMedicare).toLocaleString()} additional Medicare tax`
          : ''
      }. Half of the Social Security and Medicare portion is deductible above the line. This is the tax that surprises funded traders — nothing was withheld from the payouts.`,
      authority: 'IRC sec. 1401; sec. 1402(a)(12); sec. 164(f)',
      estimatedImpact: se.total,
    });
  }

  // --- Expenses ------------------------------------------------------------
  if (deductibleFees > 0) {
    findings.push({
      id: 'prop_eval_fees',
      area: 'Deductions',
      severity: 'info',
      statement: `$${deductibleFees.toLocaleString()} of evaluation, reset, and platform fees are deductible business expenses.`,
      detail:
        'Fees paid for evaluations — including the attempts that failed — are ordinary and necessary costs of the activity when it is carried on as a business for profit. Keep the receipts and the firm’s billing history; this is a commonly missed deduction and a commonly challenged one.',
      authority: 'IRC sec. 162(a)',
      estimatedImpact: null,
    });
  }

  // --- Hobby loss ----------------------------------------------------------
  const attempts = num(answers, 'prop_eval_attempts');
  const profitableYears = num(answers, 'prop_profitable_years', -1);
  const status = str(answers, 'prop_status');
  let hobbyLossRisk: PropFirmAssessment['hobbyLossRisk'] = 'none';

  if (netProfit < 0 || status === 'evaluation_only') {
    const neverFunded = status === 'evaluation_only' && grossPayouts === 0;
    hobbyLossRisk = neverFunded || (profitableYears >= 0 && profitableYears < 1) ? 'high' : 'watch';
    findings.push({
      id: 'prop_hobby_loss',
      area: 'Profit motive',
      severity: hobbyLossRisk === 'high' ? 'high' : 'medium',
      statement: neverFunded
        ? `${attempts || 'Several'} evaluation attempts with no payouts — deducting the fees requires a profit motive.`
        : 'A loss year on funded-account activity puts profit motive in issue.',
      detail:
        'Where an activity is not engaged in for profit, deductions are limited under section 183. An activity that produced a profit in three of the last five years is presumed to be for profit; without that, the facts have to carry it — a written plan, records, changes in method after losses, and time devoted. Buying evaluations repeatedly and never getting funded is the fact pattern the section is written for.',
      authority: 'IRC sec. 183; Treas. Reg. sec. 1.183-2(b)',
      estimatedImpact: null,
    });
  }

  // --- QBI -----------------------------------------------------------------
  const taxableEstimate = Math.max(
    0,
    netProfit + otherWages + num(answers, 'spouse_w2_income') - cfg.standardDeduction[filingStatus]
  );
  const qbiThreshold = cfg.qbiThresholdStart[filingStatus];
  const belowThreshold = taxableEstimate <= qbiThreshold;
  const qbiBase = Math.max(0, netProfit - (se?.deductibleHalf ?? 0));
  const qbiEstimate = belowThreshold ? qbiBase * 0.2 : 0;
  const qbiNote = belowThreshold
    ? `Taxable income of about $${Math.round(taxableEstimate).toLocaleString()} is below the $${qbiThreshold.toLocaleString()} threshold, so the qualified business income deduction is available in full regardless of whether the activity is a specified service trade or business.`
    : `Taxable income of about $${Math.round(taxableEstimate).toLocaleString()} exceeds the $${qbiThreshold.toLocaleString()} threshold. Trading is a specified service trade or business under section 199A(d)(2), and if this activity is characterized that way the deduction phases out. Whether performing services for a funded account is "trading" for this purpose is a position that needs to be taken deliberately.`;

  if (qbiEstimate > 0) {
    findings.push({
      id: 'prop_qbi',
      area: 'QBI deduction',
      severity: 'info',
      statement: `Qualified business income deduction of roughly $${Math.round(qbiEstimate).toLocaleString()}.`,
      detail: qbiNote,
      authority: 'IRC sec. 199A',
      estimatedImpact: qbiEstimate * 0.22,
    });
  }

  // --- Retirement and health ----------------------------------------------
  const retirement = soloCapacityOnSelfEmployment(
    netProfit,
    taxYear,
    age,
    num(answers, 'employer_plan_deferrals')
  );
  const healthPremiums = num(answers, 'health_premiums');
  const healthEligible =
    ['self_purchased', 'none'].includes(str(answers, 'health_insurance_source', 'none')) &&
    healthPremiums > 0;
  const healthDeduction = healthEligible ? Math.min(healthPremiums, Math.max(0, netProfit)) : 0;

  const rate = marginalRate(taxableEstimate, cfg.ordinaryBrackets[filingStatus]);

  if (retirement.total > 0) {
    findings.push({
      id: 'prop_retirement',
      area: 'Retirement',
      severity: 'info',
      statement: `A Solo 401(k) can absorb up to about $${Math.round(retirement.total).toLocaleString()} — with no entity required.`,
      detail:
        'This is the one place funded traders are better off than self-directed traders. Schedule C net earnings are earned income, so a Solo 401(k) can be funded directly: the elective deferral plus roughly 20% of net earnings from self-employment. A self-directed trader has to build an S corporation first to get the same result.',
      authority: 'IRC sec. 401(a); sec. 415(c); sec. 401(c)(2)',
      estimatedImpact: retirement.total * rate,
    });
    positions.push({
      code: 'PROP_SOLO_401K',
      title: 'Open a Solo 401(k) against the Schedule C income',
      category: 'retirement',
      recommendation: `Fund up to about $${Math.round(retirement.total).toLocaleString()} — $${Math.round(
        retirement.employee
      ).toLocaleString()} elective deferral plus $${Math.round(
        retirement.employer
      ).toLocaleString()} employer contribution on net earnings.`,
      rationale:
        'No entity is needed. Confirm the plan adoption deadline for the year before relying on it, and note that the elective deferral is shared across all plans if the client also has an employer 401(k).',
      authority: 'IRC sec. 401(c)(2); sec. 415(c)',
      riskLevel: 'low',
      impactEstimate: retirement.total * rate,
      dueDate: null,
    });
  }

  if (healthDeduction > 0) {
    positions.push({
      code: 'PROP_HEALTH_162L',
      title: 'Deduct health insurance premiums above the line',
      category: 'deductions',
      recommendation: `Deduct $${Math.round(healthDeduction).toLocaleString()} of premiums against the Schedule C income.`,
      rationale:
        'The self-employed health insurance deduction is available against net profit from self-employment, capped at that profit, and only for months without access to a subsidized employer plan.',
      authority: 'IRC sec. 162(l)',
      riskLevel: 'low',
      impactEstimate: healthDeduction * rate,
      dueDate: null,
    });
  }

  // --- Structure comparison ------------------------------------------------
  const scenarios: PropScenario[] = [];

  if (seApplies && netProfit > 0) {
    scenarios.push({
      key: 'sole_prop',
      label: 'Sole proprietor (Schedule C)',
      description:
        'Report the payouts and expenses on Schedule C. No entity, no payroll, no second return.',
      reasonableComp: 0,
      employmentTax: se!.total,
      retirementCapacity: retirement.total,
      adminCost: 0,
      qbiEstimate,
      netBenefit: 0,
      notes: [
        'Simplest structure, and the right one until the profit is large enough to carry payroll.',
        'Self-employment tax applies to all net earnings.',
      ],
    });

    // An S corporation pays reasonable compensation and distributes the rest,
    // which removes the distributed portion from the SE tax base.
    const comp = Math.max(0, Math.round((netProfit * 0.6) / 1000) * 1000);
    const distribution = Math.max(0, netProfit - comp);
    const ssRemaining = Math.max(0, cfg.socialSecurityWageBase - otherWages);
    const compFica =
      Math.min(comp, ssRemaining) * cfg.socialSecurityRate + comp * cfg.medicareRate;
    const seSaved = se!.total - compFica;
    // Wages reduce QBI, so the S-corp costs part of the deduction.
    const sCorpQbi = belowThreshold ? Math.max(0, distribution) * 0.2 : 0;
    const qbiCost = Math.max(0, qbiEstimate - sCorpQbi) * rate;
    const netBenefit = seSaved - S_CORP_ADMIN_COST - qbiCost;

    scenarios.push({
      key: 's_corp',
      label: 'S corporation',
      description:
        'The entity receives the payouts, pays the trader reasonable W-2 compensation, and distributes the remainder. Only the compensation carries employment tax.',
      reasonableComp: comp,
      employmentTax: compFica,
      retirementCapacity: retirement.total,
      adminCost: S_CORP_ADMIN_COST,
      qbiEstimate: sCorpQbi,
      netBenefit,
      notes: [
        `Saves about $${Math.round(seSaved).toLocaleString()} of employment tax, against $${S_CORP_ADMIN_COST.toLocaleString()} of payroll and filing cost${
          qbiCost > 0 ? ` and roughly $${Math.round(qbiCost).toLocaleString()} of lost QBI deduction` : ''
        }.`,
        'Compensation must be reasonable for the services actually performed. A nominal salary against a large distribution is the single most audited feature of an S corporation.',
        'Check whether the prop firm will contract with an entity at all — many will not, and paying an entity that is not party to the agreement does not work.',
      ],
    });
  }

  const best = scenarios.length
    ? scenarios.reduce((a, b) => (b.netBenefit > a.netBenefit ? b : a))
    : null;
  const recommendedStructure = best && best.netBenefit > 0 ? best.key : 'sole_prop';

  if (recommendedStructure === 's_corp' && best) {
    findings.push({
      id: 'prop_entity',
      area: 'Structure',
      severity: 'medium',
      statement: `An S corporation models out about $${Math.round(best.netBenefit).toLocaleString()} ahead on this profit level.`,
      detail: best.notes.join(' '),
      authority: 'IRC sec. 1402(a)(2); Rev. Rul. 74-44',
      estimatedImpact: best.netBenefit,
    });
    positions.push({
      code: 'PROP_S_CORP',
      title: 'Consider an S corporation to reduce self-employment tax',
      category: 'entity',
      recommendation: `Reasonable compensation of about $${Math.round(best.reasonableComp).toLocaleString()}, with the remainder distributed.`,
      rationale: best.notes.join(' '),
      authority: 'IRC sec. 1402(a)(2); Rev. Rul. 74-44',
      riskLevel: 'medium',
      impactEstimate: best.netBenefit,
      dueDate: null,
    });
  } else if (seApplies && netProfit > 0) {
    findings.push({
      id: 'prop_entity',
      area: 'Structure',
      severity: 'info',
      statement: 'Stay a sole proprietor for now.',
      detail: `At this profit level the employment tax saved by an S corporation does not cover the payroll and filing cost${
        qbiEstimate > 0 ? ', and the wages would reduce the qualified business income deduction' : ''
      }. Revisit when net profit is consistently higher.`,
      authority: null,
      estimatedImpact: null,
    });
  }

  // --- Estimated tax -------------------------------------------------------
  if (seApplies && netProfit > 0) {
    positions.push({
      code: 'PROP_ESTIMATES',
      title: 'Set aside tax on every payout',
      category: 'estimated_tax',
      recommendation:
        'Move a fixed percentage of each payout into a separate account the day it arrives, and pay quarterly estimates from it.',
      rationale:
        'Nothing is withheld from a prop payout, and the self-employment tax lands on top of income tax. The most common way a funded trader gets into trouble is spending gross payouts and meeting the bill in April.',
      authority: 'IRC sec. 6654',
      riskLevel: 'low',
      impactEstimate: null,
      dueDate: null,
    });
  }

  // --- Foreign firm and crypto payment -------------------------------------
  if (has(answers, 'prop_foreign_firm')) {
    findings.push({
      id: 'prop_foreign',
      area: 'Foreign firm',
      severity: 'high',
      statement: 'Payouts come from a firm outside the United States.',
      detail:
        'No US information return will arrive, and the income is reportable regardless. Establish whether any account holding the funds is foreign — that drives FBAR and possibly Form 8938 — and pull the payout history from the firm’s dashboard while access lasts.',
      authority: '31 U.S.C. sec. 5314; IRC sec. 6038D',
      estimatedImpact: null,
    });
  }

  if (has(answers, 'prop_paid_in_crypto')) {
    findings.push({
      id: 'prop_crypto_payment',
      area: 'Payment method',
      severity: 'medium',
      statement: 'Payouts received in crypto create two taxable events, not one.',
      detail:
        'The payout is ordinary income at the fair market value on the day received, and that value becomes the basis. Converting or spending it later is a separate disposition with its own gain or loss. Capture the received-date value for every payout — reconstructing it later from exchange history is painful and imprecise.',
      authority: 'Notice 2014-21; Rev. Rul. 2019-24',
      estimatedImpact: null,
    });
  }

  // --- Prior-year treatment ------------------------------------------------
  const prior = str(answers, 'prop_prior_treatment');
  if (prior === 'not_reported' || prior === 'capital' || prior === 'other_income') {
    findings.push({
      id: 'prop_prior_treatment',
      area: 'Prior years',
      severity: prior === 'not_reported' ? 'critical' : 'high',
      statement:
        prior === 'not_reported'
          ? 'Prop payouts were not reported in a prior year.'
          : `Prop payouts were previously reported as ${prior === 'capital' ? 'capital gains' : 'other income'}.`,
      detail:
        prior === 'not_reported'
          ? 'Unreported income keeps the assessment period open and, where a 1099 was filed, is already visible to the Service through matching. Sequence the cleanup before taking new positions, and consider whether an amended return is the right vehicle.'
          : 'A prior year reported inconsistently with this year invites a question about both. Decide the correct treatment, then decide whether to amend — changing the answer silently between years is the worst option.',
      authority: 'IRC sec. 6501(c); sec. 6011',
      estimatedImpact: null,
    });
  }

  return {
    applicable: true,
    characterization: code,
    characterizationNote: note,
    grossPayouts,
    deductibleFees,
    netProfit,
    se,
    qbiEstimate,
    qbiNote,
    retirementCapacity: retirement.total,
    healthInsuranceDeduction: healthDeduction,
    scenarios,
    recommendedStructure,
    hobbyLossRisk,
    findings,
    positions,
  };
}
