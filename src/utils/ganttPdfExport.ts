import { Task } from '@/types';
import { generateSchedulePdf } from './schedulePdf';

interface Project {
  id: string;
  name: string;
  color: string;
  client?: string;
  contractValue?: number;
  status?: string;
}

/** Schedule PDF with the company letterhead and a drawn Gantt chart (same as Schedule → Generate Report). */
export const exportGanttToPDF = async (tasks: Task[], projects: Project[], _projectData?: any, _filename?: string) => {
  await generateSchedulePdf(tasks, projects, {
    includeGanttChart: true,
    includeTaskList: true,
    includeCriticalPath: true,
    includeProgress: true,
    includeDependencies: false,
    includeProjectInfo: true,
    dateFormat: 'MM/dd/yyyy',
  });
};
