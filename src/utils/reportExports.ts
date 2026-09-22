
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

export interface ExportData {
  title: string;
  data: any[];
  charts?: any[];
  metadata?: {
    dateRange?: string;
    filters?: any;
    generatedBy?: string;
    generatedAt?: string;
  };
}

export const exportToExcel = (exportData: ExportData) => {
  const workbook = XLSX.utils.book_new();
  
  // Add metadata sheet
  if (exportData.metadata) {
    const metadataWS = XLSX.utils.json_to_sheet([exportData.metadata]);
    XLSX.utils.book_append_sheet(workbook, metadataWS, 'Report Info');
  }
  
  // Add data sheet
  const dataWS = XLSX.utils.json_to_sheet(exportData.data);
  XLSX.utils.book_append_sheet(workbook, dataWS, 'Data');
  
  // Generate filename with timestamp
  const timestamp = localDateISO();
  const filename = `${exportData.title.replace(/\s+/g, '_')}_${timestamp}.xlsx`;
  
  XLSX.writeFile(workbook, filename);
};

export const exportToPDF = async (exportData: ExportData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const margin = 20;
  let yPosition = margin;
  
  // Title
  doc.setFontSize(14);
  doc.text(exportData.title, margin, yPosition);
  yPosition += 10;
  
  // Metadata
  if (exportData.metadata) {
    doc.setFontSize(10);
    doc.text(`Generated: ${exportData.metadata.generatedAt || new Date().toLocaleString()}`, margin, yPosition);
    yPosition += 8;
    if (exportData.metadata.dateRange) {
      doc.text(`Date Range: ${exportData.metadata.dateRange}`, margin, yPosition);
      yPosition += 8;
    }
    yPosition += 10;
  }
  
  // Data table
  if (exportData.data && exportData.data.length > 0) {
    const headers = Object.keys(exportData.data[0]);
    const cellWidth = (pageWidth - 2 * margin) / headers.length;
    
    // Headers
    doc.setFontSize(10);
    headers.forEach((header, index) => {
      doc.text(header, margin + index * cellWidth, yPosition);
    });
    yPosition += 8;
    
    // Data rows (limit to prevent overflow)
    const maxRows = Math.min(exportData.data.length, 30);
    for (let i = 0; i < maxRows; i++) {
      const row = exportData.data[i];
      headers.forEach((header, index) => {
        const value = row[header]?.toString() || '';
        doc.text(value.substring(0, 15), margin + index * cellWidth, yPosition);
      });
      yPosition += 6;
      
      // Add new page if needed
      if (yPosition > doc.internal.pageSize.height - margin) {
        doc.addPage();
        yPosition = margin;
      }
    }
  }
  
  // Save PDF
  const timestamp = localDateISO();
  const filename = `${exportData.title.replace(/\s+/g, '_')}_${timestamp}.pdf`;
  doc.save(filename);
};

export const exportToCSV = (exportData: ExportData) => {
  if (!exportData.data || exportData.data.length === 0) return;
  
  const headers = Object.keys(exportData.data[0]);
  const csvContent = [
    headers.join(','),
    ...exportData.data.map(row => 
      headers.map(header => {
        const value = row[header]?.toString() || '';
        return value.includes(',') ? `"${value}"` : value;
      }).join(',')
    )
  ].join('\n');
  
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  
  const timestamp = localDateISO();
  const filename = `${exportData.title.replace(/\s+/g, '_')}_${timestamp}.csv`;
  link.setAttribute('download', filename);
  
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
