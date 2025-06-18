
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building, User, Mail, Phone, MapPin, Star, Edit, Trash2 } from 'lucide-react';

interface Subcontractor {
  id: string;
  name: string;
  company?: string;
  email?: string;
  phone?: string;
  specialties: string[];
  address?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  rating?: number;
  notes?: string;
  created_at: string;
}

interface SubcontractorCardProps {
  subcontractor: Subcontractor;
  onEdit: (subcontractor: Subcontractor) => void;
  onDelete: (id: string) => void;
}

export function SubcontractorCard({ subcontractor, onEdit, onDelete }: SubcontractorCardProps) {
  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-300'}`}
      />
    ));
  };

  return (
    <Card className="hover:shadow-lg transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <CardTitle className="text-lg mb-1 flex items-center gap-2">
              <Building className="w-5 h-5" />
              {subcontractor.company || subcontractor.name}
            </CardTitle>
            <Badge variant="secondary">
              {subcontractor.specialties?.[0] || 'Other'}
            </Badge>
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(subcontractor)}
            >
              <Edit className="w-4 h-4" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(subcontractor.id)}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {subcontractor.name && subcontractor.company && (
          <div className="flex items-center text-sm text-gray-600">
            <User className="w-4 h-4 mr-2" />
            {subcontractor.name}
          </div>
        )}
        
        {subcontractor.email && (
          <div className="flex items-center text-sm text-gray-600">
            <Mail className="w-4 h-4 mr-2" />
            {subcontractor.email}
          </div>
        )}
        
        {subcontractor.phone && (
          <div className="flex items-center text-sm text-gray-600">
            <Phone className="w-4 h-4 mr-2" />
            {subcontractor.phone}
          </div>
        )}
        
        {(subcontractor.address || subcontractor.city) && (
          <div className="flex items-center text-sm text-gray-600">
            <MapPin className="w-4 h-4 mr-2" />
            {[subcontractor.address, subcontractor.city, subcontractor.state]
              .filter(Boolean)
              .join(', ')}
          </div>
        )}
        
        {subcontractor.rating && (
          <div className="flex items-center gap-2">
            <div className="flex">
              {renderStars(subcontractor.rating)}
            </div>
            <span className="text-sm text-gray-600">
              ({subcontractor.rating.toFixed(1)})
            </span>
          </div>
        )}
        
        {subcontractor.notes && (
          <p className="text-sm text-gray-600 line-clamp-2">
            {subcontractor.notes}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
