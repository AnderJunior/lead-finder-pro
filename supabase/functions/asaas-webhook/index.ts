import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, asaas-access-token",
};

const ASAAS_STATUS_MAP: Record<string, string> = {
  PENDING: "pendente",
  RECEIVED: "pago",
  CONFIRMED: "pago",
  OVERDUE: "atrasado",
  REFUNDED: "cancelado",
  DELETED: "cancelado",
  RESTORED: "pendente",
  REFUND_REQUESTED: "cancelado",
  CHARGEBACK_REQUESTED: "cancelado",
  CHARGEBACK_DISPUTE: "cancelado",
  AWAITING_CHARGEBACK_REVERSAL: "cancelado",
  DUNNING_REQUESTED: "atrasado",
  DUNNING_RECEIVED: "pago",
  AWAITING_RISK_ANALYSIS: "pendente",
};

const BILLING_TYPE_MAP: Record<string, string> = {
  BOLETO: "boleto",
  CREDIT_CARD: "cartao",
  PIX: "pix",
  UNDEFINED: null as any,
};

const CICLO_MESES: Record<string, number> = {
  mensal: 1,
  trimestral: 3,
  semestral: 6,
  anual: 12,
};

function proximoVencimento(dueDate: string, ciclo: string): string {
  const meses = CICLO_MESES[ciclo] ?? 1;
  const d = new Date(dueDate);
  d.setMonth(d.getMonth() + meses);
  return d.toISOString();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const webhookToken = Deno.env.get("ASAAS_WEBHOOK_TOKEN");
    if (webhookToken) {
      const incomingToken = req.headers.get("asaas-access-token");
      if (incomingToken !== webhookToken) {
        return new Response(
          JSON.stringify({ error: "Token inválido" }),
          { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const body = await req.json();
    const event = body.event as string;
    const payment = body.payment;

    if (!payment || !event?.startsWith("PAYMENT_")) {
      return new Response(
        JSON.stringify({ ok: true, message: "Evento ignorado" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const asaasPaymentId = payment.id as string;
    const asaasSubscriptionId = payment.subscription as string | null;
    const status = ASAAS_STATUS_MAP[payment.status] || "pendente";
    const metodo = BILLING_TYPE_MAP[payment.billingType] || null;

    const { data: existing } = await supabase
      .from("pagamentos")
      .select("id")
      .eq("asaas_payment_id", asaasPaymentId)
      .maybeSingle();

    if (existing) {
      const updateData: Record<string, any> = {
        status,
        metodo_pagamento: metodo,
        data_pagamento: payment.paymentDate || null,
        asaas_invoice_url: payment.invoiceUrl || null,
        asaas_boleto_url: payment.bankSlipUrl || null,
      };

      await supabase
        .from("pagamentos")
        .update(updateData)
        .eq("id", existing.id);

      if (status === "pago" && payment.dueDate) {
        const { data: pag } = await supabase
          .from("pagamentos")
          .select("assinatura_id")
          .eq("id", existing.id)
          .single();
        const assinaturaId = (pag as any)?.assinatura_id;
        if (assinaturaId) {
          const { data: ass } = await supabase
            .from("assinaturas")
            .select("ciclo")
            .eq("id", assinaturaId)
            .single();
          const ciclo = (ass as any)?.ciclo ?? "mensal";
          const novaData = proximoVencimento(payment.dueDate, ciclo);
          await supabase
            .from("assinaturas")
            .update({ data_vencimento: novaData, status: "ativa", updated_at: new Date().toISOString() })
            .eq("id", assinaturaId);
        }
      }

      return new Response(
        JSON.stringify({ ok: true, action: "updated", id: existing.id }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let empresaId: number | null = null;
    let assinaturaId: number | null = null;
    let assinaturaCiclo: string | null = null;

    if (asaasSubscriptionId) {
      const { data: assinatura } = await supabase
        .from("assinaturas")
        .select("id, empresa_id, ciclo")
        .eq("asaas_subscription_id", asaasSubscriptionId)
        .maybeSingle();

      if (assinatura) {
        assinaturaId = assinatura.id;
        empresaId = assinatura.empresa_id;
        assinaturaCiclo = (assinatura as any).ciclo ?? null;
      }
    }

    if (!empresaId) {
      const customerId = payment.customer as string;
      const { data: empresa } = await supabase
        .from("configuracoes_empresa")
        .select("id")
        .eq("asaas_customer_id", customerId)
        .maybeSingle();

      if (empresa) empresaId = empresa.id;
    }

    if (!empresaId || !assinaturaId) {
      console.warn("Webhook: empresa/assinatura não encontrada para payment", asaasPaymentId);
      return new Response(
        JSON.stringify({ ok: true, message: "Empresa não encontrada, pagamento ignorado" }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: newPag, error: insertErr } = await supabase
      .from("pagamentos")
      .insert({
        assinatura_id: assinaturaId,
        empresa_id: empresaId,
        valor: payment.value,
        status,
        data_vencimento: payment.dueDate,
        data_pagamento: payment.paymentDate || null,
        metodo_pagamento: metodo,
        referencia: asaasPaymentId,
        asaas_payment_id: asaasPaymentId,
        asaas_invoice_url: payment.invoiceUrl || null,
        asaas_boleto_url: payment.bankSlipUrl || null,
      })
      .select("id")
      .single();

    if (insertErr) {
      console.error("Erro ao inserir pagamento:", insertErr.message);
      return new Response(
        JSON.stringify({ error: insertErr.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (status === "pago" && assinaturaId && payment.dueDate) {
      const ciclo = assinaturaCiclo ?? "mensal";
      const novaData = proximoVencimento(payment.dueDate, ciclo);
      await supabase
        .from("assinaturas")
        .update({ data_vencimento: novaData, status: "ativa", updated_at: new Date().toISOString() })
        .eq("id", assinaturaId);
    }

    if (status === "atrasado" && assinaturaId) {
      await supabase
        .from("assinaturas")
        .update({ status: "vencida", updated_at: new Date().toISOString() })
        .eq("id", assinaturaId);
    }

    return new Response(
      JSON.stringify({ ok: true, action: "created", id: newPag?.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Webhook error:", err);
    return new Response(
      JSON.stringify({ error: "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
