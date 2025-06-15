
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { Message } from '@/types/chat';

interface DMUser {
  id: string;
  name: string;
  email: string;
  lastMessage?: Message;
  unreadCount?: number;
}

export const useDMChat = () => {
  const [dmUsers, setDMUsers] = useState<DMUser[]>([]);
  const [selectedUser, setSelectedUser] = useState<DMUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  // Fetch users for DM
  const fetchDMUsers = useCallback(async () => {
    if (!user?.id) return;

    try {
      // Get all DM rooms for current user
      const { data: dmRooms, error: roomsError } = await supabase
        .from('chat_rooms')
        .select(`
          id,
          name,
          type,
          updated_at,
          chat_participants!inner(
            user_id,
            profiles(id, name, email)
          )
        `)
        .eq('type', 'dm')
        .eq('chat_participants.user_id', user.id)
        .order('updated_at', { ascending: false });

      if (roomsError) {
        console.error('Error fetching DM rooms:', roomsError);
        return;
      }

      // Extract other users from DM rooms
      const users: DMUser[] = [];
      
      for (const room of dmRooms || []) {
        // Get all participants in this room
        const { data: allParticipants } = await supabase
          .from('chat_participants')
          .select(`
            user_id,
            profiles(id, name, email)
          `)
          .eq('chat_room_id', room.id);

        // Find the other user (not the current user)
        const otherParticipant = allParticipants?.find(p => p.user_id !== user.id);
        
        if (otherParticipant?.profiles) {
          // Get last message for this room
          const { data: lastMessages } = await supabase
            .from('messages')
            .select(`
              id,
              content,
              created_at,
              updated_at,
              message_type,
              chat_room_id,
              user_id,
              file_url,
              user_profile:profiles(name, email)
            `)
            .eq('chat_room_id', room.id)
            .order('created_at', { ascending: false })
            .limit(1);

          const lastMessage = lastMessages?.[0];
          const profile = otherParticipant.profiles;
          
          users.push({
            id: profile.id,
            name: profile.name || profile.email,
            email: profile.email,
            lastMessage: lastMessage ? {
              ...lastMessage,
              message_type: lastMessage.message_type as 'text' | 'file' | 'image'
            } : undefined
          });
        }
      }

      setDMUsers(users);
    } catch (error) {
      console.error('Error fetching DM users:', error);
    }
  }, [user?.id]);

  // Get or create DM room between two users
  const getOrCreateDMRoom = useCallback(async (otherUserId: string): Promise<string | null> => {
    if (!user?.id) return null;

    try {
      // First, check if a DM room already exists between these users
      const { data: existingRooms } = await supabase
        .from('chat_rooms')
        .select(`
          id,
          chat_participants!inner(user_id)
        `)
        .eq('type', 'dm');

      // Find room where both users are participants
      let dmRoomId: string | null = null;
      
      if (existingRooms) {
        for (const room of existingRooms) {
          const { data: participants } = await supabase
            .from('chat_participants')
            .select('user_id')
            .eq('chat_room_id', room.id)
            .in('user_id', [user.id, otherUserId]);

          if (participants && participants.length === 2) {
            dmRoomId = room.id;
            break;
          }
        }
      }

      // Create new DM room if none exists
      if (!dmRoomId) {
        const { data: newRoom, error: roomError } = await supabase
          .from('chat_rooms')
          .insert({
            name: 'Direct Message',
            type: 'dm',
            created_by: user.id
          })
          .select()
          .single();

        if (roomError) {
          console.error('Error creating DM room:', roomError);
          return null;
        }

        dmRoomId = newRoom.id;

        // Add both users as participants
        const { error: participantsError } = await supabase
          .from('chat_participants')
          .insert([
            { chat_room_id: dmRoomId, user_id: user.id },
            { chat_room_id: dmRoomId, user_id: otherUserId }
          ]);

        if (participantsError) {
          console.error('Error adding participants:', participantsError);
          return null;
        }
      }

      return dmRoomId;
    } catch (error) {
      console.error('Error getting/creating DM room:', error);
      return null;
    }
  }, [user?.id]);

  // Fetch messages for selected DM
  const fetchDMMessages = useCallback(async (otherUserId: string) => {
    const roomId = await getOrCreateDMRoom(otherUserId);
    if (!roomId) return;

    try {
      const { data: messagesData, error } = await supabase
        .from('messages')
        .select(`
          id,
          chat_room_id,
          user_id,
          content,
          message_type,
          file_url,
          created_at,
          updated_at,
          user_profile:profiles(name, email)
        `)
        .eq('chat_room_id', roomId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching DM messages:', error);
        return;
      }

      // Ensure proper typing for messages
      const typedMessages: Message[] = (messagesData || []).map(msg => ({
        ...msg,
        message_type: msg.message_type as 'text' | 'file' | 'image'
      }));

      setMessages(typedMessages);
    } catch (error) {
      console.error('Error fetching DM messages:', error);
    }
  }, [getOrCreateDMRoom]);

  // Send DM message
  const sendDMMessage = useCallback(async (content: string, otherUserId: string) => {
    if (!user?.id || !content.trim()) return;

    const roomId = await getOrCreateDMRoom(otherUserId);
    if (!roomId) return;

    setSending(true);
    try {
      const { error } = await supabase
        .from('messages')
        .insert({
          chat_room_id: roomId,
          user_id: user.id,
          content: content.trim(),
          message_type: 'text'
        });

      if (error) {
        console.error('Error sending DM:', error);
        toast({
          title: "Error",
          description: "Failed to send message",
          variant: "destructive",
        });
        return;
      }

      // Update room timestamp
      await supabase
        .from('chat_rooms')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', roomId);

      // Refresh messages
      await fetchDMMessages(otherUserId);
    } catch (error) {
      console.error('Error sending DM:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setSending(false);
    }
  }, [user?.id, getOrCreateDMRoom, fetchDMMessages, toast]);

  // Search users for new DMs
  const searchUsers = useCallback(async (query: string): Promise<DMUser[]> => {
    if (!user?.id || !query.trim()) return [];

    try {
      const { data: users, error } = await supabase
        .from('profiles')
        .select('id, name, email')
        .neq('id', user.id)
        .or(`name.ilike.%${query}%,email.ilike.%${query}%`)
        .limit(10);

      if (error) {
        console.error('Error searching users:', error);
        return [];
      }

      return (users || []).map(u => ({
        id: u.id,
        name: u.name || u.email,
        email: u.email
      }));
    } catch (error) {
      console.error('Error searching users:', error);
      return [];
    }
  }, [user?.id]);

  // Set up real-time subscriptions for DMs
  useEffect(() => {
    if (!user?.id || !selectedUser) return;

    const setupRealtimeSubscription = async () => {
      const roomId = await getOrCreateDMRoom(selectedUser.id);
      if (!roomId) return;

      const channel = supabase
        .channel(`dm-${roomId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'messages',
            filter: `chat_room_id=eq.${roomId}`
          },
          async (payload) => {
            // Get user profile for the new message
            const { data: profileData } = await supabase
              .from('profiles')
              .select('name, email')
              .eq('id', payload.new.user_id)
              .single();

            const messageWithProfile: Message = {
              id: payload.new.id,
              chat_room_id: payload.new.chat_room_id,
              user_id: payload.new.user_id,
              content: payload.new.content,
              message_type: payload.new.message_type as 'text' | 'file' | 'image',
              file_url: payload.new.file_url,
              created_at: payload.new.created_at,
              updated_at: payload.new.updated_at,
              user_profile: profileData || undefined
            };

            setMessages(prev => [...prev, messageWithProfile]);
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupRealtimeSubscription();
  }, [user?.id, selectedUser, getOrCreateDMRoom]);

  // Initial data fetch
  useEffect(() => {
    const loadInitialData = async () => {
      setLoading(true);
      await fetchDMUsers();
      setLoading(false);
    };

    if (user?.id) {
      loadInitialData();
    }
  }, [user?.id, fetchDMUsers]);

  return {
    dmUsers,
    selectedUser,
    setSelectedUser,
    messages,
    loading,
    sending,
    sendDMMessage,
    fetchDMMessages,
    searchUsers
  };
};
