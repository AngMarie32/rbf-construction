
import { useState, useEffect } from 'react';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar } from '@/components/ui/calendar';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Calendar as CalendarIcon, Clock, Users, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';

interface CalendarEvent {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  type: 'meeting' | 'holiday' | 'deadline' | 'other';
  description?: string;
  attendees?: string[];
}

export default function CompanyCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [newEventOpen, setNewEventOpen] = useState(false);
  const [newEvent, setNewEvent] = useState({
    title: '',
    start_date: '',
    end_date: '',
    type: 'meeting' as CalendarEvent['type'],
    description: '',
    attendees: ''
  });

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    // Mock data for demo
    const mockEvents: CalendarEvent[] = [
      {
        id: '1',
        title: 'Project Review Meeting',
        start_date: new Date().toISOString(),
        end_date: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        type: 'meeting',
        description: 'Monthly project review with all team leads',
        attendees: ['John Doe', 'Jane Smith', 'Mike Johnson']
      },
      {
        id: '2',
        title: 'Holiday - Independence Day',
        start_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        end_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        type: 'holiday',
        description: 'Company holiday - offices closed'
      },
      {
        id: '3',
        title: 'Project Deadline - Site Preparation',
        start_date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        end_date: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
        type: 'deadline',
        description: 'Final deadline for site preparation phase'
      }
    ];
    setEvents(mockEvents);
  };

  const handleSaveEvent = () => {
    if (!newEvent.title || !newEvent.start_date) {
      toast.error('Please fill in required fields');
      return;
    }

    const event: CalendarEvent = {
      id: Date.now().toString(),
      title: newEvent.title,
      start_date: newEvent.start_date,
      end_date: newEvent.end_date || newEvent.start_date,
      type: newEvent.type,
      description: newEvent.description,
      attendees: newEvent.attendees ? newEvent.attendees.split(',').map(a => a.trim()) : []
    };

    setEvents([...events, event]);
    setNewEventOpen(false);
    setNewEvent({
      title: '',
      start_date: '',
      end_date: '',
      type: 'meeting',
      description: '',
      attendees: ''
    });
    toast.success('Event created successfully');
  };

  const getEventTypeColor = (type: string) => {
    switch (type) {
      case 'meeting': return 'bg-blue-500';
      case 'holiday': return 'bg-red-500';
      case 'deadline': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'meeting': return <Users className="w-4 h-4" />;
      case 'holiday': return <CalendarIcon className="w-4 h-4" />;
      case 'deadline': return <Clock className="w-4 h-4" />;
      default: return <CalendarIcon className="w-4 h-4" />;
    }
  };

  const selectedDateEvents = events.filter(event => {
    if (!selectedDate) return false;
    const eventDate = new Date(event.start_date);
    return eventDate.toDateString() === selectedDate.toDateString();
  });

  return (
    <Layout title="Company Calendar" subtitle="Manage meetings, holidays, and important dates">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">Company Calendar</h1>
            <p className="text-muted-foreground">Schedule and track company events</p>
          </div>
          <Dialog open={newEventOpen} onOpenChange={setNewEventOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Event
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Create New Event</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Title *</Label>
                  <Input
                    value={newEvent.title}
                    onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                    placeholder="Event title"
                  />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={newEvent.type} onValueChange={(value) => setNewEvent({ ...newEvent, type: value as CalendarEvent['type'] })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="meeting">Meeting</SelectItem>
                      <SelectItem value="holiday">Holiday</SelectItem>
                      <SelectItem value="deadline">Deadline</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Date *</Label>
                    <Input
                      type="datetime-local"
                      value={newEvent.start_date}
                      onChange={(e) => setNewEvent({ ...newEvent, start_date: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>End Date</Label>
                    <Input
                      type="datetime-local"
                      value={newEvent.end_date}
                      onChange={(e) => setNewEvent({ ...newEvent, end_date: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    placeholder="Event description..."
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Attendees</Label>
                  <Input
                    value={newEvent.attendees}
                    onChange={(e) => setNewEvent({ ...newEvent, attendees: e.target.value })}
                    placeholder="Comma-separated names"
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setNewEventOpen(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={handleSaveEvent} className="flex-1">
                    Save Event
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Calendar */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Calendar</CardTitle>
            </CardHeader>
            <CardContent>
              <Calendar
                mode="single"
                selected={selectedDate}
                onSelect={setSelectedDate}
                className="rounded-md border"
              />
            </CardContent>
          </Card>

          {/* Selected Date Events */}
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedDate ? format(selectedDate, 'MMMM dd, yyyy') : 'Select a date'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {selectedDateEvents.length > 0 ? (
                <div className="space-y-4">
                  {selectedDateEvents.map((event) => (
                    <div key={event.id} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Badge className={`${getEventTypeColor(event.type)} text-white`}>
                            {getEventIcon(event.type)}
                          </Badge>
                          <h4 className="font-medium text-sm">{event.title}</h4>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground mb-2">
                        {format(new Date(event.start_date), 'h:mm a')}
                        {event.end_date && event.end_date !== event.start_date && 
                          ` - ${format(new Date(event.end_date), 'h:mm a')}`
                        }
                      </p>
                      {event.description && (
                        <p className="text-xs text-muted-foreground mb-2">{event.description}</p>
                      )}
                      {event.attendees && event.attendees.length > 0 && (
                        <p className="text-xs text-muted-foreground">
                          Attendees: {event.attendees.join(', ')}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No events on this date</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* All Events List */}
        <Card>
          <CardHeader>
            <CardTitle>All Events</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {events.length > 0 ? (
                events.map((event) => (
                  <div key={event.id} className="flex items-center justify-between border rounded-lg p-4">
                    <div className="flex items-center gap-3">
                      <Badge className={`${getEventTypeColor(event.type)} text-white`}>
                        {getEventIcon(event.type)}
                      </Badge>
                      <div>
                        <h4 className="font-medium">{event.title}</h4>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(event.start_date), 'MMM dd, yyyy • h:mm a')}
                        </p>
                        {event.attendees && event.attendees.length > 0 && (
                          <p className="text-xs text-muted-foreground">
                            {event.attendees.length} attendee{event.attendees.length > 1 ? 's' : ''}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="ghost" size="sm">
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Button variant="ghost" size="sm" className="text-red-600">
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  No events scheduled. Create your first event to get started!
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
