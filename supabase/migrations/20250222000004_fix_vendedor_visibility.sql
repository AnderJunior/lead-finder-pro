-- ============================================================
-- Migration: Fix vendedor visibility + Ranking RPC
--
-- Princípio:
--   • Cada vendedor vê APENAS seus próprios leads e buscas
--   • Etapas do funil e membros da empresa são visíveis para todos
--   • Ranking de vendedores usa função SECURITY DEFINER (bypassa RLS)
-- ============================================================

BEGIN;

-- ═══════════════════════════════════════════════════════════════
-- 1. RLS POLICIES
-- ═══════════════════════════════════════════════════════════════

-- ── users: todos da empresa veem uns aos outros (nomes, avatars) ──
DROP POLICY IF EXISTS users_select_own ON users;
DROP POLICY IF EXISTS users_select_empresa ON users;

CREATE POLICY users_select_empresa ON users
  FOR SELECT TO authenticated
  USING (empresa_id = get_my_empresa_id());

-- ── leads_captados: vendedor vê SÓ seus leads, admin vê todos ──
DROP POLICY IF EXISTS leads_select ON leads_captados;

CREATE POLICY leads_select ON leads_captados
  FOR SELECT TO authenticated
  USING (
    empresa_id = get_my_empresa_id()
    AND (
      user_id = get_my_user_id()
      OR is_admin_of_my_empresa()
    )
  );

-- ── buscas_realizadas: vendedor vê SÓ suas buscas, admin vê todas ──
DROP POLICY IF EXISTS buscas_select ON buscas_realizadas;

CREATE POLICY buscas_select ON buscas_realizadas
  FOR SELECT TO authenticated
  USING (
    empresa_id = get_my_empresa_id()
    AND (
      "user" = get_my_user_id()
      OR is_admin_of_my_empresa()
    )
  );

-- ── funil_etapas: toda empresa vê (necessário para funil funcionar) ──
DROP POLICY IF EXISTS etapas_select ON funil_etapas;

CREATE POLICY etapas_select ON funil_etapas
  FOR SELECT TO authenticated
  USING (empresa_id = get_my_empresa_id());

-- ── funil_tarefas: vendedor vê tarefas dos seus leads ──
DROP POLICY IF EXISTS tarefas_select ON funil_tarefas;

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

-- ═══════════════════════════════════════════════════════════════
-- 2. RPC: RANKING DE VENDEDORES (SECURITY DEFINER — ignora RLS)
-- ═══════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.get_vendedores_ranking(p_desde timestamptz DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  _empresa_id bigint;
  _result jsonb;
BEGIN
  SELECT empresa_id INTO _empresa_id
    FROM public.users
   WHERE auth_id = auth.uid()
   LIMIT 1;

  IF _empresa_id IS NULL THEN RETURN '[]'::jsonb; END IF;

  SELECT COALESCE(jsonb_agg(v ORDER BY (v->>'vendas')::int DESC, (v->>'qualificados')::int DESC, (v->>'leads')::int DESC, (v->>'buscas')::int DESC), '[]'::jsonb)
    INTO _result
    FROM (
      SELECT jsonb_build_object(
        'id',           u.id,
        'nome',         COALESCE(u.nome, u.email),
        'avatar_url',   u.avatar_url,
        'leads', (
          SELECT COUNT(*)
            FROM leads_captados lc
           WHERE lc.user_id = u.id
             AND lc.empresa_id = _empresa_id
             AND (p_desde IS NULL OR lc.data_captacao >= p_desde)
        ),
        'qualificados', (
          SELECT COUNT(*)
            FROM leads_captados lc
            JOIN funil_etapas fe ON fe.id = lc.etapa_id
           WHERE lc.user_id = u.id
             AND lc.empresa_id = _empresa_id
             AND fe.ordem >= 2
             AND fe.nome NOT ILIKE '%perdido%'
             AND (p_desde IS NULL OR lc.data_captacao >= p_desde)
        ),
        'vendas', (
          SELECT COUNT(*)
            FROM leads_captados lc
            JOIN funil_etapas fe ON fe.id = lc.etapa_id
           WHERE lc.user_id = u.id
             AND lc.empresa_id = _empresa_id
             AND fe.ordem = 4
             AND (p_desde IS NULL OR lc.data_captacao >= p_desde)
        ),
        'buscas', (
          SELECT COUNT(*)
            FROM buscas_realizadas br
           WHERE br."user" = u.id
             AND br.empresa_id = _empresa_id
             AND (p_desde IS NULL OR br.created_at >= p_desde)
        )
      ) AS v
      FROM users u
      WHERE u.empresa_id = _empresa_id
        AND u.role != 'admin'
    ) sub;

  RETURN _result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_vendedores_ranking(timestamptz) TO authenticated;

-- ═══════════════════════════════════════════════════════════════
-- 3. FIX: Leads órfãos (capturados sem etapa por causa do RLS)
-- ═══════════════════════════════════════════════════════════════

UPDATE leads_captados lc
   SET etapa_id = fe.id
  FROM funil_etapas fe
 WHERE lc.etapa_id IS NULL
   AND fe.empresa_id = lc.empresa_id
   AND fe.ordem = 0;

COMMIT;
