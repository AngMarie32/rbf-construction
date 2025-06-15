
import jsPDF from 'jspdf';

interface ProposalData {
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
  proposalItems?: Array<{
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    total: number;
  }>;
}

export const generateProfessionalProposalPDF = (proposal: ProposalData) => {
  const pdf = new jsPDF('portrait', 'mm', 'letter');
  const pageWidth = pdf.internal.pageSize.getWidth();
  const margin = 20;
  let yPosition = 30;

  // Company Header
  pdf.setFontSize(24);
  pdf.setFont('helvetica', 'bold');
  pdf.text('BuildPro Construction', margin, yPosition);
  
  yPosition += 8;
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'normal');
  pdf.text('Licensed • Bonded • Insured', margin, yPosition);
  
  yPosition += 5;
  pdf.text('123 Construction Way, Builder City, ST 12345', margin, yPosition);
  yPosition += 4;
  pdf.text('Phone: (555) 123-4567 | Email: info@buildpro.com', margin, yPosition);
  
  // License info
  yPosition += 4;
  pdf.text('License #: ABC123456 | Contractor\'s License', margin, yPosition);

  // Title
  yPosition += 15;
  pdf.setFontSize(20);
  pdf.setFont('helvetica', 'bold');
  pdf.text('CONSTRUCTION PROPOSAL', margin, yPosition);

  // Proposal details box
  yPosition += 15;
  pdf.setDrawColor(0, 0, 0);
  pdf.rect(margin, yPosition, pageWidth - 2 * margin, 25);
  
  yPosition += 8;
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Customer Information:', margin + 5, yPosition);
  
  yPosition += 6;
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Name: ${proposal.client}`, margin + 5, yPosition);
  
  if (proposal.clientAddress) {
    yPosition += 5;
    pdf.text(`Address: ${proposal.clientAddress}`, margin + 5, yPosition);
  }
  
  if (proposal.clientPhone || proposal.clientEmail) {
    yPosition += 5;
    const contact = [proposal.clientPhone, proposal.clientEmail].filter(Boolean).join(' | ');
    pdf.text(`Contact: ${contact}`, margin + 5, yPosition);
  }

  // Project Information
  yPosition += 15;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Project Information:', margin, yPosition);
  
  yPosition += 6;
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Project: ${proposal.projectName}`, margin, yPosition);
  
  if (proposal.projectAddress) {
    yPosition += 5;
    pdf.text(`Location: ${proposal.projectAddress}`, margin, yPosition);
  }
  
  yPosition += 5;
  pdf.text(`Date: ${proposal.createdAt.toLocaleDateString()}`, margin, yPosition);
  
  yPosition += 5;
  const validUntil = new Date(proposal.createdAt);
  validUntil.setDate(validUntil.getDate() + (proposal.validDays || 30));
  pdf.text(`Valid Until: ${validUntil.toLocaleDateString()}`, margin, yPosition);

  // Scope of Work
  yPosition += 15;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text('SCOPE OF WORK', margin, yPosition);
  
  yPosition += 8;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  
  // If we have itemized scope
  if (proposal.proposalItems && proposal.proposalItems.length > 0) {
    // Table headers
    pdf.setFont('helvetica', 'bold');
    pdf.text('Description', margin, yPosition);
    pdf.text('Qty', margin + 100, yPosition);
    pdf.text('Unit', margin + 120, yPosition);
    pdf.text('Price', margin + 140, yPosition);
    pdf.text('Total', margin + 165, yPosition);
    
    yPosition += 5;
    pdf.line(margin, yPosition, pageWidth - margin, yPosition);
    yPosition += 5;
    
    pdf.setFont('helvetica', 'normal');
    let subtotal = 0;
    
    proposal.proposalItems.forEach((item) => {
      pdf.text(item.description, margin, yPosition);
      pdf.text(item.quantity.toString(), margin + 100, yPosition);
      pdf.text(item.unit, margin + 120, yPosition);
      pdf.text(`$${item.unitPrice.toFixed(2)}`, margin + 140, yPosition);
      pdf.text(`$${item.total.toFixed(2)}`, margin + 165, yPosition);
      subtotal += item.total;
      yPosition += 5;
    });
    
    // Total
    yPosition += 5;
    pdf.line(margin + 140, yPosition, pageWidth - margin, yPosition);
    yPosition += 8;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text(`TOTAL PROJECT COST: $${subtotal.toLocaleString()}`, margin + 100, yPosition);
  } else {
    // Text-based scope
    if (proposal.scope) {
      const scopeLines = pdf.splitTextToSize(proposal.scope, pageWidth - 2 * margin);
      pdf.text(scopeLines, margin, yPosition);
      yPosition += scopeLines.length * 5;
    }
    
    yPosition += 10;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text(`TOTAL PROJECT COST: $${proposal.amount.toLocaleString()}`, margin, yPosition);
  }

  // Terms and Conditions
  yPosition += 20;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text('TERMS AND CONDITIONS', margin, yPosition);
  
  yPosition += 8;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  
  const terms = [
    '• This proposal is valid for 30 days from the date above.',
    '• 50% deposit required to begin work, with balance due upon completion.',
    '• All materials will be of good quality and installed in a workmanlike manner.',
    '• Any changes to this scope of work must be approved in writing.',
    '• Contractor will obtain all necessary permits.',
    '• Work area to be left clean and debris removed daily.',
    '• This proposal becomes a contract when signed by both parties.'
  ];
  
  if (proposal.notes) {
    terms.push(`• ${proposal.notes}`);
  }
  
  terms.forEach((term) => {
    pdf.text(term, margin, yPosition);
    yPosition += 5;
  });

  // Signature section
  yPosition += 20;
  pdf.setFont('helvetica', 'bold');
  pdf.text('ACCEPTANCE', margin, yPosition);
  
  yPosition += 10;
  pdf.setFont('helvetica', 'normal');
  pdf.text('Customer Signature: _________________________ Date: ___________', margin, yPosition);
  
  yPosition += 10;
  pdf.text('Print Name: _________________________', margin, yPosition);
  
  yPosition += 15;
  pdf.text('Contractor Signature: _________________________ Date: ___________', margin, yPosition);

  // Footer
  const pageHeight = pdf.internal.pageSize.getHeight();
  pdf.setFontSize(8);
  pdf.text('Thank you for choosing BuildPro Construction for your project!', margin, pageHeight - 15);

  const filename = `proposal-${proposal.projectName.replace(/\s+/g, '-').toLowerCase()}.pdf`;
  pdf.save(filename);
};
