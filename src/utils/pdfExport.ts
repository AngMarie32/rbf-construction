
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export const exportToPDF = async (elementId: string, filename: string = 'export.pdf') => {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with id "${elementId}" not found`);
    }

    // Temporarily show the element if it's hidden
    const originalDisplay = element.style.display;
    element.style.display = 'block';

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: element.scrollWidth,
      height: element.scrollHeight
    });

    // Restore original display
    element.style.display = originalDisplay;

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
    const imgX = (pdfWidth - imgWidth * ratio) / 2;
    const imgY = 0;

    pdf.addImage(imgData, 'PNG', imgX, imgY, imgWidth * ratio, imgHeight * ratio);
    pdf.save(filename);
    
    return true;
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    throw error;
  }
};

export const exportCSV = (data: any[], filename: string = 'export.csv') => {
  if (!data || data.length === 0) {
    throw new Error('No data to export');
  }

  const headers = Object.keys(data[0]);
  const csvContent = [
    headers.join(','),
    ...data.map(row => 
      headers.map(header => {
        const value = row[header];
        // Escape commas and quotes in CSV
        return typeof value === 'string' && (value.includes(',') || value.includes('"'))
          ? `"${value.replace(/"/g, '""')}"`
          : value;
      }).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Add the missing functions for BidPlanner
export const generateBidExportPDF = (bidItems: any[], projectName: string) => {
  const pdf = new jsPDF();
  
  // Add title
  pdf.setFontSize(20);
  pdf.text(`Bid Estimate - ${projectName}`, 20, 30);
  
  // Add date
  pdf.setFontSize(12);
  pdf.text(`Generated: ${new Date().toLocaleDateString()}`, 20, 45);
  
  let yPosition = 65;
  
  // Group by category
  const categorizedItems = bidItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, any[]>);
  
  Object.entries(categorizedItems).forEach(([category, items]) => {
    // Category header
    pdf.setFontSize(14);
    pdf.text(category, 20, yPosition);
    yPosition += 10;
    
    // Items - add type checking to ensure items is an array
    pdf.setFontSize(10);
    if (Array.isArray(items)) {
      items.forEach((item) => {
        const line = `${item.description} - ${item.quantity} ${item.unit} x $${item.unitCost} = $${item.total}`;
        pdf.text(line, 25, yPosition);
        yPosition += 6;
        
        if (yPosition > 270) {
          pdf.addPage();
          yPosition = 20;
        }
      });
    }
    
    yPosition += 5;
  });
  
  // Total
  const total = bidItems.reduce((sum, item) => sum + item.total, 0);
  pdf.setFontSize(14);
  pdf.text(`Total Estimate: $${total.toLocaleString()}`, 20, yPosition + 10);
  
  pdf.save(`bid-estimate-${projectName.replace(/\s+/g, '-').toLowerCase()}.pdf`);
};

export const generateProposalPDF = (proposalData: any) => {
  const pdf = new jsPDF();
  
  // Header
  pdf.setFontSize(20);
  pdf.text('Project Proposal', 20, 30);
  
  pdf.setFontSize(12);
  pdf.text(`Project: ${proposalData.projectName}`, 20, 50);
  pdf.text(`Client: ${proposalData.client}`, 20, 65);
  pdf.text(`Date: ${proposalData.date}`, 20, 80);
  
  // Scope
  pdf.setFontSize(14);
  pdf.text('Scope of Work:', 20, 100);
  
  pdf.setFontSize(10);
  // Add type checking for scope
  const scope = proposalData.scope || '';
  const scopeLines = typeof scope === 'string' ? scope.split('\n') : [scope.toString()];
  let yPos = 115;
  scopeLines.forEach((line: string) => {
    pdf.text(line, 25, yPos);
    yPos += 6;
  });
  
  // Total
  pdf.setFontSize(16);
  pdf.text(`Total Amount: $${proposalData.amount.toLocaleString()}`, 20, yPos + 20);
  
  pdf.save(`proposal-${proposalData.projectName.replace(/\s+/g, '-').toLowerCase()}.pdf`);
};
