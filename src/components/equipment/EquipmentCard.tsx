
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  Building, 
  Truck, 
  DollarSign,
  MapPin,
  Wrench,
  Settings,
  MoreVertical,
  Edit2,
  Trash2,
  Calendar,
  Hash
} from 'lucide-react';
import type { Equipment } from '@/types/equipment';

interface EquipmentCardProps {
  equipment: Equipment;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onEdit: (equipment: Equipment) => void;
  onDelete: (id: string) => void;
  onMaintenance: (equipment: Equipment) => void;
  onAddToEstimator: (equipment: Equipment) => void;
}

export function EquipmentCard({
  equipment,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onMaintenance,
  onAddToEstimator
}: EquipmentCardProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available': return 'bg-green-100 text-green-800 border-green-200';
      case 'In Use': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Maintenance': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'Heavy Machinery': return <Building className="w-4 h-4" />;
      case 'Trucks': return <Truck className="w-4 h-4" />;
      case 'Trailers': return <Truck className="w-4 h-4" />;
      default: return <Wrench className="w-4 h-4" />;
    }
  };

  return (
    <Card className={`transition-all duration-200 hover:shadow-lg ${isSelected ? 'ring-2 ring-blue-500 shadow-md' : 'shadow-sm'} bg-white border border-gray-200`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-1">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onSelect(equipment.id)}
              className="mt-1"
            />
            <div className="flex-1 min-w-0">
              <CardTitle className="text-lg font-semibold text-gray-900 truncate">
                {equipment.name}
              </CardTitle>
              <div className="flex items-center gap-2 mt-1">
                <Badge className={`text-xs font-medium border ${getStatusColor(equipment.status)}`} variant="outline">
                  {equipment.status}
                </Badge>
              </div>
            </div>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onEdit(equipment)}>
                <Edit2 className="h-4 w-4 mr-2" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem 
                onClick={() => onDelete(equipment.id)}
                className="text-red-600 focus:text-red-600"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {equipment.image && (
          <div className="relative h-40 overflow-hidden rounded-lg bg-gray-100">
            <img 
              src={equipment.image} 
              alt={equipment.name}
              className="w-full h-full object-cover object-center"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}

        <div className="space-y-3">
          {equipment.year && (
            <div className="text-sm text-gray-700">
              <span className="font-medium">Year:</span> {equipment.year}
            </div>
          )}
          
          {equipment.qr_code && (
            <div className="text-sm text-gray-700">
              <span className="font-medium">VIN/Serial #:</span> {equipment.qr_code}
            </div>
          )}
          
          {equipment.value && (
            <div className="text-sm text-gray-700">
              <span className="font-medium">Value:</span> ${equipment.value.toLocaleString()}
            </div>
          )}
        </div>

        {equipment.description && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {equipment.description}
          </p>
        )}

        {equipment.location && (
          <div className="flex items-center gap-2 text-sm text-gray-600 p-2 bg-gray-50 rounded-lg">
            <MapPin className="w-3 h-3" />
            <span className="text-xs">{equipment.location}</span>
          </div>
        )}

        <div className="flex gap-2 pt-2 border-t">
          <Button 
            size="sm" 
            variant="outline" 
            className="flex-1"
            onClick={() => onMaintenance(equipment)}
          >
            <Settings className="w-4 h-4 mr-1" />
            Maintenance
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className="flex-1"
            onClick={() => onAddToEstimator(equipment)}
          >
            <DollarSign className="w-4 h-4 mr-1" />
            Estimate
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
