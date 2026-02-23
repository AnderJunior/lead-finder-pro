-- ============================================================
-- Migration: SaaS Multi-Tenant
-- Adiciona empresa_id em todas as tabelas para isolamento
-- por empresa (multi-tenancy).
-- ============================================================

BEGIN;

-- ─── 1. Garantir que existe ao menos uma empresa ────────────

INSERT INTO configuracoes_empresa (nome, updated_at)
SELECT 'Empresa Padrão', now()
WHERE NOT EXISTS (SELECT 1 FROM configuracoes_empresa LIMIT 1);

-- ─── 2. Adicionar coluna empresa_id (nullable primeiro) ─────

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS empresa_id bigint REFERENCES configuracoes_empresa(id);

ALTER TABLE configuracoes_integracoes
  ADD COLUMN IF NOT EXISTS empresa_id bigint REFERENCES configuracoes_empresa(id);

ALTER TABLE leads_captados
  ADD COLUMN IF NOT EXISTS empresa_id bigint REFERENCES configuracoes_empresa(id);

ALTER TABLE buscas_realizadas
  ADD COLUMN IF NOT EXISTS empresa_id bigint REFERENCES configuracoes_empresa(id);

ALTER TABLE funil_etapas
  ADD COLUMN IF NOT EXISTS empresa_id bigint REFERENCES configuracoes_empresa(id);

ALTER TABLE funil_tarefas
  ADD COLUMN IF NOT EXISTS empresa_id bigint REFERENCES configuracoes_empresa(id);

ALTER TABLE funil_logs_movimentacao
  ADD COLUMN IF NOT EXISTS empresa_id bigint REFERENCES configuracoes_empresa(id);

-- ─── 3. Preencher dados existentes com a primeira empresa ───

DO $$
DECLARE
  _empresa_id bigint;
BEGIN
  SELECT id INTO _empresa_id FROM configuracoes_empresa ORDER BY id LIMIT 1;

  UPDATE users SET empresa_id = _empresa_id WHERE empresa_id IS NULL;
  UPDATE configuracoes_integracoes SET empresa_id = _empresa_id WHERE empresa_id IS NULL;
  UPDATE leads_captados SET empresa_id = _empresa_id WHERE empresa_id IS NULL;
  UPDATE buscas_realizadas SET empresa_id = _empresa_id WHERE empresa_id IS NULL;
  UPDATE funil_etapas SET empresa_id = _empresa_id WHERE empresa_id IS NULL;
  UPDATE funil_tarefas SET empresa_id = _empresa_id WHERE empresa_id IS NULL;
  UPDATE funil_logs_movimentacao SET empresa_id = _empresa_id WHERE empresa_id IS NULL;
END $$;

-- ─── 4. Tornar empresa_id NOT NULL ─────────────────────────

ALTER TABLE users ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE configuracoes_integracoes ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE leads_captados ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE buscas_realizadas ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE funil_etapas ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE funil_tarefas ALTER COLUMN empresa_id SET NOT NULL;
ALTER TABLE funil_logs_movimentacao ALTER COLUMN empresa_id SET NOT NULL;

-- ─── 5. Constraint UNIQUE para integracoes (1 config/empresa)

ALTER TABLE configuracoes_integracoes
  ADD CONSTRAINT uq_integracoes_empresa UNIQUE (empresa_id);

-- ─── 6. Índices ────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_users_empresa ON users(empresa_id);
CREATE INDEX IF NOT EXISTS idx_leads_empresa ON leads_captados(empresa_id);
CREATE INDEX IF NOT EXISTS idx_buscas_empresa ON buscas_realizadas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_funil_etapas_empresa ON funil_etapas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_funil_tarefas_empresa ON funil_tarefas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_funil_logs_empresa ON funil_logs_movimentacao(empresa_id);

-- ─── 7. Função helper: get_my_empresa_id() ─────────────────

CREATE OR REPLACE FUNCTION public.get_my_empresa_id()
RETURNS bigint
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT empresa_id FROM public.users WHERE auth_id = auth.uid() LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_empresa_id() TO authenticated;

-- ─── 8. Atualizar get_my_profile() para incluir empresa_id ─

CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _row record;
BEGIN
  SELECT id, email, status, plano, role, auth_id, empresa_id
    INTO _row
    FROM public.users
   WHERE auth_id = auth.uid()
   LIMIT 1;

  IF _row IS NULL THEN RETURN NULL; END IF;

  RETURN jsonb_build_object(
    'id',         _row.id,
    'email',      _row.email,
    'status',     _row.status,
    'plano',      _row.plano,
    'role',       _row.role,
    'auth_id',    _row.auth_id,
    'empresa_id', _row.empresa_id
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;

-- ─── 9. Helper: is_admin_of_my_empresa() ───────────────────

CREATE OR REPLACE FUNCTION public.is_admin_of_my_empresa()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
     WHERE auth_id = auth.uid()
       AND role = 'admin'
  );
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_of_my_empresa() TO authenticated;

-- ─── 10. Recriar TODAS as RLS policies ─────────────────────

-- ===== users =====
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_select_own ON users;
DROP POLICY IF EXISTS admins_select_all_users ON users;

CREATE POLICY users_select_own ON users
  FOR SELECT TO authenticated
  USING (
    auth_id = auth.uid()
    OR (
      empresa_id = get_my_empresa_id()
      AND is_admin_of_my_empresa()
    )
  );

-- ===== configuracoes_empresa =====
ALTER TABLE configuracoes_empresa ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS admin_full_access_empresa ON configuracoes_empresa;

CREATE POLICY empresa_select_own ON configuracoes_empresa
  FOR SELECT TO authenticated
  USING (id = get_my_empresa_id());

CREATE POLICY empresa_insert_admin ON configuracoes_empresa
  FOR INSERT TO authenticated
  WITH CHECK (is_admin_of_my_empresa());

CREATE POLICY empresa_update_admin ON configuracoes_empresa
  FOR UPDATE TO authenticated
  USING (id = get_my_empresa_id() AND is_admin_of_my_empresa())
  WITH CHECK (id = get_my_empresa_id() AND is_admin_of_my_empresa());

-- ===== configuracoes_integracoes =====
ALTER TABLE configuracoes_integracoes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS authenticated_read_integracoes ON configuracoes_integracoes;
DROP POLICY IF EXISTS admin_insert_integracoes ON configuracoes_integracoes;
DROP POLICY IF EXISTS admin_update_integracoes ON configuracoes_integracoes;
DROP POLICY IF EXISTS admin_delete_integracoes ON configuracoes_integracoes;

CREATE POLICY integracoes_select_empresa ON configuracoes_integracoes
  FOR SELECT TO authenticated
  USING (empresa_id = get_my_empresa_id());

CREATE POLICY integracoes_insert_admin ON configuracoes_integracoes
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id = get_my_empresa_id() AND is_admin_of_my_empresa());

CREATE POLICY integracoes_update_admin ON configuracoes_integracoes
  FOR UPDATE TO authenticated
  USING (empresa_id = get_my_empresa_id() AND is_admin_of_my_empresa())
  WITH CHECK (empresa_id = get_my_empresa_id() AND is_admin_of_my_empresa());

CREATE POLICY integracoes_delete_admin ON configuracoes_integracoes
  FOR DELETE TO authenticated
  USING (empresa_id = get_my_empresa_id() AND is_admin_of_my_empresa());

-- ===== leads_captados =====
ALTER TABLE leads_captados ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_insert_own_leads ON leads_captados;
DROP POLICY IF EXISTS users_select_own_leads ON leads_captados;
DROP POLICY IF EXISTS users_update_own_leads ON leads_captados;
DROP POLICY IF EXISTS users_delete_own_leads ON leads_captados;

CREATE POLICY leads_select ON leads_captados
  FOR SELECT TO authenticated
  USING (
    empresa_id = get_my_empresa_id()
    AND (
      user_id = get_my_user_id()
      OR is_admin_of_my_empresa()
    )
  );

CREATE POLICY leads_insert ON leads_captados
  FOR INSERT TO authenticated
  WITH CHECK (
    empresa_id = get_my_empresa_id()
    AND user_id = get_my_user_id()
  );

CREATE POLICY leads_update ON leads_captados
  FOR UPDATE TO authenticated
  USING (
    empresa_id = get_my_empresa_id()
    AND (user_id = get_my_user_id() OR is_admin_of_my_empresa())
  )
  WITH CHECK (
    empresa_id = get_my_empresa_id()
    AND (user_id = get_my_user_id() OR is_admin_of_my_empresa())
  );

CREATE POLICY leads_delete ON leads_captados
  FOR DELETE TO authenticated
  USING (
    empresa_id = get_my_empresa_id()
    AND (user_id = get_my_user_id() OR is_admin_of_my_empresa())
  );

-- ===== buscas_realizadas =====
ALTER TABLE buscas_realizadas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Usuários podem inserir suas próprias buscas" ON buscas_realizadas;
DROP POLICY IF EXISTS "Usuários podem ver suas próprias buscas" ON buscas_realizadas;

CREATE POLICY buscas_select ON buscas_realizadas
  FOR SELECT TO authenticated
  USING (
    empresa_id = get_my_empresa_id()
    AND (
      "user" = get_my_user_id()
      OR is_admin_of_my_empresa()
    )
  );

CREATE POLICY buscas_insert ON buscas_realizadas
  FOR INSERT TO authenticated
  WITH CHECK (
    empresa_id = get_my_empresa_id()
    AND "user" = get_my_user_id()
  );

-- ===== funil_etapas =====
ALTER TABLE funil_etapas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_manage_own_etapas ON funil_etapas;

CREATE POLICY etapas_select ON funil_etapas
  FOR SELECT TO authenticated
  USING (
    empresa_id = get_my_empresa_id()
    AND (user_id = get_my_user_id() OR is_admin_of_my_empresa())
  );

CREATE POLICY etapas_insert ON funil_etapas
  FOR INSERT TO authenticated
  WITH CHECK (
    empresa_id = get_my_empresa_id()
    AND user_id = get_my_user_id()
  );

CREATE POLICY etapas_update ON funil_etapas
  FOR UPDATE TO authenticated
  USING (
    empresa_id = get_my_empresa_id()
    AND (user_id = get_my_user_id() OR is_admin_of_my_empresa())
  )
  WITH CHECK (
    empresa_id = get_my_empresa_id()
    AND (user_id = get_my_user_id() OR is_admin_of_my_empresa())
  );

CREATE POLICY etapas_delete ON funil_etapas
  FOR DELETE TO authenticated
  USING (
    empresa_id = get_my_empresa_id()
    AND (user_id = get_my_user_id() OR is_admin_of_my_empresa())
  );

-- ===== funil_tarefas =====
ALTER TABLE funil_tarefas ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_manage_own_tarefas ON funil_tarefas;

CREATE POLICY tarefas_select ON funil_tarefas
  FOR SELECT TO authenticated
  USING (
    empresa_id = get_my_empresa_id()
    AND (
      EXISTS (
        SELECT 1 FROM leads_captados lc
         WHERE lc.id = funil_tarefas.lead_id
           AND lc.user_id = get_my_user_id()
      )
      OR is_admin_of_my_empresa()
    )
  );

CREATE POLICY tarefas_insert ON funil_tarefas
  FOR INSERT TO authenticated
  WITH CHECK (
    empresa_id = get_my_empresa_id()
  );

CREATE POLICY tarefas_update ON funil_tarefas
  FOR UPDATE TO authenticated
  USING (
    empresa_id = get_my_empresa_id()
    AND (
      EXISTS (
        SELECT 1 FROM leads_captados lc
         WHERE lc.id = funil_tarefas.lead_id
           AND lc.user_id = get_my_user_id()
      )
      OR is_admin_of_my_empresa()
    )
  )
  WITH CHECK (empresa_id = get_my_empresa_id());

CREATE POLICY tarefas_delete ON funil_tarefas
  FOR DELETE TO authenticated
  USING (
    empresa_id = get_my_empresa_id()
    AND (
      EXISTS (
        SELECT 1 FROM leads_captados lc
         WHERE lc.id = funil_tarefas.lead_id
           AND lc.user_id = get_my_user_id()
      )
      OR is_admin_of_my_empresa()
    )
  );

-- ===== funil_logs_movimentacao =====
ALTER TABLE funil_logs_movimentacao ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS users_manage_own_logs ON funil_logs_movimentacao;

CREATE POLICY logs_select ON funil_logs_movimentacao
  FOR SELECT TO authenticated
  USING (
    empresa_id = get_my_empresa_id()
    AND (user_id = get_my_user_id() OR is_admin_of_my_empresa())
  );

CREATE POLICY logs_insert ON funil_logs_movimentacao
  FOR INSERT TO authenticated
  WITH CHECK (
    empresa_id = get_my_empresa_id()
    AND user_id = get_my_user_id()
  );

COMMIT;
