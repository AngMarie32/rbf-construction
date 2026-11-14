
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { localDateISO } from '@/utils/dates';
import { ProjectCombobox } from '@/components/ui/project-combobox';

interface CreateExpenseDialogProps {
  onExpenseCreated: () => void;
  projects: Array<{ id: string; name: string }>;
}

const categories = [
  'Materials',
  'Labor',
  'Equipment',
  'Subcontractors',
  'Permits',
  'Travel',
  'Utilities',
  'Office Supplies',
  'Insurance',
  'Professional Services',
  'Fuel',
  'Maintenance',
  'Other'
];

export function CreateExpenseDialog({ onExpenseCreated, projects }: CreateExpenseDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    project_id: '',
    description: '',
    category: '',
    amount: '',
    date: localDateISO(new Date()),
    vendor: '',
    receipt_number: ''
  });
  const [spreadMonths, setSpreadMonths] = useState('1');
  const months = Math.max(1, Math.min(60, Math.floor(Number(spreadMonths) || 1)));
  const canSpread = formData.category === 'Labor';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.project_id || !formData.category || !formData.amount) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const total = parseFloat(formData.amount);
      const n = canSpread ? months : 1;
      const baseDesc = formData.description.trim() || [formData.category, formData.vendor.trim()].filter(Boolean).join(' – ') || 'Expense';
      // Split into whole cents; the last month absorbs any rounding so the parts add up to the total.
      const cents = Math.round(total * 100);
      const each = Math.floor(cents / n);
      const [y, m, d] = formData.date.split('-').map(Number);
      const rows = Array.from({ length: n }, (_, i) => {
        const last = new Date(y, m - 1 + i + 1, 0).getDate();
        const dt = new Date(y, m - 1 + i, Math.min(d, last));
        return {
          project_id: formData.project_id,
          // The database requires a description; build one when the field is left blank.
          description: n > 1 ? `${baseDesc} (month ${i + 1} of ${n})` : baseDesc,
          category: formData.category,
          amount: (i === n - 1 ? cents - each * (n - 1) : each) / 100,
          date: localDateISO(dt),
          vendor: formData.vendor || null,
          receipt_number: formData.receipt_number || null,
          status: 'Pending Field Approval',
        };
      });
      const { error } = await supabase.from('expenses').insert(rows);

      if (error) throw error;

      toast.success(n > 1 ? `Labor spread over ${n} months: ${n} expenses created` : 'Expense created successfully');
      setSpreadMonths('1');
      onExpenseCreated();
      setOpen(false);
      setFormData({
        project_id: '',
        description: '',
        category: '',
        amount: '',
        date: localDateISO(new Date()),
        vendor: '',
        receipt_number: ''
      });
    } catch (error) {
      console.error('Error creating expense:', error);
      const msg = (error as any)?.message || '';
      toast.error(msg ? `The expense wasn't saved: ${msg}` : 'Failed to create expense');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="w-4 h-4 mr-2" />
        New Expense
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Create New Expense</DialogTitle>
          </DialogHeader>
          
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <Label htmlFor="project">Project *</Label>
              <ProjectCombobox id="project" projects={projects} value={formData.project_id} onChange={(value) => setFormData({ ...formData, project_id: value })} placeholder="Type to search projects…" />
            </div>

            <div>
              <Label htmlFor="category">Category *</Label>
              <Select value={formData.category} onValueChange={(value) => setFormData({...formData, category: value})}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="amount">Amount *</Label>
              <Input
                id="amount"
                type="number"
                step="0.01"
                value={formData.amount}
                onChange={(e) => setFormData({...formData, amount: e.target.value})}
                required
              />
            </div>

            <div>
              <Label htmlFor="date">Date *</Label>
              <Input
                id="date"
                type="date"
                value={formData.date}
                onChange={(e) => setFormData({...formData, date: e.target.value})}
                required
              />
            </div>

            {canSpread && (
              <div className="rounded-md border bg-muted/40 p-3">
                <Label htmlFor="spread">Spread this labor cost over</Label>
                <div className="mt-1 flex items-center gap-2">
                  <Input id="spread" type="number" min={1} max={60} className="w-24" value={spreadMonths} onChange={(e) => setSpreadMonths(e.target.value)} />
                  <span className="text-sm text-muted-foreground">month{months === 1 ? '' : 's'}</span>
                </div>
                {months > 1 && Number(formData.amount) > 0 && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    Creates {months} expenses of about {(Number(formData.amount) / months).toLocaleString('en-US', { style: 'currency', currency: 'USD' })} each, one per month starting on the date above.
                  </p>
                )}
              </div>
            )}

            <div>
              <Label htmlFor="vendor">Vendor</Label>
              <Input
                id="vendor"
                value={formData.vendor}
                onChange={(e) => setFormData({...formData, vendor: e.target.value})}
              />
            </div>

            <div>
              <Label htmlFor="receipt_number">Receipt Number</Label>
              <Input
                id="receipt_number"
                value={formData.receipt_number}
                onChange={(e) => setFormData({...formData, receipt_number: e.target.value})}
              />
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={2}
              />
            </div>

            <div className="flex flex-col gap-2 pt-2">
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? 'Creating...' : 'Create Expense'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setOpen(false)} className="w-full">
                Cancel
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
