
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
import { Checkbox } from '@/components/ui/checkbox';
import { Plus, Calendar as CalendarIcon, Clock, Users, Edit, Trash2 } from 'lucide-react';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';

interface CalendarEvent {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  type: 'meeting' | 'holiday' | 'deadline' | 'other';
  description?: string;
  attendees?: string[];
  recurring_type?: 'none' | 'daily' | 'weekly' | 'monthly';
  recurring_days?: number[];
}

interface Holiday {
  name: string;
  date: string;
}

export default function CompanyCalendar() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [newEventOpen, setNewEventOpen] = useState(false);
  const [editEventOpen, setEditEventOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [loading, setLoading] = useState(true);
  const [newEvent, setNewEvent] = useState({
    title: '',
    date: '',
    start_time: '',
    end_time: '',
    type: 'meeting' as CalendarEvent['type'],
    description: '',
    attendees: '',
    recurring_type: 'none' as CalendarEvent['recurring_type'],
    recurring_days: [] as number[]
  });

  // Sample holidays for 2025
  const holidays: Holiday[] = [
    { name: "New Year's Day", date: "2025-01-01" },
    { name: "Martin Luther King Jr. Day", date: "2025-01-20" },
    { name: "Presidents Day", date: "2025-02-17" },
    { name: "Memorial Day", date: "2025-05-26" },
    { name: "Independence Day", date: "2025-07-04" },
    { name: "Labor Day", date: "2025-09-01" },
    { name: "Columbus Day", date: "2025-10-13" },
    { name: "Veterans Day", date: "2025-11-11" },
    { name: "Thanksgiving", date: "2025-11-27" },
    { name: "Christmas Day", date: "2025-12-25" }
  ];

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const { data: eventsData, error } = await supabase
        .from('calendar_events')
        .select('*')
        .order('start_date', { ascending: true });

      if (error) throw error;

      const transformedEvents: CalendarEvent[] = (eventsData || []).map(event => ({
        id: event.id,
        title: event.title,
        start_date: event.start_date,
        end_date: event.end_date,
        type: event.type as CalendarEvent['type'],
        description: event.description,
        attendees: event.attendees,
        recurring_type: event.recurring_type || 'none',
        recurring_days: event.recurring_days || []
      }));

      setEvents(transformedEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveEvent = async () => {
    if (!newEvent.title || !newEvent.date || !newEvent.start_time) {
      toast.error('Please fill in title, date, and start time');
      return;
    }

    try {
      const startDateTime = new Date(`${newEvent.date}T${newEvent.start_time}`).toISOString();
      const endDateTime = newEvent.end_time 
        ? new Date(`${newEvent.date}T${newEvent.end_time}`).toISOString()
        : startDateTime;

      const { data, error } = await supabase
        .from('calendar_events')
        .insert({
          title: newEvent.title,
          start_date: startDateTime,
          end_date: endDateTime,
          type: newEvent.type,
          description: newEvent.description,
          attendees: newEvent.attendees ? newEvent.attendees.split(',').map(a => a.trim()) : [],
          recurring_type: newEvent.recurring_type,
          recurring_days: newEvent.recurring_days
        })
        .select()
        .single();

      if (error) throw error;

      fetchEvents();
      setNewEventOpen(false);
      resetNewEvent();
      toast.success('Event created successfully');
    } catch (error) {
      console.error('Error creating event:', error);
      toast.error('Failed to create event');
    }
  };

  const handleEditEvent = async () => {
    if (!editingEvent) return;

    try {
      const { error } = await supabase
        .from('calendar_events')
        .update({
          title: editingEvent.title,
          description: editingEvent.description,
          type: editingEvent.type,
          attendees: editingEvent.attendees
        })
        .eq('id', editingEvent.id);

      if (error) throw error;

      fetchEvents();
      setEditEventOpen(false);
      setEditingEvent(null);
      toast.success('Event updated successfully');
    } catch (error) {
      console.error('Error updating event:', error);
      toast.error('Failed to update event');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId);

      if (error) throw error;

      fetchEvents();
      toast.success('Event deleted successfully');
    } catch (error) {
      console.error('Error deleting event:', error);
      toast.error('Failed to delete event');
    }
  };

  const resetNewEvent = () => {
    setNewEvent({
      title: '',
      date: '',
      start_time: '',
      end_time: '',
      type: 'meeting',
      description: '',
      attendees: '',
      recurring_type: 'none',
      recurring_days: []
    });
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

  const upcomingEvents = events
    .filter(event => new Date(event.start_date) >= new Date())
    .slice(0, 5);

  const todaysHolidays = holidays.filter(holiday => {
    if (!selectedDate) return false;
    const holidayDate = new Date(holiday.date);
    return holidayDate.toDateString() === selectedDate.toDateString();
  });

  return (
    <Layout title="Company Calendar" subtitle="Schedule and track company events">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
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
                <div>
                  <Label>Date *</Label>
                  <Input
                    type="date"
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Start Time *</Label>
                    <Input
                      type="time"
                      value={newEvent.start_time}
                      onChange={(e) => setNewEvent({ ...newEvent, start_time: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label>End Time</Label>
                    <Input
                      type="time"
                      value={newEvent.end_time}
                      onChange={(e) => setNewEvent({ ...newEvent, end_time: e.target.value })}
                    />
                  </div>
                </div>
                <div>
                  <Label>Recurring</Label>
                  <Select value={newEvent.recurring_type} onValueChange={(value) => setNewEvent({ ...newEvent, recurring_type: value as CalendarEvent['recurring_type'] })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No Repeat</SelectItem>
                      <SelectItem value="daily">Daily</SelectItem>
                      <SelectItem value="weekly">Weekly</SelectItem>
                      <SelectItem value="monthly">Monthly</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    placeholder="Event description"
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Attendees</Label>
                  <Input
                    value={newEvent.attendees}
                    onChange={(e) => setNewEvent({ ...newEvent, attendees: e.target.value })}
                    placeholder="Attendee names separated by commas"
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

          {/* Right Sidebar */}
          <div className="space-y-4">
            {/* Selected Date Events */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">
                  {selectedDate ? format(selectedDate, 'MMMM dd, yyyy') : 'Select a date'}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {selectedDateEvents.length > 0 ? (
                  <div className="space-y-3">
                    {selectedDateEvents.map((event) => (
                      <div key={event.id} className="border rounded-lg p-3">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <Badge className={`${getEventTypeColor(event.type)} text-white`}>
                              {getEventIcon(event.type)}
                            </Badge>
                            <h4 className="font-medium text-sm">{event.title}</h4>
                          </div>
                          <div className="flex gap-1">
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => {
                                setEditingEvent(event);
                                setEditEventOpen(true);
                              }}
                            >
                              <Edit className="w-3 h-3" />
                            </Button>
                            <Button 
                              size="sm" 
                              variant="ghost"
                              onClick={() => handleDeleteEvent(event.id)}
                            >
                              <Trash2 className="w-3 h-3" />
                            </Button>
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
                  <div>
                    <p className="text-sm text-muted-foreground">No events on this date</p>
                    {todaysHolidays.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-red-600 mb-1">Holidays:</p>
                        {todaysHolidays.map((holiday, index) => (
                          <p key={index} className="text-xs text-red-600">{holiday.name}</p>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Upcoming Events */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Upcoming Events</CardTitle>
              </CardHeader>
              <CardContent>
                {upcomingEvents.length > 0 ? (
                  <div className="space-y-2">
                    {upcomingEvents.map((event) => (
                      <div key={event.id} className="text-xs">
                        <div className="flex items-center gap-2">
                          <Badge className={`${getEventTypeColor(event.type)} text-white w-4 h-4 p-0 flex items-center justify-center`}>
                            {getEventIcon(event.type)}
                          </Badge>
                          <span className="font-medium">{event.title}</span>
                        </div>
                        <p className="text-muted-foreground ml-6">
                          {format(new Date(event.start_date), 'MMM dd • h:mm a')}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No upcoming events</p>
                )}
              </CardContent>
            </Card>

            {/* Holidays */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">2025 Holidays</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-1">
                  {holidays.slice(0, 5).map((holiday, index) => (
                    <div key={index} className="text-xs">
                      <span className="font-medium">{holiday.name}</span>
                      <p className="text-muted-foreground">{format(new Date(holiday.date), 'MMM dd')}</p>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Edit Event Dialog */}
        <Dialog open={editEventOpen} onOpenChange={setEditEventOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit Event</DialogTitle>
            </DialogHeader>
            {editingEvent && (
              <div className="space-y-4">
                <div>
                  <Label>Title</Label>
                  <Input
                    value={editingEvent.title}
                    onChange={(e) => setEditingEvent({ ...editingEvent, title: e.target.value })}
                  />
                </div>
                <div>
                  <Label>Type</Label>
                  <Select value={editingEvent.type} onValueChange={(value) => setEditingEvent({ ...editingEvent, type: value as CalendarEvent['type'] })}>
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
                <div>
                  <Label>Description</Label>
                  <Textarea
                    value={editingEvent.description || ''}
                    onChange={(e) => setEditingEvent({ ...editingEvent, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <div>
                  <Label>Attendees</Label>
                  <Input
                    value={editingEvent.attendees?.join(', ') || ''}
                    onChange={(e) => setEditingEvent({ ...editingEvent, attendees: e.target.value.split(',').map(a => a.trim()) })}
                  />
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setEditEventOpen(false)} className="flex-1">
                    Cancel
                  </Button>
                  <Button onClick={handleEditEvent} className="flex-1">
                    Save Changes
                  </Button>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    </Layout>
  );
}
