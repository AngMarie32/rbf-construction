
import { Badge } from '@/components/ui/badge';
import { AlertTriangle, Circle, ArrowUp } from 'lucide-react';

export type TaskPriority = 'low' | 'medium' | 'high' | 'urgent';

interface TaskPriorityIndicatorProps {
  priority: TaskPriority;
  size?: 'sm' | 'md';
}

export function TaskPriorityIndicator({ priority, size = 'sm' }: TaskPriorityIndicatorProps) {
  const getPriorityConfig = (priority: TaskPriority) => {
    switch (priority) {
      case 'urgent':
        return {
          icon: AlertTriangle,
          className: 'bg-red-100 text-red-800 border-red-200',
          label: 'Urgent'
        };
      case 'high':
        return {
          icon: ArrowUp,
          className: 'bg-orange-100 text-orange-800 border-orange-200',
          label: 'High'
        };
      case 'medium':
        return {
          icon: Circle,
          className: 'bg-yellow-100 text-yellow-800 border-yellow-200',
          label: 'Medium'
        };
      case 'low':
        return {
          icon: Circle,
          className: 'bg-green-100 text-green-800 border-green-200',
          label: 'Low'
        };
    }
  };

  const config = getPriorityConfig(priority);
  const Icon = config.icon;
  const iconSize = size === 'sm' ? 'w-3 h-3' : 'w-4 h-4';

  return (
    <Badge variant="outline" className={`${config.className} text-xs`}>
      <Icon className={`${iconSize} mr-1`} />
      {config.label}
    </Badge>
  );
}
