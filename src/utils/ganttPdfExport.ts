
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { format, differenceInDays, addDays } from 'date-fns';
import { Task } from '@/types';

interface Project {
  id: string;
  name: string;
  color: string;
  client?: string;
  contractValue?: number;
  status?: string;
}

export const exportGanttToPDF = async (
  tasks: Task[], 
  projects: Project[], 
  projectData?: any,
  filename: string = 'project-schedule.pdf'
) => {
  try {
    const pdf = new jsPDF('l', 'mm', 'a4');
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    // Header with project info
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Project Schedule Report', 20, 25);
    
    // Project details
    if (projectData) {
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'normal');
      let yPos = 40;
      
      if (projectData.name) {
        pdf.text(`Project: ${projectData.name}`, 20, yPos);
        yPos += 7;
      }
      
      if (projectData.client) {
        pdf.text(`Client: ${projectData.client}`, 20, yPos);
        yPos += 7;
      }
      
      if (projectData.status) {
        pdf.text(`Status: ${projectData.status}`, 20, yPos);
        yPos += 7;
      }
      
      if (projectData.contractValue) {
        pdf.text(`Contract Value: $${projectData.contractValue.toLocaleString()}`, 20, yPos);
        yPos += 7;
      }
      
      pdf.text(`Generated: ${format(new Date(), 'PPP')}`, 20, yPos);
    }
    
    // Try to capture the Gantt chart from the page
    const ganttElement = document.querySelector('[data-testid="gantt-chart"]') as HTMLElement;
    let chartCaptured = false;
    
    if (ganttElement) {
      try {
        // Temporarily modify styles for better PDF output
        const originalStyles = {
          overflow: ganttElement.style.overflow,
          maxHeight: ganttElement.style.maxHeight,
          height: ganttElement.style.height
        };
        
        ganttElement.style.overflow = 'visible';
        ganttElement.style.maxHeight = 'none';
        ganttElement.style.height = 'auto';
        
        const canvas = await html2canvas(ganttElement, {
          scale: 1.5,
          useCORS: true,
          allowTaint: true,
          backgroundColor: '#ffffff',
          width: Math.min(ganttElement.scrollWidth, 1400),
          height: Math.min(ganttElement.scrollHeight, 800)
        });
        
        // Restore original styles
        Object.assign(ganttElement.style, originalStyles);
        
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = pageWidth - 40;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        
        // Add chart to PDF
        let yPosition = 80;
        const maxHeightPerPage = pageHeight - 100;
        
        if (imgHeight <= maxHeightPerPage) {
          pdf.addImage(imgData, 'PNG', 20, yPosition, imgWidth, Math.min(imgHeight, maxHeightPerPage));
        } else {
          // Split across pages if needed
          const ratio = maxHeightPerPage / imgHeight;
          pdf.addImage(imgData, 'PNG', 20, yPosition, imgWidth * ratio, maxHeightPerPage);
        }
        
        chartCaptured = true;
        
        // Add new page for task list
        pdf.addPage();
      } catch (error) {
        console.error('Error capturing Gantt chart:', error);
      }
    }
    
    // Add task list table (always include this)
    let yPos = chartCaptured ? 30 : 80;
    
    pdf.setFontSize(16);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Task Schedule Details', 20, yPos);
    yPos += 15;
    
    // Table headers
    pdf.setFontSize(10);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Task Name', 20, yPos);
    pdf.text('Start Date', 100, yPos);
    pdf.text('End Date', 150, yPos);
    pdf.text('Duration', 190, yPos);
    pdf.text('Progress', 220, yPos);
    pdf.text('Status', 250, yPos);
    
    yPos += 5;
    pdf.line(20, yPos, pageWidth - 20, yPos);
    yPos += 10;
    
    // Task rows
    pdf.setFont('helvetica', 'normal');
    tasks.forEach((task) => {
      if (yPos > pageHeight - 30) {
        pdf.addPage();
        yPos = 30;
      }
      
      const project = projects.find(p => p.id === task.projectId);
      const duration = differenceInDays(new Date(task.endDate), new Date(task.startDate)) + 1;
      
      // Truncate long task names
      const taskName = task.title.length > 25 ? task.title.substring(0, 22) + '...' : task.title;
      
      pdf.text(taskName, 20, yPos);
      pdf.text(format(new Date(task.startDate), 'MM/dd/yyyy'), 100, yPos);
      pdf.text(format(new Date(task.endDate), 'MM/dd/yyyy'), 150, yPos);
      pdf.text(`${duration} days`, 190, yPos);
      pdf.text(`${task.progress || 0}%`, 220, yPos);
      pdf.text(task.status, 250, yPos);
      
      yPos += 8;
    });
    
    // Add project legend if multiple projects
    const uniqueProjects = projects.filter(p => 
      tasks.some(t => t.projectId === p.id)
    );
    
    if (uniqueProjects.length > 1) {
      yPos += 10;
      pdf.setFontSize(12);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Project Legend:', 20, yPos);
      yPos += 10;
      
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'normal');
      uniqueProjects.forEach(project => {
        if (yPos > pageHeight - 20) {
          pdf.addPage();
          yPos = 30;
        }
        
        // Draw color box
        pdf.setFillColor(project.color || '#3b82f6');
        pdf.rect(20, yPos - 3, 4, 4, 'F');
        
        pdf.text(project.name, 30, yPos);
        yPos += 8;
      });
    }
    
    // Add footer with page numbers
    const totalPages = pdf.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      pdf.setPage(i);
      pdf.setFontSize(8);
      pdf.setFont('helvetica', 'normal');
      pdf.text(`Page ${i} of ${totalPages}`, pageWidth - 40, pageHeight - 10);
      pdf.text(`Generated on ${format(new Date(), 'PP')}`, 20, pageHeight - 10);
    }
    
    pdf.save(filename);
    return true;
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF. Please try again.');
  }
};
