
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Building, 
  Truck, 
  Wrench, 
  Edit2, 
  Trash2, 
  Calendar,
  DollarSign,
  Clock,
  MapPin,
  AlertTriangle,
  QrCode
} from 'lucide-react';
import type { Equipment } from '@/types/equipment';
import { EquipmentService } from '@/services/equipmentService';

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
      case 'Vehicles': return <Truck className="w-4 h-4" />;
      case 'Trailers': return <Truck className="w-4 h-4" />;
      default: return <Wrench className="w-4 h-4" />;
    }
  };

  const currentValue = EquipmentService.calculateDepreciation(equipment);
  const isMaintenanceDue = equipment.last_inspection_date && 
    new Date(equipment.last_inspection_date) < new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

  return (
    <Card className={`overflow-hidden ${isSelected ? 'ring-2 ring-blue-500' : ''}`}>
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={isSelected}
              onCheckedChange={() => onSelect(equipment.id)}
            />
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                {equipment.name}
                {isMaintenanceDue && (
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                )}
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-gray-600 mt-1">
                {getCategoryIcon(equipment.category)}
                <span>{equipment.category}</span>
                {equipment.year && <span>• {equipment.year}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={`${getStatusColor(equipment.status)} text-white`}>
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
          <div className="h-32 overflow-hidden rounded">
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
          <p className="text-sm text-gray-600">{equipment.description}</p>
        )}

        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="flex items-center gap-1">
            <Clock className="w-4 h-4 text-blue-600" />
            <span>${equipment.hourly_rate}/hr</span>
          </div>
          {equipment.value && (
            <div className="flex items-center gap-1">
              <DollarSign className="w-4 h-4 text-green-600" />
              <span>${currentValue.toLocaleString()}</span>
            </div>
          )}
          {equipment.location && (
            <div className="flex items-center gap-1">
              <MapPin className="w-4 h-4 text-gray-600" />
              <span className="truncate">{equipment.location}</span>
            </div>
          )}
          {equipment.total_hours_used && (
            <div className="flex items-center gap-1">
              <Clock className="w-4 h-4 text-purple-600" />
              <span>{equipment.total_hours_used}h used</span>
            </div>
          )}
        </div>

        {equipment.insurance_expiry && (
          <div className="flex items-center gap-1 text-sm">
            <Calendar className="w-4 h-4 text-orange-600" />
            <span>Insurance expires: {new Date(equipment.insurance_expiry).toLocaleDateString()}</span>
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

        {equipment.qr_code && (
          <Button
            size="sm"
            variant="outline"
            className="w-full"
            onClick={() => {
              navigator.clipboard.writeText(equipment.qr_code!);
            }}
          >
            <QrCode className="w-4 h-4 mr-2" />
            Copy QR Code
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
