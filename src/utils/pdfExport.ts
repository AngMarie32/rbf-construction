
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
      height: element.scrollHeight,
      windowWidth: 1200,
      windowHeight: 800
    });

    // Restore original display
    element.style.display = originalDisplay;

    const imgData = canvas.toDataURL('image/png');
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = canvas.width;
    const imgHeight = canvas.height;
    
    // Calculate scaling to fit the page
    const ratio = Math.min(pdfWidth / (imgWidth * 0.264583), pdfHeight / (imgHeight * 0.264583));
    const scaledWidth = imgWidth * 0.264583 * ratio;
    const scaledHeight = imgHeight * 0.264583 * ratio;
    
    const imgX = (pdfWidth - scaledWidth) / 2;
    const imgY = 10;

    pdf.addImage(imgData, 'PNG', imgX, imgY, scaledWidth, scaledHeight);
    pdf.save(filename);
    
    return true;
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    throw error;
  }
};

export const exportG702G703ToPDF = async (filename: string = 'G702-G703-Application.pdf') => {
  try {
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'letter'
    });

    // Export G702 first
    const g702Element = document.getElementById('g702-document');
    if (g702Element) {
      const originalDisplay = g702Element.style.display;
      g702Element.style.display = 'block';

      const g702Canvas = await html2canvas(g702Element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: g702Element.scrollWidth,
        height: g702Element.scrollHeight
      });

      g702Element.style.display = originalDisplay;

      const g702ImgData = g702Canvas.toDataURL('image/png');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const ratio = Math.min(pdfWidth / (g702Canvas.width * 0.264583), pdfHeight / (g702Canvas.height * 0.264583));
      const scaledWidth = g702Canvas.width * 0.264583 * ratio;
      const scaledHeight = g702Canvas.height * 0.264583 * ratio;
      
      pdf.addImage(g702ImgData, 'PNG', 10, 10, scaledWidth, scaledHeight);
    }

    // Add new page for G703
    pdf.addPage();

    // Export G703
    const g703Element = document.getElementById('g703-document');
    if (g703Element) {
      const originalDisplay = g703Element.style.display;
      g703Element.style.display = 'block';

      const g703Canvas = await html2canvas(g703Element, {
        scale: 2,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: g703Element.scrollWidth,
        height: g703Element.scrollHeight
      });

      g703Element.style.display = originalDisplay;

      const g703ImgData = g703Canvas.toDataURL('image/png');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      
      const ratio = Math.min(pdfWidth / (g703Canvas.width * 0.264583), pdfHeight / (g703Canvas.height * 0.264583));
      const scaledWidth = g703Canvas.width * 0.264583 * ratio;
      const scaledHeight = g703Canvas.height * 0.264583 * ratio;
      
      pdf.addImage(g703ImgData, 'PNG', 10, 10, scaledWidth, scaledHeight);
    }

    pdf.save(filename);
    return true;
  } catch (error) {
    console.error('Error exporting G702/G703 to PDF:', error);
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
