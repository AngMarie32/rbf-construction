
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MessageCircle, Users, Plus } from 'lucide-react';
import { useChat } from '@/hooks/useChat';
import { cn } from '@/lib/utils';

interface ChatSidebarProps {
  onRoomSelect: (roomId: string) => void;
  selectedRoomId?: string;
  className?: string;
}

export const ChatSidebar: React.FC<ChatSidebarProps> = ({
  onRoomSelect,
  selectedRoomId,
  className
}) => {
  const { rooms, loading } = useChat();

  const getRoomTypeIcon = (type: string) => {
    switch (type) {
      case 'project':
        return '🏗️';
      case 'page':
        return '📄';
      default:
        return '💬';
    }
  };

  if (loading) {
    return (
      <Card className={cn("w-64", className)}>
        <CardHeader>
          <CardTitle className="text-sm">Chat Rooms</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center text-sm text-gray-500">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-64", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm">Chat Rooms</CardTitle>
        <Button variant="ghost" size="sm">
          <Plus className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[400px]">
          {rooms.length === 0 ? (
            <div className="p-4 text-center text-sm text-gray-500">
              No chat rooms available
            </div>
          ) : (
            <div className="space-y-1 p-2">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  onClick={() => onRoomSelect(room.id)}
                  className={cn(
                    "flex items-center gap-2 p-2 rounded-lg cursor-pointer transition-colors",
                    selectedRoomId === room.id
                      ? "bg-primary text-primary-foreground"
                      : "hover:bg-gray-100"
                  )}
                >
                  <span className="text-lg">{getRoomTypeIcon(room.type)}</span>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm truncate">
                      {room.name}
                    </div>
                    <div className="text-xs opacity-70">
                      {room.type}
                    </div>
                  </div>
                  {room.type !== 'general' && (
                    <Badge variant="secondary" className="text-xs">
                      {room.context_type}
                    </Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
