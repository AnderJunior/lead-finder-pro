-- ============================================================================
-- Migração: Integrações Globais (gerenciadas pelo Super Admin)
-- ============================================================================
-- Antes: cada empresa tinha sua própria configuracoes_integracoes.
-- Agora: existe uma única configuração global, gerenciada pelo backoffice,
-- que vale para todos os clientes.
-- ============================================================================

-- 1) Cria tabela única global
CREATE TABLE IF NOT EXISTS public.configuracoes_globais (
  id smallint PRIMARY KEY DEFAULT 1,
  google_maps_api_key text DEFAULT '' NOT NULL,
  serper_api_key text DEFAULT '' NOT NULL,
  evolution_api_url text DEFAULT '' NOT NULL,
  evolution_api_instance text DEFAULT '' NOT NULL,
  evolution_api_key text DEFAULT '' NOT NULL,
  updated_at timestamp with time zone DEFAULT now(),
  updated_by bigint REFERENCES public.users(id) ON DELETE SET NULL,
  CONSTRAINT configuracoes_globais_singleton CHECK (id = 1)
);

-- 2) Migra a primeira config existente (de qualquer empresa) para o global
INSERT INTO public.configuracoes_globais (
  id, google_maps_api_key, serper_api_key,
  evolution_api_url, evolution_api_instance, evolution_api_key
)
SELECT
  1,
  COALESCE(google_maps_api_key, ''),
  COALESCE(serper_api_key, ''),
  COALESCE(evolution_api_url, ''),
  COALESCE(evolution_api_instance, ''),
  COALESCE(evolution_api_key, '')
FROM public.configuracoes_integracoes
ORDER BY id ASC
LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- 3) Garante que sempre exista a linha singleton
INSERT INTO public.configuracoes_globais (id)
VALUES (1)
ON CONFLICT (id) DO NOTHING;

-- 4) RLS: leitura para qualquer usuário autenticado, escrita só super_admin
ALTER TABLE public.configuracoes_globais ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "configuracoes_globais_select" ON public.configuracoes_globais;
CREATE POLICY "configuracoes_globais_select"
  ON public.configuracoes_globais
  FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "configuracoes_globais_insert" ON public.configuracoes_globais;
CREATE POLICY "configuracoes_globais_insert"
  ON public.configuracoes_globais
  FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = auth.uid() AND u.role = 'super_admin'
    )
  );

DROP POLICY IF EXISTS "configuracoes_globais_update" ON public.configuracoes_globais;
CREATE POLICY "configuracoes_globais_update"
  ON public.configuracoes_globais
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = auth.uid() AND u.role = 'super_admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      WHERE u.auth_id = auth.uid() AND u.role = 'super_admin'
    )
  );

-- Sem DELETE: configuração é permanente

-- 5) Índices não necessários (linha única)

COMMENT ON TABLE public.configuracoes_globais IS
  'Configuração global de integrações (gerenciada pelo Super Admin). Linha única id=1.';
