-- ============================================================
-- Migration: Sistema de Metas
-- Tabelas para metas gerais e metas por vendedor.
-- ============================================================

BEGIN;

-- ─── 1. Tabela de metas gerais ──────────────────────────────

CREATE TABLE IF NOT EXISTS metas (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  nome        text NOT NULL,
  slug        text NOT NULL,
  valor       integer NOT NULL DEFAULT 0,
  periodo     text NOT NULL DEFAULT 'mensal' CHECK (periodo IN ('diario', 'semanal', 'mensal')),
  fixa        boolean NOT NULL DEFAULT false,
  empresa_id  bigint NOT NULL REFERENCES configuracoes_empresa(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (slug, empresa_id)
);

CREATE INDEX IF NOT EXISTS idx_metas_empresa ON metas(empresa_id);

-- ─── 2. Tabela de metas por vendedor (override) ─────────────

CREATE TABLE IF NOT EXISTS metas_vendedor (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  meta_id     bigint NOT NULL REFERENCES metas(id) ON DELETE CASCADE,
  user_id     bigint NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  valor       integer NOT NULL DEFAULT 0,
  empresa_id  bigint NOT NULL REFERENCES configuracoes_empresa(id),
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (meta_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_metas_vendedor_empresa ON metas_vendedor(empresa_id);
CREATE INDEX IF NOT EXISTS idx_metas_vendedor_user ON metas_vendedor(user_id);

-- ─── 3. Seed: metas fixas para empresas existentes ──────────

INSERT INTO metas (nome, slug, valor, fixa, empresa_id)
SELECT 'Vendas Realizadas', 'vendas_realizadas', 15, true, id
FROM configuracoes_empresa
WHERE NOT EXISTS (
  SELECT 1 FROM metas WHERE slug = 'vendas_realizadas' AND empresa_id = configuracoes_empresa.id
);

INSERT INTO metas (nome, slug, valor, fixa, empresa_id)
SELECT 'Contatos Feitos', 'contatos_feitos', 50, true, id
FROM configuracoes_empresa
WHERE NOT EXISTS (
  SELECT 1 FROM metas WHERE slug = 'contatos_feitos' AND empresa_id = configuracoes_empresa.id
);

-- ─── 4. RLS ─────────────────────────────────────────────────

ALTER TABLE metas ENABLE ROW LEVEL SECURITY;

CREATE POLICY metas_select ON metas
  FOR SELECT TO authenticated
  USING (empresa_id = get_my_empresa_id());

CREATE POLICY metas_insert ON metas
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id = get_my_empresa_id() AND is_admin_of_my_empresa());

CREATE POLICY metas_update ON metas
  FOR UPDATE TO authenticated
  USING (empresa_id = get_my_empresa_id() AND is_admin_of_my_empresa())
  WITH CHECK (empresa_id = get_my_empresa_id() AND is_admin_of_my_empresa());

CREATE POLICY metas_delete ON metas
  FOR DELETE TO authenticated
  USING (empresa_id = get_my_empresa_id() AND is_admin_of_my_empresa() AND fixa = false);

ALTER TABLE metas_vendedor ENABLE ROW LEVEL SECURITY;

CREATE POLICY metas_vendedor_select ON metas_vendedor
  FOR SELECT TO authenticated
  USING (empresa_id = get_my_empresa_id());

CREATE POLICY metas_vendedor_insert ON metas_vendedor
  FOR INSERT TO authenticated
  WITH CHECK (empresa_id = get_my_empresa_id() AND is_admin_of_my_empresa());

CREATE POLICY metas_vendedor_update ON metas_vendedor
  FOR UPDATE TO authenticated
  USING (empresa_id = get_my_empresa_id() AND is_admin_of_my_empresa())
  WITH CHECK (empresa_id = get_my_empresa_id() AND is_admin_of_my_empresa());

CREATE POLICY metas_vendedor_delete ON metas_vendedor
  FOR DELETE TO authenticated
  USING (empresa_id = get_my_empresa_id() AND is_admin_of_my_empresa());

COMMIT;
