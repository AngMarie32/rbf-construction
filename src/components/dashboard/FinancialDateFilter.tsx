
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface FinancialDateFilterProps {
  onFilterChange: (filter: { type: 'year' | 'month' | 'custom'; value?: string }) => void;
  currentFilter: { type: 'year' | 'month' | 'custom'; value?: string };
}

export function FinancialDateFilter({ onFilterChange, currentFilter }: FinancialDateFilterProps) {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const lastMonth = currentMonth === 0 ? 11 : currentMonth - 1;
  const lastMonthYear = currentMonth === 0 ? currentYear - 1 : currentYear;

  const months = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const quickFilters = [
    { label: 'This Year', type: 'year' as const, value: currentYear.toString() },
    { label: 'This Month', type: 'month' as const, value: `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}` },
    { label: 'Last Month', type: 'month' as const, value: `${lastMonthYear}-${(lastMonth + 1).toString().padStart(2, '0')}` }
  ];

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
