/**
 * TraderTaxHQ — trader tax status (TTS) factor analysis.
 *
 * There is no statutory or bright-line test for trader status. Courts weigh
 * facts and circumstances, and the recurring factors are frequency, holding
 * period, hours and continuity, volume, and whether the activity is carried on
 * in a businesslike manner with the intent to profit from short-term swings
 * rather than from dividends, interest, or capital appreciation.
 *
 * The benchmarks below are the thresholds practitioners defend in practice —
 * they are guidance for scoring, not authority. Every factor carries the case
 * cite it comes from so the preparer can pressure-test the conclusion.
 */

import { IntakeAnswers, TtsAssessment, TtsFactorResult, TtsTier } from '@/types/tradertax';
import { getTaxYearConfig } from './taxYearConfig';
import { has, list, num } from './intakeSchema';

const AUTHORITY = {
  higgins: 'Higgins v. Commissioner, 312 U.S. 212 (1941)',
  groetzinger: 'Commissioner v. Groetzinger, 480 U.S. 23 (1987)',
  endicott: 'Endicott v. Commissioner, T.C. Memo. 2013-199',
  poppe: 'Poppe v. Commissioner, T.C. Memo. 2015-205',
  chen: 'Chen v. Commissioner, T.C. Memo. 2004-132',
  holsinger: 'Holsinger v. Commissioner, T.C. Memo. 2008-191',
  assaderaghi: 'Assaderaghi v. Commissioner, T.C. Memo. 2014-33',
  nelson: 'Nelson v. Commissioner, T.C. Memo. 2013-259',
};

/** Piecewise linear score: 0 at `poor`, 1 at `strong`. */
function ramp(value: number, poor: number, strong: number): number {
  if (strong === poor) return value >= strong ? 1 : 0;
  const raw = (value - poor) / (strong - poor);
  return Math.min(1, Math.max(0, raw));
}

/** Inverse ramp for metrics where lower is better (e.g. holding period). */
function inverseRamp(value: number, strong: number, poor: number): number {
  if (poor === strong) return value <= strong ? 1 : 0;
  const raw = (poor - value) / (poor - strong);
  return Math.min(1, Math.max(0, raw));
}

export function assessTraderTaxStatus(answers: IntakeAnswers, taxYear: number): TtsAssessment {
  const cfg = getTaxYearConfig(taxYear);
  const factors: TtsFactorResult[] = [];
  const missingData: string[] = [];

  const tradingDays = num(answers, 'trading_days');
  const totalTrades = num(answers, 'total_trades');
  const avgHold = num(answers, 'avg_holding_days', -1);
  const weeklyHours = num(answers, 'weekly_hours');
  const monthsActive = num(answers, 'months_active');
  const longestGap = num(answers, 'longest_gap_days');
  const equity = num(answers, 'avg_account_equity');
  const setup = list(answers, 'business_setup');

  if (!tradingDays) missingData.push('Days traded');
  if (!totalTrades) missingData.push('Total executions');
  if (avgHold < 0) missingData.push('Average holding period');
  if (!weeklyHours) missingData.push('Weekly hours');
  if (!monthsActive) missingData.push('Months active');

  // --- Frequency: days traded as a share of available market days -----------
  const dayRatio = cfg.marketTradingDays ? tradingDays / cfg.marketTradingDays : 0;
  factors.push({
    key: 'frequency_days',
    label: 'Trading frequency (days traded)',
    weight: 0.24,
    score: ramp(dayRatio, 0.25, 0.75),
    observed: `${tradingDays} days (${Math.round(dayRatio * 100)}% of ~${cfg.marketTradingDays} market days)`,
    benchmark: 'Regular activity on most available trading days — roughly 4 days a week',
    authority: AUTHORITY.endicott,
    comment:
      dayRatio >= 0.75
        ? 'Frequency is at the level practitioners defend without qualification.'
        : dayRatio >= 0.5
        ? 'Frequency is defensible but not dominant; pair it with strong hours and short holding periods.'
        : 'Sporadic frequency is the single most common reason trader status is denied on exam.',
  });

  // --- Volume: executions ---------------------------------------------------
  factors.push({
    key: 'volume',
    label: 'Execution volume',
    weight: 0.16,
    score: ramp(totalTrades, 200, 720),
    observed: `${totalTrades.toLocaleString()} executions`,
    benchmark: '~720 executions a year (about 4 round trips a day) is the commonly cited safe zone',
    authority: AUTHORITY.poppe,
    comment:
      totalTrades >= 720
        ? 'Volume comfortably supports a trading business.'
        : totalTrades >= 400
        ? 'Volume is workable; substantiate with the broker activity report.'
        : 'Low volume undercuts the claim — the court in Poppe treated ~60 trades a month as meaningful.',
  });

  // --- Holding period -------------------------------------------------------
  const holdScore = avgHold < 0 ? 0 : inverseRamp(avgHold, 2, 31);
  factors.push({
    key: 'holding_period',
    label: 'Average holding period',
    weight: 0.22,
    score: holdScore,
    observed: avgHold < 0 ? 'Not provided' : `${avgHold} days`,
    benchmark: 'Short-term. An average approaching 31 days weighs against trader status',
    authority: AUTHORITY.endicott,
    comment:
      avgHold >= 0 && avgHold <= 2
        ? 'Holding period is squarely that of a trader seeking daily swings.'
        : avgHold > 31
        ? 'A holding period this long reads as investing, not trading — this is the fact pattern Endicott lost on.'
        : 'Holding period is in the defensible middle; document the intent to profit from short-term movement.',
  });

  // --- Hours ----------------------------------------------------------------
  factors.push({
    key: 'hours',
    label: 'Time devoted',
    weight: 0.18,
    score: ramp(weeklyHours, 10, 30),
    observed: `${weeklyHours} hours/week`,
    benchmark: 'Substantial time — roughly 4+ hours a day, most trading days',
    authority: AUTHORITY.assaderaghi,
    comment:
      weeklyHours >= 30
        ? 'Hours support a full-time trading business.'
        : weeklyHours >= 15
        ? 'Part-time hours are defensible when frequency and holding period are strong.'
        : 'Limited hours are hard to reconcile with a trade or business under Groetzinger.',
  });

  // --- Continuity -----------------------------------------------------------
  const gapPenalty = longestGap > 60 ? 0.3 : longestGap > 30 ? 0.15 : 0;
  factors.push({
    key: 'continuity',
    label: 'Continuity and regularity',
    weight: 0.1,
    score: Math.max(0, ramp(monthsActive, 4, 11) - gapPenalty),
    observed: `${monthsActive} active months${longestGap ? `, longest gap ${longestGap} days` : ''}`,
    benchmark: 'Continuous throughout the year, without long dormant stretches',
    authority: AUTHORITY.groetzinger,
    comment:
      monthsActive >= 11 && longestGap <= 30
        ? 'Activity is continuous and regular.'
        : 'Gaps in activity invite an argument that the business was not carried on continuously. Trader status is tested year by year.',
  });

  // --- Businesslike conduct -------------------------------------------------
  const setupScore = Math.min(1, setup.length / 5);
  const equityScore = ramp(equity, 25000, 250000);
  const primary = has(answers, 'trading_is_primary_income') ? 1 : 0;
  const otherWork = has(answers, 'has_other_fulltime_work') ? 1 : 0;
  const conductScore = Math.min(
    1,
    setupScore * 0.45 + equityScore * 0.25 + primary * 0.3 - otherWork * 0.2
  );
  factors.push({
    key: 'businesslike',
    label: 'Businesslike conduct and capital committed',
    weight: 0.1,
    score: Math.max(0, conductScore),
    observed:
      `${setup.length} infrastructure markers, avg equity ${equity ? `$${equity.toLocaleString()}` : 'not provided'}` +
      `${primary ? ', trading is primary income' : ''}${otherWork ? ', holds other full-time work' : ''}`,
    benchmark: 'Dedicated setup, meaningful capital, and trading as the taxpayer’s own business',
    authority: AUTHORITY.holsinger,
    comment: otherWork
      ? 'Other full-time work is not disqualifying, but it raises the bar on hours and frequency evidence.'
      : 'Businesslike conduct supports the position; keep the trading plan and journal with the file.',
  });

  const score = Math.round(
    factors.reduce((sum, f) => sum + f.score * f.weight, 0) * 100
  );

  const tier: TtsTier =
    missingData.length >= 3
      ? 'insufficient_data'
      : score >= 75
      ? 'strong'
      : score >= 55
      ? 'defensible'
      : score >= 35
      ? 'weak'
      : 'not_supported';

  const strengths = factors.filter((f) => f.score >= 0.7).map((f) => `${f.label}: ${f.observed}`);
  const weaknesses = factors.filter((f) => f.score < 0.45).map((f) => `${f.label}: ${f.observed}`);

  const narrative = buildNarrative(tier, score, strengths, weaknesses, missingData);

  return { score, tier, factors, strengths, weaknesses, missingData, narrative };
}

function buildNarrative(
  tier: TtsTier,
  score: number,
  strengths: string[],
  weaknesses: string[],
  missingData: string[]
): string {
  if (tier === 'insufficient_data') {
    return `The intake is missing ${missingData.join(', ')}, so the factor analysis cannot be completed. Pull the broker year-end activity report before the consultation and re-run.`;
  }

  const head =
    tier === 'strong'
      ? `The facts strongly support trader tax status (composite ${score}/100).`
      : tier === 'defensible'
      ? `The facts support a defensible trader tax status position (composite ${score}/100), but it is not a slam dunk.`
      : tier === 'weak'
      ? `The facts are weak for trader tax status (composite ${score}/100). Claiming it invites adjustment on exam.`
      : `The facts do not support trader tax status (composite ${score}/100). Report the activity as an investor.`;

  const parts = [head];
  if (strengths.length) parts.push(`Supporting: ${strengths.join('; ')}.`);
  if (weaknesses.length) parts.push(`Exposed on: ${weaknesses.join('; ')}.`);
  parts.push(
    'Trader status is determined separately for each tax year, and the burden of substantiation is on the taxpayer. Keep the broker activity report, trading plan, and a contemporaneous time log in the permanent file.'
  );
  return parts.join(' ');
}

export function ttsTierLabel(tier: TtsTier): string {
  switch (tier) {
    case 'strong':
      return 'Strong';
    case 'defensible':
      return 'Defensible';
    case 'weak':
      return 'Weak';
    case 'not_supported':
      return 'Not supported';
    default:
      return 'Insufficient data';
  }
}
