
import { Task } from '@/types';
import { isAfter, isBefore, isValid, parseISO } from 'date-fns';

export interface ValidationError {
  field: string;
  message: string;
  severity: 'error' | 'warning' | 'info';
  taskId?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
  info: ValidationError[];
}

export const validateTask = (task: Partial<Task>): ValidationResult => {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];
  const info: ValidationError[] = [];

  // Required fields validation
  if (!task.title || task.title.trim().length === 0) {
    errors.push({
      field: 'title',
      message: 'Task title is required',
      severity: 'error',
      taskId: task.id
    });
  }

  if (!task.projectId) {
    errors.push({
      field: 'projectId',
      message: 'Project selection is required',
      severity: 'error',
      taskId: task.id
    });
  }

  // Date validation
  if (!task.startDate || !isValid(task.startDate)) {
    errors.push({
      field: 'startDate',
      message: 'Valid start date is required',
      severity: 'error',
      taskId: task.id
    });
  }

  if (!task.endDate || !isValid(task.endDate)) {
    errors.push({
      field: 'endDate',
      message: 'Valid end date is required',
      severity: 'error',
      taskId: task.id
    });
  }

  // Date logic validation
  if (task.startDate && task.endDate && isValid(task.startDate) && isValid(task.endDate)) {
    if (isAfter(task.startDate, task.endDate)) {
      errors.push({
        field: 'dateRange',
        message: 'Start date cannot be after end date',
        severity: 'error',
        taskId: task.id
      });
    }

    // Warning for very short tasks
    const daysDiff = Math.ceil((task.endDate.getTime() - task.startDate.getTime()) / (1000 * 60 * 60 * 24));
    if (daysDiff < 1) {
      warnings.push({
        field: 'duration',
        message: 'Task duration is less than 1 day',
        severity: 'warning',
        taskId: task.id
      });
    }

    // Warning for very long tasks
    if (daysDiff > 365) {
      warnings.push({
        field: 'duration',
        message: 'Task duration exceeds 1 year',
        severity: 'warning',
        taskId: task.id
      });
    }
  }

  // Progress validation
  if (task.progress !== undefined) {
    if (task.progress < 0 || task.progress > 100) {
      errors.push({
        field: 'progress',
        message: 'Progress must be between 0 and 100',
        severity: 'error',
        taskId: task.id
      });
    }

    // Status vs progress consistency
    if (task.status === 'Completed' && task.progress < 100) {
      warnings.push({
        field: 'statusProgress',
        message: 'Task marked as completed but progress is less than 100%',
        severity: 'warning',
        taskId: task.id
      });
    }

    if (task.status === 'Not Started' && task.progress > 0) {
      warnings.push({
        field: 'statusProgress',
        message: 'Task marked as not started but has progress',
        severity: 'warning',
        taskId: task.id
      });
    }
  }

  // Dependencies validation
  if (task.dependencies && task.dependencies.length > 0) {
    // Check for self-dependency
    if (task.id && task.dependencies.includes(task.id)) {
      errors.push({
        field: 'dependencies',
        message: 'Task cannot depend on itself',
        severity: 'error',
        taskId: task.id
      });
    }

    // Info about dependency count
    if (task.dependencies.length > 5) {
      info.push({
        field: 'dependencies',
        message: `Task has ${task.dependencies.length} dependencies (consider simplifying)`,
        severity: 'info',
        taskId: task.id
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    info
  };
};

export const validateTaskList = (tasks: Task[]): ValidationResult => {
  const allErrors: ValidationError[] = [];
  const allWarnings: ValidationError[] = [];
  const allInfo: ValidationError[] = [];

  // Validate individual tasks
  tasks.forEach(task => {
    const result = validateTask(task);
    allErrors.push(...result.errors);
    allWarnings.push(...result.warnings);
    allInfo.push(...result.info);
  });

  // Cross-task validations
  const taskIds = new Set(tasks.map(t => t.id));

  tasks.forEach(task => {
    if (task.dependencies && task.dependencies.length > 0) {
      // Check for invalid dependency references
      task.dependencies.forEach(depId => {
        if (!taskIds.has(depId)) {
          allErrors.push({
            field: 'dependencies',
            message: `Task depends on non-existent task: ${depId}`,
            severity: 'error',
            taskId: task.id
          });
        }
      });

      // Check for circular dependencies (simple check)
      const visited = new Set<string>();
      const checkCircular = (currentId: string, path: string[]): boolean => {
        if (path.includes(currentId)) {
          allErrors.push({
            field: 'dependencies',
            message: `Circular dependency detected: ${path.join(' -> ')} -> ${currentId}`,
            severity: 'error',
            taskId: task.id
          });
          return true;
        }

        if (visited.has(currentId)) return false;
        visited.add(currentId);

        const currentTask = tasks.find(t => t.id === currentId);
        if (currentTask && currentTask.dependencies) {
          return currentTask.dependencies.some(depId => 
            checkCircular(depId, [...path, currentId])
          );
        }

        return false;
      };

      checkCircular(task.id, []);
    }

    // Date sequence validation with dependencies
    if (task.dependencies && task.dependencies.length > 0) {
      task.dependencies.forEach(depId => {
        const depTask = tasks.find(t => t.id === depId);
        if (depTask && isBefore(task.startDate, depTask.endDate)) {
          allWarnings.push({
            field: 'dateSequence',
            message: `Task starts before its dependency "${depTask.title}" ends`,
            severity: 'warning',
            taskId: task.id
          });
        }
      });
    }
  });

  // Project-level validations
  const projectIds = [...new Set(tasks.map(t => t.projectId))];
  projectIds.forEach(projectId => {
    const projectTasks = tasks.filter(t => t.projectId === projectId);
    
    // Check for reasonable project timeline
    if (projectTasks.length > 0) {
      const projectStart = new Date(Math.min(...projectTasks.map(t => t.startDate.getTime())));
      const projectEnd = new Date(Math.max(...projectTasks.map(t => t.endDate.getTime())));
      const projectDuration = Math.ceil((projectEnd.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24));

      if (projectDuration > 730) { // 2 years
        allInfo.push({
          field: 'projectDuration',
          message: `Project duration exceeds 2 years (${projectDuration} days)`,
          severity: 'info'
        });
      }
    }
  });

  return {
    isValid: allErrors.length === 0,
    errors: allErrors,
    warnings: allWarnings,
    info: allInfo
  };
};

export const formatValidationMessage = (error: ValidationError): string => {
  const prefix = error.taskId ? `Task ${error.taskId}: ` : '';
  return `${prefix}${error.message}`;
};

export const getValidationSummary = (result: ValidationResult): string => {
  const parts = [];
  
  if (result.errors.length > 0) {
    parts.push(`${result.errors.length} error(s)`);
  }
  
  if (result.warnings.length > 0) {
    parts.push(`${result.warnings.length} warning(s)`);
  }
  
  if (result.info.length > 0) {
    parts.push(`${result.info.length} info message(s)`);
  }

  if (parts.length === 0) {
    return 'All validations passed';
  }

  return parts.join(', ');
};
