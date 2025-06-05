
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Plus, Trash2, Save, Copy } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface SOVItem {
  id: string;
  division: string;
  itemNumber: string;
  category: string;
  description: string;
  value: number;
}

interface CreateSOVDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSave: () => void;
}

const builtInTemplates = [
  {
    id: 'basic',
    name: 'Basic Template',
    description: 'Simple structure with essential divisions. Best for small to medium projects.',
    items: [
      { division: '01', itemNumber: '01-100', category: 'General Requirements', description: 'General Requirements', value: 75000 },
      { division: '02', itemNumber: '02-200', category: 'Site Work', description: 'Site Work', value: 125000 },
      { division: '03', itemNumber: '03-300', category: 'Concrete', description: 'Concrete', value: 250000 },
      { division: '04', itemNumber: '04-400', category: 'Masonry', description: 'Masonry', value: 180000 },
      { division: '05', itemNumber: '05-500', category: 'Metals', description: 'Metals', value: 200000 }
    ]
  },
  {
    id: 'detailed',
    name: 'Detailed Template',
    description: 'Comprehensive breakdown with detailed sub-items. Ideal for large commercial projects.',
    items: [
      { division: '01', itemNumber: '01-100', category: 'General Requirements', description: 'Project Management', value: 50000 },
      { division: '01', itemNumber: '01-200', category: 'General Requirements', description: 'Temporary Facilities', value: 35000 },
      { division: '01', itemNumber: '01-300', category: 'General Requirements', description: 'Quality Control', value: 25000 },
      { division: '02', itemNumber: '02-100', category: 'Site Work', description: 'Site Preparation', value: 75000 },
      { division: '02', itemNumber: '02-200', category: 'Site Work', description: 'Earthwork', value: 125000 },
      { division: '02', itemNumber: '02-300', category: 'Site Work', description: 'Utilities', value: 150000 },
      { division: '03', itemNumber: '03-100', category: 'Concrete', description: 'Concrete Forming', value: 100000 },
      { division: '03', itemNumber: '03-200', category: 'Concrete', description: 'Concrete Reinforcing', value: 150000 },
      { division: '03', itemNumber: '03-300', category: 'Concrete', description: 'Cast-in-Place Concrete', value: 200000 }
    ]
  }
];

export function CreateSOVDialog({ open, onOpenChange, projectId, onSave }: CreateSOVDialogProps) {
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [customTemplates, setCustomTemplates] = useState<any[]>([]);
  const [projectInfo, setProjectInfo] = useState({
    projectName: '',
    projectNumber: '',
    contractDate: '',
    totalContractAmount: '',
    notes: ''
  });
  const [sovItems, setSovItems] = useState<SOVItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [savingTemplate, setSavingTemplate] = useState(false);

  useEffect(() => {
    if (open && projectId) {
      fetchProjectInfo();
      fetchCustomTemplates();
    }
  }, [open, projectId]);

  const fetchProjectInfo = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('name, project_code, contract_value, start_date')
        .eq('id', projectId)
        .single();

      if (error) throw error;

      setProjectInfo({
        projectName: data.name || '',
        projectNumber: data.project_code || '',
        contractDate: data.start_date || '',
        totalContractAmount: data.contract_value?.toString() || '',
        notes: ''
      });
    } catch (error) {
      console.error('Error fetching project info:', error);
    }
  };

  const fetchCustomTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('bid_templates')
        .select(`
          id,
          name,
          description,
          bid_template_items (
            category,
            description,
            unit_cost
          )
        `)
        .order('name');

      if (error) throw error;
      setCustomTemplates(data || []);
    } catch (error) {
      console.error('Error fetching custom templates:', error);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    setSelectedTemplate(templateId);
    
    // Check if it's a built-in template
    const builtInTemplate = builtInTemplates.find(t => t.id === templateId);
    if (builtInTemplate) {
      const items = builtInTemplate.items.map((item, index) => ({
        id: `temp-${index}`,
        division: item.division,
        itemNumber: item.itemNumber,
        category: item.category,
        description: item.description,
        value: item.value
      }));
      setSovItems(items);
      return;
    }

    // Check if it's a custom template
    const customTemplate = customTemplates.find(t => t.id === templateId);
    if (customTemplate && customTemplate.bid_template_items) {
      const items = customTemplate.bid_template_items.map((item: any, index: number) => ({
        id: `temp-${index}`,
        division: Math.floor(index / 100 + 1).toString().padStart(2, '0'),
        itemNumber: `${Math.floor(index / 100 + 1).toString().padStart(2, '0')}-${(index % 100 + 1).toString().padStart(3, '0')}`,
        category: item.category,
        description: item.description,
        value: item.unit_cost || 0
      }));
      setSovItems(items);
      return;
    }

    // Start from scratch
    if (templateId === 'scratch') {
      setSovItems([]);
    }
  };

  const addSOVItem = () => {
    const newItem: SOVItem = {
      id: `temp-${Date.now()}`,
      division: '',
      itemNumber: '',
      category: '',
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

    const incompleteItems = sovItems.filter(item => !item.itemNumber || !item.description || !item.category);
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
        category: item.category,
        scheduled_value: item.value,
        percent_complete: 0
        // Removed total_completed_and_stored as it's a generated column
      }));

      const { error } = await supabase
        .from('sov_items')
        .insert(itemsToSave);

      if (error) throw error;

      onSave();
      resetForm();
      onOpenChange(false);
      toast.success('Schedule of Values created successfully');
    } catch (error) {
      console.error('Error saving SOV:', error);
      toast.error('Failed to save Schedule of Values');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAsTemplate = async () => {
    if (sovItems.length === 0) {
      toast.error('Please add at least one SOV item to save as template');
      return;
    }

    const templateName = prompt('Enter template name:');
    if (!templateName) return;

    setSavingTemplate(true);
    try {
      // Save the template
      const { data: template, error: templateError } = await supabase
        .from('bid_templates')
        .insert({
          name: templateName,
          description: `Custom template created from project: ${projectInfo.projectName}`
        })
        .select()
        .single();

      if (templateError) throw templateError;

      // Save template items
      const templateItems = sovItems.map(item => ({
        template_id: template.id,
        category: item.category,
        description: item.description,
        unit_cost: item.value
      }));

      const { error: itemsError } = await supabase
        .from('bid_template_items')
        .insert(templateItems);

      if (itemsError) throw itemsError;

      await fetchCustomTemplates(); // Refresh the templates list
      toast.success(`Template "${templateName}" saved successfully`);
    } catch (error) {
      console.error('Error saving template:', error);
      toast.error('Failed to save template');
    } finally {
      setSavingTemplate(false);
    }
  };

  const resetForm = () => {
    setSovItems([]);
    setSelectedTemplate('');
    setProjectInfo({
      projectName: '',
      projectNumber: '',
      contractDate: '',
      totalContractAmount: '',
      notes: ''
    });
  };

  const totalValue = sovItems.reduce((sum, item) => sum + item.value, 0);

  const allTemplates = [...builtInTemplates, ...customTemplates];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-7xl h-[90vh] flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle>Create New Schedule of Values</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto space-y-6 pr-2">
          {/* Template Selection */}
          <div>
            <Label className="text-sm font-medium mb-3 block">Select Template</Label>
            <div className="grid grid-cols-3 gap-4">
              {builtInTemplates.map((template) => (
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
                onClick={() => handleTemplateSelect('scratch')}
              >
                <div className="flex items-center justify-center w-12 h-12 bg-green-100 rounded-lg mb-3 mx-auto">
                  <Plus className="w-6 h-6 text-green-600" />
                </div>
                <h3 className="font-medium text-center">Start from Scratch</h3>
                <p className="text-sm text-gray-500 text-center mt-1">Create your own custom structure.</p>
              </div>
            </div>

            {/* Custom Templates Dropdown */}
            {customTemplates.length > 0 && (
              <div className="mt-4">
                <Label className="text-sm font-medium mb-2 block">Saved Templates</Label>
                <Select value={selectedTemplate} onValueChange={handleTemplateSelect}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Select a saved template" />
                  </SelectTrigger>
                  <SelectContent>
                    {customTemplates.map((template) => (
                      <SelectItem key={template.id} value={template.id}>
                        {template.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
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
                disabled
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
                    <TableHead>Category</TableHead>
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
                          className="w-24"
                        />
                      </TableCell>
                      <TableCell>
                        <Input
                          value={item.category}
                          onChange={(e) => updateSOVItem(item.id, 'category', e.target.value)}
                          placeholder="Category"
                          className="min-w-[120px]"
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
                          className="w-24"
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
                      <TableCell colSpan={6} className="text-center py-8 text-gray-500">
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

          {/* Notes */}
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
        </div>

        {/* Actions */}
        <div className="flex items-center justify-between pt-4 border-t flex-shrink-0">
          <Button 
            variant="outline" 
            onClick={handleSaveAsTemplate}
            disabled={savingTemplate || sovItems.length === 0}
          >
            <Copy className="w-4 h-4 mr-2" />
            {savingTemplate ? 'Saving Template...' : 'Save as Template'}
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
      </DialogContent>
    </Dialog>
  );
}
