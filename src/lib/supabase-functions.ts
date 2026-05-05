/**
 * Funções de acesso a dados — agora usam o backend próprio (Express + Prisma).
 * Nomes e assinaturas mantidos para compatibilidade com páginas existentes.
 */
import { api } from "./api";

// ─── Helpers ─────────────────────────────────────────────────────────

function n(v: any): number {
  return v == null ? 0 : Number(v);
}
function nOrNull(v: any): number | null {
  return v == null ? null : Number(v);
}

// ─── Tipos ───────────────────────────────────────────────────────────

export interface CreateUserPayload {
  nome: string;
  email: string;
  password: string;
  role?: "admin" | "user" | "super_admin";
  plano?: string;
  empresa_id: number;
  telefone?: string | null;
}

export interface SalvarBuscaPayload {
  segmento: string;
  localizacao: string;
  tipo_pesquisa: string;
  user: number;
  empresa_id: number;
}

export interface LeadCaptadoPayload {
  nome: string;
  endereco?: string;
  telefone?: string;
  email?: string;
  website?: string;
  rating?: number;
  avaliacoes?: number;
  has_whatsapp?: boolean | null;
  whatsapp_status?: string;
  tags?: string[];
  origem_busca?: string;
  segmento_busca?: string;
  localizacao_busca?: string;
  latitude?: number;
  longitude?: number;
  notas?: string;
  user_id: number;
  empresa_id: number;
}

export interface LeadCaptado {
  id: number;
  created_at: string;
  nome: string;
  endereco: string | null;
  telefone: string | null;
  email: string | null;
  website: string | null;
  rating: number | null;
  avaliacoes: number;
  has_whatsapp: boolean | null;
  whatsapp_status: string | null;
  tags: string[];
  data_captacao: string;
  origem_busca: string | null;
  segmento_busca: string | null;
  localizacao_busca: string | null;
  latitude: number | null;
  longitude: number | null;
  user_id: number;
  etapa_id: number | null;
  valor: number;
  contato: string | null;
  notas: string | null;
  status_funil: string;
  ordem_funil: number;
  decisor_nome: string | null;
  decisor_telefone: string | null;
  decisor_email: string | null;
  decisor_cargo: string | null;
  decisor_enriquecido_em: string | null;
  tamanho_empresa: string | null;
  linkedin_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
}

export interface LeadCaptadoChave {
  telefone: string | null;
  nome: string;
  website: string | null;
}

export interface FunilEtapa {
  id: number;
  nome: string;
  ordem: number;
  cor: string;
  user_id: number;
  created_at: string;
}

export interface FunilTarefa {
  id: number;
  lead_id: number;
  descricao: string;
  data_vencimento: string | null;
  concluida: boolean;
  concluida_em: string | null;
  concluida_por_user_id: number | null;
  created_at: string;
  concluida_por_nome?: string | null;
}

export interface LeadCaptadoComTarefas extends LeadCaptado {
  funil_tarefas: FunilTarefa[];
  captor_nome?: string | null;
}

export interface FunilAutomacao {
  id: number;
  etapa_id: number;
  descricao: string;
  dias_vencimento: number;
  ordem: number;
  empresa_id: number;
  created_at: string;
}

export interface LeadAnotacao {
  id: number;
  lead_id: number;
  texto: string;
  user_id: number;
  empresa_id: number;
  created_at: string;
  user_nome?: string;
}

export interface FunilLogMovimentacao {
  id: number;
  lead_id: number;
  etapa_id: number;
  data_entrada: string;
  user_id: number;
  empresa_id: number;
  user_nome?: string | null;
}

export interface UsuarioEmpresa {
  id: number;
  email: string;
  nome: string | null;
  role: string | null;
  avatar_url: string | null;
}

export type MetaPeriodo = "diario" | "semanal" | "mensal";

export interface Meta {
  id: number;
  nome: string;
  slug: string;
  valor: number;
  periodo: MetaPeriodo;
  fixa: boolean;
  empresa_id: number;
  created_at: string;
}

export interface MetaVendedor {
  id: number;
  meta_id: number;
  user_id: number;
  valor: number;
  empresa_id: number;
}

export interface BuscaRealizada {
  id: number;
  created_at: string;
  segmento: string | null;
  localizacao: string | null;
  tipo_pesquisa: string | null;
  user: number;
  user_nome?: string | null;
  user_email?: string | null;
}

// ─── Normalizadores ──────────────────────────────────────────────────

function asLead(raw: any): LeadCaptado {
  return {
    id: n(raw.id),
    created_at: raw.created_at,
    nome: raw.nome,
    endereco: raw.endereco ?? null,
    telefone: raw.telefone ?? null,
    email: raw.email ?? null,
    website: raw.website ?? null,
    rating: raw.rating == null ? null : Number(raw.rating),
    avaliacoes: n(raw.avaliacoes),
    has_whatsapp: raw.has_whatsapp ?? null,
    whatsapp_status: raw.whatsapp_status ?? null,
    tags: raw.tags ?? [],
    data_captacao: raw.data_captacao,
    origem_busca: raw.origem_busca ?? null,
    segmento_busca: raw.segmento_busca ?? null,
    localizacao_busca: raw.localizacao_busca ?? null,
    latitude: raw.latitude == null ? null : Number(raw.latitude),
    longitude: raw.longitude == null ? null : Number(raw.longitude),
    user_id: n(raw.user_id),
    etapa_id: nOrNull(raw.etapa_id),
    valor: Number(raw.valor ?? 0),
    contato: raw.contato ?? null,
    notas: raw.notas ?? null,
    status_funil: raw.status_funil ?? "em_andamento",
    ordem_funil: n(raw.ordem_funil),
    decisor_nome: raw.decisor_nome ?? null,
    decisor_telefone: raw.decisor_telefone ?? null,
    decisor_email: raw.decisor_email ?? null,
    decisor_cargo: raw.decisor_cargo ?? null,
    decisor_enriquecido_em: raw.decisor_enriquecido_em ?? null,
    tamanho_empresa: raw.tamanho_empresa ?? null,
    linkedin_url: raw.linkedin_url ?? null,
    facebook_url: raw.facebook_url ?? null,
    instagram_url: raw.instagram_url ?? null,
  };
}

function asTarefa(raw: any): FunilTarefa {
  return {
    id: n(raw.id),
    lead_id: n(raw.lead_id),
    descricao: raw.descricao,
    data_vencimento: raw.data_vencimento ?? null,
    concluida: !!raw.concluida,
    concluida_em: raw.concluida_em ?? null,
    concluida_por_user_id: nOrNull(raw.concluida_por_user_id),
    created_at: raw.created_at,
    concluida_por_nome: raw.concluidaPor?.nome ?? null,
  };
}

function asEtapa(raw: any): FunilEtapa {
  return {
    id: n(raw.id),
    nome: raw.nome,
    ordem: n(raw.ordem),
    cor: raw.cor,
    user_id: n(raw.user_id),
    created_at: raw.created_at,
  };
}

function asAutomacao(raw: any): FunilAutomacao {
  return {
    id: n(raw.id),
    etapa_id: n(raw.etapa_id),
    descricao: raw.descricao,
    dias_vencimento: n(raw.dias_vencimento),
    ordem: n(raw.ordem),
    empresa_id: n(raw.empresa_id),
    created_at: raw.created_at,
  };
}

// ─── Vendedores ──────────────────────────────────────────────────────

export async function createUserAsAdmin(payload: CreateUserPayload) {
  const data = await api.post<any>("/api/users", {
    nome: payload.nome,
    email: payload.email,
    password: payload.password,
    role: payload.role === "super_admin" ? "admin" : payload.role || "user",
    telefone: payload.telefone ?? null,
  });
  return { success: true, message: "Usuário criado com sucesso.", userId: data.id };
}

export async function deleteUserAsAdmin(userId: number, _transferToUserId: number) {
  // Backend já faz a remoção; transferência de leads não é mais feita aqui
  // (poderá ser feita por endpoint dedicado no futuro)
  await api.delete(`/api/users/${userId}`);
  return { success: true };
}

// ─── Buscas ──────────────────────────────────────────────────────────

export async function salvarBuscaRealizada(payload: SalvarBuscaPayload) {
  try {
    await api.post("/api/buscas", {
      segmento: payload.segmento,
      localizacao: payload.localizacao,
      tipo_pesquisa: payload.tipo_pesquisa,
    });
  } catch (err) {
    console.warn("Erro ao salvar busca realizada:", err);
  }
}

// ─── Leads ───────────────────────────────────────────────────────────

export async function captarLeads(leads: LeadCaptadoPayload[]) {
  if (leads.length === 0) return { count: 0 };
  const data = await api.post<{ count: number; items: any[] }>("/api/leads/bulk", {
    leads: leads.map((l) => ({
      nome: l.nome,
      endereco: l.endereco ?? null,
      telefone: l.telefone ?? null,
      email: l.email ?? null,
      website: l.website ?? null,
      rating: l.rating ?? null,
      avaliacoes: l.avaliacoes ?? 0,
      has_whatsapp: l.has_whatsapp ?? null,
      whatsapp_status: l.whatsapp_status ?? null,
      tags: l.tags ?? [],
      origem_busca: l.origem_busca ?? null,
      segmento_busca: l.segmento_busca ?? null,
      localizacao_busca: l.localizacao_busca ?? null,
      latitude: l.latitude ?? null,
      longitude: l.longitude ?? null,
    })),
  });
  return { count: data.count };
}

export async function fetchLeadsCaptados(_empresaId: number): Promise<LeadCaptado[]> {
  const data = await api.get<{ items: any[] }>("/api/leads", { query: { pageSize: 200 } });
  return (data.items ?? []).map(asLead);
}

export async function deleteLeadsCaptados(ids: number[], _empresaId: number) {
  if (ids.length === 0) return;
  await api.post("/api/leads/bulk-delete", { ids });
}

export async function fetchChavesLeadsCaptados(_empresaId: number): Promise<LeadCaptadoChave[]> {
  const data = await api.get<{ items: any[] }>("/api/leads", {
    query: { pageSize: 200 },
  });
  return (data.items ?? []).map((r) => ({
    telefone: r.telefone ?? null,
    nome: r.nome,
    website: r.website ?? null,
  }));
}

// ─── Funil — Etapas ──────────────────────────────────────────────────

export async function fetchFunilEtapas(_empresaId: number): Promise<FunilEtapa[]> {
  const data = await api.get<any[]>("/api/funil/etapas");
  return data.map(asEtapa);
}

const ETAPAS_PADRAO = [
  { nome: "Novo Lead", ordem: 0, cor: "#6b7280" },
  { nome: "Contato Realizado", ordem: 1, cor: "#3b82f6" },
  { nome: "Cliente Respondeu", ordem: 2, cor: "#8b5cf6" },
  { nome: "Reunião Marcada", ordem: 3, cor: "#f59e0b" },
  { nome: "Fechado / Ganho", ordem: 4, cor: "#22c55e" },
  { nome: "Perdido", ordem: 5, cor: "#e00000" },
];

export async function criarEtapasPadrao(_userId: number, _empresaId: number): Promise<FunilEtapa[]> {
  const created: FunilEtapa[] = [];
  for (const e of ETAPAS_PADRAO) {
    const r = await api.post<any>("/api/funil/etapas", { nome: e.nome, cor: e.cor, ordem: e.ordem });
    created.push(asEtapa(r));
  }
  return created;
}

export async function atualizarFunilEtapa(
  id: number,
  patch: { nome?: string; cor?: string }
): Promise<FunilEtapa> {
  const r = await api.put<any>(`/api/funil/etapas/${id}`, patch);
  return asEtapa(r);
}

export async function criarFunilEtapa(payload: {
  nome: string;
  ordem: number;
  cor: string;
  user_id: number;
  empresa_id: number;
}): Promise<FunilEtapa> {
  const r = await api.post<any>("/api/funil/etapas", {
    nome: payload.nome,
    cor: payload.cor,
    ordem: payload.ordem,
  });
  return asEtapa(r);
}

export async function deletarFunilEtapa(id: number, _empresaId: number): Promise<void> {
  await api.delete(`/api/funil/etapas/${id}`);
}

export async function reordenarFunilEtapas(
  updates: { id: number; ordem: number }[]
): Promise<void> {
  const sorted = [...updates].sort((a, b) => a.ordem - b.ordem);
  await api.post("/api/funil/etapas/reorder", { ids: sorted.map((u) => u.id) });
}

// ─── Funil — Leads ───────────────────────────────────────────────────

export async function fetchLeadsFunil(_empresaId: number): Promise<LeadCaptadoComTarefas[]> {
  const data = await api.get<{ items: any[] }>("/api/leads", { query: { pageSize: 500 } });
  // filtra leads com etapa_id e enriquece com tarefas
  const leads = (data.items ?? []).filter((l) => l.etapa_id != null);
  // Tarefas em batch — pega todas e agrupa
  const tarefas = await api.get<any[]>("/api/funil/tarefas");
  const byLead = new Map<number, FunilTarefa[]>();
  for (const t of tarefas) {
    const arr = byLead.get(n(t.lead_id)) ?? [];
    arr.push(asTarefa(t));
    byLead.set(n(t.lead_id), arr);
  }
  return leads.map((raw) => ({
    ...asLead(raw),
    funil_tarefas: byLead.get(n(raw.id)) ?? [],
    captor_nome: raw.user?.nome ?? null,
  }));
}

export async function fetchLeadsSemEtapa(_empresaId: number): Promise<
  Pick<LeadCaptado, "id" | "nome" | "telefone" | "segmento_busca">[]
> {
  const data = await api.get<{ items: any[] }>("/api/leads", { query: { pageSize: 500 } });
  return (data.items ?? [])
    .filter((l) => l.etapa_id == null)
    .map((l) => ({
      id: n(l.id),
      nome: l.nome,
      telefone: l.telefone ?? null,
      segmento_busca: l.segmento_busca ?? null,
    }));
}

export async function adicionarLeadAoFunil(
  leadId: number,
  etapaId: number,
  ordem: number,
  _userId: number,
  _empresaId: number
): Promise<void> {
  await api.put(`/api/leads/${leadId}`, { etapa_id: etapaId, ordem_funil: ordem, status_funil: "em_andamento" });
  await api.post(`/api/leads/${leadId}/move`, { etapa_id: etapaId });
}

export async function atualizarLeadFunil(
  leadId: number,
  updates: Partial<Pick<LeadCaptado, "valor" | "contato" | "notas" | "status_funil">>
): Promise<void> {
  await api.put(`/api/leads/${leadId}`, updates);
}

export async function moverLeadEtapa(
  leadId: number,
  novaEtapaId: number,
  novaOrdem: number,
  _userId: number,
  _empresaId: number
): Promise<void> {
  await api.put(`/api/leads/${leadId}`, { ordem_funil: novaOrdem });
  await api.post(`/api/leads/${leadId}/move`, { etapa_id: novaEtapaId });
}

export async function removerLeadDoFunil(leadId: number): Promise<void> {
  await api.put(`/api/leads/${leadId}`, {
    etapa_id: null,
    valor: 0,
    contato: null,
    notas: null,
    status_funil: "em_andamento",
    ordem_funil: 0,
  });
}

// ─── Funil — Tarefas ─────────────────────────────────────────────────

export async function criarFunilTarefa(
  payload: Omit<FunilTarefa, "id" | "created_at"> & { empresa_id: number }
): Promise<FunilTarefa> {
  const r = await api.post<any>("/api/funil/tarefas", {
    lead_id: payload.lead_id,
    descricao: payload.descricao,
    data_vencimento: payload.data_vencimento,
  });
  return asTarefa(r);
}

export async function atualizarFunilTarefa(
  id: number,
  updates: Partial<Omit<FunilTarefa, "id" | "created_at" | "lead_id" | "concluida_por_nome">>,
  _concluidaPorUserId?: number
): Promise<void> {
  const body: any = {};
  if (updates.descricao !== undefined) body.descricao = updates.descricao;
  if (updates.data_vencimento !== undefined) body.data_vencimento = updates.data_vencimento;
  if (updates.concluida !== undefined) body.concluida = updates.concluida;
  await api.put(`/api/funil/tarefas/${id}`, body);
}

export async function deletarFunilTarefa(id: number): Promise<void> {
  await api.delete(`/api/funil/tarefas/${id}`);
}

// ─── Funil — Automações ──────────────────────────────────────────────

export async function fetchFunilAutomacoes(_empresaId: number): Promise<FunilAutomacao[]> {
  const data = await api.get<any[]>("/api/funil/automacoes");
  return data.map(asAutomacao);
}

export async function criarFunilAutomacao(
  payload: Omit<FunilAutomacao, "id" | "created_at">
): Promise<FunilAutomacao> {
  const r = await api.post<any>("/api/funil/automacoes", {
    etapa_id: payload.etapa_id,
    descricao: payload.descricao,
    dias_vencimento: payload.dias_vencimento,
    ordem: payload.ordem,
  });
  return asAutomacao(r);
}

export async function atualizarFunilAutomacao(
  _id: number,
  _updates: Partial<Pick<FunilAutomacao, "descricao" | "dias_vencimento" | "ordem">>
): Promise<void> {
  // Backend ainda não tem endpoint update específico; usar delete+create se necessário
  console.warn("atualizarFunilAutomacao: endpoint ainda não implementado no backend");
}

export async function deletarFunilAutomacao(id: number): Promise<void> {
  await api.delete(`/api/funil/automacoes/${id}`);
}

export async function executarAutomacoesParaEtapa(
  _leadId: number,
  _etapaId: number,
  _empresaId: number
): Promise<FunilTarefa[]> {
  // Backend deveria executar automações ao mover. Por ora, retorna vazio.
  return [];
}

// ─── Lead individual ─────────────────────────────────────────────────

export async function fetchLeadById(id: number, _empresaId: number): Promise<LeadCaptadoComTarefas> {
  const raw = await api.get<any>(`/api/leads/${id}`);
  return {
    ...asLead(raw),
    funil_tarefas: (raw.tarefas ?? []).map(asTarefa),
    captor_nome: raw.user?.nome ?? null,
  };
}

export async function atualizarLead(
  id: number,
  updates: Partial<LeadCaptado>
): Promise<void> {
  await api.put(`/api/leads/${id}`, updates);
}

/**
 * Salva os dados de enriquecimento e DEBITA 2 créditos da empresa.
 * Use ao invés de atualizarLead quando o update vier de uma operação de enriquecimento.
 */
export async function enriquecerLeadNoBackend(
  id: number,
  updates: {
    decisor_nome?: string | null;
    decisor_telefone?: string | null;
    decisor_email?: string | null;
    decisor_cargo?: string | null;
    tamanho_empresa?: string | null;
    linkedin_url?: string | null;
    facebook_url?: string | null;
    instagram_url?: string | null;
  }
): Promise<void> {
  await api.post(`/api/leads/${id}/enrich`, updates);
}

// ─── Lead — Anotações ────────────────────────────────────────────────

export async function fetchLeadAnotacoes(leadId: number): Promise<LeadAnotacao[]> {
  const data = await api.get<any[]>("/api/anotacoes", { query: { lead_id: leadId } });
  return data.map((a: any) => ({
    id: n(a.id),
    lead_id: n(a.lead_id),
    texto: a.texto,
    user_id: n(a.user_id),
    empresa_id: n(a.empresa_id),
    created_at: a.created_at,
    user_nome: a.user?.nome ?? null,
  }));
}

export async function criarLeadAnotacao(payload: {
  lead_id: number;
  texto: string;
  user_id: number;
  empresa_id: number;
}): Promise<LeadAnotacao> {
  const r = await api.post<any>("/api/anotacoes", { lead_id: payload.lead_id, texto: payload.texto });
  return {
    id: n(r.id),
    lead_id: n(r.lead_id),
    texto: r.texto,
    user_id: n(r.user_id),
    empresa_id: n(r.empresa_id),
    created_at: r.created_at,
  };
}

export async function atualizarLeadAnotacao(id: number, texto: string): Promise<void> {
  await api.put(`/api/anotacoes/${id}`, { texto });
}

export async function deletarLeadAnotacao(id: number): Promise<void> {
  await api.delete(`/api/anotacoes/${id}`);
}

// ─── Funil — Logs ────────────────────────────────────────────────────

export async function fetchFunilLogs(_empresaId: number): Promise<FunilLogMovimentacao[]> {
  const data = await api.get<any[]>("/api/funil/logs");
  return data.map((l: any) => ({
    id: n(l.id),
    lead_id: n(l.lead_id),
    etapa_id: n(l.etapa_id),
    data_entrada: l.data_entrada,
    user_id: n(l.user_id),
    empresa_id: n(l.empresa_id),
    user_nome: l.user?.nome ?? null,
  }));
}

export async function fetchFunilLogsByLead(leadId: number): Promise<FunilLogMovimentacao[]> {
  const data = await api.get<any[]>("/api/funil/logs", { query: { lead_id: leadId } });
  return data.map((l: any) => ({
    id: n(l.id),
    lead_id: n(l.lead_id),
    etapa_id: n(l.etapa_id),
    data_entrada: l.data_entrada,
    user_id: n(l.user_id),
    empresa_id: n(l.empresa_id),
    user_nome: l.user?.nome ?? null,
  }));
}

// ─── Usuários da empresa ─────────────────────────────────────────────

export async function fetchUsuariosEmpresa(_empresaId: number): Promise<UsuarioEmpresa[]> {
  const data = await api.get<any[]>("/api/users");
  return data.map((u: any) => ({
    id: n(u.id),
    email: u.email,
    nome: u.nome ?? null,
    role: u.role ?? null,
    avatar_url: u.avatar_url ?? null,
  }));
}

// ─── Metas ───────────────────────────────────────────────────────────

export async function fetchMetas(_empresaId: number): Promise<Meta[]> {
  const data = await api.get<any[]>("/api/metas");
  return data.map((m: any) => ({
    id: n(m.id),
    nome: m.nome,
    slug: m.slug,
    valor: n(m.valor),
    periodo: m.periodo,
    fixa: !!m.fixa,
    empresa_id: n(m.empresa_id),
    created_at: m.created_at,
  }));
}

export async function fetchMetasVendedor(_empresaId: number): Promise<MetaVendedor[]> {
  const data = await api.get<any[]>("/api/metas");
  const out: MetaVendedor[] = [];
  for (const m of data) {
    for (const mv of m.vendedores ?? []) {
      out.push({
        id: n(mv.id),
        meta_id: n(mv.meta_id),
        user_id: n(mv.user_id),
        valor: n(mv.valor),
        empresa_id: n(mv.empresa_id),
      });
    }
  }
  return out;
}

export async function upsertMeta(meta: {
  id?: number;
  nome: string;
  slug: string;
  valor: number;
  periodo?: MetaPeriodo;
  fixa?: boolean;
  empresa_id: number;
}): Promise<Meta> {
  if (meta.id) {
    const r = await api.put<any>(`/api/metas/${meta.id}`, {
      nome: meta.nome,
      valor: meta.valor,
      periodo: meta.periodo ?? "mensal",
    });
    return {
      id: n(r.id),
      nome: r.nome,
      slug: r.slug,
      valor: n(r.valor),
      periodo: r.periodo,
      fixa: !!r.fixa,
      empresa_id: n(r.empresa_id),
      created_at: r.created_at,
    };
  }
  const r = await api.post<any>("/api/metas", {
    nome: meta.nome,
    slug: meta.slug,
    valor: meta.valor,
    periodo: meta.periodo ?? "mensal",
  });
  return {
    id: n(r.id),
    nome: r.nome,
    slug: r.slug,
    valor: n(r.valor),
    periodo: r.periodo,
    fixa: !!r.fixa,
    empresa_id: n(r.empresa_id),
    created_at: r.created_at,
  };
}

export async function deleteMeta(id: number): Promise<void> {
  await api.delete(`/api/metas/${id}`);
}

export async function upsertMetaVendedor(payload: {
  meta_id: number;
  user_id: number;
  valor: number;
  empresa_id: number;
}): Promise<MetaVendedor> {
  const r = await api.post<any>("/api/metas/vendedor", {
    meta_id: payload.meta_id,
    user_id: payload.user_id,
    valor: payload.valor,
  });
  return {
    id: n(r.id),
    meta_id: n(r.meta_id),
    user_id: n(r.user_id),
    valor: n(r.valor),
    empresa_id: n(r.empresa_id),
  };
}

export async function deleteMetaVendedor(metaId: number, userId: number): Promise<void> {
  await api.post("/api/metas/vendedor", { meta_id: metaId, user_id: userId, valor: 0 });
}

// ─── Ranking ─────────────────────────────────────────────────────────

export async function fetchVendedoresRanking(desde?: string | null, _ate?: string | null) {
  const data = await api.get<any[]>("/api/ranking", {
    query: desde ? { desde } : undefined,
  });
  return data.map((v: any) => ({
    id: n(v.id),
    nome: v.nome ?? "",
    avatar_url: v.avatar_url ?? null,
    leads: n(v.leads),
    qualificados: n(v.qualificados),
    vendas: n(v.vendas ?? 0),
    buscas: n(v.buscas),
  }));
}

// ─── Buscas realizadas ───────────────────────────────────────────────

export async function fetchBuscasRealizadas(_empresaId: number): Promise<BuscaRealizada[]> {
  const data = await api.get<{ items: any[] }>("/api/buscas", { query: { pageSize: 200 } });
  return (data.items ?? []).map((row: any) => ({
    id: n(row.id),
    created_at: row.created_at,
    segmento: row.segmento ?? null,
    localizacao: row.localizacao ?? null,
    tipo_pesquisa: row.tipo_pesquisa ?? null,
    user: n(row.user_id),
    user_nome: row.user?.nome ?? null,
    user_email: row.user?.email ?? null,
  }));
}
