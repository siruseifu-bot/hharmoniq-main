
-- Fix conversations RLS: drop broken policies and recreate
DROP POLICY IF EXISTS "Users can view own conversations" ON public.conversations;
DROP POLICY IF EXISTS "Users can create conversations" ON public.conversations;

CREATE POLICY "Users can view own conversations" ON public.conversations
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = conversations.id
    AND conversation_participants.user_id = auth.uid()
  ) OR is_admin()
);

CREATE POLICY "Users can create conversations" ON public.conversations
FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update own conversations" ON public.conversations
FOR UPDATE USING (
  EXISTS (
    SELECT 1 FROM conversation_participants
    WHERE conversation_participants.conversation_id = conversations.id
    AND conversation_participants.user_id = auth.uid()
  ) OR is_admin()
);

-- Fix conversation_participants RLS
DROP POLICY IF EXISTS "Users can view participants of own conversations" ON public.conversation_participants;

CREATE POLICY "Users can view participants of own conversations" ON public.conversation_participants
FOR SELECT USING (
  user_id = auth.uid() OR
  EXISTS (
    SELECT 1 FROM conversation_participants cp2
    WHERE cp2.conversation_id = conversation_participants.conversation_id
    AND cp2.user_id = auth.uid()
  ) OR is_admin()
);

-- Site settings table for news ticker
CREATE TABLE public.site_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  value jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view site_settings" ON public.site_settings FOR SELECT USING (true);
CREATE POLICY "Admin can insert site_settings" ON public.site_settings FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "Admin can update site_settings" ON public.site_settings FOR UPDATE USING (is_admin());

-- Insert default ticker setting
INSERT INTO public.site_settings (key, value) VALUES ('news_ticker', '{"enabled": false, "text": ""}'::jsonb);

ALTER PUBLICATION supabase_realtime ADD TABLE public.site_settings;
