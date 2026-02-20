-- Renomeia tabela "user" para "users" (user é palavra reservada no PostgreSQL)
-- PostgREST/Supabase retorna 500 ao acessar tabela "user"

ALTER TABLE public."user" RENAME TO users;

-- Remove políticas antigas (podem ter nomes diferentes conforme migrations anteriores)
DROP POLICY IF EXISTS "users_select_own" ON public.users;
DROP POLICY IF EXISTS "admins_select_all_users" ON public.users;

-- Recria políticas com nome da nova tabela
CREATE POLICY "users_select_own"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (auth_id = auth.uid());

CREATE POLICY "admins_select_all_users"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = auth.uid() AND u.role = 'admin'
    )
  );
