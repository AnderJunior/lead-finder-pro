import { useEffect, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  Plus,
  MoreHorizontal,
  Trash2,
  Pencil,
  Phone,
  CalendarClock,
  RefreshCw,
  KanbanSquare,
  Star,
  X,
  Zap,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import {
  fetchFunilEtapas,
  fetchLeadsFunil,
  atualizarLeadFunil,
  removerLeadDoFunil,
  moverLeadEtapa,
  fetchUsuariosEmpresa,
  fetchFunilAutomacoes,
  criarFunilAutomacao,
  deletarFunilAutomacao,
  executarAutomacoesParaEtapa,
  type FunilEtapa,
  type LeadCaptadoComTarefas,
  type FunilTarefa,
  type FunilAutomacao,
  type UsuarioEmpresa,
} from "@/lib/supabase-functions";

interface EditarLeadFunilForm {
  valor: string;
  contato: string;
  notas: string;
  status_funil: string;
}

const formVazio: EditarLeadFunilForm = {
  valor: "",
  contato: "",
  notas: "",
  status_funil: "em_andamento",
};

const formatarValor = (valor: number) => {
  if (!valor) return "";
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
};

const formatarData = (dateStr: string) =>
  new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

const tarefaVencida = (t: FunilTarefa) =>
  !t.concluida && t.data_vencimento && new Date(t.data_vencimento) < new Date();

const tarefaHoje = (t: FunilTarefa) => {
  if (!t.data_vencimento || t.concluida) return false;
  return new Date(t.data_vencimento).toDateString() === new Date().toDateString();
};

const Funil = () => {
  const { dbUser, isAdmin } = useAuth();
  const { toast } = useToast();
  const navigate = useNavigate();

  const [etapas, setEtapas] = useState<FunilEtapa[]>([]);
  const [leads, setLeads] = useState<LeadCaptadoComTarefas[]>([]);
  const [loading, setLoading] = useState(true);
  const [vendedores, setVendedores] = useState<UsuarioEmpresa[]>([]);
  const [filtroVendedorId, setFiltroVendedorId] = useState<string>("todos");

  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverEtapa, setDragOverEtapa] = useState<number | null>(null);

  // Dialog: editar dados do funil no lead
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editandoLead, setEditandoLead] = useState<LeadCaptadoComTarefas | null>(null);
  const [form, setForm] = useState<EditarLeadFunilForm>(formVazio);

  // Dialog: automações
  const [autoDialogOpen, setAutoDialogOpen] = useState(false);
  const [automacoes, setAutomacoes] = useState<FunilAutomacao[]>([]);
  const [autoEtapaSelecionada, setAutoEtapaSelecionada] = useState<number | null>(null);
  const [novaAutoDescricao, setNovaAutoDescricao] = useState("");
  const [novaAutoDias, setNovaAutoDias] = useState("");
  const [loadingAuto, setLoadingAuto] = useState(false);

  // Refs para custom drag e scrollbar
  const scrollRef = useRef<HTMLDivElement>(null);
  const thumbRef = useRef<HTMLDivElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const [thumbStyle, setThumbStyle] = useState({ left: 0, width: 0 });
  const dragState = useRef({
    id: 0,
    startX: 0,
    startY: 0,
    started: false,
    active: false,
    mouseX: 0,
    mouseY: 0,
    clone: null as HTMLDivElement | null,
  });

  const carregarDados = useCallback(async () => {
    if (!dbUser) return;
    setLoading(true);
    try {
      const [etapasData, leadsData] = await Promise.all([
        fetchFunilEtapas(),
        fetchLeadsFunil(),
      ]);
      setEtapas(etapasData);
      setLeads(leadsData);
    } catch (err) {
      toast({
        title: "Erro ao carregar funil",
        description: err instanceof Error ? err.message : "Erro desconhecido.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [dbUser, toast]);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  useEffect(() => {
    if (isAdmin) {
      fetchUsuariosEmpresa().then(users => setVendedores(users.filter(u => u.role !== "admin"))).catch(() => {});
    }
  }, [isAdmin]);

  const leadsFiltrados = filtroVendedorId === "todos"
    ? leads
    : leads.filter(l => l.user_id === Number(filtroVendedorId));

  // Sincronizar scrollbar customizada
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const updateThumb = () => {
      const { scrollLeft, scrollWidth, clientWidth } = container;
      if (scrollWidth <= clientWidth) {
        setThumbStyle({ left: 0, width: 0 });
        return;
      }
      const ratio = clientWidth / scrollWidth;
      const thumbW = Math.max(ratio * 100, 10);
      const maxLeft = 100 - thumbW;
      const left = (scrollLeft / (scrollWidth - clientWidth)) * maxLeft;
      setThumbStyle({ left, width: thumbW });
    };

    updateThumb();
    container.addEventListener("scroll", updateThumb);
    const ro = new ResizeObserver(updateThumb);
    ro.observe(container);

    return () => {
      container.removeEventListener("scroll", updateThumb);
      ro.disconnect();
    };
  }, [etapas, leads]);

  const handleThumbDrag = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    const track = trackRef.current;
    const container = scrollRef.current;
    if (!track || !container) return;

    const trackRect = track.getBoundingClientRect();
    const { scrollWidth, clientWidth } = container;
    const maxScroll = scrollWidth - clientWidth;
    const thumbW = thumbStyle.width / 100 * trackRect.width;

    const startX = e.clientX;
    const startScroll = container.scrollLeft;

    const onMove = (ev: PointerEvent) => {
      const delta = ev.clientX - startX;
      const scrollDelta = (delta / (trackRect.width - thumbW)) * maxScroll;
      container.scrollLeft = Math.max(0, Math.min(maxScroll, startScroll + scrollDelta));
    };

    const onUp = () => {
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
  }, [thumbStyle.width]);

  const handleTrackClick = useCallback((e: React.MouseEvent) => {
    if (e.target === thumbRef.current) return;
    const track = trackRef.current;
    const container = scrollRef.current;
    if (!track || !container) return;

    const trackRect = track.getBoundingClientRect();
    const clickRatio = (e.clientX - trackRect.left) / trackRect.width;
    const { scrollWidth, clientWidth } = container;
    container.scrollTo({
      left: clickRatio * (scrollWidth - clientWidth) - clientWidth / 2,
      behavior: "smooth",
    });
  }, []);

  const leadsPorEtapa = (etapaId: number) =>
    leadsFiltrados
      .filter((l) => l.etapa_id === etapaId)
      .sort((a, b) => a.ordem_funil - b.ordem_funil);

  const totalEtapa = (etapaId: number) =>
    leadsPorEtapa(etapaId).reduce((acc, l) => acc + (l.valor || 0), 0);

  // ── Custom Pointer Drag & Drop ──────────────────────────

  const handlePointerDown = useCallback(
    (e: React.PointerEvent, leadId: number) => {
      if (e.button !== 0) return;
      const ds = dragState.current;
      ds.id = leadId;
      ds.startX = e.clientX;
      ds.startY = e.clientY;
      ds.mouseX = e.clientX;
      ds.mouseY = e.clientY;
      ds.started = false;
      ds.active = true;
    },
    []
  );

  useEffect(() => {
    let rafId = 0;

    const getColumnAtPoint = (x: number): number | null => {
      for (const etapa of etapas) {
        const el = document.querySelector(`[data-etapa-id="${etapa.id}"]`);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (x >= r.left && x <= r.right) return etapa.id;
      }
      return null;
    };

    const doScroll = () => {
      const ds = dragState.current;
      if (!ds.started) return;

      const container = scrollRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const x = ds.mouseX;
      const zona = 250;

      if (x < rect.left + zona) {
        const fator = Math.min(1, (rect.left + zona - x) / zona);
        container.scrollLeft -= Math.round(4 + fator * 12);
      } else if (x > rect.right - zona) {
        const fator = Math.min(1, (x - (rect.right - zona)) / zona);
        container.scrollLeft += Math.round(4 + fator * 12);
      }
    };

    const loop = () => {
      doScroll();
      rafId = requestAnimationFrame(loop);
    };
    rafId = requestAnimationFrame(loop);

    const onMove = (e: PointerEvent) => {
      const ds = dragState.current;
      if (!ds.active) return;

      ds.mouseX = e.clientX;
      ds.mouseY = e.clientY;

      if (!ds.started) {
        const dx = e.clientX - ds.startX;
        const dy = e.clientY - ds.startY;
        if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;

        ds.started = true;
        setDraggedId(ds.id);
        document.body.style.userSelect = "none";
        document.body.style.cursor = "grabbing";

        const sourceEl = document.querySelector(
          `[data-lead-id="${ds.id}"]`
        );
        if (sourceEl) {
          const clone = sourceEl.cloneNode(true) as HTMLDivElement;
          clone.style.cssText = `
            position:fixed; z-index:9999; pointer-events:none;
            width:${sourceEl.getBoundingClientRect().width}px;
            opacity:0.85; transform:rotate(2deg) scale(1.02);
            box-shadow:0 12px 24px rgba(0,0,0,0.15); transition:none;
          `;
          document.body.appendChild(clone);
          ds.clone = clone;
        }
      }

      if (ds.clone) {
        ds.clone.style.left = `${e.clientX - 140}px`;
        ds.clone.style.top = `${e.clientY - 20}px`;
      }

      const etapaId = getColumnAtPoint(e.clientX);
      setDragOverEtapa(etapaId);
    };

    const cleanup = () => {
      const ds = dragState.current;
      if (ds.clone) {
        ds.clone.remove();
        ds.clone = null;
      }
      ds.active = false;
      ds.started = false;
      ds.id = 0;
      setDraggedId(null);
      setDragOverEtapa(null);
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
    };

    const onUp = () => {
      const ds = dragState.current;
      if (!ds.active || !ds.started) {
        cleanup();
        return;
      }

      const targetEtapa = getColumnAtPoint(ds.mouseX);
      const leadId = ds.id;
      cleanup();

      if (!targetEtapa) return;

      setLeads((prev) => {
        const lead = prev.find((l) => l.id === leadId);
        if (!lead || lead.etapa_id === targetEtapa) return prev;

        const destino = prev.filter((l) => l.etapa_id === targetEtapa);
        const novaOrdem =
          destino.length > 0
            ? Math.max(...destino.map((l) => l.ordem_funil)) + 1
            : 0;

        moverLeadEtapa(leadId, targetEtapa, novaOrdem, dbUser!.id, dbUser!.empresa_id)
          .then(() =>
            executarAutomacoesParaEtapa(leadId, targetEtapa, dbUser!.empresa_id)
              .then((novasTarefas) => {
                if (novasTarefas.length > 0) {
                  setLeads((curr) =>
                    curr.map((l) =>
                      l.id === leadId
                        ? { ...l, funil_tarefas: [...l.funil_tarefas, ...novasTarefas] }
                        : l
                    )
                  );
                }
              })
              .catch(() => {})
          )
          .catch(() => {
            carregarDados();
          });

        return prev.map((l) =>
          l.id === leadId
            ? { ...l, etapa_id: targetEtapa, ordem_funil: novaOrdem }
            : l
        );
      });
    };

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dragState.current.active) {
        cleanup();
      }
    };

    document.addEventListener("pointermove", onMove);
    document.addEventListener("pointerup", onUp);
    document.addEventListener("keydown", onKeyDown);

    return () => {
      cancelAnimationFrame(rafId);
      document.removeEventListener("pointermove", onMove);
      document.removeEventListener("pointerup", onUp);
      document.removeEventListener("keydown", onKeyDown);
      cleanup();
    };
  }, [etapas, carregarDados]);

  // ── Editar dados do funil ──────────────────────────────────

  const abrirEditarLead = (lead: LeadCaptadoComTarefas) => {
    setEditandoLead(lead);
    setForm({
      valor: lead.valor ? String(lead.valor) : "",
      contato: lead.contato ?? "",
      notas: lead.notas ?? "",
      status_funil: lead.status_funil ?? "em_andamento",
    });
    setEditDialogOpen(true);
  };

  const salvarEdicao = async () => {
    if (!editandoLead) return;
    try {
      await atualizarLeadFunil(editandoLead.id, {
        valor: parseFloat(form.valor) || 0,
        contato: form.contato.trim() || null,
        notas: form.notas.trim() || null,
        status_funil: form.status_funil,
      });
      toast({ title: "Lead atualizado" });
      setEditDialogOpen(false);
      carregarDados();
    } catch (err) {
      toast({
        title: "Erro ao salvar",
        description: err instanceof Error ? err.message : "Erro desconhecido.",
        variant: "destructive",
      });
    }
  };

  // ── Remover do funil ───────────────────────────────────────

  const removerDoFunil = async (leadId: number) => {
    try {
      await removerLeadDoFunil(leadId);
      setLeads((prev) => prev.filter((l) => l.id !== leadId));
      toast({ title: "Lead removido do funil" });
    } catch (err) {
      toast({
        title: "Erro ao remover",
        description: err instanceof Error ? err.message : "Erro desconhecido.",
        variant: "destructive",
      });
    }
  };

  // ── Automações ────────────────────────────────────────────

  const abrirAutoDialog = async () => {
    setAutoDialogOpen(true);
    setAutoEtapaSelecionada(null);
    setLoadingAuto(true);
    try {
      const data = await fetchFunilAutomacoes();
      setAutomacoes(data);
    } catch {
      toast({ title: "Erro ao carregar automações", variant: "destructive" });
    } finally {
      setLoadingAuto(false);
    }
  };

  const adicionarAutomacao = async () => {
    if (!autoEtapaSelecionada || !novaAutoDescricao.trim() || !dbUser) return;
    try {
      const nova = await criarFunilAutomacao({
        etapa_id: autoEtapaSelecionada,
        descricao: novaAutoDescricao.trim(),
        dias_vencimento: parseInt(novaAutoDias) || 0,
        ordem: automacoes.filter((a) => a.etapa_id === autoEtapaSelecionada).length,
        empresa_id: dbUser.empresa_id,
      });
      setAutomacoes((prev) => [...prev, nova]);
      setNovaAutoDescricao("");
      setNovaAutoDias("");
    } catch (err) {
      toast({
        title: "Erro ao criar automação",
        description: err instanceof Error ? err.message : "Erro desconhecido.",
        variant: "destructive",
      });
    }
  };

  const removerAutomacao = async (id: number) => {
    try {
      await deletarFunilAutomacao(id);
      setAutomacoes((prev) => prev.filter((a) => a.id !== id));
    } catch {
      toast({ title: "Erro ao excluir automação", variant: "destructive" });
    }
  };

  const autosPorEtapa = (etapaId: number) =>
    automacoes.filter((a) => a.etapa_id === etapaId).sort((a, b) => a.ordem - b.ordem);

  // ── Totais ────────────────────────────────────────────────
  const totalLeads = leadsFiltrados.length;
  const valorTotal = leadsFiltrados.reduce((acc, l) => acc + (l.valor || 0), 0);

  // ── Render ────────────────────────────────────────────────

  return (
    <AppLayout>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <KanbanSquare className="h-6 w-6 text-primary" />
              Funil Comercial
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {totalLeads} lead{totalLeads !== 1 ? "s" : ""} no funil ·{" "}
              {formatarValor(valorTotal) || "R$ 0,00"} no pipeline
            </p>
          </div>
          <div className="flex items-center gap-3">
            {isAdmin && (
              <button
                onClick={abrirAutoDialog}
                className="gradient-border-spin p-[2px] cursor-pointer hover:scale-105 transition-transform"
                title="Automações do Funil"
              >
                <div className="gradient-border-inner">
                  <Zap className="h-4 w-4 text-primary" />
                </div>
              </button>
            )}
            {isAdmin && vendedores.length > 0 && (
              <div className="flex items-center gap-2">
                <Select value={filtroVendedorId} onValueChange={setFiltroVendedorId}>
                  <SelectTrigger className="h-9 min-w-[180px] bg-white text-sm">
                    <SelectValue placeholder="Filtrar vendedor" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todos">Todos</SelectItem>
                    {vendedores.map((v) => (
                      <SelectItem key={v.id} value={String(v.id)}>{v.nome || v.email}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={carregarDados}
              disabled={loading}
            >
              <RefreshCw
                className={cn("h-4 w-4 mr-2", loading && "animate-spin")}
              />
              Atualizar
            </Button>
          </div>
        </div>

        {/* Kanban Board */}
        {loading ? (
          <div className="card-gradient rounded-xl border border-border p-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-muted-foreground">Carregando funil...</p>
          </div>
        ) : (
          <div
            ref={scrollRef}
            className="flex gap-4 overflow-x-auto pb-3 px-1 items-start funil-scroll"
          >
            {etapas.map((etapa) => {
              const cards = leadsPorEtapa(etapa.id);
              const total = totalEtapa(etapa.id);
              const isOver = dragOverEtapa === etapa.id;

              return (
                <div
                  key={etapa.id}
                  data-etapa-id={etapa.id}
                  className={cn(
                    "w-[320px] min-w-[320px] rounded-xl border border-border bg-card/50 transition-all duration-200",
                    isOver && "ring-2 ring-primary/50 bg-primary/5"
                  )}
                >
                  {/* Cabeçalho da coluna */}
                  <div className="px-4 py-3 border-b border-border">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: etapa.cor }}
                        />
                        <h3 className="text-sm font-semibold text-foreground">
                          {etapa.nome}
                        </h3>
                        <Badge
                          variant="secondary"
                          className="text-xs px-1.5 py-0 h-5 min-w-[20px] justify-center"
                        >
                          {cards.length}
                        </Badge>
                      </div>
                      {total > 0 && (
                        <span className="text-xs font-medium text-muted-foreground">
                          {formatarValor(total)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Cards */}
                  <div className="p-2 space-y-2">
                    {cards.map((lead) => (
                      <KanbanCard
                        key={lead.id}
                        lead={lead}
                        isDragged={draggedId === lead.id}
                        onPointerDown={handlePointerDown}
                        onClick={() => navigate(`/lead/${lead.id}`)}
                        onEdit={() => abrirEditarLead(lead)}
                        onRemove={() => removerDoFunil(lead.id)}
                      />
                    ))}

                    {cards.length === 0 && !draggedId && (
                      <div className="text-center py-4 text-muted-foreground text-xs">
                        Nenhum lead nesta etapa
                      </div>
                    )}

                    {isOver && draggedId && (
                      <div className="border-2 border-dashed border-primary/40 rounded-lg h-20 flex items-center justify-center text-xs text-primary/60">
                        Soltar aqui
                      </div>
                    )}
                  </div>

                </div>
              );
            })}
          </div>
        )}

        {/* Scrollbar horizontal customizada - sticky no fundo */}
        {!loading && thumbStyle.width > 0 && thumbStyle.width < 100 && (
          <div className="funil-scrollbar-track" onClick={handleTrackClick}>
            <div ref={trackRef} className="funil-scrollbar-track-inner">
              <div
                ref={thumbRef}
                className="funil-scrollbar-thumb"
                style={{
                  left: `${thumbStyle.left}%`,
                  width: `${thumbStyle.width}%`,
                }}
                onPointerDown={handleThumbDrag}
              />
            </div>
          </div>
        )}
      </div>

      {/* Dialog: editar dados do funil no lead */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[460px]">
          <DialogHeader>
            <DialogTitle>Editar Dados do Funil</DialogTitle>
            {editandoLead && (
              <p className="text-sm text-muted-foreground">
                {editandoLead.nome}
              </p>
            )}
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Valor (R$)</label>
                <Input
                  type="number"
                  placeholder="0,00"
                  value={form.valor}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, valor: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Contato</label>
                <Input
                  placeholder="Nome do contato"
                  value={form.contato}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, contato: e.target.value }))
                  }
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
              <div className="flex gap-2">
                {[
                  { value: "em_andamento", label: "Em andamento", color: "bg-blue-500/10 text-blue-600 border-blue-500/20" },
                  { value: "ganho", label: "Ganho", color: "bg-green-500/10 text-green-600 border-green-500/20" },
                  { value: "perdido", label: "Perdido", color: "bg-red-500/10 text-red-600 border-red-500/20" },
                ].map((s) => (
                  <button
                    key={s.value}
                    onClick={() =>
                      setForm((f) => ({ ...f, status_funil: s.value }))
                    }
                    className={cn(
                      "px-3 py-1.5 rounded-md border text-xs font-medium transition-all",
                      form.status_funil === s.value
                        ? s.color
                        : "bg-muted/30 text-muted-foreground border-border hover:bg-muted"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Notas</label>
              <Textarea
                placeholder="Observações sobre este lead..."
                value={form.notas}
                onChange={(e) =>
                  setForm((f) => ({ ...f, notas: e.target.value }))
                }
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={salvarEdicao}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: automações do funil */}
      <Dialog open={autoDialogOpen} onOpenChange={setAutoDialogOpen}>
        <DialogContent className="sm:max-w-[720px] max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-lg">
              Automações do Funil
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Defina tarefas que serão criadas automaticamente quando um lead entrar em cada etapa.
            </p>
          </DialogHeader>

          {loadingAuto ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto space-y-1 py-2">
              {etapas.map((etapa) => {
                const autos = autosPorEtapa(etapa.id);
                const isSelected = autoEtapaSelecionada === etapa.id;

                return (
                  <div key={etapa.id} className="rounded-lg border border-border overflow-hidden">
                    <button
                      onClick={() => setAutoEtapaSelecionada(isSelected ? null : etapa.id)}
                      className={cn(
                        "w-full flex items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/50",
                        isSelected && "bg-muted/50"
                      )}
                    >
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: etapa.cor }}
                      />
                      <span className="text-sm font-semibold text-foreground flex-1">
                        {etapa.nome}
                      </span>
                      {autos.length > 0 && (
                        <Badge variant="secondary" className="text-xs px-2 py-0 h-5">
                          {autos.length} tarefa{autos.length !== 1 ? "s" : ""}
                        </Badge>
                      )}
                      <svg
                        className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform",
                          isSelected && "rotate-180"
                        )}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>

                    {isSelected && (
                      <div className="border-t border-border bg-muted/20 px-4 py-3 space-y-3">
                        {autos.length > 0 ? (
                          <div className="space-y-2">
                            {autos.map((auto, idx) => (
                              <div
                                key={auto.id}
                                className="flex items-center gap-3 rounded-lg bg-card px-3 py-2.5 border border-border group"
                              >
                                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary/10 text-primary text-xs font-bold flex-shrink-0">
                                  {idx + 1}
                                </span>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-foreground truncate">
                                    {auto.descricao}
                                  </p>
                                  {auto.dias_vencimento > 0 && (
                                    <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                                      <CalendarClock className="h-3 w-3" />
                                      Vence em {auto.dias_vencimento} dia{auto.dias_vencimento !== 1 ? "s" : ""}
                                    </p>
                                  )}
                                </div>
                                <button
                                  onClick={() => removerAutomacao(auto.id)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-red-500/10"
                                >
                                  <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-muted-foreground italic text-center py-2">
                            Nenhuma tarefa automática configurada para esta etapa.
                          </p>
                        )}

                        <div className="flex gap-2 pt-1">
                          <Input
                            placeholder="Descrição da tarefa..."
                            value={novaAutoDescricao}
                            onChange={(e) => setNovaAutoDescricao(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && adicionarAutomacao()}
                            className="text-sm flex-1"
                          />
                          <Input
                            type="number"
                            placeholder="Dias"
                            min="0"
                            value={novaAutoDias}
                            onChange={(e) => setNovaAutoDias(e.target.value)}
                            className="w-20 text-sm text-center"
                            title="Dias para vencimento (0 = sem prazo)"
                          />
                          <Button
                            size="sm"
                            onClick={adicionarAutomacao}
                            disabled={!novaAutoDescricao.trim()}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                        <p className="text-[11px] text-muted-foreground">
                          "Dias" = prazo de vencimento a partir da entrada do lead. 0 = sem prazo.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppLayout>
  );
};

// ── Componente do Card Kanban ────────────────────────────────

interface KanbanCardProps {
  lead: LeadCaptadoComTarefas;
  isDragged: boolean;
  onPointerDown: (e: React.PointerEvent, id: number) => void;
  onClick: () => void;
  onEdit: () => void;
  onRemove: () => void;
}

function KanbanCard({
  lead,
  isDragged,
  onPointerDown,
  onClick,
  onEdit,
  onRemove,
}: KanbanCardProps) {
  const tarefasPendentes = lead.funil_tarefas.filter((t) => !t.concluida);
  const proximaTarefa = [...tarefasPendentes].sort(
    (a, b) =>
      new Date(a.data_vencimento ?? "9999").getTime() -
      new Date(b.data_vencimento ?? "9999").getTime()
  )[0];

  const diasNaEtapa = Math.floor(
    (Date.now() - new Date(lead.data_captacao).getTime()) / 86_400_000
  );

  const pointerDownRef = useRef(false);

  return (
    <div
      data-lead-id={lead.id}
      onPointerDown={(e) => {
        if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
        pointerDownRef.current = true;
        onPointerDown(e, lead.id);
      }}
      onPointerUp={() => {
        if (pointerDownRef.current) {
          pointerDownRef.current = false;
        }
      }}
      onClick={(e) => {
        if ((e.target as HTMLElement).closest("[data-no-drag]")) return;
        onClick();
      }}
      className={cn(
        "group rounded-lg border border-border bg-card p-3.5 cursor-grab active:cursor-grabbing transition-all duration-150 hover:shadow-md hover:border-border/80 select-none touch-none",
        isDragged && "opacity-30 scale-95"
      )}
    >
      <div className="space-y-2.5">
        {/* Nome + menu */}
        <div className="flex items-start justify-between gap-2">
          <p className="text-sm font-semibold text-foreground leading-snug">
            {lead.nome}
          </p>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                data-no-drag
                className="opacity-0 group-hover:opacity-100 transition-opacity p-1 -mr-1 -mt-0.5 rounded hover:bg-muted flex-shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="h-3.5 w-3.5 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                data-no-drag
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit();
                }}
              >
                <Pencil className="h-3.5 w-3.5 mr-2" />
                Editar
              </DropdownMenuItem>
              <DropdownMenuItem
                data-no-drag
                className="text-red-600"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemove();
                }}
              >
                <X className="h-3.5 w-3.5 mr-2" />
                Remover do Funil
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Tempo na etapa */}
        <p className="text-xs text-muted-foreground">
          {diasNaEtapa === 0
            ? "Entrou hoje"
            : `${diasNaEtapa} dia${diasNaEtapa !== 1 ? "s" : ""} nesta etapa`}
        </p>

        {/* Telefone + WhatsApp */}
        {lead.telefone && (
          <div className="flex items-center gap-1.5 text-xs text-foreground font-mono">
            <Phone className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{lead.telefone}</span>
            {lead.has_whatsapp === true && (
              <Badge
                variant="outline"
                className="text-[9px] px-1.5 py-0 h-4 bg-green-500/10 text-green-600 border-green-500/20 ml-1"
              >
                WA validado
              </Badge>
            )}
          </div>
        )}

        {/* Tarefa ou sem tarefa + Avaliação */}
        <div className="flex items-center justify-between gap-2">
          {proximaTarefa ? (
            <div
              className={cn(
                "flex items-center gap-1.5 rounded-md px-2 py-1 text-xs flex-1 min-w-0",
                tarefaVencida(proximaTarefa)
                  ? "bg-red-500/10 text-red-600"
                  : tarefaHoje(proximaTarefa)
                    ? "bg-amber-500/10 text-amber-700"
                    : "bg-muted/50 text-muted-foreground"
              )}
            >
              <CalendarClock className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{proximaTarefa.descricao}</span>
              {proximaTarefa.data_vencimento && (
                <span className="ml-auto flex-shrink-0 font-medium">
                  {new Date(proximaTarefa.data_vencimento).toLocaleDateString(
                    "pt-BR",
                    { day: "2-digit", month: "2-digit" }
                  )}
                </span>
              )}
            </div>
          ) : (
            <span className="text-[11px] text-muted-foreground/60 italic">
              Sem tarefas
            </span>
          )}

          {lead.rating != null && lead.rating > 0 && (
            <span className="inline-flex items-center gap-0.5 text-xs text-warning font-semibold flex-shrink-0">
              <Star className="h-3.5 w-3.5 fill-warning" />
              {lead.rating}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export default Funil;
