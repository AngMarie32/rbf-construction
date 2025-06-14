
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface G702DocumentProps {
  project: any;
  formData: any;
  totals: any;
}

export function G702Document({ project, formData, totals }: G702DocumentProps) {
  return (
    <div className="bg-white p-6 mx-auto text-black print:shadow-none" style={{ width: '17in', minHeight: '11in' }}>
      {/* Header */}
      <div className="text-center mb-6 border-b-2 border-black pb-4">
        <h1 className="text-xl font-bold mb-2">APPLICATION AND CERTIFICATE FOR PAYMENT</h1>
        <div className="grid grid-cols-3 gap-4 text-sm">
          <div className="text-left">
            <div className="font-bold">TO (Owner):</div>
            <div>{project.client}</div>
            <div>{project.address}</div>
          </div>
          <div className="text-center">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <div className="font-bold text-xs">APPLICATION NO:</div>
                <div className="text-center text-lg font-bold border-b border-black">{formData.applicationNumber}</div>
              </div>
              <div>
                <div className="font-bold text-xs">PERIOD TO:</div>
                <div className="border-b border-black text-sm">{new Date(formData.periodTo).toLocaleDateString()}</div>
              </div>
            </div>
            <div className="mt-2">
              <div className="font-bold text-xs">PROJECT:</div>
              <div className="border-b border-black text-sm">{project.name}</div>
            </div>
            <div className="mt-2">
              <div className="font-bold text-xs">PROJECT NUMBER:</div>
              <div className="border-b border-black text-sm">{project.projectCode}</div>
            </div>
          </div>
          <div className="text-left">
            <div className="font-bold">FROM (Contractor):</div>
            <div>{formData.contractorName}</div>
            <div>{formData.contractorAddress}</div>
            <div className="mt-4">
              <div className="font-bold text-xs">Distribution to:</div>
              <div className="space-y-1">
                <label className="flex items-center text-xs">
                  <input type="checkbox" checked={formData.distributionTo?.owner} readOnly className="mr-2" />
                  OWNER
                </label>
                <label className="flex items-center text-xs">
                  <input type="checkbox" checked={formData.distributionTo?.architect} readOnly className="mr-2" />
                  ARCHITECT
                </label>
                <label className="flex items-center text-xs">
                  <input type="checkbox" checked={formData.distributionTo?.contractor} readOnly className="mr-2" />
                  CONTRACTOR
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Landscape Layout */}
      <div className="grid grid-cols-2 gap-8">
        {/* Left Column - Payment Summary Table and Change Order Summary */}
        <div className="space-y-6">
          <div>
            <h3 className="font-bold mb-4 text-sm">CONTRACTOR'S APPLICATION FOR PAYMENT</h3>
            <p className="text-xs mb-2">Application is made for payment, as shown below, in connection with the Contract.</p>
            <p className="text-xs mb-4">Continuation Sheet is enclosed.</p>

            <table className="w-full border-collapse border border-black text-xs">
              <tbody>
                <tr>
                  <td className="border border-black p-2 text-xs">1. ORIGINAL CONTRACT SUM</td>
                  <td className="border border-black p-2 text-right text-xs">$</td>
                  <td className="border border-black p-2 text-right w-32 text-xs">{totals.originalContractSum.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="border border-black p-2 text-xs">2. NET CHANGE BY CHANGE ORDERS</td>
                  <td className="border border-black p-2 text-right text-xs">$</td>
                  <td className="border border-black p-2 text-right text-xs">{totals.netChangeOrders.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="border border-black p-2 font-bold text-xs">3. CONTRACT SUM TO DATE</td>
                  <td className="border border-black p-2 text-right text-xs">$</td>
                  <td className="border border-black p-2 text-right font-bold text-xs">{totals.contractSumToDate.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="border border-black p-2 text-xs">4. TOTAL COMPLETED & STORED TO DATE</td>
                  <td className="border border-black p-2 text-right text-xs">$</td>
                  <td className="border border-black p-2 text-right text-xs">{totals.totalCompletedAndStored.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="border border-black p-2 text-xs">5. RETAINAGE:</td>
                  <td className="border border-black p-2 text-xs"></td>
                  <td className="border border-black p-2 text-xs"></td>
                </tr>
                <tr>
                  <td className="border border-black p-2 pl-8 text-xs">a. {formData.retainagePercentage}% of Completed Work</td>
                  <td className="border border-black p-2 text-right text-xs">$</td>
                  <td className="border border-black p-2 text-right text-xs">{(totals.totalRetainage * 0.9).toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="border border-black p-2 pl-8 text-xs">b. {formData.retainagePercentage}% of Stored Material</td>
                  <td className="border border-black p-2 text-right text-xs">$</td>
                  <td className="border border-black p-2 text-right text-xs">{(totals.totalRetainage * 0.1).toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="border border-black p-2 pl-8 text-xs">TOTAL RETAINED</td>
                  <td className="border border-black p-2 text-right text-xs">$</td>
                  <td className="border border-black p-2 text-right text-xs">{totals.totalRetainage.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="border border-black p-2 font-bold text-xs">6. TOTAL EARNED LESS RETAINAGE</td>
                  <td className="border border-black p-2 text-right text-xs">$</td>
                  <td className="border border-black p-2 text-right font-bold text-xs">{totals.totalEarnedLessRetainage.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="border border-black p-2 text-xs">7. LESS PREVIOUS CERTIFICATES FOR PAYMENT</td>
                  <td className="border border-black p-2 text-right text-xs">$</td>
                  <td className="border border-black p-2 text-right text-xs">{totals.lessPreviousPayments.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="border border-black p-2 font-bold text-sm">8. CURRENT PAYMENT DUE</td>
                  <td className="border border-black p-2 text-right text-xs">$</td>
                  <td className="border border-black p-2 text-right font-bold text-sm">{totals.currentPaymentDue.toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="border border-black p-2 text-xs">9. BALANCE TO FINISH, INCLUDING RETAINAGE</td>
                  <td className="border border-black p-2 text-right text-xs">$</td>
                  <td className="border border-black p-2 text-right text-xs">{totals.balanceToFinish.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Change Order Summary - Moved to left side */}
          <div>
            <table className="w-full border-collapse border border-black text-xs">
              <thead>
                <tr>
                  <th className="border border-black p-2 text-left bg-gray-100 text-xs" colSpan={4}>CHANGE ORDER SUMMARY</th>
                </tr>
                <tr>
                  <th className="border border-black p-1 text-center bg-gray-100 text-xs">Total changes approved in previous months by Owner</th>
                  <th className="border border-black p-1 text-center bg-gray-100 text-xs">ADDITIONS</th>
                  <th className="border border-black p-1 text-center bg-gray-100 text-xs">DEDUCTIONS</th>
                  <th className="border border-black p-1 text-center bg-gray-100 text-xs">Total approved this Month</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-black p-1 text-center text-xs">${totals.netChangeOrders.toLocaleString()}</td>
                  <td className="border border-black p-1 text-center text-xs">$0.00</td>
                  <td className="border border-black p-1 text-center text-xs">$0.00</td>
                  <td className="border border-black p-1 text-center text-xs">$0.00</td>
                </tr>
                <tr>
                  <td className="border border-black p-1 font-bold text-xs">TOTALS</td>
                  <td className="border border-black p-1 text-center font-bold text-xs">${totals.netChangeOrders.toLocaleString()}</td>
                  <td className="border border-black p-1 text-center font-bold text-xs">$0.00</td>
                  <td className="border border-black p-1 text-center font-bold text-xs">$0.00</td>
                </tr>
                <tr>
                  <td className="border border-black p-1 text-xs" colSpan={2}>NET CHANGES by Change Order</td>
                  <td className="border border-black p-1 text-center font-bold text-xs" colSpan={2}>${totals.netChangeOrders.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column - Certification and Signatures */}
        <div className="space-y-6">
          {/* Contractor Certification */}
          <div>
            <p className="text-xs mb-4">The undersigned Contractor certifies that to the best of the Contractor's knowledge, information and belief the Work covered by this Application for Payment has been completed in accordance with the Contract Documents, that all amounts have been paid by the Contractor for Work for which previous Certificates for Payment were issued and payments received from the Owner, and that current payment shown herein is now due.</p>
            
            <div className="mb-4">
              <p className="font-bold text-xs">CONTRACTOR: {formData.contractorName?.toUpperCase()}</p>
            </div>
            
            <div className="mb-8">
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-xs mb-2">By: {formData.contractorSignatory ? '___________________________________' : '___________________________________'}</p>
                  {formData.contractorSignatory && (
                    <p className="text-xs">{formData.contractorSignatory}, {formData.contractorTitle}</p>
                  )}
                  {formData.contractorSignature && (
                    <div className="mt-2">
                      <img src={formData.contractorSignature} alt="Contractor Signature" className="max-h-12" />
                    </div>
                  )}
                </div>
                <div>
                  <p className="text-xs mb-2">Date: {new Date().toLocaleDateString()}</p>
                </div>
              </div>
              
              {/* Space for Notary Stamp */}
              <div className="border border-dashed border-gray-400 p-4 mt-6">
                <p className="text-xs text-gray-500 text-center">Space for Notary Stamp</p>
                <div className="h-16"></div>
              </div>
            </div>
          </div>

          {/* Architect's Certificate */}
          <div className="border-t-2 border-black pt-4">
            <h3 className="font-bold mb-4 text-xs">ARCHITECT'S CERTIFICATE FOR PAYMENT</h3>
            <p className="text-xs mb-4">In accordance with the Contract Documents, based on on-site observations and the data comprising the application, the Architect certifies to the Owner that to the best of the Architect's knowledge, information and belief the Work has progressed as indicated, the quality of the Work is in accordance with the Contract Documents, and the Contractor is entitled to payment of the AMOUNT CERTIFIED.</p>
            
            <div className="mb-4">
              <span className="font-bold text-xs">AMOUNT CERTIFIED:</span>
              <span className="ml-4 border-b border-black px-2 text-xs">$ {totals.currentPaymentDue.toLocaleString()}</span>
            </div>
            
            <p className="text-xs mb-4 italic">(Attach explanation if amount certified differs from the amount applied. Initial all figures on this Application and on the Continuation Sheet that are changed to conform with the amount certified.)</p>
            
            <div className="mb-4">
              <p className="font-bold text-xs">ARCHITECT:</p>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs mb-2">By: ___________________________________</p>
                </div>
                <div>
                  <p className="text-xs mb-2">Date: _______________</p>
                </div>
              </div>
            </div>
            
            <p className="text-xs">This Certificate is not negotiable. The AMOUNT CERTIFIED is payable only to the Contractor named herein. Issuance, payment and acceptance of payment are without prejudice to any rights of the Owner or Contractor under this Contract.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
