import { Task } from '@/types';
import { format, differenceInDays, eachDayOfInterval } from 'date-fns';
import { getBusinessDaysBetween, isBusinessDay, isHoliday } from '@/utils/businessDays';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

interface Project {
  id: string;
  name: string;
  color: string;
}

interface ExportOptions {
  includeWeekends?: boolean;
  includeHolidays?: boolean;
  showProgress?: boolean;
  showDependencies?: boolean;
  dateFormat?: string;
  title?: string;
}

export const generateProfessionalGanttPDF = (
  tasks: Task[],
  projects: Project[],
  dateRange: { from: Date; to: Date },
  options: ExportOptions = {}
) => {
  const doc = new jsPDF('landscape', 'mm', 'a4');
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 15;
  
  // Title
  doc.setFontSize(16);
  doc.setFont('helvetica', 'bold');
  doc.text(options.title || 'Project Gantt Chart', margin, 20);
  
  // Date range
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text(`Period: ${format(dateRange.from, 'MMM dd, yyyy')} - ${format(dateRange.to, 'MMM dd, yyyy')}`, margin, 28);
  doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, margin, 33);
  
  // Timeline header
  const timelineDays = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
  const headerY = 45;
  const rowHeight = 8;
  const taskNameWidth = 80;
  const dateColumnWidth = (pageWidth - margin * 2 - taskNameWidth) / timelineDays.length;
  
  // Draw header
  doc.setFillColor(240, 240, 240);
  doc.rect(margin, headerY, taskNameWidth, rowHeight * 2, 'F');
  doc.rect(margin + taskNameWidth, headerY, pageWidth - margin * 2 - taskNameWidth, rowHeight * 2, 'F');
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.text('Task Name', margin + 2, headerY + 5);
  doc.text('Start', margin + 2, headerY + 12);
  doc.text('Finish', margin + 25, headerY + 12);
  doc.text('Duration', margin + 50, headerY + 12);
  
  // Timeline dates
  timelineDays.forEach((day, index) => {
    const x = margin + taskNameWidth + index * dateColumnWidth;
    const isWeekendDay = !isBusinessDay(day);
    
    if (isWeekendDay) {
      doc.setFillColor(250, 250, 250);
      doc.rect(x, headerY, dateColumnWidth, rowHeight * 2, 'F');
    }
    
    doc.setFontSize(7);
    doc.text(format(day, 'dd'), x + 1, headerY + 5);
    doc.text(format(day, 'EEE'), x + 1, headerY + 12);
  });
  
  // Draw tasks
  let currentY = headerY + rowHeight * 2;
  
  tasks.forEach((task, index) => {
    if (currentY > pageHeight - 20) {
      doc.addPage();
      currentY = 20;
    }
    
    const project = projects.find(p => p.id === task.projectId);
    const isEvenRow = index % 2 === 0;
    
    // Row background
    if (isEvenRow) {
      doc.setFillColor(248, 249, 250);
      doc.rect(margin, currentY, pageWidth - margin * 2, rowHeight, 'F');
    }
    
    // Task name and details
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.text(task.title.substring(0, 25), margin + 2, currentY + 5);
    
    // Start and end dates
    doc.setFontSize(7);
    doc.text(format(task.startDate, 'MM/dd'), margin + 2, currentY + rowHeight - 1);
    doc.text(format(task.endDate, 'MM/dd'), margin + 25, currentY + rowHeight - 1);
    
    // Duration
    const businessDays = getBusinessDaysBetween(task.startDate, task.endDate);
    doc.text(`${businessDays}d`, margin + 50, currentY + rowHeight - 1);
    
    // Gantt bar
    const taskStartPos = differenceInDays(task.startDate, dateRange.from);
    const taskDuration = differenceInDays(task.endDate, task.startDate) + 1;
    const barX = margin + taskNameWidth + taskStartPos * dateColumnWidth;
    const barWidth = taskDuration * dateColumnWidth;
    
    // Task bar
    const color = project?.color || '#3b82f6';
    const rgb = hexToRgb(color);
    if (rgb) {
      doc.setFillColor(rgb.r, rgb.g, rgb.b);
      doc.rect(barX, currentY + 1, barWidth, rowHeight - 2, 'F');
      
      // Progress indicator
      if (options.showProgress && task.progress > 0) {
        doc.setFillColor(rgb.r * 0.7, rgb.g * 0.7, rgb.b * 0.7);
        doc.rect(barX, currentY + 1, (barWidth * task.progress) / 100, rowHeight - 2, 'F');
      }
    }
    
    currentY += rowHeight;
  });
  
  // Legend
  currentY += 10;
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.text('Legend:', margin, currentY);
  
  currentY += 8;
  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text('• Light gray columns indicate weekends', margin, currentY);
  doc.text('• Task bars show project timeline in business days', margin, currentY + 5);
  if (options.showProgress) {
    doc.text('• Darker portions indicate completion progress', margin, currentY + 10);
  }
  
  return doc;
};

export const generateProfessionalExcel = (
  tasks: Task[],
  projects: Project[],
  dateRange: { from: Date; to: Date },
  options: ExportOptions = {}
) => {
  const workbook = XLSX.utils.book_new();
  
  // Prepare task data with business day calculations
  const taskData = tasks.map((task, index) => {
    const project = projects.find(p => p.id === task.projectId);
    const businessDays = getBusinessDaysBetween(task.startDate, task.endDate);
    
    return {
      'ID': index + 1,
      'Task Name': task.title,
      'Project': project?.name || 'Unknown',
      'Start Date': format(task.startDate, 'yyyy-MM-dd'),
      'End Date': format(task.endDate, 'yyyy-MM-dd'),
      'Duration (Business Days)': businessDays,
      'Status': task.status,
      'Progress (%)': task.progress,
      'Dependencies': task.dependencies?.length || 0
    };
  });
  
  // Create main data sheet
  const taskSheet = XLSX.utils.json_to_sheet(taskData);
  XLSX.utils.book_append_sheet(workbook, taskSheet, 'Tasks');
  
  // Create timeline sheet
  const timelineDays = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
  const timelineHeaders = ['Task Name', ...timelineDays.map(day => format(day, 'MM/dd'))];
  
  const timelineData = tasks.map(task => {
    const row: any = { 'Task Name': task.title };
    
    timelineDays.forEach(day => {
      const dayKey = format(day, 'MM/dd');
      const isTaskDay = day >= task.startDate && day <= task.endDate;
      const isBusinessDayForTask = isTaskDay && isBusinessDay(day);
      
      row[dayKey] = isBusinessDayForTask ? '■' : (isTaskDay ? '□' : '');
    });
    
    return row;
  });
  
  const timelineSheet = XLSX.utils.json_to_sheet(timelineData);
  XLSX.utils.book_append_sheet(workbook, timelineSheet, 'Timeline');
  
  // Add metadata sheet
  const metadata = {
    'Report Title': options.title || 'Project Schedule Report',
    'Generated Date': format(new Date(), 'yyyy-MM-dd HH:mm:ss'),
    'Date Range': `${format(dateRange.from, 'yyyy-MM-dd')} to ${format(dateRange.to, 'yyyy-MM-dd')}`,
    'Total Tasks': tasks.length,
    'Total Projects': projects.length,
    'Business Days Only': 'Yes'
  };
  
  const metadataSheet = XLSX.utils.json_to_sheet([metadata]);
  XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Report Info');
  
  return workbook;
};

// Helper function to convert hex to RGB
function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}
