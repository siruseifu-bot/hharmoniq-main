
INSERT INTO storage.buckets (id, name, public) VALUES ('voice-messages', 'voice-messages', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Authenticated users can upload voice messages"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'voice-messages');

CREATE POLICY "Public can read voice messages"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'voice-messages');
