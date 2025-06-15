
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  DollarSign, 
  Clock, 
  TrendingUp, 
  AlertTriangle,
  Calendar,
  MapPin
} from 'lucide-react';
import type { Equipment, EquipmentUsageLog, EquipmentAlert } from '@/types/equipment';
import { EquipmentService } from '@/services/equipmentService';

interface EquipmentAnalyticsModalProps {
  equipment: Equipment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  usageLogs?: EquipmentUsageLog[];
  alerts?: EquipmentAlert[];
}

export function EquipmentAnalyticsModal({
  equipment,
  open,
  onOpenChange,
  usageLogs = [],
  alerts = []
}: EquipmentAnalyticsModalProps) {
  if (!equipment) return null;

  const currentValue = EquipmentService.calculateDepreciation(equipment);
  const utilization = EquipmentService.calculateUtilization(equipment, usageLogs);
  const totalRevenue = (equipment.total_hours_used || 0) * equipment.hourly_rate;
  const maintenanceCost = 0; // Would be calculated from maintenance logs
  const roi = equipment.value ? ((totalRevenue - maintenanceCost) / equipment.value) * 100 : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Equipment Analytics: {equipment.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Key Metrics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-green-600" />
                  Current Value
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  ${currentValue.toLocaleString()}
                </div>
                {equipment.value && (
                  <div className="text-sm text-gray-500">
                    Original: ${equipment.value.toLocaleString()}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <Clock className="w-4 h-4 text-blue-600" />
                  Utilization
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {utilization.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-500">
                  {equipment.total_hours_used || 0} hours used
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-purple-600" />
                  Revenue Generated
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-purple-600">
                  ${totalRevenue.toLocaleString()}
                </div>
                <div className="text-sm text-gray-500">
                  ${equipment.hourly_rate}/hr rate
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-orange-600" />
                  ROI
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {roi.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-500">
                  Return on investment
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Equipment Details */}
          <Card>
            <CardHeader>
              <CardTitle>Equipment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Category</label>
                  <p>{equipment.category}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <Badge variant="outline">{equipment.status}</Badge>
                </div>
                {equipment.location && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Location</label>
                    <p className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      {equipment.location}
                    </p>
                  </div>
                )}
                {equipment.purchase_date && (
                  <div>
                    <label className="text-sm font-medium text-gray-500">Purchase Date</label>
                    <p className="flex items-center gap-1">
                      <Calendar className="w-4 h-4" />
                      {new Date(equipment.purchase_date).toLocaleDateString()}
                    </p>
                  </div>
                )}
              </div>

              {equipment.specifications && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Specifications</label>
                  <div className="mt-1 p-3 bg-gray-50 rounded">
                    <pre className="text-sm whitespace-pre-wrap">
                      {JSON.stringify(equipment.specifications, null, 2)}
                    </pre>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Active Alerts */}
          {alerts.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <AlertTriangle className="w-5 h-5 text-orange-500" />
                  Active Alerts
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {alerts.map((alert) => (
                    <div
                      key={alert.id}
                      className={`p-3 rounded border-l-4 ${
                        alert.severity === 'high' ? 'border-red-500 bg-red-50' :
                        alert.severity === 'medium' ? 'border-orange-500 bg-orange-50' :
                        'border-yellow-500 bg-yellow-50'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <p className="font-medium">{alert.message}</p>
                        <Badge variant="outline" className="capitalize">
                          {alert.severity}
                        </Badge>
                      </div>
                      {alert.due_date && (
                        <p className="text-sm text-gray-600 mt-1">
                          Due: {new Date(alert.due_date).toLocaleDateString()}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Recent Usage */}
          {usageLogs.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Recent Usage</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {usageLogs.slice(0, 5).map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                      <div>
                        <p className="font-medium">{log.operator_name || 'Unknown Operator'}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(log.start_time).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">{log.hours_used || 0} hours</p>
                        {log.fuel_consumed && (
                          <p className="text-sm text-gray-600">{log.fuel_consumed}L fuel</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
