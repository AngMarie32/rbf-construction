/**
 * TraderTaxHQ — consultation analysis orchestrator.
 *
 * Runs every deterministic engine against a client's intake and document
 * status, then assembles the findings, recommended positions, agenda, and
 * open questions that drive the consultation and the filing plan.
 *
 * The AI memo writer is downstream of this file and is fed only these outputs
 * — it is not allowed to invent numbers or conclusions of its own.
 */

import {
  AnalysisFinding,
  ConsultationAnalysis,
  IntakeAnswers,
  ReadinessGap,
  RecommendedPosition,
  TthDocumentRequest,
} from '@/types/tradertax';
import { getTaxYearConfig } from './taxYearConfig';
import {
  has,
  hasInstrument,
  hasSec1256,
  intakeCompletion,
  missingAnalysisFields,
  missingRequiredFields,
  num,
  str,
} from './intakeSchema';
import { assessTraderTaxStatus, ttsTierLabel } from './ttsAnalysis';
import { assessPropFirm } from './propFirmAnalysis';
import { assessElections } from './electionEngine';
import { assessEntity } from './entityAnalysis';
import { projectTax } from './projection';
import { buildFilingRequirements, filingCalendar } from './filingMatrix';

export const ENGINE_VERSION = 'v1.0.0';

export interface AnalysisInput {
  taxYear: number;
  answers: IntakeAnswers;
  documents: Pick<TthDocumentRequest, 'code' | 'name' | 'is_required' | 'status'>[];
}

export function runConsultationAnalysis(input: AnalysisInput): ConsultationAnalysis {
  const { taxYear, answers, documents } = input;
  const cfg = getTaxYearConfig(taxYear);
  const cal = filingCalendar(taxYear);

  // --- Engines --------------------------------------------------------------
  const tts = assessTraderTaxStatus(answers, taxYear);
  const prop = assessPropFirm(answers, taxYear);

  // A funded trader already reports on Schedule C through the prop activity,
  // so trader tax status is only load-bearing for their OWN account. When
  // there is no meaningful personal trading, a weak TTS score is not a problem
  // to solve — it is simply the wrong question for this client.
  const personalTradingVolume =
    num(answers, 'total_trades') + Math.abs(num(answers, 'securities_net_gain'));
  const propOnly = prop.applicable && personalTradingVolume === 0;
  const ttsSupported = tts.tier === 'strong' || tts.tier === 'defensible';
  const elections = assessElections(answers, taxYear);
  const mtmElected = has(answers, 'sec475_elected');
  const entity = assessEntity(answers, taxYear, ttsSupported);
  const projection = projectTax(answers, taxYear, { ttsTier: tts.tier, mtmElected });
  const filings = buildFilingRequirements(answers, taxYear, {
    ttsSupported,
    mtmElected,
    form3115Required: elections.form3115Required,
  });

  // --- Readiness ------------------------------------------------------------
  const requiredDocs = documents.filter((d) => d.is_required);
  const receivedDocs = documents.filter((d) => d.status === 'received' || d.status === 'reviewed');
  const gaps: ReadinessGap[] = [];

  missingRequiredFields(answers).forEach((f) =>
    gaps.push({ kind: 'intake_field', key: f.key, label: `${f.sectionTitle}: ${f.label}`, blocking: true })
  );
  missingAnalysisFields(answers)
    .filter((f) => !gaps.some((g) => g.key === f.key))
    .forEach((f) =>
      gaps.push({ kind: 'intake_field', key: f.key, label: `${f.sectionTitle}: ${f.label}`, blocking: false })
    );
  documents
    .filter((d) => d.is_required && d.status === 'requested')
    .forEach((d) => gaps.push({ kind: 'document', key: d.code, label: d.name, blocking: true }));

  const completion = intakeCompletion(answers);
  const readyForConsult = gaps.filter((g) => g.blocking).length === 0 && completion >= 80;

  // --- Findings -------------------------------------------------------------
  const findings: AnalysisFinding[] = [];
  const positions: RecommendedPosition[] = [];

  // TTS
  if (propOnly) {
    findings.push({
      id: 'tts_status',
      area: 'Trader tax status',
      severity: 'info',
      statement: 'Trader tax status is not the operative question for this client.',
      detail:
        'All of the trading activity runs through a funded account, so the income is already business income on Schedule C and the expenses are already deductible there. Trader tax status would only matter for a personal account traded alongside it. The factor analysis is retained below for reference, not as a conclusion.',
      authority: 'Commissioner v. Groetzinger, 480 U.S. 23 (1987)',
    });
  } else {
    findings.push({
      id: 'tts_status',
      area: 'Trader tax status',
      severity: ttsSupported ? 'info' : 'high',
      statement: `Trader tax status is ${ttsTierLabel(tts.tier).toLowerCase()} (composite ${tts.score}/100).`,
      detail: tts.narrative,
      authority:
        'Commissioner v. Groetzinger, 480 U.S. 23 (1987); Endicott v. Commissioner, T.C. Memo. 2013-199',
    });
  }

  if (!propOnly) positions.push({
    code: 'TTS_CLAIM',
    title: ttsSupported ? 'Claim trader tax status' : 'Do not claim trader tax status this year',
    category: 'tts',
    recommendation: ttsSupported
      ? 'Report the trading business on Schedule C and deduct trading expenses, keeping trading gains on their own schedule.'
      : 'Report as an investor. Claiming a business without qualifying activity puts the expenses and any 475 position at risk.',
    rationale: tts.narrative,
    authority: 'IRC sec. 162; Groetzinger; Endicott',
    riskLevel: tts.tier === 'strong' ? 'low' : tts.tier === 'defensible' ? 'medium' : 'high',
    impactEstimate: ttsSupported ? estimateExpenseValue(answers, projection.marginalRate) : null,
    dueDate: cal.individualDue,
  });

  // Prop firm activity — findings and positions come from its own engine.
  findings.push(...prop.findings);
  positions.push(...prop.positions);

  // 475 election
  const openElection = elections.deadlines.find((d) => d.status === 'open' && d.code.startsWith('ELECT_475'));
  if (!propOnly) findings.push({
    id: 'election_475',
    area: 'Section 475(f)',
    severity:
      elections.recommended.startsWith('elect_475') && openElection && (openElection.daysRemaining ?? 999) < 60
        ? 'critical'
        : elections.form3115Required && mtmElected
        ? 'critical'
        : 'medium',
    statement: elections.currentState,
    detail: elections.rationale.join(' '),
    authority: 'IRC sec. 475(f); Rev. Proc. 99-17',
    estimatedImpact: elections.estimatedImpact,
  });

  if (!propOnly && elections.recommended !== 'do_not_elect') {
    positions.push({
      code: `POS_${elections.recommended.toUpperCase()}`,
      title: electionTitle(elections.recommended),
      category: 'election',
      recommendation: elections.rationale[0] ?? '',
      rationale: elections.rationale.join(' '),
      authority: 'IRC sec. 475(f); Rev. Proc. 99-17; Rev. Proc. 2017-30',
      riskLevel: 'medium',
      impactEstimate: elections.estimatedImpact,
      dueDate: openElection?.dueDate ?? null,
    });
  }

  if (mtmElected && elections.form3115Required) {
    positions.push({
      code: 'FILE_3115',
      title: 'File Form 3115 to perfect the 475 election',
      category: 'compliance',
      recommendation:
        'File Form 3115 with the first effective year’s return, with the duplicate copy to the IRS and the section 481(a) adjustment computed.',
      rationale:
        'An election statement without the accounting method change is the most common way a mark-to-market position is unwound on exam.',
      authority: 'Form 3115 automatic change (DCN 64); Rev. Proc. 2015-13',
      riskLevel: 'high',
      impactEstimate: null,
      dueDate: cal.individualDue,
    });
  }

  // Capital loss trap
  if (projection.capitalLossCarryforward > 0) {
    findings.push({
      id: 'capital_loss_trap',
      area: 'Loss utilization',
      severity: projection.capitalLossCarryforward > 50000 ? 'high' : 'medium',
      statement: `$${Math.round(projection.capitalLossCarryforward).toLocaleString()} of capital loss carries forward — only $${projection.allowableCapitalLoss.toLocaleString()} is usable this year.`,
      detail:
        'Capital losses offset capital gains without limit but only a small amount of ordinary income each year. A section 475(f) election converts future trading losses to ordinary, but it does not free losses already trapped in the capital bucket.',
      authority: 'IRC sec. 1211(b), sec. 1212(b)',
      estimatedImpact: projection.capitalLossCarryforward * projection.marginalRate,
    });
  }

  // Wash sales
  if (projection.washSaleAddback > 0) {
    findings.push({
      id: 'wash_sales',
      area: 'Wash sales',
      severity: projection.washSaleAddback > 25000 ? 'high' : 'medium',
      statement: `$${projection.washSaleAddback.toLocaleString()} of wash sale losses were disallowed.`,
      detail: has(answers, 'trades_in_ira')
        ? 'The taxpayer also trades in an IRA. A replacement purchase inside an IRA permanently disallows the loss — there is no basis adjustment to recover it later. Reconcile taxable and IRA activity across the 61-day windows.'
        : 'Check whether the disallowance reverses by year end. Positions closed and not repurchased within 30 days release the deferral; positions still open at year end carry the deferral into next year.',
      authority: 'IRC sec. 1091; Rev. Rul. 2008-5',
      estimatedImpact: projection.washSaleAddback * projection.marginalRate,
    });
  }

  // Entity — the self-directed model only applies when there is own-account
  // trading. The prop engine handles the funded-account case separately.
  if (!propOnly) findings.push({
    id: 'entity_structure',
    area: 'Entity structure',
    severity: entity.recommended === 'current' ? 'info' : 'medium',
    statement:
      entity.recommended === 'current'
        ? 'Current structure is the right one on these numbers.'
        : `A restructure to ${entity.scenarios.find((s) => s.key === entity.recommended)?.label} models out ahead.`,
    detail: [...entity.rationale, ...entity.cautions].join(' '),
    authority: 'IRC sec. 401(a), sec. 162(l), sec. 3121',
    estimatedImpact: entity.scenarios.find((s) => s.key === entity.recommended)?.netBenefit ?? null,
  });

  if (!propOnly && entity.recommended !== 'current') {
    const scenario = entity.scenarios.find((s) => s.key === entity.recommended);
    positions.push({
      code: `ENTITY_${entity.recommended.toUpperCase()}`,
      title: `Adopt ${scenario?.label}`,
      category: 'entity',
      recommendation: scenario?.description ?? '',
      rationale: entity.rationale.join(' '),
      authority: 'IRC sec. 162(l); sec. 401(a); Rev. Rul. 74-44 (reasonable compensation)',
      riskLevel: 'medium',
      impactEstimate: scenario?.netBenefit ?? null,
      dueDate: null,
    });

    if ((scenario?.retirementDeduction ?? 0) > 0) {
      positions.push({
        code: 'RETIREMENT_PLAN',
        title: 'Adopt a Solo 401(k) funded by owner compensation',
        category: 'retirement',
        recommendation: `Fund approximately $${Math.round(scenario?.retirementDeduction ?? 0).toLocaleString()} against W-2 compensation of $${Math.round(scenario?.officerComp ?? 0).toLocaleString()}.`,
        rationale:
          'Trading gains are not earned income, so the plan has to be funded through W-2 compensation from a management entity. The plan must be adopted by the required date for the year — check the current adoption deadline before relying on it.',
        authority: 'IRC sec. 401(a); sec. 415(c); SECURE Act sec. 201',
        riskLevel: 'low',
        impactEstimate: (scenario?.retirementDeduction ?? 0) * projection.marginalRate,
        dueDate: cal.individualDue,
      });
    }
  }

  // Estimated tax
  if (projection.projectedBalanceDue > 1000) {
    findings.push({
      id: 'estimated_tax',
      area: 'Estimated tax',
      severity: projection.projectedBalanceDue > 25000 ? 'high' : 'medium',
      statement: `Projected federal balance due of $${Math.round(projection.projectedBalanceDue).toLocaleString()}.`,
      detail: `Safe harbor target is $${Math.round(projection.safeHarborTarget).toLocaleString()}; $${Math.round(projection.estimatedPaymentsMade).toLocaleString()} has been paid. Recommended remaining quarterly payment: $${projection.quarterlyRecommendation.toLocaleString()}. Quarterly dates for ${taxYear}: ${cal.q1}, ${cal.q2}, ${cal.q3}, ${cal.q4}.`,
      authority: 'IRC sec. 6654',
      estimatedImpact: projection.projectedBalanceDue,
    });
    positions.push({
      code: 'ESTIMATES',
      title: 'Get onto the estimated tax safe harbor',
      category: 'estimated_tax',
      recommendation: `Pay $${projection.quarterlyRecommendation.toLocaleString()} per remaining quarter, or increase withholding, which is treated as paid ratably across the year.`,
      rationale:
        'Withholding is treated as paid evenly across the year regardless of when it happens, which can cure an underpayment that quarterly estimates cannot.',
      authority: 'IRC sec. 6654(g)',
      riskLevel: 'low',
      impactEstimate: null,
      dueDate: cal.q4,
    });
  }

  // Foreign reporting
  const foreignMax = num(answers, 'foreign_max_balance');
  if (foreignMax >= cfg.fbarThreshold) {
    findings.push({
      id: 'fbar',
      area: 'Foreign reporting',
      severity: 'critical',
      statement: `FBAR is required — peak foreign balance of $${foreignMax.toLocaleString()} exceeded $${cfg.fbarThreshold.toLocaleString()}.`,
      detail:
        'FinCEN Form 114 is filed separately from the return with an automatic extension to October. Non-willful penalties are assessed per report, and willful penalties are far worse. Confirm prior years are filed.',
      authority: '31 U.S.C. sec. 5314; 31 CFR 1010.350',
    });
  }

  // Crypto
  if (hasInstrument(answers, 'crypto')) {
    findings.push({
      id: 'digital_assets',
      area: 'Digital assets',
      severity: 'medium',
      statement: 'Digital asset activity requires separate treatment from securities.',
      detail:
        'Digital assets are property, not securities: outside a 475(f)(1) securities election and outside section 1091 as currently written. Basis must be tracked per wallet or account under the section 1012 regulations, and any staking, mining, or lending income is ordinary when received.',
      authority: 'Notice 2014-21; Rev. Rul. 2023-14; Treas. Reg. sec. 1.1012-1(j)',
    });
  }

  // Forex
  if (hasInstrument(answers, 'forex') && !has(answers, 'sec988_capital_election')) {
    findings.push({
      id: 'forex_988',
      area: 'Forex',
      severity: 'info',
      statement: 'Forex results default to ordinary treatment under section 988.',
      detail:
        'Ordinary treatment is usually the better answer for a losing year because it sidesteps the capital loss limitation. The capital gain election under 988(a)(1)(B) is made contemporaneously in the books and records, transaction by transaction — it cannot be made after the fact.',
      authority: 'IRC sec. 988(a)(1)(B); Treas. Reg. sec. 1.988-3(b)',
    });
  }

  // 1256 loss carryback
  if (hasSec1256(answers) && num(answers, 'sec1256_net_gain') < 0) {
    findings.push({
      id: 'sec1256_carryback',
      area: 'Section 1256',
      severity: 'medium',
      statement: `Net section 1256 loss of $${Math.abs(num(answers, 'sec1256_net_gain')).toLocaleString()} may be carried back three years.`,
      detail:
        'A net section 1256 contract loss can be carried back three years against prior section 1256 gains on Form 1045, applied to the earliest year first. Check the three prior returns for 1256 gains before defaulting to a carryforward.',
      authority: 'IRC sec. 1212(c)',
      estimatedImpact: Math.abs(num(answers, 'sec1256_net_gain')) * 0.25,
    });
  }

  // Compliance flags
  if (has(answers, 'under_examination') || has(answers, 'irs_notices')) {
    findings.push({
      id: 'exam_exposure',
      area: 'Controversy',
      severity: 'high',
      statement: 'There is an open notice or examination.',
      detail: `${str(answers, 'notice_detail', 'No detail provided on intake.')} Pull account transcripts before taking any new position, and do not file a change of accounting method into an open exam without considering its effect.`,
      authority: 'IRM 4.10; Circular 230 sec. 10.21',
    });
  }

  if (has(answers, 'prior_returns_open')) {
    findings.push({
      id: 'unfiled_returns',
      area: 'Compliance',
      severity: 'high',
      statement: 'Prior-year returns are unfiled.',
      detail:
        'Unfiled years block a clean 475 election history and keep the assessment statute open indefinitely. Sequence the cleanup before making new elections.',
      authority: 'IRC sec. 6501(c)(3)',
    });
  }

  // Config warning
  if (cfg.status !== 'verified') {
    findings.push({
      id: 'config_unverified',
      area: 'Engine',
      severity: 'info',
      statement: `Tax year ${taxYear} parameters are marked unverified.`,
      detail: cfg.sourceNote,
    });
  }

  // --- Agenda and open questions -------------------------------------------
  const consultAgenda = buildAgenda(tts.tier, elections, entity, projection, findings);
  if (prop.applicable) {
    consultAgenda.unshift(
      `Funded account income: $${Math.round(prop.grossPayouts).toLocaleString()} of payouts, ${
        prop.se ? `$${Math.round(prop.se.total).toLocaleString()} of self-employment tax` : 'characterization to confirm'
      }. This is the headline, not trader status.`
    );
  }
  const clientQuestions = buildQuestions(answers, tts, gaps);

  return {
    engineVersion: ENGINE_VERSION,
    generatedAt: new Date().toISOString(),
    taxYear,
    configStatus: cfg.status,
    configNote: cfg.sourceNote,
    readiness: {
      intakeCompletion: completion,
      documentsReceived: receivedDocs.length,
      documentsRequired: requiredDocs.length,
      gaps,
      readyForConsult,
    },
    tts,
    propFirm: prop.applicable
      ? {
          characterization: prop.characterization,
          characterizationNote: prop.characterizationNote,
          grossPayouts: prop.grossPayouts,
          deductibleFees: prop.deductibleFees,
          netProfit: prop.netProfit,
          selfEmploymentTax: prop.se?.total ?? 0,
          qbiEstimate: prop.qbiEstimate,
          qbiNote: prop.qbiNote,
          retirementCapacity: prop.retirementCapacity,
          healthInsuranceDeduction: prop.healthInsuranceDeduction,
          recommendedStructure: prop.recommendedStructure,
          hobbyLossRisk: prop.hobbyLossRisk,
          scenarios: prop.scenarios.map((sc) => ({
            key: sc.key,
            label: sc.label,
            description: sc.description,
            reasonableComp: sc.reasonableComp,
            employmentTax: sc.employmentTax,
            adminCost: sc.adminCost,
            qbiEstimate: sc.qbiEstimate,
            netBenefit: sc.netBenefit,
            notes: sc.notes,
          })),
        }
      : null,
    elections,
    entity,
    projection,
    filings,
    findings: findings.sort((a, b) => severityRank(b.severity) - severityRank(a.severity)),
    positions,
    consultAgenda,
    clientQuestions,
    disclaimers: [
      'This analysis is draft preparer work product generated from client-supplied intake data. It is not tax advice and must be reviewed by a licensed practitioner before it is delivered to the client.',
      'Figures are planning estimates. They exclude AMT, credits, state tax, and the qualified business income deduction unless stated otherwise.',
      'Trader tax status is a facts-and-circumstances determination made separately for each tax year. Nothing here guarantees a position will be sustained on examination.',
      'Election deadlines are computed from the standard calendar-year rules. Confirm against the client’s actual tax year and filing history before relying on any date.',
    ],
  };
}

function severityRank(s: AnalysisFinding['severity']): number {
  return { critical: 3, high: 2, medium: 1, info: 0 }[s];
}

function electionTitle(rec: string): string {
  switch (rec) {
    case 'elect_475_securities':
      return 'Make a Section 475(f)(1) securities mark-to-market election';
    case 'elect_475_securities_and_commodities':
      return 'Make a Section 475(f) election covering securities and commodities';
    case 'revoke_475':
      return 'Revoke or narrow the existing Section 475(f) election';
    case 'defer_decision':
      return 'Model the Section 475(f) election before deciding';
    default:
      return 'Section 475(f) election — no change';
  }
}

function estimateExpenseValue(answers: IntakeAnswers, rate: number): number {
  const expenses =
    num(answers, 'exp_margin_interest') +
    num(answers, 'exp_data_software') +
    num(answers, 'exp_education') +
    num(answers, 'exp_equipment') +
    num(answers, 'exp_professional') +
    num(answers, 'exp_other');
  return Math.round(expenses * rate);
}

function buildAgenda(
  tier: string,
  elections: ReturnType<typeof assessElections>,
  entity: ReturnType<typeof assessEntity>,
  projection: ReturnType<typeof projectTax>,
  findings: AnalysisFinding[]
): string[] {
  const agenda = [
    `Trader tax status: walk the factor analysis and what has to be documented (current read: ${tier}).`,
    `Section 475(f): ${elections.currentState} Decision needed on ${elections.recommended.replace(/_/g, ' ')}.`,
  ];

  const criticalDeadline = elections.deadlines.find((d) => d.status === 'open');
  if (criticalDeadline) {
    agenda.push(
      `Deadline: ${criticalDeadline.label} — ${criticalDeadline.dueDate} (${criticalDeadline.daysRemaining} days).`
    );
  }

  agenda.push(`Entity structure: ${entity.recommended === 'current' ? 'stay as-is and why' : `move to ${entity.recommended}`}.`);
  agenda.push(
    `Cash: projected federal tax $${Math.round(projection.estimatedFederalTax).toLocaleString()}, balance due $${Math.round(
      projection.projectedBalanceDue
    ).toLocaleString()}, quarterly $${projection.quarterlyRecommendation.toLocaleString()}.`
  );

  findings
    .filter((f) => f.severity === 'critical' || f.severity === 'high')
    .forEach((f) => agenda.push(`${f.area}: ${f.statement}`));

  agenda.push('Scope, fee, and the document list that has to land before preparation starts.');
  return agenda;
}

function buildQuestions(
  answers: IntakeAnswers,
  tts: ReturnType<typeof assessTraderTaxStatus>,
  gaps: ReadinessGap[]
): string[] {
  const questions: string[] = [];

  tts.weaknesses.forEach((w) => questions.push(`Substantiation needed — ${w}. What records support this?`));
  if (tts.missingData.length) {
    questions.push(`Pull from the broker activity report: ${tts.missingData.join(', ')}.`);
  }

  if (has(answers, 'sec475_elected') && !has(answers, 'sec475_form3115_filed')) {
    questions.push('Can you produce the filed Form 3115 and the original election statement from the year of election?');
  }
  if (has(answers, 'trades_in_ira')) {
    questions.push('Do you ever buy the same or a substantially identical security in the IRA within 30 days of a loss in the taxable account?');
  }
  if (has(answers, 'entity_exists')) {
    questions.push('Are the trading accounts titled in the entity’s name, and is all trading actually run through them?');
  }
  if (has(answers, 'prop_firm')) {
    questions.push('How does the prop firm report your payouts — 1099-NEC, K-1, or something else? That determines self-employment tax exposure.');
  }
  if (hasInstrument(answers, 'crypto')) {
    questions.push('Which exchanges and wallets were used, and do you have complete cost basis records for each?');
  }
  if (str(answers, 'client_questions')) {
    questions.push(`Client’s own questions: ${str(answers, 'client_questions')}`);
  }

  gaps
    .filter((g) => g.blocking)
    .slice(0, 8)
    .forEach((g) => questions.push(`Outstanding: ${g.label}`));

  return questions;
}
