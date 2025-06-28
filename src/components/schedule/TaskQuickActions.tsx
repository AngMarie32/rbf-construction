
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { MoreHorizontal, Edit, Trash2, Calendar, Target } from 'lucide-react';
import { Task } from '@/types';

interface TaskQuickActionsProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onEditDependencies: (task: Task) => void;
}

export function TaskQuickActions({ task, onEdit, onDelete, onEditDependencies }: TaskQuickActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
          <MoreHorizontal className="w-3 h-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuItem onClick={() => onEdit(task)}>
          <Edit className="w-4 h-4 mr-2" />
          Edit Task
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => onEditDependencies(task)}>
          <Target className="w-4 h-4 mr-2" />
          Edit Dependencies
        </DropdownMenuItem>
        <DropdownMenuItem 
          onClick={() => onDelete(task.id)}
          className="text-red-600 focus:text-red-600"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          Delete Task
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
