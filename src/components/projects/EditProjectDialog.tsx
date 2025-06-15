
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Project } from '@/types';

interface EditProjectDialogProps {
  project: Project;
  onProjectUpdated: () => void;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditProjectDialog({ project, onProjectUpdated, open, onOpenChange }: EditProjectDialogProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: project.name,
    type: project.type,
    contractValue: project.contractValue.toString(),
    status: project.status,
    startDate: project.startDate,
    dueDate: project.dueDate,
    address: project.address,
    projectCode: project.projectCode,
    client: project.client,
    completionPercentage: project.completionPercentage.toString(),
  });

  useEffect(() => {
    // Convert "Open" status to "Active" for compatibility
    const mappedStatus = project.status === 'Open' ? 'Active' : project.status;
    setFormData({
      name: project.name,
      type: project.type,
      contractValue: project.contractValue.toString(),
      status: mappedStatus as 'Planning' | 'Active' | 'On Hold' | 'Completed' | 'Closed',
      startDate: project.startDate,
      dueDate: project.dueDate,
      address: project.address,
      projectCode: project.projectCode,
      client: project.client,
      completionPercentage: project.completionPercentage.toString(),
    });
  }, [project]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name) {
      toast.error('Please enter a project name');
      return;
    }

    setLoading(true);
    try {
      // Map "Active" back to "Open" for database storage if needed
      const dbStatus = formData.status === 'Active' ? 'Open' : formData.status;
      
      const updateData = {
        name: formData.name,
        type: formData.type || 'General',
        contract_value: formData.contractValue ? parseFloat(formData.contractValue) : 0,
        status: dbStatus,
        start_date: formData.startDate ? format(formData.startDate, 'yyyy-MM-dd') : null,
        due_date: formData.dueDate ? format(formData.dueDate, 'yyyy-MM-dd') : null,
        address: formData.address || null,
        project_code: formData.projectCode || null,
        client: formData.client || null,
        completion_percentage: formData.completionPercentage ? parseInt(formData.completionPercentage) : 0,
        updated_at: new Date().toISOString()
      };

      console.log('Updating project with data:', updateData);

      const { error } = await supabase
        .from('projects')
        .update(updateData)
        .eq('id', project.id);

      if (error) throw error;

      toast.success('Project updated successfully');
      onProjectUpdated();
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating project:', error);
      toast.error('Failed to update project');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Project: {project.name}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Project Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Enter project name"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="client">Client</Label>
              <Input
                id="client"
                value={formData.client}
                onChange={(e) => setFormData({ ...formData, client: e.target.value })}
                placeholder="Client name"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="type">Project Type</Label>
              <Input
                id="type"
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                placeholder="e.g. Commercial, Residential"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="projectCode">Project Code</Label>
              <Input
                id="projectCode"
                value={formData.projectCode}
                onChange={(e) => setFormData({ ...formData, projectCode: e.target.value })}
                placeholder="Project code"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              placeholder="Project address"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="contractValue">Contract Value ($)</Label>
              <Input
                id="contractValue"
                type="number"
                value={formData.contractValue}
                onChange={(e) => setFormData({ ...formData, contractValue: e.target.value })}
                placeholder="0.00"
                step="0.01"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="completionPercentage">Completion %</Label>
              <Input
                id="completionPercentage"
                type="number"
                value={formData.completionPercentage}
                onChange={(e) => setFormData({ ...formData, completionPercentage: e.target.value })}
                placeholder="0"
                min="0"
                max="100"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status</Label>
            <Select value={formData.status} onValueChange={(value: 'Planning' | 'Active' | 'On Hold' | 'Completed' | 'Closed') => setFormData({ ...formData, status: value })}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Planning">Planning</SelectItem>
                <SelectItem value="Active">Active</SelectItem>
                <SelectItem value="On Hold">On Hold</SelectItem>
                <SelectItem value="Completed">Completed</SelectItem>
                <SelectItem value="Closed">Closed</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.startDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.startDate ? format(formData.startDate, "PPP") : "Pick start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.startDate}
                    onSelect={(date) => setFormData({ ...formData, startDate: date })}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label>Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !formData.dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {formData.dueDate ? format(formData.dueDate, "PPP") : "Pick due date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.dueDate}
                    onSelect={(date) => setFormData({ ...formData, dueDate: date })}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Project'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
