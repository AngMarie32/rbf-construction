
import * as XLSX from 'xlsx';
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

interface ExportOptions {
  includeProgress: boolean;
  includeDependencies: boolean;
  includeProjectInfo: boolean;
  dateFormat: string;
}

export const exportToExcel = async (
  tasks: Task[],
  projects: Project[],
  options: ExportOptions = {
    includeProgress: true,
    includeDependencies: true,
    includeProjectInfo: true,
    dateFormat: 'yyyy-MM-dd'
  }
) => {
  try {
    // Create workbook
    const workbook = XLSX.utils.book_new();

    // Prepare task data
    const taskData = tasks.map(task => {
      const project = projects.find(p => p.id === task.projectId);
      const row: any = {
        'Task ID': task.id,
        'Task Name': task.title,
        'Project': project?.name || 'Unknown',
        'Start Date': format(task.startDate, options.dateFormat),
        'End Date': format(task.endDate, options.dateFormat),
        'Status': task.status
      };

      if (options.includeProgress) {
        row['Progress (%)'] = task.progress;
      }

      if (options.includeDependencies && task.dependencies && task.dependencies.length > 0) {
        row['Dependencies'] = task.dependencies.join(', ');
      }

      if (options.includeProjectInfo && project) {
        row['Project Client'] = project.client || '';
        row['Project Status'] = project.status || '';
        row['Contract Value'] = project.contractValue || '';
      }

      return row;
    });

    // Create tasks worksheet
    const tasksWS = XLSX.utils.json_to_sheet(taskData);
    XLSX.utils.book_append_sheet(workbook, tasksWS, 'Tasks');

    // Create projects summary worksheet
    if (options.includeProjectInfo) {
      const projectData = projects.map(project => {
        const projectTasks = tasks.filter(t => t.projectId === project.id);
        const completedTasks = projectTasks.filter(t => t.status === 'Completed').length;
        const avgProgress = projectTasks.length > 0 
          ? Math.round(projectTasks.reduce((sum, t) => sum + t.progress, 0) / projectTasks.length)
          : 0;

        return {
          'Project ID': project.id,
          'Project Name': project.name,
          'Client': project.client || '',
          'Status': project.status || '',
          'Contract Value': project.contractValue || 0,
          'Total Tasks': projectTasks.length,
          'Completed Tasks': completedTasks,
          'Average Progress (%)': avgProgress
        };
      });

      const projectsWS = XLSX.utils.json_to_sheet(projectData);
      XLSX.utils.book_append_sheet(workbook, projectsWS, 'Projects');
    }

    // Generate and download file
    const fileName = `project-schedule-${format(new Date(), 'yyyy-MM-dd-HHmm')}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    return { success: true, fileName };
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    throw new Error('Failed to export to Excel');
  }
};

export const exportToGoogleSheets = async (
  tasks: Task[],
  projects: Project[],
  options: ExportOptions = {
    includeProgress: true,
    includeDependencies: true,
    includeProjectInfo: true,
    dateFormat: 'yyyy-MM-dd'
  }
) => {
  try {
    // Create CSV data for Google Sheets
    const headers = [
      'Task ID',
      'Task Name',
      'Project',
      'Start Date',
      'End Date',
      'Status'
    ];

    if (options.includeProgress) {
      headers.push('Progress (%)');
    }

    if (options.includeDependencies) {
      headers.push('Dependencies');
    }

    if (options.includeProjectInfo) {
      headers.push('Project Client', 'Project Status', 'Contract Value');
    }

    const csvData = tasks.map(task => {
      const project = projects.find(p => p.id === task.projectId);
      const row = [
        task.id,
        task.title,
        project?.name || 'Unknown',
        format(task.startDate, options.dateFormat),
        format(task.endDate, options.dateFormat),
        task.status
      ];

      if (options.includeProgress) {
        row.push(task.progress.toString());
      }

      if (options.includeDependencies) {
        row.push(task.dependencies?.join(', ') || '');
      }

      if (options.includeProjectInfo && project) {
        row.push(
          project.client || '',
          project.status || '',
          project.contractValue?.toString() || ''
        );
      }

      return row;
    });

    // Convert to CSV
    const csvContent = [
      headers.join(','),
      ...csvData.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    // Create Google Sheets import URL
    const encodedCsv = encodeURIComponent(csvContent);
    const googleSheetsUrl = `https://docs.google.com/spreadsheets/create?usp=sharing&csv=${encodedCsv}`;

    // Open in new window
    window.open(googleSheetsUrl, '_blank');

    return { success: true, url: googleSheetsUrl };
  } catch (error) {
    console.error('Error exporting to Google Sheets:', error);
    throw new Error('Failed to export to Google Sheets');
  }
};

export const generatePrintOptimizedHTML = (
  tasks: Task[],
  projects: Project[],
  title: string = 'Project Schedule Report'
): string => {
  const currentDate = format(new Date(), 'PPP');
  
  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      <style>
        @media print {
          body { 
            margin: 0.5in;
            font-family: Arial, sans-serif;
            font-size: 10pt;
            line-height: 1.2;
          }
          .page-break { page-break-before: always; }
          .no-print { display: none; }
          table { 
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
          }
          th, td { 
            border: 1px solid #ccc;
            padding: 4px 6px;
            text-align: left;
            font-size: 9pt;
          }
          th { 
            background-color: #f5f5f5;
            font-weight: bold;
          }
          .header {
            text-align: center;
            margin-bottom: 20px;
            border-bottom: 2px solid #333;
            padding-bottom: 10px;
          }
          .project-section {
            margin-bottom: 30px;
          }
          .project-title {
            font-size: 12pt;
            font-weight: bold;
            margin-bottom: 10px;
            color: #333;
          }
        }
        
        @media screen {
          body { 
            margin: 20px;
            font-family: Arial, sans-serif;
          }
          .print-button {
            position: fixed;
            top: 20px;
            right: 20px;
            padding: 10px 20px;
            background: #007bff;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          }
        }
      </style>
    </head>
    <body>
      <button class="print-button no-print" onclick="window.print()">Print Report</button>
      
      <div class="header">
        <h1>${title}</h1>
        <p>Generated on ${currentDate}</p>
      </div>

      ${projects.map(project => {
        const projectTasks = tasks.filter(t => t.projectId === project.id);
        if (projectTasks.length === 0) return '';

        return `
          <div class="project-section">
            <div class="project-title">${project.name}</div>
            ${project.client ? `<p><strong>Client:</strong> ${project.client}</p>` : ''}
            ${project.contractValue ? `<p><strong>Contract Value:</strong> $${project.contractValue.toLocaleString()}</p>` : ''}
            
            <table>
              <thead>
                <tr>
                  <th>Task</th>
                  <th>Start Date</th>
                  <th>End Date</th>
                  <th>Status</th>
                  <th>Progress</th>
                </tr>
              </thead>
              <tbody>
                ${projectTasks.map(task => `
                  <tr>
                    <td>${task.title}</td>
                    <td>${format(task.startDate, 'MM/dd/yyyy')}</td>
                    <td>${format(task.endDate, 'MM/dd/yyyy')}</td>
                    <td>${task.status}</td>
                    <td>${task.progress}%</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          </div>
        `;
      }).join('')}

      <script>
        // Auto-print when opened in new window
        if (window.location.search.includes('autoprint=true')) {
          window.onload = function() {
            window.print();
          };
        }
      </script>
    </body>
    </html>
  `;

  return html;
};

export const printOptimizedReport = (
  tasks: Task[],
  projects: Project[],
  title: string = 'Project Schedule Report'
) => {
  const htmlContent = generatePrintOptimizedHTML(tasks, projects, title);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
  }
};
