
import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import type { ChatRoom, Message } from '@/types/chat';

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
          *,
          chat_participants!inner(user_id),
          messages(
            id,
            content,
            created_at,
            user_id,
            user_profile:profiles(name, email)
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
        // Get the other participant in this DM
        const { data: participants } = await supabase
          .from('chat_participants')
          .select('user_id, profiles(id, name, email)')
          .eq('chat_room_id', room.id)
          .neq('user_id', user.id);

        if (participants && participants.length > 0) {
          const otherUser = participants[0].profiles;
          if (otherUser) {
            const lastMessage = room.messages?.[0];
            users.push({
              id: otherUser.id,
              name: otherUser.name || otherUser.email,
              email: otherUser.email,
              lastMessage: lastMessage ? {
                ...lastMessage,
                user_profile: lastMessage.user_profile
              } : undefined
            });
          }
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
          *,
          user_profile:profiles(name, email)
        `)
        .eq('chat_room_id', roomId)
        .order('created_at', { ascending: true });

      if (error) {
        console.error('Error fetching DM messages:', error);
        return;
      }

      setMessages(messagesData || []);
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

            const messageWithProfile = {
              ...payload.new,
              user_profile: profileData || undefined
            } as Message;

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
