
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface G702DocumentProps {
  project: any;
  formData: any;
  totals: any;
}

export function G702Document({ project, formData, totals }: G702DocumentProps) {
  return (
    <div className="bg-white p-8 max-w-4xl mx-auto text-black print:shadow-none">
      {/* Header */}
      <div className="text-center mb-8">
        <h1 className="text-2xl font-bold mb-2">APPLICATION AND CERTIFICATE FOR PAYMENT</h1>
        <p className="text-lg">AIA DOCUMENT G702</p>
      </div>

      {/* Project Information */}
      <div className="grid grid-cols-2 gap-8 mb-8">
        <div>
          <h3 className="font-bold mb-4">TO OWNER:</h3>
          <p>{project.client}</p>
          <p>{project.address}</p>
        </div>
        <div>
          <h3 className="font-bold mb-4">PROJECT:</h3>
          <p>{project.name}</p>
          <p>Project No: {formData.projectNumber || project.projectCode}</p>
        </div>
      </div>

      {/* Application Details */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div>
          <label className="font-bold">Application Number:</label>
          <p className="border-b border-black">{formData.applicationNumber}</p>
        </div>
        <div>
          <label className="font-bold">Period to:</label>
          <p className="border-b border-black">{new Date(formData.periodTo).toLocaleDateString()}</p>
        </div>
        <div>
          <label className="font-bold">Architect's Project No:</label>
          <p className="border-b border-black">{formData.architectProjectNo}</p>
        </div>
      </div>

      {/* Payment Summary Table */}
      <div className="mb-8">
        <table className="w-full border-collapse border border-black">
          <thead>
            <tr className="bg-gray-100">
              <th className="border border-black p-2 text-left">DESCRIPTION</th>
              <th className="border border-black p-2 text-right">AMOUNT</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-black p-2">1. ORIGINAL CONTRACT SUM</td>
              <td className="border border-black p-2 text-right">${totals.originalContractSum.toLocaleString()}</td>
            </tr>
            <tr>
              <td className="border border-black p-2">2. Net change by Change Orders</td>
              <td className="border border-black p-2 text-right">${totals.netChangeOrders.toLocaleString()}</td>
            </tr>
            <tr>
              <td className="border border-black p-2 font-bold">3. CONTRACT SUM TO DATE (Line 1 ± 2)</td>
              <td className="border border-black p-2 text-right font-bold">${totals.contractSumToDate.toLocaleString()}</td>
            </tr>
            <tr>
              <td className="border border-black p-2">4. TOTAL COMPLETED & STORED TO DATE</td>
              <td className="border border-black p-2 text-right">${totals.totalCompletedAndStored.toLocaleString()}</td>
            </tr>
            <tr>
              <td className="border border-black p-2">5. RETAINAGE:</td>
              <td className="border border-black p-2 text-right"></td>
            </tr>
            <tr>
              <td className="border border-black p-2 pl-8">a. {formData.retainagePercentage}% of Completed Work</td>
              <td className="border border-black p-2 text-right">${(totals.totalRetainage * 0.9).toLocaleString()}</td>
            </tr>
            <tr>
              <td className="border border-black p-2 pl-8">b. {formData.retainagePercentage}% of Stored Material</td>
              <td className="border border-black p-2 text-right">${(totals.totalRetainage * 0.1).toLocaleString()}</td>
            </tr>
            <tr>
              <td className="border border-black p-2 pl-8">Total Retainage (Lines 5a + 5b)</td>
              <td className="border border-black p-2 text-right">${totals.totalRetainage.toLocaleString()}</td>
            </tr>
            <tr>
              <td className="border border-black p-2 font-bold">6. TOTAL EARNED LESS RETAINAGE (Line 4 - Line 5 Total)</td>
              <td className="border border-black p-2 text-right font-bold">${totals.totalEarnedLessRetainage.toLocaleString()}</td>
            </tr>
            <tr>
              <td className="border border-black p-2">7. LESS PREVIOUS CERTIFICATES FOR PAYMENT</td>
              <td className="border border-black p-2 text-right">${totals.lessPreviousPayments.toLocaleString()}</td>
            </tr>
            <tr>
              <td className="border border-black p-2 font-bold text-lg">8. CURRENT PAYMENT DUE</td>
              <td className="border border-black p-2 text-right font-bold text-lg">${totals.currentPaymentDue.toLocaleString()}</td>
            </tr>
            <tr>
              <td className="border border-black p-2">9. BALANCE TO FINISH, PLUS RETAINAGE</td>
              <td className="border border-black p-2 text-right">${totals.balanceToFinish.toLocaleString()}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Change Order Summary */}
      <div className="mb-8">
        <h3 className="font-bold mb-4">CHANGE ORDER SUMMARY</h3>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="font-bold">Total changes approved in previous months by Owner:</label>
            <p className="border-b border-black">${totals.netChangeOrders.toLocaleString()}</p>
          </div>
          <div>
            <label className="font-bold">Total approved this Month:</label>
            <p className="border-b border-black">$0.00</p>
          </div>
          <div>
            <label className="font-bold">TOTALS:</label>
            <p className="border-b border-black">${totals.netChangeOrders.toLocaleString()}</p>
          </div>
        </div>
      </div>

      {/* Distribution */}
      <div className="mb-8">
        <h3 className="font-bold mb-4">DISTRIBUTION TO:</h3>
        <div className="flex gap-8">
          <label className="flex items-center">
            <input type="checkbox" checked={formData.distributionTo?.owner} readOnly className="mr-2" />
            Owner
          </label>
          <label className="flex items-center">
            <input type="checkbox" checked={formData.distributionTo?.architect} readOnly className="mr-2" />
            Architect
          </label>
          <label className="flex items-center">
            <input type="checkbox" checked={formData.distributionTo?.contractor} readOnly className="mr-2" />
            Contractor
          </label>
        </div>
      </div>

      {/* Contractor Section */}
      <div className="mb-8">
        <div className="grid grid-cols-2 gap-8">
          <div>
            <h3 className="font-bold mb-4">CONTRACTOR:</h3>
            <p>{formData.contractorName}</p>
            <p>{formData.contractorAddress}</p>
            <div className="mt-8">
              <p className="border-b border-black mb-2">BY: _________________________</p>
              <p>Date: {new Date().toLocaleDateString()}</p>
            </div>
          </div>
          <div>
            <h3 className="font-bold mb-4">ARCHITECT:</h3>
            <div className="mt-8">
              <p className="border-b border-black mb-2">BY: _________________________</p>
              <p>Date: _______________</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
