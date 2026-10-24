/**
 * TraderTaxHQ — public state page content.
 *
 * Turns the internal state register into marketing pages, under one rule:
 * **publish only what is structural.**
 *
 * A structural fact is one that does not move with the annual inflation
 * adjustment or a rate change — New Jersey taxing income by category, or
 * Massachusetts taxing short-term gains on their own schedule, or Texas having
 * no individual income tax at all. Those are safe to state publicly and are
 * exactly what nobody else writes about.
 *
 * Rates, thresholds, and dollar figures are deliberately absent. They change,
 * a stale number on a public page is a liability, and the firm confirms the
 * current year on the actual return anyway. Every page says so.
 */

import { StateProfile, STATE_PROFILES, stateProfileFor } from './stateConformity';

export interface StatePageContent {
  code: string;
  name: string;
  /** One sentence, the thing that is actually different here. */
  headline: string;
  /** Why a trader in this state should care, in plain terms. */
  intro: string;
  /** Structural points, safe to publish. */
  points: { title: string; body: string }[];
  /** What we confirm for the client's own return rather than assert here. */
  weConfirm: string[];
  /** No individual income tax — changes the whole shape of the page. */
  noIncomeTax: boolean;
}

const NO_TAX_INTRO =
  'There is no individual income tax here, so your trading results are not taxed at the state level. That is genuinely simpler than most places — but it is not the same as having nothing to think about.';

const NO_TAX_POINTS = [
  {
    title: 'Federal treatment is unchanged',
    body: 'Everything that matters federally still applies: the capital loss limit, wash sales, the section 475 election and its deadline, and self-employment tax on funded-account payouts. Living in a no-tax state does not soften any of it.',
  },
  {
    title: 'Residency has to be real',
    body: 'If you moved during the year, the state you left will want its share of the period you lived there — and some states are notably persistent about it. Dates, the timing of the move, and where you actually lived all matter.',
  },
  {
    title: 'Other states can still reach you',
    body: 'Income sourced elsewhere — a K-1, rental property, wages from another state — can create a filing obligation there even while you live here.',
  },
];

/** Per-state marketing framing. Structural only — no rates, no thresholds. */
const FRAMING: Record<string, { headline: string; intro: string; extraPoints?: { title: string; body: string }[] }> = {
  CA: {
    headline: 'California does not simply follow the federal answer.',
    intro:
      'California conforms to the Internal Revenue Code as of a fixed date rather than on a rolling basis, and then departs from it by statute in a number of places. Federal changes after that date do not automatically flow through, which means your California result can differ from your federal one in ways that are easy to miss.',
    extraPoints: [
      {
        title: 'The 475 election needs its own answer',
        body: 'Do not assume the federal mark-to-market result carries over unchanged. The state treatment of the ordinary gain or loss, the section 481(a) adjustment, and any limitation on net operating losses in force for the year all have to be established separately.',
      },
      {
        title: 'An entity costs more here',
        body: 'A California LLC faces an annual franchise tax plus a gross-receipts-based fee. That can make a trading entity meaningfully more expensive than the federal model alone suggests — worth pricing before forming one.',
      },
    ],
  },
  NJ: {
    headline: 'In New Jersey, a trading loss may not offset your wages at all.',
    intro:
      'New Jersey taxes income by category, and a loss in one category generally cannot offset income in another. There is also no individual net operating loss carryforward of the kind federal law provides. A trading loss that shelters your salary on the federal return can do nothing for you at the state level.',
    extraPoints: [
      {
        title: 'This is the single biggest surprise for New Jersey traders',
        body: 'People plan around a federal loss deduction and then find the state bill unchanged. If you had a losing year and live here, this is worth understanding before you file, not after.',
      },
    ],
  },
  PA: {
    headline: 'Pennsylvania sorts income into classes, and losses do not move between them.',
    intro:
      'Pennsylvania taxes income in separate classes and restricts using a loss in one class against income in another. Trading results and compensation do not mix the way they do federally, so the state answer can look very different from the federal one.',
    extraPoints: [
      {
        title: 'Local tax sits on top',
        body: 'Many Pennsylvania municipalities levy their own earned income tax. Which municipality you are in, and whether your trading activity falls inside its base, both matter.',
      },
    ],
  },
  MA: {
    headline: 'Massachusetts taxes short-term gains on their own schedule.',
    intro:
      'Massachusetts applies a separate, higher rate to short-term capital gains than to ordinary income. Because most active trading produces short-term gains, the state result can diverge sharply from what the federal numbers suggest — and a section 475 election, which converts gains to ordinary, changes that interaction.',
    extraPoints: [
      {
        title: 'The 475 interaction is the interesting part',
        body: 'An election that converts short-term gains into ordinary income lands differently in a state that taxes those two things at different rates. That is a real modelling question here in a way it is not elsewhere.',
      },
      {
        title: 'A surtax applies above a high income threshold',
        body: 'A large realized year can cross it on a single sequence of trades. Worth knowing before you take gains rather than after.',
      },
    ],
  },
  NY: {
    headline: 'New York City traders should know about the unincorporated business tax.',
    intro:
      'A trading business operating in New York City can face the unincorporated business tax. There is a long-standing exemption for taxpayers trading solely for their own account, and whether a particular structure stays inside it is a question of fact worth resolving before an entity is formed rather than after.',
    extraPoints: [
      {
        title: 'Get the entity question right the first time',
        body: 'The self-trading exemption has conditions. Forming an entity and then discovering the arrangement falls outside them is an expensive way to learn this.',
      },
      {
        title: 'A pass-through entity tax election exists',
        body: 'New York offers an elective pass-through entity tax that can move state tax above the federal SALT limitation. Elections run on a strict calendar, so this is a date-driven decision.',
      },
    ],
  },
  IL: {
    headline: 'Illinois adds a replacement tax on top of your individual return.',
    intro:
      'Illinois imposes a personal property replacement tax on partnerships and S corporations, in addition to the individual income tax their owners pay. If you are considering a trading entity here, the entity itself carries a cost the federal model does not show.',
  },
};

export function statePageContent(code: string): StatePageContent | null {
  const profile = stateProfileFor(code);
  if (!profile) return null;

  const noIncomeTax = profile.notes.some(
    (n) => n.topic === 'income_tax' && n.headline.startsWith('No state individual income tax')
  );
  const frame = FRAMING[profile.code];

  // Only structural notes reach the public page. Anything flagged as needing
  // research is a prompt for the firm, not content for a prospect.
  const structural = profile.notes.filter((n) => n.confidence !== 'research');

  const points = noIncomeTax
    ? [
        ...NO_TAX_POINTS,
        ...structural
          .filter((n) => n.topic !== 'income_tax')
          .map((n) => ({ title: n.headline, body: n.detail })),
      ]
    : [
        ...structural.map((n) => ({ title: n.headline, body: n.detail })),
        ...(frame?.extraPoints ?? []),
      ];

  return {
    code: profile.code,
    name: profile.name,
    headline:
      frame?.headline ??
      (noIncomeTax
        ? `${profile.name} has no individual income tax on your trading.`
        : `What is different about trading taxes in ${profile.name}.`),
    intro: frame?.intro ?? (noIncomeTax ? NO_TAX_INTRO : structural[0]?.detail ?? ''),
    points,
    weConfirm: noIncomeTax
      ? [
          'Your residency dates, and any part-year or nonresident return another state expects',
          'Whether an entity you hold here carries a separate reporting obligation',
        ]
      : [
          'The current-year rates, thresholds, and conformity date — these move, and this page deliberately does not quote them',
          'How the state treats a section 475 election and the ordinary income it produces',
          'Whether a trading loss can offset your other income at the state level',
          'Any entity-level tax or election that applies to your structure',
        ],
    noIncomeTax,
  };
}

/** Every state with a publishable page, no-tax states last. */
export function publishableStates(): StatePageContent[] {
  return STATE_PROFILES.map((p: StateProfile) => statePageContent(p.code))
    .filter((c): c is StatePageContent => c !== null && c.points.length > 0)
    .sort((a, b) => {
      if (a.noIncomeTax !== b.noIncomeTax) return a.noIncomeTax ? 1 : -1;
      return a.name.localeCompare(b.name);
    });
}

export interface PublishedPosition {
  state_code: string;
  topic: string;
  public_summary: string;
  citation: string | null;
  verified_on: string | null;
}
