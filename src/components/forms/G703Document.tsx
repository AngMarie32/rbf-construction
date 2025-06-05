
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
    <div className="bg-white p-8 max-w-7xl mx-auto text-black print:shadow-none">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">CONTINUATION SHEET</h1>
        <p className="text-lg">AIA DOCUMENT G703</p>
      </div>

      {/* Project Information */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div>
          <label className="font-bold">APPLICATION NUMBER:</label>
          <p className="border-b border-black">{formData.applicationNumber}</p>
        </div>
        <div>
          <label className="font-bold">PERIOD TO:</label>
          <p className="border-b border-black">{new Date(formData.periodTo).toLocaleDateString()}</p>
        </div>
        <div>
          <label className="font-bold">PROJECT:</label>
          <p className="border-b border-black">{project.name}</p>
        </div>
      </div>

      {/* SOV Items Table */}
      <div className="mb-8">
        <table className="w-full border-collapse border border-black text-sm">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-2 text-left">ITEM NO.</th>
              <th className="border border-black p-2 text-left">DESCRIPTION OF WORK</th>
              <th className="border border-black p-2 text-right">SCHEDULED VALUE</th>
              <th className="border border-black p-2 text-right">CHANGE ORDERS</th>
              <th className="border border-black p-2 text-right">TOTAL CONTRACT</th>
              <th className="border border-black p-2 text-right">WORK COMPLETED FROM PREVIOUS APPLICATION</th>
              <th className="border border-black p-2 text-right">WORK COMPLETED THIS PERIOD</th>
              <th className="border border-black p-2 text-right">MATERIALS PRESENTLY STORED</th>
              <th className="border border-black p-2 text-right">TOTAL COMPLETED AND STORED TO DATE</th>
              <th className="border border-black p-2 text-right">PERCENTAGE COMPLETE</th>
              <th className="border border-black p-2 text-right">BALANCE TO FINISH</th>
              <th className="border border-black p-2 text-right">RETAINAGE</th>
            </tr>
          </thead>
          <tbody>
            {sovItems.map((item) => {
              const totalContract = (item.scheduledValue || 0) + (item.changeOrders || 0);
              const totalCompleted = (item.previousApplications || 0) + (item.thisPeriod || 0) + (item.materialsStored || 0);
              const percentComplete = totalContract > 0 ? (totalCompleted / totalContract) * 100 : 0;
              const balanceToFinish = totalContract - totalCompleted;
              const retainage = totalCompleted * (formData.retainagePercentage / 100);
              
              return (
                <tr key={item.id}>
                  <td className="border border-black p-2">{item.itemNumber}</td>
                  <td className="border border-black p-2">{item.description}</td>
                  <td className="border border-black p-2 text-right">${(item.scheduledValue || 0).toLocaleString()}</td>
                  <td className="border border-black p-2 text-right">${(item.changeOrders || 0).toLocaleString()}</td>
                  <td className="border border-black p-2 text-right">${totalContract.toLocaleString()}</td>
                  <td className="border border-black p-2 text-right">${(item.previousApplications || 0).toLocaleString()}</td>
                  <td className="border border-black p-2 text-right">${(item.thisPeriod || 0).toLocaleString()}</td>
                  <td className="border border-black p-2 text-right">${(item.materialsStored || 0).toLocaleString()}</td>
                  <td className="border border-black p-2 text-right">${totalCompleted.toLocaleString()}</td>
                  <td className="border border-black p-2 text-right">{percentComplete.toFixed(1)}%</td>
                  <td className="border border-black p-2 text-right">${balanceToFinish.toLocaleString()}</td>
                  <td className="border border-black p-2 text-right">${retainage.toLocaleString()}</td>
                </tr>
              );
            })}
            
            {/* Totals Row */}
            <tr className="bg-gray-100 font-bold">
              <td className="border border-black p-2" colSpan={2}>TOTALS</td>
              <td className="border border-black p-2 text-right">${totals.totalScheduledValue.toLocaleString()}</td>
              <td className="border border-black p-2 text-right">${totals.totalChangeOrders.toLocaleString()}</td>
              <td className="border border-black p-2 text-right">${totals.totalContract.toLocaleString()}</td>
              <td className="border border-black p-2 text-right">
                ${sovItems.reduce((sum, item) => sum + (item.previousApplications || 0), 0).toLocaleString()}
              </td>
              <td className="border border-black p-2 text-right">${totals.totalThisPeriod.toLocaleString()}</td>
              <td className="border border-black p-2 text-right">
                ${sovItems.reduce((sum, item) => sum + (item.materialsStored || 0), 0).toLocaleString()}
              </td>
              <td className="border border-black p-2 text-right">${totals.totalCompleted.toLocaleString()}</td>
              <td className="border border-black p-2 text-right">
                {totals.totalContract > 0 ? ((totals.totalCompleted / totals.totalContract) * 100).toFixed(1) : 0}%
              </td>
              <td className="border border-black p-2 text-right">${totals.balanceToFinish.toLocaleString()}</td>
              <td className="border border-black p-2 text-right">
                ${(totals.totalCompleted * (formData.retainagePercentage / 100)).toLocaleString()}
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Footer */}
      <div className="mt-8">
        <div className="grid grid-cols-2 gap-8">
          <div>
            <h3 className="font-bold mb-4">CONTRACTOR'S APPLICATION FOR PAYMENT</h3>
            <p>Continuation Sheet</p>
            <p>Application Number: {formData.applicationNumber}</p>
            <p>Period to: {new Date(formData.periodTo).toLocaleDateString()}</p>
          </div>
          <div>
            <h3 className="font-bold mb-4">PROJECT:</h3>
            <p>{project.name}</p>
            <p>Project Number: {formData.projectNumber || project.projectCode}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
