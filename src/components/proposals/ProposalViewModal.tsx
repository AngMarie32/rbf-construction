
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Download, Mail, X, DollarSign, Calendar, User, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { Proposal } from '@/types';

interface ProposalViewModalProps {
  proposal: Proposal;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProposalViewModal({ proposal, open, onOpenChange }: ProposalViewModalProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Draft': return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'Sent': return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'Approved': return 'bg-green-100 text-green-800 border-green-300';
      case 'Rejected': return 'bg-red-100 text-red-800 border-red-300';
      default: return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const downloadProposal = () => {
    const content = `
PROPOSAL

Project: ${proposal.projectName}
Client: ${proposal.client}
Amount: $${proposal.amount.toLocaleString()}
Status: ${proposal.status}
Date: ${format(proposal.createdAt, 'MMMM dd, yyyy')}

Scope of Work:
${proposal.scope || 'No scope defined'}

Terms and Conditions:
- This proposal is valid for 30 days from the date above
- Payment terms: Net 30 days
- Work to begin upon signed contract and receipt of deposit

Thank you for considering our proposal. We look forward to working with you.
    `;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${proposal.projectName}-proposal.txt`;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Proposal Details</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="h-6 w-6 p-0"
            >
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Header Information */}
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div>
                  <CardTitle className="text-2xl text-blue-900">{proposal.projectName}</CardTitle>
                  <p className="text-blue-700 mt-1">Professional Construction Proposal</p>
                </div>
                <Badge className={getStatusColor(proposal.status)}>
                  {proposal.status}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="flex items-center gap-3">
                  <User className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">Client</p>
                    <p className="text-blue-700">{proposal.client}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <DollarSign className="w-5 h-5 text-green-600" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">Project Value</p>
                    <p className="text-xl font-bold text-green-600">${proposal.amount.toLocaleString()}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-blue-800">Date Created</p>
                    <p className="text-blue-700">{format(proposal.createdAt, 'MMMM dd, yyyy')}</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Scope of Work */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="w-5 h-5" />
                Scope of Work
              </CardTitle>
            </CardHeader>
            <CardContent>
              {proposal.scope ? (
                <div className="prose max-w-none">
                  <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">
                    {proposal.scope}
                  </p>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p>No scope of work defined for this proposal.</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Project Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Project Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">Project Name:</span>
                  <span className="font-medium">{proposal.projectName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Client:</span>
                  <span className="font-medium">{proposal.client}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Status:</span>
                  <Badge className={getStatusColor(proposal.status)}>
                    {proposal.status}
                  </Badge>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Created:</span>
                  <span className="font-medium">{format(proposal.createdAt, 'MMM dd, yyyy')}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Financial Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-600">Total Project Value:</span>
                  <span className="text-2xl font-bold text-green-600">
                    ${proposal.amount.toLocaleString()}
                  </span>
                </div>
                <div className="text-sm text-gray-500 space-y-1">
                  <p>• Price includes all materials and labor</p>
                  <p>• Valid for 30 days from proposal date</p>
                  <p>• Payment terms: Net 30 days</p>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Terms and Conditions */}
          <Card>
            <CardHeader>
              <CardTitle>Terms and Conditions</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-gray-700 space-y-2">
                <p><strong>1. Validity:</strong> This proposal is valid for 30 days from the date above.</p>
                <p><strong>2. Payment Terms:</strong> Net 30 days from invoice date.</p>
                <p><strong>3. Work Commencement:</strong> Work will begin upon signed contract and receipt of any required deposit.</p>
                <p><strong>4. Materials:</strong> All materials will be of industry standard quality unless otherwise specified.</p>
                <p><strong>5. Changes:</strong> Any changes to the scope of work must be approved in writing and may affect the total cost.</p>
                <p><strong>6. Permits:</strong> Client is responsible for obtaining any necessary permits unless specifically included in this proposal.</p>
              </div>
            </CardContent>
          </Card>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4 border-t">
            <Button onClick={downloadProposal} className="flex-1">
              <Download className="w-4 h-4 mr-2" />
              Download Proposal
            </Button>
            <Button variant="outline" className="flex-1">
              <Mail className="w-4 h-4 mr-2" />
              Email to Client
            </Button>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Close
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
