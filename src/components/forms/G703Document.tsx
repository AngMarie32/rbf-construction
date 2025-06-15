
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
      <div className="border-l border-r border-b border-black">
        <table className="w-full border-collapse text-xs">
          <thead>
            {/* Row 1: Grouping Header */}
            <tr className="text-center font-bold text-xs">
              <th className="p-1" colSpan={5}></th>
              <th className="p-1 border-b-0" colSpan={3}>WORK COMPLETED</th>
              <th className="p-1" colSpan={4}></th>
            </tr>
            {/* Row 2: Column letters A through L */}
            <tr className="bg-gray-100 text-center font-bold border-t border-black">
              <th className="border-r border-b border-black p-1" style={{ width: '6%' }}>A</th>
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
              <th className="border-b border-black p-1" style={{ width: '8%' }}>L</th>
            </tr>
            {/* Row 3: Column Descriptions */}
            <tr className="bg-gray-100 text-center text-xs">
              <th className="border-r border-b border-black p-1 h-16 align-bottom">
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
              <th className="border-b border-black p-1 h-16 align-bottom">
                RETAINAGE
              </th>
            </tr>
          </thead>
          <tbody>
            {sovItems.filter(item => item.description?.trim() || (item.scheduledValue > 0)).map((item, index) => {
              const totalContract = (item.scheduledValue || 0) + (item.changeOrders || 0);
              const totalCompleted = (item.previousApplications || 0) + (item.thisPeriod || 0) + (item.materialsStored || 0);
              const percentComplete = totalContract > 0 ? ((totalCompleted / totalContract) * 100) : 0;
              const balanceToFinish = totalContract - totalCompleted;
              const retainage = totalCompleted * (formData.retainagePercentage / 100);
              
              return (
                <tr key={item.id} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="border-r border-black p-1 text-center">{item.itemNumber}</td>
                  <td className="border-r border-black p-1">{item.description}</td>
                  <td className="border-r border-black p-1 text-right">${(item.scheduledValue || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="border-r border-black p-1 text-right">${(item.changeOrders || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="border-r border-black p-1 text-right">${totalContract.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="border-r border-black p-1 text-right">${(item.previousApplications || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="border-r border-black p-1 text-right">${(item.thisPeriod || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="border-r border-black p-1 text-right">${(item.materialsStored || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="border-r border-black p-1 text-right">${totalCompleted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="border-r border-black p-1 text-right">{percentComplete.toFixed(2)}%</td>
                  <td className="border-r border-black p-1 text-right">${balanceToFinish.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                  <td className="p-1 text-right">${retainage.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                </tr>
              );
            })}
            
            {/* Totals Row */}
            <tr className="bg-gray-200 font-bold">
              <td className="border-r border-black p-1 text-center" colSpan={2}>GRAND TOTALS</td>
              <td className="border-r border-black p-1 text-right">${totals.totalScheduledValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td className="border-r border-black p-1 text-right">${totals.totalChangeOrders.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td className="border-r border-black p-1 text-right">${totals.totalContract.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td className="border-r border-black p-1 text-right">${totals.totalFromPrevious.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td className="border-r border-black p-1 text-right">${totals.totalThisPeriod.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td className="border-r border-black p-1 text-right">${totals.totalMaterials.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td className="border-r border-black p-1 text-right">${totals.totalCompleted.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td className="border-r border-black p-1 text-right">{totals.percentComplete.toFixed(2)}%</td>
              <td className="border-r border-black p-1 text-right">${totals.balanceToFinish.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td className="p-1 text-right">${totals.totalRetainage.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
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
    </div>
  );
}
