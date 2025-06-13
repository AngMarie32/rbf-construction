
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface G703DocumentProps {
  project: any;
  formData: any;
  sovItems: any[];
}

export function G703Document({ project, formData, sovItems }: G703DocumentProps) {
  const calculateTotals = () => {
    const totalScheduledValue = sovItems.reduce((sum, item) => sum + (item.scheduledValue || 0), 0);
    const totalChangeOrders = sovItems.reduce((sum, item) => sum + (item.changeOrders || 0), 0);
    const totalContract = totalScheduledValue + totalChangeOrders;
    const totalThisPeriod = sovItems.reduce((sum, item) => sum + (item.thisPeriod || 0), 0);
    const totalCompleted = sovItems.reduce((sum, item) => sum + (item.totalCompletedAndStored || 0), 0);
    const balanceToFinish = totalContract - totalCompleted;

    return {
      totalScheduledValue,
      totalChangeOrders,
      totalContract,
      totalThisPeriod,
      totalCompleted,
      balanceToFinish
    };
  };

  const totals = calculateTotals();

  return (
    <div className="bg-white p-6 mx-auto text-black print:shadow-none print:p-4" style={{ width: '11in', minHeight: '8.5in' }}>
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold mb-1">CONTINUATION SHEET</h1>
        <p className="text-base font-semibold">AIA DOCUMENT G703™</p>
        <p className="text-sm">APPLICATION AND CERTIFICATE FOR PAYMENT</p>
      </div>

      {/* Project Information Header */}
      <div className="grid grid-cols-4 gap-2 mb-4 text-sm">
        <div className="border border-black p-2">
          <div className="font-bold text-xs mb-1">APPLICATION NUMBER:</div>
          <div className="border-b border-black pb-1">{formData.applicationNumber}</div>
        </div>
        <div className="border border-black p-2">
          <div className="font-bold text-xs mb-1">PERIOD TO:</div>
          <div className="border-b border-black pb-1">{new Date(formData.periodTo).toLocaleDateString()}</div>
        </div>
        <div className="border border-black p-2 col-span-2">
          <div className="font-bold text-xs mb-1">PROJECT:</div>
          <div className="border-b border-black pb-1">{project.name}</div>
        </div>
      </div>

      {/* SOV Table */}
      <div className="border border-black">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr>
              <th className="border-r border-black p-1 w-12 font-bold">ITEM NO.</th>
              <th className="border-r border-black p-1 w-32 font-bold">DESCRIPTION OF WORK</th>
              <th className="border-r border-black p-1 w-20 font-bold">SCHEDULED VALUE</th>
              <th className="border-r border-black p-1 w-20 font-bold">CHANGE ORDERS</th>
              <th className="border-r border-black p-1 w-20 font-bold">TOTAL CONTRACT</th>
              <th className="border-r border-black p-1 w-20 font-bold">WORK COMPLETED FROM PREVIOUS APPLICATION</th>
              <th className="border-r border-black p-1 w-20 font-bold">WORK COMPLETED THIS PERIOD</th>
              <th className="border-r border-black p-1 w-20 font-bold">MATERIALS PRESENTLY STORED</th>
              <th className="border-r border-black p-1 w-20 font-bold">TOTAL COMPLETED AND STORED TO DATE</th>
              <th className="border-r border-black p-1 w-16 font-bold">PERCENTAGE (%)</th>
              <th className="border-r border-black p-1 w-20 font-bold">BALANCE TO FINISH</th>
              <th className="p-1 w-20 font-bold">RETAINAGE</th>
            </tr>
          </thead>
          <tbody>
            {sovItems.map((item, index) => {
              const totalContract = (item.scheduledValue || 0) + (item.changeOrders || 0);
              const totalCompleted = (item.previousApplications || 0) + (item.thisPeriod || 0) + (item.materialsStored || 0);
              const percentComplete = totalContract > 0 ? (totalCompleted / totalContract) : 0;
              const balanceToFinish = totalContract - totalCompleted;
              const retainage = totalCompleted * (formData.retainagePercentage / 100);
              
              return (
                <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border-r border-b border-black p-1 text-center">{item.itemNumber}</td>
                  <td className="border-r border-b border-black p-1">{item.description}</td>
                  <td className="border-r border-b border-black p-1 text-right">${(item.scheduledValue || 0).toLocaleString()}</td>
                  <td className="border-r border-b border-black p-1 text-right">${(item.changeOrders || 0).toLocaleString()}</td>
                  <td className="border-r border-b border-black p-1 text-right">${totalContract.toLocaleString()}</td>
                  <td className="border-r border-b border-black p-1 text-right">${(item.previousApplications || 0).toLocaleString()}</td>
                  <td className="border-r border-b border-black p-1 text-right">${(item.thisPeriod || 0).toLocaleString()}</td>
                  <td className="border-r border-b border-black p-1 text-right">${(item.materialsStored || 0).toLocaleString()}</td>
                  <td className="border-r border-b border-black p-1 text-right">${totalCompleted.toLocaleString()}</td>
                  <td className="border-r border-b border-black p-1 text-right">{percentComplete.toFixed(3)}</td>
                  <td className="border-r border-b border-black p-1 text-right">${balanceToFinish.toLocaleString()}</td>
                  <td className="border-b border-black p-1 text-right">${retainage.toLocaleString()}</td>
                </tr>
              );
            })}
            
            {/* Totals Row */}
            <tr className="bg-gray-200 font-bold">
              <td className="border-r border-b border-black p-1 text-center" colSpan={2}>TOTALS</td>
              <td className="border-r border-b border-black p-1 text-right">${totals.totalScheduledValue.toLocaleString()}</td>
              <td className="border-r border-b border-black p-1 text-right">${totals.totalChangeOrders.toLocaleString()}</td>
              <td className="border-r border-b border-black p-1 text-right">${totals.totalContract.toLocaleString()}</td>
              <td className="border-r border-b border-black p-1 text-right">
                ${sovItems.reduce((sum, item) => sum + (item.previousApplications || 0), 0).toLocaleString()}
              </td>
              <td className="border-r border-b border-black p-1 text-right">${totals.totalThisPeriod.toLocaleString()}</td>
              <td className="border-r border-b border-black p-1 text-right">
                ${sovItems.reduce((sum, item) => sum + (item.materialsStored || 0), 0).toLocaleString()}
              </td>
              <td className="border-r border-b border-black p-1 text-right">${totals.totalCompleted.toLocaleString()}</td>
              <td className="border-r border-b border-black p-1 text-right">
                {totals.totalContract > 0 ? (totals.totalCompleted / totals.totalContract).toFixed(3) : '0.000'}
              </td>
              <td className="border-r border-b border-black p-1 text-right">${totals.balanceToFinish.toLocaleString()}</td>
              <td className="border-b border-black p-1 text-right">
                ${(totals.totalCompleted * (formData.retainagePercentage / 100)).toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer Information */}
      <div className="mt-6 grid grid-cols-2 gap-8 text-sm">
        <div>
          <h3 className="font-bold mb-2">CONTRACTOR'S APPLICATION FOR PAYMENT</h3>
          <p className="mb-1">Continuation Sheet</p>
          <p className="mb-1">Application Number: {formData.applicationNumber}</p>
          <p>Period to: {new Date(formData.periodTo).toLocaleDateString()}</p>
        </div>
        <div>
          <h3 className="font-bold mb-2">PROJECT:</h3>
          <p className="mb-1">{project.name}</p>
          <p>Project Number: {formData.projectNumber || project.projectCode}</p>
        </div>
      </div>

      {/* AIA Copyright Notice */}
      <div className="mt-6 text-xs text-center text-gray-600">
        <p>AIA Document G703™ – 1992. Copyright © 1992 by The American Institute of Architects.</p>
        <p>All rights reserved.</p>
      </div>
    </div>
  );
}
