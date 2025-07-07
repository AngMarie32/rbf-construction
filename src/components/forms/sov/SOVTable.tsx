
import React, { useState, useMemo } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ChevronUp, ChevronDown, ChevronsUpDown, Download, Trash2 } from 'lucide-react';
import { exportToCSV, exportToPDF } from '@/utils/pdfExport';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

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
  contingencyValue?: number;
}

type SortField = 'itemNumber' | 'category' | 'subcategory' | 'description' | 'scheduledValue' | 'division';
type SortDirection = 'asc' | 'desc' | null;
type BreakdownLevel = 'line-items' | 'category' | 'division';

const getDivisionFromCategory = (category: string): string => {
  if (!category) return 'Other';
  const categoryLower = category.toLowerCase();
  
  if (categoryLower.includes('site') || categoryLower.includes('earthwork') || categoryLower.includes('concrete') || categoryLower.includes('foundation') || categoryLower.includes('excavation')) {
    return 'Site';
  } else if (categoryLower.includes('building') || categoryLower.includes('structure') || categoryLower.includes('frame') || categoryLower.includes('wall') || categoryLower.includes('roof')) {
    return 'Building';
  } else if (categoryLower.includes('general') || categoryLower.includes('mobilization') || categoryLower.includes('temp') || categoryLower.includes('overhead')) {
    return 'General';
  }
  return 'Other';
};

export function SOVTable({ sovItems, setSovItems, projectId, selectedApplication, onUpdateItem, contingencyValue = 0 }: SOVTableProps) {
  const [sortField, setSortField] = useState<SortField>('itemNumber');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [breakdownLevel, setBreakdownLevel] = useState<BreakdownLevel>('line-items');

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

  const handleDeleteSOVItem = async (itemId: string) => {
    if (!confirm('Are you sure you want to delete this SOV item?')) {
      return;
    }

    try {
      const { error } = await supabase
        .from('sov_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      setSovItems(prev => prev.filter(item => item.id !== itemId));
      toast.success('SOV item deleted successfully');
    } catch (error) {
      console.error('Error deleting SOV item:', error);
      toast.error('Failed to delete SOV item');
    }
  };

  const getDisplayItems = () => {
    switch (breakdownLevel) {
      case 'line-items':
        return sovItems.filter(item => item.description?.trim() || (item.scheduledValue > 0)).map(item => ({
          ...item,
          displayDescription: item.subcategory || item.description,
          displayCategory: item.category,
          displayDivision: getDivisionFromCategory(item.category),
          displaySubcategory: item.subcategory || 'N/A'
        }));
      
      case 'category':
        const categoryGroups = sovItems.reduce((acc, item) => {
          const category = item.category || 'Other';
          if (!acc[category]) {
            acc[category] = {
              id: `category-${category}`,
              itemNumber: `${Object.keys(acc).length + 1}`,
              displayDescription: category,
              displayCategory: category,
              displayDivision: getDivisionFromCategory(category),
              displaySubcategory: 'Category Summary',
              scheduledValue: 0,
              changeOrders: 0,
              previousApplications: 0,
              thisPeriod: 0,
              materialsStored: 0,
              totalCompletedAndStored: 0,
              percentComplete: 0
            };
          }
          acc[category].scheduledValue += item.scheduledValue || 0;
          acc[category].changeOrders += item.changeOrders || 0;
          acc[category].previousApplications += item.previousApplications || 0;
          acc[category].thisPeriod += item.thisPeriod || 0;
          acc[category].materialsStored += item.materialsStored || 0;
          acc[category].totalCompletedAndStored += item.totalCompletedAndStored || 0;
          
          const totalContract = acc[category].scheduledValue + acc[category].changeOrders;
          acc[category].percentComplete = totalContract > 0 ? (acc[category].totalCompletedAndStored / totalContract) * 100 : 0;
          
          return acc;
        }, {} as Record<string, any>);
        return Object.values(categoryGroups);
      
      case 'division':
        const divisionGroups = sovItems.reduce((acc, item) => {
          const division = getDivisionFromCategory(item.category);
          if (!acc[division]) {
            acc[division] = {
              id: `division-${division}`,
              itemNumber: `${Object.keys(acc).length + 1}`,
              displayDescription: `${division} Work`,
              displayCategory: division,
              displayDivision: division,
              displaySubcategory: 'Division Summary',
              scheduledValue: 0,
              changeOrders: 0,
              previousApplications: 0,
              thisPeriod: 0,
              materialsStored: 0,
              totalCompletedAndStored: 0,
              percentComplete: 0
            };
          }
          acc[division].scheduledValue += item.scheduledValue || 0;
          acc[division].changeOrders += item.changeOrders || 0;
          acc[division].previousApplications += item.previousApplications || 0;
          acc[division].thisPeriod += item.thisPeriod || 0;
          acc[division].materialsStored += item.materialsStored || 0;
          acc[division].totalCompletedAndStored += item.totalCompletedAndStored || 0;
          
          const totalContract = acc[division].scheduledValue + acc[division].changeOrders;
          acc[division].percentComplete = totalContract > 0 ? (acc[division].totalCompletedAndStored / totalContract) * 100 : 0;
          
          return acc;
        }, {} as Record<string, any>);
        return Object.values(divisionGroups);
      
      default:
        return sovItems;
    }
  };

  const sortedItems = useMemo(() => {
    const displayItems = getDisplayItems();
    if (!sortDirection) return displayItems;

    return [...displayItems].sort((a, b) => {
      let aValue, bValue;
      
      if (sortField === 'division') {
        aValue = a.displayDivision || '';
        bValue = b.displayDivision || '';
      } else {
        aValue = a[sortField];
        bValue = b[sortField];
      }

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
  }, [sovItems, sortField, sortDirection, breakdownLevel]);

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
    
    if (breakdownLevel === 'line-items') {
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
    } else {
      // Handle category/division level updates
      const displayItem = sortedItems.find(item => item.id === itemId);
      if (displayItem) {
        if (breakdownLevel === 'category') {
          const categoryItems = sovItems.filter(item => item.category === displayItem.displayCategory);
          const totalScheduled = categoryItems.reduce((sum, item) => sum + item.scheduledValue, 0);
          
          categoryItems.forEach(item => {
            const proportion = totalScheduled > 0 ? item.scheduledValue / totalScheduled : 1 / categoryItems.length;
            const itemValue = numericValue * proportion;
            onUpdateItem(item.id, itemValue);
          });
        } else if (breakdownLevel === 'division') {
          const divisionItems = sovItems.filter(item => getDivisionFromCategory(item.category) === displayItem.displayDivision);
          const totalScheduled = divisionItems.reduce((sum, item) => sum + item.scheduledValue, 0);
          
          divisionItems.forEach(item => {
            const proportion = totalScheduled > 0 ? item.scheduledValue / totalScheduled : 1 / divisionItems.length;
            const itemValue = numericValue * proportion;
            onUpdateItem(item.id, itemValue);
          });
        }
      }
    }
  };

  const handleExportCSV = () => {
    const exportData = sortedItems.map(item => ({
      'Item #': item.itemNumber,
      'Division': item.displayDivision,
      'Category': item.displayCategory,
      'Subcategory': item.displaySubcategory,
      'Description': item.displayDescription,
      'Scheduled Value': item.scheduledValue,
      'Change Orders': item.changeOrders,
      'Previous Applications': item.previousApplications,
      'This Period': item.thisPeriod,
      'Materials Stored': item.materialsStored,
      'Total Complete': item.totalCompletedAndStored,
      '% Complete': item.percentComplete?.toFixed(2) + '%'
    }));

    exportToCSV({
      title: 'Schedule of Values',
      data: exportData
    });
  };

  const handleExportPDF = async () => {
    try {
      await exportToPDF('sov-table', `SOV-${projectId}-${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      toast.error('Failed to export PDF');
    }
  };

  // Calculate totals including contingency
  const totals = useMemo(() => {
    const totalScheduledValue = sovItems.reduce((sum, item) => sum + (item.scheduledValue || 0), 0);
    const totalChangeOrders = sovItems.reduce((sum, item) => sum + (item.changeOrders || 0), 0);
    const totalContract = totalScheduledValue + totalChangeOrders + contingencyValue;
    const totalFromPrevious = sovItems.reduce((sum, item) => sum + (item.previousApplications || 0), 0);
    const totalThisPeriod = sovItems.reduce((sum, item) => sum + (item.thisPeriod || 0), 0);
    const totalMaterials = sovItems.reduce((sum, item) => sum + (item.materialsStored || 0), 0);
    const totalCompleted = sovItems.reduce((sum, item) => sum + (item.totalCompletedAndStored || 0), 0);
    const balanceToFinish = totalContract - totalCompleted;

    return {
      totalScheduledValue,
      totalChangeOrders,
      totalContract,
      totalFromPrevious,
      totalThisPeriod,
      totalMaterials,
      totalCompleted,
      balanceToFinish,
      percentComplete: totalContract > 0 ? (totalCompleted / totalContract) * 100 : 0
    };
  }, [sovItems, contingencyValue]);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>SOV Display Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4">
            <div className="space-y-2">
              <Label htmlFor="breakdown-level">Breakdown Level</Label>
              <Select value={breakdownLevel} onValueChange={(value: BreakdownLevel) => setBreakdownLevel(value)}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Select breakdown level" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="line-items">Line Items (Detailed)</SelectItem>
                  <SelectItem value="category">Category Breakdown</SelectItem>
                  <SelectItem value="division">Division Breakdown</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" size="sm" onClick={handleExportCSV}>
                <Download className="w-4 h-4 mr-2" />
                Export CSV
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <Download className="w-4 h-4 mr-2" />
                Export PDF
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* SOV Table */}
      <div id="sov-table" className="bg-white rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50">
              <TableHead className="w-16 p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('itemNumber')}
                  className="h-8 p-0 font-medium hover:bg-transparent text-xs"
                >
                  Item #
                  {getSortIcon('itemNumber')}
                </Button>
              </TableHead>
              <TableHead className="w-20 p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('division')}
                  className="h-8 p-0 font-medium hover:bg-transparent text-xs"
                >
                  Division
                  {getSortIcon('division')}
                </Button>
              </TableHead>
              <TableHead className="w-24 p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('category')}
                  className="h-8 p-0 font-medium hover:bg-transparent text-xs"
                >
                  Category
                  {getSortIcon('category')}
                </Button>
              </TableHead>
              <TableHead className="w-24 p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('subcategory')}
                  className="h-8 p-0 font-medium hover:bg-transparent text-xs"
                >
                  Subcategory
                  {getSortIcon('subcategory')}
                </Button>
              </TableHead>
              <TableHead className="w-48 p-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('description')}
                  className="h-8 p-0 font-medium hover:bg-transparent text-xs"
                >
                  Description
                  {getSortIcon('description')}
                </Button>
              </TableHead>
              <TableHead className="w-24 p-2 text-center">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleSort('scheduledValue')}
                  className="h-8 p-0 font-medium hover:bg-transparent text-xs"
                >
                  Scheduled Value
                  {getSortIcon('scheduledValue')}
                </Button>
              </TableHead>
              <TableHead className="w-20 p-2 text-center text-xs">Change Orders</TableHead>
              <TableHead className="w-20 p-2 text-center text-xs">Previous Apps</TableHead>
              <TableHead className="w-24 p-2 text-center text-xs">This Period</TableHead>
              <TableHead className="w-20 p-2 text-center text-xs">Materials Stored</TableHead>
              <TableHead className="w-20 p-2 text-center text-xs">Total Complete</TableHead>
              <TableHead className="w-16 p-2 text-center text-xs">% Complete</TableHead>
              {breakdownLevel === 'line-items' && (
                <TableHead className="w-12 p-2 text-center text-xs">Actions</TableHead>
              )}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedItems.map((item) => (
              <TableRow key={item.id} className="border-b">
                <TableCell className="font-medium p-2 text-sm">{item.itemNumber}</TableCell>
                <TableCell className="p-2 text-sm">{item.displayDivision}</TableCell>
                <TableCell className="p-2 text-sm">{item.displayCategory}</TableCell>
                <TableCell className="p-2 text-sm">{item.displaySubcategory}</TableCell>
                <TableCell className="p-2 text-sm max-w-48 truncate" title={item.displayDescription}>{item.displayDescription}</TableCell>
                <TableCell className="p-2 text-right text-sm">${item.scheduledValue?.toLocaleString()}</TableCell>
                <TableCell className="p-2 text-right text-sm">${item.changeOrders?.toLocaleString()}</TableCell>
                <TableCell className="p-2 text-right text-sm">${item.previousApplications?.toLocaleString()}</TableCell>
                <TableCell className="p-2">
                  <Input
                    type="number"
                    value={item.thisPeriod || ''}
                    onChange={(e) => handleThisPeriodChange(item.id, e.target.value)}
                    className="w-full min-w-[100px] text-sm h-8"
                    step="0.01"
                    placeholder="0.00"
                  />
                </TableCell>
                <TableCell className="p-2 text-right text-sm">${item.materialsStored?.toLocaleString()}</TableCell>
                <TableCell className="p-2 text-right text-sm">${item.totalCompletedAndStored?.toLocaleString()}</TableCell>
                <TableCell className="p-2 text-right text-sm">{item.percentComplete?.toFixed(1)}%</TableCell>
                {breakdownLevel === 'line-items' && (
                  <TableCell className="p-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleDeleteSOVItem(item.id)}
                      className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
            
            {/* Summary row with contingency */}
            <TableRow className="bg-blue-50 font-semibold border-t-2">
              <TableCell colSpan={5} className="p-2 text-sm">TOTALS (Including ${contingencyValue?.toLocaleString()} Contingency)</TableCell>
              <TableCell className="p-2 text-right text-sm">${totals.totalScheduledValue?.toLocaleString()}</TableCell>
              <TableCell className="p-2 text-right text-sm">${totals.totalChangeOrders?.toLocaleString()}</TableCell>
              <TableCell className="p-2 text-right text-sm">${totals.totalFromPrevious?.toLocaleString()}</TableCell>
              <TableCell className="p-2 text-right text-sm">${totals.totalThisPeriod?.toLocaleString()}</TableCell>
              <TableCell className="p-2 text-right text-sm">${totals.totalMaterials?.toLocaleString()}</TableCell>
              <TableCell className="p-2 text-right text-sm">${totals.totalCompleted?.toLocaleString()}</TableCell>
              <TableCell className="p-2 text-right text-sm">{totals.percentComplete?.toFixed(1)}%</TableCell>
              {breakdownLevel === 'line-items' && (
                <TableCell className="p-2"></TableCell>
              )}
            </TableRow>
            <TableRow className="bg-yellow-50 font-medium">
              <TableCell colSpan={breakdownLevel === 'line-items' ? 12 : 11} className="p-2 text-sm">Balance to Finish</TableCell>
              <TableCell className="p-2 text-right text-sm font-bold">${totals.balanceToFinish?.toLocaleString()}</TableCell>
              {breakdownLevel === 'line-items' && (
                <TableCell className="p-2"></TableCell>
              )}
            </TableRow>
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
