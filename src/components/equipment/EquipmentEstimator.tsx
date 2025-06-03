
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Truck, Save, Download, X } from 'lucide-react';
import { Equipment } from '@/types';
import { toast } from 'sonner';

interface EstimatorItem {
  equipment: Equipment;
  duration: number;
  unit: 'hours' | 'days';
}

interface EquipmentEstimatorProps {
  selectedEquipment: EstimatorItem[];
  onRemoveEquipment: (equipmentId: string) => void;
  onUpdateDuration: (equipmentId: string, duration: number, unit: 'hours' | 'days') => void;
  onSaveEstimate: () => void;
  onExportEstimate: () => void;
}

export function EquipmentEstimator({ 
  selectedEquipment, 
  onRemoveEquipment, 
  onUpdateDuration, 
  onSaveEstimate, 
  onExportEstimate 
}: EquipmentEstimatorProps) {
  const [sortBy, setSortBy] = useState<string>('name');

  const calculateItemCost = (item: EstimatorItem) => {
    const hours = item.unit === 'hours' ? item.duration : item.duration * 8;
    return hours * item.equipment.hourlyRate;
  };

  const totalCost = selectedEquipment.reduce((sum, item) => sum + calculateItemCost(item), 0);

  const sortedEquipment = [...selectedEquipment].sort((a, b) => {
    switch (sortBy) {
      case 'name':
        return a.equipment.name.localeCompare(b.equipment.name);
      case 'cost':
        return calculateItemCost(b) - calculateItemCost(a);
      case 'category':
        return a.equipment.category.localeCompare(b.equipment.category);
      default:
        return 0;
    }
  });

  return (
    <div className="fixed right-0 top-0 h-full w-96 bg-white border-l shadow-lg z-40 flex flex-col">
      {/* Header */}
      <div className="p-4 border-b bg-gray-50">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Selected Equipment</h3>
          <div className="flex items-center space-x-2">
            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-32 h-8 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="name">Name (A-Z)</SelectItem>
                <SelectItem value="cost">Cost</SelectItem>
                <SelectItem value="category">Category</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <Button size="sm" variant="outline" onClick={onSaveEstimate}>
            <Save className="w-3 h-3 mr-1" />
            Save
          </Button>
          <Button size="sm" variant="outline" onClick={onExportEstimate}>
            <Download className="w-3 h-3 mr-1" />
            Export
          </Button>
          <div className="flex items-center space-x-2 text-sm">
            <span>Duration:</span>
            <Input className="w-16 h-8" defaultValue="8" />
            <Select defaultValue="hours">
              <SelectTrigger className="w-16 h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="hours">Hours</SelectItem>
                <SelectItem value="days">Days</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {selectedEquipment.length === 0 ? (
          <div className="text-center py-12">
            <Truck className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">Drag and drop equipment here or use the Add button</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedEquipment.map((item) => (
              <Card key={item.equipment.id} className="relative">
                <CardContent className="p-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-2 mb-1">
                        <h4 className="font-medium text-sm">{item.equipment.name}</h4>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-gray-400 hover:text-red-500"
                          onClick={() => onRemoveEquipment(item.equipment.id)}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                      <Badge variant="secondary" className="text-xs mb-2">
                        {item.equipment.category}
                      </Badge>
                      <p className="text-xs text-gray-600 mb-2">
                        {item.equipment.category} - ${item.equipment.hourlyRate}/hr
                      </p>
                      <div className="text-right">
                        <span className="text-sm font-semibold text-blue-600">
                          ${calculateItemCost(item).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Summary */}
      {selectedEquipment.length > 0 && (
        <>
          <div className="p-4 border-t">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Cost Summary</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                {Array.from(new Set(selectedEquipment.map(item => item.equipment.category))).map(category => {
                  const categoryItems = selectedEquipment.filter(item => item.equipment.category === category);
                  const categoryCost = categoryItems.reduce((sum, item) => sum + calculateItemCost(item), 0);
                  return (
                    <div key={category} className="flex justify-between items-center py-1">
                      <span className="text-sm text-gray-600">{category}</span>
                      <span className="text-sm font-medium">${categoryCost.toLocaleString()}</span>
                    </div>
                  );
                })}
                <div className="border-t pt-2 mt-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Duration:</span>
                    <span className="text-sm">8 hours</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Hourly Rate:</span>
                    <span className="text-sm">${(totalCost / 8).toFixed(2)}/hr</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="p-4 border-t bg-gray-50">
            <div className="flex justify-between items-center mb-3">
              <span className="font-semibold">Total Cost:</span>
              <span className="text-xl font-bold text-blue-600">${totalCost.toLocaleString()}</span>
            </div>
            <div className="flex space-x-2">
              <Button onClick={onSaveEstimate} className="flex-1">
                <Save className="w-4 h-4 mr-2" />
                Save Estimate
              </Button>
              <Button variant="outline" onClick={onExportEstimate}>
                <Download className="w-4 h-4" />
              </Button>
            </div>
          </div>

          <div className="p-4 border-t">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm">Cost Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="space-y-1">
                  {Array.from(new Set(selectedEquipment.map(item => item.equipment.category))).map(category => {
                    const categoryItems = selectedEquipment.filter(item => item.equipment.category === category);
                    const categoryCost = categoryItems.reduce((sum, item) => sum + calculateItemCost(item), 0);
                    const percentage = totalCost > 0 ? (categoryCost / totalCost) * 100 : 0;
                    return (
                      <div key={category} className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-xs text-gray-600 flex-1">{category}</span>
                        <span className="text-xs font-medium">${categoryCost.toLocaleString()}</span>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
