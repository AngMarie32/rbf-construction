
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

  const totals = calculateTotals();

  return (
    <div className="bg-white p-4 mx-auto text-black print:shadow-none" style={{ width: '11in', minHeight: '8.5in' }}>
      {/* Header */}
      <div className="text-center mb-4">
        <div className="grid grid-cols-3 items-center">
          <div></div>
          <div>
            <h1 className="text-lg font-bold">CONTINUATION SHEET</h1>
            <p className="text-sm">AIA DOCUMENT G703™</p>
            <p className="text-xs">APPLICATION AND CERTIFICATE FOR PAYMENT</p>
          </div>
          <div className="text-right text-xs">
            <div>PERIOD TO: {new Date(formData.periodTo).toLocaleDateString()}</div>
          </div>
        </div>
      </div>

      {/* Project Information Header */}
      <div className="grid grid-cols-4 gap-1 mb-4 text-xs">
        <div className="border border-black p-1">
          <div className="font-bold">ITEM NO.</div>
        </div>
        <div className="border border-black p-1 col-span-3">
          <div className="grid grid-cols-3 gap-1">
            <div>
              <div className="font-bold">APPLICATION NUMBER:</div>
              <div>{formData.applicationNumber}</div>
            </div>
            <div>
              <div className="font-bold">PERIOD TO:</div>
              <div>{new Date(formData.periodTo).toLocaleDateString()}</div>
            </div>
            <div>
              <div className="font-bold">PROJECT:</div>
              <div>{project.name}</div>
            </div>
          </div>
        </div>
      </div>

      {/* SOV Table */}
      <div className="border border-black">
        <table className="w-full border-collapse text-xs">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-1 w-8 font-bold">A<br/>ITEM<br/>NO.</th>
              <th className="border border-black p-1 w-32 font-bold">B<br/>DESCRIPTION OF WORK</th>
              <th className="border border-black p-1 w-16 font-bold">C<br/>SCHEDULED<br/>VALUE</th>
              <th className="border border-black p-1 w-16 font-bold">D<br/>CHANGE<br/>ORDERS</th>
              <th className="border border-black p-1 w-16 font-bold">E<br/>TOTAL<br/>CONTRACT</th>
              <th className="border border-black p-1 w-16 font-bold">F<br/>FROM<br/>PREVIOUS<br/>APPLICATION</th>
              <th className="border border-black p-1 w-16 font-bold">G<br/>WORK COMPLETED<br/>THIS PERIOD</th>
              <th className="border border-black p-1 w-16 font-bold">H<br/>MATERIALS<br/>PRESENTLY<br/>STORED</th>
              <th className="border border-black p-1 w-16 font-bold">I<br/>TOTAL<br/>COMPLETED<br/>AND STORED TO<br/>DATE</th>
              <th className="border border-black p-1 w-12 font-bold">J<br/>% COMPLETE</th>
              <th className="border border-black p-1 w-16 font-bold">K<br/>BALANCE TO<br/>FINISH</th>
              <th className="border border-black p-1 w-16 font-bold">RETAINAGE<br/>HELD</th>
            </tr>
          </thead>
          <tbody>
            {sovItems.map((item, index) => {
              const totalContract = (item.scheduledValue || 0) + (item.changeOrders || 0);
              const totalCompleted = (item.previousApplications || 0) + (item.thisPeriod || 0) + (item.materialsStored || 0);
              const percentComplete = totalContract > 0 ? ((totalCompleted / totalContract) * 100) : 0;
              const balanceToFinish = totalContract - totalCompleted;
              const retainage = totalCompleted * (formData.retainagePercentage / 100);
              
              return (
                <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border border-black p-1 text-center">{item.itemNumber}</td>
                  <td className="border border-black p-1">{item.description}</td>
                  <td className="border border-black p-1 text-right">${(item.scheduledValue || 0).toLocaleString()}</td>
                  <td className="border border-black p-1 text-right">${(item.changeOrders || 0).toLocaleString()}</td>
                  <td className="border border-black p-1 text-right">${totalContract.toLocaleString()}</td>
                  <td className="border border-black p-1 text-right">${(item.previousApplications || 0).toLocaleString()}</td>
                  <td className="border border-black p-1 text-right">${(item.thisPeriod || 0).toLocaleString()}</td>
                  <td className="border border-black p-1 text-right">${(item.materialsStored || 0).toLocaleString()}</td>
                  <td className="border border-black p-1 text-right">${totalCompleted.toLocaleString()}</td>
                  <td className="border border-black p-1 text-right">{percentComplete.toFixed(2)}%</td>
                  <td className="border border-black p-1 text-right">${balanceToFinish.toLocaleString()}</td>
                  <td className="border border-black p-1 text-right">${retainage.toLocaleString()}</td>
                </tr>
              );
            })}
            
            {/* Add empty rows to fill the page if needed */}
            {Array.from({ length: Math.max(0, 35 - sovItems.length) }).map((_, index) => (
              <tr key={`empty-${index}`}>
                <td className="border border-black p-1 text-center">{sovItems.length + index + 1}</td>
                <td className="border border-black p-1"></td>
                <td className="border border-black p-1 text-right">$0.00</td>
                <td className="border border-black p-1 text-right">$0.00</td>
                <td className="border border-black p-1 text-right">$0.00</td>
                <td className="border border-black p-1 text-right">$0.00</td>
                <td className="border border-black p-1 text-right">$0.00</td>
                <td className="border border-black p-1 text-right">$0.00</td>
                <td className="border border-black p-1 text-right">$0.00</td>
                <td className="border border-black p-1 text-right">0.00%</td>
                <td className="border border-black p-1 text-right">$0.00</td>
                <td className="border border-black p-1 text-right">$0.00</td>
              </tr>
            ))}
            
            {/* Totals Row */}
            <tr className="bg-gray-200 font-bold">
              <td className="border border-black p-1 text-center" colSpan={2}>GRAND TOTALS</td>
              <td className="border border-black p-1 text-right">${totals.totalScheduledValue.toLocaleString()}</td>
              <td className="border border-black p-1 text-right">${totals.totalChangeOrders.toLocaleString()}</td>
              <td className="border border-black p-1 text-right">${totals.totalContract.toLocaleString()}</td>
              <td className="border border-black p-1 text-right">${totals.totalFromPrevious.toLocaleString()}</td>
              <td className="border border-black p-1 text-right">${totals.totalThisPeriod.toLocaleString()}</td>
              <td className="border border-black p-1 text-right">${totals.totalMaterials.toLocaleString()}</td>
              <td className="border border-black p-1 text-right">${totals.totalCompleted.toLocaleString()}</td>
              <td className="border border-black p-1 text-right">{totals.percentComplete.toFixed(2)}%</td>
              <td className="border border-black p-1 text-right">${totals.balanceToFinish.toLocaleString()}</td>
              <td className="border border-black p-1 text-right">${totals.totalRetainage.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer Information */}
      <div className="mt-4 grid grid-cols-2 gap-8 text-xs">
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
      <div className="mt-4 text-xs text-center text-gray-600 border-t border-gray-300 pt-2">
        <p>AIA Document G703™ – 1992. Copyright © 1992 by The American Institute of Architects. All rights reserved.</p>
        <p>WARNING: This AIA® Document is protected by U.S. Copyright Law and International Treaties.</p>
      </div>
    </div>
  );
}
