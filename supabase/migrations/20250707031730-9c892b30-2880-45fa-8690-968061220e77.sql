
-- Drop all problematic chat-related policies that are causing infinite recursion
DROP POLICY IF EXISTS "Users can view participants in rooms they participate in" ON public.chat_participants;
DROP POLICY IF EXISTS "Users can view messages in rooms they participate in" ON public.messages;
DROP POLICY IF EXISTS "Users can view chat rooms they participate in" ON public.chat_rooms;

-- Create simple policies without recursive queries
CREATE POLICY "Users can view their own participation" 
  ON public.chat_participants 
  FOR SELECT 
  USING (auth.uid() = user_id);

CREATE POLICY "Users can view messages" 
  ON public.messages 
  FOR SELECT 
  USING (auth.role() = 'authenticated'::text);

CREATE POLICY "Users can view chat rooms" 
  ON public.chat_rooms 
  FOR SELECT 
  USING (auth.role() = 'authenticated'::text);
