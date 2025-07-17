
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  Clock, 
  Users, 
  Plus, 
  Search, 
  FileText,
  Video,
  MapPin,
  Bell,
  Download,
  Edit,
  Trash2,
  CheckSquare,
  Send
} from 'lucide-react';
import { toast } from 'sonner';

interface MeetingAttendee {
  id: string;
  name: string;
  email: string;
  role: string;
  status: 'Pending' | 'Accepted' | 'Declined';
}

interface ActionItem {
  id: string;
  description: string;
  assignedTo: string;
  dueDate: Date;
  status: 'Open' | 'In Progress' | 'Completed';
}

interface Meeting {
  id: string;
  title: string;
  description: string;
  date: Date;
  startTime: string;
  endTime: string;
  location: string;
  type: 'In-Person' | 'Virtual' | 'Hybrid';
  meetingLink?: string;
  organizer: string;
  attendees: MeetingAttendee[];
  agenda: string[];
  notes: string;
  actionItems: ActionItem[];
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
  category: 'Project Review' | 'Safety Meeting' | 'Progress Update' | 'Client Meeting' | 'Team Meeting' | 'Other';
}

interface MeetingManagerProps {
  projectId?: string;
}

export function MeetingManager({ projectId }: MeetingManagerProps) {
  const [meetings, setMeetings] = useState<Meeting[]>([
    {
      id: '1',
      title: 'Weekly Project Review',
      description: 'Review project progress and discuss upcoming milestones',
      date: new Date('2024-01-22'),
      startTime: '09:00',
      endTime: '10:00',
      location: 'Conference Room A',
      type: 'In-Person',
      organizer: 'John Smith',
      attendees: [
        { id: '1', name: 'John Smith', email: 'john@company.com', role: 'Project Manager', status: 'Accepted' },
        { id: '2', name: 'Sarah Wilson', email: 'sarah@company.com', role: 'Superintendent', status: 'Accepted' },
        { id: '3', name: 'Mike Johnson', email: 'mike@company.com', role: 'Foreman', status: 'Pending' },
      ],
      agenda: ['Project Status Update', 'Safety Review', 'Upcoming Milestones', 'Resource Requirements'],
      notes: 'Project is on schedule. Electrical work to begin next week.',
      actionItems: [
        { id: '1', description: 'Order electrical materials', assignedTo: 'Sarah Wilson', dueDate: new Date('2024-01-25'), status: 'Open' },
        { id: '2', description: 'Schedule electrical inspection', assignedTo: 'Mike Johnson', dueDate: new Date('2024-01-30'), status: 'Open' },
      ],
      status: 'Completed',
      category: 'Project Review',
    },
  ]);

  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [newMeeting, setNewMeeting] = useState<Partial<Meeting>>({
    type: 'In-Person',
    status: 'Scheduled',
    category: 'Project Review',
    attendees: [],
    agenda: [],
    actionItems: [],
  });

  const meetingTypes = ['In-Person', 'Virtual', 'Hybrid'];
  const meetingCategories = ['Project Review', 'Safety Meeting', 'Progress Update', 'Client Meeting', 'Team Meeting', 'Other'];
  const meetingStatuses = ['Scheduled', 'In Progress', 'Completed', 'Cancelled'];

  const filteredMeetings = meetings.filter(meeting => {
    const matchesSearch = searchTerm === '' || 
      meeting.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      meeting.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || meeting.status === filterStatus;
    
    return matchesSearch && matchesStatus;
  });

  const handleCreateMeeting = () => {
    if (!newMeeting.title || !newMeeting.date || !newMeeting.startTime || !newMeeting.endTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    const meeting: Meeting = {
      id: Date.now().toString(),
      title: newMeeting.title!,
      description: newMeeting.description || '',
      date: newMeeting.date!,
      startTime: newMeeting.startTime!,
      endTime: newMeeting.endTime!,
      location: newMeeting.location || '',
      type: newMeeting.type as Meeting['type'],
      meetingLink: newMeeting.meetingLink,
      organizer: 'Current User',
      attendees: newMeeting.attendees || [],
      agenda: newMeeting.agenda || [],
      notes: '',
      actionItems: [],
      status: 'Scheduled',
      category: newMeeting.category as Meeting['category'],
    };

    setMeetings(prev => [...prev, meeting]);
    setNewMeeting({
      type: 'In-Person',
      status: 'Scheduled',
      category: 'Project Review',
      attendees: [],
      agenda: [],
      actionItems: [],
    });
    setCreateDialogOpen(false);
    toast.success('Meeting created successfully');
  };

  const addAgendaItem = () => {
    const item = prompt('Enter agenda item:');
    if (item) {
      setNewMeeting(prev => ({
        ...prev,
        agenda: [...(prev.agenda || []), item]
      }));
    }
  };

  const addAttendee = () => {
    const name = prompt('Enter attendee name:');
    const email = prompt('Enter attendee email:');
    if (name && email) {
      const attendee: MeetingAttendee = {
        id: Date.now().toString(),
        name,
        email,
        role: 'Team Member',
        status: 'Pending'
      };
      setNewMeeting(prev => ({
        ...prev,
        attendees: [...(prev.attendees || []), attendee]
      }));
    }
  };

  const updateMeetingNotes = (meetingId: string, notes: string) => {
    setMeetings(prev => prev.map(meeting => 
      meeting.id === meetingId ? { ...meeting, notes } : meeting
    ));
    toast.success('Notes updated successfully');
  };

  const addActionItem = (meetingId: string) => {
    const description = prompt('Enter action item description:');
    const assignedTo = prompt('Assign to:');
    const dueDateStr = prompt('Due date (YYYY-MM-DD):');
    
    if (description && assignedTo && dueDateStr) {
      const actionItem: ActionItem = {
        id: Date.now().toString(),
        description,
        assignedTo,
        dueDate: new Date(dueDateStr),
        status: 'Open'
      };
      
      setMeetings(prev => prev.map(meeting => 
        meeting.id === meetingId 
          ? { ...meeting, actionItems: [...meeting.actionItems, actionItem] }
          : meeting
      ));
      toast.success('Action item added successfully');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Scheduled': return 'bg-blue-100 text-blue-800';
      case 'In Progress': return 'bg-yellow-100 text-yellow-800';
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Meeting Management
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export
              </Button>
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Schedule Meeting
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Schedule New Meeting</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="title">Meeting Title *</Label>
                        <Input
                          id="title"
                          value={newMeeting.title || ''}
                          onChange={(e) => setNewMeeting(prev => ({ ...prev, title: e.target.value }))}
                          placeholder="Enter meeting title"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="category">Category</Label>
                        <Select
                          value={newMeeting.category || 'Project Review'}
                          onValueChange={(value) => setNewMeeting(prev => ({ ...prev, category: value as Meeting['category'] }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {meetingCategories.map(category => (
                              <SelectItem key={category} value={category}>{category}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={newMeeting.description || ''}
                        onChange={(e) => setNewMeeting(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Meeting description or purpose"
                        rows={3}
                      />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="date">Date *</Label>
                        <Input
                          id="date"
                          type="date"
                          value={newMeeting.date?.toISOString().split('T')[0] || ''}
                          onChange={(e) => setNewMeeting(prev => ({ ...prev, date: new Date(e.target.value) }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="startTime">Start Time *</Label>
                        <Input
                          id="startTime"
                          type="time"
                          value={newMeeting.startTime || ''}
                          onChange={(e) => setNewMeeting(prev => ({ ...prev, startTime: e.target.value }))}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="endTime">End Time *</Label>
                        <Input
                          id="endTime"
                          type="time"
                          value={newMeeting.endTime || ''}
                          onChange={(e) => setNewMeeting(prev => ({ ...prev, endTime: e.target.value }))}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="type">Meeting Type</Label>
                        <Select
                          value={newMeeting.type || 'In-Person'}
                          onValueChange={(value) => setNewMeeting(prev => ({ ...prev, type: value as Meeting['type'] }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {meetingTypes.map(type => (
                              <SelectItem key={type} value={type}>{type}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="location">Location</Label>
                        <Input
                          id="location"
                          value={newMeeting.location || ''}
                          onChange={(e) => setNewMeeting(prev => ({ ...prev, location: e.target.value }))}
                          placeholder="Meeting location or room"
                        />
                      </div>
                    </div>

                    {(newMeeting.type === 'Virtual' || newMeeting.type === 'Hybrid') && (
                      <div className="space-y-2">
                        <Label htmlFor="meetingLink">Meeting Link</Label>
                        <Input
                          id="meetingLink"
                          value={newMeeting.meetingLink || ''}
                          onChange={(e) => setNewMeeting(prev => ({ ...prev, meetingLink: e.target.value }))}
                          placeholder="Zoom, Teams, or other meeting link"
                        />
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Agenda Items</Label>
                        <Button type="button" variant="outline" size="sm" onClick={addAgendaItem}>
                          <Plus className="w-4 h-4 mr-1" />
                          Add Item
                        </Button>
                      </div>
                      <div className="space-y-1">
                        {newMeeting.agenda?.map((item, index) => (
                          <div key={index} className="p-2 bg-gray-50 rounded text-sm">
                            {index + 1}. {item}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <Label>Attendees</Label>
                        <Button type="button" variant="outline" size="sm" onClick={addAttendee}>
                          <Plus className="w-4 h-4 mr-1" />
                          Add Attendee
                        </Button>
                      </div>
                      <div className="space-y-1">
                        {newMeeting.attendees?.map((attendee) => (
                          <div key={attendee.id} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                            <span>{attendee.name} ({attendee.email})</span>
                            <Badge variant="secondary">{attendee.status}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                    <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateMeeting}>
                      Schedule Meeting
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* Filters */}
          <div className="flex flex-wrap items-center gap-4 mb-6">
            <div className="flex items-center gap-2">
              <Search className="w-4 h-4" />
              <Input
                placeholder="Search meetings..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {meetingStatuses.map(status => (
                  <SelectItem key={status} value={status}>{status}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Meetings List */}
          <div className="space-y-4">
            {filteredMeetings.map((meeting) => (
              <Card key={meeting.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold text-lg">{meeting.title}</h3>
                          <p className="text-gray-600">{meeting.description}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge className={getStatusColor(meeting.status)}>
                            {meeting.status}
                          </Badge>
                          <Badge variant="outline">{meeting.category}</Badge>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {meeting.date.toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className="w-4 h-4" />
                          {meeting.startTime} - {meeting.endTime}
                        </div>
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {meeting.location || 'Virtual'}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {meeting.attendees.length} attendees
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 pt-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => {
                            setSelectedMeeting(meeting);
                            setViewDialogOpen(true);
                          }}
                        >
                          <FileText className="w-4 h-4 mr-1" />
                          View Details
                        </Button>
                        {meeting.type !== 'In-Person' && meeting.meetingLink && (
                          <Button variant="outline" size="sm">
                            <Video className="w-4 h-4 mr-1" />
                            Join Meeting
                          </Button>
                        )}
                        <Button variant="outline" size="sm">
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm">
                          <Send className="w-4 h-4 mr-1" />
                          Send Invite
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {filteredMeetings.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No meetings found matching your criteria.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Meeting Details Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedMeeting?.title}</DialogTitle>
          </DialogHeader>
          {selectedMeeting && (
            <Tabs defaultValue="details" className="space-y-4">
              <TabsList>
                <TabsTrigger value="details">Details</TabsTrigger>
                <TabsTrigger value="notes">Notes</TabsTrigger>
                <TabsTrigger value="actions">Action Items</TabsTrigger>
              </TabsList>

              <TabsContent value="details" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="font-semibold mb-2">Meeting Information</h4>
                    <div className="space-y-2 text-sm">
                      <div><strong>Date:</strong> {selectedMeeting.date.toLocaleDateString()}</div>
                      <div><strong>Time:</strong> {selectedMeeting.startTime} - {selectedMeeting.endTime}</div>
                      <div><strong>Location:</strong> {selectedMeeting.location}</div>
                      <div><strong>Type:</strong> {selectedMeeting.type}</div>
                      <div><strong>Organizer:</strong> {selectedMeeting.organizer}</div>
                    </div>
                  </div>
                  <div>
                    <h4 className="font-semibold mb-2">Attendees ({selectedMeeting.attendees.length})</h4>
                    <div className="space-y-1">
                      {selectedMeeting.attendees.map((attendee) => (
                        <div key={attendee.id} className="flex items-center justify-between text-sm">
                          <span>{attendee.name}</span>
                          <Badge variant="secondary" className="text-xs">{attendee.status}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold mb-2">Agenda</h4>
                  <div className="space-y-1">
                    {selectedMeeting.agenda.map((item, index) => (
                      <div key={index} className="text-sm p-2 bg-gray-50 rounded">
                        {index + 1}. {item}
                      </div>
                    ))}
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="notes" className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="meetingNotes">Meeting Notes</Label>
                  <Textarea
                    id="meetingNotes"
                    value={selectedMeeting.notes}
                    onChange={(e) => updateMeetingNotes(selectedMeeting.id, e.target.value)}
                    placeholder="Add meeting notes, decisions, and key discussion points..."
                    rows={10}
                  />
                </div>
                <Button onClick={() => toast.success('Notes saved successfully')}>
                  Save Notes
                </Button>
              </TabsContent>

              <TabsContent value="actions" className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-semibold">Action Items</h4>
                  <Button 
                    size="sm" 
                    onClick={() => addActionItem(selectedMeeting.id)}
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Add Action Item
                  </Button>
                </div>
                <div className="space-y-3">
                  {selectedMeeting.actionItems.map((item) => (
                    <div key={item.id} className="p-3 border rounded-lg">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <p className="font-medium">{item.description}</p>
                          <div className="text-sm text-gray-600 mt-1">
                            <span>Assigned to: {item.assignedTo}</span>
                            <span className="ml-4">Due: {item.dueDate.toLocaleDateString()}</span>
                          </div>
                        </div>
                        <Badge 
                          variant={item.status === 'Completed' ? 'default' : 'secondary'}
                          className={item.status === 'Completed' ? 'bg-green-100 text-green-800' : ''}
                        >
                          {item.status}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
