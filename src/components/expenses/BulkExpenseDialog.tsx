import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Save } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface BulkExpenseDialogProps {
  onExpensesCreated: () => void;
  projects: Array<{ id: string; name: string }>;
}

interface ExpenseEntry {
  id: string;
  project_id: string;
  description: string;
  category: string;
  amount: string;
  date: string;
  vendor: string;
  receipt_number: string;
}

const EXPENSE_CATEGORIES = [
  'Labor',
  'Materials', 
  'Sub-contractor',
  'Office',
  'Other',
  'General Conditions',
  'Equipment'
];

export function BulkExpenseDialog({ onExpensesCreated, projects }: BulkExpenseDialogProps) {
  const [open, setOpen] = useState(false);
  const [expenses, setExpenses] = useState<ExpenseEntry[]>([
    {
      id: '1',
      project_id: '',
      description: '',
      category: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      vendor: '',
      receipt_number: ''
    }
  ]);
  const [loading, setLoading] = useState(false);

  const addExpenseRow = () => {
    const newExpense: ExpenseEntry = {
      id: Date.now().toString(),
      project_id: '',
      description: '',
      category: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      vendor: '',
      receipt_number: ''
    };
    setExpenses([...expenses, newExpense]);
  };

  const removeExpenseRow = (id: string) => {
    if (expenses.length > 1) {
      setExpenses(expenses.filter(expense => expense.id !== id));
    }
  };

  const updateExpense = (id: string, field: keyof ExpenseEntry, value: string) => {
    setExpenses(expenses.map(expense => 
      expense.id === id ? { ...expense, [field]: value } : expense
    ));
  };

  const handleSubmit = async () => {
    // Filter out empty rows
    const validExpenses = expenses.filter(expense => 
      expense.project_id || expense.description || expense.amount
    );

    if (validExpenses.length === 0) {
      toast.error('Please add at least one expense');
      return;
    }

    setLoading(true);
    try {
      const expensesToCreate = validExpenses.map(expense => ({
        project_id: expense.project_id || null,
        description: expense.description || 'No description',
        category: expense.category || 'Other',
        amount: Number(expense.amount) || 0,
        date: expense.date,
        vendor: expense.vendor || null,
        receipt_number: expense.receipt_number || null,
        status: 'Pending Field Approval'
      }));

      const { error } = await supabase
        .from('expenses')
        .insert(expensesToCreate);

      if (error) throw error;

      toast.success(`${validExpenses.length} expenses created successfully`);
      onExpensesCreated();
      setOpen(false);
      
      // Reset form
      setExpenses([{
        id: '1',
        project_id: '',
        description: '',
        category: '',
        amount: '',
        date: new Date().toISOString().split('T')[0],
        vendor: '',
        receipt_number: ''
      }]);
    } catch (error) {
      console.error('Error creating expenses:', error);
      toast.error('Failed to create expenses');
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Button onClick={() => setOpen(true)} variant="outline">
        <Plus className="w-4 h-4 mr-2" />
        Bulk Entry
      </Button>
      
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bulk Expense Entry</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <Button onClick={addExpenseRow} variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Row
              </Button>
            </div>

            <div className="border rounded-lg overflow-hidden">
              <div className="bg-gray-50 grid grid-cols-8 gap-2 p-2 text-xs font-medium text-gray-700 border-b">
                <div>Project</div>
                <div>Description</div>
                <div>Category</div>
                <div>Amount</div>
                <div>Date</div>
                <div>Vendor</div>
                <div>Receipt #</div>
                <div>Actions</div>
              </div>

              <div className="max-h-96 overflow-y-auto">
                {expenses.map((expense, index) => (
                  <div key={expense.id} className="grid grid-cols-8 gap-2 p-2 border-b hover:bg-gray-50">
                    <Select value={expense.project_id} onValueChange={(value) => updateExpense(expense.id, 'project_id', value)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select..." />
                      </SelectTrigger>
                      <SelectContent>
                        {projects.map((project) => (
                          <SelectItem key={project.id} value={project.id}>
                            {project.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Input
                      value={expense.description}
                      onChange={(e) => updateExpense(expense.id, 'description', e.target.value)}
                      placeholder="Description..."
                      className="h-8 text-xs"
                    />

                    <Select value={expense.category} onValueChange={(value) => updateExpense(expense.id, 'category', value)}>
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Category..." />
                      </SelectTrigger>
                      <SelectContent>
                        {EXPENSE_CATEGORIES.map((category) => (
                          <SelectItem key={category} value={category}>
                            {category}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>

                    <Input
                      type="number"
                      value={expense.amount}
                      onChange={(e) => updateExpense(expense.id, 'amount', e.target.value)}
                      placeholder="0.00"
                      className="h-8 text-xs"
                      step="0.01"
                    />

                    <Input
                      type="date"
                      value={expense.date}
                      onChange={(e) => updateExpense(expense.id, 'date', e.target.value)}
                      className="h-8 text-xs"
                    />

                    <Input
                      value={expense.vendor}
                      onChange={(e) => updateExpense(expense.id, 'vendor', e.target.value)}
                      placeholder="Vendor..."
                      className="h-8 text-xs"
                    />

                    <Input
                      value={expense.receipt_number}
                      onChange={(e) => updateExpense(expense.id, 'receipt_number', e.target.value)}
                      placeholder="Receipt #..."
                      className="h-8 text-xs"
                    />

                    <Button
                      onClick={() => removeExpenseRow(expense.id)}
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0"
                      disabled={expenses.length === 1}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                <Save className="w-4 h-4 mr-2" />
                {loading ? 'Creating...' : `Create ${expenses.length} Expenses`}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
