
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { MessageCircle, Send, Minimize2, Maximize2, X } from 'lucide-react';
import { usePageChat } from '@/hooks/usePageChat';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';
import type { Message } from '@/types/chat';

interface PageChatWidgetProps {
  contextId?: string;
  contextType?: string;
  pageName?: string;
  className?: string;
  defaultMinimized?: boolean;
}

export const PageChatWidget: React.FC<PageChatWidgetProps> = ({
  contextId,
  contextType,
  pageName,
  className,
  defaultMinimized = true
}) => {
  const [isMinimized, setIsMinimized] = useState(defaultMinimized);
  const [isVisible, setIsVisible] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const { user } = useAuth();

  const {
    contextRoomId,
    messages,
    loading,
    sending,
    sendMessage
  } = usePageChat({ contextId, contextType, pageName });

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!contextRoomId || !newMessage.trim()) return;

    await sendMessage(newMessage, contextRoomId);
    setNewMessage('');
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const isOwnMessage = (message: Message) => message.user_id === user?.id;

  if (!isVisible) {
    return (
      <Button
        onClick={() => setIsVisible(true)}
        className={cn("fixed bottom-4 right-4 h-12 w-12 rounded-full shadow-lg z-50", className)}
        size="icon"
      >
        <MessageCircle className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <Card className={cn(
      "fixed bottom-4 right-4 shadow-xl flex flex-col z-50 transition-all duration-200",
      isMinimized ? "w-80 h-16" : "w-96 h-[500px]",
      className
    )}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 py-2">
        <CardTitle className="text-sm font-medium truncate">
          {pageName || contextType || 'Page Chat'}
        </CardTitle>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsMinimized(!isMinimized)}
            className="h-6 w-6 p-0"
          >
            {isMinimized ? <Maximize2 className="h-3 w-3" /> : <Minimize2 className="h-3 w-3" />}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsVisible(false)}
            className="h-6 w-6 p-0"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </CardHeader>

      {!isMinimized && (
        <CardContent className="flex-1 flex flex-col p-0">
          {/* Messages */}
          <ScrollArea className="flex-1 p-3">
            {loading ? (
              <div className="text-center text-sm text-gray-500 py-4">
                Loading messages...
              </div>
            ) : messages.length === 0 ? (
              <div className="text-center text-sm text-gray-500 py-4">
                No messages yet. Start the conversation!
              </div>
            ) : (
              <div className="space-y-3">
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
              </div>
            )}
          </ScrollArea>

          {/* Message Input */}
          {contextRoomId && (
            <div className="border-t p-3">
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
      )}
    </Card>
  );
};
