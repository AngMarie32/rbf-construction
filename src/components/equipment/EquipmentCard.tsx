
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
  Wrench
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
      case 'Available': return 'bg-green-500';
      case 'In Use': return 'bg-blue-500';
      case 'Maintenance': return 'bg-yellow-500';
      default: return 'bg-gray-500';
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
    <Card className={`overflow-hidden transition-all hover:shadow-md ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3 flex-1">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onSelect(equipment.id)}
            />
            <div className="flex-1">
              <CardTitle className="text-lg font-semibold">{equipment.name}</CardTitle>
              <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                {getCategoryIcon(equipment.category)}
                <span>{equipment.category}</span>
                {equipment.year && <span>• {equipment.year}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`${getStatusColor(equipment.status)} text-white text-xs`}>
              {equipment.status}
            </Badge>
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onEdit(equipment)}
                className="h-8 w-8 p-0"
              >
                <Edit2 className="w-4 h-4" />
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => onDelete(equipment.id)}
                className="h-8 w-8 p-0 text-red-500 hover:text-red-700"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {equipment.image && (
          <div className="h-40 overflow-hidden rounded-lg">
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
          <p className="text-sm text-gray-600 line-clamp-2">{equipment.description}</p>
        )}

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 bg-gray-50 p-2 rounded">
            <Clock className="w-4 h-4 text-blue-600" />
            <div>
              <div className="font-medium">${equipment.hourly_rate}/hr</div>
              <div className="text-xs text-gray-500">Hourly Rate</div>
            </div>
          </div>
          {equipment.value && (
            <div className="flex items-center gap-2 bg-gray-50 p-2 rounded">
              <DollarSign className="w-4 h-4 text-green-600" />
              <div>
                <div className="font-medium">${equipment.value.toLocaleString()}</div>
                <div className="text-xs text-gray-500">Value</div>
              </div>
            </div>
          )}
        </div>

        {equipment.location && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <MapPin className="w-4 h-4" />
            <span>{equipment.location}</span>
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <Button 
            size="sm" 
            variant="outline" 
            className="flex-1"
            onClick={() => onMaintenance(equipment)}
          >
            <Wrench className="w-4 h-4 mr-1" />
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
