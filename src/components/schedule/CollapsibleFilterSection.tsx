
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { ProjectSelector } from './ProjectSelector';
import { ChevronDown, ChevronRight, ChevronLeft, Filter, Search } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Project {
  id: string;
  name: string;
  color: string;
  client?: string;
  contractValue?: number;
  status?: string;
}

interface CollapsibleFilterSectionProps {
  projects: Project[];
  selectedProjects: string[];
  onSelectionChange: (projects: string[]) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  showDependencies: boolean;
  onShowDependenciesChange: (show: boolean) => void;
  showCriticalPath: boolean;
  onShowCriticalPathChange: (show: boolean) => void;
  showMilestones: boolean;
  onShowMilestonesChange: (show: boolean) => void;
  viewMode: 'week' | 'month' | 'quarter';
  onViewModeChange: (mode: 'week' | 'month' | 'quarter') => void;
  dateRange: { from: Date; to: Date };
  onNavigateDate: (direction: 'prev' | 'next') => void;
  currentDate: Date;
}

export function CollapsibleFilterSection({
  projects,
  selectedProjects,
  onSelectionChange,
  searchQuery,
  onSearchChange,
  showDependencies,
  onShowDependenciesChange,
  showCriticalPath,
  onShowCriticalPathChange,
  showMilestones,
  onShowMilestonesChange,
  viewMode,
  onViewModeChange,
  dateRange,
  onNavigateDate,
  currentDate
}: CollapsibleFilterSectionProps) {
  const [isExpanded, setIsExpanded] = useState(true);

  const activeFiltersCount = selectedProjects.length + (searchQuery ? 1 : 0);

  return (
    <Card className="border-l-4 border-l-blue-500">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-lg">
            <Filter className="w-5 h-5 text-blue-600" />
            Filters & View Options
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-2 bg-blue-100 text-blue-800">
                {activeFiltersCount} active
              </Badge>
            )}
          </CardTitle>
          
          <div className="flex items-center gap-3">
            {/* View Mode Toggle */}
            <div className="flex items-center gap-2">
              <Label className="text-sm font-medium">View:</Label>
              <div className="flex border rounded-lg bg-gray-50">
                {['week', 'month', 'quarter'].map((mode) => (
                  <Button
                    key={mode}
                    variant={viewMode === mode ? 'default' : 'ghost'}
                    size="sm"
                    onClick={() => onViewModeChange(mode as typeof viewMode)}
                    className={cn(
                      "capitalize rounded-none first:rounded-l-lg last:rounded-r-lg text-xs px-3 py-1",
                      viewMode === mode ? "bg-blue-600 text-white" : "hover:bg-gray-100"
                    )}
                  >
                    {mode}
                  </Button>
                ))}
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="p-1"
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {isExpanded && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Search and Projects */}
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Search Tasks</Label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search by task name..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="pl-10 border-gray-300 focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Projects</Label>
                <ProjectSelector
                  projects={projects}
                  selectedProjects={selectedProjects}
                  onSelectionChange={onSelectionChange}
                />
              </div>
            </div>

            {/* Date Navigation */}
            <div className="space-y-4">
              <div>
                <Label className="text-sm font-medium text-gray-700 mb-2 block">Date Range</Label>
                <div className="flex items-center gap-2 bg-gray-50 rounded-lg p-2 border">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onNavigateDate('prev')}
                    className="h-8 w-8 p-0 hover:bg-white"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <div className="text-sm font-medium flex-1 text-center px-2">
                    {viewMode === 'week' && format(dateRange.from, 'MMM dd')}
                    {viewMode === 'month' && format(dateRange.from, 'MMM yyyy')}
                    {viewMode === 'quarter' && `Q${Math.ceil((dateRange.from.getMonth() + 1) / 3)} ${format(dateRange.from, 'yyyy')}`}
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onNavigateDate('next')}
                    className="h-8 w-8 p-0 hover:bg-white"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Display Options */}
            <div className="space-y-4">
              <Label className="text-sm font-medium text-gray-700 mb-2 block">Display Options</Label>
              <div className="space-y-3 bg-gray-50 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <Label htmlFor="dependencies" className="text-sm cursor-pointer">Dependencies</Label>
                  <Switch
                    id="dependencies"
                    checked={showDependencies}
                    onCheckedChange={onShowDependenciesChange}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="critical-path" className="text-sm cursor-pointer">Critical Path</Label>
                  <Switch
                    id="critical-path"
                    checked={showCriticalPath}
                    onCheckedChange={onShowCriticalPathChange}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="milestones" className="text-sm cursor-pointer">Milestones</Label>
                  <Switch
                    id="milestones"
                    checked={showMilestones}
                    onCheckedChange={onShowMilestonesChange}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Active Filters Display */}
          {(selectedProjects.length > 0 || searchQuery) && (
            <div className="flex flex-wrap gap-2 pt-4 border-t border-gray-200">
              <span className="text-sm font-medium text-gray-700">Active filters:</span>
              {selectedProjects.map(projectId => {
                const project = projects.find(p => p.id === projectId);
                return project ? (
                  <Badge key={projectId} variant="outline" className="flex items-center gap-1 bg-blue-50 border-blue-200 text-blue-800">
                    <div 
                      className="w-2 h-2 rounded-full" 
                      style={{ backgroundColor: project.color }}
                    />
                    {project.name}
                  </Badge>
                ) : null;
              })}
              {searchQuery && (
                <Badge variant="outline" className="bg-green-50 border-green-200 text-green-800">
                  Search: "{searchQuery}"
                </Badge>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}
