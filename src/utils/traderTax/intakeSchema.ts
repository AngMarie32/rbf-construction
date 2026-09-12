/**
 * TraderTaxHQ — client intake questionnaire.
 *
 * One schema drives three surfaces: the internal intake editor, the public
 * token-addressable client form, and the analysis engine (every key marked
 * `drivesAnalysis` is consumed by a calculation, so removing one silently
 * degrades the output — check `consultationEngine.ts` before deleting a field).
 */

import { IntakeAnswers, IntakeSection } from '@/types/tradertax';

export const INTAKE_SCHEMA_VERSION = 'v1';

const yesNo = (answers: IntakeAnswers, key: string) => answers[key] === true;

const US_STATES = [
  'AL','AK','AZ','AR','CA','CO','CT','DE','DC','FL','GA','HI','ID','IL','IN','IA','KS','KY','LA','ME',
  'MD','MA','MI','MN','MS','MO','MT','NE','NV','NH','NJ','NM','NY','NC','ND','OH','OK','OR','PA','RI',
  'SC','SD','TN','TX','UT','VT','VA','WA','WV','WI','WY',
].map((s) => ({ value: s, label: s }));

export const INTAKE_SECTIONS: IntakeSection[] = [
  {
    id: 'profile',
    title: 'Taxpayer profile',
    description: 'Who is filing, where, and under what structure.',
    fields: [
      { key: 'legal_name', label: 'Full legal name', type: 'text', required: true },
      { key: 'email', label: 'Email', type: 'text', required: true },
      { key: 'phone', label: 'Phone', type: 'text' },
      {
        key: 'filing_status',
        label: 'Filing status',
        type: 'select',
        required: true,
        drivesAnalysis: true,
        options: [
          { value: 'single', label: 'Single' },
          { value: 'mfj', label: 'Married filing jointly' },
          { value: 'mfs', label: 'Married filing separately' },
          { value: 'hoh', label: 'Head of household' },
          { value: 'qw', label: 'Qualifying surviving spouse' },
        ],
      },
      { key: 'age', label: 'Age at year end', type: 'number', drivesAnalysis: true },
      { key: 'dependents', label: 'Number of dependents', type: 'number' },
      {
        key: 'home_state',
        label: 'State of residence',
        type: 'select',
        options: US_STATES,
        required: true,
        drivesAnalysis: true,
      },
      {
        key: 'other_states',
        label: 'Other states with filing exposure',
        type: 'multiselect',
        options: US_STATES,
        help: 'Part-year residence, rental property, K-1s, or state-sourced wages.',
        drivesAnalysis: true,
      },
      { key: 'moved_states_during_year', label: 'Moved between states during the year', type: 'boolean' },
      { key: 'occupation', label: 'Occupation outside trading', type: 'text' },
    ],
  },
  {
    id: 'activity',
    title: 'Trading activity',
    description:
      'These answers drive the trader tax status (TTS) factor analysis. Estimate from your broker year-end activity report — do not round generously.',
    fields: [
      {
        key: 'trading_days',
        label: 'Number of days you executed trades',
        type: 'number',
        required: true,
        drivesAnalysis: true,
        help: 'Distinct calendar days with at least one execution. The market has ~252 trading days.',
      },
      {
        key: 'total_trades',
        label: 'Total executions for the year',
        type: 'number',
        required: true,
        drivesAnalysis: true,
        help: 'Count each buy and each sell separately, as your broker reports them.',
      },
      {
        key: 'avg_holding_days',
        label: 'Average holding period (days)',
        type: 'number',
        required: true,
        drivesAnalysis: true,
        help: 'Across all closed positions. Enter a decimal for intraday (e.g. 0.5).',
      },
      {
        key: 'weekly_hours',
        label: 'Hours per week spent on trading activity',
        type: 'number',
        required: true,
        drivesAnalysis: true,
        help: 'Include research, screening, order management, and journaling — not passive monitoring.',
      },
      {
        key: 'months_active',
        label: 'Months active during the year',
        type: 'number',
        required: true,
        drivesAnalysis: true,
        help: 'Months with regular, continuous activity.',
      },
      {
        key: 'longest_gap_days',
        label: 'Longest gap without trading (days)',
        type: 'number',
        drivesAnalysis: true,
      },
      {
        key: 'avg_account_equity',
        label: 'Average account equity',
        type: 'currency',
        drivesAnalysis: true,
      },
      { key: 'uses_margin', label: 'Trade on margin', type: 'boolean', drivesAnalysis: true },
      { key: 'pdt_flagged', label: 'Flagged as a pattern day trader', type: 'boolean', drivesAnalysis: true },
      {
        key: 'trading_is_primary_income',
        label: 'Trading is your primary source of income',
        type: 'boolean',
        drivesAnalysis: true,
      },
      {
        key: 'has_other_fulltime_work',
        label: 'You hold other full-time employment or run another business',
        type: 'boolean',
        drivesAnalysis: true,
      },
      {
        key: 'business_setup',
        label: 'Business-like infrastructure you maintain',
        type: 'multiselect',
        drivesAnalysis: true,
        options: [
          { value: 'dedicated_space', label: 'Dedicated office / trading space' },
          { value: 'multi_monitor', label: 'Multi-monitor trading rig' },
          { value: 'market_data', label: 'Paid market data / news feeds' },
          { value: 'charting_software', label: 'Paid charting / execution software' },
          { value: 'trade_journal', label: 'Written trading plan and journal' },
          { value: 'education', label: 'Ongoing paid education / coaching' },
          { value: 'business_bank', label: 'Separate business bank account' },
        ],
      },
      {
        key: 'strategy_description',
        label: 'Describe your strategy and daily routine',
        type: 'textarea',
        help: 'Intent to profit from daily market movements is a core factor in the case law.',
      },
    ],
  },
  {
    id: 'instruments',
    title: 'Instruments and accounts',
    fields: [
      {
        key: 'instruments',
        label: 'Instruments traded',
        type: 'multiselect',
        required: true,
        drivesAnalysis: true,
        options: [
          { value: 'equities', label: 'Stocks / ETFs' },
          { value: 'equity_options', label: 'Equity & ETF options' },
          { value: 'index_options_1256', label: 'Broad-based index options (SPX, NDX, RUT)' },
          { value: 'futures', label: 'Futures' },
          { value: 'futures_options', label: 'Options on futures' },
          { value: 'forex', label: 'Forex' },
          { value: 'crypto', label: 'Crypto / digital assets' },
          { value: 'bonds', label: 'Bonds / fixed income' },
          { value: 'swaps', label: 'Swaps / CFDs' },
        ],
      },
      { key: 'broker_count', label: 'Number of brokerage accounts', type: 'number' },
      { key: 'broker_names', label: 'Brokers / platforms used', type: 'text', placeholder: 'IBKR, Tradovate, NinjaTrader…' },
      {
        key: 'trades_in_ira',
        label: 'You also trade inside an IRA or retirement account',
        type: 'boolean',
        drivesAnalysis: true,
        help: 'Matters for wash sale interaction with taxable accounts (Rev. Rul. 2008-5).',
      },
      { key: 'prop_firm', label: 'Trade for a prop firm / funded account', type: 'boolean', drivesAnalysis: true },
      { key: 'prop_firm_1099', label: 'Prop firm issues you a 1099-NEC or K-1', type: 'boolean', showIf: (a) => yesNo(a, 'prop_firm') },
      {
        key: 'foreign_broker',
        label: 'Hold accounts at a non-US broker or exchange',
        type: 'boolean',
        drivesAnalysis: true,
      },
      {
        key: 'foreign_max_balance',
        label: 'Highest aggregate foreign account balance during the year',
        type: 'currency',
        drivesAnalysis: true,
        showIf: (a) => yesNo(a, 'foreign_broker'),
      },
    ],
  },
  {
    id: 'entity',
    title: 'Entity structure',
    fields: [
      {
        key: 'entity_exists',
        label: 'You trade through an entity (LLC, partnership, S-corp)',
        type: 'boolean',
        drivesAnalysis: true,
      },
      {
        key: 'entity_type',
        label: 'Entity type',
        type: 'select',
        drivesAnalysis: true,
        showIf: (a) => yesNo(a, 'entity_exists'),
        options: [
          { value: 'smllc', label: 'Single-member LLC (disregarded)' },
          { value: 'partnership', label: 'Multi-member LLC / partnership' },
          { value: 's_corp', label: 'S corporation' },
          { value: 'c_corp', label: 'C corporation' },
          { value: 'trust', label: 'Trust' },
        ],
      },
      { key: 'entity_state', label: 'State of formation', type: 'select', options: US_STATES, showIf: (a) => yesNo(a, 'entity_exists') },
      { key: 'entity_formed_date', label: 'Date formed', type: 'date', drivesAnalysis: true, showIf: (a) => yesNo(a, 'entity_exists') },
      { key: 's_election_filed', label: 'Form 2553 S election filed', type: 'boolean', drivesAnalysis: true, showIf: (a) => yesNo(a, 'entity_exists') },
      { key: 'entity_runs_payroll', label: 'Entity runs payroll', type: 'boolean', drivesAnalysis: true, showIf: (a) => yesNo(a, 'entity_exists') },
      { key: 'officer_comp', label: 'Officer / owner W-2 compensation', type: 'currency', drivesAnalysis: true, showIf: (a) => yesNo(a, 'entity_runs_payroll') },
      { key: 'other_owners', label: 'Other owners / members', type: 'text', showIf: (a) => yesNo(a, 'entity_exists') },
      {
        key: 'interested_in_entity',
        label: 'Interested in forming a trading entity',
        type: 'boolean',
        drivesAnalysis: true,
        showIf: (a) => !yesNo(a, 'entity_exists'),
      },
    ],
  },
  {
    id: 'elections',
    title: 'Elections and prior positions',
    fields: [
      {
        key: 'tts_claimed_prior',
        label: 'You claimed trader tax status on a prior return',
        type: 'boolean',
        drivesAnalysis: true,
      },
      { key: 'tts_first_year', label: 'First year TTS was claimed', type: 'number', showIf: (a) => yesNo(a, 'tts_claimed_prior') },
      {
        key: 'sec475_elected',
        label: 'A Section 475(f) mark-to-market election is already in place',
        type: 'boolean',
        drivesAnalysis: true,
      },
      {
        key: 'sec475_effective_year',
        label: 'First year the 475 election was effective',
        type: 'number',
        drivesAnalysis: true,
        showIf: (a) => yesNo(a, 'sec475_elected'),
      },
      {
        key: 'sec475_scope',
        label: 'Scope of the 475 election',
        type: 'select',
        drivesAnalysis: true,
        showIf: (a) => yesNo(a, 'sec475_elected'),
        options: [
          { value: 'securities', label: 'Securities only — 475(f)(1)' },
          { value: 'commodities', label: 'Commodities only — 475(f)(2)' },
          { value: 'both', label: 'Both securities and commodities' },
          { value: 'unsure', label: 'Not sure' },
        ],
      },
      {
        key: 'sec475_form3115_filed',
        label: 'Form 3115 was filed to perfect the election',
        type: 'boolean',
        drivesAnalysis: true,
        showIf: (a) => yesNo(a, 'sec475_elected'),
      },
      {
        key: 'sec988_capital_election',
        label: 'A Section 988(a)(1)(B) capital gain election is in place for forex',
        type: 'boolean',
        drivesAnalysis: true,
        showIf: (a) => (a.instruments as string[] | undefined)?.includes('forex') ?? false,
      },
      { key: 'prior_preparer', label: 'Who prepared last year’s return', type: 'text' },
      { key: 'prior_returns_open', label: 'Any unfiled prior-year returns', type: 'boolean', drivesAnalysis: true },
      { key: 'amended_interest', label: 'Interested in amending a prior year', type: 'boolean', drivesAnalysis: true },
    ],
  },
  {
    id: 'results',
    title: 'Trading results for the year',
    description: 'Use broker year-end statements. Enter losses as negative numbers.',
    fields: [
      {
        key: 'securities_net_gain',
        label: 'Net gain / (loss) on securities (stocks, ETFs, equity options)',
        type: 'currency',
        drivesAnalysis: true,
      },
      {
        key: 'short_term_portion',
        label: 'Of that, short-term',
        type: 'currency',
        drivesAnalysis: true,
      },
      {
        key: 'sec1256_net_gain',
        label: 'Net gain / (loss) on Section 1256 contracts (futures, index options)',
        type: 'currency',
        drivesAnalysis: true,
        help: 'Marked to market at year end and split 60% long-term / 40% short-term.',
      },
      {
        key: 'wash_sale_disallowed',
        label: 'Wash sale losses disallowed per your 1099-B',
        type: 'currency',
        drivesAnalysis: true,
      },
      { key: 'crypto_net_gain', label: 'Net gain / (loss) on digital assets', type: 'currency', drivesAnalysis: true },
      { key: 'forex_net_gain', label: 'Net gain / (loss) on forex', type: 'currency', drivesAnalysis: true },
      {
        key: 'capital_loss_carryforward',
        label: 'Capital loss carryforward into this year',
        type: 'currency',
        drivesAnalysis: true,
      },
      { key: 'unrealized_open_positions', label: 'Unrealized gain / (loss) on positions open at year end', type: 'currency', drivesAnalysis: true },
    ],
  },
  {
    id: 'income',
    title: 'Other income and payments',
    fields: [
      { key: 'w2_income', label: 'W-2 wages (taxpayer)', type: 'currency', drivesAnalysis: true },
      { key: 'spouse_w2_income', label: 'W-2 wages (spouse)', type: 'currency', drivesAnalysis: true },
      { key: 'self_employment_income', label: 'Other self-employment / 1099 income', type: 'currency', drivesAnalysis: true },
      { key: 'rental_k1_income', label: 'Rental / K-1 / other income', type: 'currency', drivesAnalysis: true },
      { key: 'interest_dividends', label: 'Interest and dividends', type: 'currency', drivesAnalysis: true },
      { key: 'prior_year_agi', label: 'Prior-year AGI', type: 'currency', drivesAnalysis: true },
      { key: 'prior_year_total_tax', label: 'Prior-year total tax', type: 'currency', drivesAnalysis: true, help: 'Form 1040 line 24 — drives the estimated tax safe harbor.' },
      { key: 'estimated_payments_made', label: 'Federal estimated payments made this year', type: 'currency', drivesAnalysis: true },
      { key: 'withholding', label: 'Federal withholding this year', type: 'currency', drivesAnalysis: true },
      { key: 'itemizes', label: 'You expect to itemize deductions', type: 'boolean', drivesAnalysis: true },
    ],
  },
  {
    id: 'expenses',
    title: 'Trading business expenses',
    description:
      'Only deductible as business expenses if trader tax status is established. Report the full amount; we will apply the allocation.',
    fields: [
      { key: 'exp_margin_interest', label: 'Margin interest', type: 'currency', drivesAnalysis: true },
      { key: 'exp_data_software', label: 'Market data, charting, and platform fees', type: 'currency', drivesAnalysis: true },
      { key: 'exp_education', label: 'Education, coaching, and research', type: 'currency', drivesAnalysis: true },
      { key: 'exp_equipment', label: 'Computers, monitors, and equipment', type: 'currency', drivesAnalysis: true },
      { key: 'exp_professional', label: 'Accounting, legal, and entity fees', type: 'currency', drivesAnalysis: true },
      { key: 'exp_other', label: 'Other trading business expenses', type: 'currency', drivesAnalysis: true },
      { key: 'home_office', label: 'You maintain a home office used regularly and exclusively', type: 'boolean', drivesAnalysis: true },
      { key: 'home_office_sqft', label: 'Home office square feet', type: 'number', drivesAnalysis: true, showIf: (a) => yesNo(a, 'home_office') },
      { key: 'home_total_sqft', label: 'Total home square feet', type: 'number', drivesAnalysis: true, showIf: (a) => yesNo(a, 'home_office') },
      { key: 'home_annual_cost', label: 'Annual home cost (rent/mortgage interest, taxes, utilities, insurance)', type: 'currency', drivesAnalysis: true, showIf: (a) => yesNo(a, 'home_office') },
    ],
  },
  {
    id: 'retirement_health',
    title: 'Retirement and health',
    fields: [
      {
        key: 'retirement_plan_type',
        label: 'Retirement plan currently in place',
        type: 'select',
        drivesAnalysis: true,
        options: [
          { value: 'none', label: 'None' },
          { value: 'ira', label: 'Traditional / Roth IRA only' },
          { value: 'solo_401k', label: 'Solo 401(k)' },
          { value: 'sep_ira', label: 'SEP IRA' },
          { value: 'simple_ira', label: 'SIMPLE IRA' },
          { value: 'db_plan', label: 'Defined benefit / cash balance plan' },
          { value: 'employer_401k', label: 'Employer 401(k)' },
        ],
      },
      { key: 'retirement_contributions', label: 'Retirement contributions made this year', type: 'currency', drivesAnalysis: true },
      { key: 'employer_plan_deferrals', label: 'Elective deferrals already made to an employer plan', type: 'currency', drivesAnalysis: true },
      { key: 'wants_retirement_plan', label: 'Interested in adding or upsizing a retirement plan', type: 'boolean', drivesAnalysis: true },
      {
        key: 'health_insurance_source',
        label: 'Health insurance source',
        type: 'select',
        drivesAnalysis: true,
        options: [
          { value: 'none', label: 'None' },
          { value: 'self_purchased', label: 'Self-purchased / marketplace' },
          { value: 'spouse_employer', label: 'Spouse’s employer' },
          { value: 'own_employer', label: 'Own employer' },
          { value: 'medicare', label: 'Medicare' },
        ],
      },
      { key: 'health_premiums', label: 'Annual health insurance premiums paid', type: 'currency', drivesAnalysis: true },
      { key: 'hsa_eligible', label: 'Covered by an HSA-eligible high deductible plan', type: 'boolean', drivesAnalysis: true },
    ],
  },
  {
    id: 'compliance',
    title: 'Compliance and risk',
    fields: [
      { key: 'irs_notices', label: 'Received an IRS or state notice in the last 3 years', type: 'boolean', drivesAnalysis: true },
      { key: 'notice_detail', label: 'Describe the notice', type: 'textarea', showIf: (a) => yesNo(a, 'irs_notices') },
      { key: 'under_examination', label: 'Currently under examination or audit', type: 'boolean', drivesAnalysis: true },
      { key: 'unpaid_balances', label: 'Unpaid federal or state balances', type: 'boolean', drivesAnalysis: true },
      { key: 'pfic_holdings', label: 'Hold foreign mutual funds or PFICs', type: 'boolean', drivesAnalysis: true },
      { key: 'staking_mining', label: 'Earned staking, mining, or lending income', type: 'boolean', drivesAnalysis: true, showIf: (a) => (a.instruments as string[] | undefined)?.includes('crypto') ?? false },
      { key: 'received_1099da', label: 'Received a Form 1099-DA from a digital asset broker', type: 'boolean', showIf: (a) => (a.instruments as string[] | undefined)?.includes('crypto') ?? false },
      { key: 'gifts_inheritance', label: 'Received a gift or inheritance over $100,000 from a foreign person', type: 'boolean', drivesAnalysis: true },
    ],
  },
  {
    id: 'goals',
    title: 'Goals and questions',
    fields: [
      {
        key: 'primary_goal',
        label: 'What do you most want out of this consultation',
        type: 'select',
        options: [
          { value: 'qualify_tts', label: 'Determine whether I qualify for trader tax status' },
          { value: 'reduce_tax', label: 'Reduce this year’s tax bill' },
          { value: 'fix_losses', label: 'Deal with trading losses / wash sales' },
          { value: 'entity', label: 'Decide on an entity structure' },
          { value: 'retirement', label: 'Set up retirement plan deductions' },
          { value: 'compliance', label: 'Clean up prior years / respond to a notice' },
          { value: 'filing', label: 'Have you prepare and file the return' },
        ],
        required: true,
      },
      { key: 'client_questions', label: 'Specific questions for the consultation', type: 'textarea' },
      { key: 'deadline_pressure', label: 'Any deadline you are working against', type: 'text' },
      { key: 'additional_context', label: 'Anything else we should know', type: 'textarea' },
    ],
  },
];

/** Flat list of every field, in section order. */
export function allIntakeFields() {
  return INTAKE_SECTIONS.flatMap((s) => s.fields.map((f) => ({ ...f, sectionId: s.id, sectionTitle: s.title })));
}

export function isFieldVisible(field: { showIf?: (a: IntakeAnswers) => boolean }, answers: IntakeAnswers) {
  return field.showIf ? field.showIf(answers) : true;
}

function isAnswered(value: unknown) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

/** Completion percentage across currently visible fields. */
export function intakeCompletion(answers: IntakeAnswers): number {
  const visible = allIntakeFields().filter((f) => isFieldVisible(f, answers));
  if (visible.length === 0) return 0;
  const done = visible.filter((f) => isAnswered(answers[f.key])).length;
  return Math.round((done / visible.length) * 1000) / 10;
}

/** Required visible fields that are still blank. */
export function missingRequiredFields(answers: IntakeAnswers) {
  return allIntakeFields()
    .filter((f) => f.required && isFieldVisible(f, answers) && !isAnswered(answers[f.key]))
    .map((f) => ({ key: f.key, label: f.label, sectionTitle: f.sectionTitle }));
}

/** Analysis-driving fields that are still blank — these degrade engine output. */
export function missingAnalysisFields(answers: IntakeAnswers) {
  return allIntakeFields()
    .filter((f) => f.drivesAnalysis && isFieldVisible(f, answers) && !isAnswered(answers[f.key]))
    .map((f) => ({ key: f.key, label: f.label, sectionTitle: f.sectionTitle }));
}

// ---------------------------------------------------------------------------
// Typed accessors used by the engines
// ---------------------------------------------------------------------------

export function num(answers: IntakeAnswers, key: string, fallback = 0): number {
  const raw = answers[key];
  if (raw === null || raw === undefined || raw === '') return fallback;
  const n = typeof raw === 'number' ? raw : Number(String(raw).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) ? n : fallback;
}

export function has(answers: IntakeAnswers, key: string): boolean {
  return answers[key] === true || answers[key] === 'true';
}

export function str(answers: IntakeAnswers, key: string, fallback = ''): string {
  const raw = answers[key];
  return typeof raw === 'string' && raw.length ? raw : fallback;
}

export function list(answers: IntakeAnswers, key: string): string[] {
  const raw = answers[key];
  return Array.isArray(raw) ? raw : [];
}

export function hasInstrument(answers: IntakeAnswers, instrument: string): boolean {
  return list(answers, 'instruments').includes(instrument);
}

/** True when the taxpayer trades anything treated as a Section 1256 contract. */
export function hasSec1256(answers: IntakeAnswers): boolean {
  return ['futures', 'futures_options', 'index_options_1256'].some((i) => hasInstrument(answers, i));
}
