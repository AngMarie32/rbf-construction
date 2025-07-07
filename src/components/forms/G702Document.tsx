
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface G702DocumentProps {
  project: any;
  formData: any;
  companyInfo?: {
    name?: string;
    address?: string;
    phone?: string;
    email?: string;
  };
}

export function G702Document({ project, formData, companyInfo }: G702DocumentProps) {
  // Calculate contract sum including contingency - FIXED: Use proper addition
  const originalContractSum = formData.originalContractSum || 0;
  const contingencyAmount = project?.contingency_type === 'percentage' 
    ? (originalContractSum * (project?.contingency_value || 0)) / 100
    : (project?.contingency_value || 0);
  const contractSumWithContingency = originalContractSum + contingencyAmount;
  const contractSumToDate = contractSumWithContingency + (formData.netChangeByChangeOrders || 0);

  return (
    <div className="bg-white p-6 mx-auto text-black print:shadow-none print:p-4" style={{ width: '11in', minHeight: '8.5in', fontSize: '11px' }}>
      {/* Header */}
      <div className="text-center mb-4">
        <h1 className="text-lg font-bold mb-2">APPLICATION AND CERTIFICATION FOR PAYMENT</h1>
      </div>

      {/* Top Section with TO/FROM and Application Info */}
      <div className="grid grid-cols-2 gap-6 mb-4">
        {/* Left Column - TO/FROM */}
        <div>
          <div className="mb-3">
            <div className="font-bold mb-1">TO:</div>
            <div>{project?.client || 'Client Name'}</div>
            <div>{project?.address || 'Project Address'}</div>
          </div>
          
          <div>
            <div className="font-bold mb-1">FROM:</div>
            <div>{companyInfo?.name || 'RBF Construction, Inc.'}</div>
            <div>{companyInfo?.address || '1411 W. Hill Rd, Flint, MI 48507'}</div>
            <div>810-938-8498</div>
          </div>
        </div>

        {/* Right Column - Application Details */}
        <div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div>
              <div className="font-bold">APPLICATION NO:</div>
              <div>{formData.applicationNumber}</div>
            </div>
            <div>
              <div className="font-bold">Distribution to:</div>
              <div className="flex items-center gap-1 text-xs">
                <input type="checkbox" checked readOnly /> OWNER
              </div>
              <div className="flex items-center gap-1 text-xs">
                <input type="checkbox" readOnly /> ARCHITECT
              </div>
              <div className="flex items-center gap-1 text-xs">
                <input type="checkbox" readOnly /> CONTRACTOR
              </div>
            </div>
          </div>
          
          <div className="mt-3 grid grid-cols-1 gap-3 text-sm">
            <div className="flex items-center gap-4">
              <div>
                <div className="font-bold">PERIOD TO:</div>
                <div>{new Date(formData.periodTo).toLocaleDateString()}</div>
              </div>
              <div>
                <div className="font-bold">PROJECT:</div>
                <div>{project?.name}</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Two Column Layout */}
      <div className="grid grid-cols-2 gap-6 mb-4">
        {/* Left Column - Payment Summary */}
        <div className="border-t-2 border-black pt-3">
          <div className="font-bold mb-2">CONTRACTOR'S APPLICATION FOR PAYMENT</div>
          <div className="text-xs mb-2">
            Application is made for payment, as shown below, in connection with the Contract.<br/>
            Continuation Sheet is enclosed.
          </div>
          
          <div className="space-y-1 text-sm">
            <div className="flex justify-between">
              <span>1. ORIGINAL CONTRACT SUM</span>
              <span>$ {contractSumWithContingency.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>2. NET CHANGE BY CHANGE ORDERS</span>
              <span>$ {(formData.netChangeByChangeOrders || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>3. CONTRACT SUM TO DATE</span>
              <span>$ {contractSumToDate.toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>4. TOTAL COMPLETED & STORED TO DATE</span>
              <span>$ {(formData.totalCompleted || 0).toLocaleString()}</span>
            </div>
            
            <div className="ml-4 space-y-1 text-xs">
              <div className="flex justify-between">
                <span>a. Completed Work</span>
                <span>$ {((formData.totalCompleted || 0) * 0.9).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span>b. Stored Material</span>
                <span>$ {((formData.totalCompleted || 0) * 0.1).toLocaleString()}</span>
              </div>
            </div>
            
            <div className="flex justify-between">
              <span>5. TOTAL RETAINED</span>
              <span>$ {(formData.totalRetainage || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>6. TOTAL EARNED LESS RETAINAGE</span>
              <span>$ {(formData.totalEarnedLessRetainage || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>7. LESS PREVIOUS CERTIFICATES FOR PAYMENT</span>
              <span>$ {(formData.lessPreviousCertificates || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between font-bold">
              <span>8. CURRENT PAYMENT DUE</span>
              <span>$ {(formData.currentPaymentDue || 0).toLocaleString()}</span>
            </div>
            <div className="flex justify-between">
              <span>9. BALANCE TO FINISH, INCLUDING RETAINAGE</span>
              <span>$ {(formData.balanceToFinish || 0).toLocaleString()}</span>
            </div>
          </div>

          {/* Change Order Summary - Moved directly under the 1-9 section */}
          <div className="mt-6">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-black p-1 text-left">CHANGE ORDER SUMMARY</th>
                  <th className="border border-black p-1">ADDITIONS</th>
                  <th className="border border-black p-1">DEDUCTIONS</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td className="border border-black p-1">Total changes approved in previous months by Owner</td>
                  <td className="border border-black p-1 text-right">$0.00</td>
                  <td className="border border-black p-1 text-right">$0.00</td>
                </tr>
                <tr>
                  <td className="border border-black p-1">Total approved this Month</td>
                  <td className="border border-black p-1 text-right">${Math.max(formData.netChangeByChangeOrders || 0, 0).toLocaleString()}</td>
                  <td className="border border-black p-1 text-right">${Math.max(-(formData.netChangeByChangeOrders || 0), 0).toLocaleString()}</td>
                </tr>
                <tr className="font-bold">
                  <td className="border border-black p-1">TOTALS</td>
                  <td className="border border-black p-1 text-right">${Math.max(formData.netChangeByChangeOrders || 0, 0).toLocaleString()}</td>
                  <td className="border border-black p-1 text-right">${Math.max(-(formData.netChangeByChangeOrders || 0), 0).toLocaleString()}</td>
                </tr>
                <tr>
                  <td className="border border-black p-1">NET CHANGES by Change Order</td>
                  <td className="border border-black p-1 text-right" colSpan={2}>${(formData.netChangeByChangeOrders || 0).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column - Certification, Notary, and Architect */}
        <div className="border-t-2 border-black pt-3">
          <div className="text-xs mb-3">
            The undersigned Contractor certifies that to the best of the Contractor's knowledge, 
            information and belief the Work covered by this Application for Payment has been 
            completed in accordance with the Contract Documents.
          </div>
          
          <div className="mb-3">
            <div className="font-bold text-sm">CONTRACTOR: {companyInfo?.name || 'RBF CONSTRUCTION, INC.'}</div>
          </div>
          
          <div className="mb-4">
            <div className="mb-2">By: _________________________________</div>
            <div className="text-xs">Date: {formData.contractorDate ? new Date(formData.contractorDate).toLocaleDateString() : '_____________'}</div>
          </div>

          {/* Notary Section */}
          <div className="border border-black p-2 mb-4">
            <div className="text-xs font-bold mb-1">NOTARY PUBLIC</div>
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>State of: _______________</div>
              <div>County of: _____________</div>
            </div>
            <div className="text-xs mt-1">Commission Expires: __________</div>
            <div className="mt-2 h-8 border border-gray-300 bg-gray-50">
            </div>
            <div className="mt-1">
              <div className="border-b border-black mb-1 h-3"></div>
              <div className="text-xs">Notary Public Signature</div>
            </div>
          </div>

          {/* Architect's Certificate - Moved under Notary */}
          <div className="border-t border-black pt-2">
            <div className="font-bold mb-2 text-sm">ARCHITECT'S CERTIFICATE FOR PAYMENT</div>
            <div className="text-xs mb-2">
              In accordance with the Contract Documents, based on on-site observations and the data 
              comprising the application, the Architect certifies to the Owner that to the best of the 
              Architect's knowledge, information and belief the Work has progressed as indicated, 
              the quality of the Work is in accordance with the Contract Documents, and the Contractor 
              is entitled to payment of the AMOUNT CERTIFIED.
            </div>
            
            <div className="mb-3">
              <div className="font-bold text-sm">AMOUNT CERTIFIED ........................ $ {(formData.currentPaymentDue || 0).toLocaleString()}</div>
              <div className="text-xs italic mt-1">
                (Attach explanation if amount certified differs from the amount applied. Initial all figures on this 
                Application and on the Continuation Sheet that are changed to conform with the amount certified.)
              </div>
            </div>
            
            <div className="mt-3">
              <div className="font-bold text-sm">ARCHITECT:</div>
              <div className="mt-2">
                <div className="mb-1">By: _________________________________</div>
                <div className="text-xs">Date: {formData.architectDate ? new Date(formData.architectDate).toLocaleDateString() : '_____________'}</div>
              </div>
              <div className="text-xs mt-2">
                <div>This Certificate is not negotiable. The AMOUNT CERTIFIED is payable only to the</div>
                <div>Contractor named herein. Issuance, payment and acceptance of payment are without</div>
                <div>prejudice to any rights of the Owner or Contractor under this Contract.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
