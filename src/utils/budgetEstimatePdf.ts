import jsPDF from 'jspdf';
import { loadLogoAsDataUrl } from './pdfLogoHelper';

interface BidItem {
  category?: string;
  subcategory?: string;
  description?: string;
  quantity?: number;
  unit?: string;
  unit_cost?: number;
  unitCost?: number;
  total?: number;
}

interface ProjectData {
  name?: string;
  client?: string;
  address?: string;
  project_code?: string;
  contingency_type?: string;
  contingency_value?: number;
}

interface CompanyData {
  company_name?: string;
  company_address?: string;
  company_phone?: string;
  company_email?: string;
  logo_url?: string;
}

type ExportType = 'itemized' | 'category' | 'division';

const MARGIN = 20;
const PAGE_WIDTH = 215.9; // letter width mm
const PAGE_HEIGHT = 279.4; // letter height mm
const CONTENT_WIDTH = PAGE_WIDTH - 2 * MARGIN;

function addPageFooter(pdf: jsPDF, pageNum: number, totalPages: number) {
  pdf.setDrawColor(200, 200, 200);
  pdf.line(MARGIN, PAGE_HEIGHT - 15, PAGE_WIDTH - MARGIN, PAGE_HEIGHT - 15);
  pdf.setFontSize(8);
  pdf.setTextColor(120, 120, 120);
  pdf.setFont('helvetica', 'normal');
  pdf.text(`Page ${pageNum} of ${totalPages}`, PAGE_WIDTH / 2, PAGE_HEIGHT - 10, { align: 'center' });
}

function drawTableRow(
  pdf: jsPDF,
  y: number,
  cols: { text: string; x: number; width: number; align?: 'left' | 'center' | 'right' }[],
  rowHeight: number,
  options?: { bold?: boolean; bg?: string; borderBottom?: boolean }
) {
  if (options?.bg) {
    const rgb = options.bg === '#f8fafc' ? [248, 250, 252] : [243, 244, 246];
    pdf.setFillColor(rgb[0], rgb[1], rgb[2]);
    pdf.rect(MARGIN, y, CONTENT_WIDTH, rowHeight, 'F');
  }

  pdf.setDrawColor(209, 213, 219);
  // Draw cell borders
  cols.forEach((col) => {
    pdf.rect(col.x, y, col.width, rowHeight, 'S');
  });

  pdf.setFont('helvetica', options?.bold ? 'bold' : 'normal');
  pdf.setTextColor(31, 41, 55);

  cols.forEach((col) => {
    const textY = y + rowHeight / 2 + 1.2;
    const padding = 2;
    if (col.align === 'right') {
      pdf.text(col.text, col.x + col.width - padding, textY, { align: 'right' });
    } else if (col.align === 'center') {
      pdf.text(col.text, col.x + col.width / 2, textY, { align: 'center' });
    } else {
      // Clip text if too long
      const maxWidth = col.width - 2 * padding;
      let displayText = col.text;
      while (pdf.getTextWidth(displayText) > maxWidth && displayText.length > 1) {
        displayText = displayText.slice(0, -1);
      }
      if (displayText !== col.text && displayText.length > 2) {
        displayText = displayText.slice(0, -2) + '..';
      }
      pdf.text(displayText, col.x + padding, textY);
    }
  });
}

// Column definitions for itemized table
function getItemizedCols() {
  const totalW = 30;
  const unitW = 22;
  const qtyW = 20;
  const catW = CONTENT_WIDTH - qtyW - unitW - totalW;
  let x = MARGIN;
  const cols = [
    { key: 'category', label: 'Category', width: catW, align: 'left' as const },
    { key: 'qty', label: 'Qty', width: qtyW, align: 'center' as const },
    { key: 'unit', label: 'Unit', width: unitW, align: 'center' as const },
    { key: 'lineTotal', label: 'Total', width: totalW, align: 'right' as const },
  ];
  return cols.map(c => {
    const col = { ...c, x };
    x += c.width;
    return col;
  });
}

function formatCurrency(value: number): string {
  return `$${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

function toNumber(value: unknown): number {
  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : 0;
  }

  if (typeof value === 'string') {
    const normalized = value.replace(/[$,\s]/g, '');
    const parsed = Number.parseFloat(normalized);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  return 0;
}

function getItemUnitCost(item: BidItem): number {
  return toNumber(item.unitCost ?? item.unit_cost ?? 0);
}

function getItemQuantity(item: BidItem): number {
  return toNumber(item.quantity ?? 0);
}

function getItemLineTotal(item: BidItem): number {
  const quantity = getItemQuantity(item);
  const unitCost = getItemUnitCost(item);

  if (quantity > 0 || unitCost > 0) {
    return quantity * unitCost;
  }

  return toNumber(item.total ?? 0);
}

export async function exportBudgetEstimatePDF(
  items: BidItem[],
  projectData: ProjectData | null,
  companyData: CompanyData | null,
  exportType: ExportType = 'itemized',
  selectedCategories: string[] = [],
  terms: string[] = []
) {
  const pdf = new jsPDF('portrait', 'mm', 'letter');
  const filteredItems = selectedCategories.length > 0 && exportType === 'itemized'
    ? items.filter(i => selectedCategories.includes(i.category || ''))
    : items;
  const totalValue = filteredItems.reduce((sum, i) => sum + getItemLineTotal(i), 0);

  // Calculate total pages
  const HEADER_HEIGHT = 80;
  const ROW_HEIGHT = 7;
  const TABLE_HEADER_HEIGHT = 7;
  const FOOTER_SPACE = 20;
  const MINI_HEADER = 18;

  let totalPages = 1;
  if (exportType === 'itemized') {
    const firstPageRows = Math.floor((PAGE_HEIGHT - HEADER_HEIGHT - TABLE_HEADER_HEIGHT - FOOTER_SPACE - 20) / ROW_HEIGHT);
    const remainingRows = Math.max(0, filteredItems.length - firstPageRows + 1);
    const subsequentPageRows = Math.floor((PAGE_HEIGHT - MINI_HEADER - TABLE_HEADER_HEIGHT - FOOTER_SPACE - 10) / ROW_HEIGHT);
    totalPages = remainingRows > 0 ? 1 + Math.ceil(remainingRows / subsequentPageRows) : 1;
  }

  // --- Page 1: Header with Logo ---
  let y = 10;

  // Add logo
  const logoDataUrl = await loadLogoAsDataUrl();
  if (logoDataUrl) {
    const logoWidth = 40;
    const logoHeight = 30;
    const logoX = (PAGE_WIDTH - logoWidth) / 2;
    pdf.addImage(logoDataUrl, 'PNG', logoX, y, logoWidth, logoHeight);
    y += logoHeight + 4;
  } else {
    // Fallback: text company name
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(31, 41, 55);
    pdf.text(companyData?.company_name || 'RBF Construction', PAGE_WIDTH / 2, y + 8, { align: 'center' });
    y += 14;
  }

  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(55, 65, 81);
  pdf.text('BUDGET ESTIMATE', PAGE_WIDTH / 2, y, { align: 'center' });

  y += 3;
  pdf.setDrawColor(59, 130, 246);
  pdf.setLineWidth(0.8);
  pdf.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  pdf.setLineWidth(0.2);

  // Project name banner
  y += 6;
  pdf.setFillColor(243, 244, 246);
  pdf.rect(MARGIN, y, CONTENT_WIDTH, 8, 'F');
  pdf.setFontSize(10);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(55, 65, 81);
  pdf.text(projectData?.name || 'Project Name', MARGIN + 4, y + 5.5);

  // Project info
  y += 14;
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'normal');
  pdf.setTextColor(31, 41, 55);

  const infoLines = [
    { label: 'Project:', value: projectData?.name || 'N/A' },
    { label: 'Client:', value: projectData?.client || 'N/A' },
    { label: 'Address:', value: projectData?.address || 'N/A' },
    { label: 'Date:', value: new Date().toLocaleDateString() },
  ];

  infoLines.forEach(line => {
    pdf.setFont('helvetica', 'bold');
    pdf.text(line.label, MARGIN, y);
    pdf.setFont('helvetica', 'normal');
    pdf.text(line.value, MARGIN + 22, y);
    y += 5;
  });

  y += 4;

  if (exportType === 'itemized') {
    // Section header
    pdf.setFillColor(243, 244, 246);
    pdf.rect(MARGIN, y, CONTENT_WIDTH, 7, 'F');
    pdf.setFontSize(9);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(55, 65, 81);
    pdf.text('ITEMIZED BREAKDOWN', MARGIN + 4, y + 5);
    y += 10;

    const cols = getItemizedCols();
    pdf.setFontSize(8);

    // Table header
    drawTableRow(pdf, y, cols.map(c => ({ text: c.label, x: c.x, width: c.width, align: c.align })), ROW_HEIGHT, { bold: true, bg: '#f8fafc' });
    y += ROW_HEIGHT;

    let currentPage = 1;
    const maxYFirstPage = PAGE_HEIGHT - FOOTER_SPACE - ROW_HEIGHT;

    filteredItems.forEach((item, idx) => {
      if (y + ROW_HEIGHT > maxYFirstPage) {
        // Footer on current page
        addPageFooter(pdf, currentPage, totalPages);
        pdf.addPage();
        currentPage++;
        y = 10;

        // Mini header
        pdf.setFontSize(9);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(31, 41, 55);
        pdf.text(companyData?.company_name || '', PAGE_WIDTH / 2 - 20, y + 4);
        pdf.setFont('helvetica', 'normal');
        pdf.setTextColor(55, 65, 81);
        pdf.text('BUDGET ESTIMATE', PAGE_WIDTH / 2 + 20, y + 4);
        y += 6;
        pdf.setDrawColor(59, 130, 246);
        pdf.setLineWidth(0.4);
        pdf.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
        pdf.setLineWidth(0.2);
        y += 4;

        // Re-draw table header
        pdf.setFontSize(8);
        drawTableRow(pdf, y, cols.map(c => ({ text: c.label, x: c.x, width: c.width, align: c.align })), ROW_HEIGHT, { bold: true, bg: '#f8fafc' });
        y += ROW_HEIGHT;
      }

      const lineTotal = getItemLineTotal(item);
      drawTableRow(pdf, y, [
        { text: item.category || '', x: cols[0].x, width: cols[0].width, align: 'left' },
        { text: String(item.quantity || 0), x: cols[1].x, width: cols[1].width, align: 'center' },
        { text: item.unit || 'each', x: cols[2].x, width: cols[2].width, align: 'center' },
        { text: formatCurrency(lineTotal), x: cols[3].x, width: cols[3].width, align: 'right' },
      ], ROW_HEIGHT);
      y += ROW_HEIGHT;
    });

    // Total row
    if (y + ROW_HEIGHT > PAGE_HEIGHT - FOOTER_SPACE) {
      addPageFooter(pdf, currentPage, totalPages);
      pdf.addPage();
      currentPage++;
      y = 15;
    }

    // Merge first 3 cols for total label
    const totalLabelWidth = cols[0].width + cols[1].width + cols[2].width;
    drawTableRow(pdf, y, [
      { text: 'TOTAL BUDGET ESTIMATE:', x: cols[0].x, width: totalLabelWidth, align: 'right' },
      { text: formatCurrency(totalValue), x: cols[3].x, width: cols[3].width, align: 'right' },
    ], ROW_HEIGHT, { bold: true, bg: '#f8fafc' });

    addPageFooter(pdf, currentPage, totalPages);

  } else if (exportType === 'category') {
    renderSummaryTable(pdf, y, filteredItems, totalValue, 'category', 'CATEGORY SUMMARY');
  } else {
    renderSummaryTable(pdf, y, filteredItems, totalValue, 'division', 'DIVISION SUMMARY');
  }

  const filename = `Budget-Estimate-${(projectData?.name || 'project').replace(/\s+/g, '-').toLowerCase()}-${exportType}-${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(filename);
}

function renderSummaryTable(
  pdf: jsPDF,
  y: number,
  items: BidItem[],
  totalValue: number,
  groupKey: 'category' | 'division',
  title: string
) {
  const totals: Record<string, number> = {};
  items.forEach(item => {
    const key = (groupKey === 'category' ? item.category : (item as any).division) || 'Other';
    totals[key] = (totals[key] || 0) + (item.total || 0);
  });

  pdf.setFillColor(243, 244, 246);
  pdf.rect(MARGIN, y, CONTENT_WIDTH, 7, 'F');
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(55, 65, 81);
  pdf.text(title, MARGIN + 4, y + 5);
  y += 10;

  const nameW = CONTENT_WIDTH * 0.65;
  const totalW = CONTENT_WIDTH * 0.35;
  const ROW_HEIGHT = 8;

  // Header
  pdf.setFontSize(9);
  drawTableRow(pdf, y, [
    { text: groupKey === 'category' ? 'Category' : 'Division', x: MARGIN, width: nameW, align: 'left' },
    { text: 'Total', x: MARGIN + nameW, width: totalW, align: 'right' },
  ], ROW_HEIGHT, { bold: true, bg: '#f8fafc' });
  y += ROW_HEIGHT;

  Object.entries(totals).forEach(([name, amount]) => {
    drawTableRow(pdf, y, [
      { text: name, x: MARGIN, width: nameW, align: 'left' },
      { text: formatCurrency(amount), x: MARGIN + nameW, width: totalW, align: 'right' },
    ], ROW_HEIGHT);
    y += ROW_HEIGHT;
  });

  drawTableRow(pdf, y, [
    { text: 'TOTAL BUDGET ESTIMATE:', x: MARGIN, width: nameW, align: 'right' },
    { text: formatCurrency(totalValue), x: MARGIN + nameW, width: totalW, align: 'right' },
  ], ROW_HEIGHT, { bold: true, bg: '#f8fafc' });

  addPageFooter(pdf, 1, 1);
}

export async function exportBidReportPDF(
  bidItems: BidItem[],
  projectData: ProjectData | null,
  terms: string[] = []
) {
  const pdf = new jsPDF('portrait', 'mm', 'letter');
  const totalBidValue = bidItems.reduce((sum, i) => sum + (i.total || 0), 0);

  // Calculate category breakdown
  const breakdown: Record<string, Record<string, number>> = {};
  bidItems.forEach(item => {
    if (!item.description?.trim()) return;
    const cat = item.category || 'Other';
    const sub = item.subcategory || 'Uncategorized';
    if (!breakdown[cat]) breakdown[cat] = {};
    breakdown[cat][sub] = (breakdown[cat][sub] || 0) + (item.total || 0);
  });

  const ROW_HEIGHT = 7;
  const itemsPerPage = 25;
  const totalItemPages = Math.ceil(bidItems.length / itemsPerPage);
  const totalPages = 1 + totalItemPages;

  // --- Page 1: Summary with Logo ---
  let y = 10;

  const logoDataUrl = await loadLogoAsDataUrl();
  if (logoDataUrl) {
    const logoWidth = 40;
    const logoHeight = 30;
    const logoX = (PAGE_WIDTH - logoWidth) / 2;
    pdf.addImage(logoDataUrl, 'PNG', logoX, y, logoWidth, logoHeight);
    y += logoHeight + 4;
  } else {
    y = 16;
  }

  pdf.setFontSize(14);
  pdf.setFont('helvetica', 'bold');
  pdf.setTextColor(31, 41, 55);
  pdf.text('BUDGET ESTIMATE', PAGE_WIDTH / 2, y, { align: 'center' });
  y += 4;
  pdf.setDrawColor(59, 130, 246);
  pdf.setLineWidth(0.6);
  pdf.line(MARGIN, y, PAGE_WIDTH - MARGIN, y);
  pdf.setLineWidth(0.2);
  y += 8;

  // Two-column info
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('PROJECT INFORMATION', MARGIN, y);
  pdf.text('ESTIMATE SUMMARY', PAGE_WIDTH / 2 + 5, y);
  y += 5;

  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(8);
  const leftInfo = [
    ['Project Name:', projectData?.name || 'N/A'],
    ['Project Code:', projectData?.project_code || 'N/A'],
    ['Client:', projectData?.client || 'N/A'],
    ['Address:', projectData?.address || 'N/A'],
    ['Date:', new Date().toLocaleDateString()],
  ];
  const rightInfo = [
    ['Total Line Items:', String(bidItems.length)],
    ['Base Estimate:', formatCurrency(totalBidValue)],
    ['Contingency:', projectData?.contingency_type === 'percentage' ? (projectData?.contingency_value || 0) + '%' : formatCurrency(projectData?.contingency_value || 0)],
  ];

  const maxRows = Math.max(leftInfo.length, rightInfo.length);
  for (let i = 0; i < maxRows; i++) {
    if (leftInfo[i]) {
      pdf.setFont('helvetica', 'bold');
      pdf.text(leftInfo[i][0], MARGIN, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(leftInfo[i][1], MARGIN + 28, y);
    }
    if (rightInfo[i]) {
      pdf.setFont('helvetica', 'bold');
      pdf.text(rightInfo[i][0], PAGE_WIDTH / 2 + 5, y);
      pdf.setFont('helvetica', 'normal');
      pdf.text(rightInfo[i][1], PAGE_WIDTH / 2 + 38, y);
    }
    y += 5;
  }

  // Total estimate highlight
  y += 2;
  pdf.setDrawColor(200, 200, 200);
  pdf.line(PAGE_WIDTH / 2 + 5, y - 2, PAGE_WIDTH - MARGIN, y - 2);
  pdf.setFontSize(11);
  pdf.setFont('helvetica', 'bold');
  pdf.text('TOTAL ESTIMATE:', PAGE_WIDTH / 2 + 5, y + 3);
  pdf.text(formatCurrency(totalBidValue), PAGE_WIDTH - MARGIN, y + 3, { align: 'right' });
  y += 12;

  // Category breakdown
  pdf.setFontSize(9);
  pdf.setFont('helvetica', 'bold');
  pdf.text('CATEGORY BREAKDOWN', MARGIN, y);
  y += 5;

  pdf.setFontSize(8);
  Object.entries(breakdown).forEach(([category, subcategories]) => {
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(75, 85, 99);
    pdf.text(category, MARGIN, y);
    y += 4;
    pdf.setFont('helvetica', 'normal');
    pdf.setTextColor(31, 41, 55);
    Object.entries(subcategories).forEach(([sub, amount]) => {
      pdf.text(sub, MARGIN + 8, y);
      pdf.text(formatCurrency(amount), PAGE_WIDTH / 2 - 5, y, { align: 'right' });
      y += 4;
    });
    y += 2;
  });

  addPageFooter(pdf, 1, totalPages);

  // --- Line item pages ---
  const cols7 = (() => {
    const ucW = 30;
    const unitW = 20;
    const qtyW = 18;
    const subW = 40;
    const catW = CONTENT_WIDTH - subW - qtyW - unitW - ucW;
    let x = MARGIN;
    const defs = [
      { label: 'Category', width: catW, align: 'left' as const },
      { label: 'Subcategory', width: subW, align: 'left' as const },
      { label: 'Qty', width: qtyW, align: 'center' as const },
      { label: 'Unit', width: unitW, align: 'center' as const },
      { label: 'Unit Cost', width: ucW, align: 'right' as const },
    ];
    return defs.map(d => {
      const c = { ...d, x };
      x += d.width;
      return c;
    });
  })();

  for (let page = 0; page < totalItemPages; page++) {
    pdf.addPage();
    let pageNum = page + 2;
    let py = 14;

    pdf.setFontSize(11);
    pdf.setFont('helvetica', 'bold');
    pdf.setTextColor(31, 41, 55);
    pdf.text('BUDGET ESTIMATE - LINE ITEMS', PAGE_WIDTH / 2, py, { align: 'center' });
    py += 3;
    pdf.setDrawColor(59, 130, 246);
    pdf.setLineWidth(0.4);
    pdf.line(MARGIN, py, PAGE_WIDTH - MARGIN, py);
    pdf.setLineWidth(0.2);
    py += 5;

    pdf.setFontSize(7.5);
    drawTableRow(pdf, py, cols7.map(c => ({ text: c.label, x: c.x, width: c.width, align: c.align })), ROW_HEIGHT, { bold: true, bg: '#f8fafc' });
    py += ROW_HEIGHT;

    const startIdx = page * itemsPerPage;
    const endIdx = Math.min(startIdx + itemsPerPage, bidItems.length);
    const isLastPage = endIdx === bidItems.length;

    for (let i = startIdx; i < endIdx; i++) {
      const item = bidItems[i];
      const uc = item.unitCost ?? item.unit_cost ?? 0;
      drawTableRow(pdf, py, [
        { text: item.category || 'N/A', x: cols7[0].x, width: cols7[0].width, align: 'left' },
        { text: item.subcategory || 'N/A', x: cols7[1].x, width: cols7[1].width, align: 'left' },
        { text: String(item.quantity || 0), x: cols7[2].x, width: cols7[2].width, align: 'center' },
        { text: item.unit || 'each', x: cols7[3].x, width: cols7[3].width, align: 'center' },
        { text: formatCurrency(uc), x: cols7[4].x, width: cols7[4].width, align: 'right' },
      ], ROW_HEIGHT);
      py += ROW_HEIGHT;
    }

    if (isLastPage) {
      const totalLabelW = cols7[0].width + cols7[1].width + cols7[2].width + cols7[3].width;
      drawTableRow(pdf, py, [
        { text: 'TOTAL BUDGET ESTIMATE:', x: cols7[0].x, width: totalLabelW, align: 'right' },
        { text: formatCurrency(totalBidValue), x: cols7[4].x, width: cols7[4].width, align: 'right' },
      ], ROW_HEIGHT, { bold: true, bg: '#f8fafc' });
      py += ROW_HEIGHT;

      // Add terms if provided
      if (terms.length > 0) {
        py += 8;
        if (py > PAGE_HEIGHT - 60) {
          pdf.addPage();
          py = 20;
          pageNum++;
        }
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(31, 41, 55);
        pdf.text('TERMS AND CONDITIONS', MARGIN, py);
        py += 6;
        pdf.setFontSize(8);
        pdf.setFont('helvetica', 'normal');
        terms.forEach((term) => {
          if (py > PAGE_HEIGHT - 20) {
            pdf.addPage();
            py = 20;
            pageNum++;
          }
          const lines = pdf.splitTextToSize(`• ${term}`, CONTENT_WIDTH);
          pdf.text(lines, MARGIN, py);
          py += lines.length * 4;
        });
      }
    }

    addPageFooter(pdf, pageNum, totalPages);
  }

  const filename = `Budget-Estimate-${(projectData?.name || 'project').replace(/\s+/g, '-').toLowerCase()}-${new Date().toISOString().split('T')[0]}.pdf`;
  pdf.save(filename);
}
