import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, FileText, Save, Download } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

// Import new components
import { CreateBidDialog } from '@/components/bid-planner/CreateBidDialog';
import { TemplateLibrary } from '@/components/bid-planner/TemplateLibrary';
import { BidOverview } from '@/components/bid-planner/BidOverview';

interface BidItem {
  id: string;
  category: string;
  subcategory: string;
  description: string;
  unit: string;
  unitCost: number;
  quantity: number;
  total: number;
}

interface Project {
  id: string;
  name: string;
}

interface BidTemplate {
  id: string;
  name: string;
  description: string;
  isDefault: boolean;
}

const UNIT_OPTIONS = [
  { value: 'each', label: 'Each' },
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'lft', label: 'Linear Feet' },
  { value: 'sy', label: 'Square Yard' },
  { value: 'ls', label: 'Lump Sum' },
  { value: 'ac', label: 'Acre' },
  { value: 'sf', label: 'Square Feet' },
  { value: 'cy', label: 'Cubic Yard' },
  { value: 'ton', label: 'Ton' },
  { value: 'hr', label: 'Hour' }
];

export default function BidPlanner() {
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [projects, setProjects] = useState<Project[]>([]);
  const [bidItems, setBidItems] = useState<BidItem[]>([]);
  const [templates, setTemplates] = useState<BidTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [createBidOpen, setCreateBidOpen] = useState(false);
  const [templateLibraryOpen, setTemplateLibraryOpen] = useState(false);
  const [newTemplateDialogOpen, setNewTemplateDialogOpen] = useState(false);
  
  const [newItem, setNewItem] = useState({
    category: '',
    subcategory: '',
    description: '',
    unit: 'each',
    unitCost: '',
    quantity: '1'
  });

  const [newTemplate, setNewTemplate] = useState({
    name: '',
    description: ''
  });

  useEffect(() => {
    fetchProjects();
    fetchTemplates();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchBidItems();
    }
  }, [selectedProject]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    }
  };

  const fetchTemplates = async () => {
    try {
      const { data, error } = await supabase
        .from('bid_templates')
        .select('id, name, description, is_default')
        .order('name');

      if (error) throw error;
      const mappedTemplates = (data || []).map(template => ({
        id: template.id,
        name: template.name,
        description: template.description || '',
        isDefault: template.is_default || false
      }));
      setTemplates(mappedTemplates);
    } catch (error) {
      console.error('Error fetching templates:', error);
      toast.error('Failed to load templates');
    }
  };

  const fetchBidItems = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bid_items')
        .select('*')
        .eq('project_id', selectedProject)
        .order('category', { ascending: true });

      if (error) throw error;

      const mappedItems = (data || []).map(item => ({
        id: item.id,
        category: item.category,
        subcategory: item.subcategory || '',
        description: item.description,
        unit: item.unit || 'each',
        unitCost: item.unit_cost,
        quantity: item.quantity,
        total: item.total || (item.unit_cost * item.quantity)
      }));

      setBidItems(mappedItems);
    } catch (error) {
      console.error('Error fetching bid items:', error);
      toast.error('Failed to load bid items');
    } finally {
      setLoading(false);
    }
  };

  const loadTemplate = async (templateId: string) => {
    try {
      const { data, error } = await supabase
        .from('bid_template_items')
        .select('*')
        .eq('template_id', templateId)
        .order('category');

      if (error) throw error;

      const templateItems = data || [];
      
      for (const item of templateItems) {
        const total = item.unit_cost * 1;
        
        const { error: insertError } = await supabase
          .from('bid_items')
          .insert({
            project_id: selectedProject,
            category: item.category,
            subcategory: item.subcategory,
            description: item.description,
            unit: item.unit || 'each',
            unit_cost: item.unit_cost || 0,
            quantity: 1,
            total: total,
            template_id: templateId
          });

        if (insertError) throw insertError;
      }

      toast.success(`Template loaded successfully`);
      fetchBidItems();
    } catch (error) {
      console.error('Error loading template:', error);
      toast.error('Failed to load template');
    }
  };

  const createTemplate = async () => {
    if (!newTemplate.name) {
      toast.error('Please enter a template name');
      return;
    }

    try {
      const { data: templateData, error: templateError } = await supabase
        .from('bid_templates')
        .insert({
          name: newTemplate.name,
          description: newTemplate.description
        })
        .select()
        .single();

      if (templateError) throw templateError;

      if (bidItems.length > 0) {
        const templateItems = bidItems.map(item => ({
          template_id: templateData.id,
          category: item.category,
          subcategory: item.subcategory,
          description: item.description,
          unit: item.unit,
          unit_cost: item.unitCost
        }));

        const { error: itemsError } = await supabase
          .from('bid_template_items')
          .insert(templateItems);

        if (itemsError) throw itemsError;
      }

      toast.success('Template created successfully');
      setNewTemplate({ name: '', description: '' });
      setNewTemplateDialogOpen(false);
      fetchTemplates();
    } catch (error) {
      console.error('Error creating template:', error);
      toast.error('Failed to create template');
    }
  };

  const addBidItem = async () => {
    if (!selectedProject) {
      toast.error('Please select a project first');
      return;
    }
    
    if (!newItem.category || !newItem.description || !newItem.unitCost) {
      toast.error('Please fill in all required fields (Category, Description, Unit Cost)');
      return;
    }

    try {
      const unitCost = parseFloat(newItem.unitCost);
      const quantity = parseInt(newItem.quantity) || 1;
      
      if (isNaN(unitCost) || unitCost < 0) {
        toast.error('Please enter a valid unit cost');
        return;
      }
      
      if (isNaN(quantity) || quantity < 1) {
        toast.error('Please enter a valid quantity (minimum 1)');
        return;
      }
      
      const total = unitCost * quantity;

      const { error } = await supabase
        .from('bid_items')
        .insert({
          project_id: selectedProject,
          category: newItem.category.trim(),
          subcategory: newItem.subcategory.trim() || null,
          description: newItem.description.trim(),
          unit: newItem.unit,
          unit_cost: unitCost,
          quantity: quantity,
          total: total
        });

      if (error) {
        console.error('Supabase error:', error);
        throw error;
      }

      toast.success('Bid item added successfully');
      setNewItem({ 
        category: '', 
        subcategory: '', 
        description: '', 
        unit: 'each', 
        unitCost: '', 
        quantity: '1' 
      });
      fetchBidItems();
    } catch (error) {
      console.error('Error adding bid item:', error);
      toast.error(`Failed to add bid item: ${error.message || 'Unknown error'}`);
    }
  };

  const deleteBidItem = async (id: string) => {
    try {
      const { error } = await supabase
        .from('bid_items')
        .delete()
        .eq('id', id);

      if (error) throw error;

      toast.success('Bid item deleted');
      fetchBidItems();
    } catch (error) {
      console.error('Error deleting bid item:', error);
      toast.error('Failed to delete bid item');
    }
  };

  const exportToSOV = async () => {
    if (!selectedProject || bidItems.length === 0) {
      toast.error('No bid items to export to Schedule of Values');
      return;
    }

    try {
      const sovItems = bidItems.map((item, index) => ({
        project_id: selectedProject,
        item_number: String(index + 1).padStart(3, '0'),
        category: item.category,
        description: `${item.subcategory ? item.subcategory + ' - ' : ''}${item.description}`,
        scheduled_value: item.total,
        previous_applications: 0,
        this_period: 0,
        materials_stored: 0,
        work_completed_from_previous: 0,
        materials_presently_stored: 0,
        total_completed_and_stored: 0,
        percent_complete: 0,
        retainage_percentage: 10
      }));

      const { error } = await supabase
        .from('sov_items')
        .insert(sovItems);

      if (error) throw error;

      toast.success('Bid items exported to Schedule of Values successfully');
    } catch (error) {
      console.error('Error exporting to SOV:', error);
      toast.error('Failed to export to Schedule of Values');
    }
  };

  const totalEstimate = bidItems.reduce((sum, item) => sum + item.total, 0);
  const categorizedItems = bidItems.reduce((acc, item) => {
    if (!acc[item.category]) acc[item.category] = [];
    acc[item.category].push(item);
    return acc;
  }, {} as Record<string, BidItem[]>);

  const selectedProjectData = projects.find(p => p.id === selectedProject);

  return (
    <Layout title="Bid Planner" subtitle="Plan and estimate project costs with templates">
      <div className="space-y-6">
        {/* Project Selection */}
        <Card>
          <CardHeader>
            <CardTitle>Select Project</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedProject} onValueChange={setSelectedProject}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Choose a project to plan bid for..." />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        {selectedProject && (
          <>
            {/* Enhanced Action Bar */}
            <Card>
              <CardHeader>
                <CardTitle>Bid Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex gap-4 flex-wrap">
                  <Button onClick={() => setCreateBidOpen(true)}>
                    <Plus className="w-4 h-4 mr-2" />
                    Create New Bid
                  </Button>
                  
                  <Button variant="outline" onClick={() => setTemplateLibraryOpen(true)}>
                    <FileText className="w-4 h-4 mr-2" />
                    Template Library
                  </Button>

                  <Dialog open={newTemplateDialogOpen} onOpenChange={setNewTemplateDialogOpen}>
                    <DialogTrigger asChild>
                      <Button variant="outline">
                        <Save className="w-4 h-4 mr-2" />
                        Save as Template
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Template</DialogTitle>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="templateName">Template Name</Label>
                          <Input
                            id="templateName"
                            value={newTemplate.name}
                            onChange={(e) => setNewTemplate({ ...newTemplate, name: e.target.value })}
                            placeholder="e.g. Commercial Building Template"
                          />
                        </div>
                        <div>
                          <Label htmlFor="templateDesc">Description</Label>
                          <Input
                            id="templateDesc"
                            value={newTemplate.description}
                            onChange={(e) => setNewTemplate({ ...newTemplate, description: e.target.value })}
                            placeholder="Template description..."
                          />
                        </div>
                        <Button onClick={createTemplate} className="w-full">
                          Create Template
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>

                  <Button onClick={exportToSOV} disabled={bidItems.length === 0}>
                    Export to SOV
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Tabbed Interface */}
            <Tabs defaultValue="overview" className="w-full">
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="overview">Bid Overview</TabsTrigger>
                <TabsTrigger value="items">Line Items</TabsTrigger>
                <TabsTrigger value="settings">Settings</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="space-y-6">
                <BidOverview
                  totalEstimate={totalEstimate}
                  itemCount={bidItems.length}
                  categoryCount={Object.keys(categorizedItems).length}
                  projectName={selectedProjectData?.name}
                />
              </TabsContent>

              <TabsContent value="items" className="space-y-6">
                {/* Add New Item */}
                <Card>
                  <CardHeader>
                    <CardTitle>Add Bid Item</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-7 gap-4">
                      <div>
                        <Label htmlFor="category">Category *</Label>
                        <Input
                          id="category"
                          value={newItem.category}
                          onChange={(e) => setNewItem({ ...newItem, category: e.target.value })}
                          placeholder="General Conditions"
                        />
                      </div>
                      <div>
                        <Label htmlFor="subcategory">Subcategory</Label>
                        <Input
                          id="subcategory"
                          value={newItem.subcategory}
                          onChange={(e) => setNewItem({ ...newItem, subcategory: e.target.value })}
                          placeholder="Permits"
                        />
                      </div>
                      <div>
                        <Label htmlFor="description">Description *</Label>
                        <Input
                          id="description"
                          value={newItem.description}
                          onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                          placeholder="Building permits"
                        />
                      </div>
                      <div>
                        <Label htmlFor="unit">Unit</Label>
                        <Select value={newItem.unit} onValueChange={(value) => setNewItem({ ...newItem, unit: value })}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {UNIT_OPTIONS.map((unit) => (
                              <SelectItem key={unit.value} value={unit.value}>
                                {unit.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div>
                        <Label htmlFor="unitCost">Unit Cost ($) *</Label>
                        <Input
                          id="unitCost"
                          type="number"
                          step="0.01"
                          min="0"
                          value={newItem.unitCost}
                          onChange={(e) => setNewItem({ ...newItem, unitCost: e.target.value })}
                          placeholder="0.00"
                        />
                      </div>
                      <div>
                        <Label htmlFor="quantity">Quantity</Label>
                        <Input
                          id="quantity"
                          type="number"
                          min="1"
                          value={newItem.quantity}
                          onChange={(e) => setNewItem({ ...newItem, quantity: e.target.value })}
                          placeholder="1"
                        />
                      </div>
                      <div className="flex items-end">
                        <Button onClick={addBidItem} className="w-full">
                          <Plus className="w-4 h-4 mr-2" />
                          Add
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Bid Items Table */}
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <CardTitle>Bid Items</CardTitle>
                    <Button variant="outline">
                      <Download className="w-4 h-4 mr-2" />
                      Export
                    </Button>
                  </CardHeader>
                  <CardContent>
                    {loading ? (
                      <div className="text-center py-8">Loading bid items...</div>
                    ) : bidItems.length === 0 ? (
                      <div className="text-center py-8 text-gray-500">
                        No bid items found. Add your first item above or load a template.
                      </div>
                    ) : (
                      <div className="space-y-6">
                        {Object.entries(categorizedItems).map(([category, items]) => (
                          <div key={category}>
                            <div className="flex items-center mb-3">
                              <Badge variant="secondary" className="mr-2">
                                {category}
                              </Badge>
                              <span className="text-sm text-gray-500">
                                ${items.reduce((sum, item) => sum + item.total, 0).toLocaleString()}
                              </span>
                            </div>
                            <Table>
                              <TableHeader>
                                <TableRow>
                                  <TableHead>Subcategory</TableHead>
                                  <TableHead>Description</TableHead>
                                  <TableHead>Unit</TableHead>
                                  <TableHead>Unit Cost</TableHead>
                                  <TableHead>Quantity</TableHead>
                                  <TableHead>Total</TableHead>
                                  <TableHead className="w-20">Actions</TableHead>
                                </TableRow>
                              </TableHeader>
                              <TableBody>
                                {items.map((item) => (
                                  <TableRow key={item.id}>
                                    <TableCell>{item.subcategory}</TableCell>
                                    <TableCell>{item.description}</TableCell>
                                    <TableCell>{UNIT_OPTIONS.find(u => u.value === item.unit)?.label || item.unit}</TableCell>
                                    <TableCell>${item.unitCost.toLocaleString()}</TableCell>
                                    <TableCell>{item.quantity}</TableCell>
                                    <TableCell className="font-medium">
                                      ${item.total.toLocaleString()}
                                    </TableCell>
                                    <TableCell>
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => deleteBidItem(item.id)}
                                        className="text-red-600 hover:text-red-800"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    </TableCell>
                                  </TableRow>
                                ))}
                              </TableBody>
                            </Table>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="settings" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Bid Settings</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="profitMargin">Profit Margin (%)</Label>
                        <Input
                          id="profitMargin"
                          type="number"
                          min="0"
                          max="100"
                          defaultValue="15"
                          placeholder="15"
                        />
                      </div>
                      <div>
                        <Label htmlFor="overhead">Overhead (%)</Label>
                        <Input
                          id="overhead"
                          type="number"
                          min="0"
                          max="100"
                          defaultValue="10"
                          placeholder="10"
                        />
                      </div>
                      <div>
                        <Label htmlFor="contingency">Contingency (%)</Label>
                        <Input
                          id="contingency"
                          type="number"
                          min="0"
                          max="100"
                          defaultValue="5"
                          placeholder="5"
                        />
                      </div>
                      <div>
                        <Label htmlFor="bondRate">Bond Rate (%)</Label>
                        <Input
                          id="bondRate"
                          type="number"
                          min="0"
                          max="100"
                          defaultValue="1"
                          placeholder="1"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>

            {/* Dialogs */}
            <CreateBidDialog
              open={createBidOpen}
              onOpenChange={setCreateBidOpen}
              onBidCreated={fetchBidItems}
              projectId={selectedProject}
            />

            <TemplateLibrary
              open={templateLibraryOpen}
              onOpenChange={setTemplateLibraryOpen}
              onTemplateSelected={loadTemplate}
            />
          </>
        )}
      </div>
    </Layout>
  );
}
