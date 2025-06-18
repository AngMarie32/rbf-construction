
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search } from 'lucide-react';

interface SubcontractorFiltersProps {
  searchTerm: string;
  onSearchChange: (value: string) => void;
  specialtyFilter: string;
  onSpecialtyChange: (value: string) => void;
}

const specialties = [
  'Concrete',
  'Electrical',
  'Plumbing',
  'HVAC',
  'Roofing',
  'Framing',
  'Drywall',
  'Flooring',
  'Painting',
  'Landscaping',
  'Excavation',
  'Masonry',
  'Insulation',
  'Windows & Doors',
  'Asphalt',
  'Other'
];

export function SubcontractorFilters({ 
  searchTerm, 
  onSearchChange, 
  specialtyFilter, 
  onSpecialtyChange 
}: SubcontractorFiltersProps) {
  return (
    <div className="flex gap-4 flex-1">
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
        <Input
          placeholder="Search subcontractors..."
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10"
        />
      </div>
      
      <Select value={specialtyFilter} onValueChange={onSpecialtyChange}>
        <SelectTrigger className="w-48">
          <SelectValue placeholder="All Specialties" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">All Specialties</SelectItem>
          {specialties.map(specialty => (
            <SelectItem key={specialty} value={specialty}>
              {specialty}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
