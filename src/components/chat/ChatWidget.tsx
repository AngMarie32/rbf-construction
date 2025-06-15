
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Send, X, Plus, Users } from 'lucide-react';
import { useChat } from '@/hooks/useChat';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import type { Message } from '@/types/chat';

interface ChatWidgetProps {
  defaultRoomId?: string;
  className?: string;
}

export const ChatWidget: React.FC<ChatWidgetProps> = ({ defaultRoomId, className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | undefined>(defaultRoomId);
  const [newMessage, setNewMessage] = useState('');
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const {
    rooms,
    messages,
    loading,
    sending,
    sendMessage,
    createRoom,
    joinRoom,
    fetchMessages
  } = useChat(selectedRoomId);

  const selectedRoom = rooms.find(room => room.id === selectedRoomId);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Select first room if none selected
  useEffect(() => {
    if (!selectedRoomId && rooms.length > 0) {
      setSelectedRoomId(rooms[0].id);
    }
  }, [rooms, selectedRoomId]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomId || !newMessage.trim()) return;

    await sendMessage(newMessage, selectedRoomId);
    setNewMessage('');
  };

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;

    const room = await createRoom(newRoomName);
    if (room) {
      setSelectedRoomId(room.id);
      setNewRoomName('');
      setShowCreateRoom(false);
    }
  };

  const handleRoomSelect = async (roomId: string) => {
    setSelectedRoomId(roomId);
    await joinRoom(roomId);
    await fetchMessages(roomId);
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isOwnMessage = (message: Message) => message.user_id === user?.id;

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className={cn("fixed bottom-4 right-4 h-12 w-12 rounded-full shadow-lg", className)}
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className={cn("fixed bottom-4 right-4 w-96 h-[500px] shadow-xl flex flex-col", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">
          {selectedRoom ? selectedRoom.name : 'Chat'}
        </CardTitle>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowCreateRoom(!showCreateRoom)}
          >
            <Plus className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsOpen(false)}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col p-0">
        {/* Room Selection */}
        <div className="border-b p-2">
          <ScrollArea className="max-h-20">
            <div className="flex gap-1 flex-wrap">
              {rooms.map((room) => (
                <Badge
                  key={room.id}
                  variant={selectedRoomId === room.id ? "default" : "secondary"}
                  className="cursor-pointer text-xs"
                  onClick={() => handleRoomSelect(room.id)}
                >
                  {room.name}
                </Badge>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Create Room Form */}
        {showCreateRoom && (
          <div className="border-b p-2">
            <form onSubmit={handleCreateRoom} className="flex gap-2">
              <Input
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="Room name..."
                className="text-xs"
              />
              <Button type="submit" size="sm">
                Create
              </Button>
            </form>
          </div>
        )}

        {/* Messages */}
        <ScrollArea className="flex-1 p-2">
          {loading ? (
            <div className="text-center text-sm text-gray-500 py-4">
              Loading messages...
            </div>
          ) : messages.length === 0 ? (
            <div className="text-center text-sm text-gray-500 py-4">
              No messages yet. Start the conversation!
            </div>
          ) : (
            <div className="space-y-2">
              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex flex-col",
                    isOwnMessage(message) ? "items-end" : "items-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                      isOwnMessage(message)
                        ? "bg-primary text-primary-foreground"
                        : "bg-gray-100 text-gray-900"
                    )}
                  >
                    {!isOwnMessage(message) && (
                      <div className="text-xs font-medium mb-1">
                        {message.user_profile?.name || 'Unknown User'}
                      </div>
                    )}
                    <div>{message.content}</div>
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    {formatMessageTime(message.created_at)}
                  </div>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
          )}
        </ScrollArea>

        {/* Message Input */}
        {selectedRoomId && (
          <div className="border-t p-2">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type a message..."
                disabled={sending}
                className="text-sm"
              />
              <Button type="submit" size="sm" disabled={sending || !newMessage.trim()}>
                <Send className="h-4 w-4" />
              </Button>
            </form>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
