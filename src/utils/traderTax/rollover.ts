/**
 * TraderTaxHQ — prior-year rollover.
 *
 * In February nobody wants to answer ninety questions they already answered
 * last year. Rollover carries forward the answers that describe *who the
 * client is* and clears the ones that describe *what happened this year*, so
 * the client confirms deltas instead of re-typing a profile.
 *
 * The split matters: carrying a stale number forward silently is worse than
 * asking again. Anything that represents a period result is cleared, and
 * anything carried is marked so the UI can ask the client to confirm it.
 */

import { IntakeAnswers, TthFiling, TthPosition } from '@/types/tradertax';
import { allIntakeFields } from './intakeSchema';

/**
 * Answer keys that describe a period result and must never carry forward.
 * Everything not listed here, and not a contact detail, carries.
 */
const PERIOD_RESULT_KEYS = new Set([
  // Trading activity is measured per year
  'trading_days',
  'total_trades',
  'avg_holding_days',
  'weekly_hours',
  'months_active',
  'longest_gap_days',
  'avg_account_equity',
  // Results
  'securities_net_gain',
  'short_term_portion',
  'sec1256_net_gain',
  'wash_sale_disallowed',
  'crypto_net_gain',
  'forex_net_gain',
  'unrealized_open_positions',
  // Income and payments
  'w2_income',
  'spouse_w2_income',
  'self_employment_income',
  'rental_k1_income',
  'interest_dividends',
  'estimated_payments_made',
  'withholding',
  // Expenses
  'exp_margin_interest',
  'exp_data_software',
  'exp_education',
  'exp_equipment',
  'exp_professional',
  'exp_other',
  'home_annual_cost',
  // Contributions and premiums
  'retirement_contributions',
  'employer_plan_deferrals',
  'health_premiums',
  // Point-in-time compliance answers
  'irs_notices',
  'notice_detail',
  'under_examination',
  'unpaid_balances',
  'gifts_inheritance',
  'staking_mining',
  'received_1099da',
  'foreign_max_balance',
  // Goals restate each year
  'primary_goal',
  'client_questions',
  'deadline_pressure',
  'additional_context',
  // Prior-year figures are recomputed from the year just closed
  'prior_year_agi',
  'prior_year_total_tax',
  'capital_loss_carryforward',
]);

export interface RolloverPlan {
  /** Answers to seed the new intake with. */
  answers: IntakeAnswers;
  /** Keys carried from last year — the client should confirm these. */
  carried: { key: string; label: string; value: unknown }[];
  /** Keys deliberately cleared because they are period results. */
  cleared: { key: string; label: string }[];
  /** Figures derived from the prior year rather than copied. */
  derived: { key: string; label: string; value: unknown; basis: string }[];
  notes: string[];
}

export interface PriorYearSummary {
  taxYear: number;
  answers: IntakeAnswers;
  /** Capital loss carryforward computed by last year's projection, if any. */
  capitalLossCarryforward?: number | null;
  /** Prior-year total tax and AGI, for the estimated tax safe harbor. */
  priorYearTotalTax?: number | null;
  priorYearAgi?: number | null;
}

export function buildRolloverPlan(prior: PriorYearSummary, newTaxYear: number): RolloverPlan {
  const fields = allIntakeFields();
  const labelFor = (key: string) => fields.find((f) => f.key === key)?.label ?? key;

  const answers: IntakeAnswers = {};
  const carried: RolloverPlan['carried'] = [];
  const cleared: RolloverPlan['cleared'] = [];
  const derived: RolloverPlan['derived'] = [];
  const notes: string[] = [];

  Object.entries(prior.answers ?? {}).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return;
    if (Array.isArray(value) && value.length === 0) return;

    if (PERIOD_RESULT_KEYS.has(key)) {
      cleared.push({ key, label: labelFor(key) });
      return;
    }
    answers[key] = value;
    carried.push({ key, label: labelFor(key), value });
  });

  // Last year's closing position becomes this year's opening position.
  if (prior.capitalLossCarryforward && prior.capitalLossCarryforward !== 0) {
    const value = -Math.abs(prior.capitalLossCarryforward);
    answers.capital_loss_carryforward = value;
    derived.push({
      key: 'capital_loss_carryforward',
      label: labelFor('capital_loss_carryforward'),
      value,
      basis: `Unused capital loss from the ${prior.taxYear} projection.`,
    });
  }

  if (prior.priorYearTotalTax) {
    answers.prior_year_total_tax = prior.priorYearTotalTax;
    derived.push({
      key: 'prior_year_total_tax',
      label: labelFor('prior_year_total_tax'),
      value: prior.priorYearTotalTax,
      basis: `${prior.taxYear} total tax — drives the ${newTaxYear} estimated tax safe harbor.`,
    });
  }
  if (prior.priorYearAgi) {
    answers.prior_year_agi = prior.priorYearAgi;
    derived.push({
      key: 'prior_year_agi',
      label: labelFor('prior_year_agi'),
      value: prior.priorYearAgi,
      basis: `${prior.taxYear} AGI — determines whether the 110% safe harbor applies.`,
    });
  }

  // An election made in a prior year stays in force until revoked, so it
  // carries — but the year it became effective must not drift forward.
  if (answers.sec475_elected === true) {
    notes.push(
      `The section 475(f) election from ${
        prior.answers.sec475_effective_year ?? 'a prior year'
      } is carried forward. It remains in force until revoked on the Rev. Proc. 2017-30 calendar — confirm no revocation was filed.`
    );
  }
  if (answers.entity_exists === true) {
    notes.push('Entity details carried forward. Confirm nothing changed — new members, a new state, a dissolved entity.');
  }

  notes.push(
    `${carried.length} answers carried from ${prior.taxYear}. The client confirms them rather than retyping; ${cleared.length} period figures were cleared and must be re-entered.`
  );

  return { answers, carried, cleared, derived, notes };
}

/**
 * Filings worth recreating for the new year. Extensions and one-off forms
 * (Form 3115 in particular) are not carried — a 3115 belongs to the year the
 * method changed.
 */
const NON_RECURRING_FORMS = new Set(['3115', '4868', '7004', '1040ES']);

export function rollForwardFilings(
  priorFilings: TthFiling[],
  newTaxYear: number
): { form_code: string; form_name: string; jurisdiction: string; entity_scope: string; notes: string | null }[] {
  const seen = new Set<string>();
  return priorFilings
    .filter((f) => {
      if (NON_RECURRING_FORMS.has(f.form_code)) return false;
      if (f.status === 'n_a') return false;
      const key = `${f.form_code}|${f.jurisdiction}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .map((f) => ({
      form_code: f.form_code,
      form_name: f.form_name,
      jurisdiction: f.jurisdiction,
      entity_scope: f.entity_scope,
      notes: `Carried from ${f.tax_year}. Confirm it still applies for ${newTaxYear}.`,
    }));
}

/**
 * Positions still open at year end become the new year's starting agenda.
 * Anything declined or already implemented is finished business.
 */
export function rollForwardPositions(priorPositions: TthPosition[]) {
  return priorPositions
    .filter((p) => ['proposed', 'accepted', 'deferred'].includes(p.status))
    .map((p) => ({
      code: p.code,
      title: p.title,
      category: p.category,
      recommendation: p.recommendation,
      rationale: p.rationale,
      authority: p.authority,
      risk_level: p.risk_level,
      status: 'proposed' as const,
      notes: `Carried forward — was "${p.status}" last year.`,
    }));
}
