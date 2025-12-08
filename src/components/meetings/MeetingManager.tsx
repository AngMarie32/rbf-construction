
import { useState, useEffect } from 'react';
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
  Edit,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Download,
  User,
  Building
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface Meeting {
  id: string;
  title: string;
  description: string;
  date: Date;
  startTime: string;
  endTime: string;
  location: string;
  attendees: string[];
  meetingType: 'In-Person' | 'Video Call' | 'Phone Call';
  status: 'Scheduled' | 'In Progress' | 'Completed' | 'Cancelled';
  notes: string;
  actionItems: ActionItem[];
  projectId: string;
}

interface ActionItem {
  id: string;
  description: string;
  assignee: string;
  dueDate: Date;
  status: 'Open' | 'In Progress' | 'Completed';
}

interface MeetingManagerProps {
  projectId?: string;
}

interface Project {
  id: string;
  name: string;
}

export function MeetingManager({ projectId }: MeetingManagerProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState(projectId || '');
  const [meetings, setMeetings] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);
  const [newMeeting, setNewMeeting] = useState<Partial<Meeting>>({
    meetingType: 'In-Person',
    status: 'Scheduled',
    attendees: [],
    actionItems: [],
    projectId: selectedProjectId,
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      setNewMeeting(prev => ({ ...prev, projectId: selectedProjectId }));
    }
  }, [selectedProjectId]);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name');

      if (error) throw error;
      
      const projectsData = data || [];
      setProjects(projectsData);
      
      // Auto-select first project if none selected
      if (!selectedProjectId && projectsData.length > 0) {
        setSelectedProjectId(projectsData[0].id);
      }
    } catch (error) {
      console.error('Error fetching projects:', error);
      toast.error('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const meetingTypes = ['In-Person', 'Video Call', 'Phone Call'];
  const statuses = ['Scheduled', 'In Progress', 'Completed', 'Cancelled'];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'In Progress': return 'bg-blue-100 text-blue-800';
      case 'Scheduled': return 'bg-yellow-100 text-yellow-800';
      case 'Cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'In Progress':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'Scheduled':
        return <Calendar className="w-4 h-4 text-yellow-600" />;
      case 'Cancelled':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return <Calendar className="w-4 h-4" />;
    }
  };

  // Filter meetings by selected project
  const projectFilteredMeetings = meetings.filter(meeting => meeting.projectId === selectedProjectId);

  const filteredMeetings = projectFilteredMeetings.filter(meeting => {
    const matchesStatus = filterStatus === 'all' || meeting.status === filterStatus;
    const matchesSearch = searchTerm === '' || 
      meeting.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      meeting.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesSearch;
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
      attendees: newMeeting.attendees || [],
      meetingType: newMeeting.meetingType as Meeting['meetingType'],
      status: 'Scheduled',
      notes: '',
      actionItems: [],
      projectId: selectedProjectId,
    };

    setMeetings(prev => [...prev, meeting]);
    setNewMeeting({
      meetingType: 'In-Person',
      status: 'Scheduled',
      attendees: [],
      actionItems: [],
      projectId: selectedProjectId,
    });
    setCreateDialogOpen(false);
    toast.success('Meeting created successfully');
  };

  const handleEditMeeting = () => {
    if (!editingMeeting || !editingMeeting.title || !editingMeeting.date || !editingMeeting.startTime || !editingMeeting.endTime) {
      toast.error('Please fill in all required fields');
      return;
    }

    setMeetings(prev => prev.map(meeting => 
      meeting.id === editingMeeting.id ? editingMeeting : meeting
    ));
    setEditDialogOpen(false);
    setEditingMeeting(null);
    toast.success('Meeting updated successfully');
  };

  const handleDeleteMeeting = (id: string) => {
    setMeetings(prev => prev.filter(meeting => meeting.id !== id));
    toast.success('Meeting deleted successfully');
  };

  const openEditDialog = (meeting: Meeting) => {
    setEditingMeeting({ ...meeting });
    setEditDialogOpen(true);
  };

  const getStats = () => {
    const total = projectFilteredMeetings.length;
    const scheduled = projectFilteredMeetings.filter(m => m.status === 'Scheduled').length;
    const completed = projectFilteredMeetings.filter(m => m.status === 'Completed').length;
    const inProgress = projectFilteredMeetings.filter(m => m.status === 'In Progress').length;
    
    return { total, scheduled, completed, inProgress };
  };

  const stats = getStats();
  const selectedProject = projects.find(p => p.id === selectedProjectId);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Project Selection */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Building className="w-5 h-5 text-gray-600" />
            <div className="flex-1">
              <Label htmlFor="project-select">Select Project</Label>
              <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Choose a project" />
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
        </CardContent>
      </Card>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Meetings</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.scheduled}</div>
            <div className="text-sm text-gray-600">Scheduled</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.inProgress}</div>
            <div className="text-sm text-gray-600">In Progress</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Meetings for {selectedProject?.name}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export Schedule
              </Button>
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Schedule Meeting
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Schedule New Meeting</DialogTitle>
                  </DialogHeader>
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
                      <Label htmlFor="meetingType">Meeting Type</Label>
                      <Select
                        value={newMeeting.meetingType || 'In-Person'}
                        onValueChange={(value) => setNewMeeting(prev => ({ ...prev, meetingType: value as Meeting['meetingType'] }))}
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
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="description">Description</Label>
                      <Textarea
                        id="description"
                        value={newMeeting.description || ''}
                        onChange={(e) => setNewMeeting(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Meeting agenda or description"
                        rows={3}
                      />
                    </div>
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
                      <Label htmlFor="location">Location</Label>
                      <Input
                        id="location"
                        value={newMeeting.location || ''}
                        onChange={(e) => setNewMeeting(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="Meeting location"
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
                {statuses.map(status => (
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
                        <h3 className="font-semibold text-lg">{meeting.title}</h3>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{meeting.meetingType}</Badge>
                          <Badge className={getStatusColor(meeting.status)}>
                            {getStatusIcon(meeting.status)}
                            <span className="ml-1">{meeting.status}</span>
                          </Badge>
                        </div>
                      </div>
                      
                      {meeting.description && (
                        <p className="text-gray-700">{meeting.description}</p>
                      )}
                      
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
                          {meeting.location || 'TBD'}
                        </div>
                        <div className="flex items-center gap-1">
                          <Users className="w-4 h-4" />
                          {meeting.attendees.length} attendees
                        </div>
                      </div>
                      
                      {meeting.notes && (
                        <div className="bg-gray-50 p-3 rounded-md">
                          <h4 className="font-medium text-sm mb-1">Meeting Notes:</h4>
                          <p className="text-sm text-gray-700">{meeting.notes}</p>
                        </div>
                      )}
                      
                      {meeting.actionItems.length > 0 && (
                        <div className="bg-blue-50 p-3 rounded-md">
                          <h4 className="font-medium text-sm mb-2">Action Items:</h4>
                          <div className="space-y-1">
                            {meeting.actionItems.map((item) => (
                              <div key={item.id} className="flex items-center justify-between text-sm">
                                <span>{item.description}</span>
                                <div className="flex items-center gap-2">
                                  <Badge variant="outline" className="text-xs">
                                    {item.assignee}
                                  </Badge>
                                  <Badge 
                                    variant={item.status === 'Completed' ? 'default' : 'secondary'}
                                    className="text-xs"
                                  >
                                    {item.status}
                                  </Badge>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      <div className="flex items-center gap-2 pt-2">
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(meeting)}>
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm">
                          <FileText className="w-4 h-4 mr-1" />
                          Notes
                        </Button>
                        <Button variant="outline" size="sm">
                          <Users className="w-4 h-4 mr-1" />
                          Attendees
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleDeleteMeeting(meeting.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
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

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Meeting</DialogTitle>
          </DialogHeader>
          {editingMeeting && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Meeting Title *</Label>
                <Input
                  id="edit-title"
                  value={editingMeeting.title}
                  onChange={(e) => setEditingMeeting(prev => prev ? ({ ...prev, title: e.target.value }) : null)}
                  placeholder="Enter meeting title"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-meetingType">Meeting Type</Label>
                <Select
                  value={editingMeeting.meetingType}
                  onValueChange={(value) => setEditingMeeting(prev => prev ? ({ ...prev, meetingType: value as Meeting['meetingType'] }) : null)}
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
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="edit-description">Description</Label>
                <Textarea
                  id="edit-description"
                  value={editingMeeting.description}
                  onChange={(e) => setEditingMeeting(prev => prev ? ({ ...prev, description: e.target.value }) : null)}
                  placeholder="Meeting agenda or description"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-date">Date *</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={editingMeeting.date.toISOString().split('T')[0]}
                  onChange={(e) => setEditingMeeting(prev => prev ? ({ ...prev, date: new Date(e.target.value) }) : null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-location">Location</Label>
                <Input
                  id="edit-location"
                  value={editingMeeting.location}
                  onChange={(e) => setEditingMeeting(prev => prev ? ({ ...prev, location: e.target.value }) : null)}
                  placeholder="Meeting location"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-startTime">Start Time *</Label>
                <Input
                  id="edit-startTime"
                  type="time"
                  value={editingMeeting.startTime}
                  onChange={(e) => setEditingMeeting(prev => prev ? ({ ...prev, startTime: e.target.value }) : null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-endTime">End Time *</Label>
                <Input
                  id="edit-endTime"
                  type="time"
                  value={editingMeeting.endTime}
                  onChange={(e) => setEditingMeeting(prev => prev ? ({ ...prev, endTime: e.target.value }) : null)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-status">Status</Label>
                <Select
                  value={editingMeeting.status}
                  onValueChange={(value) => setEditingMeeting(prev => prev ? ({ ...prev, status: value as Meeting['status'] }) : null)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {statuses.map(status => (
                      <SelectItem key={status} value={status}>{status}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="edit-notes">Meeting Notes</Label>
                <Textarea
                  id="edit-notes"
                  value={editingMeeting.notes}
                  onChange={(e) => setEditingMeeting(prev => prev ? ({ ...prev, notes: e.target.value }) : null)}
                  placeholder="Add meeting notes..."
                  rows={4}
                />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditMeeting}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
