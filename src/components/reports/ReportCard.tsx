
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Download, Eye, Calendar, TrendingUp, Trash2, MoreVertical } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface ReportCardProps {
  title: string;
  description: string;
  category: string;
  lastUpdated: string;
  onView: () => void;
  onExport: () => void;
  onDelete?: () => void;
  isLoading?: boolean;
  canDelete?: boolean;
}

export function ReportCard({ 
  title, 
  description, 
  category, 
  lastUpdated, 
  onView, 
  onExport,
  onDelete,
  isLoading = false,
  canDelete = false 
}: ReportCardProps) {
  const getCategoryColor = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'executive':
        return 'bg-gradient-to-r from-purple-500 to-purple-600 text-white';
      case 'project':
        return 'bg-gradient-to-r from-blue-500 to-blue-600 text-white';
      case 'financial':
        return 'bg-gradient-to-r from-green-500 to-green-600 text-white';
      case 'custom':
        return 'bg-gradient-to-r from-orange-500 to-orange-600 text-white';
      default:
        return 'bg-gradient-to-r from-gray-500 to-gray-600 text-white';
    }
  };

  const getCategoryIcon = (cat: string) => {
    switch (cat.toLowerCase()) {
      case 'executive':
        return '📊';
      case 'project':
        return '🏗️';
      case 'financial':
        return '💰';
      case 'custom':
        return '⚙️';
      default:
        return '📈';
    }
  };

  return (
    <Card className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-1 border-0 bg-white/80 backdrop-blur-sm overflow-hidden">
      <div className={`h-1 ${getCategoryColor(category).split(' ')[0]} ${getCategoryColor(category).split(' ')[1]} ${getCategoryColor(category).split(' ')[2]}`}></div>
      
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-2 flex-1">
            <div className="flex items-center gap-2">
              <span className="text-lg">{getCategoryIcon(category)}</span>
              <CardTitle className="text-lg font-semibold text-gray-900 group-hover:text-primary transition-colors">
                {title}
              </CardTitle>
            </div>
            <Badge 
              variant="secondary" 
              className={`text-xs font-medium ${getCategoryColor(category)} border-0 shadow-sm`}
            >
              {category.charAt(0).toUpperCase() + category.slice(1)}
            </Badge>
          </div>
          
          {canDelete && onDelete && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 w-8 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem 
                  onClick={onDelete}
                  className="text-red-600 hover:text-red-700 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Report
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
        
        <p className="text-sm text-gray-600 leading-relaxed mt-2">{description}</p>
      </CardHeader>
      
      <CardContent className="pt-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center text-xs text-gray-500 bg-gray-50 px-2 py-1 rounded-full">
            <Calendar className="w-3 h-3 mr-1" />
            Updated {lastUpdated}
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onView}
              disabled={isLoading}
              className="bg-white hover:bg-gray-50 border-gray-200 hover:border-primary/30 transition-all duration-200"
            >
              <Eye className="w-4 h-4 mr-1" />
              View
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onExport}
              disabled={isLoading}
              className="bg-white hover:bg-gray-50 border-gray-200 hover:border-green-500/30 hover:text-green-600 transition-all duration-200"
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
