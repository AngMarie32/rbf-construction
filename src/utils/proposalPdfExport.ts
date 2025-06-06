
import jsPDF from 'jspdf';

interface Proposal {
  id: string;
  projectName: string;
  client: string;
  scope: string;
  amount: number;
  status: string;
  createdAt: Date;
}

export const generateProposalPDF = (proposal: Proposal) => {
  const doc = new jsPDF();
  
  // Header
  doc.setFontSize(20);
  doc.setTextColor(40, 40, 40);
  doc.text('PROPOSAL', 20, 30);
  
  // Company Info (placeholder)
  doc.setFontSize(12);
  doc.text('BuildPro Construction', 20, 45);
  doc.text('123 Construction Ave', 20, 52);
  doc.text('Builder City, BC 12345', 20, 59);
  doc.text('(555) 123-4567', 20, 66);
  
  // Proposal Details
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text('Proposal Details', 20, 85);
  
  doc.setFontSize(11);
  doc.text(`Project: ${proposal.projectName}`, 20, 100);
  doc.text(`Client: ${proposal.client}`, 20, 110);
  doc.text(`Date: ${proposal.createdAt.toLocaleDateString()}`, 20, 120);
  doc.text(`Status: ${proposal.status}`, 20, 130);
  
  // Scope of Work
  if (proposal.scope) {
    doc.text('Scope of Work:', 20, 150);
    const splitScope = doc.splitTextToSize(proposal.scope, 170);
    doc.text(splitScope, 20, 160);
  }
  
  // Amount
  doc.setFontSize(14);
  doc.text('Total Amount:', 20, 220);
  doc.setFontSize(16);
  doc.setTextColor(0, 100, 0);
  doc.text(`$${proposal.amount.toLocaleString()}`, 120, 220);
  
  // Footer
  doc.setFontSize(10);
  doc.setTextColor(100, 100, 100);
  doc.text('This proposal is valid for 30 days from the date above.', 20, 280);
  
  // Save the PDF
  doc.save(`proposal-${proposal.projectName.replace(/\s+/g, '-').toLowerCase()}.pdf`);
};
