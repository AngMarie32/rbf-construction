import jsPDF from 'jspdf';
import { supabase } from '@/integrations/supabase/client';
import { loadLogoAsDataUrl } from './pdfLogoHelper';

/**
 * Shared layout for client-facing PDFs (proposals, bid reports):
 * letterhead, section headings, tables that break across pages with a repeated
 * header row, totals box, signature blocks and a "Page x of y" footer.
 * Everything is drawn as vector text, so it stays sharp and searchable.
 */

export type RGB = [number, number, number];

export const COLORS = {
  navy: [17, 28, 51] as RGB,
  orange: [234, 108, 26] as RGB,
  ink: [31, 41, 55] as RGB,
  muted: [107, 114, 128] as RGB,
  line: [226, 232, 240] as RGB,
  zebra: [248, 250, 252] as RGB,
  tint: [241, 245, 249] as RGB,
};

export interface Company {
  name: string;
  address: string;
  phone: string;
  email: string;
  logo: string | null;
}

const FALLBACK_COMPANY = {
  name: 'RBF Construction',
  address: '1411 W Hill Rd, Flint, MI 48507',
  phone: '810-938-8498',
  email: '',
};

export async function loadCompany(): Promise<Company> {
  let row: any = null;
  try {
    const { data } = await supabase.from('company_settings').select('*').limit(1).maybeSingle();
    row = data;
  } catch {
    row = null;
  }
  const logo = await loadLogoAsDataUrl().catch(() => null);
  const name = row?.company_name && !/buildpro/i.test(row.company_name) ? row.company_name : FALLBACK_COMPANY.name;
  return {
    name,
    address: row?.company_address || FALLBACK_COMPANY.address,
    phone: row?.company_phone || FALLBACK_COMPANY.phone,
    email: row?.company_email || FALLBACK_COMPANY.email,
    logo,
  };
}

export const usd = (n: number, cents = true) =>
  (Number(n) || 0).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: cents ? 2 : 0,
    maximumFractionDigits: cents ? 2 : 0,
  });

export const fmtDate = (d: Date) => d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

export const fileSlug = (s: string) =>
  (s || 'document')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'document';

export interface Column {
  header: string;
  width: number; // share of the table width; normalized
  align?: 'left' | 'right' | 'center';
}

export type Cell = string | { text: string; bold?: boolean; color?: RGB };

export class DocKit {
  pdf: jsPDF;
  W: number;
  H: number;
  M = 16;
  y = 0;
  private company: Company;
  docTitle: string;
  docRef: string;

  constructor(company: Company, docTitle: string, docRef = '', orientation: 'portrait' | 'landscape' = 'portrait') {
    this.pdf = new jsPDF({ orientation, unit: 'mm', format: 'letter' });
    if (orientation === 'landscape') this.M = 12;
    this.W = this.pdf.internal.pageSize.getWidth();
    this.H = this.pdf.internal.pageSize.getHeight();
    this.company = company;
    this.docTitle = docTitle;
    this.docRef = docRef;
  }

  get contentWidth() {
    return this.W - this.M * 2;
  }

  get bottom() {
    return this.H - 18;
  }

  color(c: RGB) {
    this.pdf.setTextColor(c[0], c[1], c[2]);
  }

  font(size: number, style: 'normal' | 'bold' = 'normal', c: RGB = COLORS.ink) {
    this.pdf.setFont('helvetica', style);
    this.pdf.setFontSize(size);
    this.color(c);
  }

  fill(c: RGB) {
    this.pdf.setFillColor(c[0], c[1], c[2]);
  }

  stroke(c: RGB, w = 0.2) {
    this.pdf.setDrawColor(c[0], c[1], c[2]);
    this.pdf.setLineWidth(w);
  }

  /**
   * Letterhead on page 1: navy band with company details and the document title.
   * `compact` is a shorter band for one-page forms (G702 / G703).
   */
  letterhead(meta: { label: string; value: string }[], { compact = false }: { compact?: boolean } = {}) {
    const { pdf, W, M } = this;
    const bandH = compact ? 22 : 34;
    this.fill(COLORS.navy);
    pdf.rect(0, 0, W, bandH, 'F');
    this.fill(COLORS.orange);
    pdf.rect(0, bandH, W, compact ? 1 : 1.4, 'F');

    let textX = M;
    if (this.company.logo) {
      try {
        const props = pdf.getImageProperties(this.company.logo);
        const h = compact ? 14 : 20;
        const w = Math.min(compact ? 32 : 44, (props.width / props.height) * h);
        const top = (bandH - h) / 2;
        // white tile so dark logos stay visible on the navy band
        this.fill([255, 255, 255]);
        pdf.roundedRect(M, top, w + 4, h, 1.5, 1.5, 'F');
        pdf.addImage(this.company.logo, 'PNG', M + 2, top, w, h);
        textX = M + w + 8;
      } catch {
        textX = M;
      }
    }
    const nameY = compact ? 9.5 : 15;
    this.font(compact ? 12 : 15, 'bold', [255, 255, 255]);
    pdf.text(this.company.name, textX, nameY);
    this.font(compact ? 7.5 : 8.5, 'normal', [203, 213, 225]);
    const contact = [this.company.address, [this.company.phone, this.company.email].filter(Boolean).join('  ·  ')].filter(Boolean);
    contact.forEach((line, i) => pdf.text(line, textX, nameY + (compact ? 4.6 : 6) + i * (compact ? 3.6 : 4.4)));

    this.font(compact ? 14 : 18, 'bold', [255, 255, 255]);
    pdf.text(this.docTitle.toUpperCase(), W - M, compact ? 10.5 : 16, { align: 'right' });
    this.font(compact ? 7.5 : 8.5, 'normal', [251, 191, 140]);
    if (this.docRef) pdf.text(this.docRef, W - M, compact ? 16 : 22, { align: 'right' });

    // Meta strip (date, valid until, number …)
    this.y = bandH + (compact ? 6 : 8);
    if (meta.length) {
      const colW = this.contentWidth / meta.length;
      meta.forEach((m, i) => {
        const x = M + i * colW;
        this.font(compact ? 6.5 : 7, 'bold', COLORS.muted);
        pdf.text(m.label.toUpperCase(), x, this.y);
        this.font(compact ? 9 : 10, 'bold', COLORS.ink);
        const v = pdf.splitTextToSize(m.value || '—', colW - 3)[0] as string;
        pdf.text(v, x, this.y + (compact ? 4.4 : 5));
      });
      this.y += compact ? 8 : 10;
      this.stroke(COLORS.line);
      pdf.line(M, this.y, W - M, this.y);
      this.y += compact ? 5 : 7;
    }
  }

  /** Slim header for continuation pages. */
  private continuationHeader() {
    const { pdf, W, M } = this;
    this.fill(COLORS.navy);
    pdf.rect(0, 0, W, 11, 'F');
    this.fill(COLORS.orange);
    pdf.rect(0, 11, W, 0.8, 'F');
    this.font(8.5, 'bold', [255, 255, 255]);
    pdf.text(this.company.name, M, 7.2);
    this.font(8.5, 'normal', [203, 213, 225]);
    pdf.text(`${this.docTitle}${this.docRef ? ` · ${this.docRef}` : ''}`, W - M, 7.2, { align: 'right' });
    this.y = 20;
  }

  newPage() {
    this.pdf.addPage();
    this.continuationHeader();
  }

  ensure(space: number) {
    if (this.y + space > this.bottom) {
      this.newPage();
      return true;
    }
    return false;
  }

  heading(text: string) {
    this.ensure(14);
    const { pdf, M } = this;
    this.fill(COLORS.orange);
    pdf.rect(M, this.y - 3.6, 1.2, 4.6, 'F');
    this.font(10.5, 'bold', COLORS.navy);
    pdf.text(text.toUpperCase(), M + 3.5, this.y);
    this.y += 6;
  }

  paragraph(text: string, size = 9.5, c: RGB = COLORS.ink) {
    if (!text?.trim()) return;
    this.font(size, 'normal', c);
    const lh = size * 0.45;
    const lines = this.pdf.splitTextToSize(text.trim(), this.contentWidth) as string[];
    lines.forEach((line) => {
      this.ensure(lh + 1);
      this.pdf.text(line, this.M, this.y);
      this.y += lh;
    });
    this.y += 3;
  }

  bullets(items: string[], size = 8.8) {
    const lh = size * 0.43;
    items.forEach((item, idx) => {
      this.font(size, 'normal', COLORS.ink);
      const lines = this.pdf.splitTextToSize(item, this.contentWidth - 7) as string[];
      this.ensure(lines.length * lh + 1.5);
      this.font(size, 'bold', COLORS.orange);
      this.pdf.text(`${idx + 1}.`, this.M, this.y);
      this.font(size, 'normal', COLORS.ink);
      lines.forEach((line, i) => this.pdf.text(line, this.M + 7, this.y + i * lh));
      this.y += lines.length * lh + 1.6;
    });
    this.y += 2;
  }

  /** Two (or more) labeled boxes side by side, e.g. "Prepared for" / "Project". */
  infoBoxes(boxes: { title: string; lines: (string | undefined | null)[] }[]) {
    const { pdf, M } = this;
    const gap = 6;
    const w = (this.contentWidth - gap * (boxes.length - 1)) / boxes.length;
    const prepared = boxes.map((b) => {
      this.font(9, 'normal');
      const lines = b.lines.filter(Boolean).flatMap((l, i) => {
        this.font(i === 0 ? 10 : 9, i === 0 ? 'bold' : 'normal');
        return (pdf.splitTextToSize(String(l), w - 8) as string[]).map((t) => ({ t, first: i === 0 }));
      });
      return { ...b, lines };
    });
    const h = Math.max(...prepared.map((b) => 11 + b.lines.length * 4.6)) + 3;
    this.ensure(h + 4);
    prepared.forEach((b, i) => {
      const x = M + i * (w + gap);
      this.fill(COLORS.tint);
      pdf.roundedRect(x, this.y, w, h, 1.5, 1.5, 'F');
      this.font(7, 'bold', COLORS.muted);
      pdf.text(b.title.toUpperCase(), x + 4, this.y + 6);
      let ly = this.y + 11.5;
      b.lines.forEach((l) => {
        this.font(l.first ? 10 : 9, l.first ? 'bold' : 'normal', l.first ? COLORS.navy : COLORS.ink);
        pdf.text(l.t, x + 4, ly);
        ly += 4.6;
      });
    });
    this.y += h + 8;
  }

  /** Table with a navy header row repeated on every page and zebra striping. */
  table(columns: Column[], rows: Cell[][], opts: { sectionRows?: Set<number>; subtotalRows?: Set<number>; fontSize?: number } = {}) {
    const { pdf, M } = this;
    const total = columns.reduce((s, c) => s + c.width, 0);
    const widths = columns.map((c) => (c.width / total) * this.contentWidth);
    const xs = widths.map((_, i) => M + widths.slice(0, i).reduce((s, v) => s + v, 0));
    const pad = 2.4;
    const fs = opts.fontSize ?? 8.5;
    const lh = fs * 0.47;

    const headerFs = Math.min(7.5, fs - 0.8);
    this.font(headerFs, 'bold');
    const headLines = columns.map((c, i) => pdf.splitTextToSize(c.header.toUpperCase(), widths[i] - pad * 2) as string[]);
    const headH = Math.max(...headLines.map((l) => l.length)) * (headerFs * 0.42) + 4.2;
    const drawHeader = () => {
      this.fill(COLORS.navy);
      pdf.rect(M, this.y, this.contentWidth, headH, 'F');
      this.font(headerFs, 'bold', [255, 255, 255]);
      columns.forEach((c, i) => {
        const tx = c.align === 'right' ? xs[i] + widths[i] - pad : c.align === 'center' ? xs[i] + widths[i] / 2 : xs[i] + pad;
        headLines[i].forEach((line, li) => pdf.text(line, tx, this.y + 3.9 + li * headerFs * 0.42, { align: c.align || 'left' }));
      });
      this.y += headH;
    };

    this.ensure(16);
    drawHeader();

    let zebra = false;
    rows.forEach((row, r) => {
      const isSection = opts.sectionRows?.has(r);
      const isSubtotal = opts.subtotalRows?.has(r);
      const cells = row.map((cell) => (typeof cell === 'string' ? { text: cell } : cell));

      if (isSection) {
        if (this.y + 7 + 8 > this.bottom) {
          this.newPage();
          drawHeader();
        }
        this.fill([255, 237, 222]);
        pdf.rect(M, this.y, this.contentWidth, 6.5, 'F');
        this.font(8.5, 'bold', COLORS.navy);
        pdf.text(cells[0].text, M + pad, this.y + 4.4);
        this.y += 6.5;
        zebra = false;
        return;
      }

      this.font(fs, 'normal');
      const wrapped = cells.map((c, i) => (pdf.splitTextToSize(c.text || '', widths[i] - pad * 2) as string[]));
      const h = Math.max(...wrapped.map((w) => w.length)) * lh + 2.6;
      if (this.y + h > this.bottom) {
        this.newPage();
        drawHeader();
      }
      if (isSubtotal) {
        this.stroke(COLORS.line, 0.3);
        pdf.line(M, this.y, M + this.contentWidth, this.y);
      } else if (zebra) {
        this.fill(COLORS.zebra);
        pdf.rect(M, this.y, this.contentWidth, h, 'F');
      }
      cells.forEach((c, i) => {
        const col = columns[i];
        this.font(fs, c.bold || isSubtotal ? 'bold' : 'normal', c.color || COLORS.ink);
        const tx = col.align === 'right' ? xs[i] + widths[i] - pad : col.align === 'center' ? xs[i] + widths[i] / 2 : xs[i] + pad;
        wrapped[i].forEach((line, li) => pdf.text(line, tx, this.y + lh + 0.6 + li * lh, { align: col.align || 'left' }));
      });
      this.y += h;
      if (!isSubtotal) zebra = !zebra;
    });
    this.stroke(COLORS.line, 0.3);
    pdf.line(M, this.y, M + this.contentWidth, this.y);
    this.y += 8;
  }

  /** Right-aligned totals box; the last row is highlighted. */
  totals(lines: { label: string; value: string }[]) {
    const { pdf } = this;
    const w = 80;
    const x = this.W - this.M - w;
    const rowH = 6;
    const h = (lines.length - 1) * rowH + 11;
    this.ensure(h + 4);
    lines.forEach((l, i) => {
      const last = i === lines.length - 1;
      if (last) {
        this.fill(COLORS.navy);
        pdf.roundedRect(x, this.y, w, 10, 1.5, 1.5, 'F');
        this.font(9, 'bold', [255, 255, 255]);
        pdf.text(l.label.toUpperCase(), x + 4, this.y + 6.5);
        this.font(12, 'bold', [255, 255, 255]);
        pdf.text(l.value, x + w - 4, this.y + 6.8, { align: 'right' });
        this.y += 10;
      } else {
        this.font(9, 'normal', COLORS.muted);
        pdf.text(l.label, x + 4, this.y + 4);
        this.font(9, 'bold', COLORS.ink);
        pdf.text(l.value, x + w - 4, this.y + 4, { align: 'right' });
        this.y += rowH;
      }
    });
    this.y += 8;
  }

  signatures(parties: { title: string; name?: string }[]) {
    const { pdf, M } = this;
    const gap = 10;
    const w = (this.contentWidth - gap) / 2;
    this.ensure(42);
    parties.slice(0, 2).forEach((p, i) => {
      const x = M + i * (w + gap);
      let y = this.y;
      this.font(7, 'bold', COLORS.muted);
      pdf.text(p.title.toUpperCase(), x, y);
      y += 5;
      if (p.name) {
        this.font(9.5, 'bold', COLORS.navy);
        pdf.text(p.name, x, y);
      }
      y += 13;
      this.stroke(COLORS.ink, 0.3);
      pdf.line(x, y, x + w * 0.62, y);
      pdf.line(x + w * 0.68, y, x + w, y);
      this.font(7.5, 'normal', COLORS.muted);
      pdf.text('Signature', x, y + 4);
      pdf.text('Date', x + w * 0.68, y + 4);
      y += 13;
      pdf.line(x, y, x + w, y);
      pdf.text('Printed name and title', x, y + 4);
    });
    this.y += 40;
  }

  /** Footer on every page, then return the file (for upload or e-signature). */
  output(): Blob {
    this.footers();
    return this.pdf.output('blob');
  }

  /** Footer on every page, then download. */
  save(filename: string) {
    this.footers();
    this.pdf.save(filename);
  }

  private footered = false;
  private footers() {
    if (this.footered) return;
    this.footered = true;
    const { pdf, W, H, M } = this;
    const count = pdf.getNumberOfPages();
    for (let i = 1; i <= count; i++) {
      pdf.setPage(i);
      this.stroke(COLORS.line, 0.3);
      pdf.line(M, H - 12, W - M, H - 12);
      this.font(7.5, 'normal', COLORS.muted);
      pdf.text([this.company.name, this.company.phone, this.company.email].filter(Boolean).join('  ·  '), M, H - 7.5);
      pdf.text(`Page ${i} of ${count}`, W - M, H - 7.5, { align: 'right' });
    }
  }
}
