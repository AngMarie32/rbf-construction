/**
 * TraderTaxHQ — capital loss usability.
 *
 * The second thing a small-scale trader discovers, right after the first
 * losing year: a $40,000 trading loss does not produce a $40,000 deduction.
 * Capital losses offset capital gains without limit, but only $3,000 a year
 * reaches ordinary income, and the rest carries forward indefinitely.
 *
 * At that rate a large loss can take decades to absorb — which is the number
 * that makes people finally read about the section 475 election, and it is
 * the honest headline for this calculator.
 *
 * Wash sales sit on top: a disallowed loss is deferred into the basis of the
 * replacement position, not destroyed — with one exception where it really is
 * gone for good.
 */

import { FilingStatus } from '@/types/tradertax';
import { getTaxYearConfig, marginalRate, taxFromBrackets } from './taxYearConfig';

export interface LossCalculatorInput {
  taxYear: number;
  /** Net capital result for the year. Negative for a loss. */
  netCapitalResult: number;
  /** Losses the broker disallowed under the wash sale rule. */
  washSaleDisallowed: number;
  /** Unused capital loss brought in from prior years, entered positive. */
  priorCarryforward: number;
  otherIncome: number;
  filingStatus: FilingStatus;
  /** Replacement shares bought in an IRA within the 61-day window. */
  iraReplacement: boolean;
}

export interface LossCalculatorResult {
  netAfterCarryforward: number;
  annualLimit: number;
  usableThisYear: number;
  carriesForward: number;
  /** Years to absorb the carryforward at the annual limit, with no future gains. */
  yearsToAbsorb: number | null;
  taxSavedThisYear: number;
  strandedValue: number;
  marginalRate: number;
  washSaleDeferred: number;
  washSalePermanentlyLost: number;
  isGain: boolean;
  headline: string;
  notes: string[];
}

export function calculateLossUsability(input: LossCalculatorInput): LossCalculatorResult {
  const {
    taxYear,
    netCapitalResult,
    washSaleDisallowed,
    priorCarryforward,
    otherIncome,
    filingStatus,
    iraReplacement,
  } = input;

  const cfg = getTaxYearConfig(taxYear);
  const annualLimit = cfg.capitalLossLimit[filingStatus] ?? 3000;
  const notes: string[] = [];

  // Prior carryforward stacks on this year's result.
  const netAfterCarryforward = netCapitalResult - Math.abs(priorCarryforward);
  const isGain = netAfterCarryforward >= 0;

  const totalLoss = isGain ? 0 : Math.abs(netAfterCarryforward);
  const usableThisYear = Math.min(annualLimit, totalLoss);
  const carriesForward = Math.max(0, totalLoss - usableThisYear);

  // Marginal rate on the income the deduction actually offsets.
  const standardDeduction = cfg.standardDeduction[filingStatus];
  const taxable = Math.max(0, otherIncome - standardDeduction);
  const rate = marginalRate(taxable, cfg.ordinaryBrackets[filingStatus]);

  const taxWithout = taxFromBrackets(taxable, cfg.ordinaryBrackets[filingStatus]);
  const taxWith = taxFromBrackets(
    Math.max(0, taxable - usableThisYear),
    cfg.ordinaryBrackets[filingStatus]
  );
  const taxSavedThisYear = Math.max(0, taxWithout - taxWith);

  const yearsToAbsorb = carriesForward > 0 ? Math.ceil(carriesForward / annualLimit) : null;
  const strandedValue = carriesForward * rate;

  // Wash sales: deferred into replacement basis, except where the replacement
  // was bought inside an IRA.
  const washSaleDeferred = iraReplacement ? 0 : Math.max(0, washSaleDisallowed);
  const washSalePermanentlyLost = iraReplacement ? Math.max(0, washSaleDisallowed) : 0;

  if (washSaleDisallowed > 0 && !iraReplacement) {
    notes.push(
      `The $${washSaleDisallowed.toLocaleString()} your broker disallowed under the wash sale rule is deferred, not destroyed. It is added to the basis of the replacement position, so you get it back when you finally close that position and stay out for 30 days.`
    );
  }
  if (washSaleDisallowed > 0 && iraReplacement) {
    notes.push(
      `Because the replacement shares were bought inside an IRA, the $${washSaleDisallowed.toLocaleString()} disallowed loss is gone permanently. There is no basis adjustment available in an IRA to recover it later. This is the single most expensive mistake a small trader can make with a retirement account.`
    );
  }
  if (!isGain && otherIncome === 0) {
    notes.push(
      'With no other income to offset, this year’s $' +
        annualLimit.toLocaleString() +
        ' of usable loss produces little or no actual tax saving. The loss is not wasted — it carries forward — but the benefit arrives in a year when you have income.'
    );
  }
  if (isGain && priorCarryforward > 0) {
    notes.push(
      `Your prior-year carryforward absorbed the gain first, which is exactly what it is for. Carryforwards offset capital gains without any annual limit — the $${annualLimit.toLocaleString()} cap only applies to what is left over against ordinary income.`
    );
  }

  const headline = isGain
    ? netAfterCarryforward > 0
      ? `A net capital gain of $${Math.round(netAfterCarryforward).toLocaleString()} after carryforwards.`
      : 'Your carryforward exactly absorbed this year’s result.'
    : yearsToAbsorb && yearsToAbsorb > 1
    ? `At $${annualLimit.toLocaleString()} a year, this loss takes ${yearsToAbsorb} years to use up.`
    : `All of this loss is usable this year.`;

  return {
    netAfterCarryforward,
    annualLimit,
    usableThisYear,
    carriesForward,
    yearsToAbsorb,
    taxSavedThisYear,
    strandedValue,
    marginalRate: rate,
    washSaleDeferred,
    washSalePermanentlyLost,
    isGain,
    headline,
    notes,
  };
}
