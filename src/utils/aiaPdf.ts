import jsPDF from 'jspdf';
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

/**
 * Application and Certification for Payment (G702 layout) and Continuation Sheet
 * (G703 layout) as plain black-and-white vector PDFs in landscape, using the
 * layout and wording of the app's original G702/G703 documents.
 */

export interface PayAppDoc {
  applicationNumber: number;
  periodFrom?: string | null;
  periodTo: string;
  applicationDate?: string | null;
  contractDate?: string | null;
  projectNumber?: string | null;
  architectProjectNo?: string | null;
  contractFor?: string | null;
  project: { name: string; address?: string | null; client?: string | null };
  ownerName?: string | null;
  ownerAddress?: string | null;
  architectName?: string | null;
  contractorName?: string | null;
  contractorAddress?: string | null;
  contractorPhone?: string | null;
  signatory?: string | null;
  signatoryTitle?: string | null;
  signature?: string | null; // data URL
  signedDate?: string | null;
  /** Change orders approved before this period vs. during it (additions positive, deductions negative). */
  changeOrderSummary?: { previousAdd: number; previousDeduct: number; thisAdd: number; thisDeduct: number };
  distribution?: { owner?: boolean; architect?: boolean; contractor?: boolean; field?: boolean; other?: boolean };
  lines: PayAppLine[];
  settings: PayAppSettings;
}

/** "2026-11-01" -> "11/01/2026" without the UTC off-by-one-day shift. */
export const fmtISO = (iso?: string | null) => {
  if (!iso) return '';
  const [y, m, d] = iso.slice(0, 10).split('-').map(Number);
  if (!y || !m || !d) return iso;
  return `${String(m).padStart(2, '0')}/${String(d).padStart(2, '0')}/${y}`;
};

const usd = (n: number) => {
  const v = Number(n) || 0;
  const s = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return v < 0 ? `(${s})` : s;
};

const slug = (s: string) => (s || 'project').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');

/* -------------------------------------------------------------- drawing helpers */

class Form {
  pdf: jsPDF;
  W: number;
  H: number;
  M = 10;
  constructor(pdf: jsPDF) {
    this.pdf = pdf;
    this.W = pdf.internal.pageSize.getWidth();
    this.H = pdf.internal.pageSize.getHeight();
  }
  f(size: number, style: 'normal' | 'bold' | 'italic' = 'normal') {
    this.pdf.setFont('helvetica', style);
    this.pdf.setFontSize(size);
    this.pdf.setTextColor(0, 0, 0);
  }
  line(x1: number, y1: number, x2: number, y2: number, w = 0.2) {
    this.pdf.setDrawColor(0, 0, 0);
    this.pdf.setLineWidth(w);
    this.pdf.line(x1, y1, x2, y2);
  }
  box(x: number, y: number, w: number, h: number, lw = 0.25) {
    this.pdf.setDrawColor(0, 0, 0);
    this.pdf.setLineWidth(lw);
    this.pdf.rect(x, y, w, h);
  }
  check(x: number, y: number, on?: boolean) {
    this.box(x, y - 2.4, 2.6, 2.6, 0.2);
    if (on) {
      this.f(7, 'bold');
      this.pdf.text('X', x + 0.55, y - 0.25);
    }
  }
  /** Label in small caps with a value after it. */
  field(label: string, value: string | null | undefined, x: number, y: number, w: number) {
    this.f(6.3, 'bold');
    this.pdf.text(label.toUpperCase(), x, y);
    const lw = this.pdf.getTextWidth(label.toUpperCase()) + 2;
    this.f(8);
    const lines = this.pdf.splitTextToSize(value || '', Math.max(10, w - lw)) as string[];
    this.pdf.text(lines.slice(0, 2), x + lw, y);
  }
  wrap(text: string, x: number, y: number, w: number, size: number, lh: number, style: 'normal' | 'bold' | 'italic' = 'normal') {
    this.f(size, style);
    const lines = this.pdf.splitTextToSize(text, w) as string[];
    this.pdf.text(lines, x, y, { lineHeightFactor: lh / (size * 0.3528) });
    return y + lines.length * lh;
  }
  /** "Label ............ $ value" row */
  leader(label: string, value: string, x: number, y: number, w: number, opts: { bold?: boolean; size?: number; indent?: number; valueW?: number } = {}) {
    const size = opts.size ?? 7.6;
    const vw = opts.valueW ?? 30;
    this.f(size, opts.bold ? 'bold' : 'normal');
    const lx = x + (opts.indent ?? 0);
    this.pdf.text(label, lx, y);
    const end = x + w - vw - 4;
    const start = lx + this.pdf.getTextWidth(label) + 1.5;
    if (end > start) {
      this.f(size);
      const dot = this.pdf.getTextWidth('. ');
      const n = Math.floor((end - start) / dot);
      if (n > 0) this.pdf.text('. '.repeat(n), start, y);
    }
    this.f(size, opts.bold ? 'bold' : 'normal');
    this.pdf.text('$', x + w - vw - 2, y);
    this.pdf.text(value, x + w, y, { align: 'right' });
    this.line(x + w - vw, y + 0.9, x + w, y + 0.9, 0.15);
  }
}

/* -------------------------------------------------------------- G702 */
// Layout and wording follow the app's original G702 document (G702Document.tsx),
// drawn as a vector PDF on one landscape page.

const DEFAULT_FROM = { name: 'RBF Construction, Inc.', address: '1411 W. Hill Rd, Flint, MI 48507', phone: '810-938-8498' };

const dollars = (n: number) => {
  const v = Number(n) || 0;
  const s = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return v < 0 ? `-${s}` : s;
};

function drawG702(pdf: jsPDF, d: PayAppDoc, _pageLabel: string) {
  const F = new Form(pdf);
  F.M = 12;
  const { M, W } = F;
  const t = payAppTotals(d.lines, d.settings);
  const cw = W - M * 2;
  const gap = 8;
  const half = (cw - gap) / 2;
  const L = M;
  const R = M + half + gap;
  const fromName = d.contractorName || DEFAULT_FROM.name;
  const fromAddr = d.contractorAddress || DEFAULT_FROM.address;
  const fromPhone = d.contractorPhone || DEFAULT_FROM.phone;

  // Header
  F.f(13, 'bold');
  pdf.text('APPLICATION AND CERTIFICATION FOR PAYMENT', W / 2, M + 5, { align: 'center' });

  // TO / FROM (left) and application details (right)
  let y = M + 13;
  F.f(8.3, 'bold');
  pdf.text('TO:', L, y);
  F.f(8.3);
  pdf.text(d.ownerName || d.project.client || 'Client Name', L, y + 4);
  pdf.text(d.project.address || 'Project Address', L, y + 8);
  F.f(8.3, 'bold');
  pdf.text('FROM:', L, y + 14);
  F.f(8.3);
  pdf.text(fromName, L, y + 18);
  pdf.text(fromAddr, L, y + 22);
  pdf.text(fromPhone, L, y + 26);

  const rc = R + half / 2;
  F.f(8, 'bold');
  pdf.text('APPLICATION NO:', R, y);
  F.f(8.3);
  pdf.text(String(d.applicationNumber), R, y + 4);
  F.f(8, 'bold');
  pdf.text('Distribution to:', rc, y);
  const dist = d.distribution || { owner: true };
  [
    ['OWNER', dist.owner],
    ['ARCHITECT', dist.architect],
    ['CONTRACTOR', dist.contractor],
  ].forEach(([label, on], i) => {
    const cy = y + 4.5 + i * 4;
    F.check(rc, cy, !!on);
    F.f(7);
    pdf.text(String(label), rc + 4, cy);
  });
  F.f(8, 'bold');
  pdf.text('PERIOD TO:', R, y + 20);
  pdf.text('PROJECT:', R + 32, y + 20);
  F.f(8.3);
  pdf.text(fmtISO(d.periodTo), R, y + 24);
  pdf.text(pdf.splitTextToSize(d.project.name || '', half - 34)[0] as string, R + 32, y + 24);

  // Main two columns, each with a heavy top rule
  const top = y + 32;
  F.line(L, top, L + half, top, 0.7);
  F.line(R, top, R + half, top, 0.7);

  /* ---- left column: application for payment */
  y = top + 5;
  F.f(8.6, 'bold');
  pdf.text("CONTRACTOR'S APPLICATION FOR PAYMENT", L, y);
  F.f(7);
  pdf.text('Application is made for payment, as shown below, in connection with the Contract.', L, y + 4);
  pdf.text('Continuation Sheet is enclosed.', L, y + 7.2);
  y += 13;
  const amt = (label: string, value: number, o: { bold?: boolean; indent?: number; size?: number } = {}) => {
    F.f(o.size ?? 8.2, o.bold ? 'bold' : 'normal');
    pdf.text(label, L + (o.indent ?? 0), y);
    pdf.text(`$ ${dollars(value)}`, L + half, y, { align: 'right' });
    y += o.size && o.size < 8 ? 4.2 : 5;
  };
  amt('1. ORIGINAL CONTRACT SUM', t.originalContractSum);
  amt('2. NET CHANGE BY CHANGE ORDERS', t.netChangeOrders);
  amt('3. CONTRACT SUM TO DATE', t.contractSumToDate);
  amt('4. TOTAL COMPLETED & STORED TO DATE', t.completedAndStored);
  amt('a. Completed Work', t.work, { indent: 5, size: 7.3 });
  amt('b. Stored Material', t.stored, { indent: 5, size: 7.3 });
  y += 1;
  amt('5. TOTAL RETAINED', t.totalRetainage);
  amt('6. TOTAL EARNED LESS RETAINAGE', t.earnedLessRetainage);
  amt('7. LESS PREVIOUS CERTIFICATES FOR PAYMENT', t.lessPrevious);
  amt('8. CURRENT PAYMENT DUE', t.currentPaymentDue, { bold: true });
  amt('9. BALANCE TO FINISH, INCLUDING RETAINAGE', t.balanceToFinish);

  // Change order summary
  y += 2;
  const net = t.netChangeOrders;
  const co = d.changeOrderSummary || { previousAdd: 0, previousDeduct: 0, thisAdd: Math.max(net, 0), thisDeduct: Math.min(net, 0) };
  const c1 = L + half * 0.6;
  const c2 = L + half * 0.8;
  const rh = 5.2;
  const rows: [string, string, string, boolean][] = [
    ['Total changes approved in previous months by Owner', `$${dollars(co.previousAdd)}`, `$${dollars(Math.abs(co.previousDeduct))}`, false],
    ['Total approved this Month', `$${dollars(co.thisAdd)}`, `$${dollars(Math.abs(co.thisDeduct))}`, false],
    ['TOTALS', `$${dollars(co.previousAdd + co.thisAdd)}`, `$${dollars(Math.abs(co.previousDeduct + co.thisDeduct))}`, true],
  ];
  pdf.setFillColor(243, 244, 246);
  pdf.rect(L, y, half, rh, 'F');
  F.box(L, y, half, rh * 5, 0.25);
  F.f(7, 'bold');
  pdf.text('CHANGE ORDER SUMMARY', L + 1.5, y + 3.6);
  pdf.text('ADDITIONS', (c1 + c2) / 2, y + 3.6, { align: 'center' });
  pdf.text('DEDUCTIONS', (c2 + L + half) / 2, y + 3.6, { align: 'center' });
  rows.forEach(([label, add, ded, bold], i) => {
    const ry = y + rh * (i + 1);
    F.line(L, ry, L + half, ry, 0.25);
    F.f(7, bold ? 'bold' : 'normal');
    pdf.text(label, L + 1.5, ry + 3.6);
    pdf.text(add, c2 - 1.5, ry + 3.6, { align: 'right' });
    pdf.text(ded, L + half - 1.5, ry + 3.6, { align: 'right' });
  });
  F.line(L, y + rh * 4, L + half, y + rh * 4, 0.25);
  F.line(c1, y, c1, y + rh * 5, 0.25);
  F.line(c2, y, c2, y + rh * 4, 0.25);
  F.f(7);
  pdf.text('NET CHANGES by Change Order', L + 1.5, y + rh * 4 + 3.6);
  pdf.text(`$${dollars(co.previousAdd + co.thisAdd + co.previousDeduct + co.thisDeduct)}`, L + half - 1.5, y + rh * 4 + 3.6, { align: 'right' });

  /* ---- right column: certification, notary, architect */
  let ry = top + 5;
  ry = F.wrap(
    "The undersigned Contractor certifies that to the best of the Contractor's knowledge, information and belief the Work covered by this Application for Payment has been completed in accordance with the Contract Documents.",
    R,
    ry,
    half,
    7,
    3
  );
  ry += 3;
  F.f(8.2, 'bold');
  pdf.text(`CONTRACTOR: ${fromName.toUpperCase()}`, R, ry);
  ry += 7;
  if (d.signature) {
    try {
      const p = pdf.getImageProperties(d.signature);
      const h = 8;
      pdf.addImage(d.signature, 'PNG', R + 7, ry - 6.5, Math.min(half * 0.45, (p.width / p.height) * h), h);
    } catch {
      /* unreadable signature image */
    }
  }
  F.f(8.2);
  pdf.text('By:', R, ry);
  F.line(R + 6, ry + 0.8, R + half * 0.6, ry + 0.8, 0.2);
  if (d.signatory) {
    F.f(6.5, 'italic');
    pdf.text([d.signatory, d.signatoryTitle].filter(Boolean).join(', '), R + 6, ry + 3.6);
  }
  ry += 7;
  F.f(7);
  pdf.text(`Date: ${d.signedDate ? fmtISO(d.signedDate) : '_____________'}`, R, ry);
  ry += 4;

  // Notary box
  const nb = 31;
  F.box(R, ry, half, nb, 0.25);
  F.f(7, 'bold');
  pdf.text('NOTARY PUBLIC', R + 2, ry + 4);
  F.f(7);
  pdf.text('State of: _______________', R + 2, ry + 8.5);
  pdf.text('County of: _____________', R + half / 2, ry + 8.5);
  pdf.text('Commission Expires: __________', R + 2, ry + 12.5);
  pdf.setFillColor(249, 250, 251);
  pdf.setDrawColor(209, 213, 219);
  pdf.rect(R + 2, ry + 14.5, half - 4, 8, 'FD');
  F.line(R + 2, ry + 26, R + half - 2, ry + 26, 0.2);
  F.f(6.8);
  pdf.text('Notary Public Signature', R + 2, ry + 29);
  ry += nb + 4;

  // Architect's certificate
  F.line(R, ry, R + half, ry, 0.25);
  ry += 4.5;
  F.f(8.2, 'bold');
  pdf.text("ARCHITECT'S CERTIFICATE FOR PAYMENT", R, ry);
  ry += 4;
  ry = F.wrap(
    "In accordance with the Contract Documents, based on on-site observations and the data comprising the application, the Architect certifies to the Owner that to the best of the Architect's knowledge, information and belief the Work has progressed as indicated, the quality of the Work is in accordance with the Contract Documents, and the Contractor is entitled to payment of the AMOUNT CERTIFIED.",
    R,
    ry,
    half,
    7,
    3
  );
  ry += 2.5;
  F.f(8.2, 'bold');
  pdf.text(`AMOUNT CERTIFIED ........................ $ ${dollars(t.currentPaymentDue)}`, R, ry);
  ry += 3.8;
  ry = F.wrap(
    '(Attach explanation if amount certified differs from the amount applied. Initial all figures on this Application and on the Continuation Sheet that are changed to conform with the amount certified.)',
    R,
    ry,
    half,
    6.6,
    2.8,
    'italic'
  );
  ry += 2.5;
  F.f(8.2, 'bold');
  pdf.text(`ARCHITECT:${d.architectName ? ` ${d.architectName}` : ''}`, R, ry);
  ry += 5.5;
  F.f(8.2);
  pdf.text('By: _________________________________', R, ry);
  ry += 4;
  F.f(7);
  pdf.text('Date: _____________', R, ry);
  ry += 4.5;
  F.f(7);
  [
    'This Certificate is not negotiable. The AMOUNT CERTIFIED is payable only to the',
    'Contractor named herein. Issuance, payment and acceptance of payment are without',
    'prejudice to any rights of the Owner or Contractor under this Contract.',
  ].forEach((ln, i) => pdf.text(ln, R, ry + i * 3));
}

/* -------------------------------------------------------------- G703 */
// Layout and wording follow the app's original G703 document (G703Document.tsx),
// columns A–L, in landscape so every column fits.

function drawG703(pdf: jsPDF, d: PayAppDoc, startPage: number, totalPages: number) {
  const F = new Form(pdf);
  F.M = 12;
  const { M, W, H } = F;
  const cw = W - M * 2;
  const t = payAppTotals(d.lines, d.settings);
  const fromName = d.contractorName || DEFAULT_FROM.name;
  const fromAddr = d.contractorAddress || DEFAULT_FROM.address;
  const fromPhone = d.contractorPhone || DEFAULT_FROM.phone;

  const shares = [6, 22, 8, 8, 8, 8, 8, 8, 8, 6, 8, 8];
  const sum = shares.reduce((a, b) => a + b, 0);
  const widths = shares.map((s) => (s / sum) * cw);
  const xs = widths.map((_, i) => M + widths.slice(0, i).reduce((a, b) => a + b, 0));
  const letters = 'ABCDEFGHIJKL'.split('');
  const heads = [
    ['ITEM', 'NO.'],
    ['DESCRIPTION OF WORK'],
    ['SCHEDULED', 'VALUE'],
    ['CHANGE', 'ORDERS'],
    ['TOTAL', 'CONTRACT'],
    ['FROM', 'PREVIOUS', 'APPLICATION'],
    ['THIS PERIOD'],
    ['MATERIALS', 'PRESENTLY', 'STORED'],
    ['TOTAL', 'COMPLETED', 'AND STORED TO DATE'],
    ['%', 'COMPLETE'],
    ['BALANCE TO', 'FINISH'],
    ['RETAINAGE'],
  ];

  const header = (page: number) => {
    // Title block
    F.f(13, 'bold');
    pdf.text('CONTINUATION SHEET', W / 2, M + 5, { align: 'center' });
    F.f(8.5, 'bold');
    pdf.text('DOCUMENT G703', W / 2, M + 9.5, { align: 'center' });
    F.f(7);
    pdf.text('APPLICATION AND CERTIFICATE FOR PAYMENT', W / 2, M + 13, { align: 'center' });
    F.f(7.4);
    pdf.text(`APPLICATION NUMBER: ${d.applicationNumber}`, W - M, M + 5, { align: 'right' });
    pdf.text(`PERIOD TO: ${fmtISO(d.periodTo)}`, W - M, M + 9, { align: 'right' });
    if (totalPages > 1) pdf.text(`PAGE ${page} OF ${totalPages}`, W - M, M + 13, { align: 'right' });

    // FROM / TO boxes
    const by = M + 17;
    const bw = (cw - 6) / 2;
    const bh = 18;
    F.box(M, by, bw, bh, 0.25);
    F.box(M + bw + 6, by, bw, bh, 0.25);
    F.f(7.2, 'bold');
    pdf.text('FROM:', M + 2, by + 4);
    pdf.text('TO:', M + bw + 8, by + 4);
    F.f(7.2);
    [fromName, fromAddr, fromPhone].forEach((ln, i) => pdf.text(ln, M + 2, by + 7.8 + i * 3.4));
    [d.ownerName || d.project.client || 'Client Name', d.project.address || 'Project Address'].forEach((ln, i) => pdf.text(ln, M + bw + 8, by + 7.8 + i * 3.4));
    F.f(7.2, 'bold');
    pdf.text(`PROJECT: ${d.project.name}`, M + bw + 8, by + 15.4);

    // Table header: WORK COMPLETED over F-H, letters row, labels row
    let y = by + bh + 4;
    F.box(M, y, cw, 4.4 + 4.6 + 12, 0.3);
    F.f(7, 'bold');
    pdf.text('WORK COMPLETED', (xs[5] + xs[8]) / 2, y + 3.1, { align: 'center' });
    y += 4.4;
    pdf.setFillColor(243, 244, 246);
    pdf.rect(M, y, cw, 4.6 + 12, 'F');
    F.line(M, y, W - M, y, 0.3);
    letters.forEach((l, i) => {
      F.f(7, 'bold');
      pdf.text(l, xs[i] + widths[i] / 2, y + 3.3, { align: 'center' });
    });
    F.line(M, y + 4.6, W - M, y + 4.6, 0.3);
    const ly = y + 4.6;
    heads.forEach((h, i) => {
      F.f(6.1);
      const lines = h.flatMap((part) => pdf.splitTextToSize(part, widths[i] - 1.6) as string[]);
      const bottomY = ly + 12 - 1.5;
      lines.forEach((ln, li) => pdf.text(ln, xs[i] + widths[i] / 2, bottomY - (lines.length - 1 - li) * 2.5, { align: 'center' }));
    });
    // Column rules through letters + labels rows
    widths.forEach((_, i) => i && F.line(xs[i], y, xs[i], ly + 12, 0.3));
    F.box(M, y - 4.4, cw, 4.4 + 4.6 + 12, 0.3);
    return ly + 12;
  };

  let page = startPage;
  let y = header(page);
  const bottom = H - M - 4;
  let zebra = false;
  const drawRow = (cells: string[], opts: { bold?: boolean; fill?: [number, number, number]; spanAB?: boolean } = {}) => {
    F.f(7, opts.bold ? 'bold' : 'normal');
    const desc = opts.spanAB ? [cells[1]] : (pdf.splitTextToSize(cells[1], widths[1] - 2) as string[]);
    const h = desc.length * 3 + 2.6;
    if (y + h > bottom) {
      pdf.addPage();
      page += 1;
      y = header(page);
      zebra = false;
    }
    if (opts.fill) {
      pdf.setFillColor(...opts.fill);
      pdf.rect(M, y, cw, h, 'F');
    } else if (zebra) {
      pdf.setFillColor(249, 250, 251);
      pdf.rect(M, y, cw, h, 'F');
    }
    widths.forEach((_, i) => {
      if (i === 0 || (opts.spanAB && i === 1)) return;
      F.line(xs[i], y, xs[i], y + h, 0.25);
    });
    F.line(M, y, M, y + h, 0.25);
    F.line(W - M, y, W - M, y + h, 0.25);
    F.f(7, opts.bold ? 'bold' : 'normal');
    if (opts.spanAB) {
      pdf.text(cells[1], (xs[0] + xs[2]) / 2, y + 3.7, { align: 'center' });
    } else {
      pdf.text(cells[0], xs[0] + widths[0] / 2, y + 3.7, { align: 'center' });
      desc.forEach((ln, li) => pdf.text(ln, xs[1] + 1, y + 3.7 + li * 3));
    }
    for (let i = 2; i < cells.length; i++) pdf.text(cells[i], xs[i] + widths[i] - 1, y + 3.7, { align: 'right' });
    y += h;
    zebra = !zebra;
  };

  const $ = (n: number) => `$${(Number(n) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  d.lines
    .filter((l) => (l.description || '').trim() || Number(l.scheduledValue) > 0 || Number(l.changeOrders))
    .forEach((l) =>
      drawRow([
        l.itemNumber,
        l.description || '',
        $(l.scheduledValue),
        $(l.changeOrders),
        $(lineContract(l)),
        $(l.previous),
        $(l.thisPeriod),
        $(l.stored),
        $(lineCompleted(l)),
        `${linePercent(l).toFixed(2)}%`,
        $(lineBalance(l)),
        $(lineRetainage(l, d.settings)),
      ])
    );
  drawRow(
    [
      '',
      'GRAND TOTALS',
      $(t.scheduled),
      $(t.netChangeOrders),
      $(t.sovTotal),
      $(d.lines.reduce((a, l) => a + (Number(l.previous) || 0), 0)),
      $(t.thisPeriod),
      $(t.stored),
      $(t.completedAndStored),
      `${(t.sovTotal ? (t.completedAndStored / t.sovTotal) * 100 : 0).toFixed(2)}%`,
      $(t.sovTotal - t.completedAndStored),
      $(t.totalRetainage),
    ],
    { bold: true, fill: [229, 231, 235], spanAB: true }
  );
  F.line(M, y, W - M, y, 0.3);
  return page;
}

/* -------------------------------------------------------------- page count + API */

/** How many continuation-sheet pages the lines need (matches drawG703's paging). */
function g703Pages(d: PayAppDoc) {
  const probe = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });
  const last = drawG703(probe, d, 1, 99);
  return last;
}

const newDoc = () => new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'letter' });

export async function generateG702(d: PayAppDoc, mode: 'save' | 'blob' = 'save') {
  const pdf = newDoc();
  drawG702(pdf, d, 'PAGE 1 OF 1 PAGES');
  if (mode === 'blob') return pdf.output('blob');
  pdf.save(`G702-app-${d.applicationNumber}-${slug(d.project.name)}.pdf`);
}

export async function generateG703(d: PayAppDoc, mode: 'save' | 'blob' = 'save') {
  const pdf = newDoc();
  drawG703(pdf, d, 1, g703Pages(d));
  if (mode === 'blob') return pdf.output('blob');
  pdf.save(`G703-app-${d.applicationNumber}-${slug(d.project.name)}.pdf`);
}

/** G702 on page 1 and the G703 continuation sheet after it, numbered as one set. */
export async function generatePayAppPackage(d: PayAppDoc, mode: 'save' | 'blob' = 'save') {
  const pdf = newDoc();
  const total = 1 + g703Pages(d);
  drawG702(pdf, d, `PAGE 1 OF ${total} PAGES`);
  pdf.addPage();
  drawG703(pdf, d, 2, total);
  if (mode === 'blob') return pdf.output('blob');
  pdf.save(`pay-app-${d.applicationNumber}-${slug(d.project.name)}.pdf`);
}
