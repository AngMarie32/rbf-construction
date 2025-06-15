
import { useState, useCallback } from 'react';
import { Task } from '@/types';

export function useOptimisticUpdates(tasks: Task[], onUpdate: (taskId: string, updates: Partial<Task>) => Promise<void>) {
  const [optimisticTasks, setOptimisticTasks] = useState<Task[]>(tasks);

  const optimisticUpdate = useCallback(async (taskId: string, updates: Partial<Task>) => {
    // Apply optimistic update immediately
    setOptimisticTasks(prev => 
      prev.map(task => task.id === taskId ? { ...task, ...updates } : task)
    );

    try {
      // Perform actual update
      await onUpdate(taskId, updates);
    } catch (error) {
      // Revert on error
      setOptimisticTasks(tasks);
      throw error;
    }
  }, [tasks, onUpdate]);

  // Sync with external tasks state
  useState(() => {
    setOptimisticTasks(tasks);
  });

  return { optimisticTasks, optimisticUpdate };
}
