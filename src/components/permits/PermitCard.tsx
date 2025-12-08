
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, DollarSign, FileText, AlertTriangle, Edit, Eye, Trash2 } from 'lucide-react';
import { Permit } from '@/types/permits';

interface PermitCardProps {
  permit: Permit;
  onEdit: (permit: Permit) => void;
  onView: (permit: Permit) => void;
  onDelete?: (permit: Permit) => void;
}

export const PermitCard = ({ permit, onEdit, onView, onDelete }: PermitCardProps) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Issued': return 'bg-green-500 text-white';
      case 'Approved': return 'bg-blue-500 text-white';
      case 'Under Review': return 'bg-yellow-500 text-white';
      case 'Application Submitted': return 'bg-orange-500 text-white';
      case 'Rejected': return 'bg-red-500 text-white';
      case 'Expired': return 'bg-gray-500 text-white';
      default: return 'bg-gray-200 text-gray-800';
    }
  };

  const isExpiringSoon = permit.expiration_date && 
    new Date(permit.expiration_date) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

  return (
    <Card className="h-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="text-lg font-semibold mb-2">
              {permit.permit_type} Permit
            </CardTitle>
            <p className="text-sm text-muted-foreground mb-2">
              {permit.description}
            </p>
            {permit.permit_number && (
              <p className="text-xs text-muted-foreground">
                #{permit.permit_number}
              </p>
            )}
          </div>
          {isExpiringSoon && (
            <AlertTriangle className="w-5 h-5 text-yellow-500" />
          )}
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="flex items-center justify-between">
          <Badge className={getStatusColor(permit.status)}>
            {permit.status}
          </Badge>
          {permit.fee_amount && (
            <div className="flex items-center text-sm text-muted-foreground">
              <DollarSign className="w-4 h-4 mr-1" />
              ${permit.fee_amount.toLocaleString()}
              {permit.fee_paid && <span className="ml-1 text-green-600">✓</span>}
            </div>
          )}
        </div>

        <div className="space-y-2 text-sm">
          <div className="flex items-center text-muted-foreground">
            <FileText className="w-4 h-4 mr-2" />
            {permit.issuing_authority}
          </div>
          
          {permit.expiration_date && (
            <div className="flex items-center text-muted-foreground">
              <Calendar className="w-4 h-4 mr-2" />
              Expires: {new Date(permit.expiration_date).toLocaleDateString()}
              {isExpiringSoon && (
                <span className="ml-2 text-yellow-600 font-medium">
                  (Soon)
                </span>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => onView(permit)} className="flex-1">
            <Eye className="w-4 h-4 mr-1" />
            View
          </Button>
          <Button variant="outline" size="sm" onClick={() => onEdit(permit)} className="flex-1">
            <Edit className="w-4 h-4 mr-1" />
            Edit
          </Button>
          {onDelete && (
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => onDelete(permit)} 
              className="text-red-600 hover:text-red-700 hover:bg-red-50"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
