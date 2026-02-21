import { useEffect, useState, useCallback, useRef } from "react";
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
  Loader2,
  Plus,
  MoreHorizontal,
  Trash2,
  Pencil,
  Phone,
  Mail,
  DollarSign,
  CalendarClock,
  CheckCircle2,
  Circle,
  RefreshCw,
  Building2,
  KanbanSquare,
  Globe,
  Star,
  X,
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
  criarFunilTarefa,
  atualizarFunilTarefa,
  deletarFunilTarefa,
  type FunilEtapa,
  type LeadCaptadoComTarefas,
  type FunilTarefa,
  type LeadCaptado,
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
  const { dbUser } = useAuth();
  const { toast } = useToast();

  const [etapas, setEtapas] = useState<FunilEtapa[]>([]);
  const [leads, setLeads] = useState<LeadCaptadoComTarefas[]>([]);
  const [loading, setLoading] = useState(true);

  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverEtapa, setDragOverEtapa] = useState<number | null>(null);

  // Dialog: editar dados do funil no lead
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editandoLead, setEditandoLead] = useState<LeadCaptadoComTarefas | null>(null);
  const [form, setForm] = useState<EditarLeadFunilForm>(formVazio);

  // Dialog: detalhes do lead
  const [detalheLead, setDetalheLead] = useState<LeadCaptadoComTarefas | null>(null);
  const [novaTarefaTexto, setNovaTarefaTexto] = useState("");
  const [novaTarefaData, setNovaTarefaData] = useState("");

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
        fetchFunilEtapas(dbUser.id),
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
    leads
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

        moverLeadEtapa(leadId, targetEtapa, novaOrdem, dbUser!.id).catch(() => {
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
      setDetalheLead(null);
      toast({ title: "Lead removido do funil" });
    } catch (err) {
      toast({
        title: "Erro ao remover",
        description: err instanceof Error ? err.message : "Erro desconhecido.",
        variant: "destructive",
      });
    }
  };

  // ── Tarefas ───────────────────────────────────────────────

  const adicionarTarefa = async () => {
    if (!detalheLead || !novaTarefaTexto.trim()) return;
    try {
      const tarefa = await criarFunilTarefa({
        lead_id: detalheLead.id,
        descricao: novaTarefaTexto.trim(),
        data_vencimento: novaTarefaData || null,
        concluida: false,
      });
      const novasTarefas = [...detalheLead.funil_tarefas, tarefa];
      setDetalheLead({ ...detalheLead, funil_tarefas: novasTarefas });
      setLeads((prev) =>
        prev.map((l) =>
          l.id === detalheLead.id ? { ...l, funil_tarefas: novasTarefas } : l
        )
      );
      setNovaTarefaTexto("");
      setNovaTarefaData("");
    } catch (err) {
      toast({
        title: "Erro ao criar tarefa",
        description: err instanceof Error ? err.message : "Erro desconhecido.",
        variant: "destructive",
      });
    }
  };

  const toggleTarefa = async (tarefa: FunilTarefa) => {
    if (!detalheLead) return;
    const novoConcluida = !tarefa.concluida;
    try {
      await atualizarFunilTarefa(tarefa.id, { concluida: novoConcluida });
      const atualizadas = detalheLead.funil_tarefas.map((t) =>
        t.id === tarefa.id ? { ...t, concluida: novoConcluida } : t
      );
      setDetalheLead({ ...detalheLead, funil_tarefas: atualizadas });
      setLeads((prev) =>
        prev.map((l) =>
          l.id === detalheLead.id ? { ...l, funil_tarefas: atualizadas } : l
        )
      );
    } catch {
      toast({ title: "Erro ao atualizar tarefa", variant: "destructive" });
    }
  };

  const removerTarefa = async (tarefaId: number) => {
    if (!detalheLead) return;
    try {
      await deletarFunilTarefa(tarefaId);
      const atualizadas = detalheLead.funil_tarefas.filter(
        (t) => t.id !== tarefaId
      );
      setDetalheLead({ ...detalheLead, funil_tarefas: atualizadas });
      setLeads((prev) =>
        prev.map((l) =>
          l.id === detalheLead.id ? { ...l, funil_tarefas: atualizadas } : l
        )
      );
    } catch {
      toast({ title: "Erro ao excluir tarefa", variant: "destructive" });
    }
  };

  // ── Totais ────────────────────────────────────────────────
  const totalLeads = leads.length;
  const valorTotal = leads.reduce((acc, l) => acc + (l.valor || 0), 0);

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
                        onClick={() => setDetalheLead(lead)}
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

      {/* Dialog: detalhes do lead */}
      <Dialog
        open={!!detalheLead}
        onOpenChange={(open) => !open && setDetalheLead(null)}
      >
        <DialogContent className="sm:max-w-[560px]">
          {detalheLead && (
            <>
              <DialogHeader>
                <div className="flex items-start justify-between pr-6">
                  <div>
                    <DialogTitle className="text-lg">
                      {detalheLead.nome}
                    </DialogTitle>
                    {detalheLead.endereco && (
                      <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1.5">
                        <Building2 className="h-3.5 w-3.5" />
                        {detalheLead.endereco}
                      </p>
                    )}
                  </div>
                </div>
              </DialogHeader>

              <div className="space-y-5 py-2">
                {/* Info do lead */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  {detalheLead.valor > 0 && (
                    <div className="flex items-center gap-2 text-foreground">
                      <DollarSign className="h-4 w-4 text-green-500" />
                      <span className="font-semibold">
                        {formatarValor(detalheLead.valor)}
                      </span>
                    </div>
                  )}
                  {detalheLead.contato && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {detalheLead.contato}
                      </span>
                    </div>
                  )}
                  {detalheLead.telefone && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Phone className="h-4 w-4" />
                      {detalheLead.telefone}
                    </div>
                  )}
                  {detalheLead.email && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" />
                      {detalheLead.email}
                    </div>
                  )}
                  {detalheLead.website && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Globe className="h-4 w-4" />
                      <a
                        href={
                          detalheLead.website.startsWith("http")
                            ? detalheLead.website
                            : `https://${detalheLead.website}`
                        }
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary hover:underline truncate"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {detalheLead.website}
                      </a>
                    </div>
                  )}
                  {detalheLead.rating != null && detalheLead.rating > 0 && (
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Star className="h-4 w-4 text-warning" />
                      <span className="font-medium text-warning">
                        {detalheLead.rating}
                      </span>
                      <span className="text-xs">
                        ({detalheLead.avaliacoes} avaliações)
                      </span>
                    </div>
                  )}
                  {detalheLead.has_whatsapp === true && (
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="outline"
                        className="text-xs bg-green-500/15 text-green-700 border-green-500/30"
                      >
                        WhatsApp
                      </Badge>
                    </div>
                  )}
                </div>

                {detalheLead.notas && (
                  <div className="bg-muted/50 rounded-lg p-3 text-sm text-muted-foreground">
                    {detalheLead.notas}
                  </div>
                )}

                {/* Etapa + status */}
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs text-muted-foreground">Etapa:</span>
                  <Badge variant="outline" className="text-xs">
                    {etapas.find((e) => e.id === detalheLead.etapa_id)?.nome ??
                      "—"}
                  </Badge>
                  <Badge
                    variant="outline"
                    className={cn(
                      "text-xs",
                      detalheLead.status_funil === "em_andamento" &&
                        "bg-blue-500/10 text-blue-600 border-blue-500/20",
                      detalheLead.status_funil === "ganho" &&
                        "bg-green-500/10 text-green-600 border-green-500/20",
                      detalheLead.status_funil === "perdido" &&
                        "bg-red-500/10 text-red-600 border-red-500/20"
                    )}
                  >
                    {detalheLead.status_funil === "em_andamento"
                      ? "Em andamento"
                      : detalheLead.status_funil === "ganho"
                        ? "Ganho"
                        : detalheLead.status_funil === "perdido"
                          ? "Perdido"
                          : detalheLead.status_funil}
                  </Badge>
                  <span className="text-xs text-muted-foreground ml-auto">
                    Captado em {formatarData(detalheLead.data_captacao)}
                  </span>
                </div>

                {/* Tarefas */}
                <div className="space-y-3">
                  <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                    <CalendarClock className="h-4 w-4" />
                    Tarefas
                  </h4>

                  <div className="space-y-1.5">
                    {detalheLead.funil_tarefas
                      .sort(
                        (a, b) =>
                          Number(a.concluida) - Number(b.concluida) ||
                          new Date(a.data_vencimento ?? 0).getTime() -
                            new Date(b.data_vencimento ?? 0).getTime()
                      )
                      .map((tarefa) => (
                        <div
                          key={tarefa.id}
                          className={cn(
                            "flex items-center gap-2 rounded-lg px-3 py-2 text-sm group transition-colors",
                            tarefa.concluida
                              ? "bg-muted/30"
                              : tarefaVencida(tarefa)
                                ? "bg-red-500/10"
                                : tarefaHoje(tarefa)
                                  ? "bg-amber-500/10"
                                  : "bg-muted/50"
                          )}
                        >
                          <button
                            onClick={() => toggleTarefa(tarefa)}
                            className="flex-shrink-0"
                          >
                            {tarefa.concluida ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <Circle className="h-4 w-4 text-muted-foreground hover:text-primary" />
                            )}
                          </button>
                          <span
                            className={cn(
                              "flex-1",
                              tarefa.concluida &&
                                "line-through text-muted-foreground"
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
                              {new Date(
                                tarefa.data_vencimento
                              ).toLocaleDateString("pt-BR", {
                                day: "2-digit",
                                month: "2-digit",
                              })}
                            </span>
                          )}
                          <button
                            onClick={() => removerTarefa(tarefa.id)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="h-3.5 w-3.5 text-muted-foreground hover:text-red-500" />
                          </button>
                        </div>
                      ))}
                  </div>

                  {/* Adicionar tarefa */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Nova tarefa..."
                      value={novaTarefaTexto}
                      onChange={(e) => setNovaTarefaTexto(e.target.value)}
                      onKeyDown={(e) =>
                        e.key === "Enter" && adicionarTarefa()
                      }
                      className="text-sm"
                    />
                    <Input
                      type="datetime-local"
                      value={novaTarefaData}
                      onChange={(e) => setNovaTarefaData(e.target.value)}
                      className="w-[180px] text-xs"
                    />
                    <Button
                      size="sm"
                      onClick={adicionarTarefa}
                      disabled={!novaTarefaTexto.trim()}
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <DialogFooter className="gap-2">
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={() => removerDoFunil(detalheLead.id)}
                >
                  <X className="h-3.5 w-3.5 mr-2" />
                  Remover do Funil
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setDetalheLead(null);
                    abrirEditarLead(detalheLead);
                  }}
                >
                  <Pencil className="h-3.5 w-3.5 mr-2" />
                  Editar
                </Button>
              </DialogFooter>
            </>
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
