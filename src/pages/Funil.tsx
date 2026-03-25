import { useEffect, useState, useCallback, useRef, useMemo, memo } from "react";
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
  DialogDescription,
} from "@/components/ui/dialog";
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
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
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
  Search,
  Settings,
  GripVertical,
  Filter,
  CalendarIcon,
  ChevronsUpDown,
  Check,
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
  criarEtapasPadrao,
  atualizarFunilEtapa,
  criarFunilEtapa,
  deletarFunilEtapa,
  reordenarFunilEtapas,
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
  const [searchQuery, setSearchQuery] = useState(() => sessionStorage.getItem("funil_search") ?? "");
  const [filtroUsuario, setFiltroUsuario] = useState<Set<string>>(() => {
    const s = sessionStorage.getItem("funil_filtroUsuario"); return s ? new Set(JSON.parse(s)) : new Set();
  });
  const [filtroOrigem, setFiltroOrigem] = useState<Set<string>>(() => {
    const s = sessionStorage.getItem("funil_filtroOrigem"); return s ? new Set(JSON.parse(s)) : new Set();
  });
  const [filtroSegmento, setFiltroSegmento] = useState<Set<string>>(() => {
    const s = sessionStorage.getItem("funil_filtroSegmento"); return s ? new Set(JSON.parse(s)) : new Set();
  });
  const [filtroLocalizacao, setFiltroLocalizacao] = useState<Set<string>>(() => {
    const s = sessionStorage.getItem("funil_filtroLocalizacao"); return s ? new Set(JSON.parse(s)) : new Set();
  });
  const [filtroDataDe, setFiltroDataDe] = useState<Date | undefined>(() => {
    const s = sessionStorage.getItem("funil_filtroDataDe"); return s ? new Date(s) : undefined;
  });
  const [filtroDataAte, setFiltroDataAte] = useState<Date | undefined>(() => {
    const s = sessionStorage.getItem("funil_filtroDataAte"); return s ? new Date(s) : undefined;
  });

  // Persiste filtros no sessionStorage
  useEffect(() => {
    sessionStorage.setItem("funil_search", searchQuery);
    sessionStorage.setItem("funil_filtroUsuario", JSON.stringify([...filtroUsuario]));
    sessionStorage.setItem("funil_filtroOrigem", JSON.stringify([...filtroOrigem]));
    sessionStorage.setItem("funil_filtroSegmento", JSON.stringify([...filtroSegmento]));
    sessionStorage.setItem("funil_filtroLocalizacao", JSON.stringify([...filtroLocalizacao]));
    if (filtroDataDe) sessionStorage.setItem("funil_filtroDataDe", filtroDataDe.toISOString());
    else sessionStorage.removeItem("funil_filtroDataDe");
    if (filtroDataAte) sessionStorage.setItem("funil_filtroDataAte", filtroDataAte.toISOString());
    else sessionStorage.removeItem("funil_filtroDataAte");
  }, [searchQuery, filtroUsuario, filtroOrigem, filtroSegmento, filtroLocalizacao, filtroDataDe, filtroDataAte]);

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

  // Dialog: configuração do funil
  const [configDialogOpen, setConfigDialogOpen] = useState(false);
  const [editandoEtapa, setEditandoEtapa] = useState<FunilEtapa | null>(null);
  const [editEtapaNome, setEditEtapaNome] = useState("");
  const [editEtapaCor, setEditEtapaCor] = useState("#6b7280");
  const [novaEtapaNome, setNovaEtapaNome] = useState("");
  const [novaEtapaCor, setNovaEtapaCor] = useState("#6b7280");
  const [loadingConfig, setLoadingConfig] = useState(false);
  const [etapaExcluirConfirm, setEtapaExcluirConfirm] = useState<FunilEtapa | null>(null);
  const [novaColunaExpandida, setNovaColunaExpandida] = useState(false);
  const [configDragFrom, setConfigDragFrom] = useState<number | null>(null);
  const [configDragOver, setConfigDragOver] = useState<number | null>(null);

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
      const eid = dbUser.empresa_id;
      const [etapasData, leadsData] = await Promise.all([
        fetchFunilEtapas(eid),
        fetchLeadsFunil(eid),
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
      if (dbUser) fetchUsuariosEmpresa(dbUser.empresa_id).then(users => setVendedores(users.filter(u => u.role !== "admin"))).catch(() => {});
    }
  }, [isAdmin]);

  const origensUnicas = useMemo(
    () => [...new Set(leads.map((l) => l.origem_busca).filter(Boolean))] as string[],
    [leads]
  );
  const segmentosUnicos = useMemo(
    () => [...new Set(leads.map((l) => l.segmento_busca).filter(Boolean))] as string[],
    [leads]
  );
  const localizacoesUnicas = useMemo(
    () => [...new Set(leads.map((l) => l.localizacao_busca).filter(Boolean))] as string[],
    [leads]
  );

  // Memo: evita recomputar filtros a cada render (752+ leads)
  const leadsFiltrados = useMemo(() => {
    let result = leads;
    if (filtroUsuario.size > 0) {
      result = result.filter((l) => filtroUsuario.has(String(l.user_id)));
    }
    if (filtroOrigem.size > 0) {
      result = result.filter((l) => filtroOrigem.has(l.origem_busca ?? ""));
    }
    if (filtroSegmento.size > 0) {
      result = result.filter((l) => filtroSegmento.has(l.segmento_busca ?? ""));
    }
    if (filtroLocalizacao.size > 0) {
      result = result.filter((l) => filtroLocalizacao.has(l.localizacao_busca ?? ""));
    }
    if (filtroDataDe) {
      const inicio = new Date(filtroDataDe);
      inicio.setHours(0, 0, 0, 0);
      result = result.filter((l) => new Date(l.data_captacao) >= inicio);
    }
    if (filtroDataAte) {
      const fim = new Date(filtroDataAte);
      fim.setHours(23, 59, 59, 999);
      result = result.filter((l) => new Date(l.data_captacao) <= fim);
    }
    if (!searchQuery.trim()) return result;
    const q = searchQuery.trim().toLowerCase();
    const telQuery = q.replace(/\D/g, "");
    return result.filter((l) => {
      const nome = (l.nome ?? "").toLowerCase();
      const tel = (l.telefone ?? "").replace(/\D/g, "");
      return nome.includes(q) || (telQuery && tel.includes(telQuery));
    });
  }, [leads, filtroUsuario, filtroOrigem, filtroSegmento, filtroLocalizacao, filtroDataDe, filtroDataAte, searchQuery]);

  // Memo: map etapaId -> leads ordenados (evita filter+sort repetido por coluna)
  const cardsByEtapa = useMemo(() => {
    const map = new Map<number, LeadCaptadoComTarefas[]>();
    for (const l of leadsFiltrados) {
      const eid = l.etapa_id;
      if (eid == null) continue;
      const arr = map.get(eid) ?? [];
      arr.push(l);
      map.set(eid, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.ordem_funil - b.ordem_funil);
    }
    return map;
  }, [leadsFiltrados]);

  // Sincronizar scrollbar customizada (throttled via rAF)
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    let rafScheduled = false;
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

    const throttledUpdate = () => {
      if (rafScheduled) return;
      rafScheduled = true;
      requestAnimationFrame(() => {
        rafScheduled = false;
        updateThumb();
      });
    };

    updateThumb();
    container.addEventListener("scroll", throttledUpdate, { passive: true });
    const ro = new ResizeObserver(throttledUpdate);
    ro.observe(container);

    return () => {
      container.removeEventListener("scroll", throttledUpdate);
      ro.disconnect();
    };
  }, [etapas.length, leadsFiltrados.length]);

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

  const leadsPorEtapa = useCallback((etapaId: number) =>
    cardsByEtapa.get(etapaId) ?? [], [cardsByEtapa]);

  const totalEtapa = useCallback((etapaId: number) =>
    (cardsByEtapa.get(etapaId) ?? []).reduce((acc, l) => acc + (l.valor || 0), 0),
  [cardsByEtapa]);

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

    let loopActive = false;
    const loop = () => {
      doScroll();
      if (loopActive) rafId = requestAnimationFrame(loop);
    };

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
        if (!loopActive) {
          loopActive = true;
          rafId = requestAnimationFrame(loop);
        }

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
      // Só atualiza state quando muda (evita re-renders desnecessários no drag)
      setDragOverEtapa((prev) => (prev === etapaId ? prev : etapaId));
    };

    const cleanup = () => {
      const ds = dragState.current;
      loopActive = false;
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

  const abrirEditarLead = useCallback((lead: LeadCaptadoComTarefas) => {
    setEditandoLead(lead);
    setForm({
      valor: lead.valor ? String(lead.valor) : "",
      contato: lead.contato ?? "",
      notas: lead.notas ?? "",
      status_funil: lead.status_funil ?? "em_andamento",
    });
    setEditDialogOpen(true);
  }, []);

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

  const removerDoFunil = useCallback(async (leadId: number) => {
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
  }, [toast]);

  // ── Automações ────────────────────────────────────────────

  const abrirAutoDialog = async () => {
    setAutoDialogOpen(true);
    setAutoEtapaSelecionada(null);
    setLoadingAuto(true);
    try {
      const data = await fetchFunilAutomacoes(dbUser!.empresa_id);
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

  // Handlers estáveis para os cards (evita re-render em cascata)
  const handleCardNavigate = useCallback((leadId: number) => navigate(`/lead/${leadId}`), [navigate]);
  const handleCardRemove = useCallback((leadId: number) => removerDoFunil(leadId), [removerDoFunil]);

  // ── Totais (memo para evitar recálculo) ────────────────────
  const { totalLeads, valorTotal } = useMemo(() => ({
    totalLeads: leadsFiltrados.length,
    valorTotal: leadsFiltrados.reduce((acc, l) => acc + (l.valor || 0), 0),
  }), [leadsFiltrados]);

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
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Pesquisar por nome ou telefone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 w-[240px] bg-white text-sm"
              />
            </div>
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
            {isAdmin && (vendedores.length > 0 || etapas.length > 0) && (
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <button
                      className={cn(
                        "relative p-2 rounded-lg hover:bg-muted transition-colors",
                        (filtroUsuario.size > 0 ||
                          filtroOrigem.size > 0 ||
                          filtroSegmento.size > 0 ||
                          filtroLocalizacao.size > 0 ||
                          filtroDataDe ||
                          filtroDataAte) && "text-primary"
                      )}
                      title="Filtros"
                    >
                      <Filter className="h-4 w-4" />
                      {(filtroUsuario.size > 0 ||
                        filtroOrigem.size > 0 ||
                        filtroSegmento.size > 0 ||
                        filtroLocalizacao.size > 0 ||
                        filtroDataDe ||
                        filtroDataAte) && (
                        <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-primary" />
                      )}
                    </button>
                  </PopoverTrigger>
                  <PopoverContent
                    className="w-[320px] p-0"
                    align="end"
                    side="bottom"
                    sideOffset={6}
                  >
                    <div className="px-4 py-3 border-b border-border">
                      <h3 className="font-semibold text-sm">Filtros</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Selecione os filtros para refinar os leads do funil
                      </p>
                    </div>
                    <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-muted-foreground">
                          Usuário responsável
                        </label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className={cn(
                                "h-8 w-full justify-between text-xs font-normal",
                                filtroUsuario.size === 0 && "text-muted-foreground"
                              )}
                            >
                              <span className="truncate">
                                {filtroUsuario.size === 0
                                  ? "Todos"
                                  : filtroUsuario.size === 1
                                    ? vendedores.find((v) => String(v.id) === [...filtroUsuario][0])?.nome || [...filtroUsuario][0]
                                    : `${filtroUsuario.size} selecionados`}
                              </span>
                              <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[260px] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Buscar..." className="h-9 text-xs" />
                              <CommandList>
                                <CommandEmpty className="py-3 text-xs">Nenhum resultado.</CommandEmpty>
                                <CommandGroup>
                                  <CommandItem
                                    onSelect={() => setFiltroUsuario(new Set())}
                                    className="text-xs cursor-pointer"
                                  >
                                    <div className={cn(
                                      "mr-2 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-primary",
                                      filtroUsuario.size === 0 ? "bg-primary text-primary-foreground" : "opacity-50"
                                    )}>
                                      {filtroUsuario.size === 0 && <Check className="h-3 w-3" />}
                                    </div>
                                    Todos
                                  </CommandItem>
                                  {vendedores.map((v) => {
                                    const val = String(v.id);
                                    const sel = filtroUsuario.has(val);
                                    return (
                                      <CommandItem
                                        key={v.id}
                                        value={v.nome || v.email}
                                        onSelect={() => {
                                          const next = new Set(filtroUsuario);
                                          if (next.has(val)) next.delete(val);
                                          else next.add(val);
                                          setFiltroUsuario(next);
                                        }}
                                        className="text-xs cursor-pointer"
                                      >
                                        <div className={cn(
                                          "mr-2 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-primary",
                                          sel ? "bg-primary text-primary-foreground" : "opacity-50"
                                        )}>
                                          {sel && <Check className="h-3 w-3" />}
                                        </div>
                                        <span className="truncate">{v.nome || v.email}</span>
                                      </CommandItem>
                                    );
                                  })}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-muted-foreground">Origem</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className={cn(
                                "h-8 w-full justify-between text-xs font-normal",
                                filtroOrigem.size === 0 && "text-muted-foreground"
                              )}
                            >
                              <span className="truncate">
                                {filtroOrigem.size === 0
                                  ? "Todas"
                                  : filtroOrigem.size === 1
                                    ? [...filtroOrigem][0] || "—"
                                    : `${filtroOrigem.size} selecionadas`}
                              </span>
                              <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[260px] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Buscar..." className="h-9 text-xs" />
                              <CommandList>
                                <CommandEmpty className="py-3 text-xs">Nenhum resultado.</CommandEmpty>
                                <CommandGroup>
                                  {origensUnicas.map((o) => {
                                    const sel = filtroOrigem.has(o);
                                    return (
                                      <CommandItem
                                        key={o}
                                        value={o}
                                        onSelect={() => {
                                          const next = new Set(filtroOrigem);
                                          if (next.has(o)) next.delete(o);
                                          else next.add(o);
                                          setFiltroOrigem(next);
                                        }}
                                        className="text-xs cursor-pointer"
                                      >
                                        <div className={cn(
                                          "mr-2 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-primary",
                                          sel ? "bg-primary text-primary-foreground" : "opacity-50"
                                        )}>
                                          {sel && <Check className="h-3 w-3" />}
                                        </div>
                                        <span className="truncate">{o}</span>
                                      </CommandItem>
                                    );
                                  })}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-muted-foreground">Segmento</label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className={cn(
                                "h-8 w-full justify-between text-xs font-normal",
                                filtroSegmento.size === 0 && "text-muted-foreground"
                              )}
                            >
                              <span className="truncate">
                                {filtroSegmento.size === 0
                                  ? "Todos"
                                  : filtroSegmento.size === 1
                                    ? [...filtroSegmento][0] || "—"
                                    : `${filtroSegmento.size} selecionados`}
                              </span>
                              <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[260px] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Buscar..." className="h-9 text-xs" />
                              <CommandList>
                                <CommandEmpty className="py-3 text-xs">Nenhum resultado.</CommandEmpty>
                                <CommandGroup>
                                  {segmentosUnicos.map((s) => {
                                    const sel = filtroSegmento.has(s);
                                    return (
                                      <CommandItem
                                        key={s}
                                        value={s}
                                        onSelect={() => {
                                          const next = new Set(filtroSegmento);
                                          if (next.has(s)) next.delete(s);
                                          else next.add(s);
                                          setFiltroSegmento(next);
                                        }}
                                        className="text-xs cursor-pointer"
                                      >
                                        <div className={cn(
                                          "mr-2 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-primary",
                                          sel ? "bg-primary text-primary-foreground" : "opacity-50"
                                        )}>
                                          {sel && <Check className="h-3 w-3" />}
                                        </div>
                                        <span className="truncate">{s}</span>
                                      </CommandItem>
                                    );
                                  })}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-muted-foreground">
                          Range de Data de Captação
                        </label>
                        <div className="flex items-center gap-1.5">
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className={cn(
                                  "h-8 flex-1 justify-start text-xs font-normal",
                                  !filtroDataDe && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="h-3 w-3 mr-1.5 shrink-0" />
                                {filtroDataDe
                                  ? format(filtroDataDe, "dd/MM/yy", { locale: ptBR })
                                  : "De"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="start">
                              <Calendar
                                mode="single"
                                selected={filtroDataDe}
                                onSelect={setFiltroDataDe}
                                locale={ptBR}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                          <span className="text-muted-foreground text-xs shrink-0">–</span>
                          <Popover>
                            <PopoverTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className={cn(
                                  "h-8 flex-1 justify-start text-xs font-normal",
                                  !filtroDataAte && "text-muted-foreground"
                                )}
                              >
                                <CalendarIcon className="h-3 w-3 mr-1.5 shrink-0" />
                                {filtroDataAte
                                  ? format(filtroDataAte, "dd/MM/yy", { locale: ptBR })
                                  : "Até"}
                              </Button>
                            </PopoverTrigger>
                            <PopoverContent className="w-auto p-0" align="end">
                              <Calendar
                                mode="single"
                                selected={filtroDataAte}
                                onSelect={setFiltroDataAte}
                                locale={ptBR}
                                initialFocus
                              />
                            </PopoverContent>
                          </Popover>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[11px] font-medium text-muted-foreground">
                          Localização
                        </label>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              size="sm"
                              className={cn(
                                "h-8 w-full justify-between text-xs font-normal",
                                filtroLocalizacao.size === 0 && "text-muted-foreground"
                              )}
                            >
                              <span className="truncate">
                                {filtroLocalizacao.size === 0
                                  ? "Todas"
                                  : filtroLocalizacao.size === 1
                                    ? [...filtroLocalizacao][0] || "—"
                                    : `${filtroLocalizacao.size} selecionadas`}
                              </span>
                              <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[260px] p-0" align="start">
                            <Command>
                              <CommandInput placeholder="Buscar..." className="h-9 text-xs" />
                              <CommandList>
                                <CommandEmpty className="py-3 text-xs">Nenhum resultado.</CommandEmpty>
                                <CommandGroup>
                                  {localizacoesUnicas.map((l) => {
                                    const sel = filtroLocalizacao.has(l);
                                    return (
                                      <CommandItem
                                        key={l}
                                        value={l}
                                        onSelect={() => {
                                          const next = new Set(filtroLocalizacao);
                                          if (next.has(l)) next.delete(l);
                                          else next.add(l);
                                          setFiltroLocalizacao(next);
                                        }}
                                        className="text-xs cursor-pointer"
                                      >
                                        <div className={cn(
                                          "mr-2 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-primary",
                                          sel ? "bg-primary text-primary-foreground" : "opacity-50"
                                        )}>
                                          {sel && <Check className="h-3 w-3" />}
                                        </div>
                                        <span className="truncate">{l}</span>
                                      </CommandItem>
                                    );
                                  })}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      </div>
                      {(filtroUsuario.size > 0 ||
                        filtroOrigem.size > 0 ||
                        filtroSegmento.size > 0 ||
                        filtroLocalizacao.size > 0 ||
                        filtroDataDe ||
                        filtroDataAte) && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="w-full h-8 text-xs"
                          onClick={() => {
                            setFiltroUsuario(new Set());
                            setFiltroOrigem(new Set());
                            setFiltroSegmento(new Set());
                            setFiltroLocalizacao(new Set());
                            setFiltroDataDe(undefined);
                            setFiltroDataAte(undefined);
                          }}
                        >
                          <X className="h-3 w-3 mr-1" />
                          Limpar filtros
                        </Button>
                      )}
                    </div>
                  </PopoverContent>
                </Popover>
                <button
                  onClick={() => setConfigDialogOpen(true)}
                  className="p-2 rounded-lg hover:bg-muted transition-colors"
                  title="Configurar funil"
                >
                  <Settings className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={carregarDados}
              disabled={loading}
              className="bg-white"
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
        ) : etapas.length === 0 ? (
          <div className="card-gradient rounded-xl border border-border p-16 flex flex-col items-center justify-center gap-4">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center">
              <KanbanSquare className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center space-y-1.5">
              <h2 className="text-lg font-semibold text-foreground">Funil não configurado</h2>
              <p className="text-sm text-muted-foreground max-w-md">
                Configure as etapas do funil comercial para organizar seus leads em um pipeline visual.
                Serão criadas 6 etapas padrão que você pode personalizar depois.
              </p>
            </div>
            <Button
              onClick={async () => {
                if (!dbUser) return;
                try {
                  const novasEtapas = await criarEtapasPadrao(dbUser.id, dbUser.empresa_id);
                  setEtapas(novasEtapas);
                  toast({ title: "Funil configurado com sucesso!" });
                } catch (err) {
                  toast({
                    title: "Erro ao configurar funil",
                    description: err instanceof Error ? err.message : "Erro desconhecido.",
                    variant: "destructive",
                  });
                }
              }}
              className="mt-2"
              size="lg"
            >
              <KanbanSquare className="h-4 w-4 mr-2" />
              Configurar Funil
            </Button>
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
                        onNavigate={handleCardNavigate}
                        onEdit={abrirEditarLead}
                        onRemove={handleCardRemove}
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

      {/* Dialog: configuração do funil - Todas as Colunas */}
      <Dialog
        open={configDialogOpen}
        onOpenChange={(open) => {
          setConfigDialogOpen(open);
          if (!open) {
            setEditandoEtapa(null);
            setNovaEtapaNome("");
            setNovaEtapaCor("#6b7280");
            setNovaColunaExpandida(false);
            setConfigDragFrom(null);
            setConfigDragOver(null);
          }
        }}
      >
        <DialogContent className="sm:max-w-[480px] max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold">Todas as Colunas</DialogTitle>
            <DialogDescription>
              Arraste as colunas para reordená-las
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            {etapas.map((e, idx) => (
              <div
                key={e.id}
                onDragOver={(ev) => {
                  ev.preventDefault();
                  ev.dataTransfer.dropEffect = "move";
                  setConfigDragOver(idx);
                }}
                onDragLeave={() => setConfigDragOver(null)}
                onDrop={async (ev) => {
                  ev.preventDefault();
                  setConfigDragFrom(null);
                  setConfigDragOver(null);
                  const fromStr = ev.dataTransfer.getData("text/plain");
                  const from = fromStr === "" ? configDragFrom : parseInt(fromStr, 10);
                  const to = idx;
                  if (Number.isNaN(from) || from === to) return;
                  const reordered = [...etapas];
                  const [item] = reordered.splice(from, 1);
                  reordered.splice(to, 0, item);
                  const updates = reordered.map((x, i) => ({ id: x.id, ordem: i }));
                  setLoadingConfig(true);
                  try {
                    await reordenarFunilEtapas(updates);
                    setEtapas(reordered.map((x, i) => ({ ...x, ordem: i })));
                    toast({ title: "Ordem atualizada" });
                  } catch (err) {
                    toast({
                      title: "Erro ao reordenar",
                      description: err instanceof Error ? err.message : "Erro",
                      variant: "destructive",
                    });
                  } finally {
                    setLoadingConfig(false);
                  }
                }}
                className={cn(
                  "flex items-center gap-3 py-2.5 px-3 rounded-lg border bg-white transition-colors",
                  configDragFrom === idx && "opacity-50",
                  configDragOver === idx && configDragFrom !== idx && "ring-2 ring-primary/30"
                )}
              >
                <div
                  draggable
                  onDragStart={(ev) => {
                    ev.dataTransfer.setData("text/plain", String(idx));
                    ev.dataTransfer.effectAllowed = "move";
                    setConfigDragFrom(idx);
                  }}
                  onDragEnd={() => {
                    setConfigDragFrom(null);
                    setConfigDragOver(null);
                  }}
                  className="cursor-grab active:cursor-grabbing touch-none shrink-0"
                >
                  <GripVertical className="h-4 w-4 text-muted-foreground" />
                </div>
                {editandoEtapa?.id === e.id ? (
                  <>
                    <div
                      className="w-5 h-5 rounded shrink-0 border border-border"
                      style={{ backgroundColor: editEtapaCor }}
                    />
                    <Input
                      value={editEtapaNome}
                      onChange={(ev) => setEditEtapaNome(ev.target.value)}
                      placeholder="Nome"
                      className="h-8 text-sm flex-1 min-w-[120px] border-primary/30 focus-visible:ring-primary"
                    />
                    <Button
                      size="sm"
                      onClick={async () => {
                        if (!editEtapaNome.trim()) return;
                        setLoadingConfig(true);
                        try {
                          const atualizada = await atualizarFunilEtapa(e.id, {
                            nome: editEtapaNome.trim(),
                            cor: editEtapaCor,
                          });
                          setEtapas((prev) =>
                            prev.map((x) => (x.id === e.id ? atualizada : x))
                          );
                          setEditandoEtapa(null);
                          toast({ title: "Etapa atualizada" });
                        } catch (err) {
                          toast({
                            title: "Erro ao atualizar",
                            description: err instanceof Error ? err.message : "Erro",
                            variant: "destructive",
                          });
                        } finally {
                          setLoadingConfig(false);
                        }
                      }}
                      disabled={loadingConfig}
                    >
                      Salvar
                    </Button>
                    <button
                      type="button"
                      data-no-drag
                      onClick={() => setEditandoEtapa(null)}
                      className="p-1 rounded hover:bg-muted text-muted-foreground"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </>
                ) : (
                  <>
                    <div
                      className="w-5 h-5 rounded-full shrink-0"
                      style={{ backgroundColor: e.cor || "#6b7280" }}
                    />
                    <span className="flex-1 text-sm font-medium text-foreground">{e.nome}</span>
                    <button
                      type="button"
                      data-no-drag
                      onClick={() => {
                        setEditandoEtapa(e);
                        setEditEtapaNome(e.nome);
                        setEditEtapaCor(e.cor || "#6b7280");
                      }}
                      className="p-1.5 rounded hover:bg-muted text-muted-foreground"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    {e.ordem !== 0 && (
                      <button
                        type="button"
                        data-no-drag
                        onClick={() => setEtapaExcluirConfirm(e)}
                        className="p-1.5 rounded hover:bg-muted text-destructive hover:text-destructive"
                        title="Excluir etapa (leads irão para etapa ordem 0)"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </>
                )}
              </div>
            ))}
            {novaColunaExpandida ? (
              <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg border-2 border-dashed border-primary/40 bg-white">
                <Input
                  type="color"
                  value={novaEtapaCor}
                  onChange={(ev) => setNovaEtapaCor(ev.target.value)}
                  className="w-8 h-8 p-1 cursor-pointer shrink-0"
                  title="Cor"
                />
                <Input
                  value={novaEtapaNome}
                  onChange={(ev) => setNovaEtapaNome(ev.target.value)}
                  placeholder="Nome da coluna"
                  className="h-8 text-sm flex-1 min-w-[140px]"
                />
                <Button
                  size="sm"
                  onClick={async () => {
                    if (!novaEtapaNome.trim() || !dbUser) return;
                    const maxOrdem = Math.max(-1, ...etapas.map((x) => x.ordem));
                    setLoadingConfig(true);
                    try {
                      const nova = await criarFunilEtapa({
                        nome: novaEtapaNome.trim(),
                        ordem: maxOrdem + 1,
                        cor: novaEtapaCor,
                        user_id: dbUser.id,
                        empresa_id: dbUser.empresa_id,
                      });
                      setEtapas((prev) => [...prev, nova].sort((a, b) => a.ordem - b.ordem));
                      setNovaEtapaNome("");
                      setNovaEtapaCor("#6b7280");
                      setNovaColunaExpandida(false);
                      toast({ title: "Coluna criada" });
                    } catch (err) {
                      toast({
                        title: "Erro ao criar coluna",
                        description: err instanceof Error ? err.message : "Erro",
                        variant: "destructive",
                      });
                    } finally {
                      setLoadingConfig(false);
                    }
                  }}
                  disabled={loadingConfig || !novaEtapaNome.trim()}
                >
                  Salvar
                </Button>
                <button
                  type="button"
                  onClick={() => {
                    setNovaColunaExpandida(false);
                    setNovaEtapaNome("");
                    setNovaEtapaCor("#6b7280");
                  }}
                  className="p-1 rounded hover:bg-muted text-muted-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setNovaColunaExpandida(true)}
                className="flex items-center gap-2 w-full py-2.5 text-primary hover:text-primary/80 font-medium text-sm transition-colors"
              >
                <Plus className="h-4 w-4" />
                Nova Coluna
              </button>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* AlertDialog: confirmar exclusão de etapa */}
      <AlertDialog
        open={!!etapaExcluirConfirm}
        onOpenChange={(open) => !open && setEtapaExcluirConfirm(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir etapa</AlertDialogTitle>
            <AlertDialogDescription>
              Todos os leads que estão na etapa &quot;{etapaExcluirConfirm?.nome}&quot; serão
              movidos para a etapa de ordem 0 (Novo Lead). Deseja continuar?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={async () => {
                const etapa = etapaExcluirConfirm;
                if (!etapa) return;
                setEtapaExcluirConfirm(null);
                setLoadingConfig(true);
                try {
                  await deletarFunilEtapa(etapa.id, dbUser!.empresa_id);
                  setEtapas((prev) => prev.filter((x) => x.id !== etapa.id));
                  setConfigDialogOpen(false);
                  toast({ title: "Etapa excluída" });
                  carregarDados();
                } catch (err) {
                  toast({
                    title: "Erro ao excluir etapa",
                    description: err instanceof Error ? err.message : "Erro",
                    variant: "destructive",
                  });
                } finally {
                  setLoadingConfig(false);
                }
              }}
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
};

// ── Componente do Card Kanban ────────────────────────────────

interface KanbanCardProps {
  lead: LeadCaptadoComTarefas;
  isDragged: boolean;
  onPointerDown: (e: React.PointerEvent, id: number) => void;
  onNavigate: (leadId: number) => void;
  onEdit: (lead: LeadCaptadoComTarefas) => void;
  onRemove: (leadId: number) => void;
}

const KanbanCard = memo(function KanbanCard({
  lead,
  isDragged,
  onPointerDown,
  onNavigate,
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
        onNavigate(lead.id);
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
                  onEdit(lead);
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
                  onRemove(lead.id);
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
                  {(() => {
                    const d = new Date(proximaTarefa.data_vencimento);
                    const h = d.getHours();
                    const m = d.getMinutes();
                    const soPadrao = (h === 12 && m === 0) || (h === 0 && m === 0);
                    return soPadrao
                      ? d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
                      : d.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
                  })()}
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
});

export default Funil;
