
import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { useChat } from './useChat';
import { useAuth } from '@/contexts/AuthContext';

interface UsePageChatOptions {
  contextId?: string;
  contextType?: string;
  pageName?: string;
}

export const usePageChat = (options: UsePageChatOptions = {}) => {
  const location = useLocation();
  const { user } = useAuth();
  const [contextRoomId, setContextRoomId] = useState<string>();
  
  const { 
    rooms, 
    messages, 
    loading, 
    sending, 
    sendMessage, 
    createRoom, 
    joinRoom, 
    fetchMessages 
  } = useChat(contextRoomId);

  // Generate room name based on context
  const generateRoomName = () => {
    if (options.pageName) {
      return `${options.pageName} Discussion`;
    }
    
    if (options.contextType === 'project' && options.contextId) {
      return `Project Chat`;
    }
    
    // Default based on current route
    const pathSegments = location.pathname.split('/').filter(Boolean);
    if (pathSegments.length > 0) {
      const pageName = pathSegments[0].replace('-', ' ');
      return `${pageName.charAt(0).toUpperCase() + pageName.slice(1)} Discussion`;
    }
    
    return 'Page Discussion';
  };

  // Find or create context-specific room
  useEffect(() => {
    const findOrCreateContextRoom = async () => {
      if (!user?.id) return;

      // Look for existing context room
      const existingRoom = rooms.find(room => 
        room.context_id === options.contextId && 
        room.context_type === options.contextType &&
        room.type !== 'general'
      );

      if (existingRoom) {
        setContextRoomId(existingRoom.id);
        await joinRoom(existingRoom.id);
        return;
      }

      // Create new context room if none exists
      const roomName = generateRoomName();
      const roomType = options.contextId ? 'project' : 'page';
      
      const newRoom = await createRoom(
        roomName,
        roomType,
        options.contextId,
        options.contextType
      );

      if (newRoom) {
        setContextRoomId(newRoom.id);
      }
    };

    findOrCreateContextRoom();
  }, [user?.id, rooms, options.contextId, options.contextType, createRoom, joinRoom]);

  return {
    contextRoomId,
    rooms,
    messages,
    loading,
    sending,
    sendMessage,
    createRoom,
    joinRoom,
    fetchMessages
  };
};
