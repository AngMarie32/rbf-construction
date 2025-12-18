
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
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Plus, 
  Search, 
  Filter,
  Camera,
  MapPin,
  User,
  Calendar,
  Download,
  FileText,
  Edit,
  Trash2,
  Building
} from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface PunchListItem {
  id: string;
  title: string;
  description: string;
  location: string;
  trade: string;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  status: 'Open' | 'In Progress' | 'Completed' | 'Verified';
  assignedTo: string;
  dateCreated: Date;
  dateDue: Date;
  dateCompleted?: Date;
  photos: string[];
  notes: string[];
  category: string;
  projectId: string;
}

interface PunchListManagerProps {
  projectId?: string;
}

interface Project {
  id: string;
  name: string;
}

export function PunchListManager({ projectId }: PunchListManagerProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState(projectId || '');
  const [punchItems, setPunchItems] = useState<PunchListItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PunchListItem | null>(null);
  const [newItem, setNewItem] = useState<Partial<PunchListItem>>({
    priority: 'Medium',
    status: 'Open',
    dateCreated: new Date(),
    dateDue: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    projectId: selectedProjectId,
  });

  useEffect(() => {
    fetchProjects();
  }, []);

  useEffect(() => {
    if (selectedProjectId) {
      setNewItem(prev => ({ ...prev, projectId: selectedProjectId }));
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

  const priorities = ['Low', 'Medium', 'High', 'Critical'];
  const statuses = ['Open', 'In Progress', 'Completed', 'Verified'];
  const trades = ['General', 'Electrical', 'Plumbing', 'HVAC', 'Painting', 'Flooring', 'Drywall', 'Tile'];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'bg-red-100 text-red-800';
      case 'High': return 'bg-orange-100 text-orange-800';
      case 'Medium': return 'bg-yellow-100 text-yellow-800';
      case 'Low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Completed': return 'bg-green-100 text-green-800';
      case 'Verified': return 'bg-blue-100 text-blue-800';
      case 'In Progress': return 'bg-yellow-100 text-yellow-800';
      case 'Open': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Completed':
      case 'Verified':
        return <CheckCircle2 className="w-4 h-4 text-green-600" />;
      case 'In Progress':
        return <Clock className="w-4 h-4 text-yellow-600" />;
      case 'Open':
        return <AlertTriangle className="w-4 h-4 text-red-600" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  // Filter items by selected project
  const projectFilteredItems = punchItems.filter(item => item.projectId === selectedProjectId);

  const filteredItems = projectFilteredItems.filter(item => {
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || item.priority === filterPriority;
    const matchesSearch = searchTerm === '' || 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.location.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesStatus && matchesPriority && matchesSearch;
  });

  const handleCreateItem = () => {
    if (!newItem.title || !newItem.description || !newItem.location || !newItem.assignedTo) {
      toast.error('Please fill in all required fields');
      return;
    }

    const item: PunchListItem = {
      id: Date.now().toString(),
      title: newItem.title!,
      description: newItem.description!,
      location: newItem.location!,
      trade: newItem.trade || 'General',
      priority: newItem.priority as PunchListItem['priority'],
      status: 'Open',
      assignedTo: newItem.assignedTo!,
      dateCreated: new Date(),
      dateDue: newItem.dateDue || new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      photos: [],
      notes: [],
      category: newItem.category || 'General',
      projectId: selectedProjectId,
    };

    setPunchItems(prev => [...prev, item]);
    setNewItem({
      priority: 'Medium',
      status: 'Open',
      dateCreated: new Date(),
      dateDue: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      projectId: selectedProjectId,
    });
    setCreateDialogOpen(false);
    toast.success('Punch list item created successfully');
  };

  const handleEditItem = () => {
    if (!editingItem || !editingItem.title || !editingItem.description || !editingItem.location || !editingItem.assignedTo) {
      toast.error('Please fill in all required fields');
      return;
    }

    setPunchItems(prev => prev.map(item => 
      item.id === editingItem.id ? editingItem : item
    ));
    setEditDialogOpen(false);
    setEditingItem(null);
    toast.success('Punch list item updated successfully');
  };

  const handleDeleteItem = (id: string) => {
    setPunchItems(prev => prev.filter(item => item.id !== id));
    toast.success('Punch list item deleted successfully');
  };

  const updateItemStatus = (id: string, status: PunchListItem['status']) => {
    setPunchItems(prev => prev.map(item => 
      item.id === id 
        ? { 
            ...item, 
            status,
            dateCompleted: status === 'Completed' ? new Date() : item.dateCompleted
          }
        : item
    ));
    toast.success('Status updated successfully');
  };

  const openEditDialog = (item: PunchListItem) => {
    setEditingItem({ ...item });
    setEditDialogOpen(true);
  };

  const getStats = () => {
    const total = projectFilteredItems.length;
    const open = projectFilteredItems.filter(item => item.status === 'Open').length;
    const inProgress = projectFilteredItems.filter(item => item.status === 'In Progress').length;
    const completed = projectFilteredItems.filter(item => item.status === 'Completed').length;
    const verified = projectFilteredItems.filter(item => item.status === 'Verified').length;
    
    return { total, open, inProgress, completed, verified };
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
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold">{stats.total}</div>
            <div className="text-sm text-gray-600">Total Items</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600">{stats.open}</div>
            <div className="text-sm text-gray-600">Open</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-yellow-600">{stats.inProgress}</div>
            <div className="text-sm text-gray-600">In Progress</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600">{stats.completed}</div>
            <div className="text-sm text-gray-600">Completed</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600">{stats.verified}</div>
            <div className="text-sm text-gray-600">Verified</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle className="flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5" />
              Punch List for {selectedProject?.name}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Export Report
              </Button>
              <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Create New Punch List Item</DialogTitle>
                  </DialogHeader>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">Title *</Label>
                      <Input
                        id="title"
                        value={newItem.title || ''}
                        onChange={(e) => setNewItem(prev => ({ ...prev, title: e.target.value }))}
                        placeholder="Brief description of the issue"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="location">Location *</Label>
                      <Input
                        id="location"
                        value={newItem.location || ''}
                        onChange={(e) => setNewItem(prev => ({ ...prev, location: e.target.value }))}
                        placeholder="Room, floor, or area"
                      />
                    </div>
                    <div className="space-y-2 md:col-span-2">
                      <Label htmlFor="description">Description *</Label>
                      <Textarea
                        id="description"
                        value={newItem.description || ''}
                        onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Detailed description of the issue"
                        rows={3}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="trade">Trade</Label>
                      <Select
                        value={newItem.trade || 'General'}
                        onValueChange={(value) => setNewItem(prev => ({ ...prev, trade: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {trades.map(trade => (
                            <SelectItem key={trade} value={trade}>{trade}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="priority">Priority</Label>
                      <Select
                        value={newItem.priority || 'Medium'}
                        onValueChange={(value) => setNewItem(prev => ({ ...prev, priority: value as PunchListItem['priority'] }))}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {priorities.map(priority => (
                            <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="assignedTo">Assigned To *</Label>
                      <Input
                        id="assignedTo"
                        value={newItem.assignedTo || ''}
                        onChange={(e) => setNewItem(prev => ({ ...prev, assignedTo: e.target.value }))}
                        placeholder="Person or company responsible"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dateDue">Due Date</Label>
                      <Input
                        id="dateDue"
                        type="date"
                        value={newItem.dateDue?.toISOString().split('T')[0] || ''}
                        onChange={(e) => setNewItem(prev => ({ ...prev, dateDue: new Date(e.target.value) }))}
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 mt-6">
                    <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleCreateItem}>
                      Create Item
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
                placeholder="Search items..."
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
            <Select value={filterPriority} onValueChange={setFilterPriority}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Priority</SelectItem>
                {priorities.map(priority => (
                  <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Punch List Items */}
          <div className="space-y-4">
            {filteredItems.map((item) => (
              <Card key={item.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1 space-y-3">
                      <div className="flex items-start justify-between">
                        <h3 className="font-semibold text-lg">{item.title}</h3>
                        <div className="flex items-center gap-2">
                          <Badge className={getPriorityColor(item.priority)}>
                            {item.priority}
                          </Badge>
                          <Badge variant="secondary" className={getStatusColor(item.status)}>
                            {getStatusIcon(item.status)}
                            <span className="ml-1">{item.status}</span>
                          </Badge>
                        </div>
                      </div>
                      
                      <p className="text-gray-700">{item.description}</p>
                      
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm text-gray-600">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-4 h-4" />
                          {item.location}
                        </div>
                        <div className="flex items-center gap-1">
                          <User className="w-4 h-4" />
                          {item.assignedTo}
                        </div>
                        <div className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          Due: {item.dateDue.toLocaleDateString()}
                        </div>
                        <div className="flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          {item.trade}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2 pt-2">
                        <Select
                          value={item.status}
                          onValueChange={(value) => updateItemStatus(item.id, value as PunchListItem['status'])}
                        >
                          <SelectTrigger className="w-40">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {statuses.map(status => (
                              <SelectItem key={status} value={status}>{status}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button variant="outline" size="sm" onClick={() => openEditDialog(item)}>
                          <Edit className="w-4 h-4 mr-1" />
                          Edit
                        </Button>
                        <Button variant="outline" size="sm">
                          <Camera className="w-4 h-4 mr-1" />
                          Photos
                        </Button>
                        <Button variant="outline" size="sm">
                          <FileText className="w-4 h-4 mr-1" />
                          Notes
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => handleDeleteItem(item.id)}
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
          
          {filteredItems.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              No punch list items found matching your criteria.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Edit Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Punch List Item</DialogTitle>
          </DialogHeader>
          {editingItem && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-title">Title *</Label>
                <Input
                  id="edit-title"
                  value={editingItem.title}
                  onChange={(e) => setEditingItem(prev => prev ? ({ ...prev, title: e.target.value }) : null)}
                  placeholder="Brief description of the issue"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-location">Location *</Label>
                <Input
                  id="edit-location"
                  value={editingItem.location}
                  onChange={(e) => setEditingItem(prev => prev ? ({ ...prev, location: e.target.value }) : null)}
                  placeholder="Room, floor, or area"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="edit-description">Description *</Label>
                <Textarea
                  id="edit-description"
                  value={editingItem.description}
                  onChange={(e) => setEditingItem(prev => prev ? ({ ...prev, description: e.target.value }) : null)}
                  placeholder="Detailed description of the issue"
                  rows={3}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-trade">Trade</Label>
                <Select
                  value={editingItem.trade}
                  onValueChange={(value) => setEditingItem(prev => prev ? ({ ...prev, trade: value }) : null)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {trades.map(trade => (
                      <SelectItem key={trade} value={trade}>{trade}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-priority">Priority</Label>
                <Select
                  value={editingItem.priority}
                  onValueChange={(value) => setEditingItem(prev => prev ? ({ ...prev, priority: value as PunchListItem['priority'] }) : null)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {priorities.map(priority => (
                      <SelectItem key={priority} value={priority}>{priority}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-assignedTo">Assigned To *</Label>
                <Input
                  id="edit-assignedTo"
                  value={editingItem.assignedTo}
                  onChange={(e) => setEditingItem(prev => prev ? ({ ...prev, assignedTo: e.target.value }) : null)}
                  placeholder="Person or company responsible"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-dateDue">Due Date</Label>
                <Input
                  id="edit-dateDue"
                  type="date"
                  value={editingItem.dateDue.toISOString().split('T')[0]}
                  onChange={(e) => setEditingItem(prev => prev ? ({ ...prev, dateDue: new Date(e.target.value) }) : null)}
                />
              </div>
            </div>
          )}
          <div className="flex justify-end gap-2 mt-6">
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditItem}>
              Save Changes
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
