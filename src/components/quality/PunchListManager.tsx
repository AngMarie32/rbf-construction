
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
  CheckCircle, 
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
  FileText
} from 'lucide-react';
import { toast } from 'sonner';

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
}

interface PunchListManagerProps {
  projectId?: string;
}

export function PunchListManager({ projectId }: PunchListManagerProps) {
  const [punchItems, setPunchItems] = useState<PunchListItem[]>([
    {
      id: '1',
      title: 'Touch up paint on main hallway walls',
      description: 'Several scuff marks and scratches visible on walls near elevator bank',
      location: 'Main Hallway - Floor 2',
      trade: 'Painting',
      priority: 'Medium',
      status: 'Open',
      assignedTo: 'Mike Johnson',
      dateCreated: new Date('2024-01-15'),
      dateDue: new Date('2024-01-20'),
      photos: [],
      notes: ['Owner noticed during walkthrough'],
      category: 'Finish Work',
    },
    {
      id: '2',
      title: 'Install missing outlet cover in office 205',
      description: 'Electrical outlet missing cover plate',
      location: 'Office 205',
      trade: 'Electrical',
      priority: 'High',
      status: 'In Progress',
      assignedTo: 'Sarah Wilson',
      dateCreated: new Date('2024-01-14'),
      dateDue: new Date('2024-01-18'),
      photos: [],
      notes: ['Safety concern - exposed outlet'],
      category: 'Electrical',
    },
  ]);

  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterPriority, setFilterPriority] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [newItem, setNewItem] = useState<Partial<PunchListItem>>({
    priority: 'Medium',
    status: 'Open',
    dateCreated: new Date(),
    dateDue: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
  });

  const priorities = ['Low', 'Medium', 'High', 'Critical'];
  const statuses = ['Open', 'In Progress', 'Completed', 'Verified'];
  const trades = ['General', 'Electrical', 'Plumbing', 'HVAC', 'Painting', 'Flooring', 'Drywall', 'Tile'];

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Critical': return 'bg-red-100 text-red-800 border-red-200';
      case 'High': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'Low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
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
        return <CheckCircle className="w-4 h-4" />;
      case 'In Progress':
        return <Clock className="w-4 h-4" />;
      case 'Open':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const filteredItems = punchItems.filter(item => {
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
    };

    setPunchItems(prev => [...prev, item]);
    setNewItem({
      priority: 'Medium',
      status: 'Open',
      dateCreated: new Date(),
      dateDue: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });
    setCreateDialogOpen(false);
    toast.success('Punch list item created successfully');
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

  const getStats = () => {
    const total = punchItems.length;
    const open = punchItems.filter(item => item.status === 'Open').length;
    const inProgress = punchItems.filter(item => item.status === 'In Progress').length;
    const completed = punchItems.filter(item => item.status === 'Completed').length;
    const verified = punchItems.filter(item => item.status === 'Verified').length;
    
    return { total, open, inProgress, completed, verified };
  };

  const stats = getStats();

  return (
    <div className="space-y-6">
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
              <CheckCircle className="w-5 h-5" />
              Punch List Management
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
                        <Button variant="outline" size="sm">
                          <Camera className="w-4 h-4 mr-1" />
                          Photos
                        </Button>
                        <Button variant="outline" size="sm">
                          <FileText className="w-4 h-4 mr-1" />
                          Notes
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
    </div>
  );
}
