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
import { MapPin, Search, Map, ChevronLeft, ChevronRight, UserPlus, Instagram } from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { useLeadsSearch } from "@/hooks/useLeadsSearch";
import { captarLeads, type LeadCaptadoPayload } from "@/lib/supabase-functions";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { InstagramSearch } from "@/components/InstagramSearch";

const tabs = [
  { id: "search" as const, label: "Nova Prospecção", icon: Search },
  { id: "map" as const, label: "Mapa (Área)", icon: Map },
  { id: "instagram" as const, label: "Instagram", icon: Instagram },
];

const SearchPage = () => {
  const [activeTab, setActiveTab] = useState<"search" | "map" | "instagram">("search");
  const [searchParams] = useSearchParams();
  const leadsSearch = useLeadsSearch();
  const { toast } = useToast();
  const { dbUser } = useAuth();
  const [captando, setCaptando] = useState(false);
  const [headerCollapsed, setHeaderCollapsed] = useState(false);

  const q = searchParams.get("q");
  const loc = searchParams.get("loc");
  const searchedRef = useRef<string>("");

  useEffect(() => {
    if (q && loc && `${q}|${loc}` !== searchedRef.current) {
      searchedRef.current = `${q}|${loc}`;
      setHeaderCollapsed(true);
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
    search,
    loadNextPage,
    loadPrevPage,
    toggleSelection,
    selectAll,
    clearSelection,
    clearAllSelections,
    refreshCaptados,
    hasWhatsApp,
  } = leadsSearch;

  const handleSearch = async (term: string, loc: string) => {
    setHeaderCollapsed(true);
    await search(term, loc, 1);
  };

  const handleMapSearch = async (segment: string, location: string, coordinates: string) => {
    setHeaderCollapsed(true);
    await search(segment, location, 1, coordinates);
  };

  const handleCaptar = async () => {
    const toCap = allLeads.filter((l) => selectedIds.has(l.id));
    if (toCap.length === 0) {
      toast({
        title: "Nenhum selecionado",
        description: "Selecione leads para captar.",
        variant: "destructive",
      });
      return;
    }
    if (!dbUser?.id) {
      toast({
        title: "Erro",
        description: "Usuário não autenticado.",
        variant: "destructive",
      });
      return;
    }

    setCaptando(true);
    try {
      const payloads: LeadCaptadoPayload[] = toCap.map((l) => ({
        nome: l.name,
        endereco: l.address,
        telefone: l.phone,
        website: l.website || undefined,
        rating: l.rating,
        avaliacoes: l.reviews,
        has_whatsapp: l.hasWhatsApp,
        whatsapp_status: l.whatsappStatus,
        tags: l.tags,
        origem_busca: leadsSearch.searchSource ?? undefined,
        segmento_busca: searchTerm,
        localizacao_busca: searchLocation,
        latitude: l.lat,
        longitude: l.lng,
        user_id: dbUser.id,
        empresa_id: dbUser.empresa_id,
      }));

      const { count } = await captarLeads(payloads);
      clearAllSelections();
      await refreshCaptados();
      toast({
        title: "Leads captados!",
        description: `${count} leads foram adicionados à sua lista.`,
      });
    } catch (err) {
      toast({
        title: "Erro ao captar",
        description: err instanceof Error ? err.message : "Erro desconhecido.",
        variant: "destructive",
      });
    } finally {
      setCaptando(false);
    }
  };

  const hasResults = filteredLeads.length > 0 || allLeads.length > 0;

  return (
    <AppLayout>
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header + Tabs — colapsa com animação ao iniciar busca */}
        <div
          className={cn(
            "overflow-hidden transition-all duration-500 ease-in-out",
            headerCollapsed
              ? "max-h-0 opacity-0 mt-0 mb-0"
              : "max-h-[300px] opacity-100"
          )}
        >
          <div className="text-center pt-4">
            <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 mb-4 animate-pulse-glow">
              <MapPin className="h-7 w-7 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground">Prospecção de Leads</h1>
            <p className="text-sm text-muted-foreground mt-2 max-w-md mx-auto">
              Busque empresas por segmento e localização, valide WhatsApp e capte seus leads.
            </p>
          </div>

          <div className="flex justify-center mt-6">
            <div className="inline-flex rounded-lg border border-border bg-muted p-1 gap-1">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-all duration-200",
                    activeTab === tab.id && tab.id !== "instagram"
                      ? "bg-card text-foreground shadow-sm"
                      : activeTab === tab.id && tab.id === "instagram"
                      ? "text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  )}
                  style={
                    activeTab === "instagram" && tab.id === "instagram"
                      ? { background: "linear-gradient(135deg, #e4405f, #833ab4)" }
                      : undefined
                  }
                >
                  <tab.icon className="h-4 w-4" />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
          <div className="pb-2" />
        </div>

        {activeTab === "search" && (
          <SearchFormIntegrated
            onSearch={handleSearch}
            loading={loading}
            hasSerper={leadsSearch.hasSerper}
          />
        )}
        {activeTab === "map" && (
          <MapSearch onSearch={handleMapSearch} loading={loading} />
        )}
        {activeTab === "instagram" && (
          <InstagramSearch onSearchStarted={() => setHeaderCollapsed(true)} />
        )}

        {error && activeTab !== "instagram" && (
          <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {hasResults && activeTab !== "instagram" && (
          <div className="space-y-4">
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
                <Button
                  variant="outline"
                  size="sm"
                  onClick={loadNextPage}
                  disabled={!hasMore || loading}
                >
                  Próxima <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
              <div className="flex flex-col items-center">
                <span className="text-sm font-medium">Página {currentPage}</span>
                <span className="text-xs text-muted-foreground">
                  Mostrando {filteredLeads.length} de {allLeads.length}+ resultados
                </span>
              </div>
              <Button
                variant="default"
                size="sm"
                onClick={handleCaptar}
                disabled={selectedIds.size === 0 || captando}
              >
                <UserPlus className="h-3.5 w-3.5 mr-2" />
                {captando ? "Captando..." : `Captar (${selectedIds.size})`}
              </Button>
            </div>

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

        {!hasResults && !loading && activeTab === "search" && (
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
        {activeTab === "map" && !hasResults && !loading && (
          <div className="card-gradient rounded-xl border border-border p-8 text-center">
            <Map className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">
              Selecione uma localização no mapa para buscar empresas na região.
            </p>
          </div>
        )}
      </div>
    </AppLayout>
  );
};

export default SearchPage;
