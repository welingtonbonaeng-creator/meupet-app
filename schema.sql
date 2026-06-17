-- ═══════════════════════════════════════════════════
-- MeuPet+ — Schema Supabase PostgreSQL
-- ═══════════════════════════════════════════════════

-- Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── PROFILES (complementa auth.users) ───────────────
CREATE TABLE IF NOT EXISTS profiles (
  id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  phone       TEXT,
  city        TEXT,
  state       TEXT,
  avatar_url  TEXT,
  plan        TEXT NOT NULL DEFAULT 'free' CHECK (plan IN ('free','family','premium')),
  trial_ends_at TIMESTAMPTZ,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PETS ─────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pets (
  id            UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id       UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  species       TEXT NOT NULL CHECK (species IN ('dog','cat','bird','rabbit','fish','hamster','other')),
  breed         TEXT,
  sex           TEXT CHECK (sex IN ('male','female')),
  birth_date    DATE,
  weight_kg     NUMERIC(5,2),
  ideal_weight  NUMERIC(5,2),
  neutered      BOOLEAN DEFAULT FALSE,
  microchip     TEXT,
  color         TEXT,
  vet_name      TEXT,
  vet_phone     TEXT,
  notes         TEXT,
  photo_url     TEXT,
  active        BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW(),
  updated_at    TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PESO HISTÓRICO ───────────────────────────────────
CREATE TABLE IF NOT EXISTS pet_weight_history (
  id         UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pet_id     UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  weight_kg  NUMERIC(5,2) NOT NULL,
  notes      TEXT,
  measured_at DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── DIÁRIO (eventos gerais) ──────────────────────────
CREATE TABLE IF NOT EXISTS pet_diary (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pet_id       UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  type         TEXT NOT NULL CHECK (type IN ('vaccine','deworming','appointment','grooming','bath','surgery','medication','exam','weight','note','other')),
  title        TEXT NOT NULL,
  description  TEXT,
  occurred_at  DATE NOT NULL,
  next_date    DATE,
  cost_brl     NUMERIC(10,2),
  vet_name     TEXT,
  product_name TEXT,
  document_url TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW(),
  updated_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── NOTIFICAÇÕES ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id      UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pet_id       UUID REFERENCES pets(id) ON DELETE CASCADE,
  diary_id     UUID REFERENCES pet_diary(id) ON DELETE CASCADE,
  title        TEXT NOT NULL,
  body         TEXT,
  type         TEXT NOT NULL DEFAULT 'reminder',
  scheduled_at TIMESTAMPTZ NOT NULL,
  sent         BOOLEAN DEFAULT FALSE,
  read         BOOLEAN DEFAULT FALSE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── RELATÓRIOS DE NUTRIÇÃO (cache IA) ───────────────
CREATE TABLE IF NOT EXISTS nutrition_reports (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pet_id       UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  weight_kg    NUMERIC(5,2),
  age_months   INT,
  activity     TEXT,
  food_type    TEXT,
  report_json  JSONB,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PLANOS DE ADESTRAMENTO (cache IA) ───────────────
CREATE TABLE IF NOT EXISTS training_plans (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pet_id      UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  problem     TEXT NOT NULL,
  plan_7d     JSONB,
  plan_30d    JSONB,
  active      BOOLEAN DEFAULT TRUE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── PERSONALIDADE (cache IA) ─────────────────────────
CREATE TABLE IF NOT EXISTS pet_personality (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pet_id          UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  profile_text    TEXT,
  nicknames       TEXT[],
  fun_facts       TEXT[],
  certificate_url TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ─── GASTOS ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS pet_expenses (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pet_id       UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  category     TEXT NOT NULL CHECK (category IN ('vet','food','grooming','medicine','accessory','vaccine','exam','other')),
  title        TEXT NOT NULL DEFAULT '',
  description  TEXT,
  notes        TEXT,
  amount_brl   NUMERIC(10,2) NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── DOCUMENTOS (exames, receitas) ───────────────────
CREATE TABLE IF NOT EXISTS pet_documents (
  id           UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  pet_id       UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  diary_id     UUID REFERENCES pet_diary(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  file_url     TEXT NOT NULL,
  file_type    TEXT,
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

-- ─── ASSINATURAS ──────────────────────────────────────
CREATE TABLE IF NOT EXISTS subscriptions (
  id                  UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id             UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  plan                TEXT NOT NULL CHECK (plan IN ('free','family','premium')),
  status              TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active','canceled','past_due','trialing')),
  price_brl           NUMERIC(10,2),
  billing_interval    TEXT CHECK (billing_interval IN ('monthly','yearly')),
  current_period_start TIMESTAMPTZ,
  current_period_end   TIMESTAMPTZ,
  payment_provider    TEXT,
  provider_sub_id     TEXT,
  created_at          TIMESTAMPTZ DEFAULT NOW(),
  updated_at          TIMESTAMPTZ DEFAULT NOW()
);

-- ─── LOGS DE AUDITORIA ────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID REFERENCES profiles(id) ON DELETE SET NULL,
  action      TEXT NOT NULL,
  table_name  TEXT NOT NULL,
  record_id   UUID,
  old_data    JSONB,
  new_data    JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

-- ─── CONCLUSÕES DE ADESTRAMENTO ───────────────────────
CREATE TABLE IF NOT EXISTS training_completions (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id        UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pet_id         UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  semana         INT NOT NULL,
  exercicio_idx  INT NOT NULL,
  exercicio_nome TEXT NOT NULL,
  completed_at   DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at     TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (user_id, pet_id, semana, exercicio_idx)
);

-- ═══════════════════════════════════════════════════════
-- FUNÇÕES E TRIGGERS
-- ═══════════════════════════════════════════════════════

-- Auto-criar perfil ao registrar usuário
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Auto-atualizar updated_at
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_profiles_updated_at   BEFORE UPDATE ON profiles   FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_pets_updated_at       BEFORE UPDATE ON pets       FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_diary_updated_at      BEFORE UPDATE ON pet_diary  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER set_sub_updated_at        BEFORE UPDATE ON subscriptions FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Auto-criar notificação ao adicionar próxima data no diário
CREATE OR REPLACE FUNCTION create_diary_notification()
RETURNS TRIGGER AS $$
DECLARE
  _user_id UUID;
  _pet_name TEXT;
BEGIN
  IF NEW.next_date IS NOT NULL AND (OLD IS NULL OR OLD.next_date IS DISTINCT FROM NEW.next_date) THEN
    SELECT p.user_id, p.name INTO _user_id, _pet_name FROM pets p WHERE p.id = NEW.pet_id;
    INSERT INTO notifications (user_id, pet_id, diary_id, title, body, type, scheduled_at)
    VALUES (
      _user_id, NEW.pet_id, NEW.id,
      'Lembrete: ' || NEW.title,
      _pet_name || ' tem ' || NEW.title || ' em ' || TO_CHAR(NEW.next_date, 'DD/MM/YYYY'),
      'reminder',
      (NEW.next_date - INTERVAL '2 days')::TIMESTAMPTZ
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER diary_notification_trigger
  AFTER INSERT OR UPDATE ON pet_diary
  FOR EACH ROW EXECUTE FUNCTION create_diary_notification();

-- ═══════════════════════════════════════════════════════
-- ROW LEVEL SECURITY
-- ═══════════════════════════════════════════════════════

ALTER TABLE profiles             ENABLE ROW LEVEL SECURITY;
ALTER TABLE pets                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_weight_history   ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_diary            ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications        ENABLE ROW LEVEL SECURITY;
ALTER TABLE nutrition_reports    ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_plans       ENABLE ROW LEVEL SECURITY;
ALTER TABLE training_completions ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_personality      ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_expenses         ENABLE ROW LEVEL SECURITY;
ALTER TABLE pet_documents        ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions        ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs           ENABLE ROW LEVEL SECURITY;

-- Profiles
DROP POLICY IF EXISTS "users can read own profile"   ON profiles;
DROP POLICY IF EXISTS "users can update own profile" ON profiles;
DROP POLICY IF EXISTS "service_role bypass profiles" ON profiles;
CREATE POLICY "users can read own profile"   ON profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "users can update own profile" ON profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "service_role bypass profiles" ON profiles TO service_role USING (true) WITH CHECK (true);

-- Pets
DROP POLICY IF EXISTS "users own pets" ON pets;
CREATE POLICY "users own pets" ON pets FOR ALL USING (auth.uid() = user_id);

-- Pet data (via pet ownership)
DROP POLICY IF EXISTS "users own weight history" ON pet_weight_history;
CREATE POLICY "users own weight history" ON pet_weight_history FOR ALL
  USING (EXISTS (SELECT 1 FROM pets WHERE pets.id = pet_id AND pets.user_id = auth.uid()));

DROP POLICY IF EXISTS "users own diary" ON pet_diary;
CREATE POLICY "users own diary" ON pet_diary FOR ALL
  USING (EXISTS (SELECT 1 FROM pets WHERE pets.id = pet_id AND pets.user_id = auth.uid()));

DROP POLICY IF EXISTS "users own notifications" ON notifications;
CREATE POLICY "users own notifications" ON notifications FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "users own nutrition" ON nutrition_reports;
CREATE POLICY "users own nutrition" ON nutrition_reports FOR ALL
  USING (EXISTS (SELECT 1 FROM pets WHERE pets.id = pet_id AND pets.user_id = auth.uid()));

DROP POLICY IF EXISTS "users own training" ON training_plans;
CREATE POLICY "users own training" ON training_plans FOR ALL
  USING (EXISTS (SELECT 1 FROM pets WHERE pets.id = pet_id AND pets.user_id = auth.uid()));

DROP POLICY IF EXISTS "users manage own completions" ON training_completions;
CREATE POLICY "users manage own completions" ON training_completions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "users own personality" ON pet_personality;
CREATE POLICY "users own personality" ON pet_personality FOR ALL
  USING (EXISTS (SELECT 1 FROM pets WHERE pets.id = pet_id AND pets.user_id = auth.uid()));

DROP POLICY IF EXISTS "users own expenses" ON pet_expenses;
CREATE POLICY "users own expenses" ON pet_expenses FOR ALL
  USING (EXISTS (SELECT 1 FROM pets WHERE pets.id = pet_id AND pets.user_id = auth.uid()));

DROP POLICY IF EXISTS "users own documents" ON pet_documents;
CREATE POLICY "users own documents" ON pet_documents FOR ALL
  USING (EXISTS (SELECT 1 FROM pets WHERE pets.id = pet_id AND pets.user_id = auth.uid()));

DROP POLICY IF EXISTS "users own subscriptions" ON subscriptions;
CREATE POLICY "users own subscriptions" ON subscriptions FOR ALL USING (auth.uid() = user_id);

-- ═══════════════════════════════════════════════════════
-- ÍNDICES DE PERFORMANCE
-- ═══════════════════════════════════════════════════════
CREATE INDEX idx_pets_user_id         ON pets(user_id);
CREATE INDEX idx_diary_pet_id         ON pet_diary(pet_id);
CREATE INDEX idx_diary_next_date      ON pet_diary(next_date) WHERE next_date IS NOT NULL;
CREATE INDEX idx_weight_pet_id        ON pet_weight_history(pet_id);
CREATE INDEX idx_notifications_user   ON notifications(user_id, sent, read);
CREATE INDEX idx_expenses_pet_id      ON pet_expenses(pet_id);
CREATE INDEX idx_expenses_date        ON pet_expenses(expense_date);
