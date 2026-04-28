import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function asaasBaseUrl(): string {
  const env = Deno.env.get("ASAAS_ENV") || "sandbox";
  return env === "production"
    ? "https://api.asaas.com/v3"
    : "https://sandbox.asaas.com/api/v3";
}

async function asaasRequest(path: string, options: RequestInit = {}) {
  const apiKey = Deno.env.get("ASAAS_API_KEY");
  if (!apiKey) throw new Error("ASAAS_API_KEY não configurada nas secrets");

  const res = await fetch(`${asaasBaseUrl()}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      access_token: apiKey,
    },
  });

  const body = await res.json();
  if (!res.ok) {
    const msg =
      body?.errors?.[0]?.description || body?.message || "Erro na API Asaas";
    throw new Error(msg);
  }
  return body;
}

const CICLO_MAP: Record<string, string> = {
  mensal: "MONTHLY",
  trimestral: "QUARTERLY",
  semestral: "SEMIANNUALLY",
  anual: "YEARLY",
};

const CICLO_LABEL: Record<string, string> = {
  mensal: "Mensal",
  trimestral: "Trimestral",
  semestral: "Semestral",
  anual: "Anual",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Não autorizado" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    const {
      data: { user },
      error: authError,
    } = await supabaseAuth.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Token inválido" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: dbUser } = await supabaseAdmin
      .from("users")
      .select("role")
      .eq("auth_id", user.id)
      .single();

    if (!dbUser || dbUser.role !== "super_admin") {
      return new Response(
        JSON.stringify({ error: "Acesso negado" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body = await req.json();
    const { action } = body;

    // ─── CREATE CUSTOMER + SUBSCRIPTION ─────────────────────────
    if (action === "create_customer_subscription") {
      const { empresa_id, assinatura_id, nome, email, cpfCnpj, phone, ciclo, valor, data_vencimento, plano_nome } = body;

      const customer = await asaasRequest("/customers", {
        method: "POST",
        body: JSON.stringify({
          name: nome,
          email,
          cpfCnpj: (cpfCnpj || "").replace(/\D/g, ""),
          phone: (phone || "").replace(/\D/g, "") || undefined,
        }),
      });

      await supabaseAdmin
        .from("configuracoes_empresa")
        .update({ asaas_customer_id: customer.id })
        .eq("id", empresa_id);

      const dueDateStr =
        data_vencimento?.split("T")[0] ||
        new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

      const subscription = await asaasRequest("/subscriptions", {
        method: "POST",
        body: JSON.stringify({
          customer: customer.id,
          billingType: "UNDEFINED",
          cycle: CICLO_MAP[ciclo] || "MONTHLY",
          value: valor,
          nextDueDate: dueDateStr,
          description: `LeadRadar - ${CICLO_LABEL[ciclo] || "Mensal"}`,
        }),
      });

      await supabaseAdmin
        .from("assinaturas")
        .update({ asaas_subscription_id: subscription.id })
        .eq("id", assinatura_id);

      return new Response(
        JSON.stringify({
          ok: true,
          customer_id: customer.id,
          subscription_id: subscription.id,
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── UPDATE SUBSCRIPTION ────────────────────────────────────
    if (action === "update_subscription") {
      const { asaas_subscription_id, valor, ciclo, data_vencimento } = body;

      if (!asaas_subscription_id) {
        return new Response(
          JSON.stringify({ ok: true, message: "Sem assinatura Asaas vinculada" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const updateData: Record<string, any> = {};
      if (valor != null) updateData.value = valor;
      if (ciclo) updateData.cycle = CICLO_MAP[ciclo] || "MONTHLY";
      if (data_vencimento) updateData.nextDueDate = data_vencimento.split("T")[0];

      if (Object.keys(updateData).length > 0) {
        await asaasRequest(`/subscriptions/${asaas_subscription_id}`, {
          method: "PUT",
          body: JSON.stringify(updateData),
        });
      }

      return new Response(
        JSON.stringify({ ok: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ─── CANCEL SUBSCRIPTION ────────────────────────────────────
    if (action === "cancel_subscription") {
      const { asaas_subscription_id } = body;

      if (!asaas_subscription_id) {
        return new Response(
          JSON.stringify({ ok: true, message: "Sem assinatura Asaas vinculada" }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      await asaasRequest(`/subscriptions/${asaas_subscription_id}`, {
        method: "DELETE",
      });

      return new Response(
        JSON.stringify({ ok: true }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({ error: `Ação desconhecida: ${action}` }),
      { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    console.error("asaas-proxy error:", err);
    return new Response(
      JSON.stringify({ error: err.message || "Erro interno" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
