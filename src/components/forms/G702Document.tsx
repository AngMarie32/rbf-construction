
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
  return (
    <div className="bg-white p-6 mx-auto text-black print:shadow-none" style={{ width: '11in', minHeight: '8.5in' }}>
      {/* Header */}
      <div className="text-center mb-6">
        <h1 className="text-xl font-bold mb-2">APPLICATION AND CERTIFICATE FOR PAYMENT</h1>
        <p className="text-sm">AIA DOCUMENT G702™</p>
      </div>

      {/* Company Information */}
      <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
        <div className="border border-black p-3">
          <div className="font-bold mb-2">FROM:</div>
          <div>{companyInfo?.name || 'Company Name'}</div>
          <div>{companyInfo?.address || 'Company Address'}</div>
          <div>{companyInfo?.phone || 'Phone'} | {companyInfo?.email || 'Email'}</div>
        </div>
        <div className="border border-black p-3">
          <div className="font-bold mb-2">TO:</div>
          <div>{project.client || 'Client Name'}</div>
          <div>{project.address || 'Project Address'}</div>
        </div>
      </div>

      {/* Project Information */}
      <div className="grid grid-cols-2 gap-6 mb-6 text-sm">
        <div>
          <div className="mb-2"><span className="font-bold">PROJECT:</span> {project.name}</div>
          <div className="mb-2"><span className="font-bold">PROJECT NUMBER:</span> {formData.projectNumber || project.projectCode}</div>
          <div className="mb-2"><span className="font-bold">APPLICATION NUMBER:</span> {formData.applicationNumber}</div>
        </div>
        <div>
          <div className="mb-2"><span className="font-bold">PERIOD TO:</span> {new Date(formData.periodTo).toLocaleDateString()}</div>
          <div className="mb-2"><span className="font-bold">ARCHITECT:</span> {formData.architectName || 'Architect Name'}</div>
        </div>
      </div>

      {/* Payment Summary */}
      <div className="border border-black mb-6">
        <table className="w-full text-sm">
          <tbody>
            <tr className="border-b border-black">
              <td className="p-2 border-r border-black font-bold">1. ORIGINAL CONTRACT SUM</td>
              <td className="p-2 text-right">${formData.originalContractSum?.toLocaleString() || '0.00'}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="p-2 border-r border-black font-bold">2. NET CHANGE BY CHANGE ORDERS</td>
              <td className="p-2 text-right">${formData.netChangeByChangeOrders?.toLocaleString() || '0.00'}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="p-2 border-r border-black font-bold">3. CONTRACT SUM TO DATE (Line 1 ± 2)</td>
              <td className="p-2 text-right">${formData.contractSumToDate?.toLocaleString() || '0.00'}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="p-2 border-r border-black font-bold">4. TOTAL COMPLETED AND STORED TO DATE</td>
              <td className="p-2 text-right">${formData.totalCompletedAndStored?.toLocaleString() || '0.00'}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="p-2 border-r border-black font-bold">5. RETAINAGE</td>
              <td className="p-2 text-right">${formData.totalRetainage?.toLocaleString() || '0.00'}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="p-2 border-r border-black font-bold">6. TOTAL EARNED LESS RETAINAGE (Line 4 - 5)</td>
              <td className="p-2 text-right">${formData.totalEarnedLessRetainage?.toLocaleString() || '0.00'}</td>
            </tr>
            <tr className="border-b border-black">
              <td className="p-2 border-r border-black font-bold">7. LESS PREVIOUS CERTIFICATES FOR PAYMENT</td>
              <td className="p-2 text-right">${formData.lessPreviousCertificates?.toLocaleString() || '0.00'}</td>
            </tr>
            <tr className="border-b border-black bg-gray-100">
              <td className="p-2 border-r border-black font-bold">8. CURRENT PAYMENT DUE</td>
              <td className="p-2 text-right font-bold">${formData.currentPaymentDue?.toLocaleString() || '0.00'}</td>
            </tr>
            <tr>
              <td className="p-2 border-r border-black font-bold">9. BALANCE TO FINISH, INCLUDING RETAINAGE</td>
              <td className="p-2 text-right">${formData.balanceToFinish?.toLocaleString() || '0.00'}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Signatures */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div className="border border-black p-4">
          <div className="mb-4">
            <div className="font-bold mb-2">CONTRACTOR'S APPLICATION FOR PAYMENT</div>
            <p className="text-xs mb-4">
              The undersigned Contractor certifies that to the best of the Contractor's knowledge, information and belief, 
              the Work covered by this Application for Payment has been completed in accordance with the Contract Documents.
            </p>
          </div>
          <div className="mt-12">
            <div className="border-b border-black mb-2 h-8"></div>
            <div className="text-xs">Contractor Signature</div>
            <div className="mt-2 text-xs">Date: {formData.contractorDate ? new Date(formData.contractorDate).toLocaleDateString() : '_____________'}</div>
          </div>
          
          {/* Notary Section */}
          <div className="mt-8 border-t border-black pt-4">
            <div className="text-xs font-bold mb-2">NOTARY PUBLIC</div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-xs mb-1">State of: ________________</div>
                <div className="text-xs mb-1">County of: _______________</div>
              </div>
              <div>
                <div className="text-xs mb-1">Commission Expires: ___________</div>
              </div>
            </div>
            <div className="mt-4 h-16 border border-gray-300 bg-gray-50 flex items-center justify-center">
              <span className="text-xs text-gray-500">NOTARY SEAL/STAMP</span>
            </div>
            <div className="mt-2">
              <div className="border-b border-black mb-1 h-6"></div>
              <div className="text-xs">Notary Public Signature</div>
            </div>
          </div>
        </div>

        <div className="border border-black p-4">
          <div className="mb-4">
            <div className="font-bold mb-2">ARCHITECT'S CERTIFICATE FOR PAYMENT</div>
            <p className="text-xs mb-4">
              In accordance with the Contract Documents, based on on-site observations and the data comprising this application, 
              the Architect certifies to the Owner that to the best of the Architect's knowledge, information and belief, 
              the Work has progressed as indicated.
            </p>
          </div>
          <div className="mt-12">
            <div className="border-b border-black mb-2 h-8"></div>
            <div className="text-xs">Architect Signature</div>
            <div className="mt-2 text-xs">Date: {formData.architectDate ? new Date(formData.architectDate).toLocaleDateString() : '_____________'}</div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="text-center text-xs text-gray-500 mt-8">
        <p>AIA Document G702™ – 1992. Copyright © 1992 by The American Institute of Architects.</p>
      </div>
    </div>
  );
}
