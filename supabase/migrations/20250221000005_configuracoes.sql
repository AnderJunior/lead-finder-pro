-- Tabela de configurações da empresa
CREATE TABLE IF NOT EXISTS public.configuracoes_empresa (
  id bigserial PRIMARY KEY,
  nome varchar(255),
  cnpj varchar(20),
  endereco text,
  telefone varchar(30),
  email_comercial varchar(255),
  updated_at timestamp with time zone DEFAULT now(),
  updated_by bigint REFERENCES public.users(id)
);

ALTER TABLE public.configuracoes_empresa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_full_access_empresa" ON public.configuracoes_empresa
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());

-- Tabela de configurações de integrações (uma única linha, uma coluna por chave)
CREATE TABLE IF NOT EXISTS public.configuracoes_integracoes (
  id bigserial PRIMARY KEY,
  google_maps_api_key text NOT NULL DEFAULT '',
  serper_api_key text NOT NULL DEFAULT '',
  evolution_api_url text NOT NULL DEFAULT '',
  evolution_api_instance text NOT NULL DEFAULT '',
  evolution_api_key text NOT NULL DEFAULT '',
  updated_at timestamp with time zone DEFAULT now(),
  updated_by bigint REFERENCES public.users(id)
);

ALTER TABLE public.configuracoes_integracoes ENABLE ROW LEVEL SECURITY;

-- Qualquer usuário autenticado pode ler as integrações
CREATE POLICY "authenticated_read_integracoes" ON public.configuracoes_integracoes
  FOR SELECT
  USING (auth.role() = 'authenticated');

-- Somente admins podem inserir/atualizar/deletar
CREATE POLICY "admin_write_integracoes" ON public.configuracoes_integracoes
  FOR ALL
  USING (public.is_admin())
  WITH CHECK (public.is_admin());
