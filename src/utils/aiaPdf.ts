import { DocKit, COLORS, loadCompany, usd, fileSlug, type Company } from './pdfDocKit';
import {
  lineBalance,
  lineCompleted,
  lineContract,
  linePercent,
  lineRetainage,
  payAppTotals,
  type PayAppLine,
  type PayAppSettings,
} from './paymentAppMath';

export interface PayAppDoc {
  applicationNumber: number;
  periodFrom?: string | null;
  periodTo: string;
  applicationDate?: string | null;
  contractDate?: string | null;
  projectNumber?: string | null;
  architectProjectNo?: string | null;
  project: { name: string; address?: string | null; client?: string | null };
  ownerName?: string | null;
  architectName?: string | null;
  contractorName?: string | null;
  contractorAddress?: string | null;
  signatory?: string | null;
  signatoryTitle?: string | null;
  signature?: string | null; // data URL
  signedDate?: string | null;
  lines: PayAppLine[];
  settings: PayAppSettings;
}

/** "2026-11-01" -> "Nov 1, 2026" without the UTC off-by-one-day shift. */
export const fmtISO = (iso?: string | null) => {
  if (!iso) return '—';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

const meta = (d: PayAppDoc) => [
  { label: 'Application no.', value: String(d.applicationNumber) },
  { label: 'Period', value: d.periodFrom ? `${fmtISO(d.periodFrom)} – ${fmtISO(d.periodTo)}` : `To ${fmtISO(d.periodTo)}` },
  { label: 'Application date', value: fmtISO(d.applicationDate || d.periodTo) },
  { label: 'Contract date', value: fmtISO(d.contractDate) },
  { label: 'Project no.', value: d.projectNumber || '—' },
];

function companyFor(d: PayAppDoc, base: Company): Company {
  return d.contractorName ? { ...base, name: d.contractorName, address: d.contractorAddress || base.address } : base;
}

/* ------------------------------------------------------------------ G702 */

function drawG702(doc: DocKit, d: PayAppDoc) {
  const { pdf, M } = doc;
  const t = payAppTotals(d.lines, d.settings);
  doc.letterhead(meta(d), { compact: true });

  doc.infoBoxes([
    { title: 'To owner', lines: [d.ownerName || d.project.client || '—'] },
    { title: 'From contractor', lines: [d.contractorName || '—', d.contractorAddress] },
    { title: 'Project', lines: [d.project.name, d.project.address] },
    { title: 'Via architect', lines: [d.architectName || '—', d.architectProjectNo ? `Architect's project no. ${d.architectProjectNo}` : null] },
  ]);
  doc.y -= 3;

  const top = doc.y;
  const gap = 8;
  const leftW = doc.contentWidth * 0.54;
  const rightX = M + leftW + gap;
  const rightW = doc.contentWidth - leftW - gap;

  // ---- Left: contractor's application for payment
  doc.fill(COLORS.navy);
  pdf.rect(M, top, leftW, 7, 'F');
  doc.font(8, 'bold', [255, 255, 255]);
  pdf.text("CONTRACTOR'S APPLICATION FOR PAYMENT", M + 3, top + 4.7);

  const rows: { n: string; label: string; value: number; strong?: boolean; indent?: boolean; note?: string }[] = [
    { n: '1', label: 'Original contract sum', value: t.originalContractSum },
    { n: '2', label: 'Net change by change orders', value: t.netChangeOrders },
    { n: '3', label: 'Contract sum to date (line 1 + 2)', value: t.contractSumToDate, strong: true },
    { n: '4', label: 'Total completed & stored to date (G703 col. G)', value: t.completedAndStored, strong: true },
    { n: '5a', label: `Retainage: ${d.settings.retainageWorkPct}% of completed work`, value: t.retainageWork, indent: true },
    { n: '5b', label: `Retainage: ${d.settings.retainageStoredPct}% of stored material`, value: t.retainageStored, indent: true },
    { n: '5', label: 'Total retainage (5a + 5b)', value: t.totalRetainage },
    { n: '6', label: 'Total earned less retainage (line 4 - 5)', value: t.earnedLessRetainage },
    { n: '7', label: 'Less previous certificates for payment', value: t.lessPrevious },
    { n: '8', label: 'CURRENT PAYMENT DUE', value: t.currentPaymentDue, strong: true },
    { n: '9', label: 'Balance to finish, including retainage (line 3 - 6)', value: t.balanceToFinish },
  ];
  let y = top + 7;
  const rh = 6.4;
  rows.forEach((r, i) => {
    const due = r.n === '8';
    if (due) {
      doc.fill([255, 237, 222]);
      pdf.rect(M, y, leftW, rh + 1, 'F');
    } else if (i % 2 === 1) {
      doc.fill(COLORS.zebra);
      pdf.rect(M, y, leftW, rh, 'F');
    }
    const h = due ? rh + 1 : rh;
    doc.font(7.5, 'bold', COLORS.muted);
    pdf.text(r.n, M + 3, y + h / 2 + 1.2);
    doc.font(due ? 9 : 8.3, r.strong ? 'bold' : 'normal', due ? COLORS.navy : COLORS.ink);
    pdf.text(r.label, M + (r.indent ? 15 : 11), y + h / 2 + 1.2);
    doc.font(due ? 10.5 : 8.8, r.strong ? 'bold' : 'normal', due ? COLORS.navy : COLORS.ink);
    pdf.text(usd(r.value), M + leftW - 3, y + h / 2 + 1.3, { align: 'right' });
    y += h;
  });
  doc.stroke(COLORS.line, 0.3);
  pdf.rect(M, top, leftW, y - top);

  // Change order summary
  y += 4;
  doc.font(7, 'bold', COLORS.muted);
  pdf.text('CHANGE ORDER SUMMARY', M, y);
  y += 2;
  const coAdd = d.lines.reduce((a, l) => a + Math.max(0, Number(l.changeOrders) || 0), 0);
  const coDed = d.lines.reduce((a, l) => a + Math.min(0, Number(l.changeOrders) || 0), 0);
  doc.fill(COLORS.tint);
  pdf.rect(M, y, leftW, 13, 'F');
  doc.font(8, 'normal', COLORS.ink);
  pdf.text('Approved additions', M + 3, y + 5);
  pdf.text(usd(coAdd), M + leftW * 0.48, y + 5, { align: 'right' });
  pdf.text('Approved deductions', M + leftW * 0.53, y + 5);
  pdf.text(usd(Math.abs(coDed)), M + leftW - 3, y + 5, { align: 'right' });
  doc.font(8, 'bold', COLORS.navy);
  pdf.text('Net change by change orders', M + 3, y + 10.5);
  pdf.text(usd(coAdd + coDed), M + leftW - 3, y + 10.5, { align: 'right' });

  // ---- Right: contractor certification + architect's certificate
  let ry = top;
  doc.fill(COLORS.navy);
  pdf.rect(rightX, ry, rightW, 7, 'F');
  doc.font(8, 'bold', [255, 255, 255]);
  pdf.text("CONTRACTOR'S CERTIFICATION", rightX + 3, ry + 4.7);
  ry += 11;
  doc.font(7.6, 'normal', COLORS.ink);
  const cert = pdf.splitTextToSize(
    "The undersigned Contractor certifies that to the best of the Contractor's knowledge, information and belief the Work covered by this Application for Payment has been completed in accordance with the Contract Documents, that all amounts have been paid by the Contractor for Work for which previous Certificates for Payment were issued and payments received from the Owner, and that current payment shown herein is now due.",
    rightW - 6
  ) as string[];
  pdf.text(cert, rightX + 3, ry);
  ry += cert.length * 3.3 + 3;

  if (d.signature) {
    try {
      const p = pdf.getImageProperties(d.signature);
      const h = 11;
      const w = Math.min(rightW * 0.55, (p.width / p.height) * h);
      pdf.addImage(d.signature, 'PNG', rightX + 3, ry, w, h);
    } catch {
      /* unreadable signature image: leave the line blank */
    }
  }
  ry += 12;
  doc.stroke(COLORS.ink, 0.3);
  pdf.line(rightX + 3, ry, rightX + rightW * 0.62, ry);
  pdf.line(rightX + rightW * 0.68, ry, rightX + rightW - 3, ry);
  doc.font(7, 'normal', COLORS.muted);
  pdf.text(`By: ${[d.signatory, d.signatoryTitle].filter(Boolean).join(', ') || 'Authorized signature'}`, rightX + 3, ry + 3.6);
  pdf.text(`Date: ${d.signedDate ? fmtISO(d.signedDate) : ''}`, rightX + rightW * 0.68, ry + 3.6);
  doc.font(7.6, 'bold', COLORS.ink);
  if (d.signedDate) pdf.text(fmtISO(d.signedDate), rightX + rightW * 0.68, ry - 1.5);
  ry += 9;

  doc.fill(COLORS.navy);
  pdf.rect(rightX, ry, rightW, 7, 'F');
  doc.font(8, 'bold', [255, 255, 255]);
  pdf.text("ARCHITECT'S CERTIFICATE FOR PAYMENT", rightX + 3, ry + 4.7);
  ry += 11;
  doc.font(7.6, 'normal', COLORS.ink);
  const arch = pdf.splitTextToSize(
    'In accordance with the Contract Documents, based on evaluations of the Work and the data comprising this application, the Architect certifies to the Owner that the Work has progressed as indicated and the Contractor is entitled to payment of the AMOUNT CERTIFIED.',
    rightW - 6
  ) as string[];
  pdf.text(arch, rightX + 3, ry);
  ry += arch.length * 3.3 + 4;
  doc.fill(COLORS.tint);
  pdf.roundedRect(rightX, ry, rightW, 9, 1.2, 1.2, 'F');
  doc.font(8, 'bold', COLORS.navy);
  pdf.text('AMOUNT CERTIFIED', rightX + 3, ry + 5.8);
  doc.stroke(COLORS.ink, 0.3);
  pdf.line(rightX + rightW * 0.45, ry + 6.4, rightX + rightW - 3, ry + 6.4);
  doc.font(9, 'bold', COLORS.ink);
  pdf.text('$', rightX + rightW * 0.45 + 1, ry + 5.6);
  ry += 18;
  pdf.line(rightX + 3, ry, rightX + rightW * 0.62, ry);
  pdf.line(rightX + rightW * 0.68, ry, rightX + rightW - 3, ry);
  doc.font(7, 'normal', COLORS.muted);
  pdf.text('Architect', rightX + 3, ry + 3.6);
  pdf.text('Date', rightX + rightW * 0.68, ry + 3.6);
  ry += 7;
  doc.font(6.5, 'normal', COLORS.muted);
  const fine = pdf.splitTextToSize(
    'This Certificate is not negotiable. The AMOUNT CERTIFIED is payable only to the Contractor named herein. Issuance, payment and acceptance of payment are without prejudice to any rights of the Owner or Contractor under this Contract.',
    rightW - 6
  ) as string[];
  pdf.text(fine, rightX + 3, ry);
}

/* ------------------------------------------------------------------ G703 */

function drawG703(doc: DocKit, d: PayAppDoc) {
  const t = payAppTotals(d.lines, d.settings);
  doc.letterhead(
    [
      { label: 'Application no.', value: String(d.applicationNumber) },
      { label: 'Application date', value: fmtISO(d.applicationDate || d.periodTo) },
      { label: 'Period to', value: fmtISO(d.periodTo) },
      { label: 'Project', value: d.project.name },
      { label: "Architect's project no.", value: d.architectProjectNo || '—' },
    ],
    { compact: true }
  );
  const row = (l: PayAppLine) => [
    l.itemNumber,
    l.description || '—',
    usd(lineContract(l)),
    usd(l.previous),
    usd(l.thisPeriod),
    usd(l.stored),
    { text: usd(lineCompleted(l)), bold: true },
    `${linePercent(l).toFixed(1)}%`,
    usd(lineBalance(l)),
    usd(lineRetainage(l, d.settings)),
  ];
  const lines = d.lines;
  doc.table(
    [
      { header: 'A Item', width: 6 },
      { header: 'B Description of work', width: 25 },
      { header: 'C Scheduled value', width: 10.5, align: 'right' },
      { header: 'D From previous application', width: 10.5, align: 'right' },
      { header: 'E Work this period', width: 10, align: 'right' },
      { header: 'F Materials presently stored', width: 9.5, align: 'right' },
      { header: 'G Total completed & stored', width: 10.5, align: 'right' },
      { header: '% (G / C)', width: 6, align: 'right' },
      { header: 'H Balance to finish', width: 10.5, align: 'right' },
      { header: 'I Retainage', width: 9, align: 'right' },
    ],
    [
      ...lines.map(row),
      [
        '',
        'GRAND TOTALS',
        usd(t.sovTotal),
        usd(lines.reduce((a, l) => a + (Number(l.previous) || 0), 0)),
        usd(t.thisPeriod),
        usd(t.stored),
        usd(t.completedAndStored),
        `${(t.sovTotal ? (t.completedAndStored / t.sovTotal) * 100 : 0).toFixed(1)}%`,
        usd(t.sovTotal - t.completedAndStored),
        usd(t.totalRetainage),
      ],
    ],
    { subtotalRows: new Set([lines.length]), fontSize: 7.6 }
  );
  doc.font(6.8, 'normal', COLORS.muted);
  doc.pdf.text(
    `Use column I on contracts where variable retainage for line items applies. Retainage: ${d.settings.retainageWorkPct}% on completed work, ${d.settings.retainageStoredPct}% on stored materials.`,
    doc.M,
    Math.min(doc.y, doc.bottom - 2)
  );
}

/* ------------------------------------------------------------------ API */

export async function generateG702(d: PayAppDoc, mode: 'save' | 'blob' = 'save') {
  const base = await loadCompany();
  const doc = new DocKit(companyFor(d, base), 'Application for Payment', `G702 · Application No. ${d.applicationNumber}`, 'landscape');
  drawG702(doc, d);
  if (mode === 'blob') return doc.output();
  doc.save(`G702-app-${d.applicationNumber}-${fileSlug(d.project.name)}.pdf`);
}

export async function generateG703(d: PayAppDoc, mode: 'save' | 'blob' = 'save') {
  const base = await loadCompany();
  const doc = new DocKit(companyFor(d, base), 'Continuation Sheet', `G703 · Application No. ${d.applicationNumber}`, 'landscape');
  drawG703(doc, d);
  if (mode === 'blob') return doc.output();
  doc.save(`G703-app-${d.applicationNumber}-${fileSlug(d.project.name)}.pdf`);
}

/** G702 on page 1 and the G703 continuation sheet after it, in one file. */
export async function generatePayAppPackage(d: PayAppDoc, mode: 'save' | 'blob' = 'save') {
  const base = await loadCompany();
  const doc = new DocKit(companyFor(d, base), 'Application for Payment', `G702 / G703 · Application No. ${d.applicationNumber}`, 'landscape');
  drawG702(doc, d);
  doc.pdf.addPage();
  doc.docTitle = 'Continuation Sheet';
  doc.docRef = `G703 · Application No. ${d.applicationNumber}`;
  drawG703(doc, d);
  if (mode === 'blob') return doc.output();
  doc.save(`pay-app-${d.applicationNumber}-${fileSlug(d.project.name)}.pdf`);
}

