
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Eye, Calendar, TrendingUp } from 'lucide-react';

interface ReportCardProps {
  title: string;
  description: string;
  category: string;
  lastUpdated: string;
  onView: () => void;
  onExport: () => void;
  isLoading?: boolean;
}

export function ReportCard({ 
  title, 
  description, 
  category, 
  lastUpdated, 
  onView, 
  onExport,
  isLoading = false 
}: ReportCardProps) {
  return (
    <Card className="hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{title}</CardTitle>
            <Badge variant="outline" className="text-xs">
              {category}
            </Badge>
          </div>
          <TrendingUp className="w-5 h-5 text-muted-foreground" />
        </div>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center text-xs text-muted-foreground">
            <Calendar className="w-3 h-3 mr-1" />
            Updated {lastUpdated}
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onView}
              disabled={isLoading}
            >
              <Eye className="w-4 h-4 mr-1" />
              View
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onExport}
              disabled={isLoading}
            >
              <Download className="w-4 h-4 mr-1" />
              Export
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
