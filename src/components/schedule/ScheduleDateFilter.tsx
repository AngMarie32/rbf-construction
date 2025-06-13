
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, ArrowLeft, Download, CalendarIcon } from 'lucide-react';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { DateRange } from 'react-day-picker';
import { addDays, subDays, startOfMonth, endOfMonth, startOfYear, endOfYear, format } from 'date-fns';
import { exportGanttToPDF } from '@/utils/ganttPdfExport';
import { Task } from '@/types';
import { cn } from '@/lib/utils';

interface ScheduleDateFilterProps {
  dateRange: DateRange | undefined;
  onDateRangeChange: (range: DateRange | undefined) => void;
  onBack: () => void;
  showDependencies: boolean;
  onShowDependenciesChange: (show: boolean) => void;
  showCriticalPath: boolean;
  onShowCriticalPathChange: (show: boolean) => void;
  showMilestones: boolean;
  onShowMilestonesChange: (show: boolean) => void;
  tasks: Task[];
  projects: any[];
  projectData: any;
}

function DatePickerWithRange({
  date,
  onDateChange,
}: {
  date: DateRange | undefined;
  onDateChange: (range: DateRange | undefined) => void;
}) {
  return (
    <div className="grid gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            id="date"
            variant="outline"
            className={cn(
              "w-[300px] justify-start text-left font-normal",
              !date && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {date?.from ? (
              date.to ? (
                <>
                  {format(date.from, "LLL dd, y")} -{" "}
                  {format(date.to, "LLL dd, y")}
                </>
              ) : (
                format(date.from, "LLL dd, y")
              )
            ) : (
              <span>Pick a date range</span>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0" align="start">
          <CalendarComponent
            initialFocus
            mode="range"
            defaultMonth={date?.from}
            selected={date}
            onSelect={onDateChange}
            numberOfMonths={2}
            className="p-3 pointer-events-auto"
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export function ScheduleDateFilter({ 
  dateRange, 
  onDateRangeChange, 
  onBack,
  showDependencies,
  onShowDependenciesChange,
  showCriticalPath,
  onShowCriticalPathChange,
  showMilestones,
  onShowMilestonesChange,
  tasks,
  projects,
  projectData
}: ScheduleDateFilterProps) {
  const [viewMode, setViewMode] = useState('month');

  const handleQuickDateSelect = (period: string) => {
    const today = new Date();
    let newRange: DateRange | undefined;

    switch (period) {
      case 'today':
        newRange = { from: today, to: today };
        break;
      case 'week':
        newRange = { from: subDays(today, 7), to: today };
        break;
      case 'month':
        newRange = { from: startOfMonth(today), to: endOfMonth(today) };
        break;
      case 'quarter':
        newRange = { from: subDays(today, 90), to: today };
        break;
      case 'year':
        newRange = { from: startOfYear(today), to: endOfYear(today) };
        break;
      case 'all':
        newRange = undefined;
        break;
    }

    onDateRangeChange(newRange);
  };

  const handleExportPDF = async () => {
    try {
      await exportGanttToPDF(tasks, projects, projectData);
    } catch (error) {
      console.error('Error exporting PDF:', error);
    }
  };

  return (
    <Card className="mb-4">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Details
            </Button>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Schedule Filters
            </CardTitle>
          </div>
          <Button variant="outline" size="sm" onClick={handleExportPDF}>
            <Download className="w-4 h-4 mr-2" />
            Export PDF
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Quick Date Filters */}
        <div>
          <Label className="text-sm font-medium mb-2 block">Quick Filters</Label>
          <div className="flex flex-wrap gap-2">
            {[
              { key: 'today', label: 'Today' },
              { key: 'week', label: 'This Week' },
              { key: 'month', label: 'This Month' },
              { key: 'quarter', label: 'This Quarter' },
              { key: 'year', label: 'This Year' },
              { key: 'all', label: 'All Time' }
            ].map(({ key, label }) => (
              <Button
                key={key}
                variant="outline"
                size="sm"
                onClick={() => handleQuickDateSelect(key)}
              >
                {label}
              </Button>
            ))}
          </div>
        </div>

        {/* Custom Date Range */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-sm font-medium mb-2 block">Custom Date Range</Label>
            <DatePickerWithRange
              date={dateRange}
              onDateChange={onDateRangeChange}
            />
          </div>

          <div>
            <Label className="text-sm font-medium mb-2 block">View Mode</Label>
            <Select value={viewMode} onValueChange={setViewMode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Day View</SelectItem>
                <SelectItem value="week">Week View</SelectItem>
                <SelectItem value="month">Month View</SelectItem>
                <SelectItem value="quarter">Quarter View</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Display Options */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Display Options</Label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="dependencies" className="text-sm">Show Dependencies</Label>
              <Switch
                id="dependencies"
                checked={showDependencies}
                onCheckedChange={onShowDependenciesChange}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="critical-path" className="text-sm">Critical Path</Label>
              <Switch
                id="critical-path"
                checked={showCriticalPath}
                onCheckedChange={onShowCriticalPathChange}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <Label htmlFor="milestones" className="text-sm">Show Milestones</Label>
              <Switch
                id="milestones"
                checked={showMilestones}
                onCheckedChange={onShowMilestonesChange}
              />
            </div>
          </div>
        </div>

        {/* Current Filter Status */}
        {dateRange && (
          <div>
            <Label className="text-sm font-medium mb-2 block">Current Filter</Label>
            <Badge variant="outline">
              {dateRange.from?.toLocaleDateString()} - {dateRange.to?.toLocaleDateString()}
            </Badge>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
