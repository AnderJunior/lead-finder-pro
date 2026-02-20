-- Função RPC para buscar perfil do usuário logado
-- Contorna erro 500 no PostgREST ao acessar tabela diretamente
-- Funciona com tabela "user" OU "users"

CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  -- Tenta tabela "users" primeiro
  BEGIN
    SELECT to_jsonb(r) INTO result
    FROM (SELECT id, email, status, plano, role, auth_id FROM users WHERE auth_id = auth.uid() LIMIT 1) r;
  EXCEPTION WHEN undefined_table THEN
    -- Fallback: tabela "user" (se ainda não renomeou)
    SELECT to_jsonb(r) INTO result
    FROM (SELECT id, email, status, plano, role, auth_id FROM "user" WHERE auth_id = auth.uid() LIMIT 1) r;
  END;
  RETURN result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_my_profile() TO authenticated;
