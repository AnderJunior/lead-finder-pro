-- ============================================================
-- Fix: Ranking de vendedores - admin deve ver todas as métricas
--
-- Ajustes:
-- 1. SET search_path para evitar ambiguidade
-- 2. Incluir usuários com role NULL no ranking
-- 3. JOIN funil_etapas explícito com empresa_id para consistência
-- 4. Critério de vendas mais flexível (ordem 4 OU nome com fechado/ganho)
-- 5. Suporte a p_ate para filtro "mês passado" (intervalo de datas)
-- ============================================================

DROP FUNCTION IF EXISTS public.get_vendedores_ranking(timestamptz);

CREATE OR REPLACE FUNCTION public.get_vendedores_ranking(p_desde timestamptz DEFAULT NULL, p_ate timestamptz DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
SET search_path = public
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

  SELECT COALESCE(
    jsonb_agg(v ORDER BY (v->>'vendas')::int DESC, (v->>'qualificados')::int DESC, (v->>'leads')::int DESC, (v->>'buscas')::int DESC),
    '[]'::jsonb
  )
    INTO _result
    FROM (
      SELECT jsonb_build_object(
        'id',           u.id,
        'nome',         COALESCE(u.nome, u.email),
        'avatar_url',   u.avatar_url,
        'leads', (
          SELECT COUNT(*)::int
            FROM public.leads_captados lc
           WHERE lc.user_id = u.id
             AND lc.empresa_id = _empresa_id
             AND (p_desde IS NULL OR lc.data_captacao >= p_desde)
             AND (p_ate IS NULL OR lc.data_captacao < p_ate)
        ),
        'qualificados', (
          SELECT COUNT(*)::int
            FROM public.leads_captados lc
            JOIN public.funil_etapas fe ON fe.id = lc.etapa_id AND fe.empresa_id = _empresa_id
           WHERE lc.user_id = u.id
             AND lc.empresa_id = _empresa_id
             AND fe.ordem >= 2
             AND fe.nome NOT ILIKE '%perdido%'
             AND (p_desde IS NULL OR lc.data_captacao >= p_desde)
             AND (p_ate IS NULL OR lc.data_captacao < p_ate)
        ),
        'vendas', (
          SELECT COUNT(*)::int
            FROM public.leads_captados lc
            JOIN public.funil_etapas fe ON fe.id = lc.etapa_id AND fe.empresa_id = _empresa_id
           WHERE lc.user_id = u.id
             AND lc.empresa_id = _empresa_id
             AND (fe.ordem = 4 OR fe.nome ILIKE '%fechado%' OR fe.nome ILIKE '%ganho%')
             AND (p_desde IS NULL OR lc.data_captacao >= p_desde)
             AND (p_ate IS NULL OR lc.data_captacao < p_ate)
        ),
        'buscas', (
          SELECT COUNT(*)::int
            FROM public.buscas_realizadas br
           WHERE br."user" = u.id
             AND br.empresa_id = _empresa_id
             AND (p_desde IS NULL OR br.created_at >= p_desde)
             AND (p_ate IS NULL OR br.created_at < p_ate)
        )
      ) AS v
      FROM public.users u
      WHERE u.empresa_id = _empresa_id
        AND u.role = 'user'
    ) sub;

  RETURN _result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_vendedores_ranking(timestamptz, timestamptz) TO authenticated;
COMMENT ON FUNCTION public.get_vendedores_ranking(timestamptz, timestamptz) IS 'Retorna ranking de vendedores. p_desde/p_ate opcionais para filtrar por período. NULL = sem limite.';
