-- ================================================================
-- Atualização de precificação dos planos (pesquisa Serper + mercado)
-- Nova faixa: competitiva e acessível para o mercado brasileiro
-- ================================================================

UPDATE public.planos
SET
  preco_mensal = 67.00,
  preco_anual = 720.00,
  updated_at = now()
WHERE nome = 'Básico';

UPDATE public.planos
SET
  preco_mensal = 127.00,
  preco_anual = 1368.00,
  updated_at = now()
WHERE nome = 'Premium';

UPDATE public.planos
SET
  preco_mensal = 247.00,
  preco_anual = 2664.00,
  updated_at = now()
WHERE nome = 'Empresarial';
