-- Adiciona colunas 'ativo' e 'created_at' na tabela de empresas
ALTER TABLE public.configuracoes_empresa
  ADD COLUMN IF NOT EXISTS ativo boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now();

-- Atualiza get_my_profile para retornar empresa_ativo
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _row record;
  _empresa_ativo boolean;
BEGIN
  SELECT id, email, nome, status, plano, role, auth_id, empresa_id, avatar_url, telefone
    INTO _row
    FROM public.users
   WHERE auth_id = auth.uid()
   LIMIT 1;

  IF _row IS NULL THEN RETURN NULL; END IF;

  SELECT COALESCE(ativo, true) INTO _empresa_ativo
    FROM public.configuracoes_empresa
   WHERE id = _row.empresa_id;

  RETURN jsonb_build_object(
    'id',             _row.id,
    'email',          _row.email,
    'nome',           _row.nome,
    'status',         _row.status,
    'plano',          _row.plano,
    'role',           _row.role,
    'auth_id',        _row.auth_id,
    'empresa_id',     _row.empresa_id,
    'avatar_url',     _row.avatar_url,
    'telefone',       _row.telefone,
    'empresa_ativo',  _empresa_ativo
  );
END;
$$;
