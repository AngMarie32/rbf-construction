
import React from 'react';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

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

export function SOVTable({ sovItems, setSovItems, projectId, selectedApplication, onUpdateItem }: SOVTableProps) {
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
            <TableHead className="w-16">Item #</TableHead>
            <TableHead className="min-w-[300px]">Description</TableHead>
            <TableHead className="w-24">Scheduled Value</TableHead>
            <TableHead className="w-24">Change Orders</TableHead>
            <TableHead className="w-24">Previous Apps</TableHead>
            <TableHead className="w-32">This Period</TableHead>
            <TableHead className="w-24">Materials Stored</TableHead>
            <TableHead className="w-24">Total Complete</TableHead>
            <TableHead className="w-20">% Complete</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sovItems.map((item) => (
            <TableRow key={item.id}>
              <TableCell className="font-medium">{item.itemNumber}</TableCell>
              <TableCell>{item.subcategory || item.description}</TableCell>
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
