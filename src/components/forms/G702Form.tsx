
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { SOVTable } from './sov/SOVTable';

interface G702FormProps {
  onSave?: () => void;
}

export function G702Form({ onSave }: G702FormProps) {
  const [projects, setProjects] = useState<any[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [sovItems, setSovItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    contractor_name: '',
    contractor_address: '',
    project_name: '',
    project_number: '',
    application_number: 1,
    period_to: '',
    original_contract_sum: 0,
    net_change_by_change_orders: 0,
    architect_date: '',
    contractor_date: ''
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProject) {
      fetchProjectData();
      fetchSOVItems();
    }
  }, [selectedProject]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, client, contract_value')
        .order('name');

      if (error) throw error;
      setProjects(data || []);
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    }
  };

  const fetchProjectData = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', selectedProject)
        .single();

      if (error) throw error;

      setFormData(prev => ({
        ...prev,
        project_name: data.name,
        original_contract_sum: data.contract_value || 0
      }));
    } catch (error) {
      console.error('Error fetching project data:', error);
      toast.error('Failed to load project data');
    }
  };

  const fetchSOVItems = async () => {
    try {
      console.log('Fetching SOV items for project:', selectedProject);
      const { data, error } = await supabase
        .from('sov_items')
        .select('*')
        .eq('project_id', selectedProject)
        .order('item_number');

      if (error) {
        console.error('Error fetching SOV items:', error);
        throw error;
      }

      console.log('SOV items fetched:', data);
      
      // Process the SOV items with proper calculations
      const processedItems = (data || []).map(item => {
        const scheduledValue = Number(item.scheduled_value) || 0;
        const changeOrders = Number(item.change_orders) || 0;
        const workCompleted = Number(item.work_completed_to_date) || 0;
        const materialsStored = Number(item.materials_stored) || 0;
        const totalCompletedAndStored = workCompleted + materialsStored;
        
        return {
          ...item,
          scheduled_value: scheduledValue,
          change_orders: changeOrders,
          work_completed_to_date: workCompleted,
          materials_stored: materialsStored,
          total_completed_and_stored: totalCompletedAndStored,
          balance_to_finish: (scheduledValue + changeOrders) - totalCompletedAndStored
        };
      });

      setSovItems(processedItems);
    } catch (error) {
      console.error('Error fetching SOV items:', error);
      toast.error('Failed to load Schedule of Values items');
      setSovItems([]);
    }
  };

  const handleSave = async () => {
    if (!selectedProject) {
      toast.error('Please select a project');
      return;
    }

    setLoading(true);
    try {
      // Calculate totals from SOV items
      const totalCompletedAndStored = sovItems.reduce((sum, item) => 
        sum + (Number(item.total_completed_and_stored) || 0), 0
      );
      
      const contractSumToDate = formData.original_contract_sum + formData.net_change_by_change_orders;
      const balanceToFinish = contractSumToDate - totalCompletedAndStored;

      const applicationData = {
        project_id: selectedProject,
        contractor_name: formData.contractor_name,
        contractor_address: formData.contractor_address,
        project_name: formData.project_name,
        project_number: formData.project_number,
        application_number: formData.application_number,
        period_to: formData.period_to,
        original_contract_sum: formData.original_contract_sum,
        net_change_by_change_orders: formData.net_change_by_change_orders,
        contract_sum_to_date: contractSumToDate,
        total_completed_and_stored: totalCompletedAndStored,
        balance_to_finish: balanceToFinish,
        architect_date: formData.architect_date || null,
        contractor_date: formData.contractor_date || null
      };

      const { error } = await supabase
        .from('payment_applications_g702')
        .insert(applicationData);

      if (error) throw error;

      toast.success('Payment application saved successfully');
      onSave?.();
    } catch (error) {
      console.error('Error saving payment application:', error);
      toast.error('Failed to save payment application');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Payment Application Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="project">Project</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name} - {project.client}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="application_number">Application Number</Label>
              <Input
                id="application_number"
                type="number"
                value={formData.application_number}
                onChange={(e) => setFormData(prev => ({ ...prev, application_number: Number(e.target.value) }))}
              />
            </div>

            <div>
              <Label htmlFor="contractor_name">Contractor Name</Label>
              <Input
                id="contractor_name"
                value={formData.contractor_name}
                onChange={(e) => setFormData(prev => ({ ...prev, contractor_name: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="period_to">Period To</Label>
              <Input
                id="period_to"
                type="date"
                value={formData.period_to}
                onChange={(e) => setFormData(prev => ({ ...prev, period_to: e.target.value }))}
              />
            </div>

            <div>
              <Label htmlFor="original_contract_sum">Original Contract Sum</Label>
              <Input
                id="original_contract_sum"
                type="number"
                step="0.01"
                value={formData.original_contract_sum}
                onChange={(e) => setFormData(prev => ({ ...prev, original_contract_sum: Number(e.target.value) }))}
              />
            </div>

            <div>
              <Label htmlFor="net_change_by_change_orders">Net Change by Change Orders</Label>
              <Input
                id="net_change_by_change_orders"
                type="number"
                step="0.01"
                value={formData.net_change_by_change_orders}
                onChange={(e) => setFormData(prev => ({ ...prev, net_change_by_change_orders: Number(e.target.value) }))}
              />
            </div>
          </div>

          <div>
            <Label htmlFor="contractor_address">Contractor Address</Label>
            <Textarea
              id="contractor_address"
              value={formData.contractor_address}
              onChange={(e) => setFormData(prev => ({ ...prev, contractor_address: e.target.value }))}
              rows={3}
            />
          </div>
        </CardContent>
      </Card>

      {selectedProject && sovItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Schedule of Values</CardTitle>
          </CardHeader>
          <CardContent>
            <SOVTable items={sovItems} />
          </CardContent>
        </Card>
      )}

      {selectedProject && sovItems.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <p className="text-gray-500 mb-4">
              No Schedule of Values items found for this project.
            </p>
            <p className="text-sm text-gray-400">
              Please create SOV items in the Schedule of Values page first.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        <Button 
          onClick={handleSave} 
          disabled={loading || !selectedProject}
        >
          {loading ? 'Saving...' : 'Save Payment Application'}
        </Button>
      </div>
    </div>
  );
}
