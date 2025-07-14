
import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { PermitFilters } from '@/types/permits';

interface PermitFiltersProps {
  filters: PermitFilters;
  onFiltersChange: (filters: PermitFilters) => void;
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

export const PermitFilters = ({ filters, onFiltersChange, projects }: PermitFiltersProps) => {
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
              value={filters.project_id || ''}
              onValueChange={(value) => onFiltersChange({ ...filters, project_id: value || undefined })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Projects" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Projects</SelectItem>
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
              value={filters.permit_type || ''}
              onValueChange={(value) => onFiltersChange({ ...filters, permit_type: value || undefined })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Types</SelectItem>
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
              value={filters.status || ''}
              onValueChange={(value) => onFiltersChange({ ...filters, status: value || undefined })}
            >
              <SelectTrigger>
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Statuses</SelectItem>
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
