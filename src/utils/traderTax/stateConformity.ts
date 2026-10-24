/**
 * TraderTaxHQ — state treatment notes for traders.
 *
 * State conformity is where trader returns quietly go wrong. A section 475
 * election is federal; whether a state respects the resulting ordinary loss,
 * whether it lets a trading loss offset wages, and whether it taxes short-term
 * gains at a separate rate are all separate questions with different answers in
 * different states.
 *
 * HOW TO READ THIS FILE
 * ---------------------
 * Every entry carries a `confidence`. Nothing here is a substitute for looking
 * it up:
 *
 *   'high'    — structural and stable (a state has no individual income tax).
 *               Still confirm the year.
 *   'medium'  — a well-known rule that moves with legislation. Verify the rate,
 *               threshold, and effective date before relying on it.
 *   'research'— flagged as an area to research for this state; no position is
 *               asserted.
 *
 * States absent from the list are not "clean" — they are simply not covered.
 * `stateNotesFor` returns a research prompt for anything it does not know.
 *
 * Confirmed positions belong in `tth_state_positions`, which overrides this
 * file in the UI.
 */

export type StateConfidence = 'high' | 'medium' | 'research';

export interface StateNote {
  topic:
    | 'income_tax'
    | 'capital_gains'
    | 'sec475_conformity'
    | 'loss_offset'
    | 'entity_tax'
    | 'local_tax'
    | 'conformity_date';
  headline: string;
  detail: string;
  confidence: StateConfidence;
  verifyPrompt: string;
}

export interface StateProfile {
  code: string;
  name: string;
  notes: StateNote[];
}

const NO_INCOME_TAX = (code: string, name: string, extra: StateNote[] = []): StateProfile => ({
  code,
  name,
  notes: [
    {
      topic: 'income_tax',
      headline: 'No state individual income tax',
      detail:
        'No individual income tax return is required on wages or trading income. Residency still has to be substantiated if the client moved during the year, and other states can still tax income sourced to them.',
      confidence: 'high',
      verifyPrompt: 'Confirm residency dates and any part-year or nonresident filing obligation elsewhere.',
    },
    ...extra,
  ],
});

export const STATE_PROFILES: StateProfile[] = [
  NO_INCOME_TAX('AK', 'Alaska'),
  NO_INCOME_TAX('FL', 'Florida'),
  NO_INCOME_TAX('NV', 'Nevada'),
  NO_INCOME_TAX('SD', 'South Dakota'),
  NO_INCOME_TAX('TX', 'Texas', [
    {
      topic: 'entity_tax',
      headline: 'Franchise tax may apply to an entity',
      detail:
        'Texas has no individual income tax, but a trading LLC or corporation may have a franchise tax reporting obligation even when no tax is due.',
      confidence: 'medium',
      verifyPrompt: 'Check the current no-tax-due revenue threshold and whether a report is still required.',
    },
  ]),
  NO_INCOME_TAX('WY', 'Wyoming'),
  NO_INCOME_TAX('TN', 'Tennessee'),
  NO_INCOME_TAX('NH', 'New Hampshire', [
    {
      topic: 'income_tax',
      headline: 'Interest and dividends tax has been repealed',
      detail:
        'New Hampshire never taxed wages, and its separate tax on interest and dividends was phased out. Confirm the final applicable year against the client’s facts.',
      confidence: 'medium',
      verifyPrompt: 'Confirm the repeal effective year and whether any prior-year return is still open.',
    },
  ]),
  NO_INCOME_TAX('WA', 'Washington', [
    {
      topic: 'capital_gains',
      headline: 'Excise tax on long-term capital gains',
      detail:
        'Washington imposes an excise tax on long-term capital gains above an annual standard deduction, with exclusions including real estate and retirement accounts. Short-term gains are outside it, and section 475 ordinary income is not capital gain — which makes the interaction worth a written position rather than an assumption.',
      confidence: 'medium',
      verifyPrompt:
        'Confirm the current rate, the indexed threshold, and how the state treats section 475 ordinary income and section 1256 60/40 gains.',
    },
  ]),

  {
    code: 'CA',
    name: 'California',
    notes: [
      {
        topic: 'conformity_date',
        headline: 'Static conformity to a fixed IRC date',
        detail:
          'California conforms to the Internal Revenue Code as of a specified date rather than on a rolling basis, and then departs from it by statute in many places. Federal changes after that date do not automatically apply.',
        confidence: 'medium',
        verifyPrompt: 'Confirm the current specified conformity date and whether it reaches the provisions at issue.',
      },
      {
        topic: 'sec475_conformity',
        headline: 'Confirm treatment of the section 475 election',
        detail:
          'Do not assume the federal mark-to-market result carries over unchanged. Establish the state treatment of the ordinary gain or loss, the section 481(a) adjustment, and any NOL limitation in force for the year.',
        confidence: 'research',
        verifyPrompt: 'Research FTB guidance on section 475 and any suspension of NOL deductions for the year.',
      },
      {
        topic: 'entity_tax',
        headline: 'LLC fee and franchise tax',
        detail:
          'A California LLC faces an annual franchise tax plus a gross-receipts-based fee. This can make a trading entity meaningfully more expensive than the federal model suggests.',
        confidence: 'medium',
        verifyPrompt: 'Confirm the current minimum franchise tax and the LLC fee tiers.',
      },
    ],
  },
  {
    code: 'NJ',
    name: 'New Jersey',
    notes: [
      {
        topic: 'loss_offset',
        headline: 'Income is taxed by category, and losses do not cross categories',
        detail:
          'New Jersey taxes gross income by category. A loss in one category generally cannot offset income in another, and there is no individual NOL carryforward in the way federal law provides. A trading loss that shelters wages federally may do nothing at the state level.',
        confidence: 'medium',
        verifyPrompt:
          'Confirm the current category rules and how the state characterizes section 475 ordinary trading income.',
      },
      {
        topic: 'sec475_conformity',
        headline: 'Section 475 treatment needs a written position',
        detail:
          'The federal ordinary characterization does not automatically determine the New Jersey category. Establish the position before filing, not after a notice.',
        confidence: 'research',
        verifyPrompt: 'Research New Jersey treatment of mark-to-market trading income and losses.',
      },
    ],
  },
  {
    code: 'PA',
    name: 'Pennsylvania',
    notes: [
      {
        topic: 'loss_offset',
        headline: 'Eight separate classes of income, with limited offset between them',
        detail:
          'Pennsylvania taxes income in classes and restricts using a loss in one class against income in another. Trading results and compensation do not mix the way they do federally.',
        confidence: 'medium',
        verifyPrompt: 'Confirm the class rules for the year and how trading activity is classified.',
      },
      {
        topic: 'local_tax',
        headline: 'Local earned income tax may apply',
        detail: 'Many Pennsylvania municipalities levy a local earned income tax on top of the state tax.',
        confidence: 'medium',
        verifyPrompt: 'Identify the municipality and its rate, and whether trading income falls in the base.',
      },
    ],
  },
  {
    code: 'MA',
    name: 'Massachusetts',
    notes: [
      {
        topic: 'capital_gains',
        headline: 'Short-term capital gains are taxed at their own rate',
        detail:
          'Massachusetts taxes short-term capital gains at a separate, higher rate than ordinary income. Because most trader gains are short-term, the state result can diverge sharply from the federal one — and a section 475 election, which converts gains to ordinary, can change that interaction.',
        confidence: 'medium',
        verifyPrompt:
          'Confirm the current short-term rate, the ordinary rate, and how section 475 ordinary income is classified.',
      },
      {
        topic: 'income_tax',
        headline: 'Surtax on high income',
        detail:
          'An additional surtax applies to taxable income above an indexed threshold. A large realized year can cross it on a single trade sequence.',
        confidence: 'medium',
        verifyPrompt: 'Confirm the current surtax rate and indexed threshold.',
      },
    ],
  },
  {
    code: 'NY',
    name: 'New York',
    notes: [
      {
        topic: 'local_tax',
        headline: 'New York City unincorporated business tax and the self-trading exemption',
        detail:
          'A trading business operating in New York City may face the unincorporated business tax. There is a long-standing exemption for taxpayers trading solely for their own account, and whether an entity fits inside it is a fact question worth resolving before the entity is formed.',
        confidence: 'medium',
        verifyPrompt:
          'Research the current self-trading exemption requirements and whether the entity structure stays inside them.',
      },
      {
        topic: 'entity_tax',
        headline: 'Pass-through entity tax election may be available',
        detail:
          'New York offers an elective pass-through entity tax that can move state tax above the federal SALT limitation. Elections are made on a strict calendar.',
        confidence: 'medium',
        verifyPrompt: 'Confirm the current PTET election deadline and whether the entity qualifies.',
      },
    ],
  },
  {
    code: 'IL',
    name: 'Illinois',
    notes: [
      {
        topic: 'entity_tax',
        headline: 'Personal property replacement tax on entities',
        detail:
          'Illinois imposes a replacement tax on partnerships and S corporations in addition to the individual income tax on the owners.',
        confidence: 'medium',
        verifyPrompt: 'Confirm the current replacement tax rate for the entity type.',
      },
    ],
  },
];

const RESEARCH_PROMPT: StateNote[] = [
  {
    topic: 'sec475_conformity',
    headline: 'State treatment not yet researched',
    detail:
      'No position has been recorded for this state. Before filing, establish: whether the state conforms to the section 475 election and its ordinary characterization; whether a trading loss can offset other income; whether short-term gains carry a separate rate; and what the entity-level taxes and elections are.',
    confidence: 'research',
    verifyPrompt: 'Research and record the position in the state register so the next client inherits it.',
  },
];

export function stateProfileFor(code: string): StateProfile | null {
  return STATE_PROFILES.find((s) => s.code === code.toUpperCase()) ?? null;
}

/** Notes for a state, falling back to an explicit research prompt. */
export function stateNotesFor(code: string): StateNote[] {
  return stateProfileFor(code)?.notes ?? RESEARCH_PROMPT;
}

export function hasNoIncomeTax(code: string): boolean {
  return (
    stateProfileFor(code)?.notes.some(
      (n) => n.topic === 'income_tax' && n.headline.startsWith('No state individual income tax')
    ) ?? false
  );
}

/**
 * All states in play for a client, deduplicated, home state first.
 */
export function statesInPlay(homeState: string | null, otherStates: string[]): string[] {
  const all = [homeState, ...otherStates].filter(Boolean).map((s) => String(s).toUpperCase());
  return Array.from(new Set(all));
}

export const CONFIDENCE_LABEL: Record<StateConfidence, string> = {
  high: 'Structural',
  medium: 'Verify the year',
  research: 'Research needed',
};
