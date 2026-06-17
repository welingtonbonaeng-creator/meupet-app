// Script de migração para criar estrutura admin no Supabase
// node scripts/admin-migration.js
const { Client } = require('pg')

const client = new Client({
  host:     'db.wwoasqjidsrplkpwjsro.supabase.co',
  port:     5432,
  database: 'postgres',
  user:     'postgres',
  password: 'Ragn@r079646',
  ssl:      { rejectUnauthorized: false },
})

const SQL = `
-- 1. Adicionar colunas role e email em profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role  TEXT DEFAULT 'user' CHECK (role IN ('user','admin'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 2. Atualizar trigger para salvar email
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

-- 3. Backfill emails dos usuários existentes
UPDATE profiles p SET email = u.email
FROM auth.users u WHERE p.id = u.id AND p.email IS NULL;

-- 4. Setar admin@meupet.com como admin
UPDATE profiles SET role = 'admin' WHERE email = 'admin@meupet.com';

-- 5. Função helper is_admin (SECURITY DEFINER para evitar recursão)
CREATE OR REPLACE FUNCTION is_admin() RETURNS BOOLEAN AS $$
  SELECT EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin');
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 6. Tabela de tickets de suporte
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

-- 7. Políticas RLS para admin
-- Profiles: admin lê e atualiza todos
DROP POLICY IF EXISTS "admins read all profiles"   ON profiles;
DROP POLICY IF EXISTS "admins update all profiles" ON profiles;
CREATE POLICY "admins read all profiles"   ON profiles FOR SELECT USING (auth.uid() = id OR is_admin());
CREATE POLICY "admins update all profiles" ON profiles FOR UPDATE USING (auth.uid() = id OR is_admin());

-- Pets: admin lê todos
DROP POLICY IF EXISTS "admins read all pets" ON pets;
CREATE POLICY "admins read all pets" ON pets FOR SELECT USING (auth.uid() = user_id OR is_admin());

-- Tickets: usuário gerencia próprio, admin gerencia todos
DROP POLICY IF EXISTS "manage own tickets" ON support_tickets;
CREATE POLICY "manage own tickets" ON support_tickets FOR ALL TO authenticated
  USING (auth.uid() = user_id OR is_admin())
  WITH CHECK (auth.uid() = user_id OR is_admin());
`

async function run() {
  try {
    await client.connect()
    console.log('Conectado ao Supabase...')
    await client.query(SQL)
    console.log('✅ Migração concluída com sucesso!')
    console.log('   - Coluna role e email adicionadas em profiles')
    console.log('   - Emails backfilled dos usuários existentes')
    console.log('   - admin@meupet.com definido como admin')
    console.log('   - Tabela support_tickets criada')
    console.log('   - Políticas RLS de admin configuradas')
  } catch (err) {
    console.error('❌ Erro:', err.message)
  } finally {
    await client.end()
  }
}

run()
