
import { Badge } from '@/components/ui/badge';
import { Shield } from 'lucide-react';

interface ProjectContingencyBadgeProps {
  contingencyType?: 'percentage' | 'dollar';
  contingencyValue?: number;
  contractValue?: number;
}

export function ProjectContingencyBadge({ 
  contingencyType = 'percentage', 
  contingencyValue = 0,
  contractValue = 0
}: ProjectContingencyBadgeProps) {
  if (!contingencyValue || contingencyValue === 0) {
    return null;
  }

  const displayValue = contingencyType === 'percentage' 
    ? `${contingencyValue}%`
    : `$${contingencyValue.toLocaleString()}`;

  const calculatedAmount = contingencyType === 'percentage'
    ? (contractValue * contingencyValue) / 100
    : contingencyValue;

  return (
    <div className="flex items-center gap-2 text-sm">
      <Badge variant="outline" className="flex items-center gap-1">
        <Shield className="w-3 h-3" />
        Contingency: {displayValue}
      </Badge>
      {contingencyType === 'percentage' && (
        <span className="text-xs text-muted-foreground">
          (${calculatedAmount.toLocaleString()})
        </span>
      )}
    </div>
  );
}
