
import * as XLSX from 'xlsx';
import { jsPDF } from 'jspdf';
import { format } from 'date-fns';
import { Task } from '@/types';

interface Project {
  id: string;
  name: string;
  color: string;
  client?: string;
  contractValue?: number;
  status?: string;
}

export interface ExportData {
  title: string;
  tasks: Task[];
  projects: Project[];
  options: {
    includeGanttChart: boolean;
    includeTaskList: boolean;
    includeProjectSummary: boolean;
    includeProgressAnalysis: boolean;
    includeCriticalPath: boolean;
    includeResourceAllocation: boolean;
    dateFormat: string;
    groupBy: 'project' | 'status' | 'none';
  };
  metadata: {
    dateRange: string;
    generatedBy: string;
    generatedAt: string;
    taskCount: number;
    projectCount: number;
  };
}

// Alternative interface for simple data exports
export interface SimpleExportData {
  title: string;
  data: any[];
  metadata: any;
}

export const exportToExcel = async (data: ExportData) => {
  const workbook = XLSX.utils.book_new();

  // Summary Sheet
  const summaryData = [
    ['Project Schedule Report'],
    [''],
    ['Report Generated:', data.metadata.generatedAt],
    ['Date Range:', data.metadata.dateRange],
    ['Total Tasks:', data.metadata.taskCount.toString()],
    ['Total Projects:', data.metadata.projectCount.toString()],
    [''],
    ['Project Summary'],
    ['Project Name', 'Total Tasks', 'Completed', 'In Progress', 'Not Started', 'Avg Progress %']
  ];

  // Add project statistics
  data.projects.forEach(project => {
    const projectTasks = data.tasks.filter(t => t.projectId === project.id);
    const completed = projectTasks.filter(t => t.status === 'Completed').length;
    const inProgress = projectTasks.filter(t => t.status === 'In Progress').length;
    const notStarted = projectTasks.filter(t => t.status === 'Not Started').length;
    const avgProgress = projectTasks.length > 0 
      ? Math.round(projectTasks.reduce((sum, t) => sum + t.progress, 0) / projectTasks.length)
      : 0;

    summaryData.push([
      project.name,
      projectTasks.length.toString(),
      completed.toString(),
      inProgress.toString(),
      notStarted.toString(),
      avgProgress.toString()
    ]);
  });

  const summaryWS = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summaryWS, 'Summary');

  // Task List Sheet
  if (data.options.includeTaskList) {
    const taskHeaders = [
      'Task ID',
      'Task Name',
      'Project',
      'Start Date',
      'End Date',
      'Duration (Days)',
      'Status',
      'Progress %',
      'Dependencies'
    ];

    const taskData = data.tasks.map(task => {
      const project = data.projects.find(p => p.id === task.projectId);
      const duration = Math.ceil((task.endDate.getTime() - task.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
      
      return [
        task.id,
        task.title,
        project?.name || 'Unknown',
        format(task.startDate, data.options.dateFormat),
        format(task.endDate, data.options.dateFormat),
        duration.toString(),
        task.status,
        task.progress.toString(),
        task.dependencies?.join(', ') || 'None'
      ];
    });

    const taskWS = XLSX.utils.aoa_to_sheet([taskHeaders, ...taskData]);
    XLSX.utils.book_append_sheet(workbook, taskWS, 'Task List');
  }

  // Progress Analysis Sheet
  if (data.options.includeProgressAnalysis) {
    const progressData = [
      ['Progress Analysis'],
      [''],
      ['Status Distribution'],
      ['Status', 'Count', 'Percentage']
    ];

    const statusCounts = {
      'Not Started': data.tasks.filter(t => t.status === 'Not Started').length,
      'In Progress': data.tasks.filter(t => t.status === 'In Progress').length,
      'On Hold': data.tasks.filter(t => t.status === 'On Hold').length,
      'Completed': data.tasks.filter(t => t.status === 'Completed').length
    };

    Object.entries(statusCounts).forEach(([status, count]) => {
      const percentage = data.tasks.length > 0 ? Math.round((count / data.tasks.length) * 100) : 0;
      progressData.push([status, count.toString(), `${percentage}%`]);
    });

    progressData.push([''], ['Overall Progress']);
    const overallProgress = data.tasks.length > 0 
      ? Math.round(data.tasks.reduce((sum, t) => sum + t.progress, 0) / data.tasks.length)
      : 0;
    progressData.push(['Average Completion', `${overallProgress}%`]);

    const progressWS = XLSX.utils.aoa_to_sheet(progressData);
    XLSX.utils.book_append_sheet(workbook, progressWS, 'Progress Analysis');
  }

  // Critical Path Analysis
  if (data.options.includeCriticalPath) {
    const criticalTasks = data.tasks.filter(task => 
      task.dependencies && task.dependencies.length > 0
    );

    const criticalData = [
      ['Critical Path Analysis'],
      [''],
      ['Critical Tasks (Tasks with Dependencies)'],
      ['Task Name', 'Start Date', 'End Date', 'Dependencies Count', 'Status', 'Risk Level']
    ];

    criticalTasks.forEach(task => {
      const riskLevel = task.status === 'On Hold' ? 'High' : 
                      task.status === 'Not Started' ? 'Medium' : 'Low';
      
      criticalData.push([
        task.title,
        format(task.startDate, data.options.dateFormat),
        format(task.endDate, data.options.dateFormat),
        (task.dependencies?.length || 0).toString(),
        task.status,
        riskLevel
      ]);
    });

    const criticalWS = XLSX.utils.aoa_to_sheet(criticalData);
    XLSX.utils.book_append_sheet(workbook, criticalWS, 'Critical Path');
  }

  // Generate and download the file
  const fileName = `${data.title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd_HHmm')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

export const exportToPDF = async (data: ExportData) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;
  const pageHeight = doc.internal.pageSize.height;
  const margin = 20;
  let yPosition = margin;

  // Helper function to add new page if needed
  const checkPageBreak = (requiredSpace: number = 30) => {
    if (yPosition + requiredSpace > pageHeight - margin) {
      doc.addPage();
      yPosition = margin;
      return true;
    }
    return false;
  };

  // Title Page
  doc.setFontSize(24);
  doc.setFont(undefined, 'bold');
  doc.text(data.title, pageWidth / 2, yPosition + 20, { align: 'center' });
  
  yPosition += 40;
  doc.setFontSize(12);
  doc.setFont(undefined, 'normal');
  doc.text(`Generated: ${data.metadata.generatedAt}`, pageWidth / 2, yPosition, { align: 'center' });
  doc.text(`Date Range: ${data.metadata.dateRange}`, pageWidth / 2, yPosition + 10, { align: 'center' });
  
  yPosition += 40;

  // Executive Summary
  checkPageBreak(60);
  doc.setFontSize(16);
  doc.setFont(undefined, 'bold');
  doc.text('Executive Summary', margin, yPosition);
  yPosition += 15;

  doc.setFontSize(10);
  doc.setFont(undefined, 'normal');
  
  const summaryStats = [
    `Total Projects: ${data.metadata.projectCount}`,
    `Total Tasks: ${data.metadata.taskCount}`,
    `Completed Tasks: ${data.tasks.filter(t => t.status === 'Completed').length}`,
    `In Progress: ${data.tasks.filter(t => t.status === 'In Progress').length}`,
    `Overall Progress: ${data.tasks.length > 0 ? Math.round(data.tasks.reduce((sum, t) => sum + t.progress, 0) / data.tasks.length) : 0}%`
  ];

  summaryStats.forEach(stat => {
    doc.text(`• ${stat}`, margin + 10, yPosition);
    yPosition += 8;
  });

  yPosition += 10;

  // Project Summary
  if (data.options.includeProjectSummary) {
    checkPageBreak(100);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Project Overview', margin, yPosition);
    yPosition += 15;

    data.projects.forEach(project => {
      checkPageBreak(40);
      const projectTasks = data.tasks.filter(t => t.projectId === project.id);
      const completed = projectTasks.filter(t => t.status === 'Completed').length;
      const avgProgress = projectTasks.length > 0 
        ? Math.round(projectTasks.reduce((sum, t) => sum + t.progress, 0) / projectTasks.length)
        : 0;

      doc.setFontSize(12);
      doc.setFont(undefined, 'bold');
      doc.text(project.name, margin, yPosition);
      yPosition += 10;

      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text(`Tasks: ${projectTasks.length} | Completed: ${completed} | Progress: ${avgProgress}%`, margin + 10, yPosition);
      yPosition += 15;
    });
  }

  // Task List
  if (data.options.includeTaskList) {
    checkPageBreak(100);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Task List', margin, yPosition);
    yPosition += 15;

    // Group tasks if specified
    let groupedTasks: { [key: string]: Task[] } = {};
    
    if (data.options.groupBy === 'project') {
      data.projects.forEach(project => {
        groupedTasks[project.name] = data.tasks.filter(t => t.projectId === project.id);
      });
    } else if (data.options.groupBy === 'status') {
      const statuses = ['Not Started', 'In Progress', 'On Hold', 'Completed'];
      statuses.forEach(status => {
        const statusTasks = data.tasks.filter(t => t.status === status);
        if (statusTasks.length > 0) {
          groupedTasks[status] = statusTasks;
        }
      });
    } else {
      groupedTasks['All Tasks'] = data.tasks;
    }

    Object.entries(groupedTasks).forEach(([groupName, tasks]) => {
      if (tasks.length === 0) return;

      checkPageBreak(30);
      if (data.options.groupBy !== 'none') {
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(groupName, margin, yPosition);
        yPosition += 10;
      }

      tasks.slice(0, 20).forEach(task => { // Limit to prevent overflow
        checkPageBreak(15);
        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        
        const taskText = `${task.title} | ${format(task.startDate, data.options.dateFormat)} - ${format(task.endDate, data.options.dateFormat)} | ${task.status} | ${task.progress}%`;
        const splitText = doc.splitTextToSize(taskText, pageWidth - 2 * margin);
        doc.text(splitText, margin + 5, yPosition);
        yPosition += splitText.length * 6 + 2;
      });

      yPosition += 10;
    });
  }

  // Critical Path Analysis
  if (data.options.includeCriticalPath) {
    checkPageBreak(60);
    doc.setFontSize(14);
    doc.setFont(undefined, 'bold');
    doc.text('Critical Path Analysis', margin, yPosition);
    yPosition += 15;

    const criticalTasks = data.tasks.filter(task => 
      task.dependencies && task.dependencies.length > 0
    );

    if (criticalTasks.length > 0) {
      doc.setFontSize(10);
      doc.setFont(undefined, 'normal');
      doc.text('Tasks with dependencies that may impact project timeline:', margin, yPosition);
      yPosition += 10;

      criticalTasks.slice(0, 10).forEach(task => {
        checkPageBreak(12);
        doc.setFontSize(9);
        const riskLevel = task.status === 'On Hold' ? 'HIGH RISK' : 
                         task.status === 'Not Started' ? 'MEDIUM RISK' : 'LOW RISK';
        doc.text(`• ${task.title} - ${riskLevel} (${task.dependencies?.length} dependencies)`, margin + 5, yPosition);
        yPosition += 8;
      });
    } else {
      doc.setFontSize(10);
      doc.text('No critical path dependencies identified.', margin, yPosition);
    }
  }

  // Save the PDF
  const fileName = `${data.title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd_HHmm')}.pdf`;
  doc.save(fileName);
};

export const exportToCSV = (data: ExportData) => {
  const csvContent = [];
  
  // Header
  csvContent.push([
    'Task ID',
    'Task Name', 
    'Project',
    'Start Date',
    'End Date',
    'Status',
    'Progress',
    'Dependencies'
  ]);

  // Task data
  data.tasks.forEach(task => {
    const project = data.projects.find(p => p.id === task.projectId);
    csvContent.push([
      task.id,
      task.title,
      project?.name || 'Unknown',
      format(task.startDate, data.options.dateFormat),
      format(task.endDate, data.options.dateFormat),
      task.status,
      task.progress.toString(),
      task.dependencies?.join('; ') || 'None'
    ]);
  });

  // Convert to CSV string
  const csvString = csvContent
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');

  // Download
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${data.title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Simple export functions for custom reports
export const exportSimpleToExcel = (data: SimpleExportData) => {
  const workbook = XLSX.utils.book_new();
  
  if (data.data.length > 0) {
    const ws = XLSX.utils.json_to_sheet(data.data);
    XLSX.utils.book_append_sheet(workbook, ws, 'Data');
  }
  
  const fileName = `${data.title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd_HHmm')}.xlsx`;
  XLSX.writeFile(workbook, fileName);
};

export const exportSimpleToPDF = async (data: SimpleExportData) => {
  const doc = new jsPDF();
  
  doc.setFontSize(18);
  doc.text(data.title, 20, 30);
  
  doc.setFontSize(10);
  doc.text(`Generated: ${data.metadata.generatedAt || new Date().toLocaleString()}`, 20, 50);
  
  // Simple data table
  if (data.data.length > 0) {
    const headers = Object.keys(data.data[0]).slice(0, 5);
    let y = 70;
    
    headers.forEach((header, index) => {
      doc.text(header, 20 + index * 30, y);
    });
    
    y += 10;
    data.data.slice(0, 20).forEach(row => {
      headers.forEach((header, index) => {
        const value = row[header]?.toString().substring(0, 15) || '';
        doc.text(value, 20 + index * 30, y);
      });
      y += 8;
    });
  }
  
  const fileName = `${data.title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd_HHmm')}.pdf`;
  doc.save(fileName);
};

export const exportSimpleToCSV = (data: SimpleExportData) => {
  if (data.data.length === 0) return;
  
  const headers = Object.keys(data.data[0]);
  const csvContent = [headers];
  
  data.data.forEach(row => {
    const values = headers.map(header => row[header]?.toString() || '');
    csvContent.push(values);
  });
  
  const csvString = csvContent
    .map(row => row.map(cell => `"${cell}"`).join(','))
    .join('\n');
    
  const blob = new Blob([csvString], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${data.title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd_HHmm')}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};

// Aliases for backward compatibility
export const generateExcelReport = exportToExcel;
export const generatePDFReport = exportToPDF;
