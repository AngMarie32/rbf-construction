import { DocKit, loadCompany, usd, fmtDate, fileSlug } from './pdfDocKit';

interface ProposalData {
  id?: string;
  projectName: string;
  client: string;
  clientAddress?: string;
  clientPhone?: string;
  clientEmail?: string;
  projectAddress?: string;
  amount: number;
  status: string;
  createdAt: Date;
  scope?: string;
  notes?: string;
  validDays?: number;
  terms?: string[];
  proposalItems?: Array<{
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    total: number;
  }>;
}

const DEFAULT_TERMS = [
  'Payment terms: 50% deposit to schedule the work, with the balance due upon completion.',
  'All materials will be of good quality and installed in a workmanlike manner according to standard practice.',
  'Any change to this scope of work must be agreed in writing and may change the price and schedule.',
  'Contractor will obtain the permits required for the work described above.',
  'Work areas will be kept orderly and debris removed on a regular basis.',
  'This proposal becomes a binding agreement when signed by both parties.',
];

export const generateProfessionalProposalPDF = async (proposal: ProposalData) => {
  const company = await loadCompany();
  const validDays = proposal.validDays || 30;
  const validUntil = new Date(proposal.createdAt);
  validUntil.setDate(validUntil.getDate() + validDays);
  const ref = proposal.id ? `No. P-${proposal.id.replace(/-/g, '').slice(0, 6).toUpperCase()}` : '';

  const items = (proposal.proposalItems || []).filter((i) => (i.description || '').trim() || Number(i.total) || Number(i.unitPrice));
  const lineTotal = (i: NonNullable<ProposalData['proposalItems']>[number]) =>
    Number(i.quantity) && Number(i.unitPrice) ? Number(i.quantity) * Number(i.unitPrice) : Number(i.total) || 0;
  const itemsTotal = items.reduce((s, i) => s + lineTotal(i), 0);
  const total = items.length ? itemsTotal : Number(proposal.amount) || 0;

  const doc = new DocKit(company, 'Proposal', ref);
  doc.letterhead([
    { label: 'Date', value: fmtDate(proposal.createdAt) },
    { label: 'Valid until', value: fmtDate(validUntil) },
    { label: 'Proposal amount', value: usd(total, false) },
  ]);

  doc.infoBoxes([
    {
      title: 'Prepared for',
      lines: [proposal.client || 'Client', proposal.clientAddress, [proposal.clientPhone, proposal.clientEmail].filter(Boolean).join('  ·  ')],
    },
    { title: 'Project', lines: [proposal.projectName, proposal.projectAddress] },
  ]);

  doc.paragraph(
    `${company.name} is pleased to submit this proposal for ${proposal.projectName}. The price below covers the labor, materials and supervision needed to complete the scope of work described.`,
    9.5
  );

  if (proposal.scope?.trim()) {
    doc.heading('Scope of work');
    doc.paragraph(proposal.scope, 9.5);
  }

  if (items.length) {
    doc.heading(proposal.scope?.trim() ? 'Pricing' : 'Scope of work and pricing');
    doc.table(
      [
        { header: '#', width: 6, align: 'center' },
        { header: 'Description', width: 50 },
        { header: 'Qty', width: 10, align: 'right' },
        { header: 'Unit', width: 10, align: 'center' },
        { header: 'Unit price', width: 16, align: 'right' },
        { header: 'Amount', width: 18, align: 'right' },
      ],
      items.map((i, idx) => [
        String(idx + 1),
        i.description || '—',
        (Number(i.quantity) || 0).toLocaleString('en-US', { maximumFractionDigits: 3 }),
        i.unit || 'ea',
        usd(Number(i.unitPrice) || 0),
        { text: usd(lineTotal(i)), bold: true },
      ])
    );
    doc.totals([
      { label: 'Subtotal', value: usd(itemsTotal) },
      { label: 'Total', value: usd(itemsTotal) },
    ]);
  } else {
    doc.totals([{ label: 'Total project cost', value: usd(total) }]);
  }

  doc.heading('Terms and conditions');
  const terms = proposal.terms?.length ? [...proposal.terms] : [`This proposal is valid for ${validDays} days from the date above.`, ...DEFAULT_TERMS];
  doc.bullets(terms);

  if (proposal.notes?.trim()) {
    doc.heading('Notes');
    doc.paragraph(proposal.notes, 9);
  }

  doc.ensure(64); // keep the acceptance text and signature lines together
  doc.heading('Acceptance');
  doc.paragraph(
    'The above price, scope and conditions are satisfactory and are hereby accepted. The contractor is authorized to do the work as specified, and payment will be made as outlined above.',
    9
  );
  doc.y += 2;
  doc.signatures([
    { title: 'Accepted by (client)', name: proposal.client },
    { title: `For ${company.name}` },
  ]);

  doc.save(`proposal-${fileSlug(proposal.projectName)}.pdf`);
};
