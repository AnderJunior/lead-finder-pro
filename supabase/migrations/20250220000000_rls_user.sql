-- Habilita RLS na tabela user
ALTER TABLE public."user" ENABLE ROW LEVEL SECURITY;

-- Usuários autenticados podem ler apenas seu próprio registro (por auth_id)
CREATE POLICY "users_select_own"
  ON public."user"
  FOR SELECT
  TO authenticated
  USING (auth_id = auth.uid());
