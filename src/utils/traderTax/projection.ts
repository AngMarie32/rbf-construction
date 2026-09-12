/**
 * TraderTaxHQ — federal tax projection for a trading client.
 *
 * This is a planning estimate, not a return calculation. It exists to answer
 * the three questions that come up on every consultation: what does this year
 * look like, how much of the loss is actually usable, and what should the
 * client be paying in estimates.
 *
 * Deliberately out of scope: AMT, credits, itemized deduction phase-outs,
 * state tax, QBI computation, and passive activity limits. Those are called
 * out in `assumptions` rather than silently ignored.
 */

import { IntakeAnswers, TaxProjection, TtsTier } from '@/types/tradertax';
import { getTaxYearConfig, marginalRate, taxFromBrackets } from './taxYearConfig';
import { has, num, str } from './intakeSchema';

export function projectTax(
  answers: IntakeAnswers,
  taxYear: number,
  opts: { ttsTier: TtsTier; mtmElected: boolean }
): TaxProjection {
  const cfg = getTaxYearConfig(taxYear);
  const filingStatus = (str(answers, 'filing_status', 'single') || 'single') as keyof typeof cfg.ordinaryBrackets;
  const assumptions: string[] = [];

  // --- Income components ----------------------------------------------------
  const w2 = num(answers, 'w2_income') + num(answers, 'spouse_w2_income');
  const se = num(answers, 'self_employment_income');
  const other = num(answers, 'rental_k1_income');
  const portfolio = num(answers, 'interest_dividends');

  const securitiesNet = num(answers, 'securities_net_gain');
  const shortTermRaw = num(answers, 'short_term_portion', securitiesNet);
  const shortTerm = Math.abs(shortTermRaw) > Math.abs(securitiesNet) ? securitiesNet : shortTermRaw;
  const longTerm = securitiesNet - shortTerm;
  const sec1256 = num(answers, 'sec1256_net_gain');
  const crypto = num(answers, 'crypto_net_gain');
  const forex = num(answers, 'forex_net_gain');
  const carryforward = num(answers, 'capital_loss_carryforward');
  const washAddback = num(answers, 'wash_sale_disallowed');
  const unrealized = num(answers, 'unrealized_open_positions');

  const sec1256Short = sec1256 * cfg.sec1256ShortPortion;
  const sec1256Long = sec1256 * cfg.sec1256LongPortion;

  // --- Trading business expenses (only if TTS is supported) -----------------
  const ttsSupported = opts.ttsTier === 'strong' || opts.ttsTier === 'defensible';
  const rawExpenses =
    num(answers, 'exp_data_software') +
    num(answers, 'exp_education') +
    num(answers, 'exp_equipment') +
    num(answers, 'exp_professional') +
    num(answers, 'exp_other');
  const marginInterest = num(answers, 'exp_margin_interest');
  const homeOfficeDeduction = computeHomeOffice(answers);
  const businessExpenses = ttsSupported ? rawExpenses + marginInterest + homeOfficeDeduction : 0;

  if (!ttsSupported && rawExpenses + marginInterest > 0) {
    assumptions.push(
      `$${(rawExpenses + marginInterest).toLocaleString()} of trading expenses are excluded because trader tax status is not supported. Investment expenses are not deductible through 2025 under section 67(g), and investment interest would be limited by section 163(d).`
    );
  }

  // --- Ordinary vs capital split -------------------------------------------
  let tradingOrdinary = 0;
  let capitalShort = 0;
  let capitalLong = 0;

  if (opts.mtmElected) {
    // Section 475: securities gains and losses are ordinary, reported on Form 4797.
    tradingOrdinary += securitiesNet;
    assumptions.push(
      'Securities results are treated as ordinary under the section 475(f) election and reported on Form 4797, not Schedule D.'
    );
    if (unrealized !== 0) {
      tradingOrdinary += unrealized;
      assumptions.push(
        `Year-end open positions of $${unrealized.toLocaleString()} are marked to market and included in ordinary income.`
      );
    }
  } else {
    capitalShort += shortTerm;
    capitalLong += longTerm;
  }

  // Section 1256 is marked to market by statute and split 60/40 unless the
  // election reaches commodities.
  const mtmCoversCommodities = opts.mtmElected && str(answers, 'sec475_scope', 'securities') !== 'securities';
  if (mtmCoversCommodities) {
    tradingOrdinary += sec1256;
    assumptions.push('Section 1256 results are ordinary because the 475(f) election covers commodities.');
  } else {
    capitalShort += sec1256Short;
    capitalLong += sec1256Long;
  }

  // Digital assets are property — outside a securities 475(f)(1) election.
  capitalShort += crypto;
  if (crypto !== 0) {
    assumptions.push(
      'Digital asset results are treated as short-term capital. Confirm holding periods; long-term positions are taxed at preferential rates.'
    );
  }

  // Forex is ordinary under section 988 absent a capital election.
  if (has(answers, 'sec988_capital_election')) {
    capitalShort += forex;
  } else {
    tradingOrdinary += forex;
    if (forex !== 0) {
      assumptions.push('Forex results are ordinary under section 988 because no capital gain election was made.');
    }
  }

  // --- Capital loss limitation ---------------------------------------------
  const netCapital = capitalShort + capitalLong + carryforward;
  const lossLimit = cfg.capitalLossLimit[filingStatus as keyof typeof cfg.capitalLossLimit] ?? 3000;

  let allowableCapitalLoss = 0;
  let capitalIncluded = 0;
  let capitalLossCarryforward = 0;

  if (netCapital >= 0) {
    capitalIncluded = netCapital;
  } else {
    allowableCapitalLoss = Math.min(lossLimit, -netCapital);
    capitalIncluded = -allowableCapitalLoss;
    capitalLossCarryforward = -(netCapital + allowableCapitalLoss);
    assumptions.push(
      `Net capital loss of $${Math.abs(netCapital).toLocaleString()} is limited to $${allowableCapitalLoss.toLocaleString()} this year under section 1211(b); $${capitalLossCarryforward.toLocaleString()} carries forward.`
    );
  }

  // --- Taxable income -------------------------------------------------------
  const ordinaryIncome = w2 + se + other + portfolio + tradingOrdinary - businessExpenses;
  const agi = ordinaryIncome + capitalIncluded;
  const standardDeduction = cfg.standardDeduction[filingStatus as keyof typeof cfg.standardDeduction];
  const deduction = has(answers, 'itemizes') ? standardDeduction : standardDeduction;
  if (has(answers, 'itemizes')) {
    assumptions.push('Itemized deductions were flagged but not supplied — the standard deduction is used as a floor.');
  }

  const taxableIncome = Math.max(0, agi - deduction);

  // Preferential rates apply to the net long-term portion actually included.
  const preferentialIncome = netCapital > 0 ? Math.max(0, Math.min(capitalLong, netCapital)) : 0;
  const ordinaryTaxable = Math.max(0, taxableIncome - preferentialIncome);

  const ordinaryTax = taxFromBrackets(ordinaryTaxable, cfg.ordinaryBrackets[filingStatus]);
  const ltcgTax = preferentialTax(preferentialIncome, ordinaryTaxable, cfg.ltcgBrackets[filingStatus]);
  const rate = marginalRate(ordinaryTaxable, cfg.ordinaryBrackets[filingStatus]);

  // --- NIIT -----------------------------------------------------------------
  // Trading in financial instruments or commodities is a section 1411(c)(2)(A)
  // trade or business, so its income is net investment income — trader tax
  // status does not take trading gains out of NIIT. Expenses properly
  // allocable to that business reduce the base.
  const niitThreshold = cfg.niitThreshold[filingStatus as keyof typeof cfg.niitThreshold];
  const netInvestmentIncome = Math.max(
    0,
    capitalIncluded + portfolio + tradingOrdinary - businessExpenses
  );
  const niit = Math.max(0, Math.min(netInvestmentIncome, agi - niitThreshold)) * cfg.niitRate;
  if (niit > 0) {
    assumptions.push(
      `Net investment income tax of $${Math.round(niit).toLocaleString()} is applied to $${Math.round(
        netInvestmentIncome
      ).toLocaleString()} of net investment income. Trading in financial instruments is a section 1411(c)(2)(A) trade or business, so trader tax status does not exclude trading income from NIIT; expenses allocable to the trading business reduce the base.`
    );
  }

  const estimatedFederalTax = ordinaryTax + ltcgTax + niit;

  // --- Estimated payments and safe harbor ----------------------------------
  const paid = num(answers, 'estimated_payments_made') + num(answers, 'withholding');
  const priorTax = num(answers, 'prior_year_total_tax');
  const priorAgi = num(answers, 'prior_year_agi');
  const safeHarborPct =
    priorAgi > cfg.safeHarborHighIncomeAgi ? cfg.safeHarborHighIncomePct : cfg.safeHarborPriorYearPct;
  const priorYearSafeHarbor = priorTax * safeHarborPct;
  const currentYearSafeHarbor = estimatedFederalTax * cfg.safeHarborCurrentYearPct;
  const safeHarborTarget = priorTax > 0 ? Math.min(priorYearSafeHarbor, currentYearSafeHarbor) : currentYearSafeHarbor;

  assumptions.push(
    priorTax > 0
      ? `Safe harbor is the lesser of ${Math.round(safeHarborPct * 100)}% of prior-year tax ($${Math.round(priorYearSafeHarbor).toLocaleString()}) and 90% of current-year tax ($${Math.round(currentYearSafeHarbor).toLocaleString()}).`
      : 'Prior-year tax was not provided, so the safe harbor falls back to 90% of the projected current-year tax.'
  );
  assumptions.push(
    'Federal only. State tax, AMT, credits, and the QBI deduction are excluded from this projection.'
  );

  const remaining = Math.max(0, safeHarborTarget - paid);

  return {
    ordinaryIncome,
    tradingOrdinary,
    capitalShortTerm: capitalShort,
    capitalLongTerm: capitalLong,
    sec1256Net: sec1256,
    sec1256ShortPortion: sec1256Short,
    sec1256LongPortion: sec1256Long,
    allowableCapitalLoss,
    capitalLossCarryforward,
    washSaleAddback: washAddback,
    estimatedTaxableIncome: taxableIncome,
    marginalRate: rate,
    estimatedFederalTax,
    niitExposure: niit,
    estimatedPaymentsMade: paid,
    projectedBalanceDue: estimatedFederalTax - paid,
    safeHarborTarget,
    quarterlyRecommendation: Math.ceil(remaining / 4 / 100) * 100,
    assumptions,
  };
}

function preferentialTax(
  preferentialIncome: number,
  ordinaryTaxable: number,
  bands: { upTo: number; rate: number }[]
): number {
  if (preferentialIncome <= 0) return 0;
  let remaining = preferentialIncome;
  let position = ordinaryTaxable;
  let tax = 0;
  for (const band of bands) {
    if (remaining <= 0) break;
    const room = Math.max(0, band.upTo - position);
    const slice = Math.min(remaining, room);
    tax += slice * band.rate;
    remaining -= slice;
    position += slice;
  }
  return tax;
}

function computeHomeOffice(answers: IntakeAnswers): number {
  if (!has(answers, 'home_office')) return 0;
  const sqft = num(answers, 'home_office_sqft');
  const total = num(answers, 'home_total_sqft');
  const cost = num(answers, 'home_annual_cost');
  if (!sqft || !total || !cost) return 0;
  const actual = cost * Math.min(1, sqft / total);
  const simplified = Math.min(300, sqft) * 5; // safe harbor, Rev. Proc. 2013-13
  return Math.max(actual, simplified);
}
