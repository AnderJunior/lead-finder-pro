-- Corrige "infinite recursion detected in policy for relation 'users'"
-- A policy admins_select_all_users fazia SELECT na própria tabela users,
-- o que disparava a avaliação da mesma policy recursivamente.
-- Solução: função SECURITY DEFINER que consulta sem passar pelo RLS.

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE auth_id = auth.uid() AND role = 'admin'
  );
$$;

DROP POLICY IF EXISTS "admins_select_all_users" ON public.users;

CREATE POLICY "admins_select_all_users"
  ON public.users
  FOR SELECT
  TO authenticated
  USING (public.is_admin());
