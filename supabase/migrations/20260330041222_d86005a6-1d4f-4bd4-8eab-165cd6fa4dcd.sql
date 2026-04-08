-- Update is_admin to include both admin emails
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM auth.users WHERE id = auth.uid() AND email IN ('ymhmad834@gmail.com', 'siruseif123@gmail.com')
  )
$$;

-- Update check_username_length to include both admin emails
CREATE OR REPLACE FUNCTION public.check_username_length()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NEW.username IS NOT NULL AND length(NEW.username) < 6 THEN
    IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = NEW.user_id AND email IN ('ymhmad834@gmail.com', 'siruseif123@gmail.com')) THEN
      RAISE EXCEPTION 'Username must be at least 6 characters';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Create wallets table
CREATE TABLE public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  balance_usd numeric(12,2) NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own wallet" ON public.wallets FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Admin can view all wallets" ON public.wallets FOR SELECT USING (is_admin());
CREATE POLICY "Admin can update all wallets" ON public.wallets FOR UPDATE USING (is_admin());
CREATE POLICY "Users can insert own wallet" ON public.wallets FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create withdrawals table
CREATE TABLE public.withdrawals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  amount_usd numeric(12,2) NOT NULL DEFAULT 0,
  vodafone_number text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.withdrawals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own withdrawals" ON public.withdrawals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own withdrawals" ON public.withdrawals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admin can view all withdrawals" ON public.withdrawals FOR SELECT USING (is_admin());
CREATE POLICY "Admin can update all withdrawals" ON public.withdrawals FOR UPDATE USING (is_admin());

-- Trigger for wallets updated_at
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON public.wallets FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Admin can delete tracks
CREATE POLICY "Admin can delete tracks" ON public.tracks FOR DELETE USING (is_admin());

-- Update handle_new_user to also create wallet
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''));
  INSERT INTO public.wallets (user_id)
  VALUES (NEW.id);
  RETURN NEW;
END;
$$;