import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  ArrowLeft,
  Building2,
  Phone,
  Mail,
  Globe,
  Star,
  MapPin,
  CalendarClock,
  CalendarIcon,
  CheckCircle2,
  Circle,
  Plus,
  Trash2,
  Save,
  Pencil,
  X,
  Loader2,
  MessageSquarePlus,
  History,
  Tag,
  Target,
  Zap,
  Sparkles,
  User,
  Briefcase,
  Users,
  Linkedin,
  Facebook,
  Instagram,
  ChevronDown,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { enrichLead } from "@/lib/lead-enrichment";
import {
  fetchLeadById,
  atualizarLead,
  fetchFunilEtapas,
  fetchFunilLogsByLead,
  moverLeadEtapa,
  executarAutomacoesParaEtapa,
  criarFunilTarefa,
  atualizarFunilTarefa,
  deletarFunilTarefa,
  fetchLeadAnotacoes,
  criarLeadAnotacao,
  deletarLeadAnotacao,
  type LeadCaptadoComTarefas,
  type FunilEtapa,
  type FunilTarefa,
  type FunilLogMovimentacao,
  type LeadAnotacao,
} from "@/lib/supabase-functions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const formatarData = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const formatarValor = (valor: number) => {
  if (!valor) return "";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

const tarefaVencida = (t: FunilTarefa) =>
  !t.concluida && t.data_vencimento && new Date(t.data_vencimento) < new Date();

const tarefaHoje = (t: FunilTarefa) => {
  if (!t.data_vencimento || t.concluida) return false;
  return new Date(t.data_vencimento).toDateString() === new Date().toDateString();
};

const LeadDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { dbUser } = useAuth();
  const { toast } = useToast();

  const [lead, setLead] = useState<LeadCaptadoComTarefas | null>(null);
  const [etapas, setEtapas] = useState<FunilEtapa[]>([]);
  const [logs, setLogs] = useState<FunilLogMovimentacao[]>([]);
  const [anotacoes, setAnotacoes] = useState<LeadAnotacao[]>([]);
  const [loading, setLoading] = useState(true);

  // Edição inline por campo
  const [editandoCampo, setEditandoCampo] = useState<string | null>(null);
  const [form, setForm] = useState({
    nome: "",
    telefone: "",
    endereco: "",
    email: "",
    origem_busca: "",
    segmento_busca: "",
    valor: "",
    contato: "",
    notas: "",
    status_funil: "em_andamento",
    decisor_nome: "",
    decisor_telefone: "",
    decisor_email: "",
    decisor_cargo: "",
    tamanho_empresa: "",
    website: "",
    linkedin_url: "",
    facebook_url: "",
    instagram_url: "",
  });
  const [salvando, setSalvando] = useState(false);
  const [enriquecendo, setEnriquecendo] = useState(false);

  // Mover etapa
  const [etapaDestino, setEtapaDestino] = useState<FunilEtapa | null>(null);

  // Tarefas
  const [novaTarefaTexto, setNovaTarefaTexto] = useState("");
  const [novaTarefaData, setNovaTarefaData] = useState("");

  // Anotações
  const [novaAnotacao, setNovaAnotacao] = useState("");

  const carregarDados = useCallback(async (silent = false) => {
    if (!id) return;
    if (!silent) setLoading(true);
    try {
      const [leadData, etapasData, logsData, anotacoesData] = await Promise.all([
        fetchLeadById(Number(id)),
        fetchFunilEtapas(),
        fetchFunilLogsByLead(Number(id)),
        fetchLeadAnotacoes(Number(id)),
      ]);
      setLead(leadData);
      setEtapas(etapasData);
      setLogs(logsData);
      setAnotacoes(anotacoesData);
      setForm({
        nome: leadData.nome,
        telefone: leadData.telefone ?? "",
        endereco: leadData.endereco ?? "",
        email: leadData.email ?? "",
        origem_busca: leadData.origem_busca ?? "",
        segmento_busca: leadData.segmento_busca ?? "",
        valor: leadData.valor ? String(leadData.valor) : "",
        contato: leadData.contato ?? "",
        notas: leadData.notas ?? "",
        status_funil: leadData.status_funil ?? "em_andamento",
        decisor_nome: leadData.decisor_nome ?? "",
        decisor_telefone: leadData.decisor_telefone ?? "",
        decisor_email: leadData.decisor_email ?? "",
        decisor_cargo: leadData.decisor_cargo ?? "",
        tamanho_empresa: leadData.tamanho_empresa ?? "",
        website: leadData.website ?? "",
        linkedin_url: leadData.linkedin_url ?? "",
        facebook_url: leadData.facebook_url ?? "",
        instagram_url: leadData.instagram_url ?? "",
      });
    } catch (err) {
      toast({
        title: "Erro ao carregar lead",
        description: err instanceof Error ? err.message : "Lead não encontrado.",
        variant: "destructive",
      });
      navigate("/leads");
    } finally {
      setLoading(false);
    }
  }, [id, toast, navigate]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  const salvarCampo = async (campo: string, valorDireto?: string) => {
    if (!lead) return;
    setSalvando(true);
    try {
      const updates: Record<string, unknown> = {};
      switch (campo) {
        case "nome": updates.nome = form.nome.trim(); break;
        case "telefone": updates.telefone = form.telefone.trim() || null; break;
        case "endereco": updates.endereco = form.endereco.trim() || null; break;
        case "email": updates.email = form.email.trim() || null; break;
        case "origem_busca": updates.origem_busca = form.origem_busca.trim() || null; break;
        case "segmento_busca": updates.segmento_busca = form.segmento_busca.trim() || null; break;
        case "valor": updates.valor = parseFloat(form.valor) || 0; break;
        case "contato": updates.contato = form.contato.trim() || null; break;
        case "notas": updates.notas = form.notas.trim() || null; break;
        case "status_funil": updates.status_funil = valorDireto ?? form.status_funil; break;
        case "decisor_nome": updates.decisor_nome = form.decisor_nome.trim() || null; break;
        case "decisor_telefone": updates.decisor_telefone = form.decisor_telefone.trim() || null; break;
        case "decisor_email": updates.decisor_email = form.decisor_email.trim() || null; break;
        case "decisor_cargo": updates.decisor_cargo = form.decisor_cargo.trim() || null; break;
        case "tamanho_empresa": updates.tamanho_empresa = form.tamanho_empresa.trim() || null; break;
        case "website": updates.website = form.website.trim() || null; break;
        case "linkedin_url": updates.linkedin_url = form.linkedin_url.trim() || null; break;
        case "facebook_url": updates.facebook_url = form.facebook_url.trim() || null; break;
        case "instagram_url": updates.instagram_url = form.instagram_url.trim() || null; break;
      }
      await atualizarLead(lead.id, updates as any);
      toast({ title: "Salvo" });
      setEditandoCampo(null);
      carregarDados();
    } catch (err) {
      toast({
        title: "Erro ao salvar",
        description: err instanceof Error ? err.message : "Erro desconhecido.",
        variant: "destructive",
      });
    } finally {
      setSalvando(false);
    }
  };

  // ── Enriquecimento de lead ────────────────────────────────

  const enriquecerLead = async () => {
    if (!lead) return;
    setEnriquecendo(true);
    try {
      const result = await enrichLead(lead.nome, lead.website);

      // Preenche apenas campos em branco
      const v = (x: string | null | undefined) => !x?.trim();
      const updates: Record<string, unknown> = {
        decisor_enriquecido_em: new Date().toISOString(),
      };
      if (v(lead.telefone) && result.telefone) updates.telefone = result.telefone;
      if (v(lead.email) && result.email) updates.email = result.email;
      if (v(lead.website) && result.website) updates.website = result.website;
      if (v(lead.decisor_nome) && result.decisor_nome) updates.decisor_nome = result.decisor_nome;
      if (v(lead.decisor_telefone) && result.decisor_telefone) updates.decisor_telefone = result.decisor_telefone;
      if (v(lead.decisor_email) && result.decisor_email) updates.decisor_email = result.decisor_email;
      if (v(lead.decisor_cargo) && result.decisor_cargo) updates.decisor_cargo = result.decisor_cargo;
      if (v(lead.tamanho_empresa) && result.tamanho_empresa) updates.tamanho_empresa = result.tamanho_empresa;
      if (v(lead.linkedin_url) && result.linkedin_url) updates.linkedin_url = result.linkedin_url;
      if (v(lead.facebook_url) && result.facebook_url) updates.facebook_url = result.facebook_url;
      if (v(lead.instagram_url) && result.instagram_url) updates.instagram_url = result.instagram_url;

      await atualizarLead(lead.id, updates as any);
      const decisorEnriquecidoEm = new Date().toISOString();
      setForm((f) => ({
        ...f,
        telefone: (updates.telefone as string) ?? f.telefone,
        email: (updates.email as string) ?? f.email,
        website: (updates.website as string) ?? f.website,
        decisor_nome: (updates.decisor_nome as string) ?? f.decisor_nome,
        decisor_telefone: (updates.decisor_telefone as string) ?? f.decisor_telefone,
        decisor_email: (updates.decisor_email as string) ?? f.decisor_email,
        decisor_cargo: (updates.decisor_cargo as string) ?? f.decisor_cargo,
        tamanho_empresa: (updates.tamanho_empresa as string) ?? f.tamanho_empresa,
        linkedin_url: (updates.linkedin_url as string) ?? f.linkedin_url,
        facebook_url: (updates.facebook_url as string) ?? f.facebook_url,
        instagram_url: (updates.instagram_url as string) ?? f.instagram_url,
      }));
      setLead((prev) => ({ ...prev, ...updates, decisor_enriquecido_em: decisorEnriquecidoEm } as LeadCaptadoComTarefas));
      const found = Object.keys(updates).length > 1;
      const qtdPreenchidos = Object.keys(updates).filter((k) => k !== "decisor_enriquecido_em").length;
      toast({
        title: found ? "Lead enriquecido" : "Nenhum dado novo encontrado",
        description: found
          ? `${qtdPreenchidos} campo(s) em branco foram preenchidos com as informações encontradas.`
          : "Nenhum campo vazio pôde ser preenchido. Tente editar manualmente.",
        variant: found ? "default" : "default",
      });
      await carregarDados(true);
    } catch (err) {
      toast({
        title: "Erro ao enriquecer",
        description: err instanceof Error ? err.message : "Verifique a configuração da Serper API.",
        variant: "destructive",
      });
    } finally {
      setEnriquecendo(false);
    }
  };

  const cancelarEdicaoCampo = () => {
    if (!lead) return;
    setForm({
      nome: lead.nome,
      telefone: lead.telefone ?? "",
      endereco: lead.endereco ?? "",
      email: lead.email ?? "",
      origem_busca: lead.origem_busca ?? "",
      segmento_busca: lead.segmento_busca ?? "",
      valor: lead.valor ? String(lead.valor) : "",
      contato: lead.contato ?? "",
      notas: lead.notas ?? "",
      status_funil: lead.status_funil ?? "em_andamento",
      decisor_nome: lead.decisor_nome ?? "",
      decisor_telefone: lead.decisor_telefone ?? "",
      decisor_email: lead.decisor_email ?? "",
      decisor_cargo: lead.decisor_cargo ?? "",
      tamanho_empresa: lead.tamanho_empresa ?? "",
      website: lead.website ?? "",
      linkedin_url: lead.linkedin_url ?? "",
      facebook_url: lead.facebook_url ?? "",
      instagram_url: lead.instagram_url ?? "",
    });
    setEditandoCampo(null);
  };

  // ── Mover etapa ─────────────────────────────

  const confirmarMoverEtapa = async () => {
    if (!lead || !etapaDestino || !dbUser) return;
    try {
      await moverLeadEtapa(lead.id, etapaDestino.id, 0, dbUser.id, dbUser.empresa_id);
      await executarAutomacoesParaEtapa(lead.id, etapaDestino.id, dbUser.empresa_id);
      toast({ title: `Lead movido para "${etapaDestino.nome}"` });
      setEtapaDestino(null);
      carregarDados();
    } catch (err) {
      toast({
        title: "Erro ao mover lead",
        description: err instanceof Error ? err.message : "Erro desconhecido.",
        variant: "destructive",
      });
    }
  };

  // ── Tarefas ──────────────────────────────────

  const adicionarTarefa = async () => {
    if (!lead || !novaTarefaTexto.trim() || !dbUser) return;
    try {
      const tarefa = await criarFunilTarefa({
        lead_id: lead.id,
        descricao: novaTarefaTexto.trim(),
        data_vencimento: novaTarefaData || null,
        concluida: false,
        empresa_id: dbUser.empresa_id,
      });
      setLead({ ...lead, funil_tarefas: [...lead.funil_tarefas, tarefa] });
      setNovaTarefaTexto("");
      setNovaTarefaData("");
      toast({ title: "Tarefa criada" });
    } catch (err) {
      toast({
        title: "Erro ao criar tarefa",
        description: err instanceof Error ? err.message : "Erro desconhecido.",
        variant: "destructive",
      });
    }
  };

  const toggleTarefa = async (tarefa: FunilTarefa) => {
    if (!lead) return;
    const novoConcluida = !tarefa.concluida;
    try {
      await atualizarFunilTarefa(tarefa.id, { concluida: novoConcluida });
      setLead({
        ...lead,
        funil_tarefas: lead.funil_tarefas.map((t) =>
          t.id === tarefa.id
            ? { ...t, concluida: novoConcluida, concluida_em: novoConcluida ? new Date().toISOString() : null }
            : t
        ),
      });
    } catch {
      toast({ title: "Erro ao atualizar tarefa", variant: "destructive" });
    }
  };

  const removerTarefa = async (tarefaId: number) => {
    if (!lead) return;
    try {
      await deletarFunilTarefa(tarefaId);
      setLead({
        ...lead,
        funil_tarefas: lead.funil_tarefas.filter((t) => t.id !== tarefaId),
      });
    } catch {
      toast({ title: "Erro ao excluir tarefa", variant: "destructive" });
    }
  };

  // ── Anotações ─────────────────────────────────

  const adicionarAnotacao = async () => {
    if (!lead || !novaAnotacao.trim() || !dbUser) return;
    try {
      const anotacao = await criarLeadAnotacao({
        lead_id: lead.id,
        texto: novaAnotacao.trim(),
        user_id: dbUser.id,
        empresa_id: dbUser.empresa_id,
      });
      setAnotacoes([{ ...anotacao, user_nome: dbUser.nome }, ...anotacoes]);
      setNovaAnotacao("");
      toast({ title: "Anotação salva" });
    } catch (err) {
      toast({
        title: "Erro ao salvar anotação",
        description: err instanceof Error ? err.message : "Erro desconhecido.",
        variant: "destructive",
      });
    }
  };

  const removerAnotacao = async (anotacaoId: number) => {
    try {
      await deletarLeadAnotacao(anotacaoId);
      setAnotacoes(anotacoes.filter((a) => a.id !== anotacaoId));
    } catch {
      toast({ title: "Erro ao excluir anotação", variant: "destructive" });
    }
  };

  if (loading) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
          <Loader2 className="h-8 w-8 text-primary animate-spin" />
          <p className="text-muted-foreground">Carregando lead...</p>
        </div>
      </AppLayout>
    );
  }

  if (!lead) return null;

  const etapaAtual = etapas.find((e) => e.id === lead.etapa_id);
  const tarefasPendentes = lead.funil_tarefas.filter((t) => !t.concluida);

  return (
    <AppLayout>
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Título + status */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <button onClick={() => navigate(-1)} className="p-1 rounded-md hover:bg-muted transition-colors flex-shrink-0">
                <ArrowLeft className="h-5 w-5 text-muted-foreground" />
              </button>
              <h1 className="text-2xl font-bold text-foreground truncate">
                {lead.nome}
              </h1>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={enriquecerLead}
              disabled={enriquecendo || !!lead.decisor_enriquecido_em}
              title={lead.decisor_enriquecido_em ? "Lead já foi enriquecido" : undefined}
              className="flex-shrink-0 gap-2"
            >
              {enriquecendo ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Enriquecer lead
            </Button>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Badge
              variant="outline"
              className={cn(
                "text-xs",
                lead.status_funil === "em_andamento" && "bg-blue-500/10 text-blue-600 border-blue-500/20",
                lead.status_funil === "ganho" && "bg-green-500/10 text-green-600 border-green-500/20",
                lead.status_funil === "perdido" && "bg-red-500/10 text-red-600 border-red-500/20",
              )}
            >
              {lead.status_funil === "em_andamento" ? "EM ANDAMENTO" : lead.status_funil === "ganho" ? "GANHO" : lead.status_funil === "perdido" ? "PERDIDO" : lead.status_funil.toUpperCase()}
            </Badge>
            {etapaAtual && (
              <Badge variant="outline" className="text-xs bg-muted/50">
                {etapaAtual.nome}
              </Badge>
            )}
            {lead.has_whatsapp === true && (
              <Badge variant="outline" className="text-xs bg-green-500/10 text-green-700 border-green-500/30">
                <Zap className="h-3 w-3 mr-1" />
                WhatsApp
              </Badge>
            )}
          </div>
        </div>

        {/* Pipeline de etapas - barra horizontal */}
        {etapas.length > 0 && lead.etapa_id && (() => {
          const idxAtual = etapas.findIndex(e => e.id === lead.etapa_id);
          const diasPorEtapa: Record<number, number> = {};
          for (let i = 0; i < logs.length; i++) {
            const entrada = new Date(logs[i].data_entrada);
            const saida = i + 1 < logs.length ? new Date(logs[i + 1].data_entrada) : new Date();
            diasPorEtapa[logs[i].etapa_id] = Math.max(0, Math.floor((saida.getTime() - entrada.getTime()) / 86_400_000));
          }

          return (
            <div className="flex gap-0 overflow-x-auto pb-1">
              {etapas.map((etapa, idx) => {
                const isAtual = etapa.id === lead.etapa_id;
                const jaPassou = idx < idxAtual;
                const dias = diasPorEtapa[etapa.id];
                const temDias = dias !== undefined;

                return (
                  <button
                    key={etapa.id}
                    onClick={() => !isAtual && setEtapaDestino(etapa)}
                    className={cn(
                      "flex-1 min-w-[100px] text-center py-2 px-3 text-xs font-medium border-b-2 transition-colors truncate",
                      isAtual
                        ? "border-primary bg-primary/5 text-primary"
                        : jaPassou
                          ? "border-green-500 text-green-700 bg-green-500/5 hover:bg-green-500/10 cursor-pointer"
                          : "border-border text-muted-foreground hover:bg-muted/50 cursor-pointer"
                    )}
                  >
                    {etapa.nome}
                    {temDias && (
                      <span className={cn(
                        "block text-[10px] font-normal mt-0.5",
                        isAtual ? "opacity-70" : "text-green-600/70"
                      )}>
                        {dias} dias
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          );
        })()}

        {/* Layout: Sidebar esquerda + Conteúdo principal */}
        <div className="grid grid-cols-1 lg:grid-cols-[340px_1fr] gap-6">
          {/* Sidebar - Informações do lead */}
          <div className="space-y-4">
            {/* Card de informações */}
            <div className="card-gradient rounded-xl border border-border p-5 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Informações</h3>
                {lead.rating != null && lead.rating > 0 && (
                  <span className="inline-flex items-center gap-1 text-sm font-semibold text-warning">
                    <Star className="h-4 w-4 fill-warning" />
                    {lead.rating}
                    <span className="text-xs font-normal text-muted-foreground">({lead.avaliacoes})</span>
                  </span>
                )}
              </div>

              <div className="space-y-3.5">
                {/* Nome */}
                <EditableField
                  icon={Building2}
                  label="Nome"
                  campo="nome"
                  editandoCampo={editandoCampo}
                  onEdit={setEditandoCampo}
                  onSave={salvarCampo}
                  onCancel={cancelarEdicaoCampo}
                  salvando={salvando}
                  input={
                    <Input
                      value={form.nome}
                      onChange={(e) => setForm(f => ({ ...f, nome: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Enter") salvarCampo("nome"); if (e.key === "Escape") cancelarEdicaoCampo(); }}
                      className="h-8 text-sm"
                      autoFocus
                    />
                  }
                >
                  <span className="text-sm text-foreground font-medium">{lead.nome}</span>
                </EditableField>

                {/* Telefone */}
                <EditableField
                  icon={Phone}
                  label="Telefone"
                  campo="telefone"
                  editandoCampo={editandoCampo}
                  onEdit={setEditandoCampo}
                  onSave={salvarCampo}
                  onCancel={cancelarEdicaoCampo}
                  salvando={salvando}
                  input={
                    <Input
                      value={form.telefone}
                      onChange={(e) => setForm(f => ({ ...f, telefone: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Enter") salvarCampo("telefone"); if (e.key === "Escape") cancelarEdicaoCampo(); }}
                      className="h-8 text-sm"
                      placeholder="(99) 99999-9999"
                      autoFocus
                    />
                  }
                >
                  <span className="text-sm text-foreground font-mono">
                    {lead.telefone || <span className="text-muted-foreground italic">—</span>}
                  </span>
                </EditableField>

                {/* Email */}
                <EditableField
                  icon={Mail}
                  label="E-mail"
                  campo="email"
                  editandoCampo={editandoCampo}
                  onEdit={setEditandoCampo}
                  onSave={salvarCampo}
                  onCancel={cancelarEdicaoCampo}
                  salvando={salvando}
                  input={
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(e) => setForm(f => ({ ...f, email: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Enter") salvarCampo("email"); if (e.key === "Escape") cancelarEdicaoCampo(); }}
                      className="h-8 text-sm"
                      placeholder="email@exemplo.com"
                      autoFocus
                    />
                  }
                >
                  <span className="text-sm text-foreground">
                    {lead.email ? (
                      <a href={`mailto:${lead.email}`} className="text-primary hover:underline">{lead.email}</a>
                    ) : (
                      <span className="text-muted-foreground italic">—</span>
                    )}
                  </span>
                </EditableField>

                {/* Endereço */}
                <EditableField
                  icon={MapPin}
                  label="Endereço"
                  campo="endereco"
                  editandoCampo={editandoCampo}
                  onEdit={setEditandoCampo}
                  onSave={salvarCampo}
                  onCancel={cancelarEdicaoCampo}
                  salvando={salvando}
                  input={
                    <Input
                      value={form.endereco}
                      onChange={(e) => setForm(f => ({ ...f, endereco: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Enter") salvarCampo("endereco"); if (e.key === "Escape") cancelarEdicaoCampo(); }}
                      className="h-8 text-sm"
                      placeholder="Endereço completo"
                      autoFocus
                    />
                  }
                >
                  <span className="text-sm text-foreground">
                    {lead.endereco || <span className="text-muted-foreground italic">—</span>}
                  </span>
                </EditableField>

                {/* Origem */}
                <EditableField
                  icon={Target}
                  label="Origem"
                  campo="origem_busca"
                  editandoCampo={editandoCampo}
                  onEdit={setEditandoCampo}
                  onSave={salvarCampo}
                  onCancel={cancelarEdicaoCampo}
                  salvando={salvando}
                  input={
                    <Input
                      value={form.origem_busca}
                      onChange={(e) => setForm(f => ({ ...f, origem_busca: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Enter") salvarCampo("origem_busca"); if (e.key === "Escape") cancelarEdicaoCampo(); }}
                      className="h-8 text-sm"
                      placeholder="Ex: Google Maps, Instagram..."
                      autoFocus
                    />
                  }
                >
                  <span className="text-sm text-foreground">
                    {lead.origem_busca || <span className="text-muted-foreground italic">—</span>}
                  </span>
                </EditableField>

                {/* Segmento */}
                <EditableField
                  icon={Tag}
                  label="Segmento"
                  campo="segmento_busca"
                  editandoCampo={editandoCampo}
                  onEdit={setEditandoCampo}
                  onSave={salvarCampo}
                  onCancel={cancelarEdicaoCampo}
                  salvando={salvando}
                  input={
                    <Input
                      value={form.segmento_busca}
                      onChange={(e) => setForm(f => ({ ...f, segmento_busca: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Enter") salvarCampo("segmento_busca"); if (e.key === "Escape") cancelarEdicaoCampo(); }}
                      className="h-8 text-sm"
                      placeholder="Ex: Restaurante, Clínica..."
                      autoFocus
                    />
                  }
                >
                  <span className="text-sm text-foreground">
                    {lead.segmento_busca || <span className="text-muted-foreground italic">—</span>}
                  </span>
                </EditableField>

                {/* Website */}
                <EditableField
                  icon={Globe}
                  label="Site"
                  campo="website"
                  editandoCampo={editandoCampo}
                  onEdit={setEditandoCampo}
                  onSave={salvarCampo}
                  onCancel={cancelarEdicaoCampo}
                  salvando={salvando}
                  input={
                    <Input
                      value={form.website}
                      onChange={(e) => setForm(f => ({ ...f, website: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Enter") salvarCampo("website"); if (e.key === "Escape") cancelarEdicaoCampo(); }}
                      className="h-8 text-sm"
                      placeholder="https://exemplo.com"
                      autoFocus
                    />
                  }
                >
                  <span className="text-sm text-foreground">
                    {lead.website ? (
                      <a href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate block">
                        {lead.website}
                      </a>
                    ) : (
                      <span className="text-muted-foreground italic">—</span>
                    )}
                  </span>
                </EditableField>

                {/* Tamanho da empresa */}
                <EditableField
                  icon={Users}
                  label="Tamanho da Empresa"
                  campo="tamanho_empresa"
                  editandoCampo={editandoCampo}
                  onEdit={setEditandoCampo}
                  onSave={salvarCampo}
                  onCancel={cancelarEdicaoCampo}
                  salvando={salvando}
                  input={
                    <Input
                      value={form.tamanho_empresa}
                      onChange={(e) => setForm(f => ({ ...f, tamanho_empresa: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Enter") salvarCampo("tamanho_empresa"); if (e.key === "Escape") cancelarEdicaoCampo(); }}
                      className="h-8 text-sm"
                      placeholder="Ex: 1-10 funcionários, pequena..."
                      autoFocus
                    />
                  }
                >
                  <span className="text-sm text-foreground">
                    {lead.tamanho_empresa || <span className="text-muted-foreground italic">—</span>}
                  </span>
                </EditableField>

                {/* Valor */}
                <EditableField
                  icon={Star}
                  label="Valor"
                  campo="valor"
                  editandoCampo={editandoCampo}
                  onEdit={setEditandoCampo}
                  onSave={salvarCampo}
                  onCancel={cancelarEdicaoCampo}
                  salvando={salvando}
                  input={
                    <Input
                      type="number"
                      value={form.valor}
                      onChange={(e) => setForm(f => ({ ...f, valor: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Enter") salvarCampo("valor"); if (e.key === "Escape") cancelarEdicaoCampo(); }}
                      className="h-8 text-sm"
                      placeholder="0,00"
                      autoFocus
                    />
                  }
                >
                  <span className="text-sm text-foreground font-semibold">
                    {lead.valor > 0 ? formatarValor(lead.valor) : <span className="text-muted-foreground italic font-normal">—</span>}
                  </span>
                </EditableField>

                {/* Contato */}
                <EditableField
                  icon={Building2}
                  label="Contato"
                  campo="contato"
                  editandoCampo={editandoCampo}
                  onEdit={setEditandoCampo}
                  onSave={salvarCampo}
                  onCancel={cancelarEdicaoCampo}
                  salvando={salvando}
                  input={
                    <Input
                      value={form.contato}
                      onChange={(e) => setForm(f => ({ ...f, contato: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Enter") salvarCampo("contato"); if (e.key === "Escape") cancelarEdicaoCampo(); }}
                      className="h-8 text-sm"
                      placeholder="Nome do contato"
                      autoFocus
                    />
                  }
                >
                  <span className="text-sm text-foreground">
                    {lead.contato || <span className="text-muted-foreground italic">—</span>}
                  </span>
                </EditableField>

                {/* Decisor (sanfona) */}
                <Collapsible defaultOpen={!!(lead.decisor_nome || lead.decisor_telefone || lead.decisor_email || lead.decisor_cargo)}>
                  <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 py-1.5 rounded hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-1.5">
                      <User className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">Decisor</span>
                    </div>
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                  <div className="pl-5 space-y-2 pt-1 pb-1">
                    <EditableField
                      icon={User}
                      label="Nome"
                      campo="decisor_nome"
                      editandoCampo={editandoCampo}
                      onEdit={setEditandoCampo}
                      onSave={salvarCampo}
                      onCancel={cancelarEdicaoCampo}
                      salvando={salvando}
                      input={
                        <Input
                          value={form.decisor_nome}
                          onChange={(e) => setForm(f => ({ ...f, decisor_nome: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === "Enter") salvarCampo("decisor_nome"); if (e.key === "Escape") cancelarEdicaoCampo(); }}
                          className="h-8 text-sm"
                          placeholder="Nome do decisor"
                          autoFocus
                        />
                      }
                    >
                      <span className="text-sm text-foreground">
                        {lead.decisor_nome || <span className="text-muted-foreground italic">—</span>}
                      </span>
                    </EditableField>
                    <EditableField
                      icon={Phone}
                      label="Telefone"
                      campo="decisor_telefone"
                      editandoCampo={editandoCampo}
                      onEdit={setEditandoCampo}
                      onSave={salvarCampo}
                      onCancel={cancelarEdicaoCampo}
                      salvando={salvando}
                      input={
                        <Input
                          value={form.decisor_telefone}
                          onChange={(e) => setForm(f => ({ ...f, decisor_telefone: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === "Enter") salvarCampo("decisor_telefone"); if (e.key === "Escape") cancelarEdicaoCampo(); }}
                          className="h-8 text-sm"
                          placeholder="(99) 99999-9999"
                          autoFocus
                        />
                      }
                    >
                      <span className="text-sm text-foreground font-mono">
                        {lead.decisor_telefone || <span className="text-muted-foreground italic">—</span>}
                      </span>
                    </EditableField>
                    <EditableField
                      icon={Mail}
                      label="E-mail"
                      campo="decisor_email"
                      editandoCampo={editandoCampo}
                      onEdit={setEditandoCampo}
                      onSave={salvarCampo}
                      onCancel={cancelarEdicaoCampo}
                      salvando={salvando}
                      input={
                        <Input
                          type="email"
                          value={form.decisor_email}
                          onChange={(e) => setForm(f => ({ ...f, decisor_email: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === "Enter") salvarCampo("decisor_email"); if (e.key === "Escape") cancelarEdicaoCampo(); }}
                          className="h-8 text-sm"
                          placeholder="email@exemplo.com"
                          autoFocus
                        />
                      }
                    >
                      <span className="text-sm text-foreground">
                        {lead.decisor_email ? (
                          <a href={`mailto:${lead.decisor_email}`} className="text-primary hover:underline">{lead.decisor_email}</a>
                        ) : (
                          <span className="text-muted-foreground italic">—</span>
                        )}
                      </span>
                    </EditableField>
                    <EditableField
                      icon={Briefcase}
                      label="Cargo"
                      campo="decisor_cargo"
                      editandoCampo={editandoCampo}
                      onEdit={setEditandoCampo}
                      onSave={salvarCampo}
                      onCancel={cancelarEdicaoCampo}
                      salvando={salvando}
                      input={
                        <Input
                          value={form.decisor_cargo}
                          onChange={(e) => setForm(f => ({ ...f, decisor_cargo: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === "Enter") salvarCampo("decisor_cargo"); if (e.key === "Escape") cancelarEdicaoCampo(); }}
                          className="h-8 text-sm"
                          placeholder="CEO, Diretor, Gerente..."
                          autoFocus
                        />
                      }
                    >
                      <span className="text-sm text-foreground">
                        {lead.decisor_cargo || <span className="text-muted-foreground italic">—</span>}
                      </span>
                    </EditableField>
                  </div>
                  {lead.decisor_enriquecido_em && (
                    <p className="pl-5 text-[11px] text-muted-foreground">
                      Enriquecido em {formatarData(lead.decisor_enriquecido_em)}
                    </p>
                  )}
                  </CollapsibleContent>
                </Collapsible>

                {/* Redes sociais (sanfona) */}
                <Collapsible defaultOpen={!!(lead.linkedin_url || lead.facebook_url || lead.instagram_url)}>
                  <CollapsibleTrigger className="group flex w-full items-center justify-between gap-2 py-1.5 rounded hover:bg-muted/50 transition-colors">
                    <div className="flex items-center gap-1.5">
                      <Globe className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs font-medium text-muted-foreground">Redes sociais</span>
                    </div>
                    <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-data-[state=open]:rotate-180" />
                  </CollapsibleTrigger>
                  <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-accordion-up data-[state=open]:animate-accordion-down">
                  <div className="pl-5 space-y-2 pt-1 pb-1">
                    <EditableField
                      icon={Linkedin}
                      label="LinkedIn"
                      campo="linkedin_url"
                      editandoCampo={editandoCampo}
                      onEdit={setEditandoCampo}
                      onSave={salvarCampo}
                      onCancel={cancelarEdicaoCampo}
                      salvando={salvando}
                      input={
                        <Input
                          value={form.linkedin_url}
                          onChange={(e) => setForm(f => ({ ...f, linkedin_url: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === "Enter") salvarCampo("linkedin_url"); if (e.key === "Escape") cancelarEdicaoCampo(); }}
                          className="h-8 text-sm"
                          placeholder="https://linkedin.com/company/..."
                          autoFocus
                        />
                      }
                    >
                      <span className="text-sm text-foreground">
                        {lead.linkedin_url ? (
                          <a href={lead.linkedin_url.startsWith("http") ? lead.linkedin_url : `https://${lead.linkedin_url}`} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate block">
                            LinkedIn
                          </a>
                        ) : (
                          <span className="text-muted-foreground italic">—</span>
                        )}
                      </span>
                    </EditableField>
                    <EditableField
                      icon={Facebook}
                      label="Facebook"
                      campo="facebook_url"
                      editandoCampo={editandoCampo}
                      onEdit={setEditandoCampo}
                      onSave={salvarCampo}
                      onCancel={cancelarEdicaoCampo}
                      salvando={salvando}
                      input={
                        <Input
                          value={form.facebook_url}
                          onChange={(e) => setForm(f => ({ ...f, facebook_url: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === "Enter") salvarCampo("facebook_url"); if (e.key === "Escape") cancelarEdicaoCampo(); }}
                          className="h-8 text-sm"
                          placeholder="https://facebook.com/..."
                          autoFocus
                        />
                      }
                    >
                      <span className="text-sm text-foreground">
                        {lead.facebook_url ? (
                          <a href={lead.facebook_url.startsWith("http") ? lead.facebook_url : `https://${lead.facebook_url}`} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate block">
                            Facebook
                          </a>
                        ) : (
                          <span className="text-muted-foreground italic">—</span>
                        )}
                      </span>
                    </EditableField>
                    <EditableField
                      icon={Instagram}
                      label="Instagram"
                      campo="instagram_url"
                      editandoCampo={editandoCampo}
                      onEdit={setEditandoCampo}
                      onSave={salvarCampo}
                      onCancel={cancelarEdicaoCampo}
                      salvando={salvando}
                      input={
                        <Input
                          value={form.instagram_url}
                          onChange={(e) => setForm(f => ({ ...f, instagram_url: e.target.value }))}
                          onKeyDown={(e) => { if (e.key === "Enter") salvarCampo("instagram_url"); if (e.key === "Escape") cancelarEdicaoCampo(); }}
                          className="h-8 text-sm"
                          placeholder="https://instagram.com/..."
                          autoFocus
                        />
                      }
                    >
                      <span className="text-sm text-foreground">
                        {lead.instagram_url ? (
                          <a href={lead.instagram_url.startsWith("http") ? lead.instagram_url : `https://${lead.instagram_url}`} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate block">
                            Instagram
                          </a>
                        ) : (
                          <span className="text-muted-foreground italic">—</span>
                        )}
                      </span>
                    </EditableField>
                  </div>
                  </CollapsibleContent>
                </Collapsible>

              </div>

              <div className="text-xs text-muted-foreground space-y-1 pt-3">
                <p>Captado em {formatarData(lead.data_captacao)}</p>
                {lead.localizacao_busca && <p>Localização: {lead.localizacao_busca}</p>}
              </div>
            </div>

            {/* Card de notas rápidas */}
            <div className="card-gradient rounded-xl border border-border p-5 space-y-3 group/notas">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-foreground">Notas</h3>
                {editandoCampo !== "notas" && (
                  <button
                    onClick={() => setEditandoCampo("notas")}
                    className="opacity-0 group-hover/notas:opacity-100 transition-opacity p-1 rounded hover:bg-muted"
                  >
                    <Pencil className="h-3.5 w-3.5 text-muted-foreground" />
                  </button>
                )}
              </div>
              {editandoCampo === "notas" ? (
                <div className="space-y-2">
                  <Textarea
                    value={form.notas}
                    onChange={(e) => setForm(f => ({ ...f, notas: e.target.value }))}
                    placeholder="Observações sobre este lead..."
                    rows={4}
                    className="text-sm"
                    autoFocus
                  />
                  <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={cancelarEdicaoCampo} className="h-7 text-xs">
                      Cancelar
                    </Button>
                    <Button size="sm" onClick={() => salvarCampo("notas")} disabled={salvando} className="h-7 text-xs">
                      {salvando ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                      Salvar
                    </Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground whitespace-pre-wrap">
                  {lead.notas || <span className="italic">Nenhuma nota adicionada.</span>}
                </p>
              )}
            </div>
          </div>

          {/* Conteúdo principal - Tabs */}
          <div className="space-y-4">
            {/* Próximas tarefas - seção destacada */}
            <div className="card-gradient rounded-xl border border-border p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <CalendarClock className="h-4 w-4 text-primary" />
                  Próximas tarefas
                </h3>
                <span className="text-xs text-muted-foreground">
                  {tarefasPendentes.length} pendente{tarefasPendentes.length !== 1 ? "s" : ""}
                </span>
              </div>

              {tarefasPendentes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6 italic">
                  Não existem tarefas pendentes para este Lead
                </p>
              ) : (
                <div className="space-y-2 mb-4">
                  {tarefasPendentes
                    .sort((a, b) =>
                      new Date(a.data_vencimento ?? "9999").getTime() -
                      new Date(b.data_vencimento ?? "9999").getTime()
                    )
                    .slice(0, 5)
                    .map((tarefa) => (
                      <TarefaItem
                        key={tarefa.id}
                        tarefa={tarefa}
                        onToggle={toggleTarefa}
                        onRemove={removerTarefa}
                      />
                    ))}
                  {tarefasPendentes.length > 5 && (
                    <p className="text-xs text-muted-foreground text-center">
                      + {tarefasPendentes.length - 5} tarefa(s) pendente(s)
                    </p>
                  )}
                </div>
              )}

              {/* Criar tarefa inline */}
              <div className="flex gap-2 pt-2 border-t border-border/50">
                <Input
                  placeholder="Nova tarefa..."
                  value={novaTarefaTexto}
                  onChange={(e) => setNovaTarefaTexto(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && adicionarTarefa()}
                  className="text-sm"
                />
                <Popover>
                  <PopoverTrigger asChild>
                    <Button
                      variant="outline"
                      size="sm"
                      className={cn(
                        "w-[120px] justify-start text-xs font-normal flex-shrink-0",
                        !novaTarefaData && "text-muted-foreground"
                      )}
                    >
                      <CalendarIcon className="h-3.5 w-3.5 mr-1.5 flex-shrink-0" />
                      {novaTarefaData
                        ? format(new Date(novaTarefaData + "T12:00:00"), "dd/MM/yyyy", { locale: ptBR })
                        : "Prazo"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar
                      mode="single"
                      selected={novaTarefaData ? new Date(novaTarefaData + "T12:00:00") : undefined}
                      onSelect={(d) => setNovaTarefaData(d ? format(d, "yyyy-MM-dd") : "")}
                      locale={ptBR}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
                <Button
                  size="sm"
                  onClick={adicionarTarefa}
                  disabled={!novaTarefaTexto.trim()}
                >
                  <Plus className="h-4 w-4 mr-1" />
                  Criar tarefa
                </Button>
              </div>
            </div>

            {/* Tabs: Anotações, Tarefas */}
            <Tabs defaultValue="anotacoes" className="w-full">
              <TabsList className="bg-muted/50 w-full justify-start">
                <TabsTrigger value="anotacoes" className="text-sm gap-1.5">
                  <MessageSquarePlus className="h-3.5 w-3.5" />
                  Anotações
                </TabsTrigger>
                <TabsTrigger value="historico" className="text-sm gap-1.5">
                  <History className="h-3.5 w-3.5" />
                  Histórico
                </TabsTrigger>
              </TabsList>

              {/* Tab: Anotações */}
              <TabsContent value="anotacoes" className="mt-4 space-y-4">
                <div className="card-gradient rounded-xl border border-border p-5 space-y-3">
                  <Textarea
                    placeholder="Escreva uma anotação..."
                    value={novaAnotacao}
                    onChange={(e) => setNovaAnotacao(e.target.value)}
                    rows={3}
                    className="text-sm"
                  />
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={adicionarAnotacao}
                      disabled={!novaAnotacao.trim()}
                    >
                      <MessageSquarePlus className="h-4 w-4 mr-2" />
                      Criar anotação
                    </Button>
                  </div>
                </div>

                {anotacoes.length === 0 ? (
                  <div className="text-center py-8">
                    <MessageSquarePlus className="h-10 w-10 text-muted-foreground/40 mx-auto mb-3" />
                    <p className="text-sm text-muted-foreground">Nenhuma anotação ainda.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {anotacoes.map((anotacao) => (
                      <div
                        key={anotacao.id}
                        className="card-gradient rounded-xl border border-border p-4 group"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-2">
                              <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-[10px] font-bold text-primary flex-shrink-0">
                                {(anotacao.user_nome ?? "U").charAt(0).toUpperCase()}
                              </div>
                              <span className="text-xs font-medium text-foreground">
                                {anotacao.user_nome ?? "Usuário"}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                {formatarData(anotacao.created_at)}
                              </span>
                            </div>
                            <p className="text-sm text-foreground whitespace-pre-wrap pl-8">
                              {anotacao.texto}
                            </p>
                          </div>
                          <button
                            onClick={() => removerAnotacao(anotacao.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-500/10 flex-shrink-0"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </TabsContent>

              {/* Tab: Histórico */}
              <TabsContent value="historico" className="mt-4">
                {(() => {
                  type TimelineItem = { date: string; type: "captacao" | "movimentacao" | "tarefa" | "anotacao" | "status"; label: React.ReactNode };
                  const items: TimelineItem[] = [];

                  items.push({
                    date: lead.data_captacao,
                    type: "captacao",
                    label: <>Lead captado</>,
                  });

                  logs.forEach((log) => {
                    const nomeEtapa = etapas.find(e => e.id === log.etapa_id)?.nome ?? "Desconhecida";
                    items.push({
                      date: log.data_entrada,
                      type: "movimentacao",
                      label: <>Movido para a etapa <strong className="text-foreground">{nomeEtapa}</strong></>,
                    });
                  });

                  lead.funil_tarefas
                    .filter(t => t.concluida && t.concluida_em)
                    .forEach((t) => {
                      items.push({
                        date: t.concluida_em!,
                        type: "tarefa",
                        label: <>Tarefa concluída: <strong className="text-foreground">{t.descricao}</strong></>,
                      });
                    });

                  anotacoes.forEach((a) => {
                    items.push({
                      date: a.created_at,
                      type: "anotacao",
                      label: <><strong className="text-foreground">{a.user_nome ?? "Usuário"}</strong> adicionou uma anotação</>,
                    });
                  });

                  if (lead.status_funil !== "em_andamento") {
                    items.push({
                      date: lead.created_at,
                      type: "status",
                      label: <>Negociação marcada como <strong className="text-foreground">{lead.status_funil === "ganho" ? "Ganha" : "Perdida"}</strong></>,
                    });
                  }

                  items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

                  const colorMap: Record<string, string> = {
                    captacao: "bg-primary",
                    movimentacao: "bg-blue-400",
                    tarefa: "bg-green-500",
                    anotacao: "bg-amber-400",
                    status: lead.status_funil === "ganho" ? "bg-green-500" : "bg-red-500",
                  };

                  return (
                    <div className="relative space-y-0">
                      {items.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-8 italic">Nenhum registro.</p>
                      ) : (
                        items.map((item, i) => (
                          <div key={i} className="flex gap-3 py-2.5">
                            <div className="flex flex-col items-center pt-1.5">
                              <div className={cn("h-2 w-2 rounded-full flex-shrink-0", colorMap[item.type])} />
                              {i < items.length - 1 && <div className="w-px flex-1 bg-border mt-1" />}
                            </div>
                            <div className="flex-1 min-w-0 pb-1">
                              <p className="text-sm text-muted-foreground leading-snug">{item.label}</p>
                              <p className="text-[11px] text-muted-foreground/60 mt-0.5">{formatarData(item.date)}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  );
                })()}
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>

      {/* Dialog: confirmar mudança de etapa */}
      <AlertDialog open={!!etapaDestino} onOpenChange={(open) => !open && setEtapaDestino(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Mover lead de etapa</AlertDialogTitle>
            <AlertDialogDescription>
              Deseja mover <strong>{lead.nome}</strong> para a etapa{" "}
              <strong>{etapaDestino?.nome}</strong>?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmarMoverEtapa}>
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

// ── Componentes auxiliares ─────────────────────────────────

function InfoRow({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ElementType;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
      </div>
      <div className="pl-5">{children}</div>
    </div>
  );
}

function EditableField({
  icon: Icon,
  label,
  campo,
  editandoCampo,
  onEdit,
  onSave,
  onCancel,
  salvando,
  input,
  children,
}: {
  icon: React.ElementType;
  label: string;
  campo: string;
  editandoCampo: string | null;
  onEdit: (campo: string) => void;
  onSave: (campo: string, valorDireto?: string) => void;
  onCancel: () => void;
  salvando: boolean;
  input: React.ReactNode;
  children: React.ReactNode;
}) {
  const isEditing = editandoCampo === campo;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-1.5">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
        <label className="text-xs font-medium text-muted-foreground">{label}</label>
      </div>
      {isEditing ? (
        <div className="pl-5 space-y-1.5">
          {input}
          <div className="flex justify-end gap-1.5">
            <button
              onClick={onCancel}
              className="p-1 rounded hover:bg-muted text-muted-foreground"
              title="Cancelar"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => onSave(campo)}
              disabled={salvando}
              className="p-1 rounded hover:bg-primary/10 text-primary"
              title="Salvar"
            >
              {salvando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
            </button>
          </div>
        </div>
      ) : (
        <div className="pl-5 group/field flex items-center gap-2 min-h-[28px]">
          <div className="flex-1 min-w-0">{children}</div>
          <button
            onClick={() => onEdit(campo)}
            className="opacity-0 group-hover/field:opacity-100 transition-opacity p-1 rounded hover:bg-muted flex-shrink-0"
            title="Editar"
          >
            <Pencil className="h-3 w-3 text-muted-foreground" />
          </button>
        </div>
      )}
    </div>
  );
}

function TarefaItem({
  tarefa,
  onToggle,
  onRemove,
}: {
  tarefa: FunilTarefa;
  onToggle: (t: FunilTarefa) => void;
  onRemove: (id: number) => void;
}) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm group transition-colors",
        tarefa.concluida
          ? "bg-muted/30"
          : tarefaVencida(tarefa)
            ? "bg-red-500/10"
            : tarefaHoje(tarefa)
              ? "bg-amber-500/10"
              : "bg-muted/50"
      )}
    >
      <button onClick={() => onToggle(tarefa)} className="flex-shrink-0">
        {tarefa.concluida ? (
          <CheckCircle2 className="h-4 w-4 text-green-500" />
        ) : (
          <Circle className="h-4 w-4 text-muted-foreground hover:text-primary" />
        )}
      </button>
      <span
        className={cn(
          "flex-1 min-w-0 truncate",
          tarefa.concluida && "line-through text-muted-foreground"
        )}
      >
        {tarefa.descricao}
      </span>
      {tarefa.data_vencimento && (
        <span
          className={cn(
            "text-xs flex-shrink-0",
            tarefaVencida(tarefa)
              ? "text-red-500 font-medium"
              : tarefaHoje(tarefa)
                ? "text-amber-600 font-medium"
                : "text-muted-foreground"
          )}
        >
          {new Date(tarefa.data_vencimento).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
          })}
        </span>
      )}
      <button
        onClick={() => onRemove(tarefa.id)}
        className="opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
      >
        <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" />
      </button>
    </div>
  );
}

export default LeadDetails;
