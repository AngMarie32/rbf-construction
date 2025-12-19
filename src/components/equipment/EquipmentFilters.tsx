
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Search, X, Download, FileText, FileSpreadsheet } from 'lucide-react';
import type { EquipmentFilters as EquipmentFiltersType } from '@/types/equipment';

interface EquipmentFiltersProps {
  filters: EquipmentFiltersType;
  onFiltersChange: (filters: Partial<EquipmentFiltersType>) => void;
  onClearFilters: () => void;
  onExportPDF: () => void;
  onExportExcel: () => void;
  locations: string[];
  projects: Array<{ id: string; name: string }>;
}

export function EquipmentFilters({
  filters,
  onFiltersChange,
  onClearFilters,
  onExportPDF,
  onExportExcel,
  locations
}: EquipmentFiltersProps) {
  const hasActiveFilters = filters.search || filters.status !== 'all' || 
    filters.category !== 'all' || filters.location !== 'all' || 
    filters.availableOnly;

  return (
    <div className="bg-card p-4 rounded-lg border space-y-4">
      <div className="flex flex-wrap gap-4">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          <Input
            placeholder="Search equipment..."
            value={filters.search}
            onChange={(e) => onFiltersChange({ search: e.target.value })}
            className="pl-10"
          />
        </div>

        {/* Status Filter */}
        <Select value={filters.status} onValueChange={(value) => onFiltersChange({ status: value })}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Status</SelectItem>
            <SelectItem value="Available">Available</SelectItem>
            <SelectItem value="In Use">In Use</SelectItem>
            <SelectItem value="Maintenance">Maintenance</SelectItem>
          </SelectContent>
        </Select>

        {/* Category Filter */}
        <Select value={filters.category} onValueChange={(value) => onFiltersChange({ category: value })}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Category" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Categories</SelectItem>
            <SelectItem value="Heavy Machinery">Heavy Machinery</SelectItem>
            <SelectItem value="Trailers">Trailers</SelectItem>
            <SelectItem value="Trucks">Trucks</SelectItem>
            <SelectItem value="Other">Other</SelectItem>
          </SelectContent>
        </Select>

        {/* Location Filter */}
        {locations.length > 0 && (
          <Select value={filters.location} onValueChange={(value) => onFiltersChange({ location: value })}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Location" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Locations</SelectItem>
              {locations.map((location) => (
                <SelectItem key={location} value={location}>
                  {location}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}

        {/* Available Only Toggle */}
        <Button
          variant={filters.availableOnly ? "default" : "outline"}
          onClick={() => onFiltersChange({ availableOnly: !filters.availableOnly })}
          className="whitespace-nowrap"
        >
          Available Only
        </Button>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-between items-center">
        <div className="flex gap-2">
          {hasActiveFilters && (
            <Button variant="ghost" onClick={onClearFilters} className="text-muted-foreground">
              <X className="w-4 h-4 mr-1" />
              Clear Filters
            </Button>
          )}
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline">
              <Download className="w-4 h-4 mr-2" />
              Export Report
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onExportPDF}>
              <FileText className="w-4 h-4 mr-2" />
              Export as PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onExportExcel}>
              <FileSpreadsheet className="w-4 h-4 mr-2" />
              Export as Excel
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  );
}
