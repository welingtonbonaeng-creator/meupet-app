# Regras de Banco de Dados — MeuPet+

## Como o banco funciona

O banco de dados fica **no Supabase** (projeto `wwoasqjidsrplkpwjsro`).  
O deploy no GitHub Pages **nunca toca o banco** — só substitui arquivos HTML/JS.  
Os dados dos usuários são independentes de qualquer deploy.

## Regras obrigatórias ao modificar o banco

### NUNCA usar
```sql
DROP TABLE nome;          -- apaga todos os dados dos usuários
TRUNCATE nome;            -- apaga todos os dados dos usuários
DELETE FROM nome;         -- sem WHERE apaga tudo
ALTER TABLE nome DROP COLUMN coluna;  -- perde dados da coluna
```

### SEMPRE usar (padrão seguro)
```sql
-- Adicionar tabela nova
CREATE TABLE IF NOT EXISTS nova_tabela (...);

-- Adicionar coluna nova
ALTER TABLE tabela ADD COLUMN IF NOT EXISTS coluna TEXT;

-- Adicionar política RLS
DROP POLICY IF EXISTS "nome" ON tabela;
CREATE POLICY "nome" ON tabela FOR ALL USING (...);

-- Remover dado específico (com WHERE obrigatório)
DELETE FROM tabela WHERE id = 'uuid-especifico';
```

## Como aplicar mudanças no banco

Usar a API REST do Supabase (nunca rodar `schema.sql` diretamente no banco — ele já existe):

```powershell
# Exemplo: adicionar coluna nova
$body = @{ query = "ALTER TABLE pets ADD COLUMN IF NOT EXISTS nova_coluna TEXT;" } | ConvertTo-Json
Invoke-RestMethod -Method POST `
  -Uri "https://wwoasqjidsrplkpwjsro.supabase.co/rest/v1/rpc/exec_sql" `
  -Headers @{ "apikey" = "sb_publishable_1ArtUvOrkSjOgXlDZln2EQ_5gOlLLfo"; "Authorization" = "Bearer SERVICE_ROLE_KEY" } `
  -Body $body -ContentType "application/json"
```

Ou via **SQL Editor** no painel: https://supabase.com/dashboard/project/wwoasqjidsrplkpwjsro/editor

## Tabelas existentes (não apagar)

| Tabela | Dados |
|--------|-------|
| `profiles` | Perfil dos usuários |
| `pets` | Pets cadastrados |
| `pet_weight_history` | Histórico de peso |
| `pet_diary` | Diário de saúde (vacinas, consultas...) |
| `notifications` | Notificações geradas |
| `nutrition_reports` | Cache dos planos de nutrição IA |
| `training_plans` | Cache dos planos de adestramento IA |
| `training_completions` | Quais exercícios foram concluídos |
| `pet_personality` | Cache das análises de personalidade IA |
| `pet_expenses` | Gastos com os pets |
| `pet_documents` | Documentos e exames |
| `subscriptions` | Assinaturas dos usuários |
| `audit_logs` | Logs de auditoria |
