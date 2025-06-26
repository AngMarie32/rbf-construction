
import { Badge } from '@/components/ui/badge';
import { AlertTriangle } from 'lucide-react';

interface ProjectContingencyBadgeProps {
  contingencyType?: 'percentage' | 'dollar';
  contingencyValue?: number;
  projectValue?: number;
  className?: string;
}

export function ProjectContingencyBadge({ 
  contingencyType, 
  contingencyValue, 
  projectValue = 0,
  className 
}: ProjectContingencyBadgeProps) {
  if (!contingencyValue || contingencyValue === 0) {
    return null;
  }

  const formatContingency = () => {
    if (contingencyType === 'dollar') {
      return `$${contingencyValue.toLocaleString()}`;
    } else {
      const dollarAmount = (projectValue * contingencyValue) / 100;
      return `${contingencyValue}% ($${dollarAmount.toLocaleString()})`;
    }
  };

  return (
    <Badge variant="outline" className={`flex items-center gap-1 ${className}`}>
      <AlertTriangle className="w-3 h-3" />
      Contingency: {formatContingency()}
    </Badge>
  );
}
