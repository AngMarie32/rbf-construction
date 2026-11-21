import { localDateISO } from './dates';

export interface GeneratedScheduleTask {
  id: string;
  title: string;
  durationDays: number;
  startOffsetDays: number;
  dependsOn: string[];
  phase: string;
  source: string;
}

export interface SchedulePreviewTask extends GeneratedScheduleTask {
  startDate: string;
  endDate: string;
}

export function parseScheduleDay(value: string): Date {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  return new Date(year, (month || 1) - 1, day || 1);
}

export function addWorkdays(value: Date, amount: number): Date {
  const date = new Date(value);
  let remaining = Math.max(0, Math.floor(amount));
  while (date.getDay() === 0 || date.getDay() === 6) date.setDate(date.getDate() + 1);
  while (remaining > 0) {
    date.setDate(date.getDate() + 1);
    if (date.getDay() !== 0 && date.getDay() !== 6) remaining -= 1;
  }
  return date;
}

/** Turn AI activity durations and predecessors into a Monday–Friday calendar for review. */
export function buildSchedulePreview(rawTasks: GeneratedScheduleTask[], projectStart: string): SchedulePreviewTask[] {
  const start = parseScheduleDay(projectStart);
  if (Number.isNaN(start.getTime())) throw new Error('Choose a valid schedule start date.');
  const preview: SchedulePreviewTask[] = [];

  rawTasks.forEach((task, index) => {
    const id = task.id || `t${index + 1}`;
    let taskStart = addWorkdays(start, Math.max(0, task.startOffsetDays || 0));
    task.dependsOn.forEach((dependencyId) => {
      const dependency = preview.find((candidate) => candidate.id === dependencyId);
      if (!dependency) return;
      const afterDependency = addWorkdays(parseScheduleDay(dependency.endDate), 1);
      if (afterDependency > taskStart) taskStart = afterDependency;
    });
    const durationDays = Math.max(1, Math.round(task.durationDays || 1));
    const endDate = addWorkdays(taskStart, durationDays - 1);
    preview.push({
      ...task,
      id,
      title: task.title.trim(),
      durationDays,
      startOffsetDays: Math.max(0, task.startOffsetDays || 0),
      dependsOn: task.dependsOn.filter((dependencyId) => preview.some((candidate) => candidate.id === dependencyId)),
      startDate: localDateISO(taskStart),
      endDate: localDateISO(endDate),
    });
  });

  return preview;
}
