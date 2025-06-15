
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
  Calendar
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
          <div className="flex items-center gap-2 ml-2">
            <Badge className={`text-xs font-medium border ${getStatusColor(equipment.status)}`} variant="outline">
              {equipment.status}
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {equipment.image && (
          <div className="relative h-48 overflow-hidden rounded-lg bg-gray-100">
            <img 
              src={equipment.image} 
              alt={equipment.name}
              className="w-full h-full object-cover transition-transform duration-200 hover:scale-105"
              onError={(e) => {
                e.currentTarget.style.display = 'none';
              }}
            />
          </div>
        )}

        {equipment.description && (
          <p className="text-sm text-gray-600 line-clamp-2 leading-relaxed">
            {equipment.description}
          </p>
        )}

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-1">
              <Clock className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-medium text-blue-600 uppercase tracking-wide">Rate</span>
            </div>
            <div className="text-lg font-semibold text-gray-900">${equipment.hourly_rate}</div>
            <div className="text-xs text-gray-500">per hour</div>
          </div>
          
          {equipment.value && (
            <div className="bg-green-50 border border-green-100 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-1">
                <DollarSign className="w-4 h-4 text-green-600" />
                <span className="text-xs font-medium text-green-600 uppercase tracking-wide">Value</span>
              </div>
              <div className="text-lg font-semibold text-gray-900">${equipment.value.toLocaleString()}</div>
              <div className="text-xs text-gray-500">estimated</div>
            </div>
          )}
        </div>

        {equipment.location && (
          <div className="flex items-center gap-2 text-sm text-gray-600 bg-gray-50 rounded-lg p-3">
            <MapPin className="w-4 h-4 text-gray-400" />
            <span>{equipment.location}</span>
          </div>
        )}

        <div className="flex gap-2 pt-2 border-t border-gray-100">
          <Button 
            size="sm" 
            variant="outline" 
            className="flex-1 h-9"
            onClick={() => onEdit(equipment)}
          >
            <Edit2 className="w-4 h-4 mr-1" />
            Edit
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className="flex-1 h-9"
            onClick={() => onMaintenance(equipment)}
          >
            <Calendar className="w-4 h-4 mr-1" />
            Schedule
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className="flex-1 h-9"
            onClick={() => onAddToEstimator(equipment)}
          >
            <DollarSign className="w-4 h-4 mr-1" />
            Estimate
          </Button>
          <Button 
            size="sm" 
            variant="outline" 
            className="h-9 px-3 text-red-600 hover:text-red-700 hover:bg-red-50"
            onClick={() => onDelete(equipment.id)}
          >
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
