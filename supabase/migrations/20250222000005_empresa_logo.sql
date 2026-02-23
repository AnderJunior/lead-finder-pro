-- ============================================================
-- Migration: Adicionar campo logo_url na tabela configuracoes_empresa
-- e criar bucket de storage para logos.
-- ============================================================

BEGIN;

-- ─── 1. Adicionar coluna logo_url ──────────────────────────

ALTER TABLE configuracoes_empresa
  ADD COLUMN IF NOT EXISTS logo_url text;

-- ─── 2. Storage bucket para logos de empresa ────────────────

INSERT INTO storage.buckets (id, name, public)
VALUES ('logos', 'logos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS logos_upload ON storage.objects;
DROP POLICY IF EXISTS logos_update ON storage.objects;
DROP POLICY IF EXISTS logos_select ON storage.objects;
DROP POLICY IF EXISTS logos_delete ON storage.objects;

CREATE POLICY logos_upload ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'logos');

CREATE POLICY logos_update ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'logos');

CREATE POLICY logos_select ON storage.objects
  FOR SELECT TO public
  USING (bucket_id = 'logos');

CREATE POLICY logos_delete ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'logos');

COMMIT;
