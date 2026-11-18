import { fillProposalText, loadProposalSettings, resolveProposalTerms } from '@/lib/proposalSettings';
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


export const generateProfessionalProposalPDF = async (proposal: ProposalData) => {
  const [company, wording] = await Promise.all([loadCompany(), loadProposalSettings()]);
  const validDays = proposal.validDays || wording.validDays;
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
    fillProposalText(wording.intro, { company: company.name, project: proposal.projectName, days: validDays }),
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

  // Terms from Settings → Proposals unless this proposal has its own. No terms means no section.
  const terms = resolveProposalTerms(proposal.terms, wording.terms, { company: company.name, project: proposal.projectName, days: validDays });
  if (terms.length) {
    doc.heading('Terms and conditions');
    doc.bullets(terms);
  }

  if (proposal.notes?.trim()) {
    doc.heading('Notes');
    doc.paragraph(proposal.notes, 9);
  }

  doc.ensure(64); // keep the acceptance text and signature lines together
  doc.heading('Acceptance');
  doc.paragraph(
    fillProposalText(wording.acceptance, { company: company.name, project: proposal.projectName, days: validDays }),
    9
  );
  doc.y += 2;
  doc.signatures([
    { title: 'Accepted by (client)', name: proposal.client },
    { title: `For ${company.name}` },
  ]);

  doc.save(`proposal-${fileSlug(proposal.projectName)}.pdf`);
};
