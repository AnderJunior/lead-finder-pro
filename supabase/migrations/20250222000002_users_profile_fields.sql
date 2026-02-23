-- ============================================================
-- Migration: Adicionar campos de perfil (avatar_url, telefone, nome)
-- na tabela users e criar bucket de storage para avatars.
-- ============================================================

BEGIN;

-- ─── 1. Adicionar colunas ────────────────────────────────────

ALTER TABLE users
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS telefone text;

-- ─── 2. Atualizar get_my_profile() para retornar novos campos ─

CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _row record;
BEGIN
  SELECT id, email, nome, status, plano, role, auth_id, empresa_id, avatar_url, telefone
    INTO _row
    FROM public.users
   WHERE auth_id = auth.uid()
   LIMIT 1;

  IF _row IS NULL THEN RETURN NULL; END IF;

  RETURN jsonb_build_object(
    'id',         _row.id,
    'email',      _row.email,
    'nome',       _row.nome,
    'status',     _row.status,
    'plano',      _row.plano,
    'role',       _row.role,
    'auth_id',    _row.auth_id,
    'empresa_id', _row.empresa_id,
    'avatar_url', _row.avatar_url,
    'telefone',   _row.telefone
  );
END;
$$;

-- ─── 3. Policy para user atualizar seu próprio perfil ────────

DROP POLICY IF EXISTS users_update_own ON users;

CREATE POLICY users_update_own ON users
  FOR UPDATE TO authenticated
  USING (auth_id = auth.uid())
  WITH CHECK (auth_id = auth.uid());

-- ─── 4. Storage bucket para avatars ──────────────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('avatars', 'avatars', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS avatars_upload ON storage.objects;
DROP POLICY IF EXISTS avatars_update ON storage.objects;
DROP POLICY IF EXISTS avatars_select ON storage.objects;
DROP POLICY IF EXISTS avatars_delete ON storage.objects;

CREATE POLICY avatars_upload ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'avatars');

CREATE POLICY avatars_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'avatars');

CREATE POLICY avatars_select ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'avatars');

CREATE POLICY avatars_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'avatars');

COMMIT;
