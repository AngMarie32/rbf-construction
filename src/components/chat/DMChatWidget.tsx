
import React, { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { 
  MessageCircle, 
  Send, 
  X, 
  Search, 
  Plus, 
  User,
  ArrowLeft
} from 'lucide-react';
import { useDMChat } from '@/hooks/useDMChat';
import { useAuth } from '@/contexts/AuthContext';
import { cn } from '@/lib/utils';

interface DMChatWidgetProps {
  className?: string;
}

interface DMUser {
  id: string;
  name: string;
  email: string;
  lastMessage?: any;
  unreadCount?: number;
}

export const DMChatWidget: React.FC<DMChatWidgetProps> = ({ className }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<'list' | 'chat' | 'search'>('list');
  const [newMessage, setNewMessage] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<DMUser[]>([]);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { user } = useAuth();

  const {
    dmUsers,
    selectedUser,
    setSelectedUser,
    messages,
    loading,
    sending,
    sendDMMessage,
    fetchDMMessages,
    searchUsers
  } = useDMChat();

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Search users when query changes
  useEffect(() => {
    const performSearch = async () => {
      if (searchQuery.trim()) {
        const results = await searchUsers(searchQuery);
        setSearchResults(results);
      } else {
        setSearchResults([]);
      }
    };

    const debounceTimer = setTimeout(performSearch, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, searchUsers]);

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser || !newMessage.trim()) return;

    await sendDMMessage(newMessage, selectedUser.id);
    setNewMessage('');
  };

  const handleUserSelect = async (dmUser: DMUser) => {
    setSelectedUser(dmUser);
    setView('chat');
    await fetchDMMessages(dmUser.id);
  };

  const handleBack = () => {
    if (view === 'chat') {
      setView('list');
      setSelectedUser(null);
    } else if (view === 'search') {
      setView('list');
      setSearchQuery('');
      setSearchResults([]);
    }
  };

  const formatMessageTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    if (diffHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  const isOwnMessage = (message: any) => message.user_id === user?.id;

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
    <Card className={cn("fixed bottom-4 right-4 w-80 h-[500px] shadow-xl flex flex-col", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 py-3 border-b">
        <div className="flex items-center gap-2">
          {(view === 'chat' || view === 'search') && (
            <Button variant="ghost" size="sm" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          )}
          <CardTitle className="text-sm font-medium">
            {view === 'list' && 'Messages'}
            {view === 'chat' && selectedUser?.name}
            {view === 'search' && 'New Message'}
          </CardTitle>
        </div>
        <div className="flex items-center gap-1">
          {view === 'list' && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setView('search')}
            >
              <Plus className="h-4 w-4" />
            </Button>
          )}
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
        {/* DM Users List */}
        {view === 'list' && (
          <ScrollArea className="flex-1">
            {loading ? (
              <div className="text-center text-sm text-gray-500 py-8">
                Loading conversations...
              </div>
            ) : dmUsers.length === 0 ? (
              <div className="text-center text-sm text-gray-500 py-8">
                <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No conversations yet</p>
                <Button 
                  variant="link" 
                  size="sm" 
                  onClick={() => setView('search')}
                  className="mt-2"
                >
                  Start a new conversation
                </Button>
              </div>
            ) : (
              <div className="p-2 space-y-1">
                {dmUsers.map((dmUser) => (
                  <div
                    key={dmUser.id}
                    onClick={() => handleUserSelect(dmUser)}
                    className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm truncate">
                        {dmUser.name}
                      </div>
                      {dmUser.lastMessage && (
                        <div className="text-xs text-gray-500 truncate">
                          {dmUser.lastMessage.content}
                        </div>
                      )}
                    </div>
                    {dmUser.lastMessage && (
                      <div className="text-xs text-gray-400">
                        {formatMessageTime(dmUser.lastMessage.created_at)}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        )}

        {/* Search Users */}
        {view === 'search' && (
          <>
            <div className="p-3 border-b">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search users..."
                  className="pl-10"
                />
              </div>
            </div>
            <ScrollArea className="flex-1">
              {searchResults.length === 0 && searchQuery ? (
                <div className="text-center text-sm text-gray-500 py-8">
                  No users found
                </div>
              ) : (
                <div className="p-2 space-y-1">
                  {searchResults.map((searchUser) => (
                    <div
                      key={searchUser.id}
                      onClick={() => handleUserSelect(searchUser)}
                      className="flex items-center gap-3 p-3 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
                    >
                      <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                        <User className="w-5 h-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate">
                          {searchUser.name}
                        </div>
                        <div className="text-xs text-gray-500 truncate">
                          {searchUser.email}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </>
        )}

        {/* Chat Messages */}
        {view === 'chat' && selectedUser && (
          <>
            <ScrollArea className="flex-1 p-3">
              {messages.length === 0 ? (
                <div className="text-center text-sm text-gray-500 py-8">
                  <MessageCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No messages yet</p>
                  <p className="text-xs mt-1">Start the conversation!</p>
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
                          "max-w-[80%] rounded-lg px-3 py-2 text-sm break-words",
                          isOwnMessage(message)
                            ? "bg-primary text-primary-foreground"
                            : "bg-gray-100 text-gray-900"
                        )}
                      >
                        {message.content}
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
            <div className="border-t p-3">
              <form onSubmit={handleSendMessage} className="flex gap-2">
                <Input
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder={`Message ${selectedUser.name}...`}
                  disabled={sending}
                  className="text-sm"
                />
                <Button type="submit" size="sm" disabled={sending || !newMessage.trim()}>
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};
