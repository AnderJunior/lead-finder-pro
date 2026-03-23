import { supabase, supabaseAdmin } from "./supabase";
import {
  createCustomerAndSubscription,
  updateAsaasSubscription,
  cancelAsaasSubscription,
} from "./asaas";

// ─── Tipos ──────────────────────────────────────────────────────────

export interface EmpresaResumo {
  id: number;
  nome: string | null;
  cnpj: string | null;
  telefone: string | null;
  email_comercial: string | null;
  logo_url: string | null;
  endereco: string | null;
  ativo: boolean;
  created_at: string | null;
  total_usuarios: number;
  total_leads: number;
  total_buscas: number;
  investimento_total: number;
  plano_nome: string | null;
  assinatura_status: string | null;
  assinatura_vencimento: string | null;
  pagamento_atrasado: boolean;
}

export interface Plano {
  id: number;
  nome: string;
  descricao: string | null;
  preco_mensal: number;
  preco_anual: number;
  max_usuarios: number;
  max_leads: number;
  max_buscas_mes: number;
  recursos: string[];
  ativo: boolean;
  created_at: string;
}

export interface Assinatura {
  id: number;
  empresa_id: number;
  plano_id: number;
  status: string;
  ciclo: string;
  valor: number;
  data_inicio: string;
  data_vencimento: string;
  data_cancelamento: string | null;
  observacoes: string | null;
  empresa_nome?: string | null;
  plano_nome?: string | null;
}

export interface Pagamento {
  id: number;
  assinatura_id: number;
  empresa_id: number;
  valor: number;
  status: string;
  data_vencimento: string;
  data_pagamento: string | null;
  metodo_pagamento: string | null;
  referencia: string | null;
  observacoes: string | null;
  created_at: string;
  empresa_nome?: string | null;
  asaas_payment_id?: string | null;
  asaas_invoice_url?: string | null;
  asaas_pix_qrcode?: string | null;
  asaas_pix_payload?: string | null;
  asaas_boleto_url?: string | null;
}

export interface UsuarioGlobal {
  id: number;
  email: string;
  nome: string | null;
  role: string | null;
  status: string;
  plano: string;
  empresa_id: number;
  created_at: string;
  avatar_url: string | null;
  telefone: string | null;
  empresa_nome?: string | null;
}

export interface DashboardSuperAdmin {
  totalEmpresas: number;
  totalUsuarios: number;
  totalLeads: number;
  totalBuscas: number;
  assinaturasAtivas: number;
  assinaturasVencidas: number;
  assinaturasTrials: number;
  receitaMensal: number;
  receitaMes: number;
  pagamentosPendentes: number;
  pagamentosAtrasados: number;
  valorPendente: number;
  valorAtrasado: number;
  empresasRecentes: EmpresaResumo[];
  pagamentosProximos: Pagamento[];
  listaPendentes: Pagamento[];
  listaAtrasados: Pagamento[];
}

// ─── Dashboard ──────────────────────────────────────────────────────

export async function fetchSuperAdminDashboard(): Promise<DashboardSuperAdmin> {
  const client = supabaseAdmin || supabase;

  const [
    empresasRes,
    usuariosRes,
    leadsRes,
    buscasRes,
    assinaturasRes,
    pagamentosRes,
  ] = await Promise.all([
    client.from("configuracoes_empresa").select("id, nome, logo_url, cnpj, telefone, email_comercial"),
    client.from("users").select("id, empresa_id, role, status"),
    client.from("leads_captados").select("id", { count: "exact", head: true }),
    client.from("buscas_realizadas").select("id", { count: "exact", head: true }),
    client.from("assinaturas").select("*, planos:plano_id(nome)"),
    client.from("pagamentos").select("*, configuracoes_empresa:empresa_id(nome)"),
  ]);

  const empresas = empresasRes.data ?? [];
  const usuarios = usuariosRes.data ?? [];
  const assinaturas = (assinaturasRes.data ?? []) as any[];
  const pagamentos = (pagamentosRes.data ?? []) as any[];

  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 86_400_000);

  const assinaturasAtivas = assinaturas.filter((a: any) => a.status === "ativa").length;
  const assinaturasVencidas = assinaturas.filter((a: any) => a.status === "vencida").length;
  const assinaturasTrials = assinaturas.filter((a: any) => a.status === "trial").length;

  const receitaMensal = assinaturas
    .filter((a: any) => a.status === "ativa")
    .reduce((sum: number, a: any) => sum + (a.ciclo === "mensal" ? Number(a.valor) : Number(a.valor) / 12), 0);

  const pagamentosPendentes = pagamentos.filter((p: any) => p.status === "pendente");
  const pagamentosAtrasados = pagamentos.filter((p: any) => p.status === "atrasado");

  const pagamentosProximos = pagamentos
    .filter((p: any) => p.status === "pendente" && new Date(p.data_vencimento) <= in30Days)
    .sort((a: any, b: any) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime())
    .slice(0, 10)
    .map((p: any) => ({
      ...p,
      empresa_nome: p.configuracoes_empresa?.nome ?? null,
    }));

  const usersByEmpresa: Record<number, number> = {};
  usuarios.forEach((u: any) => {
    usersByEmpresa[u.empresa_id] = (usersByEmpresa[u.empresa_id] || 0) + 1;
  });

  const empresasRecentes = empresas.slice(0, 5).map((e: any) => {
    const assinatura = assinaturas.find((a: any) => a.empresa_id === e.id);
    return {
      id: e.id,
      nome: e.nome,
      cnpj: e.cnpj,
      telefone: e.telefone,
      email_comercial: e.email_comercial,
      logo_url: e.logo_url,
      total_usuarios: usersByEmpresa[e.id] || 0,
      total_leads: 0,
      total_buscas: 0,
      plano_nome: assinatura?.planos?.nome ?? null,
      assinatura_status: assinatura?.status ?? null,
      assinatura_vencimento: assinatura?.data_vencimento ?? null,
      pagamento_atrasado: false,
    };
  });

  const mapPag = (p: any): Pagamento => ({ ...p, empresa_nome: p.configuracoes_empresa?.nome ?? null });

  const receitaMes = pagamentos
    .filter((p: any) => p.status === "pago" && new Date(p.data_pagamento).getMonth() === now.getMonth() && new Date(p.data_pagamento).getFullYear() === now.getFullYear())
    .reduce((s: number, p: any) => s + Number(p.valor), 0);

  return {
    totalEmpresas: empresas.length,
    totalUsuarios: usuarios.filter((u: any) => u.role !== "super_admin").length,
    totalLeads: leadsRes.count ?? 0,
    totalBuscas: buscasRes.count ?? 0,
    assinaturasAtivas,
    assinaturasVencidas,
    assinaturasTrials,
    receitaMensal,
    receitaMes,
    pagamentosPendentes: pagamentosPendentes.length,
    pagamentosAtrasados: pagamentosAtrasados.length,
    valorPendente: pagamentosPendentes.reduce((s: number, p: any) => s + Number(p.valor), 0),
    valorAtrasado: pagamentosAtrasados.reduce((s: number, p: any) => s + Number(p.valor), 0),
    empresasRecentes,
    pagamentosProximos,
    listaPendentes: pagamentosPendentes.map(mapPag),
    listaAtrasados: pagamentosAtrasados.map(mapPag),
  };
}

// ─── Criar Empresa Completa ──────────────────────────────────────────

export interface NovaEmpresaPayload {
  nome: string;
  cnpj?: string;
  telefone?: string;
  email_comercial: string;
  endereco?: string;
  plano_id: number;
  ciclo: "mensal" | "trimestral" | "semestral" | "anual";
  data_vencimento?: string;
}

const CICLO_MESES: Record<string, number> = {
  mensal: 1,
  trimestral: 3,
  semestral: 6,
  anual: 12,
};

export async function createEmpresaCompleta(payload: NovaEmpresaPayload): Promise<number> {
  const client = supabaseAdmin;
  if (!client) throw new Error("Service Role Key não configurada. Não é possível criar empresa.");

  // 1 — Criar empresa
  const { data: empresa, error: empresaErr } = await client
    .from("configuracoes_empresa")
    .insert({
      nome: payload.nome,
      cnpj: payload.cnpj || null,
      telefone: payload.telefone || null,
      email_comercial: payload.email_comercial,
      endereco: payload.endereco || null,
      ativo: true,
    })
    .select("id")
    .single();

  if (empresaErr || !empresa) throw new Error(empresaErr?.message ?? "Erro ao criar empresa.");

  try {
    // 2 — Criar usuário no auth com senha temporária
    const tempPassword = crypto.randomUUID() + "Aa1!";
    const { data: authData, error: authErr } = await client.auth.admin.createUser({
      email: payload.email_comercial,
      password: tempPassword,
      email_confirm: true,
    });

    if (authErr || !authData.user) {
      throw new Error(authErr?.message ?? "Erro ao criar usuário no auth.");
    }

    // 3 — Criar registro na tabela users
    const { error: userErr } = await client.from("users").insert({
      email: payload.email_comercial,
      nome: payload.nome,
      auth_id: authData.user.id,
      role: "admin",
      plano: "básico",
      status: "ativo",
      empresa_id: empresa.id,
    });

    if (userErr) {
      await client.auth.admin.deleteUser(authData.user.id);
      throw new Error(userErr.message);
    }

    // 4 — Enviar e-mail de redefinição de senha
    const redirectUrl = `${window.location.origin}/reset-password`;
    await supabase.auth.resetPasswordForEmail(payload.email_comercial, {
      redirectTo: redirectUrl,
    });

    // 5 — Buscar plano para calcular valor
    const { data: plano } = await client
      .from("planos")
      .select("preco_mensal, preco_anual")
      .eq("id", payload.plano_id)
      .single();

    const meses = CICLO_MESES[payload.ciclo] || 1;
    let valor = (plano?.preco_mensal ?? 0) * meses;
    if (payload.ciclo === "anual") valor = plano?.preco_anual ?? 0;

    const now = new Date();
    let vencimentoISO: string;
    if (payload.data_vencimento) {
      vencimentoISO = `${payload.data_vencimento}T12:00:00`;
    } else {
      const venc = new Date(now);
      venc.setMonth(venc.getMonth() + meses);
      vencimentoISO = venc.toISOString();
    }

    // 6 — Criar assinatura
    const { data: assinatura, error: assErr } = await client
      .from("assinaturas")
      .insert({
        empresa_id: empresa.id,
        plano_id: payload.plano_id,
        status: "ativa",
        ciclo: payload.ciclo,
        valor,
        data_inicio: now.toISOString(),
        data_vencimento: vencimentoISO,
      })
      .select("id")
      .single();

    if (assErr) throw new Error(assErr.message);

    // 7 — Integração Asaas (customer + subscription via Edge Function)
    try {
      await createCustomerAndSubscription({
        empresa_id: empresa.id,
        assinatura_id: assinatura.id,
        nome: payload.nome,
        email: payload.email_comercial,
        cpfCnpj: payload.cnpj,
        phone: payload.telefone,
        ciclo: payload.ciclo,
        valor: payload.ciclo === "mensal" ? (plano?.preco_mensal ?? valor) : valor,
        data_vencimento: vencimentoISO,
      });
    } catch (asaasErr: any) {
      console.error("Erro ao criar no Asaas (empresa criada sem integração):", asaasErr.message);
    }

    return empresa.id;
  } catch (err) {
    // Rollback: remover empresa se algo falhar depois
    await client.from("configuracoes_empresa").delete().eq("id", empresa.id);
    throw err;
  }
}

// ─── Excluir Empresa Completa ────────────────────────────────────────

export async function deleteEmpresaCompleta(empresaId: number): Promise<void> {
  const client = supabaseAdmin;
  if (!client) throw new Error("Service Role Key não configurada. Não é possível excluir empresa.");

  // 1 — Buscar todos os usuários da empresa (para remover do auth)
  const { data: usuarios, error: usersErr } = await client
    .from("users")
    .select("id, auth_id")
    .eq("empresa_id", empresaId);

  if (usersErr) throw new Error(usersErr.message);

  // 2 — Remover pagamentos vinculados à empresa
  const { error: pagErr } = await client.from("pagamentos").delete().eq("empresa_id", empresaId);
  if (pagErr) throw new Error(`Erro ao remover pagamentos: ${pagErr.message}`);

  // 3 — Remover assinaturas vinculadas à empresa
  const { error: assErr } = await client.from("assinaturas").delete().eq("empresa_id", empresaId);
  if (assErr) throw new Error(`Erro ao remover assinaturas: ${assErr.message}`);

  // 4 — Remover dados do funil (tarefas e logs antes das etapas)
  const { error: tarefasErr } = await client.from("funil_tarefas").delete().eq("empresa_id", empresaId);
  if (tarefasErr) throw new Error(`Erro ao remover funil_tarefas: ${tarefasErr.message}`);

  const { error: logsErr } = await client.from("funil_logs_movimentacao").delete().eq("empresa_id", empresaId);
  if (logsErr) throw new Error(`Erro ao remover funil_logs_movimentacao: ${logsErr.message}`);

  const { error: etapasErr } = await client.from("funil_etapas").delete().eq("empresa_id", empresaId);
  if (etapasErr) throw new Error(`Erro ao remover funil_etapas: ${etapasErr.message}`);

  // 5 — Remover leads e buscas
  const { error: leadsErr } = await client.from("leads_captados").delete().eq("empresa_id", empresaId);
  if (leadsErr) throw new Error(`Erro ao remover leads_captados: ${leadsErr.message}`);

  const { error: buscasErr } = await client.from("buscas_realizadas").delete().eq("empresa_id", empresaId);
  if (buscasErr) throw new Error(`Erro ao remover buscas_realizadas: ${buscasErr.message}`);

  // 6 — Remover configurações de integrações
  const { error: intErr } = await client.from("configuracoes_integracoes").delete().eq("empresa_id", empresaId);
  if (intErr) throw new Error(`Erro ao remover configuracoes_integracoes: ${intErr.message}`);

  // 7 — Limpar referências de updated_by na configuracoes_empresa (FK para users)
  await client.from("configuracoes_empresa").update({ updated_by: null }).eq("id", empresaId);

  // 8 — Remover usuários do Supabase Auth (antes de remover da tabela users)
  const authIds = (usuarios ?? []).map((u) => u.auth_id).filter(Boolean);
  for (const authId of authIds) {
    try {
      await client.auth.admin.deleteUser(authId);
    } catch (_) {
      // Usuário pode já ter sido removido do Auth
    }
  }

  // 9 — Remover registros da tabela users
  const { error: delUsersErr } = await client.from("users").delete().eq("empresa_id", empresaId);
  if (delUsersErr) throw new Error(`Erro ao remover users: ${delUsersErr.message}`);

  // 10 — Remover a empresa (por último, pois users referencia ela)
  const { error: delErr } = await client
    .from("configuracoes_empresa")
    .delete()
    .eq("id", empresaId);

  if (delErr) throw new Error(`Erro ao remover empresa: ${delErr.message}`);
}

// ─── Empresas ───────────────────────────────────────────────────────

export async function fetchTodasEmpresas(): Promise<EmpresaResumo[]> {
  const client = supabaseAdmin || supabase;

  const [empresasRes, usuariosRes, leadsRes, buscasRes, assinaturasRes, pagAtrasadosRes] = await Promise.all([
    client.from("configuracoes_empresa").select("*"),
    client.from("users").select("id, empresa_id, role").neq("role", "super_admin"),
    client.from("leads_captados").select("id, empresa_id"),
    client.from("buscas_realizadas").select("id, empresa_id"),
    client.from("assinaturas").select("*, planos:plano_id(nome)"),
    client.from("pagamentos").select("empresa_id").eq("status", "atrasado"),
  ]);

  const empresas = empresasRes.data ?? [];
  const usuarios = usuariosRes.data ?? [];
  const leads = leadsRes.data ?? [];
  const buscas = buscasRes.data ?? [];
  const assinaturas = (assinaturasRes.data ?? []) as any[];

  const empresasComAtraso = new Set(
    (pagAtrasadosRes.data ?? []).map((p: any) => p.empresa_id)
  );

  const countBy = (arr: any[], key: string) => {
    const map: Record<number, number> = {};
    arr.forEach((item) => {
      const k = item[key];
      map[k] = (map[k] || 0) + 1;
    });
    return map;
  };

  const usersByEmpresa = countBy(usuarios, "empresa_id");
  const leadsByEmpresa = countBy(leads, "empresa_id");
  const buscasByEmpresa = countBy(buscas, "empresa_id");

  return empresas.map((e: any) => {
    const assinatura = assinaturas.find((a: any) => a.empresa_id === e.id);
    const atrasado = empresasComAtraso.has(e.id);
    return {
      id: e.id,
      nome: e.nome,
      cnpj: e.cnpj,
      telefone: e.telefone,
      email_comercial: e.email_comercial,
      logo_url: e.logo_url,
      endereco: e.endereco ?? null,
      ativo: e.ativo ?? true,
      created_at: e.created_at ?? null,
      total_usuarios: usersByEmpresa[e.id] || 0,
      total_leads: leadsByEmpresa[e.id] || 0,
      total_buscas: buscasByEmpresa[e.id] || 0,
      investimento_total: 0,
      plano_nome: assinatura?.planos?.nome ?? null,
      assinatura_status: assinatura?.status ?? null,
      assinatura_vencimento: assinatura?.data_vencimento ?? null,
      pagamento_atrasado: atrasado,
    };
  });
}

// ─── Empresa detalhes ───────────────────────────────────────────────

export async function fetchEmpresaDetalhes(empresaId: number): Promise<EmpresaResumo | null> {
  const client = supabaseAdmin || supabase;

  const [empresaRes, usuariosRes, leadsRes, buscasRes, assinaturasRes, pagamentosRes] = await Promise.all([
    client.from("configuracoes_empresa").select("*").eq("id", empresaId).single(),
    client.from("users").select("id").eq("empresa_id", empresaId).neq("role", "super_admin"),
    client.from("leads_captados").select("id", { count: "exact", head: true }).eq("empresa_id", empresaId),
    client.from("buscas_realizadas").select("id", { count: "exact", head: true }).eq("empresa_id", empresaId),
    client.from("assinaturas").select("*, planos:plano_id(nome)").eq("empresa_id", empresaId).maybeSingle(),
    client.from("pagamentos").select("valor, status").eq("empresa_id", empresaId),
  ]);

  if (!empresaRes.data) return null;

  const e = empresaRes.data as any;
  const assinatura = assinaturasRes.data as any;
  const allPagamentos = pagamentosRes.data ?? [];
  const investimento_total = allPagamentos
    .filter((p: any) => p.status === "pago")
    .reduce((s: number, p: any) => s + Number(p.valor), 0);

  return {
    id: e.id,
    nome: e.nome,
    cnpj: e.cnpj,
    telefone: e.telefone,
    email_comercial: e.email_comercial,
    logo_url: e.logo_url,
    endereco: e.endereco ?? null,
    ativo: e.ativo ?? true,
    created_at: e.created_at ?? null,
    total_usuarios: usuariosRes.data?.length ?? 0,
    total_leads: leadsRes.count ?? 0,
    total_buscas: buscasRes.count ?? 0,
    investimento_total,
    plano_nome: assinatura?.planos?.nome ?? null,
    assinatura_status: assinatura?.status ?? null,
    assinatura_vencimento: assinatura?.data_vencimento ?? null,
    pagamento_atrasado: allPagamentos.some((p: any) => p.status === "atrasado"),
  };
}

export async function fetchUsuariosEmpresa(empresaId: number): Promise<UsuarioGlobal[]> {
  const client = supabaseAdmin || supabase;

  const { data, error } = await client
    .from("users")
    .select("*")
    .eq("empresa_id", empresaId)
    .neq("role", "super_admin")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return ((data ?? []) as any[]).map((u) => ({
    id: u.id,
    email: u.email,
    nome: u.nome,
    role: u.role,
    status: u.status,
    plano: u.plano,
    empresa_id: u.empresa_id,
    created_at: u.created_at,
    avatar_url: u.avatar_url,
    telefone: u.telefone,
    empresa_nome: null,
  }));
}

export async function toggleEmpresaAtiva(empresaId: number, ativo: boolean): Promise<void> {
  const client = supabaseAdmin || supabase;

  const { error } = await client
    .from("configuracoes_empresa")
    .update({ ativo })
    .eq("id", empresaId);

  if (error) throw new Error(error.message);
}

// ─── Usuários globais ───────────────────────────────────────────────

export async function fetchTodosUsuarios(): Promise<UsuarioGlobal[]> {
  const client = supabaseAdmin || supabase;

  const { data, error } = await client
    .from("users")
    .select("*, configuracoes_empresa:empresa_id(nome)")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return ((data ?? []) as any[]).map((u) => ({
    id: u.id,
    email: u.email,
    nome: u.nome,
    role: u.role,
    status: u.status,
    plano: u.plano,
    empresa_id: u.empresa_id,
    created_at: u.created_at,
    avatar_url: u.avatar_url,
    telefone: u.telefone,
    empresa_nome: u.configuracoes_empresa?.nome ?? null,
  }));
}

// ─── Planos ─────────────────────────────────────────────────────────

export async function fetchPlanos(): Promise<Plano[]> {
  const { data, error } = await supabase
    .from("planos")
    .select("*")
    .order("preco_mensal", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as Plano[]) ?? [];
}

export async function upsertPlano(plano: Partial<Plano> & { nome: string }): Promise<Plano> {
  const client = supabaseAdmin || supabase;

  if (plano.id) {
    const { data, error } = await client
      .from("planos")
      .update({
        nome: plano.nome,
        descricao: plano.descricao,
        preco_mensal: plano.preco_mensal,
        preco_anual: plano.preco_anual,
        max_usuarios: plano.max_usuarios,
        max_leads: plano.max_leads,
        max_buscas_mes: plano.max_buscas_mes,
        recursos: plano.recursos,
        ativo: plano.ativo,
        updated_at: new Date().toISOString(),
      })
      .eq("id", plano.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as Plano;
  }

  const { data, error } = await client
    .from("planos")
    .insert(plano)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Plano;
}

export async function deletePlano(id: number): Promise<void> {
  const client = supabaseAdmin || supabase;
  const { error } = await client.from("planos").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

// ─── Assinaturas ────────────────────────────────────────────────────

/** Calcula o próximo vencimento com base no ciclo e nos pagamentos (se já pagou, soma o ciclo ao último pago) */
function calcularProximoVencimento(
  dataVencimentoOriginal: string,
  ciclo: string,
  pagamentos: { status: string; data_vencimento: string }[]
): string {
  const pendentes = pagamentos.filter((p) => p.status === "pendente" || p.status === "atrasado");
  if (pendentes.length > 0) {
    const maisProximo = pendentes.reduce((min, p) =>
      new Date(p.data_vencimento) < new Date(min.data_vencimento) ? p : min
    );
    return maisProximo.data_vencimento;
  }
  const pagos = pagamentos.filter((p) => p.status === "pago");
  if (pagos.length > 0) {
    const ultimoPago = pagos.reduce((max, p) =>
      new Date(p.data_vencimento) > new Date(max.data_vencimento) ? p : max
    );
    const meses = CICLO_MESES[ciclo] ?? 1;
    const d = new Date(ultimoPago.data_vencimento);
    d.setMonth(d.getMonth() + meses);
    return d.toISOString();
  }
  return dataVencimentoOriginal;
}

export async function fetchAssinaturas(): Promise<Assinatura[]> {
  const client = supabaseAdmin || supabase;

  const [assRes, pagRes, pagamentosRes] = await Promise.all([
    client
      .from("assinaturas")
      .select("*, configuracoes_empresa:empresa_id(nome), planos:plano_id(nome)")
      .order("data_vencimento", { ascending: true }),
    client
      .from("pagamentos")
      .select("empresa_id, status")
      .eq("status", "atrasado"),
    client
      .from("pagamentos")
      .select("assinatura_id, status, data_vencimento")
      .order("data_vencimento", { ascending: false }),
  ]);

  if (assRes.error) throw new Error(assRes.error.message);

  const empresasComAtraso = new Set(
    (pagRes.data ?? []).map((p: any) => p.empresa_id)
  );

  const pagPorAssinatura = (pagamentosRes.data ?? []).reduce((acc: Record<number, any[]>, p: any) => {
    const aid = p.assinatura_id;
    if (!acc[aid]) acc[aid] = [];
    acc[aid].push(p);
    return acc;
  }, {});

  return ((assRes.data ?? []) as any[]).map((a) => {
    let status = a.status;
    if (empresasComAtraso.has(a.empresa_id) && status !== "cancelada" && status !== "suspensa") {
      status = "vencida";
    }
    const pagos = pagPorAssinatura[a.id] ?? [];
    const dataVencimentoExibida = calcularProximoVencimento(
      a.data_vencimento,
      a.ciclo || "mensal",
      pagos
    );
    return {
      ...a,
      data_vencimento: dataVencimentoExibida,
      status,
      empresa_nome: a.configuracoes_empresa?.nome ?? null,
      plano_nome: a.planos?.nome ?? null,
    };
  });
}

export async function upsertAssinatura(assinatura: Partial<Assinatura>): Promise<Assinatura> {
  const client = supabaseAdmin || supabase;

  if (assinatura.id) {
    const { data: current } = await client
      .from("assinaturas")
      .select("asaas_subscription_id, status")
      .eq("id", assinatura.id)
      .single();

    const { data, error } = await client
      .from("assinaturas")
      .update({
        plano_id: assinatura.plano_id,
        status: assinatura.status,
        ciclo: assinatura.ciclo,
        valor: assinatura.valor,
        data_vencimento: assinatura.data_vencimento,
        observacoes: assinatura.observacoes,
        updated_at: new Date().toISOString(),
      })
      .eq("id", assinatura.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);

    const asaasSubId = (current as any)?.asaas_subscription_id;
    if (asaasSubId) {
      try {
        if (assinatura.status === "cancelada") {
          await cancelAsaasSubscription(asaasSubId);
        } else {
          await updateAsaasSubscription({
            asaas_subscription_id: asaasSubId,
            valor: assinatura.valor,
            ciclo: assinatura.ciclo,
            data_vencimento: assinatura.data_vencimento,
          });
        }
      } catch (asaasErr: any) {
        console.error("Erro ao sincronizar assinatura no Asaas:", asaasErr.message);
      }
    }

    return data as Assinatura;
  }

  const { data, error } = await client
    .from("assinaturas")
    .insert(assinatura)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Assinatura;
}

// ─── Pagamentos ─────────────────────────────────────────────────────

export async function fetchPagamentos(): Promise<Pagamento[]> {
  const client = supabaseAdmin || supabase;

  const { data, error } = await client
    .from("pagamentos")
    .select("*, configuracoes_empresa:empresa_id(nome)")
    .order("data_vencimento", { ascending: false });

  if (error) throw new Error(error.message);

  return ((data ?? []) as any[]).map((p) => ({
    ...p,
    empresa_nome: p.configuracoes_empresa?.nome ?? null,
  }));
}

export async function fetchPagamentosEmpresa(empresaId: number): Promise<Pagamento[]> {
  const client = supabaseAdmin || supabase;

  const { data, error } = await client
    .from("pagamentos")
    .select("*, configuracoes_empresa:empresa_id(nome)")
    .eq("empresa_id", empresaId)
    .order("data_vencimento", { ascending: false });

  if (error) throw new Error(error.message);

  return ((data ?? []) as any[]).map((p) => ({
    ...p,
    empresa_nome: p.configuracoes_empresa?.nome ?? null,
  }));
}

export async function fetchMeusPagamentos(): Promise<{ pagamentos: Pagamento[]; assinatura: Assinatura | null }> {
  const { data: profile } = await supabase.rpc("get_my_profile");
  if (!profile?.empresa_id) return { pagamentos: [], assinatura: null };

  const empresaId = profile.empresa_id;

  const [pagRes, assRes] = await Promise.all([
    supabase
      .from("pagamentos")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("data_vencimento", { ascending: false }),
    supabase
      .from("assinaturas")
      .select("*, planos:plano_id(nome)")
      .eq("empresa_id", empresaId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ]);

  const pagamentos = ((pagRes.data ?? []) as any[]).map((p) => ({
    ...p,
    empresa_nome: null,
  }));

  const ass = assRes.data as any;
  const assinatura = ass
    ? { ...ass, empresa_nome: null, plano_nome: ass.planos?.nome ?? null }
    : null;

  return { pagamentos, assinatura };
}

export async function upsertPagamento(pagamento: Partial<Pagamento>): Promise<Pagamento> {
  const client = supabaseAdmin || supabase;

  if (pagamento.id) {
    const { data, error } = await client
      .from("pagamentos")
      .update({
        status: pagamento.status,
        data_pagamento: pagamento.data_pagamento,
        metodo_pagamento: pagamento.metodo_pagamento,
        referencia: pagamento.referencia,
        observacoes: pagamento.observacoes,
      })
      .eq("id", pagamento.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as Pagamento;
  }

  const { data, error } = await client
    .from("pagamentos")
    .insert(pagamento)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Pagamento;
}
