
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

interface ReportOptions {
  includeGanttChart: boolean;
  includeTaskList: boolean;
  includeCalendarView: boolean;
  includeCriticalPath: boolean;
  includeProgress: boolean;
  includeDependencies: boolean;
  includeProjectInfo: boolean;
  dateFormat: string;
}

export const generateComprehensiveReport = (
  tasks: Task[],
  projects: Project[],
  options: ReportOptions = {
    includeGanttChart: true,
    includeTaskList: true,
    includeCalendarView: true,
    includeCriticalPath: true,
    includeProgress: true,
    includeDependencies: true,
    includeProjectInfo: true,
    dateFormat: 'yyyy-MM-dd'
  },
  title: string = 'Project Schedule Report'
): string => {
  const currentDate = format(new Date(), 'PPP');
  
  // Calculate project statistics
  const projectStats = projects.map(project => {
    const projectTasks = tasks.filter(t => t.projectId === project.id);
    const completedTasks = projectTasks.filter(t => t.status === 'Completed').length;
    const inProgressTasks = projectTasks.filter(t => t.status === 'In Progress').length;
    const avgProgress = projectTasks.length > 0 
      ? Math.round(projectTasks.reduce((sum, t) => sum + t.progress, 0) / projectTasks.length)
      : 0;

    return {
      ...project,
      totalTasks: projectTasks.length,
      completedTasks,
      inProgressTasks,
      avgProgress,
      tasks: projectTasks
    };
  });

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
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            font-size: 11pt;
            line-height: 1.4;
            color: #333;
          }
          .page-break { page-break-before: always; }
          .no-print { display: none; }
          table { 
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 20px;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
          }
          th, td { 
            border: 1px solid #e2e8f0;
            padding: 8px 12px;
            text-align: left;
            font-size: 10pt;
          }
          th { 
            background-color: #f8fafc;
            font-weight: 600;
            color: #475569;
          }
          .header {
            text-align: center;
            margin-bottom: 30px;
            border-bottom: 3px solid #3b82f6;
            padding-bottom: 20px;
          }
          .header h1 {
            color: #1e40af;
            margin-bottom: 10px;
            font-size: 24pt;
          }
          .project-section {
            margin-bottom: 40px;
            break-inside: avoid;
          }
          .project-header {
            background: linear-gradient(135deg, #3b82f6, #1e40af);
            color: white;
            padding: 15px 20px;
            border-radius: 8px 8px 0 0;
            margin-bottom: 0;
          }
          .project-title {
            font-size: 16pt;
            font-weight: 600;
            margin-bottom: 5px;
          }
          .project-info {
            background-color: #f8fafc;
            padding: 15px 20px;
            border: 1px solid #e2e8f0;
            border-top: none;
            border-radius: 0 0 8px 8px;
            margin-bottom: 20px;
          }
          .stats-grid {
            display: grid;
            grid-template-columns: repeat(4, 1fr);
            gap: 15px;
            margin: 15px 0;
          }
          .stat-item {
            text-align: center;
            padding: 10px;
            background: white;
            border-radius: 6px;
            border: 1px solid #e2e8f0;
          }
          .stat-value {
            font-size: 14pt;
            font-weight: bold;
            color: #1e40af;
          }
          .stat-label {
            font-size: 9pt;
            color: #64748b;
          }
          .view-section {
            margin-bottom: 30px;
            break-inside: avoid;
          }
          .view-title {
            font-size: 14pt;
            font-weight: 600;
            color: #374151;
            margin-bottom: 15px;
            padding-bottom: 5px;
            border-bottom: 2px solid #e5e7eb;
          }
          .progress-bar {
            width: 100%;
            height: 8px;
            background-color: #e5e7eb;
            border-radius: 4px;
            overflow: hidden;
          }
          .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #10b981, #059669);
            transition: width 0.3s ease;
          }
          .status-badge {
            padding: 2px 8px;
            border-radius: 12px;
            font-size: 8pt;
            font-weight: 500;
          }
          .status-completed { background-color: #dcfce7; color: #166534; }
          .status-in-progress { background-color: #dbeafe; color: #1d4ed8; }
          .status-not-started { background-color: #f3f4f6; color: #374151; }
          .status-on-hold { background-color: #fef3c7; color: #92400e; }
          .gantt-placeholder {
            background: linear-gradient(135deg, #f8fafc, #e2e8f0);
            border: 2px dashed #94a3b8;
            padding: 40px;
            text-align: center;
            border-radius: 8px;
            color: #64748b;
          }
          .summary-section {
            background: linear-gradient(135deg, #f0f9ff, #e0f2fe);
            padding: 20px;
            border-radius: 8px;
            border: 1px solid #0ea5e9;
          }
        }
        
        @media screen {
          body { 
            margin: 20px;
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            background-color: #f9fafb;
          }
          .print-controls {
            position: fixed;
            top: 20px;
            right: 20px;
            background: white;
            padding: 15px;
            border-radius: 8px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
            z-index: 1000;
          }
          .print-button {
            padding: 10px 20px;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 500;
            margin-right: 10px;
          }
          .print-button:hover {
            background: #2563eb;
          }
        }
      </style>
    </head>
    <body>
      <div class="print-controls no-print">
        <button class="print-button" onclick="window.print()">Print Report</button>
        <button class="print-button" onclick="window.close()" style="background: #6b7280;">Close</button>
      </div>
      
      <div class="header">
        <h1>${title}</h1>
        <p style="font-size: 12pt; color: #64748b; margin: 5px 0;">Generated on ${currentDate}</p>
        <p style="font-size: 11pt; color: #64748b;">${tasks.length} tasks across ${projects.length} projects</p>
      </div>

      ${projectStats.map(project => {
        if (project.tasks.length === 0) return '';

        return `
          <div class="project-section">
            <div class="project-header">
              <div class="project-title">${project.name}</div>
              ${project.client ? `<div style="font-size: 11pt; opacity: 0.9;">Client: ${project.client}</div>` : ''}
            </div>
            
            <div class="project-info">
              <div class="stats-grid">
                <div class="stat-item">
                  <div class="stat-value">${project.totalTasks}</div>
                  <div class="stat-label">Total Tasks</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value">${project.completedTasks}</div>
                  <div class="stat-label">Completed</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value">${project.inProgressTasks}</div>
                  <div class="stat-label">In Progress</div>
                </div>
                <div class="stat-item">
                  <div class="stat-value">${project.avgProgress}%</div>
                  <div class="stat-label">Avg Progress</div>
                </div>
              </div>
              
              ${project.contractValue ? `
                <div style="margin-top: 15px; padding-top: 15px; border-top: 1px solid #e2e8f0;">
                  <strong>Contract Value:</strong> $${project.contractValue.toLocaleString()}
                  ${project.status ? `<span style="margin-left: 20px;"><strong>Status:</strong> ${project.status}</span>` : ''}
                </div>
              ` : ''}
            </div>

            ${options.includeGanttChart ? `
              <div class="view-section">
                <div class="view-title">📊 Gantt Chart View</div>
                <div class="gantt-placeholder">
                  <strong>Gantt Chart Visualization</strong><br>
                  <span style="font-size: 10pt;">Timeline view showing task dependencies and critical path</span><br>
                  <em style="font-size: 9pt;">Project spans from ${format(new Date(Math.min(...project.tasks.map(t => t.startDate.getTime()))), options.dateFormat)} to ${format(new Date(Math.max(...project.tasks.map(t => t.endDate.getTime()))), options.dateFormat)}</em>
                </div>
              </div>
            ` : ''}

            ${options.includeTaskList ? `
              <div class="view-section">
                <div class="view-title">📋 Task List</div>
                <table>
                  <thead>
                    <tr>
                      <th style="width: 30%;">Task</th>
                      <th style="width: 12%;">Start Date</th>
                      <th style="width: 12%;">End Date</th>
                      <th style="width: 12%;">Status</th>
                      <th style="width: 15%;">Progress</th>
                      ${options.includeDependencies ? '<th style="width: 19%;">Dependencies</th>' : ''}
                    </tr>
                  </thead>
                  <tbody>
                    ${project.tasks.map(task => `
                      <tr>
                        <td><strong>${task.title}</strong></td>
                        <td>${format(task.startDate, options.dateFormat)}</td>
                        <td>${format(task.endDate, options.dateFormat)}</td>
                        <td>
                          <span class="status-badge status-${task.status.toLowerCase().replace(' ', '-')}">
                            ${task.status}
                          </span>
                        </td>
                        <td>
                          <div style="display: flex; align-items: center;">
                            <div class="progress-bar" style="width: 60px; margin-right: 8px;">
                              <div class="progress-fill" style="width: ${task.progress}%;"></div>
                            </div>
                            <span style="font-size: 9pt;">${task.progress}%</span>
                          </div>
                        </td>
                        ${options.includeDependencies ? `<td style="font-size: 9pt;">${task.dependencies?.join(', ') || 'None'}</td>` : ''}
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            ` : ''}

            ${options.includeCalendarView ? `
              <div class="view-section">
                <div class="view-title">📅 Calendar Overview</div>
                <div style="background: #f8fafc; padding: 20px; border-radius: 8px; border: 1px solid #e2e8f0;">
                  <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
                    <div>
                      <h4 style="margin: 0 0 10px 0; color: #374151;">Upcoming Tasks</h4>
                      ${project.tasks
                        .filter(t => t.startDate >= new Date() && t.status !== 'Completed')
                        .slice(0, 3)
                        .map(task => `
                          <div style="margin-bottom: 8px; padding: 8px; background: white; border-radius: 4px; border-left: 3px solid #3b82f6;">
                            <strong style="font-size: 10pt;">${task.title}</strong><br>
                            <span style="font-size: 9pt; color: #64748b;">Starts ${format(task.startDate, 'MMM dd')}</span>
                          </div>
                        `).join('') || '<em style="color: #64748b;">No upcoming tasks</em>'}
                    </div>
                    <div>
                      <h4 style="margin: 0 0 10px 0; color: #374151;">Overdue Tasks</h4>
                      ${project.tasks
                        .filter(t => t.endDate < new Date() && t.status !== 'Completed')
                        .slice(0, 3)
                        .map(task => `
                          <div style="margin-bottom: 8px; padding: 8px; background: white; border-radius: 4px; border-left: 3px solid #ef4444;">
                            <strong style="font-size: 10pt;">${task.title}</strong><br>
                            <span style="font-size: 9pt; color: #ef4444;">Due ${format(task.endDate, 'MMM dd')}</span>
                          </div>
                        `).join('') || '<em style="color: #64748b;">No overdue tasks</em>'}
                    </div>
                  </div>
                </div>
              </div>
            ` : ''}

            ${options.includeCriticalPath ? `
              <div class="view-section">
                <div class="view-title">🎯 Critical Path Analysis</div>
                <div style="background: #fef2f2; padding: 20px; border-radius: 8px; border: 1px solid #fecaca;">
                  <p style="margin: 0 0 15px 0; font-weight: 500;">Critical tasks that directly impact project completion:</p>
                  ${project.tasks
                    .filter(t => t.dependencies && t.dependencies.length > 0)
                    .slice(0, 5)
                    .map(task => `
                      <div style="margin-bottom: 10px; padding: 10px; background: white; border-radius: 4px; border-left: 3px solid #ef4444;">
                        <strong style="font-size: 10pt;">${task.title}</strong><br>
                        <span style="font-size: 9pt; color: #64748b;">
                          ${format(task.startDate, options.dateFormat)} - ${format(task.endDate, options.dateFormat)}
                          ${task.dependencies ? `• Depends on: ${task.dependencies.length} tasks` : ''}
                        </span>
                      </div>
                    `).join('') || '<em style="color: #64748b;">No critical path dependencies identified</em>'}
                </div>
              </div>
            ` : ''}
          </div>
        `;
      }).join('')}

      <div class="summary-section">
        <h3 style="margin-top: 0; color: #0f172a;">Report Summary</h3>
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; margin-top: 15px;">
          <div>
            <strong>Total Tasks:</strong> ${tasks.length}<br>
            <strong>Completed:</strong> ${tasks.filter(t => t.status === 'Completed').length}<br>
            <strong>In Progress:</strong> ${tasks.filter(t => t.status === 'In Progress').length}
          </div>
          <div>
            <strong>Projects:</strong> ${projects.length}<br>
            <strong>Active Projects:</strong> ${projectStats.filter(p => p.tasks.some(t => t.status === 'In Progress')).length}<br>
            <strong>Total Contract Value:</strong> $${projectStats.reduce((sum, p) => sum + (p.contractValue || 0), 0).toLocaleString()}
          </div>
          <div>
            <strong>Avg Progress:</strong> ${Math.round(tasks.reduce((sum, t) => sum + t.progress, 0) / tasks.length)}%<br>
            <strong>Report Generated:</strong> ${format(new Date(), 'PPp')}<br>
            <strong>Views Included:</strong> ${[
              options.includeGanttChart && 'Gantt',
              options.includeTaskList && 'Task List', 
              options.includeCalendarView && 'Calendar',
              options.includeCriticalPath && 'Critical Path'
            ].filter(Boolean).join(', ')}
          </div>
        </div>
      </div>

      <script>
        // Auto-print when opened in new window
        if (window.location.search.includes('autoprint=true')) {
          window.onload = function() {
            setTimeout(() => window.print(), 500);
          };
        }
      </script>
    </body>
    </html>
  `;

  return html;
};

export const generateReport = (
  tasks: Task[],
  projects: Project[],
  options: ReportOptions = {
    includeGanttChart: true,
    includeTaskList: true,
    includeCalendarView: true,
    includeCriticalPath: true,
    includeProgress: true,
    includeDependencies: true,
    includeProjectInfo: true,
    dateFormat: 'yyyy-MM-dd'
  },
  title: string = 'Project Schedule Report'
) => {
  const htmlContent = generateComprehensiveReport(tasks, projects, options, title);
  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(htmlContent);
    printWindow.document.close();
    printWindow.focus();
  }
};

// Remove the old Excel and Google Sheets export functions
