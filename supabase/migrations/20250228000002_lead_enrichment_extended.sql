-- Colunas estendidas para enriquecimento: cargo, tamanho, redes sociais
ALTER TABLE public.leads_captados
  ADD COLUMN IF NOT EXISTS decisor_cargo text,
  ADD COLUMN IF NOT EXISTS tamanho_empresa text,
  ADD COLUMN IF NOT EXISTS linkedin_url text,
  ADD COLUMN IF NOT EXISTS facebook_url text,
  ADD COLUMN IF NOT EXISTS instagram_url text;

COMMENT ON COLUMN public.leads_captados.decisor_cargo IS 'Cargo do decisor (CEO, Diretor, Gerente, etc.)';
COMMENT ON COLUMN public.leads_captados.tamanho_empresa IS 'Porte da empresa (ex: 1-10 funcionários, pequena, média)';
COMMENT ON COLUMN public.leads_captados.linkedin_url IS 'URL do perfil/empresa no LinkedIn';
COMMENT ON COLUMN public.leads_captados.facebook_url IS 'URL da página no Facebook';
COMMENT ON COLUMN public.leads_captados.instagram_url IS 'URL do perfil no Instagram';
