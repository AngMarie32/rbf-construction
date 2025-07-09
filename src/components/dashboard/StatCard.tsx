
import { ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface StatCardProps {
  title: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: ReactNode;
  className?: string;
  loading?: boolean;
}

export function StatCard({ 
  title, 
  value, 
  change, 
  changeType = 'neutral', 
  icon, 
  className,
  loading = false
}: StatCardProps) {
  return (
    <Card className={cn("animate-fade-in bg-white", className)}>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            {loading ? (
              <div className="h-8 bg-muted rounded animate-pulse mt-2"></div>
            ) : (
              <p className="text-2xl font-bold mt-2">{value}</p>
            )}
            {change && !loading && (
              <p className={cn(
                "text-sm mt-1",
                changeType === 'positive' && "text-green-600",
                changeType === 'negative' && "text-red-600",
                changeType === 'neutral' && "text-muted-foreground"
              )}>
                {change}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
