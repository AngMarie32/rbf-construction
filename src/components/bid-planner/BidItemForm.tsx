import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, Trash2, MoreHorizontal } from 'lucide-react';
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { supabase } from '@/integrations/supabase/client';
import { ImportBidItemsDialog } from './ImportBidItemsDialog';
import { toast } from 'sonner';

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
  divisionManuallySet?: boolean; // Track if user manually set division
}

interface BidItemFormProps {
  items: BidItem[];
  onItemsChange: (items: BidItem[]) => void;
  projectId?: string;
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

const getDivisionFromCategory = (category: string): string => {
  const lowerCategory = category.toLowerCase();
  
  if (lowerCategory.includes('site') || 
      lowerCategory.includes('excavation') || 
      lowerCategory.includes('grading') || 
      lowerCategory.includes('landscaping') ||
      lowerCategory.includes('erosion') ||
      lowerCategory.includes('clearing') ||
      lowerCategory.includes('demolition')) {
    return 'Site Work';
  }
  
  if (lowerCategory.includes('concrete') || 
      lowerCategory.includes('masonry') || 
      lowerCategory.includes('carpentry') ||
      lowerCategory.includes('framing') ||
      lowerCategory.includes('roofing') ||
      lowerCategory.includes('insulation') ||
      lowerCategory.includes('doors') ||
      lowerCategory.includes('windows') ||
      lowerCategory.includes('finishes') ||
      lowerCategory.includes('painting') ||
      lowerCategory.includes('flooring') ||
      lowerCategory.includes('mechanical') ||
      lowerCategory.includes('plumbing') ||
      lowerCategory.includes('electrical') ||
      lowerCategory.includes('fire') ||
      lowerCategory.includes('metals') ||
      lowerCategory.includes('thermal')) {
    return 'Building';
  }
  
  if (lowerCategory.includes('general') || 
      lowerCategory.includes('supervision') || 
      lowerCategory.includes('management') ||
      lowerCategory.includes('labor') ||
      lowerCategory.includes('design') ||
      lowerCategory.includes('permits') ||
      lowerCategory.includes('bonds') ||
      lowerCategory.includes('insurance')) {
    return 'General Conditions';
  }
  
  return 'Other';
};

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
          className="w-full justify-between text-left font-normal h-8 text-xs px-2"
        >
          <span className="truncate">{value || placeholder}</span>
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

interface SearchableSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  options: string[];
  placeholder: string;
  allowCustom?: boolean;
}

export function BidItemForm({ items, onItemsChange, projectId }: BidItemFormProps) {
  const currentItems = items;

  useEffect(() => {
    if (!projectId) return;

    const channel = supabase
      .channel('bid-items-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'bid_items',
          filter: `project_id=eq.${projectId}`
        },
        (payload) => {
          console.log('Real-time bid items change:', payload);
          loadBidItems();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [projectId]);

  const loadBidItems = async () => {
    if (!projectId) return;

    try {
      const { data: existingItems, error } = await supabase
        .from('bid_items')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error loading bid items:', error);
        return;
      }

      if (existingItems && existingItems.length > 0) {
        const formattedItems: BidItem[] = existingItems.map((item, index) => {
          return {
            id: item.id || String(Date.now() + index),
            division: item.division || getDivisionFromCategory(item.category || ''),
            category: item.category || '',
            subcategory: item.subcategory || '',
            description: item.description || '',
            quantity: item.quantity || 1,
            unit: item.unit || 'each',
            unitCost: item.unit_cost || 0,
            total: (item.unit_cost || 0) * (item.quantity || 1),
            divisionManuallySet: !!item.division // If division exists in DB, it was manually set
          };
        });

        onItemsChange(formattedItems);
      }
    } catch (error) {
      console.error('Error loading bid items:', error);
    }
  };

  const saveBidItemToDatabase = async (item: BidItem) => {
    if (!projectId) return;

    try {
      const { error } = await supabase
        .from('bid_items')
        .upsert({
          id: item.id,
          project_id: projectId,
          category: item.category,
          subcategory: item.subcategory,
          description: item.description,
          quantity: item.quantity,
          unit: item.unit,
          unit_cost: item.unitCost,
          division: item.division // Save the division to database
        });

      if (error) {
        console.error('Error saving bid item:', error);
        toast.error('Failed to save item changes');
      } else {
        console.log('Successfully saved bid item with division:', item.division);
      }
    } catch (error) {
      console.error('Error saving bid item:', error);
      toast.error('Failed to save item changes');
    }
  };

  const addItem = () => {
    const newItem: BidItem = {
      id: Date.now().toString(),
      division: 'General Conditions',
      category: '',
      subcategory: '',
      description: '',
      quantity: 1,
      unit: 'each',
      unitCost: 0,
      total: 0,
      divisionManuallySet: false
    };
    const updatedItems = [newItem, ...currentItems];
    onItemsChange(updatedItems);
  };

  const updateItem = async (id: string, field: keyof BidItem, value: any) => {
    const updatedItems = currentItems.map(item => {
      if (item.id === id) {
        const updated = { ...item, [field]: value };
        
        if (field === 'category' && value && !item.divisionManuallySet) {
          updated.division = getDivisionFromCategory(value);
        }
        
        if (field === 'division') {
          updated.divisionManuallySet = true;
        }
        
        if (field === 'quantity' || field === 'unitCost') {
          updated.total = updated.quantity * updated.unitCost;
        }
        
        // Save to database immediately
        saveBidItemToDatabase(updated);
        
        return updated;
      }
      return item;
    });
    onItemsChange(updatedItems);
  };

  const removeItem = async (id: string) => {
    // Delete from database first
    if (projectId) {
      try {
        const { error } = await supabase
          .from('bid_items')
          .delete()
          .eq('id', id);

        if (error) {
          console.error('Error deleting bid item:', error);
          toast.error('Failed to delete item');
          return;
        }
      } catch (error) {
        console.error('Error deleting bid item:', error);
        toast.error('Failed to delete item');
        return;
      }
    }

    const updatedItems = currentItems.filter(item => item.id !== id);
    onItemsChange(updatedItems);
  };

  const calculateGrandTotal = () => {
    return currentItems.reduce((sum, item) => sum + item.total, 0);
  };

  const handleStartFromScratch = async () => {
    if (!projectId) return;
    
    try {
      const { error } = await supabase
        .from('bid_items')
        .delete()
        .eq('project_id', projectId);

      if (error) {
        console.error('Error clearing bid items:', error);
        return;
      }

      const emptyItem: BidItem = {
        id: Date.now().toString(),
        division: 'General Conditions',
        category: '',
        subcategory: '',
        description: '',
        quantity: 1,
        unit: 'each',
        unitCost: 0,
        total: 0,
        divisionManuallySet: false
      };
      
      onItemsChange([emptyItem]);
    } catch (error) {
      console.error('Error starting from scratch:', error);
    }
  };

  const handleItemsImported = () => {
    loadBidItems();
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="flex items-center gap-2">
            Line Items 
            <span className="text-lg font-bold text-blue-600">({currentItems.length} items)</span>
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button onClick={addItem} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Add Line Item
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <MoreHorizontal className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem asChild>
                  <ImportBidItemsDialog 
                    onItemsImported={handleItemsImported} 
                    projects={projectId ? [{ id: projectId, name: 'Current Project' }] : []} 
                  />
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleStartFromScratch}>
                  Start from Scratch
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="w-full">
          <div className="min-w-full">
            <div className="grid grid-cols-12 gap-2 pb-3 mb-3 text-xs font-semibold text-gray-700 bg-gray-50 px-3 py-3 rounded">
              <div className="col-span-1">Division</div>
              <div className="col-span-2">Category</div>
              <div className="col-span-2">Subcategory</div>
              <div className="col-span-3">Description</div>
              <div className="col-span-1">Unit</div>
              <div className="col-span-1">Quantity</div>
              <div className="col-span-1">Unit Cost</div>
              <div className="col-span-1">Total</div>
            </div>

            <div className="space-y-2">
              {currentItems.map((item, index) => (
                <div key={item.id} className={`grid grid-cols-12 gap-2 items-center py-3 px-3 rounded ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 transition-all duration-200`}>
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
                    <div className="text-xs font-semibold text-green-700 truncate">
                      ${item.total.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    {currentItems.length > 1 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => removeItem(item.id)}
                        className="h-6 w-6 p-0 ml-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {currentItems.length > 0 && (
          <div className="border-t pt-6 mt-6 bg-gradient-to-r from-gray-50 to-blue-50 px-6 py-6 rounded-lg">
            <div className="flex justify-end">
              <div className="text-right">
                <div className="text-3xl font-bold text-blue-700">
                  Grand Total: ${calculateGrandTotal().toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-sm text-gray-600 mt-2">
                  {currentItems.length} line item{currentItems.length !== 1 ? 's' : ''}
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
