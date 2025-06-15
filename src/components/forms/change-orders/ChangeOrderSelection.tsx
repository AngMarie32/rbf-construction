
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Plus, DollarSign } from 'lucide-react';

interface ChangeOrder {
  id: string;
  number: string;
  description: string;
  amount: number;
  status: string;
}

interface ChangeOrderSelectionProps {
  changeOrders: ChangeOrder[];
  selectedChangeOrders: string[];
  onToggleSelection: (id: string) => void;
  onAddToSOV: () => void;
}

export function ChangeOrderSelection({ 
  changeOrders, 
  selectedChangeOrders, 
  onToggleSelection, 
  onAddToSOV 
}: ChangeOrderSelectionProps) {
  const [showAll, setShowAll] = useState(false);
  
  const displayedOrders = showAll ? changeOrders : changeOrders.slice(0, 3);
  const selectedTotal = changeOrders
    .filter(co => selectedChangeOrders.includes(co.id))
    .reduce((sum, co) => sum + co.amount, 0);

  if (changeOrders.length === 0) {
    return (
      <Card className="border-dashed border-gray-300">
        <CardContent className="py-8">
          <div className="text-center text-gray-500">
            <DollarSign className="w-8 h-8 mx-auto mb-2 text-gray-400" />
            <p className="text-sm">No approved change orders available for this project.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            Available Change Orders
            <Badge variant="outline">{changeOrders.length} approved</Badge>
          </CardTitle>
          {selectedChangeOrders.length > 0 && (
            <div className="flex items-center gap-4">
              <div className="text-sm text-gray-600">
                Selected: <span className="font-medium text-green-600">${selectedTotal.toLocaleString()}</span>
              </div>
              <Button 
                size="sm" 
                onClick={onAddToSOV}
                className="flex items-center gap-1"
              >
                <Plus className="w-3 h-3" />
                Add to SOV ({selectedChangeOrders.length})
              </Button>
            </div>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="space-y-3">
          {displayedOrders.map((co) => (
            <div key={co.id} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-3">
                <Checkbox
                  id={`co-${co.id}`}
                  checked={selectedChangeOrders.includes(co.id)}
                  onCheckedChange={() => onToggleSelection(co.id)}
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge variant="secondary" className="text-xs">CO-{co.number}</Badge>
                    <Badge variant="outline" className="text-xs text-green-600 border-green-200">
                      Approved
                    </Badge>
                  </div>
                  <label htmlFor={`co-${co.id}`} className="cursor-pointer text-sm">
                    {co.description}
                  </label>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-green-600">
                  ${co.amount.toLocaleString()}
                </div>
              </div>
            </div>
          ))}
          
          {changeOrders.length > 3 && (
            <div className="text-center pt-2">
              <Button 
                variant="ghost" 
                size="sm" 
                onClick={() => setShowAll(!showAll)}
                className="text-blue-600 hover:text-blue-700"
              >
                {showAll ? 'Show Less' : `Show All ${changeOrders.length} Change Orders`}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
