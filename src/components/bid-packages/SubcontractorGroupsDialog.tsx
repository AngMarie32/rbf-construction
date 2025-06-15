
import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Users, Plus, Trash2, Edit } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface Subcontractor {
  id: string;
  name: string;
  company: string;
  specialties: string[];
}

interface SubcontractorGroup {
  id: string;
  name: string;
  description: string;
  created_at: string;
}

interface GroupMember {
  subcontractor_id: string;
  subcontractor: Subcontractor;
}

export const SubcontractorGroupsDialog: React.FC = () => {
  const [open, setOpen] = useState(false);
  const [groups, setGroups] = useState<SubcontractorGroup[]>([]);
  const [subcontractors, setSubcontractors] = useState<Subcontractor[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<SubcontractorGroup | null>(null);
  const [groupMembers, setGroupMembers] = useState<string[]>([]);
  const [isCreating, setIsCreating] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [loading, setLoading] = useState(false);

  const { toast } = useToast();

  useEffect(() => {
    if (open) {
      fetchGroups();
      fetchSubcontractors();
    }
  }, [open]);

  useEffect(() => {
    if (selectedGroup) {
      fetchGroupMembers(selectedGroup.id);
    }
  }, [selectedGroup]);

  const fetchGroups = async () => {
    try {
      const { data, error } = await supabase
        .from('subcontractor_groups')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setGroups(data || []);
    } catch (error) {
      console.error('Error fetching groups:', error);
      toast({
        title: "Error",
        description: "Failed to load subcontractor groups",
        variant: "destructive",
      });
    }
  };

  const fetchSubcontractors = async () => {
    try {
      const { data, error } = await supabase
        .from('subcontractors')
        .select('id, name, company, specialties')
        .order('name');
      
      if (error) throw error;
      setSubcontractors(data || []);
    } catch (error) {
      console.error('Error fetching subcontractors:', error);
    }
  };

  const fetchGroupMembers = async (groupId: string) => {
    try {
      const { data, error } = await supabase
        .from('subcontractor_group_members')
        .select('subcontractor_id')
        .eq('group_id', groupId);
      
      if (error) throw error;
      setGroupMembers(data?.map(m => m.subcontractor_id) || []);
    } catch (error) {
      console.error('Error fetching group members:', error);
    }
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      toast({
        title: "Error",
        description: "Group name is required",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('subcontractor_groups')
        .insert({
          name: groupName,
          description: groupDescription
        })
        .select()
        .single();

      if (error) throw error;

      // Add members to the group
      if (groupMembers.length > 0) {
        const memberInserts = groupMembers.map(subId => ({
          group_id: data.id,
          subcontractor_id: subId
        }));

        const { error: membersError } = await supabase
          .from('subcontractor_group_members')
          .insert(memberInserts);

        if (membersError) throw membersError;
      }

      toast({
        title: "Success",
        description: "Subcontractor group created successfully",
      });

      setIsCreating(false);
      setGroupName('');
      setGroupDescription('');
      setGroupMembers([]);
      fetchGroups();
    } catch (error) {
      console.error('Error creating group:', error);
      toast({
        title: "Error",
        description: "Failed to create subcontractor group",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateGroupMembers = async () => {
    if (!selectedGroup) return;

    setLoading(true);
    try {
      // Delete existing members
      await supabase
        .from('subcontractor_group_members')
        .delete()
        .eq('group_id', selectedGroup.id);

      // Insert new members
      if (groupMembers.length > 0) {
        const memberInserts = groupMembers.map(subId => ({
          group_id: selectedGroup.id,
          subcontractor_id: subId
        }));

        const { error } = await supabase
          .from('subcontractor_group_members')
          .insert(memberInserts);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Group members updated successfully",
      });
    } catch (error) {
      console.error('Error updating group members:', error);
      toast({
        title: "Error",
        description: "Failed to update group members",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async (groupId: string) => {
    try {
      const { error } = await supabase
        .from('subcontractor_groups')
        .delete()
        .eq('id', groupId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Group deleted successfully",
      });

      fetchGroups();
      if (selectedGroup?.id === groupId) {
        setSelectedGroup(null);
      }
    } catch (error) {
      console.error('Error deleting group:', error);
      toast({
        title: "Error",
        description: "Failed to delete group",
        variant: "destructive",
      });
    }
  };

  const handleMemberToggle = (subcontractorId: string) => {
    setGroupMembers(prev => 
      prev.includes(subcontractorId) 
        ? prev.filter(id => id !== subcontractorId)
        : [...prev, subcontractorId]
    );
  };

  const resetForm = () => {
    setIsCreating(false);
    setSelectedGroup(null);
    setGroupName('');
    setGroupDescription('');
    setGroupMembers([]);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <Users className="w-4 h-4 mr-2" />
          Manage Groups
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Subcontractor Groups</DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Groups List */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Groups</h3>
              <Button size="sm" onClick={() => setIsCreating(true)}>
                <Plus className="w-4 h-4 mr-2" />
                New Group
              </Button>
            </div>
            
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {groups.map(group => (
                <div 
                  key={group.id} 
                  className={`p-3 border rounded cursor-pointer ${
                    selectedGroup?.id === group.id ? 'border-blue-500 bg-blue-50' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedGroup(group)}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium">{group.name}</div>
                      {group.description && (
                        <div className="text-sm text-gray-500">{group.description}</div>
                      )}
                    </div>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteGroup(group.id);
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Group Form/Members */}
          <div className="space-y-4">
            {isCreating ? (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Create New Group</h3>
                <div>
                  <Label htmlFor="groupName">Group Name *</Label>
                  <Input
                    id="groupName"
                    value={groupName}
                    onChange={(e) => setGroupName(e.target.value)}
                    placeholder="Enter group name"
                  />
                </div>
                <div>
                  <Label htmlFor="groupDescription">Description</Label>
                  <Textarea
                    id="groupDescription"
                    value={groupDescription}
                    onChange={(e) => setGroupDescription(e.target.value)}
                    placeholder="Enter group description"
                    rows={3}
                  />
                </div>
              </div>
            ) : selectedGroup ? (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-lg font-medium">Edit: {selectedGroup.name}</h3>
                  <Button size="sm" onClick={handleUpdateGroupMembers} disabled={loading}>
                    Save Changes
                  </Button>
                </div>
              </div>
            ) : (
              <div className="text-gray-500 text-center py-8">
                Select a group to edit members or create a new group
              </div>
            )}

            {(isCreating || selectedGroup) && (
              <div className="space-y-4">
                <h4 className="font-medium">Select Members</h4>
                <div className="max-h-60 overflow-y-auto space-y-2">
                  {subcontractors.map(sub => (
                    <div key={sub.id} className="flex items-center space-x-2 p-2 border rounded">
                      <Checkbox
                        checked={groupMembers.includes(sub.id)}
                        onCheckedChange={() => handleMemberToggle(sub.id)}
                      />
                      <div className="flex-1">
                        <div className="font-medium">{sub.name}</div>
                        <div className="text-sm text-gray-500">{sub.company}</div>
                        {sub.specialties && (
                          <div className="flex gap-1 mt-1">
                            {sub.specialties.slice(0, 2).map(specialty => (
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
            )}

            {isCreating && (
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={resetForm}>
                  Cancel
                </Button>
                <Button onClick={handleCreateGroup} disabled={loading}>
                  {loading ? 'Creating...' : 'Create Group'}
                </Button>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};
