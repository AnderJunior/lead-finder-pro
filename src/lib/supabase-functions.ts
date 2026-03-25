import { supabase, supabaseAdmin } from "./supabase";

export interface CreateUserPayload {
  nome: string;
  email: string;
  password: string;
  role?: "admin" | "user" | "super_admin";
  plano?: string;
  empresa_id: number;
}

export async function createUserAsAdmin(payload: CreateUserPayload) {
  if (!supabaseAdmin) {
    throw new Error(
      "Service Role Key não configurada. Defina VITE_SUPABASE_SERVICE_ROLE_KEY no .env"
    );
  }

  const { nome, email, password, role = "user", plano = "básico", empresa_id } = payload;

  const { data: newAuthUser, error: createError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (createError) throw new Error(createError.message);

  if (!newAuthUser.user) {
    throw new Error("Erro ao criar vendedor no auth.");
  }

  const { error: insertError } = await supabaseAdmin.from("users").insert({
    nome,
    email,
    auth_id: newAuthUser.user.id,
    role: role || "user",
    plano: plano || "básico",
    status: "ativo",
    empresa_id,
  });

  if (insertError) {
    await supabaseAdmin.auth.admin.deleteUser(newAuthUser.user.id);
    throw new Error(`Erro ao criar perfil: ${insertError.message}`);
  }

  return {
    success: true,
    message: "Usuário criado com sucesso.",
    userId: newAuthUser.user.id,
  };
}

export interface SalvarBuscaPayload {
  segmento: string;
  localizacao: string;
  tipo_pesquisa: string;
  user: number;
  empresa_id: number;
}

export async function salvarBuscaRealizada(payload: SalvarBuscaPayload) {
  const { error } = await supabase
    .from("buscas_realizadas")
    .insert({
      segmento: payload.segmento,
      localizacao: payload.localizacao,
      tipo_pesquisa: payload.tipo_pesquisa,
      user: payload.user,
      empresa_id: payload.empresa_id,
    });

  if (error) {
    console.warn("Erro ao salvar busca realizada:", error.message);
  }
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

export async function captarLeads(leads: LeadCaptadoPayload[]) {
  if (leads.length === 0) return { count: 0 };

  const userId = leads[0].user_id;
  const empresaId = leads[0].empresa_id;
  const etapas = await fetchFunilEtapas(empresaId);
  const etapaNovoLead = etapas.find((e) => e.ordem === 0);

  const rows = leads.map((l, i) => ({
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
    notas: l.notas ?? null,
    user_id: l.user_id,
    empresa_id: l.empresa_id,
    data_captacao: new Date().toISOString(),
    etapa_id: etapaNovoLead?.id ?? null,
    status_funil: "em_andamento",
    ordem_funil: i,
  }));

  const { error, data } = await supabase
    .from("leads_captados")
    .insert(rows)
    .select("id");

  if (error) throw new Error(error.message);

  if (etapaNovoLead && data) {
    const logs = data.map((lead) => ({
      lead_id: lead.id,
      etapa_id: etapaNovoLead.id,
      user_id: userId,
      empresa_id: empresaId,
    }));
    await supabase.from("funil_logs_movimentacao").insert(logs);

    // Executa automações da etapa "Novo Lead" para cada lead captado
    await Promise.all(
      data.map((lead) => executarAutomacoesParaEtapa(lead.id, etapaNovoLead.id, empresaId))
    );
  }

  return { count: data?.length ?? rows.length };
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

export async function fetchLeadsCaptados(empresaId: number): Promise<LeadCaptado[]> {
  const { data, error } = await supabase
    .from("leads_captados")
    .select("*")
    .eq("empresa_id", empresaId)
    .order("data_captacao", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as LeadCaptado[]) ?? [];
}

export async function deleteLeadsCaptados(ids: number[], empresaId: number) {
  if (ids.length === 0) return;

  const { error } = await supabase
    .from("leads_captados")
    .delete()
    .in("id", ids)
    .eq("empresa_id", empresaId);

  if (error) throw new Error(error.message);
}

export interface LeadCaptadoChave {
  telefone: string | null;
  nome: string;
  website: string | null;
}

export async function fetchChavesLeadsCaptados(empresaId: number): Promise<LeadCaptadoChave[]> {
  const { data, error } = await supabase
    .from("leads_captados")
    .select("telefone, nome, website")
    .eq("empresa_id", empresaId);

  if (error) throw new Error(error.message);
  return (data as LeadCaptadoChave[]) ?? [];
}

// ─── Funil Comercial ────────────────────────────────────────────────

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

export async function fetchFunilEtapas(empresaId: number): Promise<FunilEtapa[]> {
  const { data, error } = await supabase
    .from("funil_etapas")
    .select("*")
    .eq("empresa_id", empresaId)
    .order("ordem", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as FunilEtapa[]) ?? [];
}

const ETAPAS_PADRAO = [
  { nome: "Novo Lead",          ordem: 0, cor: "#6b7280" },
  { nome: "Contato Realizado",  ordem: 1, cor: "#3b82f6" },
  { nome: "Cliente Respondeu",  ordem: 2, cor: "#8b5cf6" },
  { nome: "Reunião Marcada",    ordem: 3, cor: "#f59e0b" },
  { nome: "Fechado / Ganho",    ordem: 4, cor: "#22c55e" },
  { nome: "Perdido",            ordem: 5, cor: "#e00000" },
];

export async function criarEtapasPadrao(userId: number, empresaId: number): Promise<FunilEtapa[]> {
  const rows = ETAPAS_PADRAO.map((e) => ({
    ...e,
    user_id: userId,
    empresa_id: empresaId,
  }));

  const { data, error } = await supabase
    .from("funil_etapas")
    .insert(rows)
    .select("*")
    .order("ordem", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as FunilEtapa[]) ?? [];
}

export async function atualizarFunilEtapa(
  id: number,
  patch: { nome?: string; cor?: string }
): Promise<FunilEtapa> {
  const { data, error } = await supabase
    .from("funil_etapas")
    .update(patch)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as FunilEtapa;
}

export async function criarFunilEtapa(payload: {
  nome: string;
  ordem: number;
  cor: string;
  user_id: number;
  empresa_id: number;
}): Promise<FunilEtapa> {
  const { data, error } = await supabase
    .from("funil_etapas")
    .insert(payload)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data as FunilEtapa;
}

export async function deletarFunilEtapa(id: number, empresaId: number): Promise<void> {
  const todas = await fetchFunilEtapas(empresaId);
  const etapaOrdem0 = todas.find((e) => e.ordem === 0);
  const etapa = todas.find((e) => e.id === id);
  if (!etapaOrdem0) throw new Error("Etapa de ordem 0 não encontrada.");
  if (etapa?.ordem === 0) throw new Error("Não é possível excluir a etapa de ordem 0.");

  const { error: errUpdate } = await supabase
    .from("leads_captados")
    .update({ etapa_id: etapaOrdem0.id })
    .eq("etapa_id", id);

  if (errUpdate) throw new Error(errUpdate.message);

  const { error } = await supabase.from("funil_etapas").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function reordenarFunilEtapas(
  updates: { id: number; ordem: number }[]
): Promise<void> {
  for (const { id, ordem } of updates) {
    const { error } = await supabase.from("funil_etapas").update({ ordem }).eq("id", id);
    if (error) throw new Error(error.message);
  }
}

export async function fetchLeadsFunil(empresaId: number): Promise<LeadCaptadoComTarefas[]> {
  const { data, error } = await supabase
    .from("leads_captados")
    .select("*, funil_tarefas(*)")
    .eq("empresa_id", empresaId)
    .not("etapa_id", "is", null)
    .order("ordem_funil", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as LeadCaptadoComTarefas[]) ?? [];
}

export async function fetchLeadsSemEtapa(empresaId: number): Promise<
  Pick<LeadCaptado, "id" | "nome" | "telefone" | "segmento_busca">[]
> {
  const { data, error } = await supabase
    .from("leads_captados")
    .select("id, nome, telefone, segmento_busca")
    .eq("empresa_id", empresaId)
    .is("etapa_id", null)
    .order("data_captacao", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

async function registrarLogMovimentacao(
  leadId: number,
  etapaId: number,
  userId: number,
  empresaId: number
): Promise<void> {
  const { error } = await supabase
    .from("funil_logs_movimentacao")
    .insert({ lead_id: leadId, etapa_id: etapaId, user_id: userId, empresa_id: empresaId });

  if (error) {
    console.warn("Erro ao registrar log de movimentação:", error.message);
  }
}

export async function adicionarLeadAoFunil(
  leadId: number,
  etapaId: number,
  ordem: number,
  userId: number,
  empresaId: number
): Promise<void> {
  const { error } = await supabase
    .from("leads_captados")
    .update({
      etapa_id: etapaId,
      status_funil: "em_andamento",
      ordem_funil: ordem,
    })
    .eq("id", leadId);

  if (error) throw new Error(error.message);

  await registrarLogMovimentacao(leadId, etapaId, userId, empresaId);
}

export async function atualizarLeadFunil(
  leadId: number,
  updates: Partial<
    Pick<LeadCaptado, "valor" | "contato" | "notas" | "status_funil">
  >
): Promise<void> {
  const { error } = await supabase
    .from("leads_captados")
    .update(updates)
    .eq("id", leadId);

  if (error) throw new Error(error.message);
}

export async function moverLeadEtapa(
  leadId: number,
  novaEtapaId: number,
  novaOrdem: number,
  userId: number,
  empresaId: number
): Promise<void> {
  const { error } = await supabase
    .from("leads_captados")
    .update({ etapa_id: novaEtapaId, ordem_funil: novaOrdem })
    .eq("id", leadId);

  if (error) throw new Error(error.message);

  await registrarLogMovimentacao(leadId, novaEtapaId, userId, empresaId);
}

export async function removerLeadDoFunil(leadId: number): Promise<void> {
  const { error } = await supabase
    .from("leads_captados")
    .update({
      etapa_id: null,
      valor: 0,
      contato: null,
      notas: null,
      status_funil: "em_andamento",
      ordem_funil: 0,
    })
    .eq("id", leadId);

  if (error) throw new Error(error.message);
}

export async function criarFunilTarefa(
  payload: Omit<FunilTarefa, "id" | "created_at"> & { empresa_id: number }
): Promise<FunilTarefa> {
  const { data, error } = await supabase
    .from("funil_tarefas")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as FunilTarefa;
}

export async function atualizarFunilTarefa(
  id: number,
  updates: Partial<Omit<FunilTarefa, "id" | "created_at" | "lead_id" | "concluida_por_nome">>,
  concluidaPorUserId?: number
): Promise<void> {
  if (updates.concluida === true && !updates.concluida_em) {
    updates.concluida_em = new Date().toISOString();
    if (concluidaPorUserId != null) {
      (updates as Record<string, unknown>).concluida_por_user_id = concluidaPorUserId;
    }
  } else if (updates.concluida === false) {
    updates.concluida_em = null;
    (updates as Record<string, unknown>).concluida_por_user_id = null;
  }

  const { error } = await supabase
    .from("funil_tarefas")
    .update(updates)
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function deletarFunilTarefa(id: number): Promise<void> {
  const { error } = await supabase
    .from("funil_tarefas")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}

// ─── Automações do funil (templates de tarefas por etapa) ───────────

export interface FunilAutomacao {
  id: number;
  etapa_id: number;
  descricao: string;
  dias_vencimento: number;
  ordem: number;
  empresa_id: number;
  created_at: string;
}

export async function fetchFunilAutomacoes(empresaId: number): Promise<FunilAutomacao[]> {
  const { data, error } = await supabase
    .from("funil_automacoes")
    .select("*")
    .eq("empresa_id", empresaId)
    .order("etapa_id")
    .order("ordem");

  if (error) throw new Error(error.message);
  return (data as FunilAutomacao[]) ?? [];
}

export async function criarFunilAutomacao(
  payload: Omit<FunilAutomacao, "id" | "created_at">
): Promise<FunilAutomacao> {
  const { data, error } = await supabase
    .from("funil_automacoes")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as FunilAutomacao;
}

export async function atualizarFunilAutomacao(
  id: number,
  updates: Partial<Pick<FunilAutomacao, "descricao" | "dias_vencimento" | "ordem">>
): Promise<void> {
  const { error } = await supabase
    .from("funil_automacoes")
    .update(updates)
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function deletarFunilAutomacao(id: number): Promise<void> {
  const { error } = await supabase
    .from("funil_automacoes")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function executarAutomacoesParaEtapa(
  leadId: number,
  etapaId: number,
  empresaId: number
): Promise<FunilTarefa[]> {
  const automacoes = await fetchFunilAutomacoes(empresaId);
  const daEtapa = automacoes.filter((a) => a.etapa_id === etapaId);

  if (daEtapa.length === 0) return [];

  const tarefas = daEtapa.map((a) => ({
    lead_id: leadId,
    descricao: a.descricao,
    data_vencimento: a.dias_vencimento > 0
      ? new Date(Date.now() + a.dias_vencimento * 86_400_000).toISOString()
      : null,
    concluida: false,
    empresa_id: empresaId,
  }));

  const { data, error } = await supabase
    .from("funil_tarefas")
    .insert(tarefas)
    .select("*");

  if (error) throw new Error(error.message);
  return (data as FunilTarefa[]) ?? [];
}

// ─── Lead individual ─────────────────────────────────────────────────

export async function fetchLeadById(id: number, empresaId: number): Promise<LeadCaptadoComTarefas> {
  const { data, error } = await supabase
    .from("leads_captados")
    .select("*, captor:user_id(nome), funil_tarefas(*, concluidor:concluida_por_user_id(nome))")
    .eq("id", id)
    .eq("empresa_id", empresaId)
    .single();

  if (error) throw new Error(error.message);
  const lead = data as any;
  const { captor, funil_tarefas: tarefas, ...rest } = lead;
  return {
    ...rest,
    captor_nome: captor?.nome ?? null,
    funil_tarefas: (tarefas ?? []).map((t: any) => {
      const { concluidor, ...tRest } = t;
      return { ...tRest, concluida_por_nome: concluidor?.nome ?? null };
    }),
  } as LeadCaptadoComTarefas;
}

export async function atualizarLead(
  id: number,
  updates: Partial<Pick<LeadCaptado, "nome" | "telefone" | "endereco" | "email" | "website" | "origem_busca" | "segmento_busca" | "valor" | "contato" | "notas" | "status_funil" | "decisor_nome" | "decisor_telefone" | "decisor_email" | "decisor_cargo" | "decisor_enriquecido_em" | "tamanho_empresa" | "linkedin_url" | "facebook_url" | "instagram_url">>
): Promise<void> {
  const { error } = await supabase
    .from("leads_captados")
    .update(updates)
    .eq("id", id);

  if (error) throw new Error(error.message);
}

// ─── Anotações do lead ──────────────────────────────────────────────

export interface LeadAnotacao {
  id: number;
  lead_id: number;
  texto: string;
  user_id: number;
  empresa_id: number;
  created_at: string;
  user_nome?: string;
}

export async function fetchLeadAnotacoes(leadId: number): Promise<LeadAnotacao[]> {
  const { data, error } = await supabase
    .from("lead_anotacoes")
    .select("*, users:user_id(nome)")
    .eq("lead_id", leadId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return ((data ?? []) as any[]).map((row) => ({
    id: row.id,
    lead_id: row.lead_id,
    texto: row.texto,
    user_id: row.user_id,
    empresa_id: row.empresa_id,
    created_at: row.created_at,
    user_nome: row.users?.nome ?? null,
  }));
}

export async function criarLeadAnotacao(
  payload: { lead_id: number; texto: string; user_id: number; empresa_id: number }
): Promise<LeadAnotacao> {
  const { data, error } = await supabase
    .from("lead_anotacoes")
    .insert(payload)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  return data as LeadAnotacao;
}

export async function atualizarLeadAnotacao(id: number, texto: string): Promise<void> {
  const { error } = await supabase
    .from("lead_anotacoes")
    .update({ texto })
    .eq("id", id);

  if (error) throw new Error(error.message);
}

export async function deletarLeadAnotacao(id: number): Promise<void> {
  const { error } = await supabase
    .from("lead_anotacoes")
    .delete()
    .eq("id", id);

  if (error) throw new Error(error.message);
}

// ─── Logs de movimentação do funil ──────────────────────────────────

export interface FunilLogMovimentacao {
  id: number;
  lead_id: number;
  etapa_id: number;
  data_entrada: string;
  user_id: number;
  empresa_id: number;
  user_nome?: string | null;
}

export async function fetchFunilLogs(empresaId: number): Promise<FunilLogMovimentacao[]> {
  const { data, error } = await supabase
    .from("funil_logs_movimentacao")
    .select("*")
    .eq("empresa_id", empresaId)
    .order("data_entrada", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as FunilLogMovimentacao[]) ?? [];
}

export async function fetchFunilLogsByLead(leadId: number): Promise<FunilLogMovimentacao[]> {
  const { data, error } = await supabase
    .from("funil_logs_movimentacao")
    .select("*, mover:user_id(nome)")
    .eq("lead_id", leadId)
    .order("data_entrada", { ascending: true });

  if (error) throw new Error(error.message);
  return ((data ?? []) as any[]).map((row: any) => {
    const { mover, ...rest } = row;
    return { ...rest, user_nome: mover?.nome ?? null };
  }) as FunilLogMovimentacao[];
}

// ─── Usuários da empresa ────────────────────────────────────────────

export interface UsuarioEmpresa {
  id: number;
  email: string;
  nome: string | null;
  role: string | null;
  avatar_url: string | null;
}

export async function fetchUsuariosEmpresa(empresaId: number): Promise<UsuarioEmpresa[]> {
  const { data, error } = await supabase
    .from("users")
    .select("id, email, nome, role, avatar_url")
    .eq("empresa_id", empresaId)
    .order("nome", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as UsuarioEmpresa[]) ?? [];
}

// ─── Metas ──────────────────────────────────────────────────────────

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

export async function fetchMetas(empresaId: number): Promise<Meta[]> {
  const { data, error } = await supabase
    .from("metas")
    .select("*")
    .eq("empresa_id", empresaId)
    .order("fixa", { ascending: false })
    .order("created_at", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as Meta[]) ?? [];
}

export async function fetchMetasVendedor(empresaId: number): Promise<MetaVendedor[]> {
  const { data, error } = await supabase
    .from("metas_vendedor")
    .select("*")
    .eq("empresa_id", empresaId);

  if (error) throw new Error(error.message);
  return (data as MetaVendedor[]) ?? [];
}

export async function upsertMeta(
  meta: { id?: number; nome: string; slug: string; valor: number; periodo?: MetaPeriodo; fixa?: boolean; empresa_id: number }
): Promise<Meta> {
  if (meta.id) {
    const { data, error } = await supabase
      .from("metas")
      .update({
        nome: meta.nome,
        valor: meta.valor,
        periodo: meta.periodo ?? "mensal",
        updated_at: new Date().toISOString(),
      })
      .eq("id", meta.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as Meta;
  }

  const { data, error } = await supabase
    .from("metas")
    .insert({
      nome: meta.nome,
      slug: meta.slug,
      valor: meta.valor,
      periodo: meta.periodo ?? "mensal",
      fixa: meta.fixa ?? false,
      empresa_id: meta.empresa_id,
    })
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as Meta;
}

export async function deleteMeta(id: number): Promise<void> {
  const { error } = await supabase.from("metas").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function upsertMetaVendedor(
  payload: { meta_id: number; user_id: number; valor: number; empresa_id: number }
): Promise<MetaVendedor> {
  const { data: existing } = await supabase
    .from("metas_vendedor")
    .select("id")
    .eq("meta_id", payload.meta_id)
    .eq("user_id", payload.user_id)
    .maybeSingle();

  if (existing) {
    const { data, error } = await supabase
      .from("metas_vendedor")
      .update({ valor: payload.valor, updated_at: new Date().toISOString() })
      .eq("id", existing.id)
      .select("*")
      .single();
    if (error) throw new Error(error.message);
    return data as MetaVendedor;
  }

  const { data, error } = await supabase
    .from("metas_vendedor")
    .insert(payload)
    .select("*")
    .single();
  if (error) throw new Error(error.message);
  return data as MetaVendedor;
}

export async function deleteMetaVendedor(metaId: number, userId: number): Promise<void> {
  const { error } = await supabase
    .from("metas_vendedor")
    .delete()
    .eq("meta_id", metaId)
    .eq("user_id", userId);
  if (error) throw new Error(error.message);
}

export async function deleteUserAsAdmin(userId: number, transferToUserId: number) {
  if (!supabaseAdmin) {
    throw new Error(
      "Service Role Key não configurada. Defina VITE_SUPABASE_SERVICE_ROLE_KEY no .env"
    );
  }

  const { data: user, error: fetchErr } = await supabaseAdmin
    .from("users")
    .select("auth_id")
    .eq("id", userId)
    .single();

  if (fetchErr || !user) throw new Error("Vendedor não encontrado.");

  const { error: transferLeads } = await supabaseAdmin
    .from("leads_captados")
    .update({ user_id: transferToUserId })
    .eq("user_id", userId);
  if (transferLeads) throw new Error(`Erro ao transferir leads: ${transferLeads.message}`);

  const { error: transferBuscas } = await supabaseAdmin
    .from("buscas_realizadas")
    .update({ user: transferToUserId })
    .eq("user", userId);
  if (transferBuscas) throw new Error(`Erro ao transferir buscas: ${transferBuscas.message}`);

  const { error: transferLogs } = await supabaseAdmin
    .from("funil_logs_movimentacao")
    .update({ user_id: transferToUserId })
    .eq("user_id", userId);
  if (transferLogs) throw new Error(`Erro ao transferir logs do funil: ${transferLogs.message}`);

  const { error: delMetasErr } = await supabaseAdmin
    .from("metas_vendedor")
    .delete()
    .eq("user_id", userId);
  if (delMetasErr) throw new Error(`Erro ao remover metas: ${delMetasErr.message}`);

  const { error: delUserErr } = await supabaseAdmin
    .from("users")
    .delete()
    .eq("id", userId);
  if (delUserErr) throw new Error(`Erro ao remover perfil: ${delUserErr.message}`);

  if (user.auth_id) {
    const { error: authErr } = await supabaseAdmin.auth.admin.deleteUser(user.auth_id);
    if (authErr) {
      console.warn("Perfil removido mas falha ao remover auth:", authErr.message);
    }
  }

  return { success: true };
}

// ─── Ranking de vendedores (RPC — ignora RLS) ─────────────────────

export async function fetchVendedoresRanking(desde?: string | null, ate?: string | null) {
  // Só incluir params quando houver valor — evita problemas com null no PostgREST
  const params: { p_desde?: string; p_ate?: string } = {};
  if (desde != null && desde !== "") params.p_desde = desde;
  if (ate != null && ate !== "") params.p_ate = ate;

  const { data, error } = await supabase.rpc("get_vendedores_ranking", params);

  if (error) throw new Error(error.message);

  // RPC retorna jsonb: pode vir como array ou string — normalizar
  let arr: Array<{
    id: number;
    nome: string;
    avatar_url: string | null;
    leads: number;
    qualificados: number;
    vendas: number;
    buscas: number;
  }>;
  if (Array.isArray(data)) {
    arr = data;
  } else if (typeof data === "string") {
    try {
      arr = JSON.parse(data);
    } catch {
      arr = [];
    }
  } else {
    arr = data ? [data] : [];
  }

  return arr.map((v) => ({
    id: Number(v.id),
    nome: String(v.nome ?? ""),
    avatar_url: v.avatar_url ?? null,
    leads: Number(v.leads ?? 0),
    qualificados: Number(v.qualificados ?? 0),
    vendas: Number(v.vendas ?? 0),
    buscas: Number(v.buscas ?? 0),
  }));
}

// ─── Dashboard ─────────────────────────────────────────────────────

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

export async function fetchBuscasRealizadas(empresaId: number): Promise<BuscaRealizada[]> {
  const { data, error } = await supabase
    .from("buscas_realizadas")
    .select("*, users:user(nome, email)")
    .eq("empresa_id", empresaId)
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);

  return ((data ?? []) as any[]).map((row) => ({
    id: row.id,
    created_at: row.created_at,
    segmento: row.segmento,
    localizacao: row.localizacao,
    tipo_pesquisa: row.tipo_pesquisa,
    user: row.user,
    user_nome: row.users?.nome ?? null,
    user_email: row.users?.email ?? null,
  }));
}
