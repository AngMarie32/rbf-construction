
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export const exportG702G703ToPDF = async (filename: string = 'G702-G703.pdf') => {
  try {
    const g702Element = document.getElementById('g702-document');
    const g703Element = document.getElementById('g703-document');
    
    if (!g702Element || !g703Element) {
      throw new Error('G702 or G703 document not found');
    }

    // Create PDF with letter size (8.5 x 11 inches)
    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'in',
      format: 'letter'
    });

    // Capture G702 with higher resolution
    const g702Canvas = await html2canvas(g702Element, {
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: g702Element.scrollWidth,
      height: g702Element.scrollHeight
    });

    // Add G702 to PDF - fit to page width with proper scaling
    const g702ImgData = g702Canvas.toDataURL('image/png');
    const pageWidth = 8.5;
    const pageHeight = 11;
    const imgWidth = pageWidth - 0.5; // 0.25 inch margins on each side
    const imgHeight = (g702Canvas.height * imgWidth) / g702Canvas.width;
    
    // If image is taller than page, scale it down
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
      scale: 2,
      useCORS: true,
      allowTaint: true,
      backgroundColor: '#ffffff',
      width: g703Element.scrollWidth,
      height: g703Element.scrollHeight
    });

    const g703ImgData = g703Canvas.toDataURL('image/png');
    const g703ImgWidth = pageWidth - 0.5;
    const g703ImgHeight = (g703Canvas.height * g703ImgWidth) / g703Canvas.width;
    
    // If image is taller than page, scale it down
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
