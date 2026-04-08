
-- Follows table
CREATE TABLE public.follows (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  follower_id uuid NOT NULL,
  following_id uuid NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(follower_id, following_id)
);

ALTER TABLE public.follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view follows" ON public.follows FOR SELECT USING (true);
CREATE POLICY "Users can follow" ON public.follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY "Users can unfollow" ON public.follows FOR DELETE USING (auth.uid() = follower_id);

-- Add verification fields to verification_requests
ALTER TABLE public.verification_requests
  ADD COLUMN IF NOT EXISTS spotify_url text,
  ADD COLUMN IF NOT EXISTS id_front_url text,
  ADD COLUMN IF NOT EXISTS id_back_url text,
  ADD COLUMN IF NOT EXISTS badge_color text DEFAULT 'blue';

-- Add badge_color to profiles for admin to set pink or blue
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS badge_color text DEFAULT 'blue';

-- Enable realtime for follows
ALTER PUBLICATION supabase_realtime ADD TABLE public.follows;

-- Storage bucket for ID documents
INSERT INTO storage.buckets (id, name, public) VALUES ('id-documents', 'id-documents', false) ON CONFLICT DO NOTHING;

-- RLS for id-documents bucket
CREATE POLICY "Users can upload own ID docs" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'id-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Users can view own ID docs" ON storage.objects FOR SELECT USING (bucket_id = 'id-documents' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Admin can view all ID docs" ON storage.objects FOR SELECT USING (bucket_id = 'id-documents' AND public.is_admin());
