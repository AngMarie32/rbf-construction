
-- First, let's ensure the profiles table can be properly joined
-- Add foreign key constraints if they don't exist
ALTER TABLE chat_participants 
ADD CONSTRAINT fk_chat_participants_user_id 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Add foreign key for messages to profiles
ALTER TABLE messages 
ADD CONSTRAINT fk_messages_user_id 
FOREIGN KEY (user_id) REFERENCES profiles(id) ON DELETE CASCADE;

-- Add foreign key for chat_rooms
ALTER TABLE chat_rooms 
ADD CONSTRAINT fk_chat_rooms_created_by 
FOREIGN KEY (created_by) REFERENCES profiles(id) ON DELETE CASCADE;

-- Add foreign key for chat_participants to chat_rooms
ALTER TABLE chat_participants 
ADD CONSTRAINT fk_chat_participants_room_id 
FOREIGN KEY (chat_room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE;

-- Add foreign key for messages to chat_rooms
ALTER TABLE messages 
ADD CONSTRAINT fk_messages_room_id 
FOREIGN KEY (chat_room_id) REFERENCES chat_rooms(id) ON DELETE CASCADE;
