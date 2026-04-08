
-- Create a SECURITY DEFINER function to check conversation membership without triggering RLS
CREATE OR REPLACE FUNCTION public.is_conversation_member(_conversation_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_id = _conversation_id AND user_id = _user_id
  )
$$;

-- Drop the recursive SELECT policy
DROP POLICY IF EXISTS "Users can view participants of own conversations" ON public.conversation_participants;

-- Create a non-recursive SELECT policy
CREATE POLICY "Users can view participants of own conversations"
ON public.conversation_participants
FOR SELECT
USING (
  user_id = auth.uid()
  OR public.is_conversation_member(conversation_id, auth.uid())
  OR is_admin()
);

-- Fix conversations SELECT policy too (it references conversation_participants causing recursion)
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
CREATE POLICY "Users can view own conversations"
ON public.conversations
FOR SELECT
USING (
  public.is_conversation_member(id, auth.uid())
  OR is_admin()
);

-- Fix conversations UPDATE policy
DROP POLICY IF EXISTS "Users can update own conversations" ON public.conversations;
CREATE POLICY "Users can update own conversations"
ON public.conversations
FOR UPDATE
USING (
  public.is_conversation_member(id, auth.uid())
  OR is_admin()
);

-- Fix messages SELECT policy
DROP POLICY IF EXISTS "Users can view messages in own conversations" ON public.messages;
CREATE POLICY "Users can view messages in own conversations"
ON public.messages
FOR SELECT
USING (
  public.is_conversation_member(conversation_id, auth.uid())
  OR is_admin()
);

-- Fix messages INSERT policy
DROP POLICY IF EXISTS "Users can send messages" ON public.messages;
CREATE POLICY "Users can send messages"
ON public.messages
FOR INSERT
WITH CHECK (
  sender_id = auth.uid()
  AND public.is_conversation_member(conversation_id, auth.uid())
);

-- Fix messages UPDATE policy
DROP POLICY IF EXISTS "Users can update own messages" ON public.messages;
CREATE POLICY "Users can update own messages"
ON public.messages
FOR UPDATE
USING (
  public.is_conversation_member(conversation_id, auth.uid())
  OR is_admin()
);
