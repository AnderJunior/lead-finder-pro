/**
 * Funções do Super Admin — usam o backend próprio.
 * Sem integração Asaas.
 */
import { api } from "./api";

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
  creditos: number;
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
  creditos_iniciais: number;
  /** @deprecated mantido por compatibilidade — use creditos_iniciais */
  max_leads: number;
  /** @deprecated mantido por compatibilidade — use creditos_iniciais */
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
}

export interface PacoteCredito {
  id: number;
  nome: string;
  quantidade: number;
  preco: number;
  ativo: boolean;
  ordem: number;
  created_at: string;
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

// ─── Helpers ────────────────────────────────────────────────────────

const n = (v: any) => (v == null ? 0 : Number(v));

function asEmpresa(raw: any): EmpresaResumo {
  const ass = raw.assinaturas?.[0];
  const ultimoPag = ass?.pagamentos?.[0];
  return {
    id: n(raw.id),
    nome: raw.nome ?? null,
    cnpj: raw.cnpj ?? null,
    telefone: raw.telefone ?? null,
    email_comercial: raw.email_comercial ?? null,
    logo_url: null,
    endereco: raw.endereco ?? null,
    ativo: !!raw.ativo,
    creditos: n(raw.creditos),
    created_at: raw.created_at ?? null,
    total_usuarios: raw._count?.users ?? raw.users?.length ?? 0,
    total_leads: 0,
    total_buscas: 0,
    investimento_total: 0,
    plano_nome: ass?.plano?.nome ?? null,
    assinatura_status: ass?.status ?? null,
    assinatura_vencimento: ass?.data_vencimento ?? null,
    pagamento_atrasado: ultimoPag?.status === "atrasado",
  };
}

function asPlano(raw: any): Plano {
  return {
    id: n(raw.id),
    nome: raw.nome,
    descricao: raw.descricao ?? null,
    preco_mensal: Number(raw.preco_mensal ?? 0),
    preco_anual: Number(raw.preco_anual ?? 0),
    max_usuarios: n(raw.max_usuarios),
    creditos_iniciais: n(raw.creditos_iniciais ?? raw.max_leads ?? 0),
    max_leads: n(raw.max_leads),
    max_buscas_mes: n(raw.max_buscas_mes),
    recursos: raw.recursos ?? [],
    ativo: !!raw.ativo,
    created_at: raw.created_at,
  };
}

function asAssinatura(raw: any): Assinatura {
  return {
    id: n(raw.id),
    empresa_id: n(raw.empresa_id),
    plano_id: n(raw.plano_id),
    status: raw.status,
    ciclo: raw.ciclo,
    valor: Number(raw.valor ?? 0),
    data_inicio: raw.data_inicio,
    data_vencimento: raw.data_vencimento,
    data_cancelamento: raw.data_cancelamento ?? null,
    observacoes: raw.observacoes ?? null,
    empresa_nome: raw.empresa?.nome ?? null,
    plano_nome: raw.plano?.nome ?? null,
  };
}

function asPagamento(raw: any): Pagamento {
  return {
    id: n(raw.id),
    assinatura_id: n(raw.assinatura_id),
    empresa_id: n(raw.empresa_id),
    valor: Number(raw.valor ?? 0),
    status: raw.status,
    data_vencimento: raw.data_vencimento,
    data_pagamento: raw.data_pagamento ?? null,
    metodo_pagamento: raw.metodo_pagamento ?? null,
    referencia: raw.referencia ?? null,
    observacoes: raw.observacoes ?? null,
    created_at: raw.created_at,
    empresa_nome: raw.empresa?.nome ?? null,
  };
}

// ─── Dashboard ──────────────────────────────────────────────────────

export async function fetchSuperAdminDashboard(): Promise<DashboardSuperAdmin> {
  const [empresas, assinaturas, pagamentos] = await Promise.all([
    api.get<any[]>("/api/empresas"),
    api.get<any[]>("/api/assinaturas"),
    api.get<any[]>("/api/pagamentos"),
  ]);

  const now = new Date();
  const in30Days = new Date(now.getTime() + 30 * 86_400_000);

  const assAtivas = assinaturas.filter((a) => a.status === "ativa");
  const assVencidas = assinaturas.filter((a) => a.status === "vencida");
  const assTrials = assinaturas.filter((a) => a.status === "trial");

  const receitaMensal = assAtivas.reduce(
    (sum, a) => sum + (a.ciclo === "mensal" ? Number(a.valor) : Number(a.valor) / 12),
    0
  );

  const pagPendentes = pagamentos.filter((p) => p.status === "pendente");
  const pagAtrasados = pagamentos.filter((p) => p.status === "atrasado");

  const pagamentosProximos = pagPendentes
    .filter((p) => new Date(p.data_vencimento) <= in30Days)
    .sort((a, b) => new Date(a.data_vencimento).getTime() - new Date(b.data_vencimento).getTime())
    .slice(0, 10)
    .map(asPagamento);

  const empresasRecentes = empresas.slice(0, 5).map(asEmpresa);

  // Total de leads e buscas (rough — pega via total apenas se super admin permitir)
  let totalLeads = 0;
  let totalBuscas = 0;
  try {
    const l = await api.get<{ total: number }>("/api/leads", { query: { pageSize: 1 } });
    totalLeads = n(l.total);
  } catch { /* */ }
  try {
    const b = await api.get<{ total: number }>("/api/buscas", { query: { pageSize: 1 } });
    totalBuscas = n(b.total);
  } catch { /* */ }

  let totalUsuarios = 0;
  try {
    const us = await api.get<any[]>("/api/users");
    totalUsuarios = us.length;
  } catch { /* */ }

  return {
    totalEmpresas: empresas.length,
    totalUsuarios,
    totalLeads,
    totalBuscas,
    assinaturasAtivas: assAtivas.length,
    assinaturasVencidas: assVencidas.length,
    assinaturasTrials: assTrials.length,
    receitaMensal,
    receitaMes: 0,
    pagamentosPendentes: pagPendentes.length,
    pagamentosAtrasados: pagAtrasados.length,
    valorPendente: pagPendentes.reduce((s, p) => s + Number(p.valor), 0),
    valorAtrasado: pagAtrasados.reduce((s, p) => s + Number(p.valor), 0),
    empresasRecentes,
    pagamentosProximos,
    listaPendentes: pagPendentes.map(asPagamento),
    listaAtrasados: pagAtrasados.map(asPagamento),
  };
}

// ─── Empresas ───────────────────────────────────────────────────────

export interface CriarEmpresaPayload {
  nome: string;
  cnpj?: string | null;
  endereco?: string | null;
  telefone?: string | null;
  email_comercial?: string | null;
  admin_nome: string;
  admin_email: string;
  admin_password: string;
  plano_id?: number | null;
  ciclo?: "mensal" | "trimestral" | "semestral" | "anual";
  valor?: number;
  data_vencimento?: string;
}

// Alias para compatibilidade com código legado
export type NovaEmpresaPayload = CriarEmpresaPayload;

export async function createEmpresaCompleta(payload: CriarEmpresaPayload) {
  const empresa = await api.post<any>("/api/empresas", {
    nome: payload.nome,
    cnpj: payload.cnpj ?? null,
    endereco: payload.endereco ?? null,
    telefone: payload.telefone ?? null,
    email_comercial: payload.email_comercial ?? null,
    admin: {
      nome: payload.admin_nome,
      email: payload.admin_email,
      password: payload.admin_password,
    },
    plano_id: payload.plano_id ?? null,
    ciclo: payload.ciclo ?? "mensal",
    valor: payload.valor ?? 0,
    data_vencimento: payload.data_vencimento,
  });
  return { success: true, empresa_id: n(empresa.id) };
}

export async function deleteEmpresaCompleta(empresaId: number): Promise<void> {
  await api.delete(`/api/empresas/${empresaId}`);
}

export async function fetchTodasEmpresas(): Promise<EmpresaResumo[]> {
  const empresas = await api.get<any[]>("/api/empresas");
  return empresas.map(asEmpresa);
}

export async function fetchEmpresaDetalhes(empresaId: number): Promise<EmpresaResumo & {
  creditos: number;
  users: any[];
  assinaturas: any[];
}> {
  const raw = await api.get<any>(`/api/empresas/${empresaId}`);
  const ass = raw.assinaturas?.[0];
  const ultimoPag = ass?.pagamentos?.[0];
  return {
    id: n(raw.id),
    nome: raw.nome ?? null,
    cnpj: raw.cnpj ?? null,
    telefone: raw.telefone ?? null,
    email_comercial: raw.email_comercial ?? null,
    logo_url: null,
    endereco: raw.endereco ?? null,
    ativo: !!raw.ativo,
    creditos: n(raw.creditos),
    created_at: raw.created_at ?? null,
    total_usuarios: raw.users?.length ?? 0,
    total_leads: 0,
    total_buscas: 0,
    investimento_total: (raw.assinaturas ?? []).flatMap((a: any) => a.pagamentos ?? [])
      .filter((p: any) => p.status === "pago")
      .reduce((s: number, p: any) => s + Number(p.valor ?? 0), 0),
    plano_nome: ass?.plano?.nome ?? null,
    assinatura_status: ass?.status ?? null,
    assinatura_vencimento: ass?.data_vencimento ?? null,
    pagamento_atrasado: ultimoPag?.status === "atrasado",
    users: raw.users ?? [],
    assinaturas: raw.assinaturas ?? [],
  };
}

export async function fetchUsuariosEmpresa(empresaId: number, role?: string): Promise<UsuarioGlobal[]> {
  const data = await api.get<any[]>("/api/users", { query: { empresa_id: empresaId } });
  let filtered = data;
  if (role) filtered = data.filter((u) => u.role === role);
  return filtered.map((u) => ({
    id: n(u.id),
    email: u.email,
    nome: u.nome ?? null,
    role: u.role ?? null,
    status: u.status,
    plano: u.plano ?? "básico",
    empresa_id: n(u.empresa_id),
    created_at: u.created_at,
    avatar_url: u.avatar_url ?? null,
    telefone: u.telefone ?? null,
    empresa_nome: u.empresa?.nome ?? null,
  }));
}

export async function toggleEmpresaAtiva(empresaId: number, _ativo: boolean): Promise<void> {
  await api.post(`/api/empresas/${empresaId}/toggle-ativo`);
}

export async function fetchTodosUsuarios(): Promise<UsuarioGlobal[]> {
  const data = await api.get<any[]>("/api/users");
  return data.map((u) => ({
    id: n(u.id),
    email: u.email,
    nome: u.nome ?? null,
    role: u.role ?? null,
    status: u.status,
    plano: u.plano ?? "básico",
    empresa_id: n(u.empresa_id),
    created_at: u.created_at,
    avatar_url: u.avatar_url ?? null,
    telefone: u.telefone ?? null,
    empresa_nome: u.empresa?.nome ?? null,
  }));
}

// ─── Planos ─────────────────────────────────────────────────────────

export async function fetchPlanos(): Promise<Plano[]> {
  const data = await api.get<any[]>("/api/planos");
  return data.map(asPlano);
}

export async function upsertPlano(plano: Partial<Plano> & { nome: string }): Promise<Plano> {
  if (plano.id) {
    const r = await api.put<any>(`/api/planos/${plano.id}`, plano);
    return asPlano(r);
  }
  const r = await api.post<any>("/api/planos", plano);
  return asPlano(r);
}

export async function deletePlano(id: number): Promise<void> {
  await api.delete(`/api/planos/${id}`);
}

// ─── Assinaturas ────────────────────────────────────────────────────

export async function fetchAssinaturas(): Promise<Assinatura[]> {
  const data = await api.get<any[]>("/api/assinaturas");
  return data.map(asAssinatura);
}

export async function upsertAssinatura(a: Partial<Assinatura> & { empresa_id: number; plano_id: number; valor: number; data_vencimento: string }): Promise<Assinatura> {
  if (a.id) {
    const r = await api.put<any>(`/api/assinaturas/${a.id}`, a);
    return asAssinatura(r);
  }
  const r = await api.post<any>("/api/assinaturas", a);
  return asAssinatura(r);
}

// ─── Pagamentos ─────────────────────────────────────────────────────

export async function fetchPagamentos(): Promise<Pagamento[]> {
  const data = await api.get<any[]>("/api/pagamentos");
  return data.map(asPagamento);
}

export async function fetchPagamentosEmpresa(empresaId: number): Promise<Pagamento[]> {
  const data = await api.get<any[]>("/api/pagamentos", { query: { empresa_id: empresaId } });
  return data.map(asPagamento);
}

export async function fetchMeusPagamentos(): Promise<Pagamento[]> {
  const data = await api.get<any[]>("/api/pagamentos");
  return data.map(asPagamento);
}

export async function upsertPagamento(p: Partial<Pagamento> & { assinatura_id: number; empresa_id: number; valor: number; data_vencimento: string }): Promise<Pagamento> {
  if (p.id) {
    const r = await api.put<any>(`/api/pagamentos/${p.id}`, p);
    return asPagamento(r);
  }
  const r = await api.post<any>("/api/pagamentos", p);
  return asPagamento(r);
}

// ─── Pacotes de Créditos ────────────────────────────────────────────

function asPacote(raw: any): PacoteCredito {
  return {
    id: n(raw.id),
    nome: raw.nome,
    quantidade: n(raw.quantidade),
    preco: Number(raw.preco ?? 0),
    ativo: !!raw.ativo,
    ordem: n(raw.ordem),
    created_at: raw.created_at,
  };
}

export async function fetchPacotesCreditos(): Promise<PacoteCredito[]> {
  const data = await api.get<any[]>("/api/pacotes-creditos");
  return data.map(asPacote);
}

export async function upsertPacoteCredito(p: Partial<PacoteCredito> & {
  nome: string;
  quantidade: number;
}): Promise<PacoteCredito> {
  if (p.id) {
    const r = await api.put<any>(`/api/pacotes-creditos/${p.id}`, p);
    return asPacote(r);
  }
  const r = await api.post<any>("/api/pacotes-creditos", p);
  return asPacote(r);
}

export async function deletePacoteCredito(id: number): Promise<void> {
  await api.delete(`/api/pacotes-creditos/${id}`);
}

// ─── Adicionar créditos a uma empresa ───────────────────────────────

export async function adicionarCreditosEmpresa(empresaId: number, amount: number): Promise<{ creditos: number }> {
  return api.post<{ creditos: number }>(`/api/empresas/${empresaId}/creditos/adicionar`, { amount });
}

export async function definirCreditosEmpresa(empresaId: number, amount: number): Promise<{ creditos: number }> {
  return api.post<{ creditos: number }>(`/api/empresas/${empresaId}/creditos/definir`, { amount });
}

// ─── Administradores (super_admin) ──────────────────────────────────

export interface Administrador {
  id: number;
  email: string;
  nome: string | null;
  telefone: string | null;
  avatar_url: string | null;
  status: string;
  role: string;
  created_at: string;
}

function asAdmin(raw: any): Administrador {
  return {
    id: n(raw.id),
    email: raw.email,
    nome: raw.nome ?? null,
    telefone: raw.telefone ?? null,
    avatar_url: raw.avatar_url ?? null,
    status: raw.status ?? "ativo",
    role: raw.role ?? "super_admin",
    created_at: raw.created_at,
  };
}

export async function fetchAdministradores(): Promise<Administrador[]> {
  const data = await api.get<any[]>("/api/administradores");
  return data.map(asAdmin);
}

export async function criarAdministrador(payload: {
  nome: string;
  email: string;
  password: string;
  telefone?: string | null;
}): Promise<Administrador> {
  const r = await api.post<any>("/api/administradores", payload);
  return asAdmin(r);
}

export async function atualizarAdministrador(
  id: number,
  payload: {
    nome?: string;
    telefone?: string | null;
    status?: "ativo" | "inativo";
    password?: string;
  }
): Promise<Administrador> {
  const r = await api.put<any>(`/api/administradores/${id}`, payload);
  return asAdmin(r);
}

export async function deletarAdministrador(id: number): Promise<void> {
  await api.delete(`/api/administradores/${id}`);
}
