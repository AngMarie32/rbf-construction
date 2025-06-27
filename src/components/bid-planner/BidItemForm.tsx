
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Trash2 } from 'lucide-react';

interface BidItem {
  id: string;
  division: string;
  category: string;
  subcategory: string;
  description: string;
  quantity: number;
  unit: string;
  unitCost: number;
  total: number;
}

interface BidItemFormProps {
  items: BidItem[];
  onItemsChange: (items: BidItem[]) => void;
}

const divisions = [
  'General Conditions',
  'Site Work',
  'Building',
  'Other'
];

const categoryOptions = [
  'Labor/Supervision',
  'Design Fees & Estimating',
  'Permits/Fees/Bonds/Insurances',
  'General-Other',
  'Site-General',
  'Demolition/Land Clearance',
  'Demolition Building/Concrete',
  'Erosion Controls',
  'Excavation/Grading',
  'Site Construction',
  'Utilities (Including Excavation)',
  'Landscaping & Irrigation',
  'Concrete',
  'Masonry',
  'Metals/Siding Materials',
  'Rough/Final Carpentry',
  'Thermal/Moisture',
  'Doors, Windows, & Glass',
  'Finishes',
  'Install Specialities',
  'Install Equipment',
  'Install Furnishings',
  'Install Special Construction',
  'Mechanical',
  'Plumbing',
  'Fire',
  'Electrical',
  'Other Interior Demolition',
  'Management',
  'Supervision',
  'Profit & Overhead'
];

const subcategoryOptions = [
  'Project Manager',
  'Labor',
  'Per Diem Expense',
  'Architectual Fees',
  'Printing & Reproduction',
  'Asbestos Survey Study',
  'Misc.',
  'Plan Review Fees',
  'Building Permits',
  'Demo Permit',
  'Soil Erosion',
  'Industrial Discharge Permit',
  'Other Permits',
  'Capital Connection Fees- Tab In',
  'Utilities- Gas & Electric Connection Fees',
  'Water Meter Fees (Municipality)',
  'Construction Interest',
  'Other Fees',
  'Performance Bond (Returned After C of O)',
  'Other Bonds',
  'Builder\'s Risk Insurance',
  'Other Insurance',
  'Soil Boring & Compaction Testing',
  'Concrete Testing',
  'Other Testing',
  'Survey Staking & Layout',
  'Temp Electric/Lighting',
  'Temp Heat',
  'Barricading/Job Site Security',
  'SWPP-Soil Erosion Maintenance',
  'Daily Clean-up',
  'White Glove Cleaning',
  'Porta-Jon Rental',
  'Dumpster Rental',
  'Equipment Rental',
  'Site Cleaning',
  'Mobilization',
  'Fuel',
  'Other',
  'Site Clearing/Grubbing',
  'Tree Cutting',
  'Stump Removal',
  'Remove Exisitng Building(s)',
  'Remove Esisting Structure(s)',
  'Remove Existing Utilities',
  'Remove Esxisting Paving',
  'Remove Contaminated Soils',
  'Abestos Abatement',
  'Demolition-Other',
  'Silt Fence',
  'Mud Mat',
  'Erosion-Other',
  'Excavation (Non-Utility)',
  'Backfill Materials',
  'Backfill Labor',
  'Other Excavation',
  'Level/Grade/Compaction',
  'Parking Lot Bast Materials',
  'Compaction Labor',
  'Export Spoils',
  'Finish Grading',
  'Soil Stabilization',
  'Grading-Other',
  'Concrete Paving',
  'Concrete Curbs/Gutters',
  'Concrete Walk-Ways',
  'Concrete Footing',
  'Transformer Pad',
  'Dumpster Enclosure/Concrete Pad',
  'Light Pole Bases',
  'Misc. Drainage/Flumes/Etc.',
  'Other Concrete',
  'Asphalt Paving',
  'Lot Striping',
  'Wheel Stops',
  'Other Asphalt',
  'Bollards',
  'HC Signs, Hand Rails, Misc.',
  'Other Bollards/Signs',
  'Wood Fence- Cedar @ 6\'',
  'Retaining Wall(s)-Concrete @ 4\'',
  'Other Fencing',
  'ADA Railing',
  'Menu Board Footing',
  'Water Service',
  'Water Suppression Service',
  'Well Service (Complete System)',
  'Other Water',
  'Sanitary Sewer',
  'Grease Trap',
  'Other Sewer',
  'Storm Sewer/Structures',
  'Detention System (Underground/Pond)',
  'Sump Line/ Downspout Drains',
  'Other Storm',
  'Electricial Service/Transformer/Overhead',
  'Gas Service',
  'Telephone/Internet',
  'Cable/ Misc. Communication',
  'Modification of Existing Utilities',
  'Other Utilities',
  'Landscaping (Hard/Soft)',
  'Top Soil',
  'Hydroseeding',
  'Irrigation',
  'Landscaping-Other',
  'Concrete Footings & Foundation',
  'Slab on Grade & Trench Fill',
  'Saw Cutting',
  'Concrete Removal',
  'Concrete-Other',
  'Masonry-CMU (Concrete Blocks)',
  'Masonry-Stone Veneer-Cultured Stone',
  'Masonry-Misc.',
  'Steel- Red Iron Structual',
  'Pre-Fab Steel Building Materials',
  'Pre-Fab Labor',
  'Metal Awnings/Overhangs/Canopy',
  'Vinyl Siding/Hardie Board/Etc.',
  'Gutters & Downspouts',
  'Metals- Other',
  'RC-Wood Lumber Package',
  'RC-Wood Framing Labor',
  'RC-Other',
  'RC-Metal Framing Materials',
  'RC-Metal Framing Labor',
  'RC- Other',
  'FC-Misc Framing, Bracing, & Blocking',
  'FC-Trim Lumber Package',
  'FC- Misc Finish Carpentry & Trim',
  'FC- Millwork',
  'FC-Other',
  'Building Insulation-Exterior',
  'Building Insulation-Interior',
  'Roof Insulation',
  'Runner Roofing (Durolast)',
  'Roof Walkway Pads',
  'Asphalt Shingles',
  'EIFS (Dryvit)',
  'Caulking & Sealants',
  'TM-Other',
  'Storefont Aluminimum, Door Frames, Etc.',
  'Vinyl Windows',
  'Pre-Pay & DT Window Installation',
  'Overhead Doors (Closures)',
  'Exterior Wood Frame Doors',
  'Interior Wood Frame Doors',
  'Exterior HM Frame Doors',
  'Interior HM Frame Doors',
  'Door Hardware (Closers, Handles, Etc.)',
  'Door/Windows-Other (Labor)',
  'Gypsum Wall Board',
  'Cement Board',
  'Quarry & Ceramic Tile Material',
  'Quarry & Ceramic Tile Labor',
  'Epoxy Flooring',
  'Laminate Flooring',
  'Hardwood Flooring',
  'Carpet',
  'Floor Prep',
  'FRP',
  'Exterior Painting',
  'Interior Painting',
  'Ceiling Painting',
  'Acoustical Ceilings',
  'Marmoleum Wainscot & Wood Trim (Interior)',
  'Countertops-Laminate',
  'Countertops-Solid Surface',
  'Finishes-Other',
  'Toilet Accessories',
  'Toilet Partitions',
  'ABC Fire Extinguishers',
  'Stainless Steel Corner Guards',
  'Other Specialities',
  'Installation of Owner Supplied Equipment',
  'Installation of Owner Supplied Walk-in Cooler Box',
  'Equipment Installation-Other',
  'Decor Installation by GC',
  'Other Furnishing Installation',
  'Vinyl Graphic Installation',
  'Special Installation-Other',
  'Mechanical-RTU Install',
  'Mechanical-Duckwork System',
  'Mechanical-Hood/Ventilation Install',
  'Mechanical-Other',
  'Plumbing',
  'Plumbing-Grease Trap (Interior)',
  'Plumbing-Water Heater',
  'Plumbing-Water Filtaration System',
  'Plumbing-Fixtures',
  'Plumbing-Other',
  'Fire Suppression System',
  'Ansul System Install',
  'Fire-Other',
  'Electrical Distrubution: Feeders, Switches, Receptacles',
  'MDP Panels/Lighting Control Panels',
  'Light Fixture Package',
  'Fire Alarm',
  'Low Voltage (Internet, Phone, Data)',
  'Electrical-Other'
];

const allowedUnits = ['each', 'SF', 'LY', 'CY', 'CF', 'Acre', 'Day', 'Week', 'Lot', 'Ton'];

export function BidItemForm({ items, onItemsChange }: BidItemFormProps) {
  const addItem = () => {
    const newItem: BidItem = {
      id: Date.now().toString(),
      division: 'General Conditions',
      category: 'Labor/Supervision',
      subcategory: '',
      description: '',
      quantity: 1,
      unit: 'each',
      unitCost: 0,
      total: 0
    };
    onItemsChange([...items, newItem]);
  };

  const updateItem = (id: string, field: keyof BidItem, value: any) => {
    const updatedItems = items.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        if (field === 'quantity' || field === 'unitCost') {
          updated.total = updated.quantity * updated.unitCost;
        }
        return updated;
      }
      return item;
    });
    onItemsChange(updatedItems);
  };

  const removeItem = (id: string) => {
    onItemsChange(items.filter(item => item.id !== id));
  };

  const calculateGrandTotal = () => {
    return items.reduce((sum, item) => sum + item.total, 0);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Bid Line Items</CardTitle>
          <Button onClick={addItem} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Item
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item, index) => (
          <div key={item.id} className="border rounded-lg p-4 space-y-4">
            <div className="flex justify-between items-start">
              <h4 className="font-medium">Item #{index + 1}</h4>
              {items.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeItem(item.id)}
                >
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>

            {/* Single row layout for all form fields */}
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <div>
                <Label htmlFor={`division-${item.id}`}>Division</Label>
                <Select
                  value={item.division}
                  onValueChange={(value) => updateItem(item.id, 'division', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {divisions.map((division) => (
                      <SelectItem key={division} value={division}>
                        {division}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor={`category-${item.id}`}>Category</Label>
                <Select
                  value={item.category}
                  onValueChange={(value) => updateItem(item.id, 'category', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categoryOptions.map((category) => (
                      <SelectItem key={category} value={category}>
                        {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor={`subcategory-${item.id}`}>Subcategory</Label>
                <Select
                  value={item.subcategory}
                  onValueChange={(value) => updateItem(item.id, 'subcategory', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {subcategoryOptions.map((subcategory) => (
                      <SelectItem key={subcategory} value={subcategory}>
                        {subcategory}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor={`unit-${item.id}`}>Unit</Label>
                <Select
                  value={item.unit}
                  onValueChange={(value) => updateItem(item.id, 'unit', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {allowedUnits.map((unit) => (
                      <SelectItem key={unit} value={unit}>
                        {unit}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label htmlFor={`quantity-${item.id}`}>Quantity</Label>
                <Input
                  id={`quantity-${item.id}`}
                  type="number"
                  value={item.quantity}
                  onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                />
              </div>

              <div>
                <Label htmlFor={`unitCost-${item.id}`}>Unit Cost ($)</Label>
                <Input
                  id={`unitCost-${item.id}`}
                  type="number"
                  value={item.unitCost}
                  onChange={(e) => updateItem(item.id, 'unitCost', parseFloat(e.target.value) || 0)}
                  min="0"
                  step="0.01"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor={`description-${item.id}`}>Description</Label>
                <Textarea
                  id={`description-${item.id}`}
                  value={item.description}
                  onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                  rows={2}
                />
              </div>

              <div>
                <Label>Total</Label>
                <div className="p-2 bg-gray-50 rounded border font-medium">
                  ${item.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>
            </div>
          </div>
        ))}

        {items.length > 0 && (
          <div className="border-t pt-4 mt-6">
            <div className="flex justify-end">
              <div className="text-right">
                <div className="text-lg font-bold">
                  Grand Total: ${calculateGrandTotal().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-sm text-gray-600">
                  {items.length} line item{items.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
