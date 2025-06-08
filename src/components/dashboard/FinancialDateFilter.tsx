
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface FinancialDateFilterProps {
  onFilterChange: (filter: { 
    type: 'year' | 'month' | 'custom' | 'range'; 
    value?: string;
    startDate?: Date;
    endDate?: Date;
  }) => void;
  currentFilter: { 
    type: 'year' | 'month' | 'custom' | 'range'; 
    value?: string;
    startDate?: Date;
    endDate?: Date;
  };
}

export function FinancialDateFilter({ onFilterChange, currentFilter }: FinancialDateFilterProps) {
  const [dateRange, setDateRange] = useState<{ from: Date | undefined; to: Date | undefined }>({
    from: currentFilter.startDate,
    to: currentFilter.endDate
  });
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const quickFilters = [
    { label: 'This Year', type: 'year' as const, value: currentYear.toString() },
    { label: 'This Month', type: 'month' as const, value: `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}` },
    { label: 'Last Month', type: 'month' as const, value: `${lastMonthYear}-${(lastMonth + 1).toString().padStart(2, '0')}` }
  ];

  const handleDateRangeSelect = (range: { from: Date | undefined; to: Date | undefined } | undefined) => {
    if (range) {
      setDateRange(range);
      if (range.from && range.to) {
        onFilterChange({ 
          type: 'range', 
          startDate: range.from, 
          endDate: range.to 
        });
        setIsDatePickerOpen(false);
      }
    }
  };

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">Filter by:</span>
      <div className="flex gap-2">
        {quickFilters.map((filter) => (
          <Button
            key={filter.label}
            variant={currentFilter.type === filter.type && currentFilter.value === filter.value ? "default" : "outline"}
            size="sm"
            onClick={() => onFilterChange({ type: filter.type, value: filter.value })}
          >
            {filter.label}
          </Button>
        ))}
        
        <Popover open={isDatePickerOpen} onOpenChange={setIsDatePickerOpen}>
          <PopoverTrigger asChild>
            <Button
              variant={currentFilter.type === 'range' ? "default" : "outline"}
              size="sm"
              className={cn(
                "justify-start text-left font-normal",
                !dateRange.from && "text-muted-foreground"
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {dateRange.from ? (
                dateRange.to ? (
                  <>
                    {format(dateRange.from, "MMM dd")} - {format(dateRange.to, "MMM dd")}
                  </>
                ) : (
                  format(dateRange.from, "MMM dd, yyyy")
                )
              ) : (
                "Date Range"
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
          </PopoverContent>
        </Popover>
        
        <Button
          variant={currentFilter.type === 'custom' ? "default" : "outline"}
          size="sm"
          onClick={() => onFilterChange({ type: 'custom' })}
        >
          All Time
        </Button>
      </div>
    </div>
  );
}
