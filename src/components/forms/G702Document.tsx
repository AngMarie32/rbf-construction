
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface G702DocumentProps {
  project: any;
  formData: any;
  totals: any;
}

export function G702Document({ project, formData, totals }: G702DocumentProps) {
  return (
    <div className="bg-white p-6 mx-auto text-black print:shadow-none" style={{ width: '11in', minHeight: '8.5in' }}>
      {/* Header */}
      <div className="text-center mb-6 border-b-2 border-black pb-4">
        <h1 className="text-xl font-bold mb-3">APPLICATION AND CERTIFICATE FOR PAYMENT</h1>
        <div className="grid grid-cols-3 gap-6 text-sm">
          <div className="text-left">
            <div className="font-bold mb-1">TO (Owner):</div>
            <div className="space-y-1">
              <div>{project.client}</div>
              <div>{project.address}</div>
            </div>
          </div>
          <div className="text-center">
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <div className="font-bold text-sm mb-1">APPLICATION NO:</div>
                <div className="text-center text-2xl font-bold border-b-2 border-black pb-1">{formData.applicationNumber}</div>
              </div>
              <div>
                <div className="font-bold text-sm mb-1">PERIOD TO:</div>
                <div className="border-b-2 border-black pb-1 text-sm">{new Date(formData.periodTo).toLocaleDateString()}</div>
              </div>
            </div>
            <div className="mb-3">
              <div className="font-bold text-sm mb-1">PROJECT:</div>
              <div className="border-b-2 border-black pb-1 text-sm">{project.name}</div>
            </div>
            <div>
              <div className="font-bold text-sm mb-1">PROJECT NUMBER:</div>
              <div className="border-b-2 border-black pb-1 text-sm">{project.projectCode}</div>
            </div>
          </div>
          <div className="text-left">
            <div className="font-bold mb-1">FROM (Contractor):</div>
            <div className="space-y-1 mb-3">
              <div>{formData.contractorName}</div>
              <div>{formData.contractorAddress}</div>
            </div>
            <div>
              <div className="font-bold text-sm mb-2">Distribution to:</div>
              <div className="space-y-1">
                <label className="flex items-center text-sm">
                  <input type="checkbox" checked={formData.distributionTo?.owner} readOnly className="mr-2" />
                  OWNER
                </label>
                <label className="flex items-center text-sm">
                  <input type="checkbox" checked={formData.distributionTo?.architect} readOnly className="mr-2" />
                  ARCHITECT
                </label>
                <label className="flex items-center text-sm">
                  <input type="checkbox" checked={formData.distributionTo?.contractor} readOnly className="mr-2" />
                  CONTRACTOR
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Landscape Optimized Layout */}
      <div className="grid grid-cols-3 gap-8">
        {/* Left Column - Payment Summary Table */}
        <div className="col-span-2">
          <div className="mb-4">
            <h3 className="font-bold mb-3 text-sm">CONTRACTOR'S APPLICATION FOR PAYMENT</h3>
            <p className="text-sm mb-2">Application is made for payment, as shown below, in connection with the Contract.</p>
            <p className="text-sm mb-3">Continuation Sheet is enclosed.</p>

            <table className="w-full border-collapse border-2 border-black text-sm">
              <tbody>
                <tr>
                  <td className="border border-black p-2 font-medium">1. ORIGINAL CONTRACT SUM</td>
                  <td className="border border-black p-2 text-right w-8">$</td>
                  <td className="border border-black p-2 text-right w-32 font-medium">{totals.originalContractSum.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="border border-black p-2">2. NET CHANGE BY CHANGE ORDERS</td>
                  <td className="border border-black p-2 text-right">$</td>
                  <td className="border border-black p-2 text-right">{totals.netChangeOrders.toLocaleString()}</td>
                </tr>
                <tr className="bg-gray-100">
                  <td className="border border-black p-2 font-bold">3. CONTRACT SUM TO DATE</td>
                  <td className="border border-black p-2 text-right font-bold">$</td>
                  <td className="border border-black p-2 text-right font-bold">{totals.contractSumToDate.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="border border-black p-2">4. TOTAL COMPLETED & STORED TO DATE</td>
                  <td className="border border-black p-2 text-right">$</td>
                  <td className="border border-black p-2 text-right">{totals.totalCompletedAndStored.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="border border-black p-2 font-medium">5. RETAINAGE:</td>
                  <td className="border border-black p-2"></td>
                  <td className="border border-black p-2"></td>
                </tr>
                <tr>
                  <td className="border border-black p-2 pl-6">a. {formData.retainagePercentage}% of Completed Work</td>
                  <td className="border border-black p-2 text-right">$</td>
                  <td className="border border-black p-2 text-right">{(totals.totalRetainage * 0.9).toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="border border-black p-2 pl-6">b. {formData.retainagePercentage}% of Stored Material</td>
                  <td className="border border-black p-2 text-right">$</td>
                  <td className="border border-black p-2 text-right">{(totals.totalRetainage * 0.1).toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="border border-black p-2 pl-6 font-medium">TOTAL RETAINED</td>
                  <td className="border border-black p-2 text-right font-medium">$</td>
                  <td className="border border-black p-2 text-right font-medium">{totals.totalRetainage.toLocaleString()}</td>
                </tr>
                <tr className="bg-gray-100">
                  <td className="border border-black p-2 font-bold">6. TOTAL EARNED LESS RETAINAGE</td>
                  <td className="border border-black p-2 text-right font-bold">$</td>
                  <td className="border border-black p-2 text-right font-bold">{totals.totalEarnedLessRetainage.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="border border-black p-2">7. LESS PREVIOUS CERTIFICATES FOR PAYMENT</td>
                  <td className="border border-black p-2 text-right">$</td>
                  <td className="border border-black p-2 text-right">{totals.lessPreviousPayments.toLocaleString()}</td>
                </tr>
                <tr className="bg-yellow-100">
                  <td className="border border-black p-2 font-bold">8. CURRENT PAYMENT DUE</td>
                  <td className="border border-black p-2 text-right font-bold">$</td>
                  <td className="border border-black p-2 text-right font-bold text-lg">{totals.currentPaymentDue.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="border border-black p-2">9. BALANCE TO FINISH, INCLUDING RETAINAGE</td>
                  <td className="border border-black p-2 text-right">$</td>
                  <td className="border border-black p-2 text-right">{totals.balanceToFinish.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Change Order Summary */}
          <div className="mt-6">
            <table className="w-full border-collapse border-2 border-black text-sm">
              <thead>
                <tr>
                  <th className="border border-black p-2 text-left bg-gray-200 font-bold" colSpan={4}>CHANGE ORDER SUMMARY</th>
                </tr>
                <tr className="bg-gray-100">
                  <th className="border border-black p-2 text-center font-medium">Total changes approved in previous months by Owner</th>
                  <th className="border border-black p-2 text-center font-medium">ADDITIONS</th>
                  <th className="border border-black p-2 text-center font-medium">DEDUCTIONS</th>
                  <th className="border border-black p-2 text-center font-medium">Total approved this Month</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-black p-2 text-center">${totals.netChangeOrders.toLocaleString()}</td>
                  <td className="border border-black p-2 text-center">$0.00</td>
                  <td className="border border-black p-2 text-center">$0.00</td>
                  <td className="border border-black p-2 text-center">$0.00</td>
                </tr>
                <tr className="bg-gray-100">
                  <td className="border border-black p-2 font-bold">TOTALS</td>
                  <td className="border border-black p-2 text-center font-bold">${totals.netChangeOrders.toLocaleString()}</td>
                  <td className="border border-black p-2 text-center font-bold">$0.00</td>
                  <td className="border border-black p-2 text-center font-bold">$0.00</td>
                </tr>
                <tr>
                  <td className="border border-black p-2 font-medium" colSpan={2}>NET CHANGES by Change Order</td>
                  <td className="border border-black p-2 text-center font-bold" colSpan={2}>${totals.netChangeOrders.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column - Certification and Signatures */}
        <div className="space-y-6">
          {/* Contractor Certification */}
          <div>
            <p className="text-sm mb-4 leading-relaxed">The undersigned Contractor certifies that to the best of the Contractor's knowledge, information and belief the Work covered by this Application for Payment has been completed in accordance with the Contract Documents, that all amounts have been paid by the Contractor for Work for which previous Certificates for Payment were issued and payments received from the Owner, and that current payment shown herein is now due.</p>
            
            <div className="mb-4">
              <p className="font-bold text-sm">CONTRACTOR:</p>
              <p className="font-bold">{formData.contractorName?.toUpperCase()}</p>
            </div>
            
            <div className="mb-6">
              <div className="mb-4">
                <p className="text-sm mb-2">By: ________________________________</p>
                {formData.contractorSignatory && (
                  <p className="text-sm">{formData.contractorSignatory}, {formData.contractorTitle}</p>
                )}
                {formData.contractorSignature && (
                  <div className="mt-2">
                    <img src={formData.contractorSignature} alt="Contractor Signature" className="max-h-12" />
                  </div>
                )}
              </div>
              <div>
                <p className="text-sm">Date: {new Date().toLocaleDateString()}</p>
              </div>
            </div>
          </div>

          {/* Architect's Certificate */}
          <div className="border-t-2 border-black pt-4">
            <h3 className="font-bold mb-4 text-sm">ARCHITECT'S CERTIFICATE FOR PAYMENT</h3>
            <p className="text-sm mb-4 leading-relaxed">In accordance with the Contract Documents, based on on-site observations and the data comprising the application, the Architect certifies to the Owner that to the best of the Architect's knowledge, information and belief the Work has progressed as indicated, the quality of the Work is in accordance with the Contract Documents, and the Contractor is entitled to payment of the AMOUNT CERTIFIED.</p>
            
            <div className="mb-4 p-2 bg-yellow-100 border border-black">
              <span className="font-bold text-sm">AMOUNT CERTIFIED: </span>
              <span className="text-lg font-bold">$ {totals.currentPaymentDue.toLocaleString()}</span>
            </div>
            
            <p className="text-xs mb-4 italic">(Attach explanation if amount certified differs from the amount applied. Initial all figures on this Application and on the Continuation Sheet that are changed to conform with the amount certified.)</p>
            
            <div className="mb-4">
              <p className="font-bold text-sm mb-2">ARCHITECT:</p>
              <div className="space-y-2">
                <div>
                  <p className="text-sm">By: ________________________________</p>
                </div>
                <div>
                  <p className="text-sm">Date: _________________</p>
                </div>
              </div>
            </div>
            
            <p className="text-xs leading-relaxed">This Certificate is not negotiable. The AMOUNT CERTIFIED is payable only to the Contractor named herein. Issuance, payment and acceptance of payment are without prejudice to any rights of the Owner or Contractor under this Contract.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
