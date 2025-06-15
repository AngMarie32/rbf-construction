
export interface ChatRoom {
  id: string;
  name: string;
  type: 'general' | 'project' | 'page';
  context_id?: string;
  context_type?: string;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface Message {
  id: string;
  chat_room_id: string;
  user_id: string;
  content: string;
  message_type: 'text' | 'file' | 'image';
  file_url?: string;
  created_at: string;
  updated_at: string;
  user_profile?: {
    name: string;
    email: string;
  };
}

export interface ChatParticipant {
  id: string;
  chat_room_id: string;
  user_id: string;
  joined_at: string;
  last_read_at: string;
}
