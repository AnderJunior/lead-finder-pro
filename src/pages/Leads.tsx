import { useEffect, useState, useCallback, useMemo } from "react";
import { AppLayout } from "@/components/AppLayout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  fetchLeadsCaptados,
  deleteLeadsCaptados,
  fetchUsuariosEmpresa,
  type LeadCaptado,
  type UsuarioEmpresa,
} from "@/lib/supabase-functions";
import { exportLeadsToExcel } from "@/lib/excel-export";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  Users,
  Trash2,
  Download,
  Upload,
  Search,
  RefreshCw,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Filter,
  X,
  CalendarIcon,
  ChevronsUpDown,
  Check,
} from "lucide-react";
import { ImportLeadsDialog } from "@/components/ImportLeadsDialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";

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

const Leads = () => {
  const [leads, setLeads] = useState<LeadCaptado[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [busca, setBusca] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(25);
  const [filtroWhatsApp, setFiltroWhatsApp] = useState<Set<string>>(new Set());
  const [filtroLocalizacao, setFiltroLocalizacao] = useState<Set<string>>(new Set());
  const [filtroSegmento, setFiltroSegmento] = useState<Set<string>>(new Set());
  const [filtroOrigem, setFiltroOrigem] = useState<Set<string>>(new Set());
  const [filtroUsuario, setFiltroUsuario] = useState<Set<string>>(new Set());
  const [usuarios, setUsuarios] = useState<UsuarioEmpresa[]>([]);
  const [dataInicio, setDataInicio] = useState<Date | undefined>();
  const [dataFim, setDataFim] = useState<Date | undefined>();
  const [importOpen, setImportOpen] = useState(false);
  const { toast } = useToast();
  const { isAdmin } = useAuth();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [data, usrs] = await Promise.all([
        fetchLeadsCaptados(),
        isAdmin ? fetchUsuariosEmpresa() : Promise.resolve([]),
      ]);
      setLeads(data);
      setUsuarios(usrs);
    } catch (err) {
      toast({
        title: "Erro ao carregar leads",
        description: err instanceof Error ? err.message : "Erro desconhecido.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [toast, isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  const localizacoesUnicas = useMemo(
    () => [...new Set(leads.map((l) => l.localizacao_busca).filter(Boolean))] as string[],
    [leads]
  );

  const segmentosUnicos = useMemo(
    () => [...new Set(leads.map((l) => l.segmento_busca).filter(Boolean))] as string[],
    [leads]
  );

  const origensUnicas = useMemo(
    () => [...new Set(leads.map((l) => l.origem_busca).filter(Boolean))] as string[],
    [leads]
  );

  const filtrosAtivos = filtroWhatsApp.size > 0 || filtroLocalizacao.size > 0 || filtroSegmento.size > 0 || filtroOrigem.size > 0 || filtroUsuario.size > 0 || !!dataInicio || !!dataFim;

  const limparFiltros = () => {
    setFiltroWhatsApp(new Set());
    setFiltroLocalizacao(new Set());
    setFiltroSegmento(new Set());
    setFiltroOrigem(new Set());
    setFiltroUsuario(new Set());
    setDataInicio(undefined);
    setDataFim(undefined);
    setCurrentPage(1);
  };

  const filtered = useMemo(() => {
    return leads.filter((l) => {
      if (busca.trim()) {
        const q = busca.toLowerCase();
        const matchBusca =
          l.nome.toLowerCase().includes(q) ||
          (l.telefone ?? "").includes(busca) ||
          (l.segmento_busca ?? "").toLowerCase().includes(q) ||
          (l.localizacao_busca ?? "").toLowerCase().includes(q);
        if (!matchBusca) return false;
      }

      if (filtroWhatsApp.size > 0) {
        const wa = l.has_whatsapp === true ? "sim" : l.has_whatsapp === false ? "nao" : "nv";
        if (!filtroWhatsApp.has(wa)) return false;
      }

      if (filtroLocalizacao.size > 0 && !filtroLocalizacao.has(l.localizacao_busca ?? "")) return false;
      if (filtroSegmento.size > 0 && !filtroSegmento.has(l.segmento_busca ?? "")) return false;
      if (filtroOrigem.size > 0 && !filtroOrigem.has(l.origem_busca ?? "")) return false;
      if (filtroUsuario.size > 0 && !filtroUsuario.has(String(l.user_id))) return false;

      if (dataInicio) {
        const captacao = new Date(l.data_captacao);
        const inicio = new Date(dataInicio);
        inicio.setHours(0, 0, 0, 0);
        if (captacao < inicio) return false;
      }
      if (dataFim) {
        const captacao = new Date(l.data_captacao);
        const fim = new Date(dataFim);
        fim.setHours(23, 59, 59, 999);
        if (captacao > fim) return false;
      }

      return true;
    });
  }, [leads, busca, filtroWhatsApp, filtroLocalizacao, filtroSegmento, filtroOrigem, filtroUsuario, dataInicio, dataFim]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedLeads = filtered.slice(
    (safePage - 1) * itemsPerPage,
    safePage * itemsPerPage
  );

  const toggleSelection = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      paginatedLeads.forEach((l) => next.add(l.id));
      return next;
    });
  };

  const clearSelection = () => {
    setSelectedIds(new Set());
  };

  const handleDelete = async () => {
    if (selectedIds.size === 0) return;
    try {
      await deleteLeadsCaptados(Array.from(selectedIds));
      toast({
        title: "Leads removidos",
        description: `${selectedIds.size} leads foram removidos.`,
      });
      setSelectedIds(new Set());
      load();
    } catch (err) {
      toast({
        title: "Erro ao remover",
        description: err instanceof Error ? err.message : "Erro desconhecido.",
        variant: "destructive",
      });
    }
  };

  const handleExport = () => {
    const toExport = selectedIds.size > 0
      ? filtered.filter((l) => selectedIds.has(l.id))
      : filtered;

    if (toExport.length === 0) {
      toast({
        title: "Nenhum lead",
        description: "Não há leads para exportar.",
        variant: "destructive",
      });
      return;
    }

    const mapped = toExport.map((l) => ({
      id: String(l.id),
      name: l.nome,
      address: l.endereco ?? "",
      phone: l.telefone ?? "",
      website: l.website ?? "",
      rating: l.rating ?? 0,
      reviews: l.avaliacoes ?? 0,
      hasWhatsApp: l.has_whatsapp,
      whatsappStatus: l.whatsapp_status ?? "",
      status: "captado",
    }));

    exportLeadsToExcel(mapped, "meus_leads");
    toast({
      title: "Exportado",
      description: `${mapped.length} leads exportados para Excel.`,
    });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Meus Leads</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {filtered.length !== leads.length
                ? `${filtered.length} de ${leads.length} leads`
                : `${leads.length} lead${leads.length !== 1 ? "s" : ""} captado${leads.length !== 1 ? "s" : ""}`}
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={load} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Atualizar
          </Button>
        </div>

        {/* Busca e ações */}
        <div className="flex flex-wrap items-center gap-3 card-gradient rounded-xl border border-border px-4 py-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, telefone..."
              value={busca}
              onChange={(e) => { setBusca(e.target.value); setCurrentPage(1); }}
              className="pl-9"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={selectAll}>
              Selecionar todos
            </Button>
            <Button variant="outline" size="sm" onClick={clearSelection} disabled={selectedIds.size === 0}>
              Limpar seleção
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setImportOpen(true)}
            >
              <Upload className="h-3.5 w-3.5 mr-2" />
              Importar
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={handleExport}
              disabled={filtered.length === 0}
            >
              <Download className="h-3.5 w-3.5 mr-2" />
              Exportar {selectedIds.size > 0 ? `(${selectedIds.size})` : "todos"}
            </Button>
            <Button
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={selectedIds.size === 0}
            >
              <Trash2 className="h-3.5 w-3.5 mr-2" />
              Excluir ({selectedIds.size})
            </Button>
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
          <div className={cn("grid grid-cols-2 gap-3 px-4 py-3", isAdmin ? "md:grid-cols-[0.5fr_1fr_1fr_0.6fr_1fr_1fr]" : "md:grid-cols-[0.5fr_1fr_1fr_0.6fr_1fr]")}>
            <MultiFilter
              label="WhatsApp"
              placeholder="Todos"
              options={[
                { value: "sim", label: "Sim" },
                { value: "nao", label: "Não" },
                { value: "nv", label: "Não verificado" },
              ]}
              selected={filtroWhatsApp}
              onChange={(s) => { setFiltroWhatsApp(s); setCurrentPage(1); }}
            />

            <MultiFilter
              label="Localização"
              placeholder="Todas"
              searchable
              options={localizacoesUnicas.map((loc) => ({ value: loc, label: loc }))}
              selected={filtroLocalizacao}
              onChange={(s) => { setFiltroLocalizacao(s); setCurrentPage(1); }}
            />

            <MultiFilter
              label="Segmento"
              placeholder="Todos"
              searchable
              options={segmentosUnicos.map((seg) => ({ value: seg, label: seg }))}
              selected={filtroSegmento}
              onChange={(s) => { setFiltroSegmento(s); setCurrentPage(1); }}
            />

            <MultiFilter
              label="Origem"
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
                options={usuarios.map((u) => ({ value: String(u.id), label: u.nome || u.email }))}
                selected={filtroUsuario}
                onChange={(s) => { setFiltroUsuario(s); setCurrentPage(1); }}
              />
            )}

            <div className="space-y-1">
              <label className="text-[11px] font-medium text-muted-foreground">Período de captação</label>
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
            <p className="text-muted-foreground">Carregando leads...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="card-gradient rounded-xl border border-border p-12 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              {leads.length === 0
                ? "Nenhum lead captado ainda. Vá para Nova Busca e capte seus primeiros leads!"
                : "Nenhum lead encontrado para esta busca."}
            </p>
          </div>
        ) : (
          <div className="card-gradient rounded-xl border border-border overflow-hidden animate-fade-in">
            <div className="overflow-x-auto">
              <table className="w-full table-fixed">
                <colgroup>
                  <col className="w-10" />
                  <col className="w-[30%]" />
                  <col className="w-[14%]" />
                  <col className="w-[10%]" />
                  <col className="w-[10%]" />
                  <col className="w-[18%]" />
                  <col className="w-[12%]" />
                </colgroup>
                <thead>
                  <tr className="border-b border-border">
                    <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      <Checkbox
                        checked={paginatedLeads.length > 0 && paginatedLeads.every((l) => selectedIds.has(l.id))}
                        onCheckedChange={(checked) => {
                          if (checked) selectAll();
                          else clearSelection();
                        }}
                      />
                    </th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Empresa</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Telefone</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Avaliação</th>
                    <th className="text-center px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">WhatsApp</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Busca</th>
                    <th className="text-left px-3 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">Captado em</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedLeads.map((lead, i) => {
                    const isSelected = selectedIds.has(lead.id);
                    return (
                      <tr
                        key={lead.id}
                        className={cn(
                          "border-b border-border/50 hover:bg-muted/50 transition-colors cursor-pointer",
                          isSelected && "bg-primary/5"
                        )}
                        style={{ animationDelay: `${i * 30}ms` }}
                        onClick={() => toggleSelection(lead.id)}
                      >
                        <td className="px-3 py-4" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={isSelected}
                            onCheckedChange={() => toggleSelection(lead.id)}
                          />
                        </td>
                        <td className="px-3 py-4 overflow-hidden">
                          <p className="font-medium text-sm text-foreground truncate">{lead.nome}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 truncate">{lead.endereco || "—"}</p>
                          {lead.website && (
                            <a
                              href={lead.website.startsWith("http") ? lead.website : `https://${lead.website}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-primary hover:underline mt-0.5 block truncate"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {lead.website}
                            </a>
                          )}
                        </td>
                        <td className="px-3 py-4 text-sm text-secondary-foreground font-mono">
                          <span>{lead.telefone || "—"}</span>
                        </td>
                        <td className="px-3 py-4">
                          <div className="flex flex-col items-center">
                            <span className="text-sm font-semibold text-warning">★ {lead.rating ?? 0}</span>
                            <span className="text-xs text-muted-foreground">({lead.avaliacoes ?? 0})</span>
                          </div>
                        </td>
                        <td className="px-3 py-4 text-center">
                          <Badge
                            variant="outline"
                            className={cn(
                              "text-xs font-medium",
                              lead.has_whatsapp === true && "bg-green-500/15 text-green-700 border-green-500/30",
                              lead.has_whatsapp === false && "bg-red-500/15 text-red-700 border-red-500/30",
                              lead.has_whatsapp == null && "bg-muted text-muted-foreground"
                            )}
                          >
                            {lead.has_whatsapp === true
                              ? "Sim"
                              : lead.has_whatsapp === false
                                ? "Não"
                                : "N/V"}
                          </Badge>
                        </td>
                        <td className="px-3 py-4 overflow-hidden">
                          {lead.segmento_busca && (
                            <p className="text-xs text-foreground font-medium truncate">{lead.segmento_busca}</p>
                          )}
                          {lead.localizacao_busca && (
                            <p className="text-xs text-muted-foreground truncate">{lead.localizacao_busca}</p>
                          )}
                          {!lead.segmento_busca && !lead.localizacao_busca && (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        <td className="px-3 py-4">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {formatDate(lead.data_captacao)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
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
                    {[5, 10, 25, 50, 70, 100].map((n) => (
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

      <ImportLeadsDialog
        open={importOpen}
        onOpenChange={setImportOpen}
        onSuccess={load}
      />
    </AppLayout>
  );
};

export default Leads;
