
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { ChatRoom, Message, ChatParticipant, ChatRoomRow, MessageRow } from '@/types/chat';

// Helper function to convert database row to ChatRoom
const convertToChatRoom = (row: ChatRoomRow): ChatRoom => ({
  ...row,
  type: (row.type as ChatRoom['type']) || 'general'
});

// Helper function to convert database row to Message
const convertToMessage = (row: MessageRow, userProfile?: { name: string; email: string }): Message => ({
  ...row,
  message_type: (row.message_type as Message['message_type']) || 'text',
  file_url: row.file_url || undefined,
  user_profile: userProfile
});

export const useChat = (roomId?: string) => {
  const [rooms, setRooms] = useState<ChatRoom[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [participants, setParticipants] = useState<ChatParticipant[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch chat rooms
  const fetchRooms = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('chat_rooms')
        .select('*')
        .order('updated_at', { ascending: false });

      if (error) {
        console.error('Error fetching chat rooms:', error);
        return;
      }

      const convertedRooms = (data || []).map(convertToChatRoom);
      setRooms(convertedRooms);
    } catch (error) {
      console.error('Error fetching chat rooms:', error);
    }
  }, [user?.id]);

  // Fetch messages for a specific room
  const fetchMessages = useCallback(async (chatRoomId: string) => {
    if (!user?.id) return;

    try {
      // First get messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('chat_room_id', chatRoomId)
        .order('created_at', { ascending: true });

      if (messagesError) {
        console.error('Error fetching messages:', messagesError);
        return;
      }

      // Then get user profiles for each message
      const messagesWithProfiles = await Promise.all(
        (messagesData || []).map(async (message) => {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('name, email')
            .eq('id', message.user_id)
            .single();

          return convertToMessage(message as MessageRow, profileData || undefined);
        })
      );

      setMessages(messagesWithProfiles);
    } catch (error) {
      console.error('Error fetching messages:', error);
    }
  }, [user?.id]);

  // Send a message
  const sendMessage = useCallback(async (content: string, chatRoomId: string) => {
    if (!user?.id || !content.trim()) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          chat_room_id: chatRoomId,
          user_id: user.id,
          content: content.trim(),
          message_type: 'text'
        });

      if (error) {
        console.error('Error sending message:', error);
        toast({
          title: "Error",
          description: "Failed to send message",
          variant: "destructive",
        });
        return;
      }

      // Update room's updated_at timestamp
      await supabase
        .from('chat_rooms')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', chatRoomId);

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  }, [user?.id, toast]);

  // Create a new chat room
  const createRoom = useCallback(async (name: string, type: 'general' | 'project' | 'page' = 'general', contextId?: string, contextType?: string) => {
    if (!user?.id) return null;

    try {
      const { data: roomData, error: roomError } = await supabase
        .from('chat_rooms')
        .insert({
          name,
          type,
          context_id: contextId,
          context_type: contextType,
          created_by: user.id
        })
        .select()
        .single();

      if (roomError) {
        console.error('Error creating room:', roomError);
        toast({
          title: "Error",
          description: "Failed to create chat room",
          variant: "destructive",
        });
        return null;
      }

      // Add creator as participant
      await supabase
        .from('chat_participants')
        .insert({
          chat_room_id: roomData.id,
          user_id: user.id
        });

      await fetchRooms();
      return convertToChatRoom(roomData as ChatRoomRow);
    } catch (error) {
      console.error('Error creating room:', error);
      toast({
        title: "Error",
        description: "Failed to create chat room",
        variant: "destructive",
      });
      return null;
    }
  }, [user?.id, toast, fetchRooms]);

  // Join a chat room
  const joinRoom = useCallback(async (chatRoomId: string) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('chat_participants')
        .insert({
          chat_room_id: chatRoomId,
          user_id: user.id
        });

      if (error && error.code !== '23505') { // Ignore duplicate key errors
        console.error('Error joining room:', error);
        toast({
          title: "Error",
          description: "Failed to join chat room",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error('Error joining room:', error);
    }
  }, [user?.id, toast]);

  // Set up real-time subscriptions
  useEffect(() => {
    if (!user?.id) return;

    // Subscribe to new messages in the current room
    const messagesChannel = supabase
      .channel('messages-changes')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: roomId ? `chat_room_id=eq.${roomId}` : undefined
        },
        async (payload) => {
          console.log('New message:', payload);
          
          // Get user profile for the new message
          const { data: profileData } = await supabase
            .from('profiles')
            .select('name, email')
            .eq('id', payload.new.user_id)
            .single();

          const messageWithProfile = convertToMessage(
            payload.new as MessageRow, 
            profileData || undefined
          );

          setMessages(prev => [...prev, messageWithProfile]);
        }
      )
      .subscribe();

    // Subscribe to room updates
    const roomsChannel = supabase
      .channel('rooms-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'chat_rooms'
        },
        (payload) => {
          console.log('Room change:', payload);
          fetchRooms();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(messagesChannel);
      supabase.removeChannel(roomsChannel);
    };
  }, [user?.id, roomId, fetchRooms]);

  // Initial data fetch
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      await fetchRooms();
      if (roomId) {
        await fetchMessages(roomId);
      }
      setLoading(false);
    };

    if (user?.id) {
      loadInitialData();
    }
  }, [user?.id, roomId, fetchRooms, fetchMessages]);

  return {
    rooms,
    messages,
    participants,
    loading,
    sending,
    sendMessage,
    createRoom,
    joinRoom,
    fetchMessages
  };
};
