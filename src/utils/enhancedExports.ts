
import * as XLSX from 'xlsx';
import { format, isWeekend } from 'date-fns';
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

// Common US holidays - you can expand this list as needed
const getHolidays = (year: number) => {
  return [
    new Date(year, 0, 1), // New Year's Day
    new Date(year, 6, 4), // Independence Day
    new Date(year, 10, 11), // Veterans Day
    new Date(year, 11, 25), // Christmas Day
  ];
};

const isHoliday = (date: Date) => {
  const holidays = getHolidays(date.getFullYear());
  return holidays.some(holiday => 
    holiday.getDate() === date.getDate() && 
    holiday.getMonth() === date.getMonth()
  );
};

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
            padding: 6px 8px;
            text-align: left;
            font-size: 9pt;
          }
          th { 
            background-color: #f8fafc;
            font-weight: 600;
            color: #475569;
            font-size: 9pt;
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
          .gantt-enhanced {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            overflow: hidden;
            margin: 20px 0;
          }
          .gantt-header {
            background: #f8fafc;
            border-bottom: 2px solid #e2e8f0;
            display: flex;
            font-weight: 600;
            font-size: 9pt;
          }
          .gantt-header > div {
            padding: 8px 4px;
            border-right: 1px solid #e2e8f0;
            text-align: center;
          }
          .gantt-row {
            display: flex;
            border-bottom: 1px solid #f1f5f9;
            font-size: 8pt;
          }
          .gantt-row:nth-child(even) {
            background: #f9fafb;
          }
          .gantt-row > div {
            padding: 6px 4px;
            border-right: 1px solid #e2e8f0;
          }
          .gantt-timeline {
            flex: 1;
            display: flex;
            position: relative;
            min-height: 24px;
          }
          .gantt-day {
            flex: 1;
            min-width: 20px;
            border-right: 1px solid #f1f5f9;
            text-align: center;
            font-size: 7pt;
            padding: 2px 1px;
          }
          .gantt-day.weekend {
            background-color: #eff6ff;
          }
          .gantt-day.holiday {
            background-color: #fef2f2;
            color: #dc2626;
            font-weight: 600;
          }
          .task-bar {
            position: absolute;
            height: 16px;
            top: 4px;
            border-radius: 3px;
            opacity: 0.8;
          }
          .task-bar.completed { background: #10b981; }
          .task-bar.in-progress { background: #3b82f6; }
          .task-bar.not-started { background: #9ca3af; }
          .task-bar.on-hold { background: #f59e0b; }
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

        // Calculate date range for this project
        const projectStartDate = new Date(Math.min(...project.tasks.map(t => t.startDate.getTime())));
        const projectEndDate = new Date(Math.max(...project.tasks.map(t => t.endDate.getTime())));
        const totalDays = Math.ceil((projectEndDate.getTime() - projectStartDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
        
        // Generate timeline days for Gantt visualization
        const timelineDays = [];
        for (let i = 0; i < Math.min(totalDays, 30); i++) { // Limit to 30 days for print
          const day = new Date(projectStartDate);
          day.setDate(day.getDate() + i);
          timelineDays.push(day);
        }

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
                <div class="view-title">📊 Enhanced Gantt Chart View</div>
                <div class="gantt-enhanced">
                  <div class="gantt-header">
                    <div style="width: 150px;">#  Task Name</div>
                    <div style="width: 70px;">Start</div>
                    <div style="width: 70px;">Finish</div>
                    <div style="width: 60px;">% Complete</div>
                    <div class="gantt-timeline">
                      ${timelineDays.map(day => `
                        <div class="gantt-day ${isWeekend(day) ? 'weekend' : ''} ${isHoliday(day) ? 'holiday' : ''}">
                          ${format(day, 'dd')}
                          <br><span style="font-size: 6pt;">${format(day, 'EEE')}</span>
                          ${isHoliday(day) ? '<br><span style="font-size: 5pt;">HOL</span>' : ''}
                        </div>
                      `).join('')}
                    </div>
                  </div>
                  
                  ${project.tasks.map((task, index) => {
                    const taskStart = Math.max(0, Math.ceil((task.startDate.getTime() - projectStartDate.getTime()) / (1000 * 60 * 60 * 24)));
                    const taskDuration = Math.ceil((task.endDate.getTime() - task.startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
                    const taskWidth = Math.min(100, (taskDuration / Math.min(totalDays, 30)) * 100);
                    const taskLeft = (taskStart / Math.min(totalDays, 30)) * 100;
                    
                    return `
                      <div class="gantt-row">
                        <div style="width: 150px; font-size: 8pt;">
                          <strong>${index + 1}</strong> ${task.title.length > 20 ? task.title.substring(0, 20) + '...' : task.title}
                        </div>
                        <div style="width: 70px; text-align: center;">${format(task.startDate, 'MM/dd')}</div>
                        <div style="width: 70px; text-align: center;">${format(task.endDate, 'MM/dd')}</div>
                        <div style="width: 60px; text-align: center;">
                          <strong>${task.progress}%</strong>
                          <div style="width: 100%; height: 4px; background: #e5e7eb; border-radius: 2px; margin-top: 2px;">
                            <div style="width: ${task.progress}%; height: 100%; background: #3b82f6; border-radius: 2px;"></div>
                          </div>
                        </div>
                        <div class="gantt-timeline" style="position: relative;">
                          ${timelineDays.map(day => `
                            <div class="gantt-day ${isWeekend(day) ? 'weekend' : ''} ${isHoliday(day) ? 'holiday' : ''}"></div>
                          `).join('')}
                          <div class="task-bar ${task.status.toLowerCase().replace(' ', '-')}" 
                               style="left: ${taskLeft}%; width: ${taskWidth}%; z-index: 2;">
                            <div style="width: ${task.progress}%; height: 100%; background: rgba(0,0,0,0.2); border-radius: 3px 0 0 3px;"></div>
                          </div>
                        </div>
                      </div>
                    `;
                  }).join('')}
                </div>
                
                <div style="margin-top: 10px; display: flex; gap: 20px; font-size: 8pt; color: #64748b;">
                  <div style="display: flex; align-items: center; gap: 5px;">
                    <div style="width: 12px; height: 8px; background: #eff6ff; border: 1px solid #bfdbfe;"></div>
                    <span>Weekends</span>
                  </div>
                  <div style="display: flex; align-items: center; gap: 5px;">
                    <div style="width: 12px; height: 8px; background: #fef2f2; border: 1px solid #fecaca;"></div>
                    <span>Holidays</span>
                  </div>
                  <span>• Task bars show progress with darker overlay</span>
                </div>
              </div>
            ` : ''}

            ${options.includeTaskList ? `
              <div class="view-section">
                <div class="view-title">📋 Task List</div>
                <table>
                  <thead>
                    <tr>
                      <th style="width: 25%;">Task</th>
                      <th style="width: 12%;">Start Date</th>
                      <th style="width: 12%;">End Date</th>
                      <th style="width: 12%;">Status</th>
                      <th style="width: 15%;">Progress</th>
                      ${options.includeDependencies ? '<th style="width: 24%;">Dependencies</th>' : ''}
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
              options.includeGanttChart && 'Enhanced Gantt',
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
