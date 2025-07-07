
import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
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
type WorkApplicationLevel = 'line-items' | 'category' | 'division';

export function SOVTable({ sovItems, setSovItems, projectId, selectedApplication, onUpdateItem }: SOVTableProps) {
  const [sortField, setSortField] = useState<SortField>('itemNumber');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [workApplicationLevel, setWorkApplicationLevel] = useState<WorkApplicationLevel>('line-items');

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

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
      }

      const aStr = String(aValue || '').toLowerCase();
      const bStr = String(bValue || '').toLowerCase();
      
      if (sortDirection === 'asc') {
        return aStr.localeCompare(bStr);
      } else {
        return bStr.localeCompare(aStr);
      }
    });
  }, [sovItems, sortField, sortDirection]);

  const getDisplayItems = () => {
    switch (workApplicationLevel) {
      case 'line-items':
        return sortedItems.map(item => ({
          ...item,
          displayDescription: `${item.category} - ${item.subcategory} - ${item.description}`,
          isGrouped: false
        }));
      
      case 'category':
        const categoryGroups = sortedItems.reduce((acc, item) => {
          const category = item.category || 'Other';
          if (!acc[category]) {
            acc[category] = {
              id: `category-${category}`,
              itemNumber: `C-${Object.keys(acc).length + 1}`,
              category,
              subcategory: '',
              description: category,
              displayDescription: category,
              scheduledValue: 0,
              changeOrders: 0,
              previousApplications: 0,
              thisPeriod: 0,
              materialsStored: 0,
              totalCompletedAndStored: 0,
              percentComplete: 0,
              isGrouped: true,
              originalItems: []
            };
          }
          acc[category].scheduledValue += item.scheduledValue || 0;
          acc[category].changeOrders += item.changeOrders || 0;
          acc[category].previousApplications += item.previousApplications || 0;
          acc[category].thisPeriod += item.thisPeriod || 0;
          acc[category].materialsStored += item.materialsStored || 0;
          acc[category].totalCompletedAndStored += item.totalCompletedAndStored || 0;
          acc[category].originalItems.push(item.id);
          return acc;
        }, {} as Record<string, any>);
        return Object.values(categoryGroups);
      
      case 'division':
        const divisionGroups = sortedItems.reduce((acc, item) => {
          const division = item.category?.split(' ')[0] || 'General';
          if (!acc[division]) {
            acc[division] = {
              id: `division-${division}`,
              itemNumber: `D-${Object.keys(acc).length + 1}`,
              category: division,
              subcategory: '',
              description: `${division} Division`,
              displayDescription: `${division} Division`,
              scheduledValue: 0,
              changeOrders: 0,
              previousApplications: 0,
              thisPeriod: 0,
              materialsStored: 0,
              totalCompletedAndStored: 0,
              percentComplete: 0,
              isGrouped: true,
              originalItems: []
            };
          }
          acc[division].scheduledValue += item.scheduledValue || 0;
          acc[division].changeOrders += item.changeOrders || 0;
          acc[division].previousApplications += item.previousApplications || 0;
          acc[division].thisPeriod += item.thisPeriod || 0;
          acc[division].materialsStored += item.materialsStored || 0;
          acc[division].totalCompletedAndStored += item.totalCompletedAndStored || 0;
          acc[division].originalItems.push(item.id);
          return acc;
        }, {} as Record<string, any>);
        return Object.values(divisionGroups);
      
      default:
        return sortedItems;
    }
  };

  const displayItems = getDisplayItems();

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

  const handleThisPeriodChange = (itemId: string, value: string, isGrouped: boolean = false, originalItems: string[] = []) => {
    const numericValue = parseFloat(value) || 0;
    
    if (isGrouped && originalItems.length > 0) {
      // Distribute the value evenly across original items in the group
      const valuePerItem = numericValue / originalItems.length;
      originalItems.forEach(originalItemId => {
        onUpdateItem(originalItemId, valuePerItem);
      });
      
      setSovItems(prev => prev.map(item => 
        originalItems.includes(item.id)
          ? { 
              ...item, 
              thisPeriod: valuePerItem,
              totalCompletedAndStored: item.previousApplications + valuePerItem + item.materialsStored
            }
          : item
      ));
    } else {
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
    }
  };

  return (
    <div className="space-y-4">
      {/* Work Application Level Selector */}
      <Card>
        <CardHeader>
          <CardTitle>Schedule of Values Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <label htmlFor="work-level" className="text-sm font-medium">Apply Work At Level:</label>
            <Select value={workApplicationLevel} onValueChange={(value: WorkApplicationLevel) => setWorkApplicationLevel(value)}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="line-items">Line Items (Detailed)</SelectItem>
                <SelectItem value="category">Category Level</SelectItem>
                <SelectItem value="division">Division Level</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

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
          {displayItems.map((item) => (
            <TableRow key={item.id} className={item.isGrouped ? 'bg-blue-50 font-medium' : ''}>
              <TableCell className="font-medium">{item.itemNumber}</TableCell>
              <TableCell>{item.category}</TableCell>
              <TableCell>{item.subcategory}</TableCell>
              <TableCell>{workApplicationLevel === 'line-items' ? item.description : item.displayDescription}</TableCell>
              <TableCell>${item.scheduledValue.toLocaleString()}</TableCell>
              <TableCell>${item.changeOrders.toLocaleString()}</TableCell>
              <TableCell>${item.previousApplications.toLocaleString()}</TableCell>
              <TableCell>
                <Input
                  type="number"
                  value={item.thisPeriod}
                  onChange={(e) => handleThisPeriodChange(item.id, e.target.value, item.isGrouped, item.originalItems)}
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
