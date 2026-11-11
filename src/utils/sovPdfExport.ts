import { DocKit, loadCompany, usd, fmtDate, fileSlug } from './pdfDocKit';

export interface SovLine {
  item_number: string;
  category?: string | null;
  subcategory?: string | null;
  description: string;
  scheduled_value: number;
  change_orders?: number | null;
  previous_applications?: number | null;
  this_period?: number | null;
  materials_stored?: number | null;
  retainage_percentage?: number | null;
}

export const sovCompleted = (l: SovLine) =>
  (Number(l.previous_applications) || 0) + (Number(l.this_period) || 0) + (Number(l.materials_stored) || 0);
export const sovContract = (l: SovLine) => (Number(l.scheduled_value) || 0) + (Number(l.change_orders) || 0);
export const sovPercent = (l: SovLine) => {
  const c = sovContract(l);
  return c > 0 ? Math.min(100, (sovCompleted(l) / c) * 100) : 0;
};

/** Client-ready Schedule of Values (G703-style continuation) as a vector PDF. */
export async function generateSovReport(
  project: { name: string; client?: string | null; address?: string | null; project_code?: string | null },
  lines: SovLine[],
  contingency = 0
) {
  const company = await loadCompany();
  const contract = lines.reduce((s, l) => s + sovContract(l), 0);
  const completed = lines.reduce((s, l) => s + sovCompleted(l), 0);
  const retainage = lines.reduce((s, l) => s + (sovCompleted(l) * (Number(l.retainage_percentage) || 0)) / 100, 0);
  const pct = contract ? (completed / contract) * 100 : 0;

  const doc = new DocKit(company, 'Schedule of Values', project.project_code ? `Job ${project.project_code}` : '');
  doc.letterhead([
    { label: 'Date', value: fmtDate(new Date()) },
    { label: 'Contract value', value: usd(contract + contingency, false) },
    { label: 'Completed to date', value: usd(completed, false) },
    { label: '% complete', value: `${pct.toFixed(1)}%` },
  ]);
  doc.infoBoxes([
    { title: 'Project', lines: [project.name, project.address] },
    { title: 'Owner / client', lines: [project.client || 'Not specified'] },
  ]);

  doc.heading('Schedule of values');
  doc.table(
    [
      { header: 'Item', width: 7 },
      { header: 'Description of work', width: 33 },
      { header: 'Scheduled', width: 14, align: 'right' },
      { header: 'Changes', width: 11, align: 'right' },
      { header: 'Completed', width: 14, align: 'right' },
      { header: '%', width: 7, align: 'right' },
      { header: 'Balance', width: 14, align: 'right' },
    ],
    [
      ...lines.map((l) => [
        l.item_number,
        [l.description, [l.category, l.subcategory].filter(Boolean).join(' · ')].filter(Boolean).join('\n'),
        usd(Number(l.scheduled_value) || 0),
        Number(l.change_orders) ? usd(Number(l.change_orders)) : '—',
        usd(sovCompleted(l)),
        `${sovPercent(l).toFixed(0)}%`,
        { text: usd(sovContract(l) - sovCompleted(l)), bold: true },
      ]),
      ['', 'Totals', usd(lines.reduce((s, l) => s + (Number(l.scheduled_value) || 0), 0)), usd(lines.reduce((s, l) => s + (Number(l.change_orders) || 0), 0)), usd(completed), `${pct.toFixed(0)}%`, usd(contract - completed)],
    ],
    { subtotalRows: new Set([lines.length]) }
  );

  const totals = [{ label: 'Contract (incl. changes)', value: usd(contract) }];
  if (contingency) totals.push({ label: 'Contingency', value: usd(contingency) });
  totals.push({ label: 'Completed and stored', value: usd(completed) });
  if (retainage) totals.push({ label: 'Retainage held', value: usd(retainage) });
  totals.push({ label: 'Balance to finish', value: usd(contract + contingency - completed) });
  doc.totals(totals);

  doc.save(`schedule-of-values-${fileSlug(project.name)}.pdf`);
}
