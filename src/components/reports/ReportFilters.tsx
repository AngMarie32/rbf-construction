
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DatePickerWithRange } from '@/components/ui/date-picker-with-range';
import { Filter, RotateCcw, CheckCircle } from 'lucide-react';
import { DateRange } from 'react-day-picker';

interface FieldLeader {
  id: string;
  name: string;
}

interface ReportFiltersProps {
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  selectedProjectManager: string;
  onProjectManagerChange: (manager: string) => void;
  projectManagers: FieldLeader[];
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
  projectManagers,
  onApplyFilters,
  onClearFilters
}: ReportFiltersProps) {
  return (
    <Card className="border-0 shadow-lg bg-white/90 backdrop-blur-sm">
      <CardContent className="p-8">
        <div className="flex items-center gap-2 mb-6">
          <Filter className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-semibold text-gray-900">Report Filters</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Category</label>
            <Select value={selectedCategory} onValueChange={onCategoryChange}>
              <SelectTrigger className="bg-white border-gray-200 hover:border-primary/30 transition-colors h-12">
                <SelectValue placeholder="All Categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Categories</SelectItem>
                <SelectItem value="snapshot">📋 Snapshot</SelectItem>
                <SelectItem value="project">🏗️ Project</SelectItem>
                <SelectItem value="financial">💰 Financial</SelectItem>
                <SelectItem value="labor">👥 Labor</SelectItem>
                <SelectItem value="custom">⚙️ Custom</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Date Range</label>
            <DatePickerWithRange 
              date={dateRange} 
              onDateChange={onDateRangeChange}
              className="bg-white border-gray-200 hover:border-primary/30 transition-colors"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Field Leader</label>
            <Select value={selectedProjectManager} onValueChange={onProjectManagerChange}>
              <SelectTrigger className="bg-white border-gray-200 hover:border-primary/30 transition-colors h-12">
                <SelectValue placeholder="All Field Leaders" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Field Leaders</SelectItem>
                {projectManagers.map((manager) => (
                  <SelectItem key={manager.id} value={manager.id}>
                    {manager.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex items-end gap-3">
            <Button 
              onClick={onApplyFilters}
              className="flex-1 bg-gradient-to-r from-primary to-primary-600 hover:from-primary-600 hover:to-primary-700 text-white shadow-md hover:shadow-lg transition-all duration-200 h-12"
            >
              <CheckCircle className="w-4 h-4 mr-2" />
              Apply
            </Button>
            <Button 
              variant="outline" 
              onClick={onClearFilters}
              className="bg-white hover:bg-gray-50 border-gray-200 hover:border-gray-300 transition-colors h-12 px-4"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
