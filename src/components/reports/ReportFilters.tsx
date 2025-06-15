
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DateFilter } from '@/components/dashboard/DateFilter';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X, Filter } from 'lucide-react';

interface ReportFiltersProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  dateRange: { from: Date | undefined; to: Date | undefined };
  onDateRangeChange: (range: { from: Date | undefined; to: Date | undefined }) => void;
  selectedProjectManager?: string;
  onProjectManagerChange?: (pm: string) => void;
  projectManagers?: { id: string; name: string }[];
  onApplyFilters: () => void;
  onClearFilters: () => void;
}

export function ReportFilters({
  selectedCategory,
  onCategoryChange,
  dateRange,
  onDateRangeChange,
  selectedProjectManager,
  onProjectManagerChange,
  projectManagers = [],
  onApplyFilters,
  onClearFilters
}: ReportFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const activeFiltersCount = [
    selectedCategory !== 'all',
    dateRange.from || dateRange.to,
    selectedProjectManager && selectedProjectManager !== 'all'
  ].filter(Boolean).length;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CardTitle className="text-lg">Filters</CardTitle>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary">{activeFiltersCount} active</Badge>
            )}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
          >
            <Filter className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      {isExpanded && (
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-sm font-medium mb-2 block">Report Category</label>
              <Select value={selectedCategory} onValueChange={onCategoryChange}>
                <SelectTrigger>
                  <SelectValue placeholder="All Categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="executive">Executive Dashboard</SelectItem>
                  <SelectItem value="project">Project Reports</SelectItem>
                  <SelectItem value="financial">Financial Reports</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {onProjectManagerChange && (
              <div>
                <label className="text-sm font-medium mb-2 block">Project Manager</label>
                <Select value={selectedProjectManager || 'all'} onValueChange={onProjectManagerChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="All Managers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Managers</SelectItem>
                    {projectManagers.map((pm) => (
                      <SelectItem key={pm.id} value={pm.id}>
                        {pm.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div>
              <label className="text-sm font-medium mb-2 block">Date Range</label>
              <DateFilter 
                dateRange={dateRange} 
                onDateRangeChange={onDateRangeChange} 
              />
            </div>
          </div>

          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" size="sm" onClick={onClearFilters}>
              <X className="w-4 h-4 mr-1" />
              Clear All
            </Button>
            <Button size="sm" onClick={onApplyFilters}>
              Apply Filters
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}
