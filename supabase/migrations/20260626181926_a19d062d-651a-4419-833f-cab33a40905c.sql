
CREATE POLICY "Public can read media" ON storage.objects FOR SELECT TO anon, authenticated USING (bucket_id = 'media');
CREATE POLICY "Authenticated can upload media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'media' AND (storage.foldername(name))[1] = (select auth.uid())::text);
CREATE POLICY "Anon can upload media to upload sessions" ON storage.objects FOR INSERT TO anon WITH CHECK (bucket_id = 'media');
CREATE POLICY "Owners can update own media" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'media' AND (storage.foldername(name))[1] = (select auth.uid())::text);
CREATE POLICY "Owners can delete own media" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'media' AND (storage.foldername(name))[1] = (select auth.uid())::text);
