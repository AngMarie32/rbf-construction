/**
 * TraderTaxHQ — consultation memo PDF.
 *
 * Produces the deliverable a client sees after the consultation: the position
 * summary, the numbers behind it, the action plan with deadlines, and the
 * standing disclaimers. The memo is generated from engine output plus whatever
 * narrative the preparer approved — never from raw AI output that hasn't been
 * reviewed.
 */

import jsPDF from 'jspdf';
import { ConsultationAnalysis, TthClient, TthEngagement, TthPosition } from '@/types/tradertax';
import { ttsTierLabel } from './ttsAnalysis';

export interface MemoInput {
  client: TthClient;
  engagement: TthEngagement;
  analysis: ConsultationAnalysis;
  positions: TthPosition[];
  memoNarrative?: string | null;
  preparerName?: string;
  firmName?: string;
}

const M = 54;
const LINE = 13;

const money = (n: number | null | undefined) =>
  n === null || n === undefined || !Number.isFinite(n)
    ? '—'
    : n.toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export function generateConsultationMemo(input: MemoInput): jsPDF {
  const { client, engagement, analysis, positions } = input;
  const pdf = new jsPDF({ unit: 'pt', format: 'letter' });
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  const contentWidth = W - M * 2;
  let y = M;

  const ensureSpace = (needed: number) => {
    if (y + needed > H - M - 24) {
      addFooter(pdf, W, H);
      pdf.addPage();
      y = M;
    }
  };

  const heading = (text: string) => {
    ensureSpace(40);
    y += 10;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.setTextColor(20, 30, 50);
    pdf.text(text, M, y);
    y += 6;
    pdf.setDrawColor(200, 208, 220);
    pdf.line(M, y, W - M, y);
    y += 14;
    pdf.setTextColor(0, 0, 0);
  };

  const body = (text: string, opts: { bold?: boolean; size?: number; indent?: number } = {}) => {
    pdf.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    pdf.setFontSize(opts.size ?? 10);
    const indent = opts.indent ?? 0;
    const lines = pdf.splitTextToSize(text, contentWidth - indent) as string[];
    lines.forEach((line) => {
      ensureSpace(LINE);
      pdf.text(line, M + indent, y);
      y += LINE;
    });
  };

  const bullet = (text: string) => {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    const lines = pdf.splitTextToSize(text, contentWidth - 16) as string[];
    lines.forEach((line, i) => {
      ensureSpace(LINE);
      if (i === 0) pdf.text('•', M + 2, y);
      pdf.text(line, M + 16, y);
      y += LINE;
    });
  };

  const kv = (rows: [string, string][]) => {
    pdf.setFontSize(10);
    rows.forEach(([k, v]) => {
      ensureSpace(LINE);
      pdf.setFont('helvetica', 'bold');
      pdf.text(k, M, y);
      pdf.setFont('helvetica', 'normal');
      const lines = pdf.splitTextToSize(v, contentWidth - 170) as string[];
      lines.forEach((line, i) => {
        if (i > 0) {
          y += LINE;
          ensureSpace(LINE);
        }
        pdf.text(line, M + 170, y);
      });
      y += LINE;
    });
  };

  // --- Header ---------------------------------------------------------------
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(18);
  pdf.text(input.firmName ?? 'TraderTaxHQ', M, y);
  y += 22;
  pdf.setFontSize(13);
  pdf.setTextColor(60, 70, 90);
  pdf.text(`Trader Tax Consultation Memorandum — Tax Year ${engagement.tax_year}`, M, y);
  pdf.setTextColor(0, 0, 0);
  y += 24;

  kv([
    ['Client', client.display_name],
    ['Entity', client.legal_name ?? client.entity_type],
    ['Filing status', (client.filing_status ?? '—').toUpperCase()],
    ['State(s)', [client.home_state, ...(client.other_states ?? [])].filter(Boolean).join(', ') || '—'],
    ['Prepared', new Date().toLocaleDateString('en-US', { dateStyle: 'long' })],
    ['Preparer', input.preparerName ?? '—'],
  ]);

  if (analysis.configStatus !== 'verified') {
    y += 6;
    ensureSpace(34);
    pdf.setFillColor(255, 244, 214);
    pdf.setDrawColor(230, 180, 60);
    pdf.roundedRect(M, y - 10, contentWidth, 30, 3, 3, 'FD');
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(9);
    pdf.text('DRAFT — tax year parameters are unverified.', M + 8, y + 2);
    pdf.setFont('helvetica', 'normal');
    const note = pdf.splitTextToSize(analysis.configNote, contentWidth - 16) as string[];
    pdf.text(note[0] ?? '', M + 8, y + 14);
    y += 34;
  }

  // --- Executive summary ----------------------------------------------------
  heading('Executive summary');
  if (input.memoNarrative) {
    body(input.memoNarrative);
  } else {
    body(analysis.tts.narrative);
    y += 4;
    body(analysis.elections.currentState);
  }

  // --- Position summary -----------------------------------------------------
  heading('Position summary');
  kv([
    ['Trader tax status', `${ttsTierLabel(analysis.tts.tier)} (composite ${analysis.tts.score}/100)`],
    ['Section 475(f)', analysis.elections.recommended.replace(/_/g, ' ')],
    ['Entity', analysis.entity.recommended.replace(/_/g, ' ')],
    ['Projected federal tax', money(analysis.projection.estimatedFederalTax)],
    ['Projected balance due', money(analysis.projection.projectedBalanceDue)],
    ['Marginal rate', `${Math.round(analysis.projection.marginalRate * 100)}%`],
  ]);

  // --- TTS factors ----------------------------------------------------------
  heading('Trader tax status — factor analysis');
  analysis.tts.factors.forEach((f) => {
    ensureSpace(LINE * 3);
    body(`${f.label} — ${Math.round(f.score * 100)}% (weight ${Math.round(f.weight * 100)}%)`, { bold: true });
    body(`Observed: ${f.observed}`, { indent: 12 });
    body(`Benchmark: ${f.benchmark}`, { indent: 12 });
    body(`${f.comment} [${f.authority}]`, { indent: 12 });
    y += 4;
  });

  // --- Elections ------------------------------------------------------------
  heading('Section 475(f) mark-to-market');
  analysis.elections.rationale.forEach(bullet);
  y += 6;
  body('Advantages', { bold: true });
  analysis.elections.tradeoffs.pro.forEach(bullet);
  y += 4;
  body('Costs', { bold: true });
  analysis.elections.tradeoffs.con.forEach(bullet);
  y += 6;
  body('Deadlines', { bold: true });
  analysis.elections.deadlines.forEach((d) =>
    bullet(`${d.dueDate} — ${d.label} (${d.status.replace(/_/g, ' ')}). ${d.description} [${d.authority}]`)
  );

  // --- Entity ---------------------------------------------------------------
  heading('Entity structure');
  analysis.entity.scenarios.forEach((s) => {
    ensureSpace(LINE * 3);
    body(`${s.label} — net ${money(s.netBenefit)}`, { bold: true });
    body(
      `Compensation ${money(s.officerComp)} · retirement ${money(s.retirementDeduction)} · health ${money(
        s.healthInsuranceDeduction
      )} · payroll tax ${money(s.payrollTaxCost)} · admin ${money(s.adminCost)}`,
      { indent: 12 }
    );
    y += 3;
  });
  y += 4;
  analysis.entity.rationale.forEach(bullet);
  analysis.entity.cautions.forEach(bullet);

  // --- Projection -----------------------------------------------------------
  heading('Federal projection');
  kv([
    ['Ordinary income', money(analysis.projection.ordinaryIncome)],
    ['Trading ordinary (475/988)', money(analysis.projection.tradingOrdinary)],
    ['Short-term capital', money(analysis.projection.capitalShortTerm)],
    ['Long-term capital', money(analysis.projection.capitalLongTerm)],
    ['Section 1256 (60/40)', money(analysis.projection.sec1256Net)],
    ['Capital loss used', money(analysis.projection.allowableCapitalLoss)],
    ['Capital loss carryforward', money(analysis.projection.capitalLossCarryforward)],
    ['Taxable income', money(analysis.projection.estimatedTaxableIncome)],
    ['Estimated federal tax', money(analysis.projection.estimatedFederalTax)],
    ['Net investment income tax', money(analysis.projection.niitExposure)],
    ['Payments made', money(analysis.projection.estimatedPaymentsMade)],
    ['Safe harbor target', money(analysis.projection.safeHarborTarget)],
    ['Recommended quarterly', money(analysis.projection.quarterlyRecommendation)],
  ]);
  y += 4;
  body('Assumptions', { bold: true });
  analysis.projection.assumptions.forEach(bullet);

  // --- Action plan ----------------------------------------------------------
  heading('Action plan');
  const rows = positions.length
    ? positions
    : (analysis.positions.map((p, i) => ({
        id: String(i),
        title: p.title,
        recommendation: p.recommendation,
        due_date: p.dueDate,
        status: 'proposed',
        owner: null,
        impact_estimate: p.impactEstimate,
        risk_level: p.riskLevel,
      })) as unknown as TthPosition[]);

  rows.forEach((p, i) => {
    ensureSpace(LINE * 3);
    body(`${i + 1}. ${p.title}`, { bold: true });
    if (p.recommendation) body(p.recommendation, { indent: 14 });
    const meta = [
      p.due_date ? `Due ${p.due_date}` : null,
      p.owner ? `Owner ${p.owner}` : null,
      p.impact_estimate ? `Estimated impact ${money(Number(p.impact_estimate))}` : null,
      `Risk ${p.risk_level}`,
      `Status ${String(p.status).replace(/_/g, ' ')}`,
    ]
      .filter(Boolean)
      .join(' · ');
    body(meta, { indent: 14, size: 9 });
    y += 3;
  });

  // --- Filings --------------------------------------------------------------
  heading('Filing requirements');
  analysis.filings.forEach((f) => {
    bullet(
      `${f.formCode} — ${f.formName}${f.dueDate ? ` (due ${f.dueDate}${f.extendedDueDate ? `, extended ${f.extendedDueDate}` : ''})` : ''}. ${f.reason}${
        f.notes ? ` ${f.notes}` : ''
      }`
    );
  });

  // --- Open items -----------------------------------------------------------
  if (analysis.readiness.gaps.length) {
    heading('Outstanding items');
    analysis.readiness.gaps.forEach((g) => bullet(`${g.blocking ? '[Blocking] ' : ''}${g.label}`));
  }

  // --- Disclaimers ----------------------------------------------------------
  heading('Important notices');
  pdf.setFontSize(8.5);
  analysis.disclaimers.forEach((d) => {
    const lines = pdf.splitTextToSize(d, contentWidth) as string[];
    lines.forEach((line) => {
      ensureSpace(11);
      pdf.text(line, M, y);
      y += 11;
    });
    y += 4;
  });

  addFooter(pdf, W, H);
  return pdf;
}

function addFooter(pdf: jsPDF, W: number, H: number) {
  const page = pdf.getNumberOfPages();
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  pdf.setTextColor(130, 138, 150);
  pdf.text('Privileged and confidential — preparer work product. Not tax advice until reviewed and signed.', M, H - 30);
  pdf.text(`Page ${page}`, W - M, H - 30, { align: 'right' });
  pdf.setTextColor(0, 0, 0);
}

export function downloadConsultationMemo(input: MemoInput) {
  const pdf = generateConsultationMemo(input);
  const safeName = input.client.display_name.replace(/[^a-z0-9]+/gi, '_');
  pdf.save(`TraderTaxHQ_${safeName}_${input.engagement.tax_year}_Consultation_Memo.pdf`);
}
