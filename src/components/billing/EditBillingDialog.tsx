import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar"
import { format } from 'date-fns';
import { CalendarIcon } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface EditBillingDialogProps {
  billing: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onBillingUpdated?: () => void;
}

interface FormData {
  projectId: string;
  billingPeriodStart: Date | undefined;
  billingPeriodEnd: Date | undefined;
  invoiceNumber: string;
  billedAmount: string;
  paidAmount: string;
  status: string;
  invoiceDate: Date | undefined;
  dueDate: Date | undefined;
  notes: string;
}

export function EditBillingDialog({ billing, open, onOpenChange, onBillingUpdated }: EditBillingDialogProps) {
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [formData, setFormData] = useState<FormData>({
    projectId: '',
    billingPeriodStart: undefined,
    billingPeriodEnd: undefined,
    invoiceNumber: '',
    billedAmount: '',
    paidAmount: '',
    status: 'Draft',
    invoiceDate: undefined,
    dueDate: undefined,
    notes: ''
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (billing && open) {
      setFormData({
        projectId: billing.project_id,
        billingPeriodStart: billing.billing_period_start ? new Date(billing.billing_period_start) : undefined,
        billingPeriodEnd: billing.billing_period_end ? new Date(billing.billing_period_end) : undefined,
        invoiceNumber: billing.invoice_number || '',
        billedAmount: billing.billed_amount?.toString() || '',
        paidAmount: billing.paid_amount?.toString() || '',
        status: billing.status || 'Draft',
        invoiceDate: billing.invoice_date ? new Date(billing.invoice_date) : undefined,
        dueDate: billing.due_date ? new Date(billing.due_date) : undefined,
        notes: billing.notes || ''
      });
    }
  }, [billing, open]);

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
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleSelectChange = (name: string, value: string) => {
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.projectId || !formData.billingPeriodStart || !formData.billingPeriodEnd || !formData.billedAmount) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);

    try {
      const billedAmount = parseFloat(formData.billedAmount) || 0;
      const paidAmount = parseFloat(formData.paidAmount) || 0;
      
      const billingData = {
        project_id: formData.projectId,
        billing_period_start: format(formData.billingPeriodStart, 'yyyy-MM-dd'),
        billing_period_end: format(formData.billingPeriodEnd, 'yyyy-MM-dd'),
        invoice_number: formData.invoiceNumber || null,
        billed_amount: billedAmount,
        paid_amount: paidAmount,
        remaining_amount: billedAmount - paidAmount,
        status: formData.status,
        invoice_date: formData.invoiceDate ? format(formData.invoiceDate, 'yyyy-MM-dd') : null,
        due_date: formData.dueDate ? format(formData.dueDate, 'yyyy-MM-dd') : null,
        notes: formData.notes || null
      };

      const { error } = await supabase
        .from('project_billing')
        .update(billingData)
        .eq('id', billing.id);

      if (error) throw error;

      toast.success('Billing record updated successfully');
      onOpenChange(false);
      
      if (onBillingUpdated) {
        onBillingUpdated();
      }
    } catch (error) {
      console.error('Error updating billing record:', error);
      toast.error('Failed to update billing record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Billing Record</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="projectId" className="text-right">
              Project *
            </Label>
            <Select
              value={formData.projectId}
              onValueChange={(value) => handleSelectChange('projectId', value)}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select a project" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((project) => (
                  <SelectItem key={project.id} value={project.id}>
                    {project.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Period Start *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "col-span-3 justify-start text-left font-normal",
                    !formData.billingPeriodStart && "text-muted-foreground"
                  )}
                >
                  {formData.billingPeriodStart ? (
                    format(formData.billingPeriodStart, "MMM dd, yyyy")
                  ) : (
                    <span>Pick a date</span>
                  )}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.billingPeriodStart}
                  onSelect={(date) => setFormData(prev => ({ ...prev, billingPeriodStart: date }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Period End *</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "col-span-3 justify-start text-left font-normal",
                    !formData.billingPeriodEnd && "text-muted-foreground"
                  )}
                >
                  {formData.billingPeriodEnd ? (
                    format(formData.billingPeriodEnd, "MMM dd, yyyy")
                  ) : (
                    <span>Pick a date</span>
                  )}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.billingPeriodEnd}
                  onSelect={(date) => setFormData(prev => ({ ...prev, billingPeriodEnd: date }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="invoiceNumber" className="text-right">
              Invoice Number
            </Label>
            <Input
              type="text"
              name="invoiceNumber"
              id="invoiceNumber"
              value={formData.invoiceNumber}
              onChange={handleInputChange}
              className="col-span-3"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="billedAmount" className="text-right">
              Billed Amount *
            </Label>
            <Input
              type="number"
              name="billedAmount"
              id="billedAmount"
              value={formData.billedAmount}
              onChange={handleInputChange}
              className="col-span-3"
              placeholder="0.00"
              step="0.01"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="paidAmount" className="text-right">
              Paid Amount
            </Label>
            <Input
              type="number"
              name="paidAmount"
              id="paidAmount"
              value={formData.paidAmount}
              onChange={handleInputChange}
              className="col-span-3"
              placeholder="0.00"
              step="0.01"
            />
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="status" className="text-right">
              Status
            </Label>
            <Select
              value={formData.status}
              onValueChange={(value) => handleSelectChange('status', value)}
            >
              <SelectTrigger className="col-span-3">
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Draft">Draft</SelectItem>
                <SelectItem value="Sent">Sent</SelectItem>
                <SelectItem value="Paid">Paid</SelectItem>
                <SelectItem value="Overdue">Overdue</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Invoice Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "col-span-3 justify-start text-left font-normal",
                    !formData.invoiceDate && "text-muted-foreground"
                  )}
                >
                  {formData.invoiceDate ? (
                    format(formData.invoiceDate, "MMM dd, yyyy")
                  ) : (
                    <span>Pick a date</span>
                  )}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.invoiceDate}
                  onSelect={(date) => setFormData(prev => ({ ...prev, invoiceDate: date }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="grid grid-cols-4 items-center gap-4">
            <Label className="text-right">Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "col-span-3 justify-start text-left font-normal",
                    !formData.dueDate && "text-muted-foreground"
                  )}
                >
                  {formData.dueDate ? (
                    format(formData.dueDate, "MMM dd, yyyy")
                  ) : (
                    <span>Pick a date</span>
                  )}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.dueDate}
                  onSelect={(date) => setFormData(prev => ({ ...prev, dueDate: date }))}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="notes" className="text-right mt-2">
              Notes
            </Label>
            <Textarea
              name="notes"
              id="notes"
              value={formData.notes}
              onChange={handleInputChange}
              className="col-span-3"
              placeholder="Billing notes"
            />
          </div>
          
          <div className="flex justify-end space-x-2 col-span-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Updating...' : 'Update Billing'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
