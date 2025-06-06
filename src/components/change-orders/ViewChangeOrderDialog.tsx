
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface ChangeOrder {
  id: string;
  number: string;
  description: string;
  amount: number;
  status: string;
  date: string;
  created_at: string;
}

interface ViewChangeOrderDialogProps {
  changeOrder: ChangeOrder | null;
  open: boolean;
  onClose: () => void;
}

export function ViewChangeOrderDialog({ changeOrder, open, onClose }: ViewChangeOrderDialogProps) {
  if (!changeOrder) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Approved': return 'bg-green-100 text-green-800';
      case 'Draft': return 'bg-blue-100 text-blue-800';
      case 'Pending': return 'bg-yellow-100 text-yellow-800';
      case 'Rejected': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Change Order Details</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700">Change Order Number</label>
            <p className="text-lg font-semibold">{changeOrder.number}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Description</label>
            <p className="text-gray-900">{changeOrder.description}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Amount</label>
            <p className={`text-lg font-semibold ${changeOrder.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {changeOrder.amount >= 0 ? '+' : ''}${changeOrder.amount.toLocaleString()}
            </p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Status</label>
            <div className="mt-1">
              <Badge className={getStatusColor(changeOrder.status)}>
                {changeOrder.status}
              </Badge>
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Date</label>
            <p className="text-gray-900">{format(new Date(changeOrder.date), 'MMM dd, yyyy')}</p>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700">Created</label>
            <p className="text-gray-900">{format(new Date(changeOrder.created_at), 'MMM dd, yyyy')}</p>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
