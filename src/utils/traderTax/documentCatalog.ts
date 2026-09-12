/**
 * TraderTaxHQ — document request catalog.
 *
 * The catalog is filtered against the intake answers so a client only ever gets
 * asked for documents that actually apply to their facts. Requests are pushed
 * to the client's TitanFile channel as a single secure message, and returning
 * files are matched back to these codes.
 */

import { DocumentCatalogEntry, IntakeAnswers } from '@/types/tradertax';
import { has, hasInstrument, hasSec1256, num, str } from './intakeSchema';

export const DOCUMENT_CATALOG: DocumentCatalogEntry[] = [
  // --- Identity & prior filings -------------------------------------------
  {
    code: 'ID_GOV',
    name: 'Government photo ID',
    category: 'Identity',
    description: 'Driver’s license or passport for the taxpayer (and spouse if filing jointly).',
    required: true,
  },
  {
    code: 'PRIOR_1040',
    name: 'Prior-year federal return (complete PDF)',
    category: 'Prior filings',
    description: 'All schedules and statements, including any 475 election statement and Form 3115.',
    required: true,
  },
  {
    code: 'PRIOR_STATE',
    name: 'Prior-year state return(s)',
    category: 'Prior filings',
    description: 'Every state you filed in last year.',
    required: true,
  },
  {
    code: 'CARRYFORWARD_SCHED',
    name: 'Capital loss and NOL carryforward schedule',
    category: 'Prior filings',
    description: 'From the prior-year return or preparer worksheets.',
    required: false,
    appliesIf: (a) => num(a, 'capital_loss_carryforward') !== 0 || has(a, 'tts_claimed_prior'),
  },

  // --- Broker documents ----------------------------------------------------
  {
    code: 'BROKER_1099B',
    name: 'Form 1099-B / consolidated 1099 (every account)',
    category: 'Broker',
    description: 'Consolidated year-end tax package from each broker, in PDF.',
    required: true,
  },
  {
    code: 'BROKER_ACTIVITY',
    name: 'Year-end activity / trade confirmation report',
    category: 'Broker',
    description:
      'Full-year trade log with execution dates. Needed to substantiate trade count, trading days, and average holding period for the TTS factor analysis.',
    required: true,
  },
  {
    code: 'BROKER_CSV',
    name: 'Trade history export (CSV)',
    category: 'Broker',
    description: 'Machine-readable export used for wash sale and holding period analysis.',
    required: true,
  },
  {
    code: 'BROKER_STMT_DEC',
    name: 'December / year-end account statements',
    category: 'Broker',
    description: 'Shows year-end open positions and account equity.',
    required: true,
  },
  {
    code: 'MARGIN_INTEREST',
    name: 'Margin interest summary',
    category: 'Broker',
    description: 'Annual margin interest charged, by account.',
    required: false,
    appliesIf: (a) => has(a, 'uses_margin') || num(a, 'exp_margin_interest') > 0,
  },
  {
    code: 'FUTURES_1099B',
    name: 'Form 1099-B for regulated futures contracts',
    category: 'Broker',
    description: 'Aggregate profit or loss on Section 1256 contracts (boxes 8–11).',
    required: true,
    appliesIf: (a) => hasSec1256(a),
  },
  {
    code: 'FOREX_STMT',
    name: 'Forex annual statement',
    category: 'Broker',
    description: 'Realized and unrealized gain/loss summary from the forex dealer.',
    required: true,
    appliesIf: (a) => hasInstrument(a, 'forex'),
  },
  {
    code: 'CRYPTO_EXPORT',
    name: 'Digital asset transaction export',
    category: 'Broker',
    description: 'Full transaction history from every exchange and wallet, plus any Form 1099-DA.',
    required: true,
    appliesIf: (a) => hasInstrument(a, 'crypto'),
  },
  {
    code: 'PROP_FIRM_DOCS',
    name: 'Prop firm agreement and payout statements',
    category: 'Broker',
    description: 'Funded account agreement plus any 1099-NEC or K-1 issued.',
    required: true,
    appliesIf: (a) => has(a, 'prop_firm'),
  },
  {
    code: 'IRA_STATEMENTS',
    name: 'IRA / retirement account statements',
    category: 'Broker',
    description:
      'Needed to test for wash sales triggered by replacement purchases inside an IRA (Rev. Rul. 2008-5).',
    required: true,
    appliesIf: (a) => has(a, 'trades_in_ira'),
  },

  // --- Entity --------------------------------------------------------------
  {
    code: 'ENTITY_FORMATION',
    name: 'Entity formation documents',
    category: 'Entity',
    description: 'Articles, operating agreement, EIN letter (CP 575), and state registration.',
    required: true,
    appliesIf: (a) => has(a, 'entity_exists'),
  },
  {
    code: 'S_ELECTION',
    name: 'Form 2553 and IRS acceptance letter (CP 261)',
    category: 'Entity',
    description: 'Confirms the S election is on file and effective.',
    required: true,
    appliesIf: (a) => has(a, 's_election_filed') || str(a, 'entity_type') === 's_corp',
  },
  {
    code: 'ENTITY_BOOKS',
    name: 'Entity books — P&L and balance sheet',
    category: 'Entity',
    description: 'Trial balance or QuickBooks export for the tax year.',
    required: true,
    appliesIf: (a) => has(a, 'entity_exists'),
  },
  {
    code: 'PAYROLL_REPORTS',
    name: 'Payroll reports (W-2, W-3, 941s, state)',
    category: 'Entity',
    description: 'Full-year payroll register and filed employment tax returns.',
    required: true,
    appliesIf: (a) => has(a, 'entity_runs_payroll'),
  },
  {
    code: 'ENTITY_MINUTES',
    name: 'Entity resolutions and minutes',
    category: 'Entity',
    description:
      'Including any internal resolution making a Section 475(f) election within 75 days of inception.',
    required: false,
    appliesIf: (a) => has(a, 'entity_exists'),
  },

  // --- Income & payments ---------------------------------------------------
  {
    code: 'W2',
    name: 'Forms W-2',
    category: 'Income',
    description: 'All employers, taxpayer and spouse.',
    required: true,
    appliesIf: (a) => num(a, 'w2_income') > 0 || num(a, 'spouse_w2_income') > 0,
  },
  {
    code: 'K1',
    name: 'Schedules K-1',
    category: 'Income',
    description: 'Partnership, S-corp, estate, and trust K-1s.',
    required: false,
    appliesIf: (a) => num(a, 'rental_k1_income') !== 0 || has(a, 'entity_exists'),
  },
  {
    code: 'OTHER_1099',
    name: 'Other Forms 1099 (INT, DIV, NEC, MISC, R)',
    category: 'Income',
    description: 'Interest, dividends, contract income, and retirement distributions.',
    required: false,
  },
  {
    code: 'ESTIMATED_PAYMENTS',
    name: 'Estimated tax payment record',
    category: 'Income',
    description: 'Dates and amounts of federal and state estimates, or IRS account transcript.',
    required: true,
    appliesIf: (a) => num(a, 'estimated_payments_made') > 0 || num(a, 'prior_year_total_tax') > 0,
  },

  // --- Expenses ------------------------------------------------------------
  {
    code: 'EXPENSE_SUMMARY',
    name: 'Trading expense summary with receipts',
    category: 'Expenses',
    description: 'Data feeds, software, education, professional fees, and equipment.',
    required: true,
  },
  {
    code: 'HOME_OFFICE_DOCS',
    name: 'Home office support',
    category: 'Expenses',
    description:
      'Square footage, lease or mortgage interest statement, property tax, utilities, and insurance.',
    required: true,
    appliesIf: (a) => has(a, 'home_office'),
  },
  {
    code: 'FIXED_ASSETS',
    name: 'Fixed asset / depreciation schedule',
    category: 'Expenses',
    description: 'Prior depreciation schedule plus invoices for assets placed in service this year.',
    required: false,
    appliesIf: (a) => num(a, 'exp_equipment') > 0 || has(a, 'entity_exists'),
  },

  // --- Retirement & health -------------------------------------------------
  {
    code: 'RETIREMENT_PLAN_DOCS',
    name: 'Retirement plan documents and contribution records',
    category: 'Retirement',
    description: 'Adoption agreement, Form 5500-EZ if applicable, and contribution confirmations.',
    required: false,
    appliesIf: (a) => str(a, 'retirement_plan_type', 'none') !== 'none' || num(a, 'retirement_contributions') > 0,
  },
  {
    code: 'HEALTH_PREMIUMS',
    name: 'Health insurance premium statements',
    category: 'Retirement',
    description: 'Form 1095-A/B/C and premium payment records.',
    required: false,
    appliesIf: (a) => num(a, 'health_premiums') > 0 || str(a, 'health_insurance_source', 'none') !== 'none',
  },

  // --- Compliance ----------------------------------------------------------
  {
    code: 'FOREIGN_ACCOUNTS',
    name: 'Foreign account statements',
    category: 'Compliance',
    description:
      'Year-end and peak balance for every foreign account — drives FinCEN 114 (FBAR) and Form 8938.',
    required: true,
    appliesIf: (a) => has(a, 'foreign_broker'),
  },
  {
    code: 'IRS_NOTICES',
    name: 'IRS / state notices',
    category: 'Compliance',
    description: 'Every page of each notice received.',
    required: true,
    appliesIf: (a) => has(a, 'irs_notices') || has(a, 'under_examination'),
  },
  {
    code: 'IRS_TRANSCRIPTS',
    name: 'IRS account and wage transcripts',
    category: 'Compliance',
    description: 'Account, return, and wage & income transcripts for the years at issue.',
    required: false,
    appliesIf: (a) => has(a, 'irs_notices') || has(a, 'prior_returns_open') || has(a, 'unpaid_balances'),
  },
  {
    code: 'ENGAGEMENT_LETTER',
    name: 'Signed engagement letter',
    category: 'Administrative',
    description: 'Countersigned engagement letter and Form 7216 consent where applicable.',
    required: true,
  },
];

export interface BuiltDocumentRequest {
  code: string;
  name: string;
  category: string;
  description: string;
  is_required: boolean;
  sort_order: number;
}

/** Filters the catalog down to the requests that apply to a client's facts. */
export function buildDocumentRequests(answers: IntakeAnswers): BuiltDocumentRequest[] {
  return DOCUMENT_CATALOG.filter((entry) => (entry.appliesIf ? entry.appliesIf(answers) : true)).map(
    (entry, index) => ({
      code: entry.code,
      name: entry.name,
      category: entry.category,
      description: entry.description,
      is_required: entry.required,
      sort_order: index,
    })
  );
}

/** HTML body for the TitanFile secure message that carries the request list. */
export function buildRequestMessageHtml(
  clientName: string,
  taxYear: number,
  requests: { name: string; category: string; description: string | null; is_required: boolean }[],
  extraNote?: string
): string {
  const byCategory = requests.reduce<Record<string, typeof requests>>((acc, r) => {
    (acc[r.category] ||= []).push(r);
    return acc;
  }, {});

  const sections = Object.entries(byCategory)
    .map(([category, items]) => {
      const rows = items
        .map(
          (i) =>
            `<li><strong>${escapeHtml(i.name)}</strong>${i.is_required ? '' : ' <em>(if applicable)</em>'}` +
            `${i.description ? `<br/><span style="color:#555">${escapeHtml(i.description)}</span>` : ''}</li>`
        )
        .join('');
      return `<h4 style="margin:16px 0 6px">${escapeHtml(category)}</h4><ul style="margin:0;padding-left:18px">${rows}</ul>`;
    })
    .join('');

  return [
    `<p>Hi ${escapeHtml(clientName)},</p>`,
    `<p>To prepare your ${taxYear} trader tax analysis, please upload the following to this secure channel. ` +
      `Everything stays inside TitanFile — please don't email these documents.</p>`,
    sections,
    extraNote ? `<p>${escapeHtml(extraNote)}</p>` : '',
    `<p>Reply in this channel with any questions.</p>`,
  ].join('');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Best-effort match of an uploaded TitanFile file to an outstanding request.
 * Matching is by document code in the filename or folder path first, then by a
 * loose keyword match on the request name.
 */
export function matchFileToRequest<T extends { code: string; name: string; status: string }>(
  file: { name: string; path?: string | null },
  requests: T[]
): T | null {
  const haystack = `${file.path ?? ''}/${file.name}`.toLowerCase();

  const byCode = requests.find((r) => haystack.includes(r.code.toLowerCase()));
  if (byCode) return byCode;

  const open = requests.filter((r) => r.status === 'requested');
  const scored = open
    .map((r) => {
      const words = r.name
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, ' ')
        .split(/\s+/)
        .filter((w) => w.length > 3);
      const hits = words.filter((w) => haystack.includes(w)).length;
      return { request: r, hits };
    })
    .filter((s) => s.hits > 0)
    .sort((a, b) => b.hits - a.hits);

  return scored.length ? scored[0].request : null;
}
