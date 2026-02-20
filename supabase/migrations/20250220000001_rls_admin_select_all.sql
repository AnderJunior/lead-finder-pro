-- Admins (role = 'admin' na tabela user) podem ver todos os usuários
CREATE POLICY "admins_select_all_users"
  ON public."user"
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public."user" u
      WHERE u.auth_id = auth.uid() AND u.role = 'admin'
    )
  );
