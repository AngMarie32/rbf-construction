import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calendar } from "@/components/ui/calendar"
import { format } from 'date-fns';
import { CalendarIcon } from "lucide-react"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface NewBillingDialogProps {
  onBillingCreated?: () => void;
}

interface FormData {
  projectId: string;
  billingPeriodStart: string;
  billingPeriodEnd: string;
  invoiceNumber: string;
  billedAmount: string;
  paidAmount: string;
  status: string;
  invoiceDate: string;
  dueDate: string;
  notes: string;
}

export function NewBillingDialog({ onBillingCreated }: NewBillingDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);
  const [formData, setFormData] = useState<FormData>({
    projectId: '',
    billingPeriodStart: '',
    billingPeriodEnd: '',
    invoiceNumber: '',
    billedAmount: '',
    paidAmount: '',
    status: 'Draft',
    invoiceDate: '',
    dueDate: '',
    notes: ''
  });

  useEffect(() => {
    fetchProjects();
  }, []);

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
    setLoading(true);

    try {
      const billingData = {
        project_id: formData.projectId,
        billing_period_start: formData.billingPeriodStart,
        billing_period_end: formData.billingPeriodEnd,
        invoice_number: formData.invoiceNumber || null,
        billed_amount: parseFloat(formData.billedAmount),
        paid_amount: parseFloat(formData.paidAmount),
        status: formData.status,
        invoice_date: formData.invoiceDate || null,
        due_date: formData.dueDate || null,
        notes: formData.notes || null
      };

      const { error } = await supabase
        .from('project_billing')
        .insert([billingData]);

      if (error) throw error;

      toast.success('Billing record created successfully');
      setOpen(false);
      setFormData({
        projectId: '',
        billingPeriodStart: '',
        billingPeriodEnd: '',
        invoiceNumber: '',
        billedAmount: '',
        paidAmount: '',
        status: 'Draft',
        invoiceDate: '',
        dueDate: '',
        notes: ''
      });
      
      // Call the callback to refresh the billing list
      if (onBillingCreated) {
        onBillingCreated();
      }
    } catch (error) {
      console.error('Error creating billing record:', error);
      toast.error('Failed to create billing record');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">Add Billing</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Billing Record</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="projectId" className="text-right">
              Project
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
            <Label htmlFor="billingPeriodStart" className="text-right">
              Billing Period Start
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[240px] justify-start text-left font-normal",
                    !formData.billingPeriodStart && "text-muted-foreground"
                  )}
                >
                  {formData.billingPeriodStart ? (
                    format(new Date(formData.billingPeriodStart), "MMM dd, yyyy")
                  ) : (
                    <span>Pick a date</span>
                  )}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.billingPeriodStart ? new Date(formData.billingPeriodStart) : undefined}
                  onSelect={(date) => setFormData({
                    ...formData,
                    billingPeriodStart: date ? format(date, 'yyyy-MM-dd') : ''
                  })}
                  disabled={(date) =>
                    date > new Date()
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="billingPeriodEnd" className="text-right">
              Billing Period End
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[240px] justify-start text-left font-normal",
                    !formData.billingPeriodEnd && "text-muted-foreground"
                  )}
                >
                  {formData.billingPeriodEnd ? (
                    format(new Date(formData.billingPeriodEnd), "MMM dd, yyyy")
                  ) : (
                    <span>Pick a date</span>
                  )}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.billingPeriodEnd ? new Date(formData.billingPeriodEnd) : undefined}
                  onSelect={(date) => setFormData({
                    ...formData,
                    billingPeriodEnd: date ? format(date, 'yyyy-MM-dd') : ''
                  })}
                  disabled={(date) =>
                    date > new Date()
                  }
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
              Billed Amount
            </Label>
            <Input
              type="number"
              name="billedAmount"
              id="billedAmount"
              value={formData.billedAmount}
              onChange={handleInputChange}
              className="col-span-3"
              placeholder="0.00"
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
            <Label htmlFor="invoiceDate" className="text-right">
              Invoice Date
            </Label>
             <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[240px] justify-start text-left font-normal",
                    !formData.invoiceDate && "text-muted-foreground"
                  )}
                >
                  {formData.invoiceDate ? (
                    format(new Date(formData.invoiceDate), "MMM dd, yyyy")
                  ) : (
                    <span>Pick a date</span>
                  )}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.invoiceDate ? new Date(formData.invoiceDate) : undefined}
                  onSelect={(date) => setFormData({
                    ...formData,
                    invoiceDate: date ? format(date, 'yyyy-MM-dd') : ''
                  })}
                  disabled={(date) =>
                    date > new Date()
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
           <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="dueDate" className="text-right">
              Due Date
            </Label>
             <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[240px] justify-start text-left font-normal",
                    !formData.dueDate && "text-muted-foreground"
                  )}
                >
                  {formData.dueDate ? (
                    format(new Date(formData.dueDate), "MMM dd, yyyy")
                  ) : (
                    <span>Pick a date</span>
                  )}
                  <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={formData.dueDate ? new Date(formData.dueDate) : undefined}
                  onSelect={(date) => setFormData({
                    ...formData,
                    dueDate: date ? format(date, 'yyyy-MM-dd') : ''
                  })}
                  disabled={(date) =>
                    date > new Date()
                  }
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid grid-cols-4 items-start gap-4">
            <Label htmlFor="notes" className="text-right mt-2">
              Notes
            </Label>
            <Input
              as="textarea"
              name="notes"
              id="notes"
              value={formData.notes}
              onChange={handleInputChange}
              className="col-span-3"
              placeholder="Billing notes"
            />
          </div>
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Create Billing'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
