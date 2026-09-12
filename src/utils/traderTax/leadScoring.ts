/**
 * TraderTaxHQ — lead triage and fee quoting.
 *
 * A short public inquiry form feeds two decisions: is this someone the firm
 * wants, and what should the engagement cost. Triage reuses the same TTS
 * factor model the full analysis uses, run against partial answers — the
 * result is explicitly preliminary and is never shown to the prospect as a
 * conclusion.
 *
 * THE RATE CARD BELOW IS A PLACEHOLDER. Replace every number in
 * `FEE_SCHEDULE` with your own pricing before quoting anyone.
 */

import { IntakeAnswers, IntakeSection } from '@/types/tradertax';
import { has, list, num, str } from './intakeSchema';
import { assessTraderTaxStatus } from './ttsAnalysis';

// ---------------------------------------------------------------------------
// Public inquiry form
// ---------------------------------------------------------------------------

const yesNo = (answers: IntakeAnswers, key: string) => answers[key] === true;

export const INQUIRY_SECTIONS: IntakeSection[] = [
  {
    id: 'contact',
    title: 'How to reach you',
    fields: [
      { key: 'name', label: 'Name', type: 'text', required: true },
      { key: 'email', label: 'Email', type: 'text', required: true },
      { key: 'phone', label: 'Phone', type: 'text' },
      {
        key: 'service_wanted',
        label: 'What do you need',
        type: 'select',
        required: true,
        options: [
          { value: 'consultation', label: 'A consultation — I have questions' },
          { value: 'tax_return', label: 'Prepare and file my return' },
          { value: 'consultation_and_return', label: 'Both' },
          { value: 'entity_setup', label: 'Help setting up an entity' },
          { value: 'amended_return', label: 'Fix or amend a prior year' },
          { value: 'audit_support', label: 'Respond to an IRS notice' },
        ],
      },
      {
        key: 'urgency',
        label: 'How soon',
        type: 'select',
        required: true,
        options: [
          { value: 'deadline', label: 'I have a deadline coming up' },
          { value: 'this_season', label: 'This filing season' },
          { value: 'planning', label: 'Planning ahead' },
          { value: 'exploring', label: 'Just exploring' },
        ],
      },
    ],
  },
  {
    id: 'activity',
    title: 'Your trading',
    description: 'Rough numbers are fine here — we confirm everything later against your broker reports.',
    fields: [
      {
        key: 'total_trades',
        label: 'Roughly how many trades did you place last year',
        type: 'number',
        required: true,
        drivesAnalysis: true,
      },
      {
        key: 'trading_days',
        label: 'Roughly how many days did you trade',
        type: 'number',
        required: true,
        drivesAnalysis: true,
      },
      {
        key: 'weekly_hours',
        label: 'Hours a week you spend on trading',
        type: 'number',
        required: true,
        drivesAnalysis: true,
      },
      {
        key: 'avg_holding_days',
        label: 'Typical holding period in days',
        type: 'number',
        required: true,
        drivesAnalysis: true,
        help: 'Enter a decimal for intraday, e.g. 0.5.',
      },
      { key: 'months_active', label: 'Months you were active', type: 'number', drivesAnalysis: true },
      {
        key: 'instruments',
        label: 'What do you trade',
        type: 'multiselect',
        required: true,
        options: [
          { value: 'equities', label: 'Stocks / ETFs' },
          { value: 'equity_options', label: 'Equity & ETF options' },
          { value: 'index_options_1256', label: 'Index options (SPX, NDX)' },
          { value: 'futures', label: 'Futures' },
          { value: 'futures_options', label: 'Options on futures' },
          { value: 'forex', label: 'Forex' },
          { value: 'crypto', label: 'Crypto / digital assets' },
        ],
      },
      {
        key: 'trading_is_primary_income',
        label: 'Trading is your main source of income',
        type: 'boolean',
        drivesAnalysis: true,
      },
    ],
  },
  {
    id: 'prop',
    title: 'Funded accounts',
    description: 'Prop firm payouts are taxed differently from trading your own money, so we ask separately.',
    fields: [
      {
        key: 'prop_firm',
        label: 'You trade a prop firm or funded account',
        type: 'boolean',
        drivesAnalysis: true,
        help: 'Topstep, Apex, MyFundedFutures, FTMO, or similar — evaluations count.',
      },
      {
        key: 'prop_payouts_total',
        label: 'Roughly how much did you receive in payouts last year',
        type: 'currency',
        drivesAnalysis: true,
        showIf: (a) => yesNo(a, 'prop_firm'),
      },
      {
        key: 'prop_1099_type',
        label: 'What tax form did the firm send you',
        type: 'select',
        drivesAnalysis: true,
        showIf: (a) => yesNo(a, 'prop_firm'),
        options: [
          { value: 'nec', label: '1099-NEC' },
          { value: 'misc', label: '1099-MISC' },
          { value: 'k1', label: 'Schedule K-1' },
          { value: 'b', label: '1099-B' },
          { value: 'none_foreign', label: 'Nothing — the firm is outside the US' },
          { value: 'none_unsure', label: 'Nothing, or not sure' },
        ],
      },
      {
        key: 'prop_eval_fees',
        label: 'Roughly what did you pay in evaluation and reset fees',
        type: 'currency',
        showIf: (a) => yesNo(a, 'prop_firm'),
      },
      {
        key: 'prop_prior_treatment',
        label: 'How did you report payouts last year',
        type: 'select',
        drivesAnalysis: true,
        showIf: (a) => yesNo(a, 'prop_firm'),
        options: [
          { value: 'schedule_c', label: 'Schedule C business income' },
          { value: 'capital', label: 'As capital gains' },
          { value: 'other_income', label: 'As other income' },
          { value: 'not_reported', label: 'Did not report it' },
          { value: 'first_year', label: 'First year with payouts' },
          { value: 'unsure', label: 'Not sure' },
        ],
      },
    ],
  },
  {
    id: 'situation',
    title: 'Your situation',
    fields: [
      { key: 'home_state', label: 'State you live in', type: 'text', required: true },
      { key: 'other_states', label: 'Other states you file in', type: 'text' },
      {
        key: 'entity_exists',
        label: 'You already trade through an LLC, partnership, or S-corp',
        type: 'boolean',
      },
      {
        key: 'entity_count',
        label: 'How many entities file returns',
        type: 'number',
        showIf: (a) => has(a, 'entity_exists'),
      },
      { key: 'sec475_elected', label: 'You have made a Section 475 mark-to-market election', type: 'boolean' },
      { key: 'unsure_475', label: 'Not sure whether you have a 475 election', type: 'boolean' },
      {
        key: 'result_last_year',
        label: 'Last year you were',
        type: 'select',
        options: [
          { value: 'profit_large', label: 'Profitable — over $250k' },
          { value: 'profit', label: 'Profitable — under $250k' },
          { value: 'breakeven', label: 'About breakeven' },
          { value: 'loss', label: 'Down on the year' },
        ],
      },
      { key: 'prior_returns_open', label: 'You have unfiled prior-year returns', type: 'boolean' },
      { key: 'irs_notices', label: 'You have an open IRS or state notice', type: 'boolean' },
      { key: 'foreign_broker', label: 'You hold accounts at a non-US broker', type: 'boolean' },
      { key: 'questions', label: 'What would you like to sort out', type: 'textarea' },
    ],
  },
];

// ---------------------------------------------------------------------------
// Triage
// ---------------------------------------------------------------------------

export type LeadTier = 'priority' | 'good_fit' | 'qualified' | 'low_fit' | 'not_a_fit';

export interface LeadTriage {
  score: number;
  tier: LeadTier;
  ttsScore: number;
  ttsTier: string;
  summary: string;
  signals: string[];
  concerns: string[];
  suggestedNextAction: string;
}

/**
 * Fit is not the same as trader status. A prospect can fail the TTS factors
 * and still be a good client (they need to be told no, correctly, and they may
 * need cleanup work). Fit weighs revenue signals and complexity alongside it.
 */
export function triageLead(answers: IntakeAnswers, taxYear: number): LeadTriage {
  const tts = assessTraderTaxStatus(answers, taxYear);
  const signals: string[] = [];
  const concerns: string[] = [];
  let score = 0;

  const isProp = has(answers, 'prop_firm');
  const payouts = num(answers, 'prop_payouts_total');

  if (isProp) {
    // A funded trader is the core client for this practice, and trader tax
    // status is largely beside the point for them — they get Schedule C
    // through the prop activity regardless. Scoring them on TTS would rank
    // the target client as a bad lead. Score them on the work instead.
    score += 30;
    signals.push('Funded account trader — the core client for this practice.');

    if (payouts >= 100000) {
      score += 25;
      signals.push(`Payouts around $${payouts.toLocaleString()} — entity and retirement planning are live.`);
    } else if (payouts >= 25000) {
      score += 18;
      signals.push(`Payouts around $${payouts.toLocaleString()} — self-employment tax is material.`);
    } else if (payouts > 0) {
      score += 10;
      signals.push(`Payouts around $${payouts.toLocaleString()} — a straightforward return, priced accordingly.`);
    } else {
      score += 4;
      concerns.push('No payouts yet. Evaluation fees only, which raises a profit-motive question before anything is deducted.');
    }

    const form = str(answers, 'prop_1099_type');
    if (form === 'none_foreign') {
      score += 6;
      concerns.push('Non-US firm — no 1099 to work from, and possible foreign account reporting.');
    } else if (form === 'none_unsure' || form === '') {
      score += 4;
      concerns.push('Has not identified the tax form yet — get it before quoting.');
    } else if (form === 'k1') {
      score += 6;
      concerns.push('K-1 arrangement — read the codes before assuming self-employment treatment.');
    }

    const prior = str(answers, 'prop_prior_treatment');
    if (prior === 'not_reported') {
      score += 10;
      concerns.push('Payouts went unreported in a prior year. Cleanup work, and it has to be sequenced first.');
    } else if (prior === 'capital' || prior === 'other_income') {
      score += 8;
      concerns.push(`Reported previously as ${prior === 'capital' ? 'capital gains' : 'other income'} — likely an amendment.`);
    } else if (prior === 'first_year') {
      score += 5;
      signals.push('First year with payouts — no bad history to unwind.');
    }
  } else {
    // Self-directed trader. Trader status raises the score, but its absence
    // does not sink it: a small-scale trader who needs a clean 1099-B return
    // is a perfectly good volume client. Scoring purely on TTS would rank most
    // of this practice's target market as unqualified.
    const activity = num(answers, 'total_trades');
    if (activity > 0) {
      score += 30;
      signals.push(
        `${activity.toLocaleString()} trades — a real return to prepare, whatever the trader status answer turns out to be.`
      );
    } else {
      score += 8;
      concerns.push('No trading activity reported. Confirm there is actually a return to prepare.');
    }

    score += (tts.score / 100) * 30;
    if (tts.tier === 'strong' || tts.tier === 'defensible') {
      signals.push(
        `Trader status looks ${tts.tier} on a preliminary read (${tts.score}/100) — expense deductions and a 475 decision are in play.`
      );
    } else if (tts.tier === 'insufficient_data') {
      concerns.push('Not enough activity detail to read trader status yet.');
    } else {
      concerns.push(
        'Trader status is unlikely on these numbers. Scope this as a straightforward return and set that expectation on the first call.'
      );
    }
  }

  // Revenue signals.
  const result = str(answers, 'result_last_year');
  if (result === 'profit_large') {
    score += 18;
    signals.push('Profitable over $250k — planning work has real value.');
  } else if (result === 'profit') {
    score += 12;
    signals.push('Profitable year.');
  } else if (result === 'loss') {
    score += 8;
    signals.push('Down on the year — loss treatment and a 475 decision are live issues.');
  }

  const urgency = str(answers, 'urgency');
  if (urgency === 'deadline') {
    score += 10;
    signals.push('Working against a deadline — ready to engage now.');
  } else if (urgency === 'this_season') {
    score += 7;
  } else if (urgency === 'exploring') {
    score -= 6;
    concerns.push('Just exploring — expect a long cycle.');
  }

  // Complexity that the firm is specifically equipped for.
  if (has(answers, 'entity_exists')) {
    score += 6;
    signals.push('Already operating through an entity.');
  }
  if (has(answers, 'sec475_elected') || has(answers, 'unsure_475')) {
    score += 6;
    signals.push(
      has(answers, 'unsure_475')
        ? 'Unsure whether a 475 election exists — needs the election history reconstructed.'
        : 'Existing 475 election to verify and perfect.'
    );
  }
  const instruments = list(answers, 'instruments');
  if (instruments.includes('futures') || instruments.includes('index_options_1256')) {
    score += 4;
    signals.push('Section 1256 contracts in the mix.');
  }
  if (instruments.includes('crypto')) {
    score += 3;
    concerns.push('Digital assets — basis reconstruction can be the largest part of the job.');
  }
  if (has(answers, 'foreign_broker')) {
    score += 3;
    concerns.push('Foreign accounts — FBAR and possible Form 8938.');
  }

  // Risk flags that change the shape of the engagement.
  if (has(answers, 'prior_returns_open')) {
    score += 4;
    concerns.push('Unfiled prior years — sequence the cleanup before new elections.');
  }
  if (has(answers, 'irs_notices')) {
    score += 4;
    concerns.push('Open notice — scope carefully and get transcripts before quoting.');
  }

  score = Math.max(0, Math.min(100, Math.round(score)));

  // Calibrated for a volume book: "qualified" means a real return at the flat
  // fee, which is the modal client, not a marginal one.
  const tier: LeadTier =
    score >= 72 ? 'priority' : score >= 55 ? 'good_fit' : score >= 32 ? 'qualified' : score >= 18 ? 'low_fit' : 'not_a_fit';

  // Routing for a volume practice. A straightforward return at the flat fee is
  // a good outcome, not a rejection — most of this book looks like that. Only
  // a lead with nothing to prepare, or no profit motive behind the fees, gets
  // turned away.
  const hasWork = isProp ? payouts > 0 || num(answers, 'prop_eval_fees') > 0 : num(answers, 'total_trades') > 0;
  const needsCleanup =
    has(answers, 'prior_returns_open') ||
    has(answers, 'irs_notices') ||
    ['not_reported', 'capital', 'other_income'].includes(str(answers, 'prop_prior_treatment'));

  // Fees paid with no payouts ever received is the section 183 fact pattern.
  // That conversation happens on a call, not in a quote email.
  const profitMotiveQuestion = isProp && payouts === 0 && num(answers, 'prop_eval_fees') > 0;

  const nextAction = !hasWork
    ? 'Nothing to prepare yet. Point them to the free guidance and ask them to come back when they have activity.'
    : profitMotiveQuestion
    ? 'Book the paid consultation. Evaluation fees with no payouts raises profit motive under section 183 — set that expectation before quoting a return.'
    : tier === 'priority' || tier === 'good_fit'
    ? 'Call within one business day, then send the engagement letter.'
    : needsCleanup
    ? 'Book the paid consultation first — the cleanup has to be scoped before a return is quoted.'
    : 'Send the flat-fee quote and the intake link. This one does not need a call to close.';

  const summary = isProp
    ? `Preliminary fit ${score}/100 (${tier.replace(/_/g, ' ')}). Funded account trader with about $${payouts.toLocaleString()} of payouts — the work is Schedule C, self-employment tax, and expense substantiation, not trader tax status. ` +
      'This is a screening read from an inquiry form, not an analysis.'
    : `Preliminary fit ${score}/100 (${tier.replace(/_/g, ' ')}). Trader status reads ${tts.tier.replace(
        /_/g,
        ' '
      )} at ${tts.score}/100 on self-reported numbers. ` +
      'This is a screening read from an inquiry form, not an analysis — nothing here is confirmed against broker records.';

  return {
    score,
    tier,
    ttsScore: tts.score,
    ttsTier: tts.tier,
    summary,
    signals,
    concerns,
    suggestedNextAction: nextAction,
  };
}

// ---------------------------------------------------------------------------
// Fee quoting
// ---------------------------------------------------------------------------

/**
 * PLACEHOLDER PRICING — replace every number before quoting anyone.
 *
 * These are shaped for a volume practice serving funded-account and
 * small-scale traders: productized flat fees with a small number of add-ons,
 * not hourly work. A $1,200 return does not survive contact with a trader who
 * cleared $9,000 on a funded account, and a practice that prices that way ends
 * up with three clients instead of three hundred.
 *
 * The structural point survives whatever numbers you put in: price the tier,
 * not the hour, and let the add-ons carry the complexity.
 */
export const FEE_SCHEDULE = {
  // Entry point — a paid answer, credited against a return if they engage.
  quickConsult: 195,
  consultation: 395,

  // Core products
  propReturn: 495, // 1099-NEC payouts, Schedule C, Schedule SE
  smallTraderReturn: 375, // 1099-B only, no trader tax status claimed
  traderStatusReturn: 895, // TTS claimed, Schedule C plus trading schedules
  individualReturn: 495, // fallback when the shape is not yet known

  entityReturn: 950,
  entitySetup: 1200,
  amendedReturn: 550,
  auditSupportRetainer: 1500,

  adders: {
    additionalState: 125,
    additionalPropFirm: 75, // each firm past the first
    sec1256: 95,
    forex: 150,
    crypto: 350,
    cryptoPayouts: 150, // paid in crypto — two events per payout
    foreignReporting: 350,
    foreignPropFirm: 200, // no 1099 to work from
    election475: 750, // includes the Form 3115
    priorYearCleanup: 450, // per open year
    unreportedIncomeCleanup: 350, // per year of unreported payouts
    highVolume: 250, // over 2,000 executions
    veryHighVolume: 750, // over 10,000 executions
    noticeResponse: 450,
  },

  /** Quotes go out as a range; this is the spread around the computed base. */
  rangeSpread: 0.3,
} as const;

export interface FeeQuote {
  low: number;
  high: number;
  base: number;
  lines: { label: string; amount: number }[];
  caveats: string[];
}

export function quoteFee(answers: IntakeAnswers, service: string): FeeQuote {
  const lines: { label: string; amount: number }[] = [];
  const caveats: string[] = [
    'Placeholder rate card — replace FEE_SCHEDULE with your own pricing.',
    'A quote is not binding until scope is confirmed against broker records and prior returns.',
  ];
  const add = (label: string, amount: number) => {
    if (amount > 0) lines.push({ label, amount });
  };
  const a = FEE_SCHEDULE.adders;

  const isProp = has(answers, 'prop_firm');
  const trades = num(answers, 'total_trades');
  const claimsTts = !isProp && trades >= 500 && num(answers, 'weekly_hours') >= 15;

  // Pick the product that matches the return's actual shape.
  const returnProduct = (): [string, number] => {
    if (isProp) return ['Funded account return (Schedule C + SE)', FEE_SCHEDULE.propReturn];
    if (claimsTts) return ['Trader tax status return', FEE_SCHEDULE.traderStatusReturn];
    if (trades > 0) return ['Small trader return', FEE_SCHEDULE.smallTraderReturn];
    return ['Individual return', FEE_SCHEDULE.individualReturn];
  };

  switch (service) {
    case 'consultation':
      add('Consultation', FEE_SCHEDULE.consultation);
      break;
    case 'entity_setup':
      add('Entity setup', FEE_SCHEDULE.entitySetup);
      break;
    case 'amended_return':
      add('Amended return', FEE_SCHEDULE.amendedReturn);
      break;
    case 'audit_support':
      add('Audit support retainer', FEE_SCHEDULE.auditSupportRetainer);
      caveats.push('Audit work is billed against the retainer at hourly rates.');
      break;
    case 'consultation_and_return': {
      const [label, amount] = returnProduct();
      add('Consultation', FEE_SCHEDULE.consultation);
      add(label, amount);
      break;
    }
    default: {
      const [label, amount] = returnProduct();
      add(label, amount);
    }
  }

  const returnWork = ['tax_return', 'consultation_and_return'].includes(service);

  if (returnWork) {
    const entities = has(answers, 'entity_exists') ? Math.max(1, num(answers, 'entity_count', 1)) : 0;
    if (entities > 0) add(`Entity return${entities > 1 ? `s (${entities})` : ''}`, FEE_SCHEDULE.entityReturn * entities);

    const otherStates = str(answers, 'other_states')
      .split(/[,\s]+/)
      .filter((s) => s.trim().length === 2).length;
    if (otherStates > 0) add(`Additional states (${otherStates})`, a.additionalState * otherStates);

    const instruments = list(answers, 'instruments');
    if (instruments.includes('futures') || instruments.includes('index_options_1256') || instruments.includes('futures_options')) {
      add('Section 1256 contracts', a.sec1256);
    }
    if (instruments.includes('forex')) add('Forex (section 988)', a.forex);
    if (instruments.includes('crypto')) {
      add('Digital assets', a.crypto);
      caveats.push('Digital asset pricing assumes clean exchange exports. Basis reconstruction is quoted separately.');
    }
    if (has(answers, 'foreign_broker')) add('Foreign account reporting', a.foreignReporting);

    if (trades > 10000) add('Very high trade volume', a.veryHighVolume);
    else if (trades > 2000) add('High trade volume', a.highVolume);

    if (isProp) {
      const firms = Math.max(1, num(answers, 'prop_account_count', 1));
      if (firms > 1) add(`Additional prop firms (${firms - 1})`, a.additionalPropFirm * (firms - 1));
      if (str(answers, 'prop_1099_type') === 'none_foreign') {
        add('Non-US prop firm — no 1099', a.foreignPropFirm);
        caveats.push('A non-US firm issues no 1099, so the payout history has to be rebuilt from the dashboard.');
      }
      if (has(answers, 'prop_paid_in_crypto')) add('Crypto payouts', a.cryptoPayouts);
      const prior = str(answers, 'prop_prior_treatment');
      if (prior === 'not_reported') {
        add('Unreported payout cleanup (per year)', a.unreportedIncomeCleanup);
        caveats.push('Unreported prior-year payouts are priced per year once we see transcripts.');
      }
    }
  }

  if (has(answers, 'sec475_elected') || has(answers, 'unsure_475')) {
    add('Section 475 election work / Form 3115', a.election475);
  }
  if (has(answers, 'prior_returns_open')) {
    add('Prior-year cleanup (per year)', a.priorYearCleanup);
    caveats.push('Cleanup is priced per open year once we see transcripts.');
  }
  if (has(answers, 'irs_notices')) {
    add('Notice response', a.noticeResponse);
    caveats.push('Notice work is scoped after reviewing the notice and account transcripts.');
  }

  const base = lines.reduce((sum, l) => sum + l.amount, 0);
  const spread = FEE_SCHEDULE.rangeSpread;

  return {
    base,
    low: Math.round((base * (1 - spread / 2)) / 50) * 50,
    high: Math.round((base * (1 + spread / 2)) / 50) * 50,
    lines,
    caveats,
  };
}

export const LEAD_STATUS_FLOW = ['new', 'contacted', 'qualified', 'quoted', 'won', 'lost'] as const;

export function leadTierTone(tier: string) {
  switch (tier) {
    case 'priority':
      return 'success';
    case 'good_fit':
      return 'info';
    case 'qualified':
      return 'primary';
    case 'low_fit':
      return 'warning';
    default:
      return 'destructive';
  }
}
