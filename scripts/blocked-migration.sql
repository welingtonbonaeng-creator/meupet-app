-- Adiciona flag de bloqueio de acesso em profiles (MeuPet+)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS blocked BOOLEAN NOT NULL DEFAULT false;
