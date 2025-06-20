
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Calendar, Clock, Plus, Users } from 'lucide-react';
import { format, isToday, isTomorrow } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface CalendarEvent {
  id: string;
  title: string;
  start_date: string;
  end_date: string;
  type: 'meeting' | 'holiday' | 'deadline' | 'other';
  description?: string;
  attendees?: string[];
}

export function CompanyScheduleWidget() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUpcomingEvents();
  }, []);

  const fetchUpcomingEvents = async () => {
    try {
      // For now, use sample data since TypeScript types haven't been regenerated
      // This will be replaced with real database calls once types are updated
      const sampleEvents: CalendarEvent[] = [
        {
          id: '1',
          title: 'Weekly Team Meeting',
          start_date: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // Tomorrow
          end_date: new Date(Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000).toISOString(),
          type: 'meeting',
          description: 'Weekly team sync and project updates',
          attendees: ['Project Manager', 'Field Supervisor']
        },
        {
          id: '2',
          title: 'Client Site Visit',
          start_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days from now
          end_date: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 2 * 60 * 60 * 1000).toISOString(),
          type: 'meeting',
          description: 'On-site visit with client for progress review',
          attendees: ['Client', 'Project Manager']
        }
      ];
      
      setEvents(sampleEvents);
    } catch (error) {
      console.error('Error fetching events:', error);
      setEvents([]);
    } finally {
      setLoading(false);
    }
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
      case 'meeting': return <Users className="w-3 h-3" />;
      case 'holiday': return <Calendar className="w-3 h-3" />;
      case 'deadline': return <Clock className="w-3 h-3" />;
      default: return <Calendar className="w-3 h-3" />;
    }
  };

  const formatEventDate = (dateString: string) => {
    const date = new Date(dateString);
    if (isToday(date)) return 'Today';
    if (isTomorrow(date)) return 'Tomorrow';
    return format(date, 'MMM dd');
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-4">
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-muted rounded"></div>
            <div className="h-4 bg-muted rounded w-3/4"></div>
            <div className="h-4 bg-muted rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">Company Schedule</CardTitle>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate('/company-calendar')}
          >
            <Plus className="w-4 h-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {events.length > 0 ? (
          <div className="space-y-3">
            {events.map((event) => (
              <div key={event.id} className="flex items-start gap-3">
                <Badge className={`${getEventTypeColor(event.type)} text-white flex items-center gap-1`}>
                  {getEventIcon(event.type)}
                </Badge>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{event.title}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatEventDate(event.start_date)} • {format(new Date(event.start_date), 'h:mm a')}
                  </p>
                  {event.attendees && event.attendees.length > 0 && (
                    <p className="text-xs text-muted-foreground">
                      {event.attendees.length} attendee{event.attendees.length > 1 ? 's' : ''}
                    </p>
                  )}
                </div>
              </div>
            ))}
            <Button 
              variant="outline" 
              size="sm" 
              className="w-full"
              onClick={() => navigate('/company-calendar')}
            >
              View All Events
            </Button>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-2">No upcoming events</p>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => navigate('/company-calendar')}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Event
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
