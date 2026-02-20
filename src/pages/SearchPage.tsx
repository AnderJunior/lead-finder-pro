/**
 * Página de prospecção integrada - busca, resultados, mapa, filtros, paginação e export
 * Lógica baseada no sistema_pronto
 */
import { useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { AppLayout } from "@/components/AppLayout";
import { SearchFormIntegrated } from "@/components/SearchFormIntegrated";
import { LeadsTable } from "@/components/LeadsTable";
import { LeadsMap } from "@/components/LeadsMap";
import { MapSearch } from "@/components/MapSearch";
import { MapPin, Search, Map, Download, Filter, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useLeadsSearch } from "@/hooks/useLeadsSearch";
import { exportLeadsToExcel } from "@/lib/excel-export";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const tabs = [
  { id: "search" as const, label: "Nova Prospecção", icon: Search },
  { id: "map" as const, label: "Mapa (Área)", icon: Map },
];

const SearchPage = () => {
  const [activeTab, setActiveTab] = useState<"search" | "map">("search");
  const [searchParams] = useSearchParams();
  const leadsSearch = useLeadsSearch();
  const { toast } = useToast();

  const q = searchParams.get("q");
  const loc = searchParams.get("loc");
  const searchedRef = useRef<string>("");

  useEffect(() => {
    if (q && loc && `${q}|${loc}` !== searchedRef.current) {
      searchedRef.current = `${q}|${loc}`;
      leadsSearch.search(q, loc, 1);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- search is stable, q/loc drive the effect
  }, [q, loc]);

  const {
    filteredLeads,
    allLeads,
    currentPage,
    hasMore,
    loading,
    error,
    searchTerm,
    searchLocation,
    selectedIds,
    filters,
    search,
    loadNextPage,
    loadPrevPage,
    setFilters,
    toggleSelection,
    selectAll,
    clearSelection,
    clearAllSelections,
    hasWhatsApp,
  } = leadsSearch;

  const handleSearch = async (term: string, loc: string) => {
    await search(term, loc, 1);
  };

  const handleExportSelected = () => {
    const toExport = allLeads.filter((l) => selectedIds.has(l.id));
    if (toExport.length === 0) {
      toast({
        title: "Nenhum selecionado",
        description: "Selecione leads para exportar.",
        variant: "destructive",
      });
      return;
    }
    exportLeadsToExcel(toExport, "leads_selecionados");
    toast({
      title: "Exportado",
      description: `${toExport.length} leads exportados.`,
    });
  };

  const handleExportAll = () => {
    if (allLeads.length === 0) {
      toast({
        title: "Nenhum resultado",
        description: "Faça uma busca primeiro.",
        variant: "destructive",
      });
      return;
    }
    exportLeadsToExcel(allLeads, "todos_leads");
    toast({
      title: "Exportado",
      description: `${allLeads.length} leads exportados.`,
    });
  };

  const hasResults = filteredLeads.length > 0 || allLeads.length > 0;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center pt-4">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-4 animate-pulse-glow">
            <MapPin className="h-7 w-7 text-primary" />
          </div>
          <h1 className="text-2xl font-bold text-foreground">Prospecção de Leads</h1>
          <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
            Busque empresas por segmento e localização, valide WhatsApp e exporte.
          </p>
        </div>

        {/* Tabs: Search vs Map Area */}
        <div className="flex justify-center">
          <div className="inline-flex rounded-lg border border-border bg-muted p-1 gap-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all duration-200",
                  activeTab === tab.id
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                <tab.icon className="h-4 w-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {activeTab === "search" ? (
          <>
            <SearchFormIntegrated
              onSearch={handleSearch}
              loading={loading}
              hasSerper={leadsSearch.hasSerper}
            />

            {error && (
              <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                {error}
              </div>
            )}

            {hasResults && (
              <div className="space-y-4">
                {/* Filtros */}
                <div className="flex flex-wrap items-center gap-3 card-gradient rounded-xl border border-border px-4 py-3">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  {hasWhatsApp && (
                    <Select
                      value={filters.whatsapp || "all"}
                      onValueChange={(v) => setFilters({ whatsapp: v === "all" ? "" : v })}
                    >
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="WhatsApp" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Todos</SelectItem>
                        <SelectItem value="true">Apenas com WhatsApp</SelectItem>
                        <SelectItem value="false">Sem WhatsApp</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                  <Select
                    value={filters.rating || "all"}
                    onValueChange={(v) => setFilters({ rating: v === "all" ? "" : v })}
                  >
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Avaliação" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Todas</SelectItem>
                      <SelectItem value="4">4+ estrelas</SelectItem>
                      <SelectItem value="3">3+ estrelas</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFilters({ whatsapp: "", rating: "" })}
                  >
                    Limpar filtros
                  </Button>
                </div>

                {/* Ações de seleção e export */}
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={selectAll}
                    >
                      Selecionar página
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearSelection}
                    >
                      Limpar página
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={clearAllSelections}
                    >
                      Limpar tudo
                    </Button>
                    <span className="text-sm text-muted-foreground ml-2">
                      <strong>{selectedIds.size}</strong> selecionados
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="default"
                      size="sm"
                      onClick={handleExportSelected}
                      disabled={selectedIds.size === 0}
                    >
                      <Download className="h-3.5 w-3.5 mr-2" />
                      Exportar ({selectedIds.size})
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={handleExportAll}
                      disabled={allLeads.length === 0}
                    >
                      Exportar todos ({allLeads.length})
                    </Button>
                  </div>
                </div>

                {/* Paginação */}
                {(hasMore || currentPage > 1) && (
                  <div className="flex items-center justify-between rounded-lg border border-border px-4 py-2">
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={loadPrevPage}
                        disabled={currentPage <= 1}
                      >
                        <ChevronLeft className="h-4 w-4" /> Anterior
                      </Button>
                      <span className="text-sm font-medium">
                        Página {currentPage}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={loadNextPage}
                        disabled={!hasMore || loading}
                      >
                        Próxima <ChevronRight className="h-4 w-4" />
                      </Button>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Mostrando {filteredLeads.length} de {allLeads.length}+ resultados
                    </span>
                  </div>
                )}

                {/* Grid: Tabela + Mapa */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  <div className="lg:col-span-2">
                    <LeadsTable
                      leads={filteredLeads}
                      selectable
                      selectedIds={selectedIds}
                      onToggleSelect={toggleSelection}
                      onSelectAll={selectAll}
                      onClearSelection={clearSelection}
                      showWhatsApp={hasWhatsApp}
                    />
                  </div>
                  <div>
                    <div className="card-gradient rounded-xl border border-border p-4 mb-4">
                      <h3 className="text-sm font-semibold mb-2">Mapa dos Leads</h3>
                      <LeadsMap leads={filteredLeads} className="h-[320px]" />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!hasResults && !loading && (
              <div className="card-gradient rounded-xl border border-border p-8 text-center">
                <Search className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                <p className="text-muted-foreground">
                  Digite um termo e uma localização para buscar empresas.
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  Ex: &quot;Petshop&quot; + &quot;Salvador&quot;
                </p>
              </div>
            )}
          </>
        ) : (
          <MapSearch />
        )}
      </div>
    </AppLayout>
  );
};

export default SearchPage;
