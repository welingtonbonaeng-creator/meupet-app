ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'user' CHECK (role IN ('user','admin'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)),
    NEW.email
  )
  ON CONFLICT (id) DO UPDATE SET email = EXCLUDED.email;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

UPDATE profiles p SET email = u.email
FROM auth.users u WHERE p.id = u.id AND p.email IS NULL;

UPDATE profiles SET role = 'admin' WHERE email = 'admin@meupet.com';

CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE TABLE IF NOT EXISTS support_tickets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  subject     TEXT NOT NULL,
  message     TEXT NOT NULL,
  status      TEXT DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved')),
  priority    TEXT DEFAULT 'normal' CHECK (priority IN ('low','normal','high')),
  admin_reply TEXT,
  replied_at  TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

DROP TRIGGER IF EXISTS set_tickets_updated_at ON support_tickets;
CREATE TRIGGER set_tickets_updated_at
  BEFORE UPDATE ON support_tickets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP POLICY IF EXISTS "admins read all profiles"   ON profiles;
DROP POLICY IF EXISTS "admins update all profiles" ON profiles;
CREATE POLICY "admins read all profiles"   ON profiles FOR SELECT USING (auth.uid() = id OR is_admin());
CREATE POLICY "admins update all profiles" ON profiles FOR UPDATE USING (auth.uid() = id OR is_admin());

DROP POLICY IF EXISTS "admins read all pets" ON pets;
CREATE POLICY "admins read all pets" ON pets FOR SELECT USING (auth.uid() = user_id OR is_admin());

DROP POLICY IF EXISTS "manage own tickets" ON support_tickets;
CREATE POLICY "manage own tickets" ON support_tickets FOR ALL TO authenticated
  USING (auth.uid() = user_id OR is_admin())
  WITH CHECK (auth.uid() = user_id OR is_admin());
