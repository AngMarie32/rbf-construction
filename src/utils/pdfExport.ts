
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const exportG702G703ToPDF = async (filename: string = 'G702-G703.pdf') => {
  try {
    const g702Element = document.getElementById('g702-document');
    const g703Element = document.getElementById('g703-document');
    
    if (!g702Element || !g703Element) {
      throw new Error('G702 or G703 document not found');
    }

    // Create PDF with landscape orientation for better formatting
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'in',
      format: 'letter'
    });

    // Capture G702 with higher resolution and better scaling
    const g702Canvas = await html2canvas(g702Element, {
      scale: 3,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: g702Element.scrollWidth,
      height: g702Element.scrollHeight
    });

    // Add G702 to PDF - landscape dimensions (11 x 8.5)
    const g702ImgData = g702Canvas.toDataURL('image/png');
    const pageWidth = 11;
    const pageHeight = 8.5;
    const imgWidth = pageWidth - 0.5; // 0.25 inch margins on each side
    const imgHeight = (g702Canvas.height * imgWidth) / g702Canvas.width;
    
    // Scale to fit landscape page
    let finalWidth = imgWidth;
    let finalHeight = imgHeight;
    if (imgHeight > pageHeight - 0.5) {
      finalHeight = pageHeight - 0.5;
      finalWidth = (g702Canvas.width * finalHeight) / g702Canvas.height;
    }
    
    pdf.addImage(g702ImgData, 'PNG', 0.25, 0.25, finalWidth, finalHeight);

    // Add new page for G703
    pdf.addPage();

    // Capture G703 with higher resolution
    const g703Canvas = await html2canvas(g703Element, {
      scale: 3,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: g703Element.scrollWidth,
      height: g703Element.scrollHeight
    });

    const g703ImgData = g703Canvas.toDataURL('image/png');
    const g703ImgWidth = pageWidth - 0.5;
    const g703ImgHeight = (g703Canvas.height * g703ImgWidth) / g703Canvas.width;
    
    // Scale to fit landscape page
    let g703FinalWidth = g703ImgWidth;
    let g703FinalHeight = g703ImgHeight;
    if (g703ImgHeight > pageHeight - 0.5) {
      g703FinalHeight = pageHeight - 0.5;
      g703FinalWidth = (g703Canvas.width * g703FinalHeight) / g703Canvas.height;
    }
    
    pdf.addImage(g703ImgData, 'PNG', 0.25, 0.25, g703FinalWidth, g703FinalHeight);

    // Save the PDF
    pdf.save(filename);
  } catch (error) {
    console.error('Error exporting PDF:', error);
    throw error;
  }
};

export const exportToPDF = async (elementId: string, filename: string) => {
  try {
    const element = document.getElementById(elementId);
    if (!element) {
      throw new Error(`Element with ID '${elementId}' not found`);
    }

    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: element.scrollWidth,
      height: element.scrollHeight
    });

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'in',
      format: 'letter'
    });

    const imgData = canvas.toDataURL('image/png');
    const pageWidth = 8.5;
    const pageHeight = 11;
    const imgWidth = pageWidth - 0.5;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    let finalWidth = imgWidth;
    let finalHeight = imgHeight;
    if (imgHeight > pageHeight - 0.5) {
      finalHeight = pageHeight - 0.5;
      finalWidth = (canvas.width * finalHeight) / canvas.height;
    }
    
    pdf.addImage(imgData, 'PNG', 0.25, 0.25, finalWidth, finalHeight);
    pdf.save(filename);
  } catch (error) {
    console.error('Error exporting PDF:', error);
    throw error;
  }
};

export const exportCSV = (data: any[], filename: string) => {
  try {
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
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            return `"${value.replace(/"/g, '""')}"`;
          }
          return value;
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
  } catch (error) {
    console.error('Error exporting CSV:', error);
    throw error;
  }
};

export const generateBidReport = async (exportData: any) => {
  try {
    const reportElement = document.createElement('div');
    reportElement.id = 'bid-report';
    reportElement.style.position = 'absolute';
    reportElement.style.left = '-9999px';
    reportElement.style.background = 'white';
    reportElement.style.padding = '60px';
    reportElement.style.width = '800px';
    reportElement.style.fontFamily = 'Arial, sans-serif';
    
    reportElement.innerHTML = `
      <div style="text-align: center; margin-bottom: 40px;">
        <h1 style="font-size: 24px; font-weight: bold; color: #1f2937; margin-bottom: 10px;">BID REPORT</h1>
        <div style="width: 100%; height: 2px; background-color: #3b82f6; margin: 20px 0;"></div>
      </div>

      <div style="margin-bottom: 40px;">
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
          <div>
            <h3 style="font-size: 16px; font-weight: bold; color: #374151; margin-bottom: 15px;">PROJECT INFORMATION</h3>
            <table style="width: 100%; font-size: 12px;">
              <tr><td style="padding: 4px 0; font-weight: bold;">Project Name:</td><td style="padding: 4px 0;">${exportData.projectName}</td></tr>
              <tr><td style="padding: 4px 0; font-weight: bold;">Client:</td><td style="padding: 4px 0;">${exportData.client}</td></tr>
              <tr><td style="padding: 4px 0; font-weight: bold;">Date:</td><td style="padding: 4px 0;">${exportData.date}</td></tr>
            </table>
          </div>
          <div>
            <h3 style="font-size: 16px; font-weight: bold; color: #374151; margin-bottom: 15px;">BID SUMMARY</h3>
            <table style="width: 100%; font-size: 12px;">
              <tr><td style="padding: 4px 0; font-weight: bold;">Total Items:</td><td style="padding: 4px 0; text-align: right;">${exportData.bidItems.length}</td></tr>
              <tr><td style="padding: 4px 0; font-weight: bold;">Total Amount:</td><td style="padding: 4px 0; text-align: right;">$${exportData.totalAmount.toLocaleString()}</td></tr>
            </table>
          </div>
        </div>
      </div>

      <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 10px;">
        <thead>
          <tr style="background-color: #f8fafc;">
            <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-weight: bold;">Category</th>
            <th style="border: 1px solid #d1d5db; padding: 8px; text-align: left; font-weight: bold;">Description</th>
            <th style="border: 1px solid #d1d5db; padding: 8px; text-align: center; font-weight: bold;">Qty</th>
            <th style="border: 1px solid #d1d5db; padding: 8px; text-align: center; font-weight: bold;">Unit</th>
            <th style="border: 1px solid #d1d5db; padding: 8px; text-align: right; font-weight: bold;">Unit Cost</th>
            <th style="border: 1px solid #d1d5db; padding: 8px; text-align: right; font-weight: bold;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${exportData.bidItems.map((item: any) => `
            <tr>
              <td style="border: 1px solid #d1d5db; padding: 6px;">${item.category || 'N/A'}</td>
              <td style="border: 1px solid #d1d5db; padding: 6px;">${item.description || 'N/A'}</td>
              <td style="border: 1px solid #d1d5db; padding: 6px; text-align: center;">${item.quantity || 0}</td>
              <td style="border: 1px solid #d1d5db; padding: 6px; text-align: center;">${item.unit || 'each'}</td>
              <td style="border: 1px solid #d1d5db; padding: 6px; text-align: right;">$${(item.unit_cost || 0).toLocaleString()}</td>
              <td style="border: 1px solid #d1d5db; padding: 6px; text-align: right;">$${((item.unit_cost || 0) * (item.quantity || 0)).toLocaleString()}</td>
            </tr>
          `).join('')}
        </tbody>
        <tfoot>
          <tr style="background-color: #f8fafc; font-weight: bold;">
            <td colspan="5" style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">TOTAL:</td>
            <td style="border: 1px solid #d1d5db; padding: 8px; text-align: right;">$${exportData.totalAmount.toLocaleString()}</td>
          </tr>
        </tfoot>
      </table>

      <div style="margin-top: 50px; text-align: center; color: #6b7280; font-size: 10px;">
        <p>Report generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
      </div>
    `;

    document.body.appendChild(reportElement);
    
    await exportToPDF('bid-report', `Bid-Report-${exportData.projectName?.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`);
    
    document.body.removeChild(reportElement);
  } catch (error) {
    console.error('Error generating bid report:', error);
    throw error;
  }
};
