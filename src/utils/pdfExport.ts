
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
      windowWidth: 1400,
      windowHeight: 900
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
    
    // Calculate scaling to fit the page with margins
    const margin = 10;
    const availableWidth = pdfWidth - (margin * 2);
    const availableHeight = pdfHeight - (margin * 2);
    
    const ratio = Math.min(availableWidth / (imgWidth * 0.264583), availableHeight / (imgHeight * 0.264583));
    const scaledWidth = imgWidth * 0.264583 * ratio;
    const scaledHeight = imgHeight * 0.264583 * ratio;
    
    const imgX = (pdfWidth - scaledWidth) / 2;
    const imgY = margin;

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
      orientation: 'landscape',
      unit: 'mm',
      format: 'letter'
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 6;
    const availableWidth = pdfWidth - (margin * 2);
    const availableHeight = pdfHeight - (margin * 2);

    // Export G702 first
    const g702Element = document.getElementById('g702-document');
    if (g702Element) {
      // Store original styles safely
      const originalG702ClassName = g702Element.className;
      const originalStyles = {
        position: g702Element.style.position,
        left: g702Element.style.left,
        top: g702Element.style.top,
        display: g702Element.style.display,
        visibility: g702Element.style.visibility,
        width: g702Element.style.width,
        transform: g702Element.style.transform,
        transformOrigin: g702Element.style.transformOrigin
      };
      
      // Temporarily make visible and optimize for landscape export
      g702Element.className = g702Element.className.replace('sr-only', '');
      g702Element.style.position = 'static';
      g702Element.style.left = 'auto';
      g702Element.style.top = 'auto';
      g702Element.style.display = 'block';
      g702Element.style.visibility = 'visible';
      g702Element.style.width = '11in';
      g702Element.style.transform = 'scale(0.9)';
      g702Element.style.transformOrigin = 'top left';
      
      console.log('G702 element dimensions:', g702Element.scrollWidth, g702Element.scrollHeight);

      const g702Canvas = await html2canvas(g702Element, {
        scale: 1.8,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: g702Element.scrollWidth,
        height: g702Element.scrollHeight,
        windowWidth: 1600,
        windowHeight: 1200
      });

      // Restore original styles safely
      g702Element.className = originalG702ClassName;
      Object.keys(originalStyles).forEach(key => {
        g702Element.style[key] = originalStyles[key];
      });

      const g702ImgData = g702Canvas.toDataURL('image/png');
      
      // Calculate optimal scaling for landscape with better fitting and margin buffer
      const imgWidthMm = g702Canvas.width * 0.264583;
      const imgHeightMm = g702Canvas.height * 0.264583;
      
      const scaleX = availableWidth / imgWidthMm;
      const scaleY = availableHeight / imgHeightMm;
      const scale = Math.min(scaleX, scaleY, 0.95);
      
      const scaledWidth = imgWidthMm * scale;
      const scaledHeight = imgHeightMm * scale;
      
      const imgX = (pdfWidth - scaledWidth) / 2;
      const imgY = (pdfHeight - scaledHeight) / 2;
      
      pdf.addImage(g702ImgData, 'PNG', imgX, imgY, scaledWidth, scaledHeight);
    }

    // Add new page for G703
    pdf.addPage();

    // Export G703
    const g703Element = document.getElementById('g703-document');
    if (g703Element) {
      // Store original styles safely
      const originalG703ClassName = g703Element.className;
      const originalStyles = {
        position: g703Element.style.position,
        left: g703Element.style.left,
        top: g703Element.style.top,
        display: g703Element.style.display,
        visibility: g703Element.style.visibility,
        width: g703Element.style.width,
        transform: g703Element.style.transform,
        transformOrigin: g703Element.style.transformOrigin
      };
      
      // Temporarily make visible and optimize for landscape export
      g703Element.className = g703Element.className.replace('sr-only', '');
      g703Element.style.position = 'static';
      g703Element.style.left = 'auto';
      g703Element.style.top = 'auto';
      g703Element.style.display = 'block';
      g703Element.style.visibility = 'visible';
      g703Element.style.width = '11in';
      g703Element.style.transform = 'scale(0.9)';
      g703Element.style.transformOrigin = 'top left';
      
      console.log('G703 element dimensions:', g703Element.scrollWidth, g703Element.scrollHeight);

      const g703Canvas = await html2canvas(g703Element, {
        scale: 1.8,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: g703Element.scrollWidth,
        height: g703Element.scrollHeight,
        windowWidth: 1600,
        windowHeight: 1200
      });

      // Restore original styles safely
      g703Element.className = originalG703ClassName;
      Object.keys(originalStyles).forEach(key => {
        g703Element.style[key] = originalStyles[key];
      });

      const g703ImgData = g703Canvas.toDataURL('image/png');
      
      // Calculate optimal scaling for landscape with better fitting and margin buffer
      const imgWidthMm = g703Canvas.width * 0.264583;
      const imgHeightMm = g703Canvas.height * 0.264583;
      
      const scaleX = availableWidth / imgWidthMm;
      const scaleY = availableHeight / imgHeightMm;
      const scale = Math.min(scaleX, scaleY, 0.95);
      
      const scaledWidth = imgWidthMm * scale;
      const scaledHeight = imgHeightMm * scale;
      
      const imgX = (pdfWidth - scaledWidth) / 2;
      const imgY = (pdfHeight - scaledHeight) / 2;
      
      pdf.addImage(g703ImgData, 'PNG', imgX, imgY, scaledWidth, scaledHeight);
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

export const generateBidReport = async (data: any) => {
  const pdf = new jsPDF();
  
  // Header with company info
  pdf.setFontSize(20);
  pdf.text(data.companyName, 20, 30);
  
  if (data.companyAddress) {
    pdf.setFontSize(10);
    pdf.text(data.companyAddress, 20, 40);
  }
  
  if (data.companyPhone || data.companyEmail) {
    pdf.setFontSize(10);
    const contactInfo = [data.companyPhone, data.companyEmail].filter(Boolean).join(' | ');
    pdf.text(contactInfo, 20, 48);
  }
  
  // Title
  pdf.setFontSize(16);
  pdf.text('BID ESTIMATE', 20, 65);
  
  // Project information
  pdf.setFontSize(12);
  pdf.text(`Project: ${data.projectName}`, 20, 80);
  pdf.text(`Client: ${data.client}`, 20, 90);
  pdf.text(`Date: ${data.date}`, 20, 100);
  
  // Line separator
  pdf.line(20, 110, 190, 110);
  
  let yPosition = 125;
  
  // Group by category
  const categorizedItems = data.bidItems.reduce((acc: any, item: any) => {
    const category = item.category || 'Uncategorized';
    if (!acc[category]) acc[category] = [];
    acc[category].push(item);
    return acc;
  }, {});
  
  Object.entries(categorizedItems).forEach(([category, items]: [string, any]) => {
    // Category header
    pdf.setFontSize(14);
    pdf.setFont('helvetica', 'bold');
    pdf.text(category, 20, yPosition);
    yPosition += 10;
    
    // Category total
    const categoryTotal = (items as any[]).reduce((sum, item) => sum + (Number(item.total) || 0), 0);
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Category Total: $${categoryTotal.toLocaleString()}`, 150, yPosition - 5);
    
    // Items
    pdf.setFontSize(9);
    (items as any[]).forEach((item) => {
      const line = `• ${item.description} - ${item.quantity} ${item.unit} × $${Number(item.unit_cost || 0).toLocaleString()} = $${Number(item.total || 0).toLocaleString()}`;
      
      // Handle text wrapping
      const splitText = pdf.splitTextToSize(line, 160);
      pdf.text(splitText, 25, yPosition);
      yPosition += splitText.length * 5;
      
      if (yPosition > 270) {
        pdf.addPage();
        yPosition = 20;
      }
    });
    
    yPosition += 8;
  });
  
  // Summary section
  if (yPosition > 230) {
    pdf.addPage();
    yPosition = 20;
  }
  
  pdf.line(20, yPosition, 190, yPosition);
  yPosition += 15;
  
  pdf.setFontSize(16);
  pdf.setFont('helvetica', 'bold');
  pdf.text('BID SUMMARY', 20, yPosition);
  yPosition += 15;
  
  pdf.setFontSize(12);
  pdf.setFont('helvetica', 'normal');
  
  const subtotal = data.totalAmount;
  const profitMargin = subtotal * 0.15; // 15%
  const overhead = subtotal * 0.10; // 10%
  const total = subtotal + profitMargin + overhead;
  
  pdf.text(`Subtotal (Direct Costs): $${subtotal.toLocaleString()}`, 20, yPosition);
  yPosition += 8;
  pdf.text(`Overhead (10%): $${overhead.toLocaleString()}`, 20, yPosition);
  yPosition += 8;
  pdf.text(`Profit Margin (15%): $${profitMargin.toLocaleString()}`, 20, yPosition);
  yPosition += 12;
  
  // Total line
  pdf.line(20, yPosition - 2, 100, yPosition - 2);
  pdf.setFont('helvetica', 'bold');
  pdf.text(`TOTAL BID AMOUNT: $${total.toLocaleString()}`, 20, yPosition + 5);
  
  // Footer
  const pageCount = pdf.internal.pages.length - 1;
  for (let i = 1; i <= pageCount; i++) {
    pdf.setPage(i);
    pdf.setFontSize(8);
    pdf.setFont('helvetica', 'normal');
    pdf.text(`Page ${i} of ${pageCount}`, 180, 285);
    pdf.text(`Generated on ${data.date}`, 20, 285);
  }
  
  const filename = `bid-estimate-${data.projectName.replace(/\s+/g, '-').toLowerCase()}.pdf`;
  pdf.save(filename);
};
