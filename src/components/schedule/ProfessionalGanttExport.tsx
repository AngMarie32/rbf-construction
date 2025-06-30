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
  
  // Corporate header with professional gradient effect
  doc.setFillColor(25, 55, 109); // Deep professional blue
  doc.rect(0, 0, pageWidth, 40, 'F');
  
  // Add subtle gradient effect with overlays
  doc.setFillColor(30, 64, 125);
  doc.rect(0, 0, pageWidth, 35, 'F');
  doc.setFillColor(35, 73, 141);
  doc.rect(0, 0, pageWidth, 30, 'F');
  
  // Company logo area (placeholder)
  doc.setFillColor(255, 255, 255);
  doc.rect(margin, 8, 25, 24, 'F');
  doc.setDrawColor(220, 220, 220);
  doc.setLineWidth(0.5);
  doc.rect(margin, 8, 25, 24);
  
  // Professional title with enhanced typography
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(24);
  doc.setFont('helvetica', 'bold');
  doc.text(options.title || 'PROJECT SCHEDULE REPORT', margin + 35, 20);
  
  // Subtitle with date range
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(`Report Period: ${format(dateRange.from, 'MMMM dd, yyyy')} - ${format(dateRange.to, 'MMMM dd, yyyy')}`, margin + 35, 28);
  
  // Generate date columns for the timeline
  const timelineDays = eachDayOfInterval({ start: dateRange.from, end: dateRange.to });
  
  // Professional metadata section with enhanced design
  const metaY = 50;
  doc.setFillColor(248, 249, 250);
  doc.rect(margin, metaY - 5, pageWidth - margin * 2, 20, 'F');
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.rect(margin, metaY - 5, pageWidth - margin * 2, 20);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('REPORT SUMMARY', margin + 5, metaY + 2);
  
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(80, 80, 80);
  doc.text(`Generated: ${format(new Date(), 'MMMM dd, yyyy \'at\' HH:mm')}`, margin + 5, metaY + 8);
  doc.text(`Total Tasks: ${tasks.length}`, margin + 80, metaY + 8);
  doc.text(`Active Projects: ${projects.length}`, margin + 140, metaY + 8);
  doc.text('Business Days Calculation', margin + 200, metaY + 8);
  
  // Project statistics
  const completedTasks = tasks.filter(t => t.status === 'Completed').length;
  const inProgressTasks = tasks.filter(t => t.status === 'In Progress').length;
  const avgProgress = Math.round(tasks.reduce((sum, t) => sum + t.progress, 0) / tasks.length);
  
  doc.text(`Completed: ${completedTasks} (${Math.round((completedTasks/tasks.length)*100)}%)`, margin + 5, metaY + 12);
  doc.text(`In Progress: ${inProgressTasks}`, margin + 80, metaY + 12);
  doc.text(`Avg Progress: ${avgProgress}%`, margin + 140, metaY + 12);
  
  // Professional timeline setup with improved spacing
  const headerY = 75;
  const rowHeight = 14;
  const taskNameWidth = 100;
  const columnWidths = {
    start: 30,
    finish: 30,
    duration: 25,
    progress: 30,
    status: 25
  };
  
  const timelineStartX = margin + taskNameWidth + Object.values(columnWidths).reduce((sum, w) => sum + w, 0);
  const availableTimelineWidth = pageWidth - timelineStartX - margin;
  const dateColumnWidth = Math.min(20, availableTimelineWidth / Math.min(timelineDays.length, 30));
  const visibleDays = Math.min(timelineDays.length, Math.floor(availableTimelineWidth / dateColumnWidth));
  
  // Enhanced table header with corporate styling
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, headerY, pageWidth - margin * 2, rowHeight * 2.5, 'F');
  
  // Header borders with professional styling
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(1);
  doc.rect(margin, headerY, pageWidth - margin * 2, rowHeight * 2.5);
  
  // Vertical separators
  let currentX = margin + taskNameWidth;
  Object.values(columnWidths).forEach(width => {
    doc.line(currentX, headerY, currentX, headerY + rowHeight * 2.5);
    currentX += width;
  });
  
  // Timeline separator
  doc.line(timelineStartX, headerY, timelineStartX, headerY + rowHeight * 2.5);
  
  // Column headers with enhanced typography
  doc.setTextColor(51, 65, 85);
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  
  doc.text('TASK NAME', margin + 3, headerY + 8);
  doc.text('START', margin + taskNameWidth + 8, headerY + 8);
  doc.text('FINISH', margin + taskNameWidth + columnWidths.start + 8, headerY + 8);
  doc.text('DAYS', margin + taskNameWidth + columnWidths.start + columnWidths.finish + 8, headerY + 8);
  doc.text('PROGRESS', margin + taskNameWidth + columnWidths.start + columnWidths.finish + columnWidths.duration + 3, headerY + 8);
  doc.text('STATUS', margin + taskNameWidth + columnWidths.start + columnWidths.finish + columnWidths.duration + columnWidths.progress + 3, headerY + 8);
  
  // Timeline header with enhanced date formatting
  doc.setFontSize(8);
  timelineDays.slice(0, visibleDays).forEach((day, index) => {
    const x = timelineStartX + index * dateColumnWidth;
    const isWeekend = !isBusinessDay(day);
    const isHolidayDay = isHoliday(day);
    
    // Enhanced weekend/holiday background
    if (isWeekend || isHolidayDay) {
      doc.setFillColor(
        isHolidayDay ? 254 : 248, 
        isHolidayDay ? 242 : 250, 
        isHolidayDay ? 242 : 252
      );
      doc.rect(x, headerY, dateColumnWidth, rowHeight * 2.5, 'F');
    }
    
    // Date text with improved contrast
    doc.setTextColor(
      isHolidayDay ? 185 : isWeekend ? 100 : 75, 
      isHolidayDay ? 28 : isWeekend ? 116 : 85, 
      isHolidayDay ? 28 : isWeekend ? 139 : 99
    );
    
    const dayText = format(day, 'dd');
    const dayWidth = doc.getTextWidth(dayText);
    doc.text(dayText, x + (dateColumnWidth - dayWidth) / 2, headerY + 8);
    
    const weekdayText = format(day, 'EEE');
    const weekdayWidth = doc.getTextWidth(weekdayText);
    doc.text(weekdayText, x + (dateColumnWidth - weekdayWidth) / 2, headerY + 16);
    
    // Month indicator for first day of month
    if (day.getDate() === 1) {
      doc.setFont('helvetica', 'bold');
      const monthText = format(day, 'MMM');
      const monthWidth = doc.getTextWidth(monthText);
      doc.text(monthText, x + (dateColumnWidth - monthWidth) / 2, headerY + 24);
      doc.setFont('helvetica', 'normal');
    }
  });
  
  // Enhanced task rows with professional styling
  let currentY = headerY + rowHeight * 2.5;
  doc.setTextColor(0, 0, 0);
  
  tasks.forEach((task, index) => {
    if (currentY > pageHeight - 35) {
      // Professional page footer
      addEnhancedPageFooter(doc, options.title || 'Project Schedule Report');
      doc.addPage();
      currentY = 30;
      
      // Repeat simplified header on new page
      addSimplifiedHeader(doc, currentY, margin, taskNameWidth, columnWidths, timelineStartX, options.title || 'Project Schedule Report');
      currentY += 25;
    }
    
    const project = projects.find(p => p.id === task.projectId);
    const isEvenRow = index % 2 === 0;
    
    // Enhanced row styling with subtle alternating colors
    if (isEvenRow) {
      doc.setFillColor(252, 252, 252);
    } else {
      doc.setFillColor(248, 250, 252);
    }
    doc.rect(margin, currentY, pageWidth - margin * 2, rowHeight, 'F');
    
    // Row border
    doc.setDrawColor(229, 231, 235);
    doc.setLineWidth(0.25);
    doc.line(margin, currentY + rowHeight, pageWidth - margin, currentY + rowHeight);
    
    // Task information with enhanced typography
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(30, 41, 59);
    
    // Task name with better truncation
    const maxTaskNameLength = 35;
    const taskName = task.title.length > maxTaskNameLength ? task.title.substring(0, maxTaskNameLength - 3) + '...' : task.title;
    doc.text(taskName, margin + 3, currentY + 9);
    
    // Project indicator
    if (project) {
      const rgb = hexToRgb(project.color);
      if (rgb) {
        doc.setFillColor(rgb.r, rgb.g, rgb.b);
        doc.circle(margin + 3, currentY + 3, 1.5, 'F');
      }
    }
    
    // Enhanced date and information formatting
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    
    const startDateX = margin + taskNameWidth + 3;
    doc.text(format(task.startDate, 'MM/dd/yy'), startDateX, currentY + 9);
    
    const finishDateX = startDateX + columnWidths.start;
    doc.text(format(task.endDate, 'MM/dd/yy'), finishDateX, currentY + 9);
    
    const businessDays = getBusinessDaysBetween(task.startDate, task.endDate);
    const durationX = finishDateX + columnWidths.finish;
    doc.text(`${businessDays}d`, durationX + 3, currentY + 9);
    
    const progressX = durationX + columnWidths.duration;
    doc.text(`${task.progress}%`, progressX + 3, currentY + 9);
    
    // Status with color coding
    const statusX = progressX + columnWidths.progress;
    const statusColor = getStatusColor(task.status);
    doc.setTextColor(statusColor.r, statusColor.g, statusColor.b);
    doc.setFont('helvetica', 'bold');
    doc.text(task.status.toUpperCase(), statusX + 2, currentY + 9);
    doc.setFont('helvetica', 'normal');
    
    // Enhanced Gantt bar with professional styling
    const taskStartPos = Math.max(0, differenceInDays(task.startDate, dateRange.from));
    const taskDuration = differenceInDays(task.endDate, task.startDate) + 1;
    
    if (taskStartPos < visibleDays) {
      const barX = timelineStartX + taskStartPos * dateColumnWidth;
      const barWidth = Math.min(taskDuration * dateColumnWidth, (visibleDays - taskStartPos) * dateColumnWidth);
      
      if (barWidth > 2) {
        const color = project?.color || '#3b82f6';
        const rgb = hexToRgb(color);
        if (rgb) {
          // Task bar with enhanced visual effects
          doc.setFillColor(rgb.r, rgb.g, rgb.b);
          doc.roundedRect(barX + 1, currentY + 3, barWidth - 2, rowHeight - 6, 1, 1, 'F');
          
          // Progress overlay with gradient effect
          if (options.showProgress && task.progress > 0) {
            doc.setFillColor(Math.max(0, rgb.r - 50), Math.max(0, rgb.g - 50), Math.max(0, rgb.b - 50));
            const progressWidth = ((barWidth - 2) * task.progress) / 100;
            doc.roundedRect(barX + 1, currentY + 3, progressWidth, rowHeight - 6, 1, 1, 'F');
          }
          
          // Enhanced border with shadow effect
          doc.setDrawColor(Math.max(0, rgb.r - 70), Math.max(0, rgb.g - 70), Math.max(0, rgb.b - 70));
          doc.setLineWidth(0.75);
          doc.roundedRect(barX + 1, currentY + 3, barWidth - 2, rowHeight - 6, 1, 1);
          
          // Task label on bar if space allows
          if (barWidth > 30) {
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(7);
            doc.setFont('helvetica', 'bold');
            const labelText = `${task.progress}%`;
            const labelWidth = doc.getTextWidth(labelText);
            doc.text(labelText, barX + (barWidth - labelWidth) / 2, currentY + 8);
          }
        }
      }
    }
    
    currentY += rowHeight;
  });
  
  // Enhanced professional legend and summary
  addEnhancedLegend(doc, currentY + 10, options, tasks, projects);
  
  // Final page footer
  addEnhancedPageFooter(doc, options.title || 'Project Schedule Report');
  
  return doc;
};

export const generateProfessionalExcel = (
  tasks: Task[],
  projects: Project[],
  dateRange: { from: Date; to: Date },
  options: ExportOptions = {}
) => {
  const workbook = XLSX.utils.book_new();
  
  // Executive Summary Sheet with enhanced formatting
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

// Enhanced helper functions for professional formatting
function addEnhancedPageFooter(doc: jsPDF, reportTitle: string) {
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 15;
  
  // Professional footer design
  doc.setFillColor(248, 249, 250);
  doc.rect(0, pageHeight - 25, pageWidth, 25, 'F');
  
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.line(margin, pageHeight - 25, pageWidth - margin, pageHeight - 25);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  
  // Company info (left)
  doc.text('Confidential - ' + reportTitle, margin, pageHeight - 15);
  doc.text(`Generated on ${format(new Date(), 'MM/dd/yyyy')} at ${format(new Date(), 'HH:mm')}`, margin, pageHeight - 8);
  
  // Page number (right)
  const pageNum = `Page ${doc.getCurrentPageInfo().pageNumber}`;
  const pageNumWidth = doc.getTextWidth(pageNum);
  doc.text(pageNum, pageWidth - margin - pageNumWidth, pageHeight - 15);
  
  // Website/contact (right)
  doc.text('www.company.com', pageWidth - margin - 40, pageHeight - 8);
}

function addSimplifiedHeader(doc: jsPDF, startY: number, margin: number, taskNameWidth: number, columnWidths: any, timelineStartX: number, title: string) {
  const headerHeight = 20;
  
  doc.setFillColor(241, 245, 249);
  doc.rect(margin, startY, doc.internal.pageSize.width - margin * 2, headerHeight, 'F');
  
  doc.setDrawColor(203, 213, 225);
  doc.setLineWidth(0.5);
  doc.rect(margin, startY, doc.internal.pageSize.width - margin * 2, headerHeight);
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(51, 65, 85);
  
  doc.text('TASK', margin + 3, startY + 8);
  doc.text('START', margin + taskNameWidth + 8, startY + 8);
  doc.text('FINISH', margin + taskNameWidth + columnWidths.start + 8, startY + 8);
  doc.text('DAYS', margin + taskNameWidth + columnWidths.start + columnWidths.finish + 8, startY + 8);
  doc.text('PROGRESS', margin + taskNameWidth + columnWidths.start + columnWidths.finish + columnWidths.duration + 3, startY + 8);
  doc.text('TIMELINE', timelineStartX + 10, startY + 8);
  
  doc.text(title + ' (Continued)', margin + 3, startY + 15);
}

function addEnhancedLegend(doc: jsPDF, startY: number, options: ExportOptions, tasks: Task[], projects: Project[]) {
  const margin = 15;
  const pageWidth = doc.internal.pageSize.width;
  const legendHeight = 45;
  
  // Legend background
  doc.setFillColor(248, 250, 252);
  doc.rect(margin, startY, pageWidth - margin * 2, legendHeight, 'F');
  
  doc.setDrawColor(226, 232, 240);
  doc.setLineWidth(0.5);
  doc.rect(margin, startY, pageWidth - margin * 2, legendHeight);
  
  // Legend title
  doc.setFontSize(11);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(60, 60, 60);
  doc.text('LEGEND & PROJECT SUMMARY', margin + 5, startY + 8);
  
  // Legend items
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(100, 116, 139);
  
  const legendItems = [
    '• Duration calculated in business days (excludes weekends and holidays)',
    '• Task bars show project timeline with color-coded progress indication',
    '• Light blue columns = weekends, light red columns = holidays',
    '• Progress percentages shown as darker portions within task bars'
  ];
  
  legendItems.forEach((item, index) => {
    doc.text(item, margin + 5, startY + 15 + (index * 4));
  });
  
  // Project color legend
  doc.setFont('helvetica', 'bold');
  doc.text('PROJECT COLORS:', margin + 5, startY + 35);
  
  doc.setFont('helvetica', 'normal');
  let legendX = margin + 70;
  projects.slice(0, 8).forEach((project, index) => {
    const rgb = hexToRgb(project.color);
    if (rgb) {
      doc.setFillColor(rgb.r, rgb.g, rgb.b);
      doc.circle(legendX, startY + 33, 2, 'F');
      doc.text(project.name.substring(0, 12), legendX + 5, startY + 35);
      legendX += 60;
      
      if (index === 3) {
        legendX = margin + 70;
        startY += 6;
      }
    }
  });
}

function getStatusColor(status: string) {
  switch (status) {
    case 'Completed': return { r: 34, g: 197, b: 94 };
    case 'In Progress': return { r: 59, g: 130, b: 246 };
    case 'On Hold': return { r: 245, g: 158, b: 11 };
    case 'Not Started': return { r: 156, g: 163, b: 175 };
    default: return { r: 156, g: 163, b: 175 };
  }
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
