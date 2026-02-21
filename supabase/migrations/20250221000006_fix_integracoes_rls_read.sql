-- Corrige RLS da tabela configuracoes_integracoes:
-- Permite que qualquer usuário autenticado leia as integrações configuradas pelo admin.

-- Remove política antiga (admin-only para tudo) caso exista
DROP POLICY IF EXISTS "admin_full_access_integracoes" ON public.configuracoes_integracoes;
DROP POLICY IF EXISTS "admin_write_integracoes" ON public.configuracoes_integracoes;
DROP POLICY IF EXISTS "authenticated_read_integracoes" ON public.configuracoes_integracoes;

-- SELECT: qualquer usuário autenticado pode ler
CREATE POLICY "authenticated_read_integracoes" ON public.configuracoes_integracoes
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- INSERT/UPDATE/DELETE: somente admins
CREATE POLICY "admin_insert_integracoes" ON public.configuracoes_integracoes
  FOR INSERT
  WITH CHECK (public.is_admin());

CREATE POLICY "admin_update_integracoes" ON public.configuracoes_integracoes
  FOR UPDATE
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE POLICY "admin_delete_integracoes" ON public.configuracoes_integracoes
  FOR DELETE
  USING (public.is_admin());
