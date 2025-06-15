
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CheckSquare, Square, Trash2, Settings2, Calendar } from 'lucide-react';
import type { Equipment } from '@/types/equipment';

interface BulkOperationsToolbarProps {
  selectedCount: number;
  totalCount: number;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBulkStatusUpdate: (status: Equipment['status']) => void;
  onBulkDelete: () => void;
  onBulkMaintenance: () => void;
}

export function BulkOperationsToolbar({
  selectedCount,
  totalCount,
  onSelectAll,
  onClearSelection,
  onBulkStatusUpdate,
  onBulkDelete,
  onBulkMaintenance
}: BulkOperationsToolbarProps) {
  if (selectedCount === 0) return null;

  const isAllSelected = selectedCount === totalCount;

  return (
    <div className="flex items-center justify-between p-4 bg-blue-50 border border-blue-200 rounded-lg">
      <div className="flex items-center gap-4">
        <Button
          variant="ghost"
          size="sm"
          onClick={isAllSelected ? onClearSelection : onSelectAll}
          className="flex items-center gap-2"
        >
          {isAllSelected ? (
            <CheckSquare className="w-4 h-4" />
          ) : (
            <Square className="w-4 h-4" />
          )}
          {selectedCount} of {totalCount} selected
        </Button>

        <div className="h-4 w-px bg-gray-300" />

        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-600">Update status:</span>
          <Select onValueChange={(value) => onBulkStatusUpdate(value as Equipment['status'])}>
            <SelectTrigger className="w-32">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Available">Available</SelectItem>
              <SelectItem value="In Use">In Use</SelectItem>
              <SelectItem value="Maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onBulkMaintenance}
          className="flex items-center gap-2"
        >
          <Calendar className="w-4 h-4" />
          Schedule Maintenance
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onBulkDelete}
          className="flex items-center gap-2 text-red-600 hover:text-red-700"
        >
          <Trash2 className="w-4 h-4" />
          Delete Selected
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="text-gray-500"
        >
          Cancel
        </Button>
      </div>
    </div>
  );
}
