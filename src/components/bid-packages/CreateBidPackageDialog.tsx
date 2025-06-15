
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarIcon, Package, Plus, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Project {
  id: string;
  name: string;
}

interface Document {
  id: string;
  name: string;
  category: string;
}

interface CreateBidPackageDialogProps {
  onPackageCreated: () => void;
}

export const CreateBidPackageDialog: React.FC<CreateBidPackageDialogProps> = ({ onPackageCreated }) => {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [estimatedValue, setEstimatedValue] = useState('');
  const [estimatedStartDate, setEstimatedStartDate] = useState<Date>();
  const [selectedProject, setSelectedProject] = useState('');
  const [status, setStatus] = useState('Draft');
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  
  const [projects, setProjects] = useState<Project[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchProjects();
      fetchDocuments();
    }
  }, [open]);

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
      toast({
        title: "Error",
        description: "Failed to load projects",
        variant: "destructive",
      });
    }
  };

  const fetchDocuments = async () => {
    try {
      const { data, error } = await supabase
        .from('documents')
        .select('id, name, category')
        .order('name');
      
      if (error) throw error;
      setDocuments(data || []);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: "Error",
        description: "Failed to load documents",
        variant: "destructive",
      });
    }
  };

  const handleDocumentToggle = (documentId: string) => {
    setSelectedDocuments(prev => 
      prev.includes(documentId)
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId]
    );
  };

  const handleSubmit = async () => {
    if (!name || !selectedProject) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: packageData, error: packageError } = await supabase
        .from('bid_packages')
        .insert({
          name,
          description,
          estimated_value: estimatedValue ? parseFloat(estimatedValue) : null,
          due_date: estimatedStartDate?.toISOString().split('T')[0],
          project_id: selectedProject,
          status
        })
        .select()
        .single();

      if (packageError) throw packageError;

      // If documents are selected, create bid_package_items for them
      if (selectedDocuments.length > 0 && packageData) {
        const documentItems = selectedDocuments.map(docId => {
          const doc = documents.find(d => d.id === docId);
          return {
            bid_package_id: packageData.id,
            category: doc?.category || 'Document',
            description: doc?.name || 'Document',
            quantity: 1,
            estimated_cost: 0
          };
        });

        const { error: itemsError } = await supabase
          .from('bid_package_items')
          .insert(documentItems);

        if (itemsError) {
          console.error('Error adding documents to bid package:', itemsError);
          // Don't fail the whole operation, just log the error
        }
      }

      toast({
        title: "Success",
        description: "Bid package created successfully",
      });

      setOpen(false);
      onPackageCreated();
      resetForm();
    } catch (error) {
      console.error('Error creating bid package:', error);
      toast({
        title: "Error",
        description: "Failed to create bid package",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setEstimatedValue('');
    setEstimatedStartDate(undefined);
    setSelectedProject('');
    setStatus('Draft');
    setSelectedDocuments([]);
  };

  const getDocumentsByCategory = () => {
    const categories = ['Plans', 'Contracts', 'General'];
    return categories.map(category => ({
      category,
      documents: documents.filter(doc => doc.category === category)
    })).filter(group => group.documents.length > 0);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="w-4 h-4 mr-2" />
          Create Bid Package
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Package className="w-5 h-5" />
            Create New Bid Package
          </DialogTitle>
          <p className="text-sm text-gray-600">
            Create a bid package to send project documents to subcontractors for estimates
          </p>
        </DialogHeader>
        
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Package Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter package name"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="project">Project *</Label>
              <Select value={selectedProject} onValueChange={setSelectedProject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent>
                  {projects.map(project => (
                    <SelectItem key={project.id} value={project.id}>
                      {project.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Scope of Work</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Describe the work scope for this bid package..."
              rows={3}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="estimatedValue">Estimated Budget</Label>
              <Input
                id="estimatedValue"
                type="number"
                value={estimatedValue}
                onChange={(e) => setEstimatedValue(e.target.value)}
                placeholder="0.00"
                step="0.01"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="estimatedStartDate">Estimated Project Start Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {estimatedStartDate ? format(estimatedStartDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={estimatedStartDate}
                    onSelect={setEstimatedStartDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Draft">Draft</SelectItem>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Closed">Closed</SelectItem>
                  <SelectItem value="Cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Document Selection */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              <Label className="text-base font-medium">Include Documents</Label>
            </div>
            <p className="text-sm text-gray-600">
              Select project plans, agreements, and other documents to include in this bid package
            </p>
            
            {documents.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No documents available</p>
                <p className="text-xs">Upload documents to include them in bid packages</p>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto border rounded-lg p-4 space-y-4">
                {getDocumentsByCategory().map(({ category, documents: categoryDocs }) => (
                  <div key={category} className="space-y-2">
                    <h4 className="font-medium text-sm text-gray-700 border-b pb-1">
                      {category}
                    </h4>
                    <div className="grid grid-cols-1 gap-2">
                      {categoryDocs.map((doc) => (
                        <div key={doc.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={`doc-${doc.id}`}
                            checked={selectedDocuments.includes(doc.id)}
                            onCheckedChange={() => handleDocumentToggle(doc.id)}
                          />
                          <Label 
                            htmlFor={`doc-${doc.id}`}
                            className="text-sm cursor-pointer flex-1"
                          >
                            {doc.name}
                          </Label>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            {selectedDocuments.length > 0 && (
              <div className="text-sm text-blue-600">
                {selectedDocuments.length} document{selectedDocuments.length !== 1 ? 's' : ''} selected
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              {loading ? 'Creating...' : 'Create Bid Package'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
