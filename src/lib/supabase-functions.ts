import { supabase, supabaseAdmin } from "./supabase";

export interface CreateUserPayload {
  email: string;
  password: string;
  role?: "admin" | "user";
  plano?: string;
}

export async function createUserAsAdmin(payload: CreateUserPayload) {
  if (!supabaseAdmin) {
    throw new Error(
      "Service Role Key não configurada. Defina VITE_SUPABASE_SERVICE_ROLE_KEY no .env"
    );
  }

  const { email, password, role = "user", plano = "básico" } = payload;

  const { data: newAuthUser, error: createError } =
    await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });

  if (createError) throw new Error(createError.message);

  if (!newAuthUser.user) {
    throw new Error("Erro ao criar usuário no auth.");
  }

  const { error: insertError } = await supabaseAdmin.from("users").insert({
    email,
    auth_id: newAuthUser.user.id,
    role: role || "user",
    plano: plano || "básico",
    status: "ativo",
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
}

export async function salvarBuscaRealizada(payload: SalvarBuscaPayload) {
  const { error } = await supabase
    .from("buscas_realizadas")
    .insert({
      segmento: payload.segmento,
      localizacao: payload.localizacao,
      tipo_pesquisa: payload.tipo_pesquisa,
      user: payload.user,
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
}

export async function captarLeads(leads: LeadCaptadoPayload[]) {
  if (leads.length === 0) return { count: 0 };

  const userId = leads[0].user_id;
  const etapas = await fetchFunilEtapas(userId);
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
    }));
    await supabase.from("funil_logs_movimentacao").insert(logs);
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
}

export async function fetchLeadsCaptados(): Promise<LeadCaptado[]> {
  const { data, error } = await supabase
    .from("leads_captados")
    .select("*")
    .order("data_captacao", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as LeadCaptado[]) ?? [];
}

export async function deleteLeadsCaptados(ids: number[]) {
  if (ids.length === 0) return;

  const { error } = await supabase
    .from("leads_captados")
    .delete()
    .in("id", ids);

  if (error) throw new Error(error.message);
}

export interface LeadCaptadoChave {
  telefone: string | null;
  nome: string;
  website: string | null;
}

export async function fetchChavesLeadsCaptados(): Promise<LeadCaptadoChave[]> {
  const { data, error } = await supabase
    .from("leads_captados")
    .select("telefone, nome, website");

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
  created_at: string;
}

export interface LeadCaptadoComTarefas extends LeadCaptado {
  funil_tarefas: FunilTarefa[];
}

const ETAPAS_PADRAO = [
  { nome: "Novo Lead", ordem: 0, cor: "#6b7280" },
  { nome: "Contato Realizado", ordem: 1, cor: "#3b82f6" },
  { nome: "Diagnóstico", ordem: 2, cor: "#8b5cf6" },
  { nome: "Proposta Enviada", ordem: 3, cor: "#f59e0b" },
  { nome: "Negociação", ordem: 4, cor: "#ef4444" },
  { nome: "Fechado / Ganho", ordem: 5, cor: "#22c55e" },
];

export async function fetchFunilEtapas(userId: number): Promise<FunilEtapa[]> {
  let { data, error } = await supabase
    .from("funil_etapas")
    .select("*")
    .order("ordem", { ascending: true });

  if (error) throw new Error(error.message);

  if (!data || data.length === 0) {
    const rows = ETAPAS_PADRAO.map((e) => ({ ...e, user_id: userId }));
    const { data: inserted, error: insertErr } = await supabase
      .from("funil_etapas")
      .insert(rows)
      .select("*");
    if (insertErr) throw new Error(insertErr.message);
    data = inserted;
  }

  return (data as FunilEtapa[]) ?? [];
}

export async function fetchLeadsFunil(): Promise<LeadCaptadoComTarefas[]> {
  const { data, error } = await supabase
    .from("leads_captados")
    .select("*, funil_tarefas(*)")
    .not("etapa_id", "is", null)
    .order("ordem_funil", { ascending: true });

  if (error) throw new Error(error.message);
  return (data as LeadCaptadoComTarefas[]) ?? [];
}

export async function fetchLeadsSemEtapa(): Promise<
  Pick<LeadCaptado, "id" | "nome" | "telefone" | "segmento_busca">[]
> {
  const { data, error } = await supabase
    .from("leads_captados")
    .select("id, nome, telefone, segmento_busca")
    .is("etapa_id", null)
    .order("data_captacao", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

async function registrarLogMovimentacao(
  leadId: number,
  etapaId: number,
  userId: number
): Promise<void> {
  const { error } = await supabase
    .from("funil_logs_movimentacao")
    .insert({ lead_id: leadId, etapa_id: etapaId, user_id: userId });

  if (error) {
    console.warn("Erro ao registrar log de movimentação:", error.message);
  }
}

export async function adicionarLeadAoFunil(
  leadId: number,
  etapaId: number,
  ordem: number,
  userId: number
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

  await registrarLogMovimentacao(leadId, etapaId, userId);
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
  userId: number
): Promise<void> {
  const { error } = await supabase
    .from("leads_captados")
    .update({ etapa_id: novaEtapaId, ordem_funil: novaOrdem })
    .eq("id", leadId);

  if (error) throw new Error(error.message);

  await registrarLogMovimentacao(leadId, novaEtapaId, userId);
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
  payload: Omit<FunilTarefa, "id" | "created_at">
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
  updates: Partial<Omit<FunilTarefa, "id" | "created_at" | "lead_id">>
): Promise<void> {
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

// ─── Dashboard ─────────────────────────────────────────────────────

export interface BuscaRealizada {
  id: number;
  created_at: string;
  segmento: string | null;
  localizacao: string | null;
  tipo_pesquisa: string | null;
  user: number;
}

export async function fetchBuscasRealizadas(): Promise<BuscaRealizada[]> {
  const { data, error } = await supabase
    .from("buscas_realizadas")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data as BuscaRealizada[]) ?? [];
}
