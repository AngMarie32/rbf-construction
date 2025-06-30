
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  MoreVertical, 
  Edit2, 
  Trash2, 
  Wrench, 
  Calculator,
  MapPin,
  Calendar,
  DollarSign,
  Clock,
  Settings
} from 'lucide-react';
import { MaintenanceAlertSettings } from './MaintenanceAlertSettings';
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
  const [imageError, setImageError] = useState(false);

  const handleDelete = () => {
    if (confirm(`Are you sure you want to delete ${equipment.name}?`)) {
      onDelete(equipment.id);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Available':
        return 'bg-green-100 text-green-800';
      case 'In Use':
        return 'bg-blue-100 text-blue-800';
      case 'Maintenance':
        return 'bg-yellow-100 text-yellow-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Card className="relative group hover:shadow-lg transition-shadow">
      <div className="absolute top-3 left-3 z-10">
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelect(equipment.id)}
          className="bg-white border-2"
        />
      </div>

      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1 min-w-0 ml-8">
            <CardTitle className="text-lg truncate" title={equipment.name}>
              {equipment.name}
            </CardTitle>
            <Badge className={`mt-1 ${getStatusColor(equipment.status)}`}>
              {equipment.status}
            </Badge>
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
              <DropdownMenuItem onClick={() => onMaintenance(equipment)}>
                <Wrench className="h-4 w-4 mr-2" />
                Maintenance
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddToEstimator(equipment)}>
                <Calculator className="h-4 w-4 mr-2" />
                Add to Estimator
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleDelete} className="text-red-600">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Equipment Image */}
        {equipment.image && !imageError ? (
          <div className="aspect-video rounded-lg overflow-hidden bg-gray-100">
            <img
              src={equipment.image}
              alt={equipment.name}
              className="w-full h-full object-cover"
              onError={() => setImageError(true)}
            />
          </div>
        ) : (
          <div className="aspect-video rounded-lg bg-gray-100 flex items-center justify-center">
            <span className="text-gray-400 text-sm">No Image</span>
          </div>
        )}

        {/* Equipment Details */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <Badge variant="outline">{equipment.category}</Badge>
            {equipment.year && <span>• {equipment.year}</span>}
          </div>

          {equipment.location && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <MapPin className="h-4 w-4" />
              <span>{equipment.location}</span>
            </div>
          )}

          <div className="flex items-center gap-2 text-sm text-gray-600">
            <DollarSign className="h-4 w-4" />
            <span>${equipment.hourly_rate}/hour</span>
          </div>

          {equipment.total_hours_used !== undefined && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="h-4 w-4" />
              <span>{equipment.total_hours_used} hours used</span>
            </div>
          )}

          {equipment.last_inspection_date && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Calendar className="h-4 w-4" />
              <span>Last inspected: {new Date(equipment.last_inspection_date).toLocaleDateString()}</span>
            </div>
          )}
        </div>

        {/* Description */}
        {equipment.description && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {equipment.description}
          </p>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onMaintenance(equipment)}
            className="flex items-center gap-2"
          >
            <Wrench className="h-4 w-4" />
            Maintenance
          </Button>
          <MaintenanceAlertSettings 
            equipmentId={equipment.id} 
            equipmentName={equipment.name} 
          />
        </div>
      </CardContent>
    </Card>
  );
}
