-- Colunas para enriquecimento do lead: dados do decisor
ALTER TABLE public.leads_captados
  ADD COLUMN IF NOT EXISTS decisor_nome text,
  ADD COLUMN IF NOT EXISTS decisor_telefone text,
  ADD COLUMN IF NOT EXISTS decisor_email text,
  ADD COLUMN IF NOT EXISTS decisor_enriquecido_em timestamp with time zone;

COMMENT ON COLUMN public.leads_captados.decisor_nome IS 'Nome do decisor/contato principal encontrado via enriquecimento';
COMMENT ON COLUMN public.leads_captados.decisor_telefone IS 'Telefone do decisor encontrado via enriquecimento';
COMMENT ON COLUMN public.leads_captados.decisor_email IS 'Email do decisor encontrado via enriquecimento';
COMMENT ON COLUMN public.leads_captados.decisor_enriquecido_em IS 'Data/hora da última tentativa de enriquecimento';
