import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { useState } from 'react';

interface G703DocumentProps {
  project: any;
  formData: any;
  sovItems: any[];
  companyInfo?: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
}

export function G703Document({ project, formData, sovItems, companyInfo }: G703DocumentProps) {
  const [breakdownLevel, setBreakdownLevel] = useState<'line-items' | 'category' | 'division'>('line-items');

  const calculateTotals = () => {
    const totalScheduledValue = sovItems.reduce((sum, item) => sum + (item.scheduledValue || 0), 0);
    const totalChangeOrders = sovItems.reduce((sum, item) => sum + (item.changeOrders || 0), 0);
    const totalContract = totalScheduledValue + totalChangeOrders;
    const totalFromPrevious = sovItems.reduce((sum, item) => sum + (item.previousApplications || 0), 0);
    const totalThisPeriod = sovItems.reduce((sum, item) => sum + (item.thisPeriod || 0), 0);
    const totalMaterials = sovItems.reduce((sum, item) => sum + (item.materialsStored || 0), 0);
    const totalCompleted = sovItems.reduce((sum, item) => sum + (item.totalCompletedAndStored || 0), 0);
    const balanceToFinish = totalContract - totalCompleted;
    const totalRetainage = totalCompleted * (formData.retainagePercentage / 100);

    return {
      totalScheduledValue,
      totalChangeOrders,
      totalContract,
      totalFromPrevious,
      totalThisPeriod,
      totalMaterials,
      totalCompleted,
      balanceToFinish,
      totalRetainage,
      percentComplete: totalContract > 0 ? (totalCompleted / totalContract) * 100 : 0
    };
  };

  const getDisplayItems = () => {
    switch (breakdownLevel) {
      case 'line-items':
        return sovItems.filter(item => item.description?.trim() || (item.scheduledValue > 0)).map(item => ({
          ...item,
          displayDescription: item.subcategory || item.description
        }));
      
      case 'category':
        const categoryGroups = sovItems.reduce((acc, item, index) => {
          const category = item.category || 'Other';
          if (!acc[category]) {
            acc[category] = {
              itemNumber: `${Object.keys(acc).length + 1}`,
              displayDescription: category,
              scheduledValue: 0,
              changeOrders: 0,
              previousApplications: 0,
              thisPeriod: 0,
              materialsStored: 0,
              totalCompletedAndStored: 0
            };
          }
          acc[category].scheduledValue += item.scheduledValue || 0;
          acc[category].changeOrders += item.changeOrders || 0;
          acc[category].previousApplications += item.previousApplications || 0;
          acc[category].thisPeriod += item.thisPeriod || 0;
          acc[category].materialsStored += item.materialsStored || 0;
          acc[category].totalCompletedAndStored += item.totalCompletedAndStored || 0;
          return acc;
        }, {} as Record<string, any>);
        return Object.values(categoryGroups);
      
      case 'division':
        const divisionGroups = sovItems.reduce((acc, item) => {
          const division = item.category?.split(' ')[0] || 'General';
          if (!acc[division]) {
            acc[division] = {
              itemNumber: `${Object.keys(acc).length + 1}`,
              displayDescription: `${division}`,
              scheduledValue: 0,
              changeOrders: 0,
              previousApplications: 0,
              thisPeriod: 0,
              materialsStored: 0,
              totalCompletedAndStored: 0
            };
          }
          acc[division].scheduledValue += item.scheduledValue || 0;
          acc[division].changeOrders += item.changeOrders || 0;
          acc[division].previousApplications += item.previousApplications || 0;
          acc[division].thisPeriod += item.thisPeriod || 0;
          acc[division].materialsStored += item.materialsStored || 0;
          acc[division].totalCompletedAndStored += item.totalCompletedAndStored || 0;
          return acc;
        }, {} as Record<string, any>);
        return Object.values(divisionGroups);
      
      default:
        return sovItems;
    }
  };

  const displayItems = getDisplayItems();
  const totals = calculateTotals();

  return (
    <div className="space-y-4">
      {/* Breakdown Level Selector */}
      <Card className="bg-white">
        <CardHeader>
          <CardTitle>G703 Display Options</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <Label htmlFor="breakdown-level">Breakdown Level</Label>
            <Select value={breakdownLevel} onValueChange={(value: 'line-items' | 'category' | 'division') => setBreakdownLevel(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Select breakdown level" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="line-items">Line Items (Detailed)</SelectItem>
                <SelectItem value="category">Category Breakdown</SelectItem>
                <SelectItem value="division">Division Breakdown</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* G703 Document - Full page width for better PDF export */}
      <div className="bg-white mx-auto text-black print:shadow-none" style={{ width: '100%', maxWidth: '8.5in', minHeight: '11in', fontSize: '10px', lineHeight: '1.2' }}>
        {/* Header - Removed report taglines as requested */}
        <div className="text-center mb-6">
          <div className="grid grid-cols-3 items-center">
            <div></div>
            <div>
              <h1 className="text-xl font-bold">CONTINUATION SHEET</h1>
              <p className="text-sm">AIA DOCUMENT G703™</p>
              <p className="text-xs">APPLICATION AND CERTIFICATE FOR PAYMENT</p>
            </div>
            <div className="text-right text-sm">
              <div>APPLICATION NUMBER: {formData.applicationNumber}</div>
              <div>PERIOD TO: {new Date(formData.periodTo).toLocaleDateString()}</div>
            </div>
          </div>
        </div>

        {/* Company Information */}
        <div className="grid grid-cols-2 gap-4 mb-4 text-xs">
          <div className="border border-black p-2">
            <div className="font-bold mb-1">FROM:</div>
            <div>{companyInfo?.name || 'RBF Construction, Inc.'}</div>
            <div>{companyInfo?.address || '1411 W. Hill Rd, Flint, MI 48507'}</div>
            <div>810-938-8498</div>
          </div>
          <div className="border border-black p-2">
            <div className="font-bold mb-1">TO:</div>
            <div>{project.client || 'Client Name'}</div>
            <div>{project.address || 'Project Address'}</div>
            <div className="font-bold mt-2">PROJECT: {project.name}</div>
          </div>
        </div>

        {/* SOV Table - Improved for PDF export */}
        <div className="border border-black" style={{ pageBreakInside: 'avoid' }}>
          <table className="w-full border-collapse" style={{ fontSize: '9px' }}>
            <thead>
              {/* Row 1: Grouping Header */}
              <tr className="text-center font-bold text-xs">
                <th className="p-1" colSpan={5}></th>
                <th className="p-1 border-b-0" colSpan={3}>WORK COMPLETED</th>
                <th className="p-1" colSpan={4}></th>
              </tr>
              {/* Row 2: Column letters A through L */}
              <tr className="bg-gray-100 text-center font-bold border-t border-black">
                <th className="border-l border-r border-b border-black p-1" style={{ width: '6%' }}>A</th>
                <th className="border-r border-b border-black p-1" style={{ width: '22%' }}>B</th>
                <th className="border-r border-b border-black p-1" style={{ width: '8%' }}>C</th>
                <th className="border-r border-b border-black p-1" style={{ width: '8%' }}>D</th>
                <th className="border-r border-b border-black p-1" style={{ width: '8%' }}>E</th>
                <th className="border-r border-b border-black p-1" style={{ width: '8%' }}>F</th>
                <th className="border-r border-b border-black p-1" style={{ width: '8%' }}>G</th>
                <th className="border-r border-b border-black p-1" style={{ width: '8%' }}>H</th>
                <th className="border-r border-b border-black p-1" style={{ width: '8%' }}>I</th>
                <th className="border-r border-b border-black p-1" style={{ width: '6%' }}>J</th>
                <th className="border-r border-b border-black p-1" style={{ width: '8%' }}>K</th>
                <th className="border-r border-b border-black p-1" style={{ width: '8%' }}>L</th>
              </tr>
              {/* Row 3: Column Descriptions */}
              <tr className="bg-gray-100 text-center text-xs">
                <th className="border-l border-r border-b border-black p-1 h-16 align-bottom">
                  ITEM<br />NO.
                </th>
                <th className="border-r border-b border-black p-1 h-16 align-bottom">
                  DESCRIPTION OF WORK
                </th>
                <th className="border-r border-b border-black p-1 h-16 align-bottom">
                  SCHEDULED<br />VALUE
                </th>
                <th className="border-r border-b border-black p-1 h-16 align-bottom">
                  CHANGE<br />ORDERS
                </th>
                <th className="border-r border-b border-black p-1 h-16 align-bottom">
                  TOTAL<br />CONTRACT
                </th>
                <th className="border-r border-b border-black p-1 h-16 align-bottom">
                  FROM<br />PREVIOUS<br />APPLICATION
                </th>
                <th className="border-r border-b border-black p-1 h-16 align-bottom">
                  THIS PERIOD
                </th>
                <th className="border-r border-b border-black p-1 h-16 align-bottom">
                  MATERIALS<br />PRESENTLY<br />STORED
                </th>
                <th className="border-r border-b border-black p-1 h-16 align-bottom">
                  TOTAL<br />COMPLETED<br />AND STORED TO DATE
                </th>
                <th className="border-r border-b border-black p-1 h-16 align-bottom">
                  %<br />COMPLETE
                </th>
                <th className="border-r border-b border-black p-1 h-16 align-bottom">
                  BALANCE TO<br />FINISH
                </th>
                <th className="border-r border-b border-black p-1 h-16 align-bottom">
                  RETAINAGE
                </th>
              </tr>
            </thead>
            <tbody>
              {displayItems.map((item, index) => {
                const totalContract = (item.scheduledValue || 0) + (item.changeOrders || 0);
                const totalCompleted = (item.previousApplications || 0) + (item.thisPeriod || 0) + (item.materialsStored || 0);
                const percentComplete = totalContract > 0 ? ((totalCompleted / totalContract) * 100) : 0;
                const balanceToFinish = totalContract - totalCompleted;
                const retainage = totalCompleted * (formData.retainagePercentage / 100);
                
                return (
                  <tr key={item.id || index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} style={{ pageBreakInside: 'avoid' }}>
                    <td className="border-l border-r border-black p-1 text-center" style={{ minHeight: '20px' }}>{item.itemNumber}</td>
                    <td className="border-r border-black p-1" style={{ wordWrap: 'break-word', maxWidth: '200px' }}>{item.displayDescription}</td>
                    <td className="border-r border-black p-1 text-right">${(item.scheduledValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="border-r border-black p-1 text-right">${(item.changeOrders || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="border-r border-black p-1 text-right">${totalContract.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="border-r border-black p-1 text-right">${(item.previousApplications || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="border-r border-black p-1 text-right">${(item.thisPeriod || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="border-r border-black p-1 text-right">${(item.materialsStored || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="border-r border-black p-1 text-right">${totalCompleted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="border-r border-black p-1 text-right">{percentComplete.toFixed(2)}%</td>
                    <td className="border-r border-black p-1 text-right">${balanceToFinish.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                    <td className="border-r p-1 text-right">${retainage.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  </tr>
                );
              })}
              
              {/* Totals Row */}
              <tr className="bg-gray-200 font-bold">
                <td className="border-l border-r border-black p-1 text-center" colSpan={2}>GRAND TOTALS</td>
                <td className="border-r border-black p-1 text-right">${totals.totalScheduledValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="border-r border-black p-1 text-right">${totals.totalChangeOrders.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="border-r border-black p-1 text-right">${totals.totalContract.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="border-r border-black p-1 text-right">${totals.totalFromPrevious.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="border-r border-black p-1 text-right">${totals.totalThisPeriod.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="border-r border-black p-1 text-right">${totals.totalMaterials.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="border-r border-black p-1 text-right">${totals.totalCompleted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="border-r border-black p-1 text-right">{totals.percentComplete.toFixed(2)}%</td>
                <td className="border-r border-black p-1 text-right">${totals.balanceToFinish.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td className="border-r p-1 text-right">${totals.totalRetainage.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
