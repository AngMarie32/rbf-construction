
import jsPDF from 'jspdf';
import { loadLogoAsDataUrl } from './pdfLogoHelper';

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
  terms?: string[];
  proposalItems?: Array<{
    description: string;
    quantity: number;
    unit: string;
    unitPrice: number;
    total: number;
  }>;
}

const MARGIN = 20;
const PAGE_HEIGHT = 279.4;

export const generateProfessionalProposalPDF = async (proposal: ProposalData) => {
  const pdf = new jsPDF('portrait', 'mm', 'letter');
  const pageWidth = pdf.internal.pageSize.getWidth();
  let yPosition = 10;

  const checkPageBreak = (neededSpace: number) => {
    if (yPosition + neededSpace > PAGE_HEIGHT - 20) {
      pdf.addPage();
      yPosition = 20;
    }
  };

  // Company Header with Logo
  const logoDataUrl = await loadLogoAsDataUrl();
  if (logoDataUrl) {
    const logoWidth = 40;
    const logoHeight = 30;
    pdf.addImage(logoDataUrl, 'PNG', MARGIN, yPosition, logoWidth, logoHeight);
    yPosition += logoHeight + 4;
  } else {
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text('RBF Construction', MARGIN, yPosition + 8);
    yPosition += 14;
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text('1411 W Hill Rd, Flint, MI 48507', MARGIN, yPosition);
    yPosition += 3;
    pdf.text('Phone: 810-938-8498', MARGIN, yPosition);
    yPosition += 3;
  }

  // Title
  yPosition += 10;
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('BUDGET ESTIMATE', MARGIN, yPosition);

  // Proposal details box
  yPosition += 15;
  pdf.setDrawColor(0, 0, 0);
  pdf.rect(MARGIN, yPosition, pageWidth - 2 * MARGIN, 25);
  
  yPosition += 8;
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Customer Information:', MARGIN + 5, yPosition);
  
  yPosition += 6;
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Name: ${proposal.client}`, MARGIN + 5, yPosition);
  
  if (proposal.clientAddress) {
    yPosition += 5;
    pdf.text(`Address: ${proposal.clientAddress}`, MARGIN + 5, yPosition);
  }
  
  if (proposal.clientPhone || proposal.clientEmail) {
    yPosition += 5;
    const contact = [proposal.clientPhone, proposal.clientEmail].filter(Boolean).join(' | ');
    pdf.text(`Contact: ${contact}`, MARGIN + 5, yPosition);
  }

  // Project Information
  yPosition += 15;
  pdf.setFont('helvetica', 'bold');
  pdf.text('Project Information:', MARGIN, yPosition);
  
  yPosition += 6;
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Project: ${proposal.projectName}`, MARGIN, yPosition);
  
  if (proposal.projectAddress) {
    yPosition += 5;
    pdf.text(`Location: ${proposal.projectAddress}`, MARGIN, yPosition);
  }
  
  yPosition += 5;
  pdf.text(`Date: ${proposal.createdAt.toLocaleDateString()}`, MARGIN, yPosition);
  
  yPosition += 5;
  const validUntil = new Date(proposal.createdAt);
  validUntil.setDate(validUntil.getDate() + (proposal.validDays || 30));
  pdf.text(`Valid Until: ${validUntil.toLocaleDateString()}`, MARGIN, yPosition);

  // Scope of Work
  yPosition += 15;
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(14);
  pdf.text('SCOPE OF WORK', MARGIN, yPosition);
  
  yPosition += 8;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  
  if (proposal.proposalItems && proposal.proposalItems.length > 0) {
    // Table headers
    pdf.setFont('helvetica', 'bold');
    pdf.text('Description', MARGIN, yPosition);
    pdf.text('Qty', MARGIN + 90, yPosition);
    pdf.text('Unit', MARGIN + 108, yPosition);
    pdf.text('Unit Price', MARGIN + 128, yPosition);
    pdf.text('Ext. Cost', MARGIN + 155, yPosition);
    
    yPosition += 5;
    pdf.line(MARGIN, yPosition, pageWidth - MARGIN, yPosition);
    yPosition += 5;
    
    pdf.setFont('helvetica', 'normal');
    let subtotal = 0;
    
    proposal.proposalItems.forEach((item) => {
      checkPageBreak(12);
      const lineTotal = item.quantity * item.unitPrice;
      pdf.text(item.description, MARGIN, yPosition);
      pdf.text(item.quantity.toString(), MARGIN + 90, yPosition);
      pdf.text(item.unit, MARGIN + 108, yPosition);
      pdf.text(`$${item.unitPrice.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, MARGIN + 128, yPosition);
      pdf.text(`$${lineTotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, MARGIN + 155, yPosition);
      subtotal += lineTotal;
      yPosition += 6;
    });
    
    // Total
    yPosition += 3;
    checkPageBreak(15);
    pdf.line(MARGIN + 128, yPosition, pageWidth - MARGIN, yPosition);
    yPosition += 8;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(12);
    pdf.text(`TOTAL PROJECT COST: $${subtotal.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`, MARGIN + 90, yPosition);
  } else {
    if (proposal.scope) {
      const scopeLines = pdf.splitTextToSize(proposal.scope, pageWidth - 2 * MARGIN);
      pdf.text(scopeLines, MARGIN, yPosition);
      yPosition += scopeLines.length * 5;
    }
    
    yPosition += 10;
    pdf.setFont('helvetica', 'bold');
    pdf.setFontSize(16);
    pdf.text(`TOTAL PROJECT COST: $${proposal.amount.toLocaleString()}`, MARGIN, yPosition);
  }

  // Terms and Conditions
  yPosition += 20;
  checkPageBreak(40);
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.text('TERMS AND CONDITIONS', MARGIN, yPosition);
  
  yPosition += 8;
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(9);
  
  const defaultTerms = [
    'This proposal is valid for 30 days from the date above.',
    '50% deposit required to begin work, with balance due upon completion.',
    'All materials will be of good quality and installed in a workmanlike manner.',
    'Any changes to this scope of work must be approved in writing.',
    'Contractor will obtain all necessary permits.',
    'Work area to be left clean and debris removed daily.',
    'This proposal becomes a contract when signed by both parties.'
  ];

  const termsToUse = proposal.terms && proposal.terms.length > 0 ? [...proposal.terms] : [...defaultTerms];
  
  if (proposal.notes) {
    termsToUse.push(proposal.notes);
  }
  
  termsToUse.forEach((term) => {
    checkPageBreak(8);
    const lines = pdf.splitTextToSize(`• ${term}`, pageWidth - 2 * MARGIN);
    pdf.text(lines, MARGIN, yPosition);
    yPosition += lines.length * 4.5;
  });

  // Signature section
  yPosition += 15;
  checkPageBreak(45);
  pdf.setFont('helvetica', 'bold');
  pdf.text('ACCEPTANCE', MARGIN, yPosition);
  
  yPosition += 10;
  pdf.setFont('helvetica', 'normal');
  pdf.text('Customer Signature: _________________________ Date: ___________', MARGIN, yPosition);
  
  yPosition += 10;
  pdf.text('Print Name: _________________________', MARGIN, yPosition);
  
  yPosition += 15;
  pdf.text('Contractor Signature: _________________________ Date: ___________', MARGIN, yPosition);

  const filename = `proposal-${proposal.projectName.replace(/\s+/g, '-').toLowerCase()}.pdf`;
  pdf.save(filename);
};
