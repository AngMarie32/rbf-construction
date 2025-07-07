
import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

interface SOVItem {
  id: string;
  itemNumber: string;
  description: string;
  subcategory: string;
  scheduledValue: number;
  changeOrders: number;
  previousApplications: number;
  thisPeriod: number;
  materialsStored: number;
  totalCompletedAndStored: number;
  percentComplete: number;
  category: string;
}

interface SOVTableProps {
  sovItems: SOVItem[];
  setSovItems: React.Dispatch<React.SetStateAction<SOVItem[]>>;
  projectId: string;
  selectedApplication: string;
  onUpdateItem: (itemId: string, value: number) => void;
}

type SortField = 'itemNumber' | 'category' | 'subcategory' | 'description' | 'scheduledValue';
type SortDirection = 'asc' | 'desc' | null;

export function SOVTable({ sovItems, setSovItems, projectId, selectedApplication, onUpdateItem }: SOVTableProps) {
  const [sortField, setSortField] = useState<SortField>('itemNumber');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => 
        prev === 'asc' ? 'desc' : prev === 'desc' ? null : 'asc'
      );
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const sortedItems = useMemo(() => {
    if (!sortDirection) return sovItems;

    return [...sovItems].sort((a, b) => {
      let aValue = a[sortField];
      let bValue = b[sortField];

      // Handle numeric fields
      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      // Handle string fields
      const aStr = String(aValue || '').toLowerCase();
      const bStr = String(bValue || '').toLowerCase();
      
      if (sortDirection === 'asc') {
        return aStr.localeCompare(bStr);
      } else {
        return bStr.localeCompare(aStr);
      }
    });
  }, [sovItems, sortField, sortDirection]);

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ChevronsUpDown className="w-4 h-4 text-gray-400" />;
    }
    if (sortDirection === 'asc') {
      return <ChevronUp className="w-4 h-4 text-blue-600" />;
    } else if (sortDirection === 'desc') {
      return <ChevronDown className="w-4 h-4 text-blue-600" />;
    }
    return <ChevronsUpDown className="w-4 h-4 text-gray-400" />;
  };

  const handleThisPeriodChange = (itemId: string, value: string) => {
    const numericValue = parseFloat(value) || 0;
    onUpdateItem(itemId, numericValue);
    
    setSovItems(prev => prev.map(item => 
      item.id === itemId 
        ? { 
            ...item, 
            thisPeriod: numericValue,
            totalCompletedAndStored: item.previousApplications + numericValue + item.materialsStored
          }
        : item
    ));
  };

  return (
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-16">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('itemNumber')}
                className="h-8 p-0 font-medium hover:bg-transparent"
              >
                Item #
                {getSortIcon('itemNumber')}
              </Button>
            </TableHead>
            <TableHead className="w-32">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('category')}
                className="h-8 p-0 font-medium hover:bg-transparent"
              >
                Category
                {getSortIcon('category')}
              </Button>
            </TableHead>
            <TableHead className="w-32">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('subcategory')}
                className="h-8 p-0 font-medium hover:bg-transparent"
              >
                Subcategory
                {getSortIcon('subcategory')}
              </Button>
            </TableHead>
            <TableHead className="min-w-[300px]">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('description')}
                className="h-8 p-0 font-medium hover:bg-transparent"
              >
                Description
                {getSortIcon('description')}
              </Button>
            </TableHead>
            <TableHead className="w-24">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleSort('scheduledValue')}
                className="h-8 p-0 font-medium hover:bg-transparent"
              >
                Scheduled Value
                {getSortIcon('scheduledValue')}
              </Button>
            </TableHead>
            <TableHead className="w-24">Change Orders</TableHead>
            <TableHead className="w-24">Previous Apps</TableHead>
            <TableHead className="w-32">This Period</TableHead>
            <TableHead className="w-24">Materials Stored</TableHead>
            <TableHead className="w-24">Total Complete</TableHead>
            <TableHead className="w-20">% Complete</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedItems.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.itemNumber}</TableCell>
              <TableCell>{item.category}</TableCell>
              <TableCell>{item.subcategory}</TableCell>
              <TableCell>{item.description}</TableCell>
              <TableCell>${item.scheduledValue.toLocaleString()}</TableCell>
              <TableCell>${item.changeOrders.toLocaleString()}</TableCell>
              <TableCell>${item.previousApplications.toLocaleString()}</TableCell>
              <TableCell>
                <Input
                  type="number"
                  value={item.thisPeriod}
                  onChange={(e) => handleThisPeriodChange(item.id, e.target.value)}
                  className="w-full min-w-[120px]"
                  step="0.01"
                  placeholder="Enter amount"
                />
              </TableCell>
              <TableCell>${item.materialsStored.toLocaleString()}</TableCell>
              <TableCell>${item.totalCompletedAndStored.toLocaleString()}</TableCell>
              <TableCell>{item.percentComplete.toFixed(1)}%</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
