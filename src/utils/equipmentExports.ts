import { localDateISO } from '@/utils/dates';
import * as XLSX from 'xlsx';
import type { Equipment, EquipmentFilters } from '@/types/equipment';
import { DocKit, COLORS, loadCompany, usd, type RGB } from './pdfDocKit';

interface ExportOptions {
  equipment: Equipment[];
  filters: EquipmentFilters;
  title?: string;
}

/** Date-only strings ("2026-03-01") parsed as local days, not UTC. */
const parseDay = (d?: string | null) => (d ? new Date(/^\d{4}-\d{2}-\d{2}$/.test(d) ? `${d}T00:00:00` : d) : null);
const fmtDay = (d?: string | null) => {
  const x = parseDay(d);
  return x && !isNaN(x.getTime()) ? x.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
};
const daysUntil = (d?: string | null) => {
  const x = parseDay(d);
  if (!x || isNaN(x.getTime())) return null;
  const t = new Date();
  t.setHours(0, 0, 0, 0);
  return Math.round((x.getTime() - t.getTime()) / 86400000);
};

const filtersText = (f: EquipmentFilters) => {
  const p: string[] = [];
  if (f.search) p.push(`Search "${f.search}"`);
  if (f.status && f.status !== 'all') p.push(`Status: ${f.status}`);
  if (f.category && f.category !== 'all') p.push(`Category: ${f.category}`);
  if (f.location && f.location !== 'all') p.push(`Location: ${f.location}`);
  if (f.availableOnly) p.push('Available only');
  return p.length ? p.join(' · ') : 'All equipment';
};

const STATUS_COLOR: Record<string, RGB> = {
  Available: [5, 150, 105],
  'In Use': [37, 99, 235],
  Maintenance: [217, 119, 6],
};

function summarize(equipment: Equipment[]) {
  const by = (key: (e: Equipment) => string) => {
    const m = new Map<string, { count: number; value: number }>();
    equipment.forEach((e) => {
      const k = key(e) || 'Uncategorized';
      const r = m.get(k) || { count: 0, value: 0 };
      r.count++;
      r.value += Number(e.value) || 0;
      m.set(k, r);
    });
    return [...m.entries()].sort((a, b) => b[1].value - a[1].value || b[1].count - a[1].count);
  };
  const alerts: { name: string; what: string; when: string; days: number }[] = [];
  equipment.forEach((e) => {
    const ins = daysUntil(e.insurance_expiry);
    if (ins !== null && ins <= 30) alerts.push({ name: e.name, what: ins < 0 ? 'Insurance expired' : 'Insurance expires soon', when: fmtDay(e.insurance_expiry), days: ins });
    const insp = daysUntil(e.last_inspection_date);
    if (insp !== null && insp < -365) alerts.push({ name: e.name, what: 'Inspection over a year old', when: fmtDay(e.last_inspection_date), days: insp });
    if (e.status === 'Maintenance') alerts.push({ name: e.name, what: 'In maintenance', when: '—', days: 0 });
  });
  alerts.sort((a, b) => a.days - b.days);
  return {
    totalValue: equipment.reduce((s, e) => s + (Number(e.value) || 0), 0),
    totalHours: equipment.reduce((s, e) => s + (Number(e.total_hours_used) || 0), 0),
    avgRate: equipment.length ? equipment.reduce((s, e) => s + (Number(e.hourly_rate) || 0), 0) / equipment.length : 0,
    byStatus: by((e) => e.status),
    byCategory: by((e) => e.category),
    alerts,
  };
}

export const exportEquipmentToPDF = async ({ equipment, filters, title = 'Equipment Report' }: ExportOptions) => {
  const company = await loadCompany();
  const s = summarize(equipment);
  const doc = new DocKit(company, title, filtersText(filters), 'landscape');
  const count = (k: string) => s.byStatus.find(([n]) => n === k)?.[1].count || 0;

  doc.letterhead([
    { label: 'Printed', value: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
    { label: 'Units', value: String(equipment.length) },
    { label: 'Fleet value', value: usd(s.totalValue, false) },
    { label: 'Available / in use', value: `${count('Available')} / ${count('In Use')}` },
    { label: 'In maintenance', value: String(count('Maintenance')) },
  ]);

  // Status strip: one colored bar split by status.
  if (equipment.length) {
    const { pdf, M } = doc;
    const w = doc.W - 2 * M;
    doc.ensure(14);
    let x = M;
    (['Available', 'In Use', 'Maintenance'] as const).forEach((k) => {
      const c = count(k);
      if (!c) return;
      const seg = (w * c) / equipment.length;
      doc.fill(STATUS_COLOR[k]);
      pdf.rect(x, doc.y, seg, 4, 'F');
      if (seg > 28) {
        doc.font(7, 'bold', [255, 255, 255]);
        pdf.text(`${k} ${c}`, x + 2, doc.y + 2.9);
      }
      x += seg;
    });
    doc.y += 8;
  }

  doc.heading('Summary by category');
  doc.table(
    [
      { header: 'Category', width: 40 },
      { header: 'Units', width: 12, align: 'right' },
      { header: 'Value', width: 20, align: 'right' },
      { header: 'Share of value', width: 16, align: 'right' },
    ],
    s.byCategory.map(([k, r]) => [{ text: k, bold: true }, String(r.count), usd(r.value, false), s.totalValue ? `${Math.round((r.value / s.totalValue) * 100)}%` : '—']),
    { fontSize: 8.5 }
  );
  doc.totals([
    { label: 'Fleet value', value: usd(s.totalValue, false) },
    { label: 'Average hourly rate', value: usd(s.avgRate) },
    { label: 'Total hours logged', value: s.totalHours.toLocaleString('en-US') },
  ]);

  if (s.alerts.length) {
    doc.heading('Needs attention');
    doc.table(
      [
        { header: 'Equipment', width: 34 },
        { header: 'Issue', width: 34 },
        { header: 'Date', width: 18 },
      ],
      s.alerts.map((a) => [{ text: a.name, bold: true }, { text: a.what, color: a.days < 0 || a.what === 'In maintenance' ? ([190, 18, 60] as RGB) : ([180, 83, 9] as RGB) }, a.when]),
      { fontSize: 8.5 }
    );
  }

  doc.heading('Equipment list');
  const sorted = [...equipment].sort((a, b) => (a.category || '').localeCompare(b.category || '') || a.name.localeCompare(b.name));
  doc.table(
    [
      { header: 'Name', width: 22 },
      { header: 'Category', width: 12 },
      { header: 'Status', width: 9 },
      { header: 'VIN / Serial', width: 15 },
      { header: 'Year', width: 5, align: 'center' },
      { header: 'Location', width: 12 },
      { header: 'Value', width: 10, align: 'right' },
      { header: 'Rate/hr', width: 7, align: 'right' },
      { header: 'Hours', width: 7, align: 'right' },
      { header: 'Insurance', width: 10 },
    ],
    sorted.map((e) => {
      const ins = daysUntil(e.insurance_expiry);
      return [
        { text: e.name, bold: true },
        e.category || '—',
        { text: e.status, color: STATUS_COLOR[e.status] },
        e.vin_serial_number || '—',
        e.year ? String(e.year) : '—',
        e.location || '—',
        e.value ? usd(Number(e.value), false) : '—',
        e.hourly_rate ? usd(Number(e.hourly_rate)) : '—',
        e.total_hours_used ? Number(e.total_hours_used).toLocaleString('en-US') : '—',
        { text: fmtDay(e.insurance_expiry), color: ins !== null && ins < 0 ? ([190, 18, 60] as RGB) : ins !== null && ins <= 30 ? ([180, 83, 9] as RGB) : undefined },
      ];
    }),
    { fontSize: 7.8 }
  );
  if (!equipment.length) doc.paragraph('No equipment matches the current filters.', 9, COLORS.muted);

  doc.save(`Equipment_Report_${localDateISO()}.pdf`);
};

export const exportEquipmentToExcel = ({ equipment, filters, title = 'Equipment Report' }: ExportOptions) => {
  const s = summarize(equipment);
  const wb = XLSX.utils.book_new();

  const summary: (string | number)[][] = [
    [title],
    ['Printed', new Date().toLocaleString()],
    ['Filters', filtersText(filters)],
    [],
    ['Units', equipment.length],
    ['Fleet value', s.totalValue],
    ['Average hourly rate', Math.round(s.avgRate * 100) / 100],
    ['Total hours logged', s.totalHours],
    [],
    ['By status', 'Units', 'Value'],
    ...s.byStatus.map(([k, r]) => [k, r.count, r.value]),
    [],
    ['By category', 'Units', 'Value'],
    ...s.byCategory.map(([k, r]) => [k, r.count, r.value]),
  ];
  const sumSheet = XLSX.utils.aoa_to_sheet(summary);
  sumSheet['!cols'] = [{ wch: 26 }, { wch: 14 }, { wch: 16 }];
  XLSX.utils.book_append_sheet(wb, sumSheet, 'Summary');

  const rows = [...equipment]
    .sort((a, b) => (a.category || '').localeCompare(b.category || '') || a.name.localeCompare(b.name))
    .map((e) => ({
      Name: e.name,
      Category: e.category || '',
      Status: e.status,
      'VIN / Serial': e.vin_serial_number || '',
      Year: e.year || '',
      Location: e.location || '',
      'Purchase date': e.purchase_date ? fmtDay(e.purchase_date) : '',
      'Value ($)': Number(e.value) || 0,
      'Hourly rate ($)': Number(e.hourly_rate) || 0,
      'Hours used': Number(e.total_hours_used) || 0,
      'Last inspection': e.last_inspection_date ? fmtDay(e.last_inspection_date) : '',
      'Insurance expires': e.insurance_expiry ? fmtDay(e.insurance_expiry) : '',
      Description: e.description || '',
    }));
  const list = XLSX.utils.json_to_sheet(rows);
  list['!cols'] = [26, 16, 12, 20, 6, 16, 14, 12, 12, 10, 14, 14, 40].map((wch) => ({ wch }));
  list['!autofilter'] = { ref: `A1:M${rows.length + 1}` };
  XLSX.utils.book_append_sheet(wb, list, 'Equipment');

  if (s.alerts.length) {
    const al = XLSX.utils.json_to_sheet(s.alerts.map((a) => ({ Equipment: a.name, Issue: a.what, Date: a.when })));
    al['!cols'] = [{ wch: 26 }, { wch: 28 }, { wch: 14 }];
    XLSX.utils.book_append_sheet(wb, al, 'Needs attention');
  }

  XLSX.writeFile(wb, `Equipment_Report_${localDateISO()}.xlsx`);
};
