
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const exportG702G703ToPDF = async (filename: string = 'G702-G703.pdf') => {
  try {
    console.log('Starting PDF export...');
    
    // Wait for any rendering to complete
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

    // Create PDF with portrait orientation for better fitting
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'in',
      format: 'letter'
    });

    // Enhanced canvas options for better quality
    const canvasOptions = {
      scale: 2,
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

    // Capture G702
    console.log('Capturing G702...');
    const g702Canvas = await html2canvas(g702Element, canvasOptions);

    // Add G702 to PDF - Full page width
    const g702ImgData = g702Canvas.toDataURL('image/png', 1.0);
    const pageWidth = 8.5;
    const pageHeight = 11;
    const imgWidth = pageWidth - 0.5;
    const imgHeight = (g702Canvas.height * imgWidth) / g702Canvas.width;
    
    if (imgHeight <= pageHeight - 0.5) {
      pdf.addImage(g702ImgData, 'PNG', 0.25, 0.25, imgWidth, imgHeight);
    } else {
      // Image is too tall, scale it down to fit
      const scaledHeight = pageHeight - 0.5;
      const scaledWidth = (g702Canvas.width * scaledHeight) / g702Canvas.height;
      pdf.addImage(g702ImgData, 'PNG', 0.25, 0.25, scaledWidth, scaledHeight);
    }

    // Add new page for G703
    pdf.addPage();

    // Capture G703
    console.log('Capturing G703...');
    const g703Canvas = await html2canvas(g703Element, canvasOptions);

    const g703ImgData = g703Canvas.toDataURL('image/png', 1.0);
    const g703ImgWidth = pageWidth - 0.5;
    const g703ImgHeight = (g703Canvas.height * g703ImgWidth) / g703Canvas.width;
    
    // Handle multi-page G703 if needed
    if (g703ImgHeight > pageHeight - 0.5) {
      const pagesNeeded = Math.ceil(g703ImgHeight / (pageHeight - 0.5));
      const sectionHeight = g703Canvas.height / pagesNeeded;
      
      for (let i = 0; i < pagesNeeded; i++) {
        if (i > 0) pdf.addPage();
        
        // Create a section canvas
        const sectionCanvas = document.createElement('canvas');
        const sectionCtx = sectionCanvas.getContext('2d');
        sectionCanvas.width = g703Canvas.width;
        sectionCanvas.height = sectionHeight;
        
        if (sectionCtx) {
          sectionCtx.drawImage(g703Canvas, 0, -i * sectionHeight);
          const sectionImgData = sectionCanvas.toDataURL('image/png', 1.0);
          const sectionDisplayHeight = (pageHeight - 0.5);
          pdf.addImage(sectionImgData, 'PNG', 0.25, 0.25, g703ImgWidth, sectionDisplayHeight);
        }
      }
    } else {
      pdf.addImage(g703ImgData, 'PNG', 0.25, 0.25, g703ImgWidth, g703ImgHeight);
    }

    // Save the PDF
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
    
    // Wait for rendering to complete
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const element = document.getElementById(elementId);
    console.log(`Element ${elementId} found:`, !!element);
    
    if (!element) {
      console.error(`Element with ID '${elementId}' not found`);
      console.log('Available elements with IDs:', Array.from(document.querySelectorAll('[id]')).map(el => el.id));
      throw new Error(`Element with ID '${elementId}' not found`);
    }

    console.log('Capturing element...');
    const canvas = await html2canvas(element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: element.scrollWidth,
      height: element.scrollHeight,
      logging: false,
      removeContainer: true,
      foreignObjectRendering: false,
      ignoreElements: (element) => {
        return element.classList.contains('print:hidden') ||
               element.tagName === 'BUTTON' ||
               element.classList.contains('no-print');
      }
    });

    // Create PDF with proper sizing for full page width
    const pdf = new jsPDF({
      orientation: canvas.width > canvas.height ? 'landscape' : 'portrait',
      unit: 'in',
      format: 'letter'
    });

    const imgData = canvas.toDataURL('image/png', 1.0);
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const imgWidth = pageWidth - 0.5; // Leave margin
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Handle multi-page if content is too tall
    if (imgHeight > pageHeight - 0.5) {
      const pagesNeeded = Math.ceil(imgHeight / (pageHeight - 0.5));
      const sectionHeight = canvas.height / pagesNeeded;
      
      for (let i = 0; i < pagesNeeded; i++) {
        if (i > 0) pdf.addPage();
        
        const sectionCanvas = document.createElement('canvas');
        const sectionCtx = sectionCanvas.getContext('2d');
        sectionCanvas.width = canvas.width;
        sectionCanvas.height = sectionHeight;
        
        if (sectionCtx) {
          sectionCtx.drawImage(canvas, 0, -i * sectionHeight);
          const sectionImgData = sectionCanvas.toDataURL('image/png', 1.0);
          pdf.addImage(sectionImgData, 'PNG', 0.25, 0.25, imgWidth, pageHeight - 0.5);
        }
      }
    } else {
      pdf.addImage(imgData, 'PNG', 0.25, 0.25, imgWidth, imgHeight);
    }
    
    console.log('Saving PDF...');
    pdf.save(filename);
    
    return true;
  } catch (error) {
    console.error('Error exporting PDF:', error);
    throw new Error(`Failed to export PDF: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

export const exportToCSV = (data: { title: string; data: any[] }) => {
  try {
    if (!data.data || data.data.length === 0) {
      throw new Error('No data to export');
    }

    const headers = Object.keys(data.data[0]);
    const csvContent = [
      headers.join(','),
      ...data.data.map(row => 
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
    link.setAttribute('download', `${data.title.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);
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
    const { DocKit, loadCompany, usd, fmtDate, fileSlug } = await import('./pdfDocKit');
    const company = await loadCompany();
    const items: any[] = exportData.bidItems || [];
    const lineTotal = (i: any) =>
      i.total != null && Number(i.total)
        ? Number(i.total)
        : (Number(i.unit_cost) || 0) * (Number(i.quantity) || 0) * (1 + (Number(i.markup_pct) || 0) / 100);

    // Group by section (category), keeping first-seen order
    const groups = new Map<string, any[]>();
    items.forEach((i) => {
      const key = (i.category || 'General').trim() || 'General';
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(i);
    });
    const subtotal = items.reduce((s, i) => s + lineTotal(i), 0);
    const contingency = Number(exportData.contingencyAmount) || 0;
    const grand = subtotal + contingency;

    const doc = new DocKit(company, 'Bid Report', exportData.projectCode ? `Job ${exportData.projectCode}` : '');
    doc.letterhead([
      { label: 'Date', value: fmtDate(new Date()) },
      { label: 'Line items', value: String(items.length) },
      { label: 'Sections', value: String(groups.size) },
      { label: 'Bid total', value: usd(grand, false) },
    ]);
    doc.infoBoxes([
      { title: 'Project', lines: [exportData.projectName || 'Project', exportData.projectAddress] },
      { title: 'Client', lines: [exportData.client && exportData.client !== 'N/A' ? exportData.client : 'Not specified'] },
    ]);

    doc.heading('Summary by section');
    const names = Array.from(groups.keys());
    doc.table(
      [
        { header: 'Section', width: 52 },
        { header: 'Lines', width: 12, align: 'right' },
        { header: 'Share', width: 14, align: 'right' },
        { header: 'Amount', width: 22, align: 'right' },
      ],
      names.map((n) => {
        const amt = groups.get(n)!.reduce((s, i) => s + lineTotal(i), 0);
        return [n, String(groups.get(n)!.length), subtotal ? `${((amt / subtotal) * 100).toFixed(1)}%` : '—', { text: usd(amt), bold: true }];
      })
    );

    doc.heading('Bid detail');
    const rows: any[] = [];
    const sectionRows = new Set<number>();
    const subtotalRows = new Set<number>();
    names.forEach((n) => {
      sectionRows.add(rows.length);
      rows.push([n]);
      const list = groups.get(n)!;
      list.forEach((i) => {
        rows.push([
          [i.description || '—', i.subcategory ? `(${i.subcategory})` : ''].filter(Boolean).join(' '),
          (Number(i.quantity) || 0).toLocaleString('en-US', { maximumFractionDigits: 3 }),
          i.unit || 'ea',
          usd(Number(i.unit_cost) || 0),
          Number(i.markup_pct) ? `${Number(i.markup_pct)}%` : '—',
          { text: usd(lineTotal(i)) },
        ]);
      });
      subtotalRows.add(rows.length);
      rows.push([`${n} subtotal`, '', '', '', '', usd(list.reduce((s, i) => s + lineTotal(i), 0))]);
    });
    doc.table(
      [
        { header: 'Description', width: 46 },
        { header: 'Qty', width: 10, align: 'right' },
        { header: 'Unit', width: 9, align: 'center' },
        { header: 'Unit cost', width: 14, align: 'right' },
        { header: 'Markup', width: 9, align: 'right' },
        { header: 'Amount', width: 16, align: 'right' },
      ],
      rows,
      { sectionRows, subtotalRows }
    );

    const lines = [{ label: 'Subtotal', value: usd(subtotal) }];
    if (contingency) lines.push({ label: 'Contingency', value: usd(contingency) });
    lines.push({ label: 'Bid total', value: usd(grand) });
    doc.totals(lines);

    doc.save(`bid-report-${fileSlug(exportData.projectName)}-${new Date().toISOString().split('T')[0]}.pdf`);
    return true;
  } catch (error) {
    console.error('Error generating bid report:', error);
    throw new Error(`Failed to generate bid report: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};
