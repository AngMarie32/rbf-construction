
import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { X, Search, CalendarIcon, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface Project {
  id: string;
  name: string;
  status: string;
}

interface BurnAnalysisFiltersProps {
  projects: Project[];
  selectedProjects: string[];
  onProjectToggle: (projectId: string) => void;
  costCategories: string;
  onCostCategoriesChange: (value: string) => void;
  searchTerm: string;
  onSearchTermChange: (value: string) => void;
  dateRange: { from: Date | undefined; to: Date | undefined };
  onDateRangeChange: (range: { from: Date | undefined; to: Date | undefined }) => void;
  onClearFilters: () => void;
  onExport: () => void;
}

export function BurnAnalysisFilters({
  projects,
  selectedProjects,
  onProjectToggle,
  costCategories,
  onCostCategoriesChange,
  searchTerm,
  onSearchTermChange,
  dateRange,
  onDateRangeChange,
  onClearFilters,
  onExport
}: BurnAnalysisFiltersProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);

  const handleDateRangeSelect = (range: { from: Date | undefined; to: Date | undefined } | undefined) => {
    if (range) {
      onDateRangeChange(range);
      if (range.from && range.to) {
        setIsDatePickerOpen(false);
      }
    }
  };

  const activeFiltersCount = [
    selectedProjects.length > 0,
    dateRange.from && dateRange.to,
    costCategories !== 'All',
    searchTerm.length > 0
  ].filter(Boolean).length;

  return (
    <Card>
      <CardContent className="pt-6">
        {/* Filter Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="flex items-center gap-2"
            >
              <Filter className="w-4 h-4" />
              Filters
              {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {activeFiltersCount} active
              </Badge>
            )}
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={onClearFilters}>
              <X className="w-4 h-4 mr-2" />
              Clear All
            </Button>
            <Button variant="outline" size="sm" onClick={onExport}>
              <Search className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        {/* Expandable Filters */}
        {isExpanded && (
          <div className="space-y-4 border-t pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Project Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Projects</label>
                <Select value={selectedProjects.length > 0 ? 'selected' : ''} onValueChange={() => {}}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Projects" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(project => (
                      <div key={project.id} className="flex items-center space-x-2 px-2 py-1 hover:bg-gray-50">
                        <input
                          type="checkbox"
                          checked={selectedProjects.includes(project.id)}
                          onChange={() => onProjectToggle(project.id)}
                          className="rounded"
                        />
                        <span className="text-sm">{project.name}</span>
                      </div>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Date Range */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Date Range</label>
                <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      className={cn(
                        "justify-start text-left font-normal",
                        !dateRange.from && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {dateRange.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "MMM dd, yyyy")} -{" "}
                            {format(dateRange.to, "MMM dd, yyyy")}
                          </>
                        ) : (
                          format(dateRange.from, "MMM dd, yyyy")
                        )
                      ) : (
                        "All Time"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange.from}
                      selected={dateRange}
                      onSelect={handleDateRangeSelect}
                      numberOfMonths={2}
                    />
                    <div className="p-3 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          onDateRangeChange({ from: undefined, to: undefined });
                          setIsDatePickerOpen(false);
                        }}
                        className="w-full"
                      >
                        Clear Filter
                      </Button>
                    </div>
                  </PopoverContent>
                </Popover>
              </div>

              {/* Cost Categories */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Cost Categories</label>
                <Select value={costCategories} onValueChange={onCostCategoriesChange}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Categories</SelectItem>
                    <SelectItem value="Labor">Labor</SelectItem>
                    <SelectItem value="Materials">Materials</SelectItem>
                    <SelectItem value="Equipment">Equipment</SelectItem>
                    <SelectItem value="Subcontractors">Subcontractors</SelectItem>
                    <SelectItem value="Overhead">Overhead</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Search */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                  <Input
                    placeholder="Search cost items..."
                    value={searchTerm}
                    onChange={(e) => onSearchTermChange(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
            </div>

            {/* Active Filter Tags */}
            <div className="flex flex-wrap gap-2">
              {selectedProjects.length > 0 && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {selectedProjects.length} Project{selectedProjects.length > 1 ? 's' : ''}
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => selectedProjects.forEach(id => onProjectToggle(id))}
                  />
                </Badge>
              )}
              {dateRange.from && dateRange.to && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd")}
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => onDateRangeChange({ from: undefined, to: undefined })}
                  />
                </Badge>
              )}
              {costCategories !== 'All' && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  {costCategories}
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => onCostCategoriesChange('All')}
                  />
                </Badge>
              )}
              {searchTerm && (
                <Badge variant="secondary" className="flex items-center gap-1">
                  Search: {searchTerm}
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => onSearchTermChange('')}
                  />
                </Badge>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
