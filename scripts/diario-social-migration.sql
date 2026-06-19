-- Feed social do diário
CREATE TABLE IF NOT EXISTS pet_posts (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pet_id      UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  caption     TEXT,
  media_url   TEXT,
  media_type  TEXT NOT NULL DEFAULT 'note' CHECK (media_type IN ('image', 'video', 'note')),
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pet_posts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users own posts" ON pet_posts;
CREATE POLICY "users own posts" ON pet_posts FOR ALL
  USING (EXISTS (SELECT 1 FROM pets WHERE pets.id = pet_id AND pets.user_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_posts_pet_id     ON pet_posts(pet_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON pet_posts(created_at DESC);

-- Bucket de mídia (idempotente)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'pet-media', 'pet-media', true, 52428800,
  ARRAY['image/jpeg','image/png','image/webp','image/gif','video/mp4','video/webm','video/quicktime']
) ON CONFLICT (id) DO NOTHING;

-- Políticas de storage
DROP POLICY IF EXISTS "auth upload pet media"  ON storage.objects;
CREATE POLICY "auth upload pet media"  ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'pet-media');

DROP POLICY IF EXISTS "public read pet media"  ON storage.objects;
CREATE POLICY "public read pet media"  ON storage.objects
  FOR SELECT USING (bucket_id = 'pet-media');

DROP POLICY IF EXISTS "own delete pet media"   ON storage.objects;
CREATE POLICY "own delete pet media"   ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'pet-media' AND (storage.foldername(name))[1] = auth.uid()::text);
