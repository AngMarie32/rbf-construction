import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

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
  'Architectural Fees',
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

const allowedUnits = ['each', 'SF', 'LY', 'CY', 'CF', 'AC', 'Day', 'Week', 'Lot', 'Ton', 'LFT', 'SY', 'LS'];

interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: string[];
  placeholder: string;
  allowCustom?: boolean;
}

function SearchableSelect({ value, onValueChange, options, placeholder, allowCustom = false }: SearchableSelectProps) {
  const [open, setOpen] = useState(false);
  const [inputValue, setInputValue] = useState('');

  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(inputValue.toLowerCase())
  );

  const handleSelect = (selectedValue: string) => {
    onValueChange(selectedValue);
    setOpen(false);
    setInputValue('');
  };

  const handleInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && allowCustom && inputValue.trim()) {
      e.preventDefault();
      onValueChange(inputValue.trim());
      setOpen(false);
      setInputValue('');
    }
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-full justify-between text-left font-normal h-8 text-xs"
        >
          {value || placeholder}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-full p-0" align="start">
        <Command>
          <CommandInput 
            placeholder={`Search ${placeholder.toLowerCase()}...${allowCustom ? ' or type custom' : ''}`}
            value={inputValue}
            onValueChange={setInputValue}
            onKeyDown={handleInputKeyDown}
          />
          <CommandList>
            {allowCustom && inputValue.trim() && !options.includes(inputValue.trim()) && (
              <CommandGroup>
                <CommandItem
                  value={inputValue.trim()}
                  onSelect={() => handleSelect(inputValue.trim())}
                >
                  Create "{inputValue.trim()}"
                </CommandItem>
              </CommandGroup>
            )}
            <CommandEmpty>No option found.</CommandEmpty>
            <CommandGroup>
              {filteredOptions.map((option) => (
                <CommandItem
                  key={option}
                  value={option}
                  onSelect={() => handleSelect(option)}
                >
                  {option}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

export function BidItemForm({ items, onItemsChange }: BidItemFormProps) {
  console.log('🎯 BidItemForm STATE CHECK:');
  console.log('- Items received as props:', items.length);
  console.log('- First 3 items:', items.slice(0, 3).map(item => ({ id: item.id, description: item.description })));

  useEffect(() => {
    console.log('🔄 BidItemForm props changed - items count:', items.length);
    if (items.length > 10) {
      console.log('📊 Large dataset detected with', items.length, 'items');
    }
  }, [items]);

  const addItem = () => {
    console.log('➕ Adding new item to form');
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
    const updatedItems = [newItem, ...items];
    console.log('➕ New item count after addition:', updatedItems.length);
    onItemsChange(updatedItems);
  };

  const updateItem = (id: string, field: keyof BidItem, value: any) => {
    console.log(`🔧 Updating item ${id}, field: ${field}`);
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
    console.log('🔧 Items count after update:', updatedItems.length);
    onItemsChange(updatedItems);
  };

  const removeItem = (id: string) => {
    console.log('🗑️ Removing item:', id);
    const updatedItems = items.filter(item => item.id !== id);
    console.log('🗑️ Items count after removal:', updatedItems.length);
    onItemsChange(updatedItems);
  };

  const calculateGrandTotal = () => {
    return items.reduce((sum, item) => sum + item.total, 0);
  };

  console.log('🎯 RENDERING BidItemForm with', items.length, 'items');

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            Line Items 
            <span className="text-lg font-bold text-blue-600">({items.length} items)</span>
          </CardTitle>
          <Button onClick={addItem} size="sm">
            <Plus className="w-4 h-4 mr-2" />
            Add Line Item
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Header Row */}
        <div className="grid grid-cols-12 gap-2 pb-2 border-b text-xs font-medium text-muted-foreground">
          <div className="col-span-1">Division</div>
          <div className="col-span-2">Category</div>
          <div className="col-span-2">Subcategory</div>
          <div className="col-span-3">Description</div>
          <div className="col-span-1">Unit</div>
          <div className="col-span-1">Quantity</div>
          <div className="col-span-1">Unit Cost</div>
          <div className="col-span-1">Total</div>
        </div>

        {/* Item Rows */}
        {items.map((item) => (
          <div key={item.id} className="grid grid-cols-12 gap-2 items-center py-1 border-b border-gray-100">
            <div className="col-span-1">
              <SearchableSelect
                value={item.division}
                onValueChange={(value) => updateItem(item.id, 'division', value)}
                options={divisions}
                placeholder="Division"
                allowCustom={true}
              />
            </div>

            <div className="col-span-2">
              <SearchableSelect
                value={item.category}
                onValueChange={(value) => updateItem(item.id, 'category', value)}
                options={categoryOptions}
                placeholder="Category"
                allowCustom={true}
              />
            </div>

            <div className="col-span-2">
              <SearchableSelect
                value={item.subcategory}
                onValueChange={(value) => updateItem(item.id, 'subcategory', value)}
                options={subcategoryOptions}
                placeholder="Subcategory"
                allowCustom={true}
              />
            </div>

            <div className="col-span-3">
              <Input
                value={item.description}
                onChange={(e) => updateItem(item.id, 'description', e.target.value)}
                className="h-8 text-xs"
                placeholder=""
              />
            </div>

            <div className="col-span-1">
              <SearchableSelect
                value={item.unit}
                onValueChange={(value) => updateItem(item.id, 'unit', value)}
                options={allowedUnits}
                placeholder="Unit"
              />
            </div>

            <div className="col-span-1">
              <Input
                type="number"
                value={item.quantity}
                onChange={(e) => updateItem(item.id, 'quantity', parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
                className="h-8 text-xs"
              />
            </div>

            <div className="col-span-1">
              <Input
                type="number"
                value={item.unitCost}
                onChange={(e) => updateItem(item.id, 'unitCost', parseFloat(e.target.value) || 0)}
                min="0"
                step="0.01"
                className="h-8 text-xs"
              />
            </div>

            <div className="col-span-1 flex items-center justify-between">
              <div className="text-xs font-medium">
                ${item.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              {items.length > 1 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => removeItem(item.id)}
                  className="h-6 w-6 p-0 ml-1"
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              )}
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

        {/* 🔥 DEBUG INFO PANEL */}
        <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <h4 className="font-semibold text-blue-800 mb-2">🔍 Debug Info</h4>
          <div className="text-sm space-y-1">
            <div><strong>Items in form state:</strong> {items.length}</div>
            <div><strong>Grand total:</strong> ${calculateGrandTotal().toLocaleString()}</div>
            <div><strong>Sample items:</strong></div>
            <ul className="ml-4 text-xs">
              {items.slice(0, 3).map((item, index) => (
                <li key={item.id}>
                  {index + 1}. {item.description || 'No description'} - ${item.total.toLocaleString()}
                </li>
              ))}
              {items.length > 3 && <li>... and {items.length - 3} more items</li>}
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
