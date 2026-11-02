/**
 * TraderTaxHQ — entity structure modelling.
 *
 * The problem this solves: trading gains are not earned income, so a trader
 * with no wages has no compensation base for a retirement plan deduction and
 * no vehicle for the self-employed health insurance deduction. The standard
 * answer is an S corporation (usually a management company paid by the trading
 * entity) that pays the trader reasonable W-2 compensation, which then supports
 * a Solo 401(k) and section 162(l) health premiums.
 *
 * The model below prices that trade-off: payroll tax cost against the value of
 * the deductions the compensation unlocks.
 */

import { EntityAssessment, EntityScenario, IntakeAnswers } from '@/types/tradertax';
import { getTaxYearConfig, marginalRate } from './taxYearConfig';
import { has, num, str } from './intakeSchema';

/** Administrative drag of running an entity: formation amortization, payroll service, extra return. */
const DEFAULT_ADMIN_COST = 2400;

export interface EntityModelInputs {
  taxYear: number;
  marginalRate: number;
  tradingIncome: number;
  otherEarnedIncome: number;
  healthPremiums: number;
  age: number;
  wantsRetirement: boolean;
  existingDeferrals: number;
}

/**
 * Solo 401(k) capacity for a given W-2 compensation.
 * Employee deferral is capped by the annual limit and by compensation; the
 * employer contribution is 25% of W-2 compensation; the combined total is
 * capped by the annual additions limit.
 */
export function solo401kCapacity(comp: number, taxYear: number, age: number, existingDeferrals = 0) {
  const cfg = getTaxYearConfig(taxYear);
  const catchUp =
    age >= 60 && age <= 63
      ? cfg.catchUp401kAge60to63
      : age >= 50
      ? cfg.catchUp401kAge50
      : 0;

  const deferralRoom = Math.max(0, cfg.elective401kDeferral - Math.max(0, existingDeferrals));
  const employee = Math.min(deferralRoom, Math.max(0, comp));
  const employer = Math.min(comp * 0.25, Math.max(0, cfg.definedContributionLimit - employee));
  const total = Math.min(employee + employer + catchUp, cfg.definedContributionLimit + catchUp);

  return { employee, employer, catchUp, total };
}

/** Employer + employee FICA on W-2 compensation (the S-corp owner bears both). */
export function payrollTaxOn(comp: number, taxYear: number, otherWages = 0): number {
  const cfg = getTaxYearConfig(taxYear);
  const ssBaseRemaining = Math.max(0, cfg.socialSecurityWageBase - Math.max(0, otherWages));
  const ssWages = Math.min(Math.max(0, comp), ssBaseRemaining);
  return ssWages * cfg.socialSecurityRate + Math.max(0, comp) * cfg.medicareRate;
}

/**
 * Compensation that efficiently funds the target deductions. Enough to carry
 * the elective deferral plus the 25% employer piece and the health premiums,
 * without paying FICA on dollars that buy nothing.
 */
export function targetCompensation(taxYear: number, age: number, healthPremiums: number, existingDeferrals: number): number {
  const cfg = getTaxYearConfig(taxYear);
  const deferralRoom = Math.max(0, cfg.elective401kDeferral - Math.max(0, existingDeferrals));
  // Employer piece is 25% of comp, so comp needed for the employer slice alone
  // is bounded by the annual additions limit.
  const compForEmployer = Math.min(cfg.compensationLimit, (cfg.definedContributionLimit - deferralRoom) / 0.25);
  const base = Math.max(deferralRoom, Math.min(compForEmployer, 60000));
  return Math.round(Math.max(base, healthPremiums) / 1000) * 1000;
}

export function assessEntity(answers: IntakeAnswers, taxYear: number, ttsSupported: boolean): EntityAssessment {
  const cfg = getTaxYearConfig(taxYear);
  const filingStatus = (str(answers, 'filing_status', 'single') || 'single') as keyof typeof cfg.ordinaryBrackets;

  const w2 = num(answers, 'w2_income') + num(answers, 'spouse_w2_income');
  const otherIncome =
    num(answers, 'self_employment_income') +
    num(answers, 'rental_k1_income') +
    num(answers, 'interest_dividends');
  const tradingIncome =
    num(answers, 'securities_net_gain') +
    num(answers, 'sec1256_net_gain') +
    num(answers, 'crypto_net_gain') +
    num(answers, 'forex_net_gain');

  const grossIncome = w2 + otherIncome + Math.max(0, tradingIncome);
  const taxableIncome = Math.max(0, grossIncome - cfg.standardDeduction[filingStatus as keyof typeof cfg.standardDeduction]);
  const rate = marginalRate(taxableIncome, cfg.ordinaryBrackets[filingStatus]);

  const age = num(answers, 'age', 40);
  const healthPremiums = num(answers, 'health_premiums');
  const eligibleForHealthDeduction =
    ['self_purchased', 'none'].includes(str(answers, 'health_insurance_source', 'none')) && healthPremiums > 0;
  const existingDeferrals = num(answers, 'employer_plan_deferrals');
  const entityExists = has(answers, 'entity_exists');
  const entityType = str(answers, 'entity_type', entityExists ? 'smllc' : 'individual');
  const runsPayroll = has(answers, 'entity_runs_payroll');
  const currentComp = num(answers, 'officer_comp');

  const scenarios: EntityScenario[] = [];

  // --- Scenario 1: stay as-is ----------------------------------------------
  const currentRetirement = runsPayroll
    ? solo401kCapacity(currentComp, taxYear, age, existingDeferrals).total
    : 0;
  const currentPayroll = runsPayroll ? payrollTaxOn(currentComp, taxYear, w2) : 0;
  const currentHealth = runsPayroll && eligibleForHealthDeduction ? healthPremiums : 0;
  scenarios.push({
    key: 'current',
    label: entityExists ? `Current structure (${entityType})` : 'Sole proprietor / individual',
    description: entityExists
      ? 'Keep the entity and compensation exactly as they are today.'
      : 'Trade in your own name and report the trading business on Schedule C with gains on Schedule D or Form 4797.',
    officerComp: runsPayroll ? currentComp : 0,
    payrollTaxCost: currentPayroll,
    retirementDeduction: currentRetirement,
    healthInsuranceDeduction: currentHealth,
    otherDeductions: 0,
    adminCost: entityExists ? DEFAULT_ADMIN_COST : 0,
    taxBenefit: (currentRetirement + currentHealth) * rate,
    netBenefit:
      (currentRetirement + currentHealth) * rate - currentPayroll - (entityExists ? DEFAULT_ADMIN_COST : 0),
    notes: runsPayroll
      ? []
      : [
          'Trading gains are not earned income, so with no W-2 compensation there is no base for a retirement plan contribution and no section 162(l) health insurance deduction.',
        ],
  });

  // --- Scenario 2: S corporation paying reasonable compensation -------------
  const targetComp = targetCompensation(taxYear, age, eligibleForHealthDeduction ? healthPremiums : 0, existingDeferrals);
  const affordableComp = Math.max(0, Math.min(targetComp, Math.max(0, tradingIncome) * 0.6));
  const sCorpRetirement = solo401kCapacity(affordableComp, taxYear, age, existingDeferrals).total;
  const sCorpPayroll = payrollTaxOn(affordableComp, taxYear, w2);
  const sCorpHealth = eligibleForHealthDeduction ? healthPremiums : 0;
  const sCorpBenefit = (sCorpRetirement + sCorpHealth) * rate;
  scenarios.push({
    key: 's_corp',
    label: 'S corporation (management company)',
    description:
      'The trading entity pays an administration fee to an S corporation, which pays the trader reasonable W-2 compensation. That compensation supports a Solo 401(k) and section 162(l) health premiums.',
    officerComp: affordableComp,
    payrollTaxCost: sCorpPayroll,
    retirementDeduction: sCorpRetirement,
    healthInsuranceDeduction: sCorpHealth,
    otherDeductions: 0,
    adminCost: DEFAULT_ADMIN_COST,
    taxBenefit: sCorpBenefit,
    netBenefit: sCorpBenefit - sCorpPayroll - DEFAULT_ADMIN_COST,
    notes: [
      'Compensation must be reasonable for services actually rendered, and it must be supported by real administrative work.',
      'Health premiums paid by the S corporation are included in W-2 box 1 but are not subject to FICA, then deducted above the line.',
      'The trading profits themselves are not subject to self-employment tax — only the W-2 compensation is.',
    ],
  });

  // --- Scenario 3: trading partnership + S-corp general partner -------------
  const partnershipBenefit = sCorpBenefit;
  scenarios.push({
    key: 'partnership_scorp',
    label: 'Trading partnership with S-corp general partner',
    description:
      'A multi-member trading LLC taxed as a partnership, with an S corporation as the general partner receiving an administration fee. Adds a partnership return and a second layer of admin.',
    officerComp: affordableComp,
    payrollTaxCost: sCorpPayroll,
    retirementDeduction: sCorpRetirement,
    healthInsuranceDeduction: sCorpHealth,
    otherDeductions: 0,
    adminCost: DEFAULT_ADMIN_COST * 1.75,
    taxBenefit: partnershipBenefit,
    netBenefit: partnershipBenefit - sCorpPayroll - DEFAULT_ADMIN_COST * 1.75,
    notes: [
      'Worth it when there is a second family member or partner, outside capital, or a need to segregate investment positions from trading positions.',
      'A new entity can make its section 475(f) election internally within 75 days of inception, which is the cleanest way to start mark-to-market mid-stream.',
    ],
  });

  const bestByNumbers = scenarios.reduce((a, b) => (b.netBenefit > a.netBenefit ? b : a));

  const rationale: string[] = [];
  const cautions: string[] = [];

  // A management company only works if there is a trading business to pay the
  // administration fee. Without trader tax status the fee has no business
  // purpose, so the model is not allowed to recommend a restructure.
  const best = ttsSupported ? bestByNumbers : scenarios[0];

  if (!ttsSupported) {
    cautions.push(
      'An entity does not create trader tax status. Without qualifying activity the expenses are not deductible as a trade or business, and the structure only adds cost.'
    );
    if (bestByNumbers.key !== 'current') {
      rationale.push(
        `On the numbers alone ${bestByNumbers.label} would net an estimated $${Math.round(
          bestByNumbers.netBenefit
        ).toLocaleString()}, but that benefit depends on a trading business paying an administration fee. Establish trader tax status first, then revisit the structure.`
      );
    }
  }

  if (best.key === 'current') {
    rationale.push(
      `At a ${Math.round(rate * 100)}% marginal rate the deductions an entity would unlock do not cover the payroll tax and administrative cost. Stay put and revisit if trading income or health premiums rise.`
    );
  } else {
    rationale.push(
      `${best.label} nets an estimated $${Math.round(best.netBenefit).toLocaleString()} at a ${Math.round(rate * 100)}% marginal rate: $${Math.round(
        best.taxBenefit
      ).toLocaleString()} of deduction value against $${Math.round(best.payrollTaxCost).toLocaleString()} of payroll tax and $${Math.round(
        best.adminCost
      ).toLocaleString()} of administration.`
    );
    rationale.push(
      `Target compensation of about $${affordableComp.toLocaleString()} funds the Solo 401(k) without paying FICA on dollars that buy no deduction.`
    );
  }

  if (tradingIncome <= 0) {
    cautions.push(
      'Trading income is at or below zero for the year, so there is nothing to pay an administration fee out of. Revisit the structure in a profitable year.'
    );
  }

  if (!eligibleForHealthDeduction && healthPremiums > 0) {
    cautions.push(
      'Health premiums are covered through an employer plan, so the section 162(l) deduction is unavailable — that piece of the benefit drops out.'
    );
  }

  cautions.push(
    'Entity trading accounts must actually be opened and traded in the entity’s name. Trading in a personal account while deducting through an entity is the fastest way to lose the structure on exam.'
  );

  return {
    currentStructure: entityExists ? `${entityType}${runsPayroll ? ' with payroll' : ' without payroll'}` : 'Individual',
    scenarios,
    recommended: best.key,
    rationale,
    cautions,
  };
}
