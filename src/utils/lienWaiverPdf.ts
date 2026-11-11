
export type WaiverType = 'conditional_progress' | 'unconditional_progress' | 'conditional_final' | 'unconditional_final';

export interface WaiverInput {
  type: WaiverType;
  projectName: string;
  projectAddress?: string;
  ownerName?: string;
  contractorName: string;     // the SUB signing the waiver
  customerName?: string;      // who pays the sub (often RBF Construction)
  amountPaid: number;
  throughDate: string;        // ISO date string
  checkNumber?: string;
  exceptions?: string;
}

const TITLES: Record<WaiverType, string> = {
  conditional_progress: 'CONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT',
  unconditional_progress: 'UNCONDITIONAL WAIVER AND RELEASE ON PROGRESS PAYMENT',
  conditional_final: 'CONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT',
  unconditional_final: 'UNCONDITIONAL WAIVER AND RELEASE ON FINAL PAYMENT',
};

function bodyText(input: WaiverInput): string {
  const through = new Date(input.throughDate).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  const amt = input.amountPaid.toLocaleString('en-US', { style: 'currency', currency: 'USD' });
  const isConditional = input.type.startsWith('conditional');
  const isFinal = input.type.endsWith('final');
  const conditionalClause = isConditional
    ? `This waiver and release is conditional upon actual receipt of payment in the amount of ${amt}. If the undersigned has not actually received said payment, this document shall be null and void.`
    : `The undersigned has been paid and has received progress/final payment in the amount of ${amt} and does hereby waive and release any right to a mechanic's lien, stop notice, or any right against a labor and material bond.`;
  const scope = isFinal
    ? `for all labor, services, equipment, or material furnished to the jobsite or to ${input.customerName || '[Customer]'} on the project described as ${input.projectName}${input.projectAddress ? `, located at ${input.projectAddress}` : ''}.`
    : `for any and all labor, services, equipment, or material furnished through ${through} to the jobsite or to ${input.customerName || '[Customer]'} on the project described as ${input.projectName}${input.projectAddress ? `, located at ${input.projectAddress}` : ''}.`;
  return `${conditionalClause}\n\nThe undersigned warrants that he/she either has already paid or will use the funds received from this payment to promptly pay in full all of his/her laborers, subcontractors, materialmen, and suppliers ${scope}\n\n${input.exceptions ? `Exceptions: ${input.exceptions}` : 'Exceptions: None'}`;
}

export async function generateLienWaiverPdf(input: WaiverInput): Promise<Blob> {
  const { DocKit, COLORS, loadCompany, usd } = await import('./pdfDocKit');
  const { fmtISO } = await import('./aiaPdf');
  const company = await loadCompany();
  const isFinal = input.type.endsWith('final');
  const doc = new DocKit(company, 'Lien Waiver', isFinal ? 'Final payment' : 'Progress payment');
  doc.letterhead([
    { label: 'Through date', value: isFinal ? 'Final' : fmtISO(input.throughDate) },
    { label: 'Amount of payment', value: usd(input.amountPaid) },
    { label: 'Check / reference', value: input.checkNumber || '—' },
  ]);

  // Title (wraps inside the margins instead of running into the logo)
  doc.font(12.5, 'bold', COLORS.navy);
  const title = doc.pdf.splitTextToSize(TITLES[input.type], doc.contentWidth) as string[];
  title.forEach((t) => {
    doc.pdf.text(t, doc.W / 2, doc.y, { align: 'center' });
    doc.y += 5.6;
  });
  doc.y += 3;

  doc.infoBoxes([
    { title: 'Project', lines: [input.projectName, input.projectAddress, input.ownerName ? `Owner: ${input.ownerName}` : null] },
    { title: 'Claimant (signing this waiver)', lines: [input.contractorName, input.customerName ? `Customer: ${input.customerName}` : null] },
  ]);

  // bodyText formats the date itself; give it a local-noon timestamp so it never shifts a day
  const body = bodyText({ ...input, throughDate: `${input.throughDate.slice(0, 10)}T12:00:00` });
  body.split('\n\n').forEach((para) => doc.paragraph(para, 9.6));

  doc.heading('Notice');
  doc.paragraph(
    isFinal
      ? 'This document waives rights unconditionally and states that you have been paid for giving up those rights' +
          (input.type.startsWith('conditional') ? ', once the payment above is received.' : '. It is prohibited for a person to require you to sign this document if you have not been paid the payment amount set forth above.')
      : 'This document waives and releases lien, stop payment notice and payment bond rights for the progress payment stated above.' +
          (input.type.startsWith('conditional') ? ' It is effective only when the payment above is actually received.' : ' Do not sign it until you have been paid.'),
    8.6,
    COLORS.muted
  );
  doc.y += 4;
  doc.signatures([{ title: 'Claimant signature', name: input.contractorName }, { title: 'Witness / notary (if required)' }]);
  return doc.output();
}

export const WAIVER_LABELS: Record<WaiverType, string> = {
  conditional_progress: 'Conditional Waiver — Progress Payment',
  unconditional_progress: 'Unconditional Waiver — Progress Payment',
  conditional_final: 'Conditional Waiver — Final Payment',
  unconditional_final: 'Unconditional Waiver — Final Payment',
};