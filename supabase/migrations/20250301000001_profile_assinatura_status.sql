-- Atualiza get_my_profile para incluir status da assinatura e URL de fatura pendente
CREATE OR REPLACE FUNCTION public.get_my_profile()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  _row record;
  _empresa_ativo boolean;
  _empresa_nome text;
  _ass_status text;
  _ass_vencimento timestamptz;
  _invoice_url text;
  _has_overdue boolean;
BEGIN
  SELECT id, email, nome, status, plano, role, auth_id, empresa_id, avatar_url, telefone
    INTO _row
    FROM public.users
   WHERE auth_id = auth.uid()
   LIMIT 1;

  IF _row IS NULL THEN RETURN NULL; END IF;

  SELECT COALESCE(ativo, true), nome
    INTO _empresa_ativo, _empresa_nome
    FROM public.configuracoes_empresa
   WHERE id = _row.empresa_id;

  SELECT a.status, a.data_vencimento
    INTO _ass_status, _ass_vencimento
    FROM public.assinaturas a
   WHERE a.empresa_id = _row.empresa_id
   ORDER BY a.created_at DESC
   LIMIT 1;

  -- Verifica se há pagamentos atrasados
  SELECT EXISTS (
    SELECT 1 FROM public.pagamentos p
     WHERE p.empresa_id = _row.empresa_id
       AND p.status = 'atrasado'
  ) INTO _has_overdue;

  -- Se há pagamento atrasado, força status como vencida
  IF _has_overdue AND _ass_status NOT IN ('cancelada', 'suspensa') THEN
    _ass_status := 'vencida';
  END IF;

  SELECT p.asaas_invoice_url
    INTO _invoice_url
    FROM public.pagamentos p
   WHERE p.empresa_id = _row.empresa_id
     AND p.status IN ('pendente', 'atrasado')
   ORDER BY p.data_vencimento DESC
   LIMIT 1;

  RETURN jsonb_build_object(
    'id',                _row.id,
    'email',             _row.email,
    'nome',              _row.nome,
    'status',            _row.status,
    'plano',             _row.plano,
    'role',              _row.role,
    'auth_id',           _row.auth_id,
    'empresa_id',        _row.empresa_id,
    'avatar_url',        _row.avatar_url,
    'telefone',          _row.telefone,
    'empresa_ativo',     _empresa_ativo,
    'empresa_nome',      _empresa_nome,
    'assinatura_status', _ass_status,
    'assinatura_vencimento', _ass_vencimento,
    'fatura_url',        _invoice_url
  );
END;
$$;
