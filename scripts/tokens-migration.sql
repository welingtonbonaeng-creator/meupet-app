-- ═══════════════════════════════════════════════════════
-- MeuPet+ — Sistema de tokens de convite
-- Rodar no Supabase SQL Editor (Dashboard > SQL Editor)
-- ═══════════════════════════════════════════════════════

-- 1. Tokens de convite (gerados pelo admin, usados 1x pelo cliente)
CREATE TABLE IF NOT EXISTS invite_tokens (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  token      TEXT        NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  notes      TEXT,
  created_by UUID        REFERENCES auth.users(id),
  used_by    UUID        REFERENCES auth.users(id),
  used_at    TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '7 days',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE invite_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_check_token"        ON invite_tokens;
DROP POLICY IF EXISTS "admin_manage_tokens"     ON invite_tokens;

-- Anon pode verificar se token é válido (para a tela de cadastro)
CREATE POLICY "anon_check_token" ON invite_tokens
  FOR SELECT TO anon
  USING (used_at IS NULL AND expires_at > NOW());

-- Admin tem acesso total
CREATE POLICY "admin_manage_tokens" ON invite_tokens
  FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());

-- 2. Solicitações de acesso (formulário pré-cadastro, sem login)
CREATE TABLE IF NOT EXISTS token_requests (
  id         UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name       TEXT        NOT NULL,
  email      TEXT        NOT NULL,
  phone      TEXT,
  status     TEXT        NOT NULL DEFAULT 'pending'
               CHECK (status IN ('pending', 'token_sent', 'rejected')),
  token_id   UUID        REFERENCES invite_tokens(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE token_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_create_requests"    ON token_requests;
DROP POLICY IF EXISTS "admin_manage_requests"   ON token_requests;

-- Qualquer pessoa pode enviar uma solicitação (pré-cadastro)
CREATE POLICY "anon_create_requests" ON token_requests
  FOR INSERT TO anon WITH CHECK (true);

-- Admin tem acesso total
CREATE POLICY "admin_manage_requests" ON token_requests
  FOR ALL TO authenticated
  USING (is_admin()) WITH CHECK (is_admin());
