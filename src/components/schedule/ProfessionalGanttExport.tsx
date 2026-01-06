
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
  
  // Professional Header
  doc.setFillColor(30, 64, 125);
  doc.rect(0, 0, pageWidth, 22, 'F');
  
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(options.title || 'PROJECT SCHEDULE REPORT', margin, 10);
  
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text(`Report Period: ${format(dateRange.from, 'MMM dd, yyyy')} - ${format(dateRange.to, 'MMM dd, yyyy')}`, margin, 17);
  doc.text(`Generated: ${format(new Date(), 'MMM dd, yyyy HH:mm')}`, pageWidth - 65, 17);

  let currentY = 32;

  // Executive Summary Table
  addSectionHeader(doc, 'EXECUTIVE SUMMARY', currentY, pageWidth, margin);
  currentY += 15;

  const summaryData = [
    ['Total Tasks', tasks.length.toString()],
    ['Active Projects', projects.length.toString()],
    ['Completed Tasks', tasks.filter(t => t.status === 'Completed').length.toString()],
    ['In Progress Tasks', tasks.filter(t => t.status === 'In Progress').length.toString()],
    ['Average Progress', Math.round(tasks.reduce((sum, t) => sum + t.progress, 0) / tasks.length) + '%']
  ];

  currentY = drawDataTable(doc, summaryData, currentY, pageWidth, margin, 2);
  currentY += 20;

  // Project Breakdown Table
  addSectionHeader(doc, 'PROJECT BREAKDOWN', currentY, pageWidth, margin);
  currentY += 15;

  const projectHeaders = ['Project Name', 'Tasks', 'Completed', 'In Progress', 'Avg Progress'];
  const projectData = projects.map(project => {
    const projectTasks = tasks.filter(t => t.projectId === project.id);
    const completed = projectTasks.filter(t => t.status === 'Completed').length;
    const inProgress = projectTasks.filter(t => t.status === 'In Progress').length;
    const avgProgress = projectTasks.length > 0 
      ? Math.round(projectTasks.reduce((sum, t) => sum + t.progress, 0) / projectTasks.length) 
      : 0;
    
    return [
      project.name,
      projectTasks.length.toString(),
      completed.toString(),
      inProgress.toString(),
      avgProgress + '%'
    ];
  });

  currentY = drawTableWithHeaders(doc, projectHeaders, projectData, currentY, pageWidth, margin);
  currentY += 20;

  // Task Schedule Table
  if (currentY > pageHeight - 100) {
    doc.addPage();
    currentY = 30;
  }

  addSectionHeader(doc, 'TASK SCHEDULE', currentY, pageWidth, margin);
  currentY += 15;

  const taskHeaders = ['Task Name', 'Project', 'Start Date', 'End Date', 'Duration (Days)', 'Status', 'Progress'];
  const taskData = tasks.map(task => {
    const project = projects.find(p => p.id === task.projectId);
    const businessDays = getBusinessDaysBetween(task.startDate, task.endDate);
    
    return [
      task.title.length > 25 ? task.title.substring(0, 25) + '...' : task.title,
      project?.name || 'Unknown',
      format(task.startDate, 'MM/dd/yy'),
      format(task.endDate, 'MM/dd/yy'),
      businessDays.toString(),
      task.status,
      task.progress + '%'
    ];
  });

  currentY = drawTableWithHeaders(doc, taskHeaders, taskData, currentY, pageWidth, margin);

  // Timeline Visualization
  if (currentY > pageHeight - 150) {
    doc.addPage();
    currentY = 30;
  }

  currentY += 30;
  addSectionHeader(doc, 'TIMELINE VISUALIZATION', currentY, pageWidth, margin);
  currentY += 15;

  drawTimelineChart(doc, tasks, projects, dateRange, currentY, pageWidth, margin);

  return doc;
};

function addSectionHeader(doc: jsPDF, title: string, y: number, pageWidth: number, margin: number) {
  doc.setFillColor(240, 242, 247);
  doc.rect(margin, y - 5, pageWidth - margin * 2, 12, 'F');
  
  doc.setDrawColor(200, 200, 200);
  doc.setLineWidth(0.5);
  doc.rect(margin, y - 5, pageWidth - margin * 2, 12);
  
  doc.setTextColor(60, 60, 60);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(title, margin + 5, y + 2);
}

function drawDataTable(doc: jsPDF, data: string[][], startY: number, pageWidth: number, margin: number, columns: number): number {
  const cellWidth = (pageWidth - margin * 2) / columns;
  const cellHeight = 8;
  let currentY = startY;
  
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  
  for (let i = 0; i < data.length; i += columns) {
    for (let j = 0; j < columns && i + j < data.length; j++) {
      const x = margin + j * cellWidth;
      
      // Cell background
      doc.setFillColor(j === 0 ? 250 : 255, j === 0 ? 250 : 255, j === 0 ? 250 : 255);
      doc.rect(x, currentY, cellWidth, cellHeight, 'F');
      
      // Cell border
      doc.setDrawColor(220, 220, 220);
      doc.rect(x, currentY, cellWidth, cellHeight);
      
      // Cell text
      doc.setTextColor(j === 0 ? 80 : 40, j === 0 ? 80 : 40, j === 0 ? 80 : 40);
      doc.setFont('helvetica', j === 0 ? 'bold' : 'normal');
      doc.text(data[i + j][0], x + 3, currentY + 5);
      doc.text(data[i + j][1], x + cellWidth - 3 - doc.getTextWidth(data[i + j][1]), currentY + 5);
    }
    currentY += cellHeight;
  }
  
  return currentY;
}

function drawTableWithHeaders(doc: jsPDF, headers: string[], data: string[][], startY: number, pageWidth: number, margin: number): number {
  const cellWidth = (pageWidth - margin * 2) / headers.length;
  const cellHeight = 8;
  let currentY = startY;
  
  // Draw headers
  doc.setFillColor(230, 235, 245);
  doc.rect(margin, currentY, pageWidth - margin * 2, cellHeight, 'F');
  
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.5);
  doc.rect(margin, currentY, pageWidth - margin * 2, cellHeight);
  
  doc.setTextColor(40, 40, 40);
  doc.setFontSize(9);
  doc.setFont('helvetica', 'bold');
  
  for (let i = 0; i < headers.length; i++) {
    const x = margin + i * cellWidth;
    doc.line(x, currentY, x, currentY + cellHeight);
    doc.text(headers[i], x + 2, currentY + 5);
  }
  
  currentY += cellHeight;
  
  // Draw data rows
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(60, 60, 60);
  
  data.forEach((row, index) => {
    const isEven = index % 2 === 0;
    
    // Row background
    doc.setFillColor(isEven ? 255 : 248, isEven ? 255 : 250, isEven ? 255 : 252);
    doc.rect(margin, currentY, pageWidth - margin * 2, cellHeight, 'F');
    
    // Row border
    doc.setDrawColor(220, 220, 220);
    doc.rect(margin, currentY, pageWidth - margin * 2, cellHeight);
    
    // Cell data
    for (let i = 0; i < row.length; i++) {
      const x = margin + i * cellWidth;
      doc.line(x, currentY, x, currentY + cellHeight);
      
      const text = row[i].length > 15 ? row[i].substring(0, 15) + '...' : row[i];
      doc.text(text, x + 2, currentY + 5);
    }
    
    currentY += cellHeight;
  });
  
  return currentY;
}

function drawTimelineChart(doc: jsPDF, tasks: Task[], projects: Project[], dateRange: { from: Date; to: Date }, startY: number, pageWidth: number, margin: number) {
  const chartHeight = 100;
  const chartWidth = pageWidth - margin * 2;
  const totalDays = differenceInDays(dateRange.to, dateRange.from);
  
  // Chart background
  doc.setFillColor(250, 250, 250);
  doc.rect(margin, startY, chartWidth, chartHeight, 'F');
  
  // Chart border
  doc.setDrawColor(200, 200, 200);
  doc.rect(margin, startY, chartWidth, chartHeight);
  
  // Timeline bars
  const barHeight = Math.min(12, (chartHeight - 20) / tasks.length);
  
  tasks.forEach((task, index) => {
    const project = projects.find(p => p.id === task.projectId);
    const taskStart = Math.max(0, differenceInDays(task.startDate, dateRange.from));
    const taskDuration = differenceInDays(task.endDate, task.startDate) + 1;
    
    const barX = margin + 10 + (taskStart / totalDays) * (chartWidth - 20);
    const barWidth = Math.min((taskDuration / totalDays) * (chartWidth - 20), chartWidth - 20 - (barX - margin - 10));
    const barY = startY + 10 + index * (barHeight + 2);
    
    if (barWidth > 2) {
      // Task bar
      const rgb = hexToRgb(project?.color || '#3b82f6');
      if (rgb) {
        doc.setFillColor(rgb.r, rgb.g, rgb.b);
        doc.rect(barX, barY, barWidth, barHeight - 1, 'F');
        
        // Progress overlay
        if (task.progress > 0) {
          doc.setFillColor(Math.max(0, rgb.r - 40), Math.max(0, rgb.g - 40), Math.max(0, rgb.b - 40));
          const progressWidth = (barWidth * task.progress) / 100;
          doc.rect(barX, barY, progressWidth, barHeight - 1, 'F');
        }
      }
      
      // Task label
      doc.setTextColor(60, 60, 60);
      doc.setFontSize(7);
      doc.setFont('helvetica', 'normal');
      const taskName = task.title.length > 20 ? task.title.substring(0, 20) + '...' : task.title;
      doc.text(taskName, margin + 2, barY + barHeight - 2);
    }
  });
}

function hexToRgb(hex: string) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null;
}

export const generateProfessionalExcel = (
  tasks: Task[],
  projects: Project[],
  dateRange: { from: Date; to: Date },
  options: ExportOptions = {}
) => {
  const workbook = XLSX.utils.book_new();
  
  // Executive Summary Sheet
  const summaryData = [
    ['Metric', 'Value'],
    ['Report Title', options.title || 'Project Schedule Report'],
    ['Report Period', `${format(dateRange.from, 'MMM dd, yyyy')} - ${format(dateRange.to, 'MMM dd, yyyy')}`],
    ['Total Tasks', tasks.length],
    ['Active Projects', projects.length],
    ['Completed Tasks', tasks.filter(t => t.status === 'Completed').length],
    ['In Progress Tasks', tasks.filter(t => t.status === 'In Progress').length],
    ['Average Progress', Math.round(tasks.reduce((sum, t) => sum + t.progress, 0) / tasks.length) + '%'],
    ['Report Generated', format(new Date(), 'MMM dd, yyyy HH:mm')]
  ];
  
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Executive Summary');
  
  // Task Schedule Sheet
  const taskHeaders = ['Task Name', 'Project', 'Start Date', 'End Date', 'Duration (Days)', 'Status', 'Progress %'];
  const taskData = [taskHeaders, ...tasks.map(task => {
    const project = projects.find(p => p.id === task.projectId);
    const businessDays = getBusinessDaysBetween(task.startDate, task.endDate);
    
    return [
      task.title,
      project?.name || 'Unknown',
      format(task.startDate, 'yyyy-MM-dd'),
      format(task.endDate, 'yyyy-MM-dd'),
      businessDays,
      task.status,
      task.progress
    ];
  })];
  
  const taskSheet = XLSX.utils.aoa_to_sheet(taskData);
  XLSX.utils.book_append_sheet(workbook, taskSheet, 'Task Schedule');
  
  // Project Analysis Sheet
  const projectHeaders = ['Project Name', 'Total Tasks', 'Completed', 'In Progress', 'Avg Progress %'];
  const projectData = [projectHeaders, ...projects.map(project => {
    const projectTasks = tasks.filter(t => t.projectId === project.id);
    const completed = projectTasks.filter(t => t.status === 'Completed').length;
    const inProgress = projectTasks.filter(t => t.status === 'In Progress').length;
    const avgProgress = projectTasks.length > 0 
      ? Math.round(projectTasks.reduce((sum, t) => sum + t.progress, 0) / projectTasks.length) 
      : 0;
    
    return [
      project.name,
      projectTasks.length,
      completed,
      inProgress,
      avgProgress
    ];
  })];
  
  const projectSheet = XLSX.utils.aoa_to_sheet(projectData);
  XLSX.utils.book_append_sheet(workbook, projectSheet, 'Project Analysis');
  
  return workbook;
};
