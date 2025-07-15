
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import type { PermitFilters as PermitFiltersType } from '@/types/permits';

interface PermitFiltersComponentProps {
  filters: PermitFiltersType;
  onFiltersChange: (filters: PermitFiltersType) => void;
  projects: Array<{ id: string; name: string }>;
}

const permitTypes = [
  'Building', 'Electrical', 'Plumbing', 'Mechanical', 
  'Fire', 'Demolition', 'Grading', 'Other'
];

const permitStatuses = [
  'Not Applied', 'Application Submitted', 'Under Review', 
  'Approved', 'Issued', 'Expired', 'Rejected'
];

export const PermitFiltersComponent = ({ filters, onFiltersChange, projects }: PermitFiltersComponentProps) => {
  const clearFilters = () => {
    onFiltersChange({});
  };

  const hasActiveFilters = Object.values(filters).some(value => value !== undefined && value !== '');

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <Select
              value={filters.project_id || 'all'}
              onValueChange={(value) => onFiltersChange({ ...filters, project_id: value === 'all' ? undefined : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Projects</SelectItem>
                {projects.map(project => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[150px]">
            <Select
              value={filters.permit_type || 'all'}
              onValueChange={(value) => onFiltersChange({ ...filters, permit_type: value === 'all' ? undefined : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {permitTypes.map(type => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex-1 min-w-[150px]">
            <Select
              value={filters.status || 'all'}
              onValueChange={(value) => onFiltersChange({ ...filters, status: value === 'all' ? undefined : value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                {permitStatuses.map(status => (
                  <SelectItem key={status} value={status}>
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <Button
            variant={filters.expiring_soon ? "default" : "outline"}
            onClick={() => onFiltersChange({ ...filters, expiring_soon: !filters.expiring_soon })}
          >
            Expiring Soon
          </Button>

          {hasActiveFilters && (
            <Button variant="outline" size="sm" onClick={clearFilters}>
              <X className="w-4 h-4 mr-1" />
              Clear
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
