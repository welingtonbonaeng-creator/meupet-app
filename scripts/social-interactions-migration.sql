-- Curtidas em posts do diário
CREATE TABLE IF NOT EXISTS pet_post_likes (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id    UUID NOT NULL REFERENCES pet_posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(post_id, user_id)
);

ALTER TABLE pet_post_likes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own likes" ON pet_post_likes;
CREATE POLICY "own likes" ON pet_post_likes FOR ALL USING (user_id = auth.uid());

-- Comentários/notas em posts do diário
CREATE TABLE IF NOT EXISTS pet_post_comments (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id    UUID NOT NULL REFERENCES pet_posts(id) ON DELETE CASCADE,
  user_id    UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content    TEXT NOT NULL CHECK (char_length(content) <= 300),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE pet_post_comments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own comments" ON pet_post_comments;
CREATE POLICY "own comments" ON pet_post_comments FOR ALL USING (user_id = auth.uid());

CREATE INDEX IF NOT EXISTS idx_likes_post_id    ON pet_post_likes(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON pet_post_comments(post_id);
