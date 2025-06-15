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
import { CalendarIcon, Mail, Package, Users, FileText } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BidPackage {
  id: string;
  name: string;
}

interface Subcontractor {
  id: string;
  name: string;
  email: string;
  company: string;
}

interface Document {
  id: string;
  name: string;
}

interface CreateBidInvitationDialogProps {
  bidPackageId?: string;
  onInvitationCreated: () => void;
}

export const CreateBidInvitationDialog: React.FC<CreateBidInvitationDialogProps> = ({ bidPackageId, onInvitationCreated }) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [dueDate, setDueDate] = useState<Date>();
  const [selectedBidPackage, setSelectedBidPackage] = useState('');
  const [selectedSubcontractors, setSelectedSubcontractors] = useState<string[]>([]);
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);

  const [bidPackages, setBidPackages] = useState<BidPackage[]>([]);
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchBidPackages();
      fetchSubcontractors();
    }
  }, [open]);

  useEffect(() => {
    if (selectedBidPackage || bidPackageId) {
      fetchDocuments();
    } else {
      setDocuments([]);
      setSelectedDocuments([]);
    }
  }, [selectedBidPackage, bidPackageId]);

  const fetchBidPackages = async () => {
    try {
      const { data, error } = await supabase
        .from('bid_packages')
        .select('id, name')
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      setBidPackages(data || []);
    } catch (error) {
      console.error('Error fetching bid packages:', error);
      toast({
        title: "Error",
        description: "Failed to load bid packages",
        variant: "destructive",
      });
    }
  };

  const fetchSubcontractors = async () => {
    try {
      const { data, error } = await supabase
        .from('subcontractors')
        .select('id, name, email, company')
        .order('name');
      
      if (error) throw error;
      setSubcontractors(data || []);
    } catch (error) {
      console.error('Error fetching subcontractors:', error);
      toast({
        title: "Error",
        description: "Failed to load subcontractors",
        variant: "destructive",
      });
    }
  };

  const fetchDocuments = async () => {
    try {
      const packageId = bidPackageId || selectedBidPackage;
      const { data, error } = await supabase
        .from('bid_package_items')
        .select('document_id, documents(id, name)')
        .eq('bid_package_id', packageId)
        .not('document_id', 'is', null);
  
      if (error) throw error;
  
      // Extract document details from the nested structure
      const extractedDocuments = data
        .map(item => item.documents)
        .filter(doc => doc !== null) // Filter out any null documents
        .map(({ id, name }) => ({ id, name })); // Map to the desired format
  
      setDocuments(extractedDocuments);
    } catch (error) {
      console.error('Error fetching documents:', error);
      toast({
        title: "Error",
        description: "Failed to load documents",
        variant: "destructive",
      });
    }
  };

  const sendEmailInvitations = async (invitationId: string, recipients: any[]) => {
    try {
      const { data, error } = await supabase.functions.invoke('send-bid-invitation', {
        body: { invitationId, recipients }
      });

      if (error) throw error;

      toast({
        title: "Emails Sent",
        description: `Bid invitations sent to ${recipients.length} subcontractor${recipients.length !== 1 ? 's' : ''}`,
      });
    } catch (error) {
      console.error('Error sending emails:', error);
      toast({
        title: "Email Error",
        description: "Invitations were created but emails failed to send. You may need to send them manually.",
        variant: "destructive",
      });
    }
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) {
      e.preventDefault();
    }

    if (!title || (!bidPackageId && !selectedBidPackage) || selectedSubcontractors.length === 0) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields and select at least one subcontractor",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const packageId = bidPackageId || selectedBidPackage;
      
      // Create the bid invitation
      const { data: invitationData, error: invitationError } = await supabase
        .from('bid_invitations')
        .insert({
          title,
          message,
          due_date: dueDate?.toISOString().split('T')[0],
          bid_package_id: packageId,
          status: 'Sent'
        })
        .select()
        .single();

      if (invitationError) throw invitationError;

      // Add selected documents to the invitation
      if (selectedDocuments.length > 0) {
        const documentEntries = selectedDocuments.map(docId => ({
          bid_invitation_id: invitationData.id,
          document_id: docId
        }));

        const { error: docsError } = await supabase
          .from('bid_invitation_documents')
          .insert(documentEntries);

        if (docsError) {
          console.error('Error adding documents:', docsError);
        }
      }

      // Create recipient records
      const recipientEntries = selectedSubcontractors.map(subId => {
        const sub = subcontractors.find(s => s.id === subId);
        return {
          bid_invitation_id: invitationData.id,
          subcontractor_id: subId,
          status: 'Sent'
        };
      });

      const { data: recipients, error: recipientsError } = await supabase
        .from('bid_invitation_recipients')
        .insert(recipientEntries)
        .select(`
          *,
          subcontractor:subcontractors(name, email, company)
        `);

      if (recipientsError) throw recipientsError;

      // Send email invitations
      if (recipients && recipients.length > 0) {
        const emailRecipients = recipients.map(r => ({
          id: r.id,
          name: r.subcontractor.name,
          email: r.subcontractor.email,
          company: r.subcontractor.company
        }));
        
        await sendEmailInvitations(invitationData.id, emailRecipients);
      }

      toast({
        title: "Success",
        description: "Bid invitation created and sent successfully",
      });

      setOpen(false);
      onInvitationCreated();
      resetForm();
    } catch (error) {
      console.error('Error creating bid invitation:', error);
      toast({
        title: "Error",
        description: "Failed to create bid invitation",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setTitle('');
    setMessage('');
    setDueDate(undefined);
    setSelectedBidPackage('');
    setSelectedSubcontractors([]);
    setSelectedDocuments([]);
  };

  const handleSubcontractorToggle = (subcontractorId: string) => {
    setSelectedSubcontractors(prev =>
      prev.includes(subcontractorId)
        ? prev.filter(id => id !== subcontractorId)
        : [...prev, subcontractorId]
    );
  };

  const handleDocumentToggle = (documentId: string) => {
    setSelectedDocuments(prev =>
      prev.includes(documentId)
        ? prev.filter(id => id !== documentId)
        : [...prev, documentId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Mail className="w-4 h-4 mr-2" />
          {bidPackageId ? 'Invite Subcontractors' : 'Create Bid Invitation'}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Mail className="w-5 h-5" />
            {bidPackageId ? 'Invite Subcontractors' : 'Create New Bid Invitation'}
          </DialogTitle>
          <p className="text-sm text-gray-600">
            {bidPackageId
              ? 'Invite subcontractors to bid on this package'
              : 'Create a bid invitation to send to subcontractors'}
          </p>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="title">Invitation Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter invitation title"
                required
              />
            </div>

            {!bidPackageId && (
              <div className="space-y-2">
                <Label htmlFor="bidPackage">Bid Package *</Label>
                <Select value={selectedBidPackage} onValueChange={setSelectedBidPackage} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Select bid package" />
                  </SelectTrigger>
                  <SelectContent>
                    {bidPackages.map(pkg => (
                      <SelectItem key={pkg.id} value={pkg.id}>
                        {pkg.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Write a personalized message to the subcontractors..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="dueDate">Due Date</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={
                    "w-full justify-start text-left font-normal" +
                    (dueDate ? " pl-3.5" : "")
                  }
                >
                  <CalendarIcon className="mr-2 h-4 w-4 opacity-50" />
                  {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={dueDate}
                  onSelect={setDueDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Subcontractor Selection */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4" />
              <Label className="text-base font-medium">Select Subcontractors *</Label>
            </div>
            <p className="text-sm text-gray-600">
              Choose the subcontractors you want to invite for this bid.
            </p>

            {subcontractors.length === 0 ? (
              <div className="text-center py-8 text-gray-500 border-2 border-dashed border-gray-200 rounded-lg">
                <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p className="font-medium">No subcontractors found</p>
                <p className="text-sm">Add subcontractors to your list first</p>
              </div>
            ) : (
              <div className="max-h-64 overflow-y-auto border rounded-lg p-4 space-y-4">
                {subcontractors.map(subcontractor => (
                  <div key={subcontractor.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={`sub-${subcontractor.id}`}
                      checked={selectedSubcontractors.includes(subcontractor.id)}
                      onCheckedChange={() => handleSubcontractorToggle(subcontractor.id)}
                    />
                    <Label
                      htmlFor={`sub-${subcontractor.id}`}
                      className="text-sm cursor-pointer flex-1"
                    >
                      {subcontractor.name} ({subcontractor.company})
                    </Label>
                  </div>
                ))}
              </div>
            )}

            {selectedSubcontractors.length > 0 && (
              <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                ✓ {selectedSubcontractors.length} subcontractor{selectedSubcontractors.length !== 1 ? 's' : ''} selected
              </div>
            )}
          </div>

          {/* Document Selection */}
          {documents.length > 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4" />
                <Label className="text-base font-medium">Include Documents</Label>
              </div>
              <p className="text-sm text-gray-600">
                Select documents to include in this bid invitation
              </p>

              <div className="max-h-64 overflow-y-auto border rounded-lg p-4 space-y-4">
                {documents.map(doc => (
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

              {selectedDocuments.length > 0 && (
                <div className="text-sm text-blue-600 bg-blue-50 p-2 rounded">
                  ✓ {selectedDocuments.length} document{selectedDocuments.length !== 1 ? 's' : ''} selected
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end space-x-2 pt-4 border-t">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? 'Creating...' : 'Create Invitation'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
