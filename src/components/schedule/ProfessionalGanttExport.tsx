
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
  
  // Professional header with company styling
  doc.setFillColor(41, 128, 185); // Professional blue
  doc.rect(0, 0, pageWidth, 35, 'F');
  
  // Title in white
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont('helvetica', 'bold');
  doc.text(options.title || 'PROJECT SCHEDULE REPORT', margin, 20);
  
  // Subtitle
  doc.setFontSize(11);
  doc.setFont('helvetica', 'normal');
  doc.text(`${format(dateRange.from, 'MMMM dd, yyyy')} - ${format(dateRange.to, 'MMMM dd, yyyy')}`, margin, 28);
  
  // Reset text color
  doc.setTextColor(0, 0, 0);
  
  // Report metadata section
  const metaY = 45;
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 100, 100);
  doc.text(`Generated: ${format(new Date(), 'MMMM dd, yyyy \'at\' HH:mm')}`, margin, metaY);
  doc.text(`Total Tasks: ${tasks.length}`, margin + 80, metaY);
  doc.text(`Active Projects: ${projects.length}`, margin + 140, metaY);
  doc.text(`Business Days Only`, margin + 200, metaY);
  
  // Professional timeline setup
  const timelineDays = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
  const headerY = 60;
  const rowHeight = 12;
  const taskNameWidth = 90;
  const dateColumnWidth = Math.min(25, (pageWidth - margin * 2 - taskNameWidth - 100) / Math.min(timelineDays.length, 20));
  const visibleDays = Math.min(timelineDays.length, Math.floor((pageWidth - margin * 2 - taskNameWidth - 100) / dateColumnWidth));
  
  // Professional table header
  doc.setFillColor(245, 245, 245);
  doc.rect(margin, headerY, pageWidth - margin * 2, rowHeight * 2, 'F');
  
  // Add subtle borders
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.rect(margin, headerY, pageWidth - margin * 2, rowHeight * 2);
  
  // Column headers with professional typography
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.text('TASK NAME', margin + 3, headerY + 8);
  doc.text('START', margin + taskNameWidth + 5, headerY + 6);
  doc.text('FINISH', margin + taskNameWidth + 35, headerY + 6);
  doc.text('DAYS', margin + taskNameWidth + 65, headerY + 6);
  doc.text('PROGRESS', margin + taskNameWidth + 85, headerY + 6);
  
  // Timeline header with better formatting
  doc.setFontSize(8);
  const timelineStartX = margin + taskNameWidth + 100;
  timelineDays.slice(0, visibleDays).forEach((day, index) => {
    const x = timelineStartX + index * dateColumnWidth;
    const isWeekend = !isBusinessDay(day);
    const isHolidayDay = isHoliday(day);
    
    // Weekend/holiday background
    if (isWeekend || isHolidayDay) {
      doc.setFillColor(isHolidayDay ? 252, 232, 230 : 248, 250, 252);
      doc.rect(x, headerY, dateColumnWidth, rowHeight * 2, 'F');
    }
    
    // Date text with better alignment
    doc.setTextColor(isHolidayDay ? 185, 28, 28 : isWeekend ? 100, 116, 139 : 75, 85, 99);
    const dayText = format(day, 'dd');
    const dayWidth = doc.getTextWidth(dayText);
    doc.text(dayText, x + (dateColumnWidth - dayWidth) / 2, headerY + 8);
    
    const weekdayText = format(day, 'EEE');
    const weekdayWidth = doc.getTextWidth(weekdayText);
    doc.text(weekdayText, x + (dateColumnWidth - weekdayWidth) / 2, headerY + 16);
  });
  
  // Draw tasks with professional styling
  let currentY = headerY + rowHeight * 2;
  doc.setTextColor(0, 0, 0);
  
  tasks.forEach((task, index) => {
    if (currentY > pageHeight - 30) {
      // Add page footer before new page
      addPageFooter(doc);
      doc.addPage();
      currentY = 30;
      
      // Repeat header on new page
      doc.setFillColor(245, 245, 245);
      doc.rect(margin, currentY - 5, pageWidth - margin * 2, rowHeight, 'F');
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(60, 60, 60);
      doc.text('TASK NAME', margin + 3, currentY);
      doc.text('START', margin + taskNameWidth + 5, currentY);
      doc.text('FINISH', margin + taskNameWidth + 35, currentY);
      doc.text('DAYS', margin + taskNameWidth + 65, currentY);
      doc.text('PROGRESS', margin + taskNameWidth + 85, currentY);
      currentY += 8;
    }
    
    const project = projects.find(p => p.id === task.projectId);
    const isEvenRow = index % 2 === 0;
    
    // Professional row styling
    if (isEvenRow) {
      doc.setFillColor(252, 252, 252);
      doc.rect(margin, currentY, pageWidth - margin * 2, rowHeight, 'F');
    }
    
    // Task information with better typography
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    
    // Task name with truncation
    const taskName = task.title.length > 30 ? task.title.substring(0, 27) + '...' : task.title;
    doc.text(taskName, margin + 3, currentY + 8);
    
    // Dates and duration with consistent formatting
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(format(task.startDate, 'MM/dd'), margin + taskNameWidth + 5, currentY + 8);
    doc.text(format(task.endDate, 'MM/dd'), margin + taskNameWidth + 35, currentY + 8);
    
    const businessDays = getBusinessDaysBetween(task.startDate, task.endDate);
    doc.text(`${businessDays}`, margin + taskNameWidth + 68, currentY + 8);
    doc.text(`${task.progress}%`, margin + taskNameWidth + 88, currentY + 8);
    
    // Professional Gantt bar
    const taskStartPos = Math.max(0, differenceInDays(task.startDate, dateRange.from));
    const taskDuration = differenceInDays(task.endDate, task.startDate) + 1;
    
    if (taskStartPos < visibleDays) {
      const barX = timelineStartX + taskStartPos * dateColumnWidth;
      const barWidth = Math.min(taskDuration * dateColumnWidth, (visibleDays - taskStartPos) * dateColumnWidth);
      
      // Task bar with gradient effect simulation
      const color = project?.color || '#3b82f6';
      const rgb = hexToRgb(color);
      if (rgb && barWidth > 2) {
        // Main bar
        doc.setFillColor(rgb.r, rgb.g, rgb.b);
        doc.rect(barX + 1, currentY + 2, barWidth - 2, rowHeight - 4, 'F');
        
        // Progress overlay with darker shade
        if (options.showProgress && task.progress > 0) {
          doc.setFillColor(Math.max(0, rgb.r - 40), Math.max(0, rgb.g - 40), Math.max(0, rgb.b - 40));
          const progressWidth = ((barWidth - 2) * task.progress) / 100;
          doc.rect(barX + 1, currentY + 2, progressWidth, rowHeight - 4, 'F');
        }
        
        // Professional border
        doc.setDrawColor(Math.max(0, rgb.r - 60), Math.max(0, rgb.g - 60), Math.max(0, rgb.b - 60));
        doc.setLineWidth(0.5);
        doc.rect(barX + 1, currentY + 2, barWidth - 2, rowHeight - 4);
      }
    }
    
    currentY += rowHeight;
  });
  
  // Professional legend
  addProfessionalLegend(doc, currentY + 15, options);
  
  // Add footer to last page
  addPageFooter(doc);
  
  return doc;
};

export const generateProfessionalExcel = (
  tasks: Task[],
  projects: Project[],
  dateRange: { from: Date; to: Date },
  options: ExportOptions = {}
) => {
  const workbook = XLSX.utils.book_new();
  
  // Executive Summary Sheet
  const summaryData = [{
    'Report Title': options.title || 'Project Schedule Report',
    'Report Period': `${format(dateRange.from, 'MMMM dd, yyyy')} - ${format(dateRange.to, 'MMMM dd, yyyy')}`,
    'Total Tasks': tasks.length,
    'Active Projects': projects.length,
    'Completed Tasks': tasks.filter(t => t.status === 'Completed').length,
    'In Progress Tasks': tasks.filter(t => t.status === 'In Progress').length,
    'Not Started Tasks': tasks.filter(t => t.status === 'Not Started').length,
    'On Hold Tasks': tasks.filter(t => t.status === 'On Hold').length,
    'Average Progress': Math.round(tasks.reduce((sum, t) => sum + t.progress, 0) / tasks.length) + '%',
    'Report Generated': format(new Date(), 'MMMM dd, yyyy \'at\' HH:mm'),
    'Business Days Calculation': 'Enabled (excludes weekends and holidays)'
  }];
  
  const summarySheet = XLSX.utils.json_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Executive Summary');
  
  // Enhanced Task Data with professional formatting
  const taskData = tasks.map((task, index) => {
    const project = projects.find(p => p.id === task.projectId);
    const businessDays = getBusinessDaysBetween(task.startDate, task.endDate);
    
    return {
      'Task ID': `T${(index + 1).toString().padStart(3, '0')}`,
      'Task Name': task.title,
      'Project': project?.name || 'Unassigned',
      'Start Date': format(task.startDate, 'yyyy-MM-dd'),
      'End Date': format(task.endDate, 'yyyy-MM-dd'),
      'Duration (Business Days)': businessDays,
      'Status': task.status,
      'Progress Percentage': task.progress,
      'Dependencies Count': task.dependencies?.length || 0,
      'Project Color': project?.color || '#3b82f6'
    };
  });
  
  const taskSheet = XLSX.utils.json_to_sheet(taskData);
  XLSX.utils.book_append_sheet(workbook, taskSheet, 'Task Details');
  
  // Professional Timeline Matrix
  const timelineDays = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
  const timelineData = tasks.map(task => {
    const project = projects.find(p => p.id === task.projectId);
    const row: any = { 
      'Task': task.title,
      'Project': project?.name || 'Unassigned',
      'Status': task.status
    };
    
    timelineDays.forEach(day => {
      const dayKey = format(day, 'MM/dd');
      const isTaskDay = day >= task.startDate && day <= task.endDate;
      const isBusinessDayForTask = isTaskDay && isBusinessDay(day);
      
      if (isBusinessDayForTask) {
        row[dayKey] = task.progress > 50 ? '●' : '○'; // Filled for >50% progress
      } else if (isTaskDay) {
        row[dayKey] = isBusinessDay(day) ? '○' : ''; // Weekend/holiday within task period
      } else {
        row[dayKey] = '';
      }
    });
    
    return row;
  });
  
  const timelineSheet = XLSX.utils.json_to_sheet(timelineData);
  XLSX.utils.book_append_sheet(workbook, timelineSheet, 'Timeline Matrix');
  
  // Project Analysis Sheet
  const projectAnalysis = projects.map(project => {
    const projectTasks = tasks.filter(t => t.projectId === project.id);
    const completedTasks = projectTasks.filter(t => t.status === 'Completed').length;
    const totalProgress = projectTasks.reduce((sum, t) => sum + t.progress, 0);
    const avgProgress = projectTasks.length > 0 ? totalProgress / projectTasks.length : 0;
    
    return {
      'Project Name': project.name,
      'Total Tasks': projectTasks.length,
      'Completed Tasks': completedTasks,
      'Completion Rate': `${Math.round((completedTasks / projectTasks.length) * 100)}%`,
      'Average Progress': `${Math.round(avgProgress)}%`,
      'Earliest Start': projectTasks.length > 0 ? format(new Date(Math.min(...projectTasks.map(t => t.startDate.getTime()))), 'yyyy-MM-dd') : 'N/A',
      'Latest End': projectTasks.length > 0 ? format(new Date(Math.max(...projectTasks.map(t => t.endDate.getTime()))), 'yyyy-MM-dd') : 'N/A'
    };
  });
  
  const projectSheet = XLSX.utils.json_to_sheet(projectAnalysis);
  XLSX.utils.book_append_sheet(workbook, projectSheet, 'Project Analysis');
  
  return workbook;
};

// Helper functions for professional PDF formatting
function addPageFooter(doc: jsPDF) {
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.line(15, pageHeight - 15, pageWidth - 15, pageHeight - 15);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(120, 120, 120);
  doc.text('Confidential - Project Schedule Report', 15, pageHeight - 8);
  doc.text(`Page ${doc.getCurrentPageInfo().pageNumber}`, pageWidth - 30, pageHeight - 8);
}

function addProfessionalLegend(doc: jsPDF, startY: number, options: ExportOptions) {
  const margin = 15;
  
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, startY, doc.internal.pageSize.width - margin * 2, 25, 'F');
  
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.rect(margin, startY, doc.internal.pageSize.width - margin * 2, 25);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('LEGEND & NOTES', margin + 5, startY + 8);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  
  const legendItems = [
    '• Duration calculated in business days only (excludes weekends and holidays)',
    '• Task bars show project timeline with color-coded progress indication',
    '• Light gray columns indicate weekends, light red indicates holidays'
  ];
  
  if (options.showProgress) {
    legendItems.push('• Darker bar portions indicate actual progress completion');
  }
  
  legendItems.forEach((item, index) => {
    doc.text(item, margin + 5, startY + 15 + (index * 4));
  });
}

// Helper function to convert hex to RGB
function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}
