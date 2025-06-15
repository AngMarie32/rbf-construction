
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Search, Filter, X, Download } from 'lucide-react';
import type { EquipmentFilters } from '@/types/equipment';

interface EquipmentFiltersProps {
  filters: EquipmentFilters;
  onFiltersChange: (filters: Partial<EquipmentFilters>) => void;
  onClearFilters: () => void;
  onExport: () => void;
  locations: string[];
  projects: Array<{ id: string; name: string }>;
}

export function EquipmentFilters({
  filters,
  onFiltersChange,
  onClearFilters,
  onExport,
  locations,
  projects
}: EquipmentFiltersProps) {
  const hasActiveFilters = Object.values(filters).some(value => 
    typeof value === 'boolean' ? value : value !== 'all' && value !== ''
  );

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4" />
          <span className="font-medium">Filters</span>
          {hasActiveFilters && (
            <Button
              size="sm"
              variant="ghost"
              onClick={onClearFilters}
              className="h-6 px-2"
            >
              <X className="w-3 h-3 mr-1" />
              Clear
            </Button>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={onExport}>
          <Download className="w-4 h-4 mr-2" />
          Export
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            placeholder="Search equipment..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ search: e.target.value })}
            className="pl-10"
          />
        </div>

        <Select 
          value={filters.status} 
          onValueChange={(value) => onFiltersChange({ status: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="All Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Available">Available</SelectItem>
            <SelectItem value="In Use">In Use</SelectItem>
            <SelectItem value="Maintenance">Maintenance</SelectItem>
          </SelectContent>
        </Select>

        <Select 
          value={filters.category} 
          onValueChange={(value) => onFiltersChange({ category: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="All Categories" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="Heavy Machinery">Heavy Machinery</SelectItem>
            <SelectItem value="Vehicles">Vehicles</SelectItem>
            <SelectItem value="Trailers">Trailers</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>

        <Select 
          value={filters.location} 
          onValueChange={(value) => onFiltersChange({ location: value })}
        >
          <SelectTrigger>
            <SelectValue placeholder="All Locations" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Locations</SelectItem>
            {locations.map((location) => (
              <SelectItem key={location} value={location}>{location}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex flex-wrap gap-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="available-only"
            checked={filters.availableOnly}
            onCheckedChange={(checked) => onFiltersChange({ availableOnly: checked })}
          />
          <Label htmlFor="available-only">Available only</Label>
        </div>

        <div className="flex items-center space-x-2">
          <Switch
            id="maintenance-due"
            checked={filters.maintenanceDue}
            onCheckedChange={(checked) => onFiltersChange({ maintenanceDue: checked })}
          />
          <Label htmlFor="maintenance-due">Maintenance due</Label>
        </div>
      </div>
    </div>
  );
}
