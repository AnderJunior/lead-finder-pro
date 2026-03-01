-- ================================================================
-- Integração Asaas: campos para sincronização com gateway de pagamento
-- ================================================================

-- Customer ID do Asaas na tabela de empresas
ALTER TABLE public.configuracoes_empresa
  ADD COLUMN IF NOT EXISTS asaas_customer_id text;

-- Subscription ID do Asaas na tabela de assinaturas
ALTER TABLE public.assinaturas
  ADD COLUMN IF NOT EXISTS asaas_subscription_id text;

-- Payment ID do Asaas na tabela de pagamentos
ALTER TABLE public.pagamentos
  ADD COLUMN IF NOT EXISTS asaas_payment_id text,
  ADD COLUMN IF NOT EXISTS asaas_invoice_url text,
  ADD COLUMN IF NOT EXISTS asaas_pix_qrcode text,
  ADD COLUMN IF NOT EXISTS asaas_pix_payload text,
  ADD COLUMN IF NOT EXISTS asaas_boleto_url text;

-- Índices para busca rápida por IDs do Asaas
CREATE INDEX IF NOT EXISTS idx_empresa_asaas_customer ON public.configuracoes_empresa (asaas_customer_id) WHERE asaas_customer_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_assinatura_asaas_sub ON public.assinaturas (asaas_subscription_id) WHERE asaas_subscription_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_pagamento_asaas_pay ON public.pagamentos (asaas_payment_id) WHERE asaas_payment_id IS NOT NULL;
