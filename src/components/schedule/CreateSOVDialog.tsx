
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SOVItem {
  id: string;
  division: string;
  itemNumber: string;
  description: string;
  value: number;
}

interface CreateSOVDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSave: () => void;
}

const templates = [
  {
    id: 'basic',
    name: 'Basic Template',
    description: 'Simple structure with essential divisions. Best for small to medium projects.',
    items: [
      { division: '01', itemNumber: '01-100', description: 'General Requirements', value: 75000 },
      { division: '02', itemNumber: '02-200', description: 'Site Work', value: 125000 },
      { division: '03', itemNumber: '03-300', description: 'Concrete', value: 250000 },
      { division: '04', itemNumber: '04-400', description: 'Masonry', value: 180000 },
      { division: '05', itemNumber: '05-500', description: 'Metals', value: 200000 }
    ]
  },
  {
    id: 'detailed',
    name: 'Detailed Template',
    description: 'Comprehensive breakdown with detailed sub-items. Ideal for large commercial projects.',
    items: [
      { division: '01', itemNumber: '01-100', description: 'Project Management', value: 50000 },
      { division: '01', itemNumber: '01-200', description: 'Temporary Facilities', value: 35000 },
      { division: '01', itemNumber: '01-300', description: 'Quality Control', value: 25000 },
      { division: '02', itemNumber: '02-100', description: 'Site Preparation', value: 75000 },
      { division: '02', itemNumber: '02-200', description: 'Earthwork', value: 125000 },
      { division: '02', itemNumber: '02-300', description: 'Utilities', value: 150000 },
      { division: '03', itemNumber: '03-100', description: 'Concrete Forming', value: 100000 },
      { division: '03', itemNumber: '03-200', description: 'Concrete Reinforcing', value: 150000 },
      { division: '03', itemNumber: '03-300', description: 'Cast-in-Place Concrete', value: 200000 }
    ]
  }
];

export function CreateSOVDialog({ open, onOpenChange, projectId, onSave }: CreateSOVDialogProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [projectInfo, setProjectInfo] = useState({
    projectName: '',
    projectNumber: '',
    contractDate: '',
    totalContractAmount: '',
    contractor: '',
    architect: '',
    notes: ''
  });
  const [sovItems, setSovItems] = useState<SOVItem[]>([]);
  const [saving, setSaving] = useState(false);

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    const template = templates.find(t => t.id === templateId);
    if (template) {
      const items = template.items.map((item, index) => ({
        id: `temp-${index}`,
        division: item.division,
        itemNumber: item.itemNumber,
        description: item.description,
        value: item.value
      }));
      setSovItems(items);
    }
  };

  const addSOVItem = () => {
    const newItem: SOVItem = {
      id: `temp-${Date.now()}`,
      division: '',
      itemNumber: '',
      description: '',
      value: 0
    };
    setSovItems([...sovItems, newItem]);
  };

  const updateSOVItem = (id: string, field: keyof SOVItem, value: any) => {
    setSovItems(items => items.map(item => 
      item.id === id ? { ...item, [field]: value } : item
    ));
  };

  const removeSOVItem = (id: string) => {
    setSovItems(items => items.filter(item => item.id !== id));
  };

  const handleSave = async () => {
    if (sovItems.length === 0) {
      toast.error('Please add at least one SOV item');
      return;
    }

    const incompleteItems = sovItems.filter(item => !item.itemNumber || !item.description);
    if (incompleteItems.length > 0) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSaving(true);
    try {
      const itemsToSave = sovItems.map(item => ({
        project_id: projectId,
        item_number: item.itemNumber,
        description: item.description,
        category: `Division ${item.division}`,
        scheduled_value: item.value,
        percent_complete: 0,
        total_completed_and_stored: 0
      }));

      const { error } = await supabase
        .from('sov_items')
        .insert(itemsToSave);

      if (error) throw error;

      onSave();
      setSovItems([]);
      setSelectedTemplate('');
      setProjectInfo({
        projectName: '',
        projectNumber: '',
        contractDate: '',
        totalContractAmount: '',
        contractor: '',
        architect: '',
        notes: ''
      });
      onOpenChange(false);
      toast.success('Schedule of Values created successfully');
    } catch (error) {
      console.error('Error saving SOV:', error);
      toast.error('Failed to save Schedule of Values');
    } finally {
      setSaving(false);
    }
  };

  const totalValue = sovItems.reduce((sum, item) => sum + item.value, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle>Create New Schedule of Values</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 overflow-y-auto">
          {/* Template Selection */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Select Template</Label>
            <div className="grid grid-cols-3 gap-4">
              {templates.map((template) => (
                <div
                  key={template.id}
                  className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                    selectedTemplate === template.id 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleTemplateSelect(template.id)}
                >
                  <div className="flex items-center justify-center w-12 h-12 bg-blue-100 rounded-lg mb-3 mx-auto">
                    <div className="w-6 h-6 bg-blue-500 rounded"></div>
                  </div>
                  <h3 className="font-medium text-center">{template.name}</h3>
                  <p className="text-sm text-gray-500 text-center mt-1">{template.description}</p>
                </div>
              ))}
              <div
                className={`p-4 border rounded-lg cursor-pointer transition-colors ${
                  selectedTemplate === 'scratch' 
                    ? 'border-green-500 bg-green-50' 
                    : 'border-gray-200 hover:border-gray-300'
                }`}
                onClick={() => {
                  setSelectedTemplate('scratch');
                  setSovItems([]);
                }}
              >
                <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mb-3 mx-auto">
                  <Plus className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-medium text-center">Start from Scratch</h3>
                <p className="text-sm text-gray-500 text-center mt-1">Create your own custom structure. Maximum flexibility for unique project needs.</p>
              </div>
            </div>
          </div>

          {/* Project Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="projectName">Project Name</Label>
              <Input
                id="projectName"
                value={projectInfo.projectName}
                onChange={(e) => setProjectInfo({...projectInfo, projectName: e.target.value})}
                placeholder="Enter project name"
              />
            </div>
            <div>
              <Label htmlFor="projectNumber">Project Number</Label>
              <Input
                id="projectNumber"
                value={projectInfo.projectNumber}
                onChange={(e) => setProjectInfo({...projectInfo, projectNumber: e.target.value})}
                placeholder="Enter project number"
              />
            </div>
            <div>
              <Label htmlFor="contractDate">Contract Date</Label>
              <Input
                id="contractDate"
                type="date"
                value={projectInfo.contractDate}
                onChange={(e) => setProjectInfo({...projectInfo, contractDate: e.target.value})}
              />
            </div>
            <div>
              <Label htmlFor="totalContractAmount">Total Contract Amount</Label>
              <Input
                id="totalContractAmount"
                type="number"
                value={projectInfo.totalContractAmount}
                onChange={(e) => setProjectInfo({...projectInfo, totalContractAmount: e.target.value})}
                placeholder="Enter total amount"
              />
            </div>
          </div>

          {/* Line Items */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <Label className="text-sm font-medium">Line Items</Label>
              <Button onClick={addSOVItem} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Line Item
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Division</TableHead>
                    <TableHead>Item Number</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Value</TableHead>
                    <TableHead>Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sovItems.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <Input
                          value={item.division}
                          onChange={(e) => updateSOVItem(item.id, 'division', e.target.value)}
                          placeholder="01"
                          className="w-16"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.itemNumber}
                          onChange={(e) => updateSOVItem(item.id, 'itemNumber', e.target.value)}
                          placeholder="01-100"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.description}
                          onChange={(e) => updateSOVItem(item.id, 'description', e.target.value)}
                          placeholder="Item description"
                          className="min-w-[200px]"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          value={item.value}
                          onChange={(e) => updateSOVItem(item.id, 'value', parseFloat(e.target.value) || 0)}
                          placeholder="0.00"
                        />
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeSOVItem(item.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {sovItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        No line items added yet. Select a template or add items manually.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>

            {sovItems.length > 0 && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Contract Value:</span>
                  <span className="text-xl font-bold text-blue-600">
                    ${totalValue.toLocaleString()}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Additional Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contractor">Contractor</Label>
              <Input
                id="contractor"
                value={projectInfo.contractor}
                onChange={(e) => setProjectInfo({...projectInfo, contractor: e.target.value})}
                placeholder="Enter contractor name"
              />
            </div>
            <div>
              <Label htmlFor="architect">Architect</Label>
              <Input
                id="architect"
                value={projectInfo.architect}
                onChange={(e) => setProjectInfo({...projectInfo, architect: e.target.value})}
                placeholder="Enter architect name"
              />
            </div>
          </div>

          <div>
            <Label htmlFor="notes">Notes</Label>
            <textarea
              id="notes"
              value={projectInfo.notes}
              onChange={(e) => setProjectInfo({...projectInfo, notes: e.target.value})}
              placeholder="Enter any additional notes"
              className="w-full p-3 border border-gray-300 rounded-md resize-none"
              rows={3}
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-4 border-t">
            <Button variant="outline">
              <Save className="w-4 h-4 mr-2" />
              Save as Template
            </Button>

            <div className="flex gap-2">
              <Button
                onClick={() => onOpenChange(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saving || sovItems.length === 0}
              >
                <Save className="w-4 h-4 mr-2" />
                {saving ? 'Creating...' : 'Create Schedule of Values'}
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
