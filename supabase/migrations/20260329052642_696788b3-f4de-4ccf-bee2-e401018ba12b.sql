
-- Add new columns to profiles
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS avatar_url TEXT,
  ADD COLUMN IF NOT EXISTS cover_url TEXT,
  ADD COLUMN IF NOT EXISTS bio TEXT,
  ADD COLUMN IF NOT EXISTS username TEXT,
  ADD COLUMN IF NOT EXISTS is_verified BOOLEAN NOT NULL DEFAULT false;

-- Unique constraint on username
ALTER TABLE public.profiles ADD CONSTRAINT profiles_username_unique UNIQUE (username);

-- Username length check (min 6 chars, except admin)
CREATE OR REPLACE FUNCTION public.check_username_length()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.username IS NOT NULL AND length(NEW.username) < 6 THEN
    -- Allow admin to have short username
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.user_id AND email = 'ymhmad834@gmail.com') THEN
      RAISE EXCEPTION 'Username must be at least 6 characters';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER check_username_before_insert_update
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.check_username_length();

-- Allow public to view activated profiles (for search/discovery)
CREATE POLICY "Public can view activated profiles" ON public.profiles
  FOR SELECT USING (is_activated = true);

-- Verification requests table
CREATE TABLE public.verification_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, status)
);

ALTER TABLE public.verification_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own verification requests" ON public.verification_requests
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own verification requests" ON public.verification_requests
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin can view all verification requests" ON public.verification_requests
  FOR SELECT USING (public.is_admin());
CREATE POLICY "Admin can update all verification requests" ON public.verification_requests
  FOR UPDATE USING (public.is_admin());

-- Allow public to view live tracks (for profile pages)
CREATE POLICY "Public can view live tracks" ON public.tracks
  FOR SELECT USING (status = 'live');

-- Storage policies for avatar and cover uploads
CREATE POLICY "Auth users can upload to covers bucket" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'covers' AND auth.role() = 'authenticated');
