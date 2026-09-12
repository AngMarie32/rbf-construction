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

  // Trader status is the core of the practice — half the fit score.
  score += (tts.score / 100) * 50;
  if (tts.tier === 'strong' || tts.tier === 'defensible') {
    signals.push(`Trader status looks ${tts.tier} on a preliminary read (${tts.score}/100).`);
  } else if (tts.tier === 'insufficient_data') {
    concerns.push('Not enough activity detail to read trader status yet.');
  } else {
    concerns.push(`Trader status looks ${tts.tier.replace(/_/g, ' ')} on these numbers — expect a hard conversation.`);
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

  const tier: LeadTier =
    score >= 75 ? 'priority' : score >= 60 ? 'good_fit' : score >= 42 ? 'qualified' : score >= 25 ? 'low_fit' : 'not_a_fit';

  const nextAction =
    tier === 'priority' || tier === 'good_fit'
      ? 'Call within one business day and send the engagement letter.'
      : tier === 'qualified'
      ? 'Send the paid consultation link — qualify further on the call.'
      : tier === 'low_fit'
      ? 'Offer a paid one-hour consultation only. Do not scope a return yet.'
      : 'Decline politely, or point them to a consultation that sets expectations about trader status.';

  const summary =
    `Preliminary fit ${score}/100 (${tier.replace(/_/g, ' ')}). Trader status reads ${tts.tier.replace(
      /_/g,
      ' '
    )} at ${tts.score}/100 on self-reported numbers. ` +
    `This is a screening read from an inquiry form, not an analysis — nothing here is confirmed against broker records.`;

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
 * PLACEHOLDER PRICING. Every figure here is a stand-in so the calculator runs.
 * Replace with the firm's real rate card before any of it reaches a prospect.
 */
export const FEE_SCHEDULE = {
  consultation: 500,
  individualReturn: 1200,
  entityReturn: 1400,
  entitySetup: 1500,
  amendedReturn: 950,
  auditSupportRetainer: 2500,
  adders: {
    additionalState: 250,
    sec1256: 200,
    forex: 250,
    crypto: 750,
    foreignReporting: 600,
    election475: 900, // includes the Form 3115
    priorYearCleanup: 800, // per open year
    highVolume: 500, // over 2,000 executions
    veryHighVolume: 1200, // over 10,000 executions
    noticeResponse: 750,
  },
  /** Quotes go out as a range; this is the spread above the computed base. */
  rangeSpread: 0.35,
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
    case 'consultation_and_return':
      add('Consultation', FEE_SCHEDULE.consultation);
      add('Individual return', FEE_SCHEDULE.individualReturn);
      break;
    default:
      add('Individual return', FEE_SCHEDULE.individualReturn);
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

    const trades = num(answers, 'total_trades');
    if (trades > 10000) add('Very high trade volume', a.veryHighVolume);
    else if (trades > 2000) add('High trade volume', a.highVolume);
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
