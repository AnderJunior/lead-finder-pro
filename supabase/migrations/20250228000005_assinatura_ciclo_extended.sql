-- Expande os ciclos de assinatura para suportar trimestral e semestral
ALTER TABLE public.assinaturas DROP CONSTRAINT IF EXISTS assinaturas_ciclo_check;
ALTER TABLE public.assinaturas
  ADD CONSTRAINT assinaturas_ciclo_check
  CHECK (ciclo IN ('mensal', 'trimestral', 'semestral', 'anual'));

-- Permite super_admin criar empresas (a policy original só permite admin da própria empresa)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
     WHERE schemaname = 'public'
       AND tablename = 'configuracoes_empresa'
       AND policyname = 'empresa_super_admin_manage'
  ) THEN
    CREATE POLICY "empresa_super_admin_manage" ON public.configuracoes_empresa
      FOR ALL USING (public.is_super_admin());
  END IF;
END $$;
