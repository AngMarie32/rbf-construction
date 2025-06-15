
import React, { useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { ChatWidget } from '@/components/chat/ChatWidget';
import { ChatSidebar } from '@/components/chat/ChatSidebar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useChat } from '@/hooks/useChat';
import { MessageCircle, Plus } from 'lucide-react';

const Chat = () => {
  const [selectedRoomId, setSelectedRoomId] = useState<string>();
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const { createRoom } = useChat();

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

  return (
    <Layout title="Chat" subtitle="Real-time messaging for your team">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-6 h-6" />
            <h1 className="text-2xl font-bold">Team Chat</h1>
          </div>
          <Button onClick={() => setShowCreateRoom(!showCreateRoom)}>
            <Plus className="w-4 h-4 mr-2" />
            Create Room
          </Button>
        </div>

        {showCreateRoom && (
          <Card>
            <CardHeader>
              <CardTitle>Create New Chat Room</CardTitle>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleCreateRoom} className="flex gap-2">
                <Input
                  value={newRoomName}
                  onChange={(e) => setNewRoomName(e.target.value)}
                  placeholder="Enter room name..."
                  className="flex-1"
                />
                <Button type="submit">Create</Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setShowCreateRoom(false)}
                >
                  Cancel
                </Button>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="flex gap-6 h-[600px]">
          <ChatSidebar
            onRoomSelect={setSelectedRoomId}
            selectedRoomId={selectedRoomId}
          />
          
          <div className="flex-1">
            {selectedRoomId ? (
              <ChatWidget 
                defaultRoomId={selectedRoomId}
                className="relative w-full h-full"
              />
            ) : (
              <Card className="h-full flex items-center justify-center">
                <CardContent className="text-center">
                  <MessageCircle className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                  <h3 className="text-lg font-medium mb-2">Select a chat room</h3>
                  <p className="text-gray-600">
                    Choose a room from the sidebar to start chatting
                  </p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default Chat;
