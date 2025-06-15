
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Building, 
  Truck, 
  Edit2, 
  Trash2,
  DollarSign,
  Clock,
  MapPin,
  Wrench,
  Settings
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
    <Card className={`transition-all duration-200 hover:shadow-lg ${isSelected ? 'ring-2 ring-blue-500 shadow-md' : 'shadow-sm'} bg-white`}>
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
              <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                {getCategoryIcon(equipment.category)}
                <span>{equipment.category}</span>
                {equipment.year && (
                  <>
                    <span>•</span>
                    <span>{equipment.year}</span>
                  </>
                )}
              </div>
            </div>
          </div>
          <Badge className={`text-xs font-medium border ${getStatusColor(equipment.status)}`} variant="outline">
            {equipment.status}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {equipment.image && (
          <div className="relative h-40 overflow-hidden rounded-lg bg-gray-100">
            <img 
              src={equipment.image} 
              alt={equipment.name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}

        {equipment.description && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {equipment.description}
          </p>
        )}

        <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-600">Hourly Rate</span>
          </div>
          <span className="text-lg font-bold text-gray-900">${equipment.hourly_rate}</span>
        </div>

        {equipment.value && (
          <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg">
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span className="text-sm font-medium text-green-600">Value</span>
            </div>
            <span className="text-lg font-bold text-gray-900">${equipment.value.toLocaleString()}</span>
          </div>
        )}

        {equipment.location && (
          <div className="flex items-center gap-2 text-sm text-gray-600 p-3 bg-gray-50 rounded-lg">
            <MapPin className="w-4 h-4" />
            <span>{equipment.location}</span>
          </div>
        )}

        <div className="flex gap-2 pt-2 border-t">
          <Button 
            size="sm" 
            variant="outline" 
            className="flex-1"
            onClick={() => onEdit(equipment)}
          >
            <Edit2 className="w-4 h-4 mr-1" />
            Edit
          </Button>
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
          <Button 
            size="sm" 
            variant="outline" 
            className="px-3 text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => onDelete(equipment.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
