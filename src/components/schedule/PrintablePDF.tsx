
import { forwardRef } from 'react';
import { Task } from '@/types';
import { format, differenceInDays } from 'date-fns';
import { getBusinessDaysBetween } from '@/utils/businessDays';

interface Project {
  id: string;
  name: string;
  color: string;
}

interface PrintablePDFProps {
  tasks: Task[];
  projects: Project[];
  dateRange: { from: Date; to: Date };
  title?: string;
}

export const PrintablePDF = forwardRef<HTMLDivElement, PrintablePDFProps>(
  ({ tasks, projects, dateRange, title = 'Project Schedule Report' }, ref) => {
    const getProjectName = (projectId: string) => {
      const project = projects.find(p => p.id === projectId);
      return project?.name || 'Unknown Project';
    };

    const getProjectColor = (projectId: string) => {
      const project = projects.find(p => p.id === projectId);
      return project?.color || '#3b82f6';
    };

    return (
      <div ref={ref} className="print-container bg-white text-black">
        <style>{`
          @media print {
            .print-container {
              font-size: 12px;
              line-height: 1.4;
              color: black !important;
              background: white !important;
            }
            
            .print-header {
              background: #1e40af !important;
              color: white !important;
              padding: 20px;
              margin-bottom: 20px;
              border-radius: 0;
            }
            
            .print-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 20px;
            }
            
            .print-table th,
            .print-table td {
              border: 1px solid #d1d5db;
              padding: 8px;
              text-align: left;
            }
            
            .print-table th {
              background: #f3f4f6 !important;
              font-weight: bold;
            }
            
            .print-table tr:nth-child(even) {
              background: #f9fafb !important;
            }
            
            .page-break {
              page-break-before: always;
            }
            
            .no-print {
              display: none !important;
            }
          }
          
          .print-container {
            max-width: 8.5in;
            margin: 0 auto;
            padding: 0.5in;
            font-family: Arial, sans-serif;
          }
        `}</style>

        {/* Header */}
        <div className="print-header bg-blue-700 text-white p-5 mb-6 rounded-lg">
          <h1 className="text-2xl font-bold mb-2">{title}</h1>
          <div className="text-sm">
            <p>Report Period: {format(dateRange.from, 'MMM dd, yyyy')} - {format(dateRange.to, 'MMM dd, yyyy')}</p>
            <p>Generated: {format(new Date(), 'MMM dd, yyyy HH:mm')}</p>
          </div>
        </div>

        {/* Executive Summary */}
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-4 pb-2 border-b-2 border-gray-300">EXECUTIVE SUMMARY</h2>
          <table className="print-table">
            <tbody>
              <tr>
                <td className="font-semibold bg-gray-50">Total Tasks</td>
                <td>{tasks.length}</td>
              </tr>
              <tr>
                <td className="font-semibold bg-gray-50">Active Projects</td>
                <td>{projects.length}</td>
              </tr>
              <tr>
                <td className="font-semibold bg-gray-50">Completed Tasks</td>
                <td>{tasks.filter(t => t.status === 'Completed').length}</td>
              </tr>
              <tr>
                <td className="font-semibold bg-gray-50">In Progress Tasks</td>
                <td>{tasks.filter(t => t.status === 'In Progress').length}</td>
              </tr>
              <tr>
                <td className="font-semibold bg-gray-50">Average Progress</td>
                <td>{Math.round(tasks.reduce((sum, t) => sum + t.progress, 0) / tasks.length)}%</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Project Breakdown */}
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-4 pb-2 border-b-2 border-gray-300">PROJECT BREAKDOWN</h2>
          <table className="print-table">
            <thead>
              <tr>
                <th>Project Name</th>
                <th>Total Tasks</th>
                <th>Completed</th>
                <th>In Progress</th>
                <th>Avg Progress</th>
              </tr>
            </thead>
            <tbody>
              {projects.map(project => {
                const projectTasks = tasks.filter(t => t.projectId === project.id);
                const completed = projectTasks.filter(t => t.status === 'Completed').length;
                const inProgress = projectTasks.filter(t => t.status === 'In Progress').length;
                const avgProgress = projectTasks.length > 0 
                  ? Math.round(projectTasks.reduce((sum, t) => sum + t.progress, 0) / projectTasks.length) 
                  : 0;
                
                return (
                  <tr key={project.id}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: project.color }}
                        />
                        {project.name}
                      </div>
                    </td>
                    <td>{projectTasks.length}</td>
                    <td>{completed}</td>
                    <td>{inProgress}</td>
                    <td>{avgProgress}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Task Schedule */}
        <div className="page-break mb-8">
          <h2 className="text-lg font-bold mb-4 pb-2 border-b-2 border-gray-300">TASK SCHEDULE</h2>
          <table className="print-table">
            <thead>
              <tr>
                <th>Task Name</th>
                <th>Project</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Duration (Days)</th>
                <th>Status</th>
                <th>Progress</th>
              </tr>
            </thead>
            <tbody>
              {tasks.map(task => {
                const project = projects.find(p => p.id === task.projectId);
                const businessDays = getBusinessDaysBetween(task.startDate, task.endDate);
                
                return (
                  <tr key={task.id}>
                    <td className="max-w-32">
                      <div className="truncate" title={task.title}>
                        {task.title.length > 30 ? task.title.substring(0, 30) + '...' : task.title}
                      </div>
                    </td>
                    <td>{project?.name || 'Unknown'}</td>
                    <td>{format(task.startDate, 'MM/dd/yy')}</td>
                    <td>{format(task.endDate, 'MM/dd/yy')}</td>
                    <td>{businessDays}</td>
                    <td>
                      <span className={`px-2 py-1 rounded text-xs ${
                        task.status === 'Completed' ? 'bg-green-100 text-green-800' :
                        task.status === 'In Progress' ? 'bg-blue-100 text-blue-800' :
                        task.status === 'On Hold' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {task.status}
                      </span>
                    </td>
                    <td>{task.progress}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Footer */}
        <div className="mt-8 pt-4 border-t-2 border-gray-300 text-sm text-gray-600">
          <div className="flex justify-between">
            <span>Project Schedule Report</span>
            <span>Page 1 of 1</span>
          </div>
          <div className="text-center mt-2">
            Generated on {format(new Date(), 'MMMM dd, yyyy')} at {format(new Date(), 'HH:mm')}
          </div>
        </div>
      </div>
    );
  }
);

PrintablePDF.displayName = 'PrintablePDF';
