
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const exportG702G703ToPDF = async (filename: string = 'G702-G703.pdf') => {
  try {
    console.log('Starting PDF export...');
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const g702Element = document.getElementById('g702-document');
    const g703Element = document.getElementById('g703-document');
    
    console.log('G702 Element found:', !!g702Element);
    console.log('G703 Element found:', !!g703Element);
    
    if (!g702Element || !g703Element) {
      console.error('Required elements not found for PDF export');
      console.log('Available elements:', document.querySelectorAll('[id*="g70"]'));
      throw new Error('PDF export failed: Required documents not found. Please ensure you are viewing the correct tab.');
    }

    console.log('Found documents, creating PDF...');

    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'in',
      format: 'letter'
    });

    const canvasOptions = {
      scale: 3,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      logging: false,
      removeContainer: true,
      foreignObjectRendering: false,
      ignoreElements: (element: Element) => {
        return element.classList.contains('print:hidden') || 
               element.tagName === 'BUTTON' ||
               element.classList.contains('no-print');
      }
    };

    console.log('Capturing G702...');
    const g702Canvas = await html2canvas(g702Element, canvasOptions);

    const g702ImgData = g702Canvas.toDataURL('image/png', 1.0);
    const pageWidth = 11;
    const pageHeight = 8.5;
    const imgWidth = pageWidth - 0.5;
    const imgHeight = (g702Canvas.height * imgWidth) / g702Canvas.width;
    
    let finalWidth = imgWidth;
    let finalHeight = imgHeight;
    if (imgHeight > pageHeight - 0.5) {
      finalHeight = pageHeight - 0.5;
      finalWidth = (g702Canvas.width * finalHeight) / g702Canvas.height;
    }
    
    pdf.addImage(g702ImgData, 'PNG', 0.25, 0.25, finalWidth, finalHeight);

    pdf.addPage();

    console.log('Capturing G703...');
    const g703Canvas = await html2canvas(g703Element, canvasOptions);

    const g703ImgData = g703Canvas.toDataURL('image/png', 1.0);
    const g703ImgWidth = pageWidth - 0.5;
    const g703ImgHeight = (g703Canvas.height * g703ImgWidth) / g703Canvas.width;
    
    let g703FinalWidth = g703ImgWidth;
    let g703FinalHeight = g703ImgHeight;
    if (g703ImgHeight > pageHeight - 0.5) {
      g703FinalHeight = pageHeight - 0.5;
      g703FinalWidth = (g703Canvas.width * g703FinalHeight) / g703Canvas.height;
    }
    
    pdf.addImage(g703ImgData, 'PNG', 0.25, 0.25, g703FinalWidth, g703FinalHeight);

    console.log('Saving PDF...');
    pdf.save(filename);
    
    console.log('PDF exported successfully');
    return true;
  } catch (error) {
    console.error('Error exporting PDF:', error);
    throw new Error(`Failed to export PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const exportToPDF = async (elementId: string, filename: string) => {
  try {
    console.log(`Exporting element ${elementId} to PDF...`);
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const element = document.getElementById(elementId);
    console.log(`Element ${elementId} found:`, !!element);
    
    if (!element) {
      console.error(`Element with ID '${elementId}' not found`);
      console.log('Available elements with IDs:', Array.from(document.querySelectorAll('[id]')).map(el => el.id));
      throw new Error(`Element with ID '${elementId}' not found`);
    }

    console.log('Capturing element...');
    
    // Special handling for G703 documents to make them full page width
    const isG703 = elementId.includes('g703');
    const canvasOptions = {
      scale: isG703 ? 2 : 3,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: element.scrollWidth,
      height: element.scrollHeight,
      logging: false,
      removeContainer: true,
      foreignObjectRendering: false,
      ignoreElements: (element: Element) => {
        return element.classList.contains('print:hidden') ||
               element.tagName === 'BUTTON' ||
               element.classList.contains('no-print') ||
               element.textContent?.includes('G703 Display Options') ||
               element.textContent?.includes('Breakdown Level') ||
               element.textContent?.includes('Report generated on');
      }
    };

    const canvas = await html2canvas(element, canvasOptions);

    const pdf = new jsPDF({
      orientation: isG703 ? 'landscape' : 'landscape',
      unit: 'in',
      format: 'letter'
    });

    const imgData = canvas.toDataURL('image/png', 1.0);
    const pageWidth = isG703 ? 11 : 11;
    const pageHeight = isG703 ? 8.5 : 8.5;
    
    // For G703, make it full width and allow multiple pages if needed
    if (isG703) {
      const imgWidth = pageWidth - 0.5;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      if (imgHeight <= pageHeight - 0.5) {
        // Fits on one page
        pdf.addImage(imgData, 'PNG', 0.25, 0.25, imgWidth, imgHeight);
      } else {
        // Split across multiple pages
        const ratio = canvas.width / canvas.height;
        const pageImgHeight = pageHeight - 0.5;
        const pageImgWidth = pageImgHeight * ratio;
        
        let remainingHeight = imgHeight;
        let currentY = 0;
        let pageCount = 0;
        
        while (remainingHeight > 0) {
          const heightForThisPage = Math.min(pageImgHeight, remainingHeight);
          
          if (pageCount > 0) {
            pdf.addPage();
          }
          
          pdf.addImage(
            imgData, 
            'PNG', 
            0.25, 
            0.25, 
            imgWidth, 
            heightForThisPage,
            undefined,
            'FAST',
            0,
            -currentY * (canvas.height / imgHeight)
          );
          
          remainingHeight -= heightForThisPage;
          currentY += heightForThisPage;
          pageCount++;
        }
      }
    } else {
      // Standard single page handling for other documents
      const imgWidth = pageWidth - 0.5;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      let finalWidth = imgWidth;
      let finalHeight = imgHeight;
      if (imgHeight > pageHeight - 0.5) {
        finalHeight = pageHeight - 0.5;
        finalWidth = (canvas.width * finalHeight) / canvas.height;
      }
      
      pdf.addImage(imgData, 'PNG', 0.25, 0.25, finalWidth, finalHeight);
    }
    
    console.log('Saving PDF...');
    pdf.save(filename);
    
    return true;
  } catch (error) {
    console.error('Error exporting PDF:', error);
    throw new Error(`Failed to export PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    
    return true;
  } catch (error) {
    console.error('Error exporting CSV:', error);
    throw new Error(`Failed to export CSV: ${error instanceof Error ? error.message : 'Unknown error'}`);
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
    `;

    document.body.appendChild(reportElement);
    
    await exportToPDF('bid-report', `Bid-Report-${exportData.projectName?.replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`);
    
    document.body.removeChild(reportElement);
    
    return true;
  } catch (error) {
    console.error('Error generating bid report:', error);
    throw new Error(`Failed to generate bid report: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
