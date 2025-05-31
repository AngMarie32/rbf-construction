
import { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { mockEquipment } from '@/data/mockData';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Plus, Search, Filter, Edit, Trash2 } from 'lucide-react';

export default function Equipment() {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);

  const filteredEquipment = mockEquipment.filter(equipment => {
    const matchesSearch = equipment.name.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || equipment.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

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

  const toggleEquipmentSelection = (id: string) => {
    setSelectedEquipment(prev =>
      prev.includes(id)
        ? prev.filter(equipId => equipId !== id)
        : [...prev, id]
    );
  };

  const selectedEquipmentData = mockEquipment.filter(eq => selectedEquipment.includes(eq.id));
  const totalSelectedCost = selectedEquipmentData.reduce((sum, eq) => sum + eq.hourlyRate, 0);

  return (
    <Layout 
      title="Equipment Tracker & Cost Estimator" 
      subtitle="Manage your equipment fleet and calculate project costs"
    >
      <div className="space-y-6">
        {/* Filters and Actions */}
        <div className="flex flex-col lg:flex-row gap-4">
          <div className="flex-1 space-y-4 lg:space-y-0 lg:flex lg:gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                placeholder="Search equipment..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-48">
                <Filter className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Filter by category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Categories</SelectItem>
                <SelectItem value="Heavy Machinery">Heavy Machinery</SelectItem>
                <SelectItem value="Vehicles">Vehicles</SelectItem>
                <SelectItem value="Trailers">Trailers</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            Add Equipment
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Equipment Grid */}
          <div className="lg:col-span-2">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredEquipment.map((equipment) => (
                <Card 
                  key={equipment.id} 
                  className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                    selectedEquipment.includes(equipment.id) 
                      ? 'ring-2 ring-primary bg-primary-50' 
                      : ''
                  }`}
                  onClick={() => toggleEquipmentSelection(equipment.id)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-1">
                          {equipment.name}
                        </h3>
                        <Badge variant="secondary" className="mb-2">
                          {equipment.category}
                        </Badge>
                        <Badge className={getStatusColor(equipment.status)}>
                          {equipment.status}
                        </Badge>
                      </div>
                      <div className="flex gap-1">
                        <Button variant="ghost" size="sm">
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>

                    <div className="space-y-2 text-sm text-gray-600">
                      <div className="flex justify-between">
                        <span>Hourly Rate:</span>
                        <span className="font-medium">${equipment.hourlyRate}/hr</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Year:</span>
                        <span>{equipment.year}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Value:</span>
                        <span>${equipment.value.toLocaleString()}</span>
                      </div>
                    </div>

                    <p className="text-sm text-gray-600 mt-3">
                      {equipment.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Selected Equipment Panel */}
          <div className="lg:col-span-1">
            <Card className="sticky top-6">
              <CardContent className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  Selected Equipment
                </h3>

                {selectedEquipmentData.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">
                    Select equipment to calculate costs
                  </p>
                ) : (
                  <div className="space-y-4">
                    <div className="space-y-3">
                      {selectedEquipmentData.map((equipment) => (
                        <div key={equipment.id} className="flex items-center justify-between text-sm">
                          <div className="flex-1">
                            <p className="font-medium">{equipment.name}</p>
                            <div className="flex items-center gap-4 mt-1">
                              <span className="text-gray-600">${equipment.hourlyRate}/hr</span>
                              <Input 
                                placeholder="Hours"
                                className="w-20 h-8 text-xs"
                                type="number"
                              />
                            </div>
                          </div>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={() => toggleEquipmentSelection(equipment.id)}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      ))}
                    </div>

                    <div className="border-t pt-4">
                      <div className="flex justify-between items-center">
                        <span className="font-medium">Total Rate:</span>
                        <span className="text-lg font-bold text-primary">
                          ${totalSelectedCost}/hr
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Button className="w-full" size="sm">
                        Save Selection
                      </Button>
                      <Button variant="outline" className="w-full" size="sm">
                        Export CSV
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
