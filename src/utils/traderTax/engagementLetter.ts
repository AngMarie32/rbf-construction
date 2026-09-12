/**
 * TraderTaxHQ — engagement letter.
 *
 * Produces the letter that has to be signed before work starts, sized to the
 * service being sold. It includes the section 7216 consent language a preparer
 * needs before using or disclosing return information for anything beyond
 * preparing the return.
 *
 * This is a starting template assembled from the engagement record. Have
 * counsel review the terms once, then treat that reviewed version as the
 * firm's standard — do not send an unreviewed letter to a client.
 */

import jsPDF from 'jspdf';
import { TthClient, TthEngagement, TthFirmProfile } from '@/types/tradertax';

export interface EngagementLetterInput {
  client: TthClient;
  engagement: TthEngagement;
  firm: TthFirmProfile | null;
  /** Scope lines — usually the filing checklist plus the advisory work. */
  scopeItems: string[];
  /** Explicit exclusions. Ambiguity here is what causes fee disputes. */
  exclusions?: string[];
  feeText?: string;
}

const M = 56;
const LINE = 13;

const money = (n: number | null | undefined) =>
  n === null || n === undefined
    ? null
    : Number(n).toLocaleString('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });

export const DEFAULT_EXCLUSIONS = [
  'Bookkeeping, trade accounting, or reconstruction of cost basis from raw broker or exchange data.',
  'Audit, review, or compilation of financial statements.',
  'Representation in an examination, appeal, or collection matter, which is engaged separately.',
  'Returns for years or jurisdictions not listed in the scope above.',
  'Legal advice, investment advice, or advice on the merits of any trading strategy.',
];

export function buildScopeFromFilings(
  filings: { form_code: string; form_name: string; jurisdiction: string }[]
): string[] {
  const federal = filings.filter((f) => f.jurisdiction === 'federal');
  const states = Array.from(new Set(filings.filter((f) => f.jurisdiction !== 'federal').map((f) => f.jurisdiction)));
  const out: string[] = [];
  if (federal.length) {
    out.push(
      `Preparation of the federal return and supporting forms: ${federal
        .map((f) => f.form_code)
        .join(', ')}.`
    );
  }
  states.forEach((s) => out.push(`Preparation of the ${s} state return.`));
  return out;
}

export interface SignatureAnchor {
  field_type: 'signature' | 'date';
  page_number: number;
  x_pct: number;
  y_pct: number;
  width_pct: number;
  height_pct: number;
}

export interface GeneratedLetter {
  pdf: jsPDF;
  /**
   * Where the signature and date lines actually landed. The block flows with
   * the content, so these are measured at draw time rather than assumed —
   * hardcoded percentages drift the moment the scope list changes length.
   */
  anchors: SignatureAnchor[];
}

export function generateEngagementLetter(input: EngagementLetterInput): GeneratedLetter {
  const { client, engagement, firm } = input;
  const pdf = new jsPDF({ unit: 'pt', format: 'letter' });
  const W = pdf.internal.pageSize.getWidth();
  const H = pdf.internal.pageSize.getHeight();
  const width = W - M * 2;
  let y = M;

  const firmName = firm?.firm_name ?? 'TraderTaxHQ';

  const space = (needed: number) => {
    if (y + needed > H - M - 24) {
      pdf.addPage();
      y = M;
    }
  };

  const heading = (text: string) => {
    space(38);
    y += 10;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(11);
    pdf.text(text, M, y);
    y += LINE + 2;
  };

  const body = (text: string, indent = 0) => {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    (pdf.splitTextToSize(text, width - indent) as string[]).forEach((line) => {
      space(LINE);
      pdf.text(line, M + indent, y);
      y += LINE;
    });
  };

  const bullet = (text: string) => {
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(10);
    (pdf.splitTextToSize(text, width - 16) as string[]).forEach((line, i) => {
      space(LINE);
      if (i === 0) pdf.text('•', M + 2, y);
      pdf.text(line, M + 16, y);
      y += LINE;
    });
  };

  // --- Letterhead ----------------------------------------------------------
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(16);
  pdf.text(firmName, M, y);
  y += 16;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  pdf.setTextColor(90, 100, 115);
  const addr = [firm?.street, firm?.city, firm?.state, firm?.postal_code].filter(Boolean).join(', ');
  if (addr) {
    pdf.text(addr, M, y);
    y += 11;
  }
  const contact = [firm?.phone, firm?.email].filter(Boolean).join(' · ');
  if (contact) {
    pdf.text(contact, M, y);
    y += 11;
  }
  pdf.setTextColor(0, 0, 0);
  y += 12;

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(13);
  pdf.text(`Engagement letter — tax year ${engagement.tax_year}`, M, y);
  y += 20;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text(new Date().toLocaleDateString('en-US', { dateStyle: 'long' }), M, y);
  y += LINE;
  pdf.text(client.legal_name ?? client.display_name, M, y);
  y += LINE;
  if (client.email) {
    pdf.text(client.email, M, y);
    y += LINE;
  }
  y += 8;

  body(
    `Dear ${client.display_name.split(' ')[0]},`
  );
  y += 6;
  body(
    `Thank you for asking ${firmName} to assist with your ${engagement.tax_year} tax matters. This letter sets out what we will do, what we will not do, what we need from you, and what it costs. Please sign at the end to confirm we are engaged.`
  );

  // --- Scope ---------------------------------------------------------------
  heading('What we will do');
  (input.scopeItems.length
    ? input.scopeItems
    : ['Preparation of the returns identified in our filing checklist for the year.']
  ).forEach(bullet);
  y += 4;
  body(
    'Where the facts support it, our work includes evaluating trader tax status, the section 475(f) mark-to-market election and its deadlines, entity and retirement plan structure, and estimated tax exposure. We will tell you plainly when a position is not supportable.'
  );

  // --- Exclusions ----------------------------------------------------------
  heading('What this engagement does not include');
  (input.exclusions ?? DEFAULT_EXCLUSIONS).forEach(bullet);

  // --- Client responsibilities ---------------------------------------------
  heading('What we need from you');
  [
    'Complete and accurate information, including every brokerage, exchange, and wallet account — including accounts that lost money and accounts held outside the United States.',
    'Your broker year-end activity reports and trade history exports. Trader tax status depends on substantiated trade counts, trading days, and holding periods; we cannot assert what we cannot support.',
    'Documents delivered through the secure portal we provide. Please do not email tax documents.',
    'Timely responses. Work received close to a deadline may have to go on extension.',
    'Retention of the records supporting your return. The final responsibility for the return is yours.',
  ].forEach(bullet);

  // --- Positions and standards ---------------------------------------------
  heading('Positions and standards');
  body(
    'We prepare returns in accordance with the standards applicable to paid preparers, including Circular 230 and the preparer penalty provisions of section 6694. Where a position is uncertain we will discuss it with you and document the basis for it. We will not take a position we cannot support, and we will not omit income.'
  );
  y += 4;
  body(
    'Trader tax status is a facts-and-circumstances determination made separately for each tax year. Nothing in our analysis guarantees that a position will be sustained on examination.'
  );

  // --- Fees ----------------------------------------------------------------
  heading('Fees');
  const fee = money(engagement.fee);
  body(
    input.feeText ??
      (fee
        ? `Our fee for this engagement is ${fee}, due as set out in our invoice. Work outside the scope above is quoted separately before we begin it.`
        : 'Our fee for this engagement will be confirmed in writing before work begins. Work outside the scope above is quoted separately.')
  );
  y += 4;
  body(
    'If the volume or condition of the records materially exceeds what we were shown when quoting, we will stop and agree a revised fee with you rather than absorb it or surprise you with it.'
  );

  // --- 7216 ----------------------------------------------------------------
  heading('Consent to use and disclose tax return information — IRC section 7216');
  body(
    'Federal law requires this consent before we use or disclose your tax return information for any purpose other than preparing your return. You are not required to sign, and if you do not, we will still prepare your return.'
  );
  y += 4;
  body(
    'You consent to our use of your tax return information to advise you on tax planning matters related to your trading activity, including trader tax status, the section 475(f) election, entity structure, and retirement planning; and to our disclosure of that information to third parties you direct in writing, such as a bookkeeper, attorney, or financial advisor.'
  );
  y += 4;
  body(
    'This consent is valid for one year from the date signed unless a shorter period is specified. If you believe your tax return information has been disclosed or used improperly in a manner unauthorized by law or without your permission, you may contact the Treasury Inspector General for Tax Administration.'
  );
  y += 4;
  body(
    'Duration of consent (optional — leave blank for one year): ______________________'
  );

  // --- Confidentiality and termination -------------------------------------
  heading('Confidentiality, records, and termination');
  body(
    `We maintain a written information security program and exchange documents through a secure portal. We retain engagement records for ${
      firm?.retention_years ?? 7
    } years, after which they are securely destroyed. Either of us may end this engagement in writing at any time; you remain responsible for fees for work performed to that point, and for meeting any filing deadline that falls after termination.`
  );

  // --- Signature -----------------------------------------------------------
  heading('Agreed');
  body(
    'Signing below confirms your agreement to the scope, exclusions, responsibilities, and fees set out above, and — separately — your consent under section 7216.'
  );
  y += 30;
  space(96);

  // Measure the client signature line where it actually lands, so the e-sign
  // overlay sits on the line rather than near it.
  const signatureLineY = y;
  const signaturePage = pdf.getNumberOfPages();

  pdf.setDrawColor(120, 130, 145);
  pdf.line(M, y, M + 250, y);
  pdf.line(M + 300, y, M + 470, y);
  y += 12;
  pdf.setFontSize(9);
  pdf.text('Client signature', M, y);
  pdf.text('Date', M + 300, y);
  y += 16;
  pdf.setFontSize(10);
  pdf.text(client.legal_name ?? client.display_name, M, y);
  y += 26;

  pdf.setDrawColor(120, 130, 145);
  pdf.line(M, y, M + 250, y);
  y += 12;
  pdf.setFontSize(9);
  pdf.text(`For ${firmName}`, M, y);

  // Fields sit just above the ruled line, which is where a person signs.
  const fieldHeight = 26;
  const toPct = (value: number, total: number) => Math.round((value / total) * 1000) / 10;
  const anchors: SignatureAnchor[] = [
    {
      field_type: 'signature',
      page_number: signaturePage,
      x_pct: toPct(M, W),
      y_pct: toPct(signatureLineY - fieldHeight, H),
      width_pct: toPct(250, W),
      height_pct: toPct(fieldHeight, H),
    },
    {
      field_type: 'date',
      page_number: signaturePage,
      x_pct: toPct(M + 300, W),
      y_pct: toPct(signatureLineY - fieldHeight, H),
      width_pct: toPct(170, W),
      height_pct: toPct(fieldHeight, H),
    },
  ];

  return { pdf, anchors };
}


