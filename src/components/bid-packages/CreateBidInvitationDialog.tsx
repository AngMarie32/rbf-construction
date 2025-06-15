
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { CalendarIcon, Send, FileText, Users, Mail } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Document {
  id: string;
  name: string;
  category: string;
  file_size: number;
}

interface Subcontractor {
  id: string;
  name: string;
  company: string;
  email: string;
  specialties: string[];
}

interface SubcontractorGroup {
  id: string;
  name: string;
  description: string;
}

interface BidPackage {
  id: string;
  name: string;
}

interface CreateBidInvitationDialogProps {
  bidPackageId?: string;
  onInvitationCreated: () => void;
}

export const CreateBidInvitationDialog: React.FC<CreateBidInvitationDialogProps> = ({ 
  bidPackageId, 
  onInvitationCreated 
}) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [message, setMessage] = useState('');
  const [dueDate, setDueDate] = useState<Date>();
  const [selectedBidPackage, setSelectedBidPackage] = useState(bidPackageId || '');
  const [selectedDocuments, setSelectedDocuments] = useState<string[]>([]);
  const [selectedSubcontractors, setSelectedSubcontractors] = useState<string[]>([]);
  const [selectedGroups, setSelectedGroups] = useState<string[]>([]);
  
  const [bidPackages, setBidPackages] = useState<BidPackage[]>([]);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [groups, setGroups] = useState<SubcontractorGroup[]>([]);
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchData();
    }
  }, [open]);

  const fetchData = async () => {
    try {
      const [bidPackagesRes, documentsRes, subcontractorsRes, groupsRes] = await Promise.all([
        supabase.from('bid_packages').select('id, name'),
        supabase.from('documents').select('id, name, category, file_size'),
        supabase.from('subcontractors').select('id, name, company, email, specialties'),
        supabase.from('subcontractor_groups').select('id, name, description')
      ]);

      if (bidPackagesRes.data) setBidPackages(bidPackagesRes.data);
      if (documentsRes.data) setDocuments(documentsRes.data);
      if (subcontractorsRes.data) setSubcontractors(subcontractorsRes.data);
      if (groupsRes.data) setGroups(groupsRes.data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast({
        title: "Error",
        description: "Failed to load data",
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

  const handleSubcontractorToggle = (subcontractorId: string) => {
    setSelectedSubcontractors(prev => 
      prev.includes(subcontractorId) 
        ? prev.filter(id => id !== subcontractorId)
        : [...prev, subcontractorId]
    );
  };

  const handleGroupToggle = (groupId: string) => {
    setSelectedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  const handleSubmit = async () => {
    if (!title || !selectedBidPackage || (!selectedSubcontractors.length && !selectedGroups.length)) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields and select recipients",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      // Create bid invitation
      const { data: invitation, error: invitationError } = await supabase
        .from('bid_invitations')
        .insert({
          bid_package_id: selectedBidPackage,
          title,
          message,
          due_date: dueDate?.toISOString().split('T')[0],
          status: 'Draft'
        })
        .select()
        .single();

      if (invitationError) throw invitationError;

      // Add selected documents
      if (selectedDocuments.length > 0) {
        const documentInserts = selectedDocuments.map(docId => ({
          bid_invitation_id: invitation.id,
          document_id: docId
        }));
        
        const { error: docsError } = await supabase
          .from('bid_invitation_documents')
          .insert(documentInserts);
        
        if (docsError) throw docsError;
      }

      // Get all subcontractors from selected groups
      let allSubcontractorIds = [...selectedSubcontractors];
      
      if (selectedGroups.length > 0) {
        const { data: groupMembers } = await supabase
          .from('subcontractor_group_members')
          .select('subcontractor_id')
          .in('group_id', selectedGroups);
        
        if (groupMembers) {
          const groupSubcontractorIds = groupMembers.map(m => m.subcontractor_id);
          allSubcontractorIds = [...new Set([...allSubcontractorIds, ...groupSubcontractorIds])];
        }
      }

      // Add recipients
      if (allSubcontractorIds.length > 0) {
        const recipientInserts = allSubcontractorIds.map(subId => ({
          bid_invitation_id: invitation.id,
          subcontractor_id: subId,
          status: 'Sent'
        }));
        
        const { error: recipientsError } = await supabase
          .from('bid_invitation_recipients')
          .insert(recipientInserts);
        
        if (recipientsError) throw recipientsError;
      }

      toast({
        title: "Success",
        description: `Bid invitation created and sent to ${allSubcontractorIds.length} subcontractors`,
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
    setSelectedDocuments([]);
    setSelectedSubcontractors([]);
    setSelectedGroups([]);
    if (!bidPackageId) setSelectedBidPackage('');
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Mail className="w-4 h-4 mr-2" />
          Create Bid Invitation
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Create Bid Invitation</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="title">Invitation Title *</Label>
              <Input
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Enter invitation title"
              />
            </div>

            <div>
              <Label htmlFor="bidPackage">Bid Package *</Label>
              <Select value={selectedBidPackage} onValueChange={setSelectedBidPackage}>
                <SelectTrigger>
                  <SelectValue placeholder="Select bid package" />
                </SelectTrigger>
                <SelectContent>
                  {bidPackages.map(pkg => (
                    <SelectItem key={pkg.id} value={pkg.id}>{pkg.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="dueDate">Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-full justify-start text-left font-normal">
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP") : "Select due date"}
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

            <div>
              <Label htmlFor="message">Message</Label>
              <Textarea
                id="message"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Enter invitation message..."
                rows={4}
              />
            </div>
          </div>

          {/* Tabs for Documents and Recipients */}
          <Tabs defaultValue="documents" className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="documents">
                <FileText className="w-4 h-4 mr-2" />
                Documents ({selectedDocuments.length})
              </TabsTrigger>
              <TabsTrigger value="recipients">
                <Users className="w-4 h-4 mr-2" />
                Recipients ({selectedSubcontractors.length + selectedGroups.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="documents" className="space-y-4">
              <div className="max-h-60 overflow-y-auto space-y-2">
                {documents.map(doc => (
                  <div key={doc.id} className="flex items-center space-x-2 p-2 border rounded">
                    <Checkbox
                      checked={selectedDocuments.includes(doc.id)}
                      onCheckedChange={() => handleDocumentToggle(doc.id)}
                    />
                    <div className="flex-1">
                      <div className="font-medium">{doc.name}</div>
                      <div className="text-sm text-gray-500">
                        {doc.category} • {(doc.file_size / 1024).toFixed(1)} KB
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="recipients" className="space-y-4">
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium mb-2">Subcontractor Groups</h4>
                  <div className="max-h-40 overflow-y-auto space-y-2">
                    {groups.map(group => (
                      <div key={group.id} className="flex items-center space-x-2 p-2 border rounded">
                        <Checkbox
                          checked={selectedGroups.includes(group.id)}
                          onCheckedChange={() => handleGroupToggle(group.id)}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{group.name}</div>
                          {group.description && (
                            <div className="text-sm text-gray-500">{group.description}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Individual Subcontractors</h4>
                  <div className="max-h-60 overflow-y-auto space-y-2">
                    {subcontractors.map(sub => (
                      <div key={sub.id} className="flex items-center space-x-2 p-2 border rounded">
                        <Checkbox
                          checked={selectedSubcontractors.includes(sub.id)}
                          onCheckedChange={() => handleSubcontractorToggle(sub.id)}
                        />
                        <div className="flex-1">
                          <div className="font-medium">{sub.name}</div>
                          <div className="text-sm text-gray-500">
                            {sub.company} • {sub.email}
                          </div>
                          {sub.specialties && (
                            <div className="flex gap-1 mt-1">
                              {sub.specialties.slice(0, 3).map(specialty => (
                                <Badge key={specialty} variant="secondary" className="text-xs">
                                  {specialty}
                                </Badge>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Actions */}
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={loading}>
              <Send className="w-4 h-4 mr-2" />
              {loading ? 'Creating...' : 'Create & Send Invitation'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
