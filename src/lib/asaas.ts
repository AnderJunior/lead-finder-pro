import { supabase } from "./supabase";

async function callAsaasProxy(action: string, data: Record<string, any> = {}) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData?.session?.access_token;
  if (!token) throw new Error("Usuário não autenticado");

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const res = await fetch(`${supabaseUrl}/functions/v1/asaas-proxy`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      apikey: supabaseAnonKey,
    },
    body: JSON.stringify({ action, ...data }),
  });

  const body = await res.json();
  if (!res.ok) {
    throw new Error(body?.error || "Erro na comunicação com Asaas");
  }
  return body;
}

export async function createCustomerAndSubscription(data: {
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
  return callAsaasProxy("create_customer_subscription", data);
}

export async function updateAsaasSubscription(data: {
  asaas_subscription_id: string;
  valor?: number;
  ciclo?: string;
  data_vencimento?: string;
}): Promise<void> {
  await callAsaasProxy("update_subscription", data);
}

export async function cancelAsaasSubscription(
  asaas_subscription_id: string
): Promise<void> {
  await callAsaasProxy("cancel_subscription", { asaas_subscription_id });
}
