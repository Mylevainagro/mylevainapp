-- Créer le bucket photos dans Supabase Storage
-- NOTE : à exécuter dans le SQL Editor de Supabase
INSERT INTO storage.buckets (id, name, public) VALUES ('photos', 'photos', true);

-- Policy : tout le monde peut upload et lire
CREATE POLICY "allow_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'photos');
CREATE POLICY "allow_read" ON storage.objects FOR SELECT USING (bucket_id = 'photos');
CREATE POLICY "allow_delete" ON storage.objects FOR DELETE USING (bucket_id = 'photos');
