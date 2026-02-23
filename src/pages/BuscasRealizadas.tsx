import { useEffect, useState, useCallback, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  fetchBuscasRealizadas,
  type BuscaRealizada,
} from "@/lib/supabase-functions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Search,
  RefreshCw,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  CalendarIcon,
  History,
  MapPin,
} from "lucide-react";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { ChevronsUpDown, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface MultiFilterProps {
  label: string;
  placeholder: string;
  searchable?: boolean;
  options: { value: string; label: string }[];
  selected: Set<string>;
  onChange: (selected: Set<string>) => void;
}

function MultiFilter({ label, placeholder, searchable = false, options, selected, onChange }: MultiFilterProps) {
  const [open, setOpen] = useState(false);

  const toggle = (value: string) => {
    const next = new Set(selected);
    if (next.has(value)) next.delete(value);
    else next.add(value);
    onChange(next);
  };

  const summary = selected.size === 0
    ? placeholder
    : selected.size === 1
      ? options.find((o) => o.value === [...selected][0])?.label ?? ""
      : `${selected.size} selecionados`;

  return (
    <div className="space-y-1">
      <label className="text-[11px] font-medium text-muted-foreground">{label}</label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            role="combobox"
            aria-expanded={open}
            className={cn(
              "h-8 w-full justify-between text-xs font-normal",
              selected.size === 0 && "text-muted-foreground"
            )}
          >
            <span className="truncate">{summary}</span>
            <ChevronsUpDown className="ml-1 h-3 w-3 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[220px] p-0" align="start">
          <Command>
            {searchable && <CommandInput placeholder="Buscar..." className="h-9 text-xs" />}
            <CommandList>
              <CommandEmpty className="py-3 text-xs">Nenhum resultado.</CommandEmpty>
              <CommandGroup>
                {options.map((opt) => (
                  <CommandItem
                    key={opt.value}
                    value={opt.label}
                    onSelect={() => toggle(opt.value)}
                    className="text-xs cursor-pointer"
                  >
                    <div className={cn(
                      "mr-2 flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border border-primary",
                      selected.has(opt.value) ? "bg-primary text-primary-foreground" : "opacity-50"
                    )}>
                      {selected.has(opt.value) && <Check className="h-3 w-3" />}
                    </div>
                    <span className="truncate">{opt.label}</span>
                  </CommandItem>
                ))}
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}

function formatDateTime(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

const BuscasRealizadas = () => {
  const [buscas, setBuscas] = useState<BuscaRealizada[]>([]);
  const [loading, setLoading] = useState(true);
  const [busca, setBusca] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [filtroSegmento, setFiltroSegmento] = useState<Set<string>>(new Set());
  const [filtroLocalizacao, setFiltroLocalizacao] = useState<Set<string>>(new Set());
  const [filtroOrigem, setFiltroOrigem] = useState<Set<string>>(new Set());
  const [filtroUsuario, setFiltroUsuario] = useState<Set<string>>(new Set());
  const [dataInicio, setDataInicio] = useState<Date | undefined>();
  const [dataFim, setDataFim] = useState<Date | undefined>();
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchBuscasRealizadas();
      setBuscas(data);
    } catch (err) {
      toast({
        title: "Erro ao carregar buscas",
        description: err instanceof Error ? err.message : "Erro desconhecido.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  const segmentosUnicos = useMemo(
    () => [...new Set(buscas.map((b) => b.segmento).filter(Boolean))] as string[],
    [buscas]
  );

  const localizacoesUnicas = useMemo(() => {
    const map = new Map<string, string>();
    buscas.forEach((b) => {
      if (!b.localizacao) return;
      const key = b.localizacao.trim().toLowerCase();
      if (!map.has(key)) map.set(key, b.localizacao.trim());
    });
    return [...map.values()].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [buscas]);

  const origensUnicas = useMemo(
    () => [...new Set(buscas.map((b) => b.tipo_pesquisa).filter(Boolean))].sort() as string[],
    [buscas]
  );

  const vendedoresUnicos = useMemo(
    () => {
      const map = new Map<string, string>();
      buscas.forEach((b) => {
        if (b.user) {
          const label = b.user_nome || b.user_email || String(b.user);
          map.set(String(b.user), label);
        }
      });
      return [...map.entries()].map(([id, label]) => ({ value: id, label }));
    },
    [buscas]
  );

  const filtrosAtivos = filtroSegmento.size > 0 || filtroLocalizacao.size > 0 || filtroOrigem.size > 0 || filtroUsuario.size > 0 || !!dataInicio || !!dataFim;

  const limparFiltros = () => {
    setFiltroSegmento(new Set());
    setFiltroLocalizacao(new Set());
    setFiltroOrigem(new Set());
    setFiltroUsuario(new Set());
    setDataInicio(undefined);
    setDataFim(undefined);
    setCurrentPage(1);
  };

  const filtered = useMemo(() => {
    return buscas.filter((b) => {
      if (busca.trim()) {
        const q = busca.toLowerCase();
        const match =
          (b.segmento ?? "").toLowerCase().includes(q) ||
          (b.localizacao ?? "").toLowerCase().includes(q) ||
          (b.tipo_pesquisa ?? "").toLowerCase().includes(q);
        if (!match) return false;
      }

      if (filtroSegmento.size > 0 && !filtroSegmento.has(b.segmento ?? "")) return false;
      if (filtroLocalizacao.size > 0) {
        const loc = (b.localizacao ?? "").trim().toLowerCase();
        const matchLoc = [...filtroLocalizacao].some((f) => f.trim().toLowerCase() === loc);
        if (!matchLoc) return false;
      }
      if (filtroOrigem.size > 0 && !filtroOrigem.has(b.tipo_pesquisa ?? "")) return false;
      if (filtroUsuario.size > 0 && !filtroUsuario.has(String(b.user))) return false;

      if (dataInicio) {
        const criacao = new Date(b.created_at);
        const inicio = new Date(dataInicio);
        inicio.setHours(0, 0, 0, 0);
        if (criacao < inicio) return false;
      }
      if (dataFim) {
        const criacao = new Date(b.created_at);
        const fim = new Date(dataFim);
        fim.setHours(23, 59, 59, 999);
        if (criacao > fim) return false;
      }

      return true;
    });
  }, [buscas, busca, filtroSegmento, filtroLocalizacao, filtroOrigem, filtroUsuario, dataInicio, dataFim]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginated = filtered.slice(
    (safePage - 1) * itemsPerPage,
    safePage * itemsPerPage
  );

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Buscas Realizadas</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {filtered.length !== buscas.length
                ? `${filtered.length} de ${buscas.length} buscas`
                : `${buscas.length} busca${buscas.length !== 1 ? "s" : ""} realizada${buscas.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Atualizar
          </Button>
        </div>

        {/* Busca */}
        <div className="flex flex-wrap items-center gap-3 card-gradient rounded-xl border border-border px-4 py-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por segmento, localização..."
              value={busca}
              onChange={(e) => { setBusca(e.target.value); setCurrentPage(1); }}
              className="pl-9"
            />
          </div>
        </div>

        {/* Filtros */}
        <div className="card-gradient rounded-xl border border-border overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2 border-b border-border/50 bg-muted/30">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              <Filter className="h-3 w-3" />
              Filtros
            </div>
            {filtrosAtivos && (
              <button onClick={limparFiltros} className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors">
                <X className="h-3 w-3" />
                Limpar
              </button>
            )}
          </div>
          <div className={cn("grid grid-cols-2 gap-3 px-4 py-3", isAdmin ? "md:grid-cols-5" : "md:grid-cols-4")}>
            <MultiFilter
              label="Segmento"
              placeholder="Todos"
              searchable
              options={segmentosUnicos.map((s) => ({ value: s, label: s }))}
              selected={filtroSegmento}
              onChange={(s) => { setFiltroSegmento(s); setCurrentPage(1); }}
            />
            <MultiFilter
              label="Localização"
              placeholder="Todas"
              searchable
              options={localizacoesUnicas.map((l) => ({ value: l, label: l }))}
              selected={filtroLocalizacao}
              onChange={(s) => { setFiltroLocalizacao(s); setCurrentPage(1); }}
            />
            <MultiFilter
              label="Origem Busca"
              placeholder="Todas"
              options={origensUnicas.map((o) => ({ value: o, label: o }))}
              selected={filtroOrigem}
              onChange={(s) => { setFiltroOrigem(s); setCurrentPage(1); }}
            />
            {isAdmin && (
              <MultiFilter
                label="Vendedor"
                placeholder="Todos"
                searchable
                options={vendedoresUnicos}
                selected={filtroUsuario}
                onChange={(s) => { setFiltroUsuario(s); setCurrentPage(1); }}
              />
            )}
            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">Período</label>
              <div className="flex items-center gap-1.5">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("h-8 text-xs justify-start font-normal flex-1", !dataInicio && "text-muted-foreground")}>
                      <CalendarIcon className="h-3 w-3 mr-1.5 shrink-0" />
                      {dataInicio ? format(dataInicio, "dd/MM/yy", { locale: ptBR }) : "De"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dataInicio} onSelect={(d) => { setDataInicio(d); setCurrentPage(1); }} locale={ptBR} initialFocus />
                  </PopoverContent>
                </Popover>
                <span className="text-muted-foreground text-xs">–</span>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className={cn("h-8 text-xs justify-start font-normal flex-1", !dataFim && "text-muted-foreground")}>
                      <CalendarIcon className="h-3 w-3 mr-1.5 shrink-0" />
                      {dataFim ? format(dataFim, "dd/MM/yy", { locale: ptBR }) : "Até"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar mode="single" selected={dataFim} onSelect={(d) => { setDataFim(d); setCurrentPage(1); }} locale={ptBR} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>

        {/* Tabela */}
        {loading ? (
          <div className="card-gradient rounded-xl border border-border p-12 flex flex-col items-center justify-center gap-3">
            <Loader2 className="h-8 w-8 text-primary animate-spin" />
            <p className="text-muted-foreground">Carregando buscas...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card-gradient rounded-xl border border-border p-12 text-center">
            <History className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {buscas.length === 0
                ? "Nenhuma busca realizada ainda. Vá para Nova Busca para começar!"
                : "Nenhuma busca encontrada para estes filtros."}
            </p>
          </div>
        ) : (
          <div className="card-gradient rounded-xl border border-border overflow-hidden animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full table-fixed">
                <colgroup>
                  <col className={isAdmin ? "w-[25%]" : "w-[30%]"} />
                  <col className={isAdmin ? "w-[22%]" : "w-[30%]"} />
                  <col className={isAdmin ? "w-[12%]" : "w-[15%]"} />
                  {isAdmin && <col className="w-[22%]" />}
                  <col className={isAdmin ? "w-[19%]" : "w-[25%]"} />
                </colgroup>
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Segmento</th>
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Localização</th>
                    <th className="text-center px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Origem</th>
                    {isAdmin && <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Vendedor</th>}
                    <th className="text-left px-5 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Realizada em</th>
                  </tr>
                </thead>
                <tbody>
                  {paginated.map((b, i) => (
                    <tr
                      key={b.id}
                      className="border-b border-border/50 hover:bg-muted/50 transition-colors"
                      style={{ animationDelay: `${i * 30}ms` }}
                    >
                      <td className="px-5 py-4 overflow-hidden">
                        <div className="flex items-center gap-2 min-w-0">
                          <Search className="h-3.5 w-3.5 text-primary shrink-0" />
                          <span className="text-sm font-medium text-foreground truncate">
                            {b.segmento || "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 overflow-hidden">
                        <div className="flex items-center gap-2 min-w-0">
                          <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                          <span className="text-sm text-secondary-foreground truncate">
                            {b.localizacao || "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <Badge variant="outline" className="text-xs font-medium">
                          {b.tipo_pesquisa || "—"}
                        </Badge>
                      </td>
                      {isAdmin && (
                        <td className="px-5 py-4 overflow-hidden">
                          <span className="text-xs text-muted-foreground truncate block">
                            {b.user_nome || b.user_email || "—"}
                          </span>
                        </td>
                      )}
                      <td className="px-5 py-4">
                        <span className="text-xs text-muted-foreground whitespace-nowrap">
                          {formatDateTime(b.created_at)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Paginação */}
            <div className="flex items-center justify-between border-t border-border px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground">Itens por página:</span>
                <Select
                  value={String(itemsPerPage)}
                  onValueChange={(v) => {
                    setItemsPerPage(Number(v));
                    setCurrentPage(1);
                  }}
                >
                  <SelectTrigger className="w-[70px] h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[5, 10, 25, 50, 100].map((n) => (
                      <SelectItem key={n} value={String(n)}>{n}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <span className="text-xs text-muted-foreground">
                {(safePage - 1) * itemsPerPage + 1}–{Math.min(safePage * itemsPerPage, filtered.length)} de {filtered.length}
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={safePage <= 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
                <span className="text-sm font-medium">
                  {safePage} / {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={safePage >= totalPages}
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default BuscasRealizadas;
