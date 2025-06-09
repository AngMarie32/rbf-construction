
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
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

export const exportGanttToPDF = async (
  tasks: Task[], 
  projects: Project[], 
  projectData?: any,
  filename: string = 'project-schedule.pdf'
) => {
  try {
    const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape orientation
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    
    // Header with project info
    pdf.setFontSize(20);
    pdf.setFont('helvetica', 'bold');
    pdf.text('Project Schedule', 20, 25);
    
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
    
    // Try to capture the Gantt chart
    const ganttElement = document.querySelector('#gantt-chart .space-y-6') as HTMLElement;
    if (ganttElement) {
      // Temporarily modify styles for better PDF output
      const originalOverflow = ganttElement.style.overflow;
      const originalMaxHeight = ganttElement.style.maxHeight;
      
      ganttElement.style.overflow = 'visible';
      ganttElement.style.maxHeight = 'none';
      
      const canvas = await html2canvas(ganttElement, {
        scale: 1,
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff',
        width: ganttElement.scrollWidth,
        height: ganttElement.scrollHeight
      });
      
      // Restore original styles
      ganttElement.style.overflow = originalOverflow;
      ganttElement.style.maxHeight = originalMaxHeight;
      
      const imgData = canvas.toDataURL('image/png');
      const imgWidth = pageWidth - 40;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      
      // Add chart to PDF, split across pages if needed
      let yPosition = 70;
      const maxHeightPerPage = pageHeight - 90;
      
      if (imgHeight <= maxHeightPerPage) {
        pdf.addImage(imgData, 'PNG', 20, yPosition, imgWidth, imgHeight);
      } else {
        // Split image across multiple pages
        const pagesNeeded = Math.ceil(imgHeight / maxHeightPerPage);
        for (let i = 0; i < pagesNeeded; i++) {
          if (i > 0) pdf.addPage();
          
          const sourceY = i * maxHeightPerPage * (canvas.height / imgHeight);
          const sourceHeight = Math.min(maxHeightPerPage * (canvas.height / imgHeight), canvas.height - sourceY);
          
          // Create a new canvas for this page section
          const pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvas.width;
          pageCanvas.height = sourceHeight;
          const ctx = pageCanvas.getContext('2d');
          
          if (ctx) {
            ctx.drawImage(canvas, 0, sourceY, canvas.width, sourceHeight, 0, 0, canvas.width, sourceHeight);
            const pageImgData = pageCanvas.toDataURL('image/png');
            const pageImgHeight = (sourceHeight * imgWidth) / canvas.width;
            pdf.addImage(pageImgData, 'PNG', 20, i === 0 ? yPosition : 20, imgWidth, pageImgHeight);
          }
        }
      }
    } else {
      // Fallback: Create a table-style schedule
      let yPos = 70;
      
      // Table headers
      pdf.setFontSize(10);
      pdf.setFont('helvetica', 'bold');
      pdf.text('Task Name', 20, yPos);
      pdf.text('Start Date', 100, yPos);
      pdf.text('End Date', 150, yPos);
      pdf.text('Progress', 200, yPos);
      pdf.text('Status', 240, yPos);
      
      yPos += 10;
      pdf.line(20, yPos - 5, pageWidth - 20, yPos - 5);
      
      // Task rows
      pdf.setFont('helvetica', 'normal');
      tasks.forEach((task, index) => {
        if (yPos > pageHeight - 30) {
          pdf.addPage();
          yPos = 30;
        }
        
        const project = projects.find(p => p.id === task.projectId);
        pdf.text(task.title, 20, yPos);
        pdf.text(format(task.startDate, 'MM/dd/yyyy'), 100, yPos);
        pdf.text(format(task.endDate, 'MM/dd/yyyy'), 150, yPos);
        pdf.text(`${task.progress}%`, 200, yPos);
        pdf.text(task.status, 240, yPos);
        
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
    }
    
    pdf.save(filename);
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate PDF. Please try again.');
  }
};
