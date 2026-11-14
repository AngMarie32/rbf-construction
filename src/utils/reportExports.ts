
import { localDateISO } from '@/utils/dates';
import * as XLSX from 'xlsx';

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
  // Company letterhead, every row (no 30-row cap), landscape when there are many columns.
  const { DocKit, loadCompany, fileSlug } = await import('./pdfDocKit');
  const company = await loadCompany();
  const rows = exportData.data || [];
  const headers = rows.length ? Object.keys(rows[0]) : [];
  const landscape = headers.length > 6;
  const doc = new DocKit(company, exportData.title, exportData.metadata?.dateRange || '', landscape ? 'landscape' : 'portrait');
  const meta = [
    { label: 'Printed', value: exportData.metadata?.generatedAt || new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) },
    ...(exportData.metadata?.dateRange ? [{ label: 'Period', value: exportData.metadata.dateRange }] : []),
    { label: 'Rows', value: String(rows.length) },
  ];
  doc.letterhead(meta);

  if (!rows.length) {
    doc.paragraph('No data for this report.');
  } else {
    const isNum = (h: string) => rows.every((r) => r[h] === null || r[h] === undefined || r[h] === '' || typeof r[h] === 'number' || /^-?\$?[\d,]+(\.\d+)?%?$/.test(String(r[h])));
    const money = (h: string) => /amount|total|cost|value|price|billed|paid|budget|spent|revenue|profit|balance/i.test(h);
    const fmt = (h: string, v: any) => {
      if (v === null || v === undefined || v === '') return '—';
      if (typeof v === 'number') return money(h) ? v.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : v.toLocaleString('en-US');
      return String(v);
    };
    // Width by typical content length, so long text columns get more room.
    const widths = headers.map((h) => Math.min(40, Math.max(h.length, ...rows.slice(0, 200).map((r) => fmt(h, r[h]).length)) + 2));
    doc.table(
      headers.map((h, i) => ({ header: h, width: widths[i], align: isNum(h) ? ('right' as const) : undefined })),
      rows.map((r) => headers.map((h) => fmt(h, r[h]))),
      { fontSize: headers.length > 8 ? 7 : 8 }
    );
    const sums = headers.filter((h) => money(h) && rows.every((r) => typeof r[h] === 'number' || r[h] == null));
    if (sums.length)
      doc.totals(sums.map((h) => ({ label: `Total ${h.toLowerCase()}`, value: rows.reduce((s, r) => s + (Number(r[h]) || 0), 0).toLocaleString('en-US', { style: 'currency', currency: 'USD' }) })));
  }
  doc.save(`${fileSlug(exportData.title)}-${localDateISO()}.pdf`);
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
