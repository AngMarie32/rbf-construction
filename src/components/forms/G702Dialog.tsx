
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Download } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { exportG702G703ToPDF } from '@/utils/pdfExport';

interface G702DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  onSave: () => void;
  editingApplication?: any;
}

export function G702Dialog({ open, onOpenChange, projectId, onSave, editingApplication }: G702DialogProps) {
  const [loading, setLoading] = useState(false);
  const [projectData, setProjectData] = useState<any>(null);
  const [sovItems, setSovItems] = useState<any[]>([]);
  const [formData, setFormData] = useState({
    application_number: editingApplication?.application_number || 1,
    period_to: editingApplication?.period_to ? new Date(editingApplication.period_to) : new Date(),
    contractor_name: editingApplication?.contractor_name || '',
    contractor_address: editingApplication?.contractor_address || '',
    project_name: editingApplication?.project_name || '',
    project_number: editingApplication?.project_number || '',
    original_contract_sum: editingApplication?.original_contract_sum || 0,
    net_change_by_change_orders: editingApplication?.net_change_by_change_orders || 0,
    contract_sum_to_date: editingApplication?.contract_sum_to_date || 0,
    total_completed_and_stored: editingApplication?.total_completed_and_stored || 0,
    retainage_completed_work: editingApplication?.retainage_completed_work || 0,
    retainage_stored_materials: editingApplication?.retainage_stored_materials || 0,
    total_retainage: editingApplication?.total_retainage || 0,
    total_earned_less_retainage: editingApplication?.total_earned_less_retainage || 0,
    less_previous_certificates: editingApplication?.less_previous_certificates || 0,
    current_payment_due: editingApplication?.current_payment_due || 0,
    balance_to_finish: editingApplication?.balance_to_finish || 0
  });

  useEffect(() => {
    if (open && projectId) {
      fetchProjectData();
      fetchSOVItems();
      if (!editingApplication) {
        fetchNextApplicationNumber();
      }
    }
  }, [open, projectId, editingApplication]);

  const fetchProjectData = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

      if (error) throw error;
      
      setProjectData(data);
      if (!editingApplication) {
        setFormData(prev => ({
          ...prev,
          project_name: data.name,
          project_number: data.project_code || '',
          original_contract_sum: data.contract_value || 0,
          contract_sum_to_date: (data.contract_value || 0) + (data.net_change_orders || 0)
        }));
      }
    } catch (error) {
      console.error('Error fetching project:', error);
    }
  };

  const fetchSOVItems = async () => {
    try {
      const { data, error } = await supabase
        .from('sov_items')
        .select('*')
        .eq('project_id', projectId);

      if (error) throw error;
      setSovItems(data || []);
    } catch (error) {
      console.error('Error fetching SOV items:', error);
    }
  };

  const fetchNextApplicationNumber = async () => {
    try {
      const { data, error } = await supabase
        .from('payment_applications_g702')
        .select('application_number')
        .eq('project_id', projectId)
        .order('application_number', { ascending: false })
        .limit(1);

      if (error) throw error;
      
      const nextNumber = data && data.length > 0 ? data[0].application_number + 1 : 1;
      setFormData(prev => ({ ...prev, application_number: nextNumber }));
    } catch (error) {
      console.error('Error fetching application number:', error);
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      const applicationData = {
        project_id: projectId,
        application_number: formData.application_number,
        period_to: formData.period_to.toISOString().split('T')[0],
        contractor_name: formData.contractor_name,
        contractor_address: formData.contractor_address,
        project_name: formData.project_name,
        project_number: formData.project_number,
        original_contract_sum: formData.original_contract_sum,
        net_change_by_change_orders: formData.net_change_by_change_orders,
        contract_sum_to_date: formData.contract_sum_to_date,
        total_completed_and_stored: formData.total_completed_and_stored,
        retainage_completed_work: formData.retainage_completed_work,
        retainage_stored_materials: formData.retainage_stored_materials,
        total_retainage: formData.total_retainage,
        total_earned_less_retainage: formData.total_earned_less_retainage,
        less_previous_certificates: formData.less_previous_certificates,
        current_payment_due: formData.current_payment_due,
        balance_to_finish: formData.balance_to_finish
      };

      let error;
      if (editingApplication) {
        // Update existing application
        ({ error } = await supabase
          .from('payment_applications_g702')
          .update(applicationData)
          .eq('id', editingApplication.id));
      } else {
        // Create new application
        ({ error } = await supabase
          .from('payment_applications_g702')
          .insert(applicationData));
      }

      if (error) throw error;

      toast.success(editingApplication ? 'Payment application updated successfully' : 'Payment application created successfully');
      onSave();
      onOpenChange(false);
    } catch (error) {
      console.error('Error saving application:', error);
      toast.error('Failed to save payment application');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = async () => {
    try {
      await exportG702G703ToPDF(`G702-G703-App-${formData.application_number}.pdf`);
      toast.success('G702/G703 exported successfully');
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export G702/G703');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {editingApplication ? 'Edit Payment Application' : 'Create Payment Application'} (G702/G703)
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="application_number">Application Number</Label>
              <Input
                id="application_number"
                type="number"
                value={formData.application_number}
                onChange={(e) => setFormData(prev => ({ ...prev, application_number: parseInt(e.target.value) || 1 }))}
              />
            </div>
            
            <div>
              <Label>Period To</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {format(formData.period_to, "MMM dd, yyyy")}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={formData.period_to}
                    onSelect={(date) => date && setFormData(prev => ({ ...prev, period_to: date }))}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="contractor_name">Contractor Name</Label>
              <Input
                id="contractor_name"
                value={formData.contractor_name}
                onChange={(e) => setFormData(prev => ({ ...prev, contractor_name: e.target.value }))}
              />
            </div>
            
            <div>
              <Label htmlFor="project_name">Project Name</Label>
              <Input
                id="project_name"
                value={formData.project_name}
                onChange={(e) => setFormData(prev => ({ ...prev, project_name: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <Label htmlFor="original_contract_sum">Original Contract Sum</Label>
              <Input
                id="original_contract_sum"
                type="number"
                step="0.01"
                value={formData.original_contract_sum}
                onChange={(e) => setFormData(prev => ({ ...prev, original_contract_sum: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            
            <div>
              <Label htmlFor="total_completed_and_stored">Total Completed & Stored</Label>
              <Input
                id="total_completed_and_stored"
                type="number"
                step="0.01"
                value={formData.total_completed_and_stored}
                onChange={(e) => setFormData(prev => ({ ...prev, total_completed_and_stored: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            
            <div>
              <Label htmlFor="current_payment_due">Current Payment Due</Label>
              <Input
                id="current_payment_due"
                type="number"
                step="0.01"
                value={formData.current_payment_due}
                onChange={(e) => setFormData(prev => ({ ...prev, current_payment_due: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="w-4 h-4 mr-2" />
              Export PDF
            </Button>
            <Button onClick={handleSave} disabled={loading}>
              {loading ? 'Saving...' : editingApplication ? 'Update Application' : 'Save Application'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
