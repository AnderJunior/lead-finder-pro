/**
 * Stub — integração Asaas removida na migração para backend próprio.
 * Pagamentos são gerenciados manualmente pelo super admin.
 */

export async function createCustomerAndSubscription(_data: {
  empresa_id: number;
  assinatura_id: number;
  nome: string;
  email: string;
  cpfCnpj?: string;
  phone?: string;
  ciclo: string;
  valor: number;
  data_vencimento: string;
  plano_nome?: string;
}): Promise<{ customer_id: string; subscription_id: string }> {
  return { customer_id: "", subscription_id: "" };
}

export async function updateAsaasSubscription(_data: {
  asaas_subscription_id: string;
  valor?: number;
  ciclo?: string;
  data_vencimento?: string;
}): Promise<void> {
  // no-op
}

export async function cancelAsaasSubscription(_asaas_subscription_id: string): Promise<void> {
  // no-op
}
