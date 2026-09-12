/**
 * TraderTaxHQ — funded account payout tax estimator.
 *
 * The public-facing calculator. It answers the one question every funded
 * trader asks first: "how much of this payout is actually mine?"
 *
 * It reuses the same self-employment tax and Solo 401(k) code the internal
 * analysis uses, so the number a prospect sees on the marketing page is the
 * number the engine produces on their engagement. A calculator that disagrees
 * with the firm's own analysis is worse than no calculator.
 *
 * Scope, stated plainly because the page states it too: federal only. No state
 * tax, no credits, no AMT, no other deductions. It estimates the tax
 * attributable to the payouts by computing the household tax with and without
 * them — which is the honest way to answer the question, since the marginal
 * rate depends on everything else on the return.
 */

import { FilingStatus } from '@/types/tradertax';
import { getTaxYearConfig, marginalRate, taxFromBrackets } from './taxYearConfig';
import { computeSelfEmploymentTax, soloCapacityOnSelfEmployment } from './propFirmAnalysis';

export interface PayoutCalculatorInput {
  taxYear: number;
  grossPayouts: number;
  evaluationFees: number;
  otherExpenses: number;
  /** The taxpayer's own W-2 wages — these consume their Social Security base. */
  ownW2Wages: number;
  /** Everything else on the return: a spouse's income, other work, interest. */
  otherHouseholdIncome: number;
  filingStatus: FilingStatus;
  age: number;
}

export interface PayoutCalculatorResult {
  netProfit: number;
  selfEmploymentTax: number;
  seSocialSecurity: number;
  seMedicare: number;
  seDeduction: number;
  qbiDeduction: number;
  incomeTaxOnPayouts: number;
  totalTaxOnPayouts: number;
  keepFromPayouts: number;
  /** Share of GROSS payouts that should be set aside. The headline number. */
  setAsidePercent: number;
  perPayoutSetAside: (payout: number) => number;
  quarterlyEstimate: number;
  marginalRate: number;
  feeDeductionValue: number;
  soloCapacity: number;
  soloTaxSaving: number;
  sCorpWorthModelling: boolean;
  notes: string[];
}

export function estimatePayoutTax(input: PayoutCalculatorInput): PayoutCalculatorResult {
  const {
    taxYear,
    grossPayouts,
    evaluationFees,
    otherExpenses,
    ownW2Wages,
    otherHouseholdIncome,
    filingStatus,
    age,
  } = input;

  // Income tax stacks on everything; the Social Security base is personal.
  const householdIncome = Math.max(0, ownW2Wages) + Math.max(0, otherHouseholdIncome);

  const cfg = getTaxYearConfig(taxYear);
  const notes: string[] = [];

  const expenses = Math.max(0, evaluationFees) + Math.max(0, otherExpenses);
  const netProfit = Math.max(0, grossPayouts) - expenses;

  // --- Self-employment tax -------------------------------------------------
  const se = computeSelfEmploymentTax(
    netProfit,
    taxYear,
    filingStatus,
    ownW2Wages,
    householdIncome
  );

  // --- QBI, only where it is clearly available -----------------------------
  const standardDeduction = cfg.standardDeduction[filingStatus];
  const provisionalTaxable = Math.max(
    0,
    householdIncome + netProfit - se.deductibleHalf - standardDeduction
  );
  const qbiThreshold = cfg.qbiThresholdStart[filingStatus];
  const qbiDeduction =
    provisionalTaxable <= qbiThreshold ? Math.max(0, netProfit - se.deductibleHalf) * 0.2 : 0;

  if (provisionalTaxable > qbiThreshold) {
    notes.push(
      `Above $${qbiThreshold.toLocaleString()} of taxable income the qualified business income deduction starts to phase out for trading activity, so this estimate leaves it out. That is the conservative answer, not necessarily the final one.`
    );
  }

  // --- Income tax attributable to the payouts ------------------------------
  // Computed as the difference between the household's tax with and without
  // the funded-account profit, because the rate depends on everything else.
  const baseTaxable = Math.max(0, householdIncome - standardDeduction);
  const baseTax = taxFromBrackets(baseTaxable, cfg.ordinaryBrackets[filingStatus]);

  const withTaxable = Math.max(
    0,
    householdIncome + netProfit - se.deductibleHalf - qbiDeduction - standardDeduction
  );
  const withTax = taxFromBrackets(withTaxable, cfg.ordinaryBrackets[filingStatus]);

  const incomeTaxOnPayouts = Math.max(0, withTax - baseTax);
  const totalTaxOnPayouts = incomeTaxOnPayouts + se.total;
  const keepFromPayouts = Math.max(0, grossPayouts - totalTaxOnPayouts);

  const setAsidePercent =
    grossPayouts > 0 ? Math.min(0.6, totalTaxOnPayouts / grossPayouts) : 0;

  // --- Planning levers -----------------------------------------------------
  const rate = marginalRate(withTaxable, cfg.ordinaryBrackets[filingStatus]);
  const feeDeductionValue = expenses * (rate + (netProfit > 0 ? 0.153 * 0.9235 : 0));

  const solo = soloCapacityOnSelfEmployment(netProfit, taxYear, age);
  const soloTaxSaving = solo.total * rate;

  // Rough screen only — the real comparison prices payroll cost and the QBI
  // the wages give up, and lives in the full analysis.
  const sCorpWorthModelling = netProfit >= 60000;

  if (netProfit <= 0 && grossPayouts > 0) {
    notes.push(
      'Expenses exceed payouts, so there is no self-employment tax this year. A loss year raises its own question — whether the activity is carried on for profit — which is worth answering before deducting the fees.'
    );
  }
  if (grossPayouts > 0 && expenses === 0) {
    notes.push(
      'No evaluation, reset, or platform fees entered. Those are deductible business expenses, including the attempts that failed, and leaving them out overstates the tax.'
    );
  }
  if (se.additionalMedicare > 0) {
    notes.push(
      'Combined income crosses the additional Medicare tax threshold, so an extra 0.9% applies to the excess.'
    );
  }

  return {
    netProfit,
    selfEmploymentTax: se.total,
    seSocialSecurity: se.socialSecurity,
    seMedicare: se.medicare + se.additionalMedicare,
    seDeduction: se.deductibleHalf,
    qbiDeduction,
    incomeTaxOnPayouts,
    totalTaxOnPayouts,
    keepFromPayouts,
    setAsidePercent,
    perPayoutSetAside: (payout: number) => payout * setAsidePercent,
    quarterlyEstimate: Math.ceil(totalTaxOnPayouts / 4 / 25) * 25,
    marginalRate: rate,
    feeDeductionValue,
    soloCapacity: solo.total,
    soloTaxSaving,
    sCorpWorthModelling,
    notes,
  };
}

/** Rounded up to a memorable number a trader can actually apply per payout. */
export function setAsideRule(percent: number): number {
  return Math.min(60, Math.ceil((percent * 100) / 5) * 5);
}
