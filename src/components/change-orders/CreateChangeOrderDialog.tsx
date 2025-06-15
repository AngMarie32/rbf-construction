
import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { FileText, Template } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { ChangeOrderTemplatesDialog } from './ChangeOrderTemplatesDialog';

interface CreateChangeOrderDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string | null;
  onSave: () => void;
}

interface ChangeOrderTemplate {
  id: string;
  name: string;
  description: string;
  estimatedAmount: number;
  category: string;
  isDefault: boolean;
}

export function CreateChangeOrderDialog({ 
  open, 
  onOpenChange, 
  projectId,
  onSave
}: CreateChangeOrderDialogProps) {
  const [formData, setFormData] = useState({
    number: '',
    description: '',
    amount: 0,
    date: new Date().toISOString().split('T')[0],
    status: 'Draft'
  });
  const [loading, setLoading] = useState(false);
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<ChangeOrderTemplate | null>(null);

  useEffect(() => {
    if (open && projectId) {
      generateNextNumber();
    }
  }, [open, projectId]);

  const generateNextNumber = async () => {
    try {
      const { data, error } = await supabase
        .from('change_orders')
        .select('number')
        .eq('project_id', projectId)
        .order('number', { ascending: false })
        .limit(1);

      if (error) throw error;

      let nextNumber = '001';
      if (data && data.length > 0) {
        const lastNumber = parseInt(data[0].number) || 0;
        nextNumber = (lastNumber + 1).toString().padStart(3, '0');
      }

      setFormData(prev => ({ ...prev, number: nextNumber }));
    } catch (error) {
      console.error('Error generating change order number:', error);
      setFormData(prev => ({ ...prev, number: '001' }));
    }
  };

  const handleTemplateSelect = (template: ChangeOrderTemplate) => {
    setSelectedTemplate(template);
    setFormData(prev => ({
      ...prev,
      description: template.description,
      amount: template.estimatedAmount
    }));
    setTemplatesOpen(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!projectId) {
      toast.error('Project ID is required');
      return;
    }

    if (!formData.number || !formData.description) {
      toast.error('Please fill in all required fields');
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from('change_orders')
        .insert({
          project_id: projectId,
          number: formData.number,
          description: formData.description,
          amount: formData.amount,
          date: formData.date,
          status: formData.status
        });

      if (error) throw error;

      toast.success('Change order created successfully');
      onSave();
      onOpenChange(false);
      resetForm();
    } catch (error) {
      console.error('Error creating change order:', error);
      toast.error('Failed to create change order');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      number: '',
      description: '',
      amount: 0,
      date: new Date().toISOString().split('T')[0],
      status: 'Draft'
    });
    setSelectedTemplate(null);
  };

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Create New Change Order
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Template Selection */}
            <div className="border rounded-lg p-4 bg-gray-50">
              <div className="flex justify-between items-center mb-3">
                <Label className="text-sm font-medium">Start from Template</Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setTemplatesOpen(true)}
                >
                  <Template className="w-4 h-4 mr-2" />
                  Browse Templates
                </Button>
              </div>
              {selectedTemplate && (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary">{selectedTemplate.name}</Badge>
                    <span className="text-sm text-gray-600">
                      ${selectedTemplate.estimatedAmount.toLocaleString()}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSelectedTemplate(null);
                      setFormData(prev => ({ ...prev, description: '', amount: 0 }));
                    }}
                  >
                    Clear
                  </Button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="number">Change Order Number *</Label>
                <Input
                  id="number"
                  value={formData.number}
                  onChange={(e) => handleInputChange('number', e.target.value)}
                  placeholder="001"
                  required
                />
              </div>
              <div>
                <Label htmlFor="date">Date *</Label>
                <Input
                  id="date"
                  type="date"
                  value={formData.date}
                  onChange={(e) => handleInputChange('date', e.target.value)}
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description *</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => handleInputChange('description', e.target.value)}
                placeholder="Describe the change order..."
                rows={4}
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="amount">Amount ($)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  value={formData.amount}
                  onChange={(e) => handleInputChange('amount', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                />
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Draft">Draft</SelectItem>
                    <SelectItem value="Submitted">Submitted</SelectItem>
                    <SelectItem value="Approved">Approved</SelectItem>
                    <SelectItem value="Rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end space-x-3 pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={loading}>
                {loading ? 'Creating...' : 'Create Change Order'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <ChangeOrderTemplatesDialog
        open={templatesOpen}
        onOpenChange={setTemplatesOpen}
        onSelectTemplate={handleTemplateSelect}
      />
    </>
  );
}
