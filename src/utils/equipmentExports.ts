import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';
import type { Equipment } from '@/types/equipment';
import type { EquipmentFilters } from '@/types/equipment';

interface ExportOptions {
  equipment: Equipment[];
  filters: EquipmentFilters;
  title?: string;
}

const formatCurrency = (value: number | undefined | null): string => {
  if (value === undefined || value === null) return '-';
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
};

const formatDate = (date: string | undefined | null): string => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString();
};

const getActiveFiltersDescription = (filters: EquipmentFilters): string => {
  const parts: string[] = [];
  if (filters.search) parts.push(`Search: "${filters.search}"`);
  if (filters.status && filters.status !== 'all') parts.push(`Status: ${filters.status}`);
  if (filters.category && filters.category !== 'all') parts.push(`Category: ${filters.category}`);
  if (filters.location && filters.location !== 'all') parts.push(`Location: ${filters.location}`);
  if (filters.availableOnly) parts.push('Available Only');
  return parts.length > 0 ? parts.join(' | ') : 'No filters applied';
};

export const exportEquipmentToPDF = ({ equipment, filters, title = 'Equipment Report' }: ExportOptions) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const margin = 15;
  let yPosition = margin;

  // Title
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text(title, margin, yPosition);
  yPosition += 10;

  // Generated date and filters
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Generated: ${new Date().toLocaleString()}`, margin, yPosition);
  yPosition += 6;
  doc.text(`Filters: ${getActiveFiltersDescription(filters)}`, margin, yPosition);
  yPosition += 6;
  doc.text(`Total Equipment: ${equipment.length}`, margin, yPosition);
  yPosition += 12;

  // Summary statistics
  const totalValue = equipment.reduce((sum, eq) => sum + (eq.value || 0), 0);
  const availableCount = equipment.filter(eq => eq.status === 'Available').length;
  const inUseCount = equipment.filter(eq => eq.status === 'In Use').length;
  const maintenanceCount = equipment.filter(eq => eq.status === 'Maintenance').length;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('Summary', margin, yPosition);
  yPosition += 7;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Total Value: ${formatCurrency(totalValue)}`, margin, yPosition);
  yPosition += 5;
  doc.text(`Available: ${availableCount} | In Use: ${inUseCount} | Maintenance: ${maintenanceCount}`, margin, yPosition);
  yPosition += 12;

  // Table headers
  const headers = ['Name', 'Category', 'Status', 'VIN/Serial', 'Year', 'Value', 'Rate/Hr'];
  const colWidths = [40, 25, 22, 35, 18, 22, 18];
  
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, yPosition - 4, pageWidth - 2 * margin, 8, 'F');
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  let xPosition = margin;
  headers.forEach((header, index) => {
    doc.text(header, xPosition, yPosition);
    xPosition += colWidths[index];
  });
  yPosition += 8;

  // Table rows
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);

  equipment.forEach((eq, index) => {
    // Check if we need a new page
    if (yPosition > doc.internal.pageSize.height - 20) {
      doc.addPage();
      yPosition = margin;
    }

    // Alternate row background
    if (index % 2 === 0) {
      doc.setFillColor(250, 250, 250);
      doc.rect(margin, yPosition - 4, pageWidth - 2 * margin, 7, 'F');
    }

    xPosition = margin;
    const rowData = [
      eq.name.substring(0, 20),
      eq.category || '-',
      eq.status,
      eq.vin_serial_number?.substring(0, 17) || '-',
      eq.year?.toString() || '-',
      formatCurrency(eq.value).replace('$', ''),
      `$${eq.hourly_rate}`
    ];

    rowData.forEach((cell, colIndex) => {
      doc.text(cell, xPosition, yPosition);
      xPosition += colWidths[colIndex];
    });

    yPosition += 7;
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.text(
      `Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.height - 10,
      { align: 'center' }
    );
  }

  const timestamp = new Date().toISOString().slice(0, 10);
  doc.save(`Equipment_Report_${timestamp}.pdf`);
};

export const exportEquipmentToExcel = ({ equipment, filters, title = 'Equipment Report' }: ExportOptions) => {
  // Summary sheet data
  const totalValue = equipment.reduce((sum, eq) => sum + (eq.value || 0), 0);
  const availableCount = equipment.filter(eq => eq.status === 'Available').length;
  const inUseCount = equipment.filter(eq => eq.status === 'In Use').length;
  const maintenanceCount = equipment.filter(eq => eq.status === 'Maintenance').length;

  const summaryData = [
    ['Equipment Report'],
    ['Generated', new Date().toLocaleString()],
    ['Filters Applied', getActiveFiltersDescription(filters)],
    [''],
    ['Summary Statistics'],
    ['Total Equipment', equipment.length],
    ['Total Value', totalValue],
    ['Available', availableCount],
    ['In Use', inUseCount],
    ['Maintenance', maintenanceCount]
  ];

  // Equipment data
  const equipmentData = equipment.map(eq => ({
    'Name': eq.name,
    'Category': eq.category || '',
    'Status': eq.status,
    'VIN/Serial Number': eq.vin_serial_number || '',
    'Year': eq.year || '',
    'Purchase Date': eq.purchase_date ? formatDate(eq.purchase_date) : '',
    'Value ($)': eq.value || '',
    'Hourly Rate ($)': eq.hourly_rate,
    'Location': eq.location || '',
    'Total Hours Used': eq.total_hours_used || '',
    'Last Inspection': eq.last_inspection_date ? formatDate(eq.last_inspection_date) : '',
    'Insurance Expiry': eq.insurance_expiry ? formatDate(eq.insurance_expiry) : '',
    'Description': eq.description || ''
  }));

  const workbook = XLSX.utils.book_new();
  
  // Add summary sheet
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

  // Add equipment sheet
  const equipmentSheet = XLSX.utils.json_to_sheet(equipmentData);
  
  // Set column widths
  equipmentSheet['!cols'] = [
    { wch: 25 }, // Name
    { wch: 15 }, // Category
    { wch: 12 }, // Status
    { wch: 20 }, // VIN/Serial
    { wch: 8 },  // Year
    { wch: 12 }, // Purchase Date
    { wch: 12 }, // Value
    { wch: 12 }, // Hourly Rate
    { wch: 15 }, // Location
    { wch: 12 }, // Hours Used
    { wch: 12 }, // Last Inspection
    { wch: 12 }, // Insurance Expiry
    { wch: 30 }  // Description
  ];
  
  XLSX.utils.book_append_sheet(workbook, equipmentSheet, 'Equipment');

  const timestamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `Equipment_Report_${timestamp}.xlsx`);
};
