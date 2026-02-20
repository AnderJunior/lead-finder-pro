/**
 * Hook unificado para busca de leads com:
 * - Paginação real (Anterior/Próxima)
 * - Validação WhatsApp
 * - Filtros (WhatsApp, Rating)
 * - Seleção para exportação
 * Baseado na lógica do sistema_pronto
 */
import { useState, useCallback } from "react";
import { searchSerperMaps, type SerperPlaceResult } from "@/lib/serper-search";
import {
  validateWhatsAppNumbers,
  hasWhatsAppConfig,
  type WhatsAppValidationMap,
} from "@/lib/whatsapp-validation";
import { searchPlaces, type PlaceSearchResult } from "@/lib/places-search";
import { salvarBuscaRealizada } from "@/lib/supabase-functions";
import { useAuth } from "@/contexts/AuthContext";
import type { Lead } from "@/components/LeadsTable";

export type LeadWithExtras = Lead & {
  hasWhatsApp?: boolean | null;
  whatsappStatus?: "verified" | "no_whatsapp" | "not_checked";
  gps_coordinates?: { latitude: number; longitude: number } | null;
  lat?: number;
  lng?: number;
};

export type SearchSource = "serper" | "places";

export interface UseLeadsSearchState {
  allLeads: LeadWithExtras[];
  filteredLeads: LeadWithExtras[];
  pagesData: Record<number, LeadWithExtras[]>;
  currentPage: number;
  hasMore: boolean;
  loading: boolean;
  error: string | null;
  searchTerm: string;
  searchLocation: string;
  selectedIds: Set<string>;
  filters: { whatsapp: string; rating: string };
  capturedCoordinates: string | null;
  searchSource: SearchSource | null;
}

export interface UseLeadsSearchReturn extends UseLeadsSearchState {
  search: (term: string, location: string, page?: number) => Promise<void>;
  loadNextPage: () => Promise<void>;
  loadPrevPage: () => void;
  setFilters: (f: Partial<{ whatsapp: string; rating: string }>) => void;
  toggleSelection: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  clearAllSelections: () => void;
  reset: () => void;
  hasSerper: boolean;
  hasWhatsApp: boolean;
}

function useSerper(): boolean {
  return Boolean(import.meta.env.VITE_SERPER_API_KEY?.trim());
}

function placeToLeadWithExtras(
  p: PlaceSearchResult,
  whatsappMap: WhatsAppValidationMap
): LeadWithExtras {
  const clean = p.phone?.replace(/\D/g, "") ?? "";
  const wa = clean && whatsappMap[clean];
  return {
    id: p.id,
    name: p.name,
    category: p.category,
    address: p.address,
    phone: p.phone,
    website: p.website,
    rating: p.rating,
    reviews: p.reviews,
    status: "novo",
    tags: [],
    hasWhatsApp: wa?.hasWhatsApp ?? null,
    whatsappStatus: wa?.status ?? "not_checked",
    lat: p.lat,
    lng: p.lng,
    gps_coordinates:
      p.lat != null && p.lng != null
        ? { latitude: p.lat, longitude: p.lng }
        : null,
  };
}

function serperToLeadWithExtras(
  p: SerperPlaceResult,
  whatsappMap: WhatsAppValidationMap
): LeadWithExtras {
  const clean = (p.phone ?? p.telefone ?? "").replace(/\D/g, "");
  const wa = clean && whatsappMap[clean];
  return {
    id: p.id,
    name: p.name,
    category: p.types ?? "Outros",
    address: p.address ?? p.endereco,
    phone: p.phone ?? p.telefone,
    website: p.website ?? undefined,
    rating: p.rating ?? 0,
    reviews: p.reviews ?? 0,
    status: "novo",
    tags: [],
    hasWhatsApp: wa?.hasWhatsApp ?? null,
    whatsappStatus: wa?.status ?? "not_checked",
    gps_coordinates: p.gps_coordinates ?? null,
    lat: p.gps_coordinates?.latitude,
    lng: p.gps_coordinates?.longitude,
  };
}

export function useLeadsSearch(): UseLeadsSearchReturn {
  const { dbUser } = useAuth();

  const [state, setState] = useState<UseLeadsSearchState>({
    allLeads: [],
    filteredLeads: [],
    pagesData: {},
    currentPage: 1,
    hasMore: false,
    loading: false,
    error: null,
    searchTerm: "",
    searchLocation: "",
    selectedIds: new Set(),
    filters: { whatsapp: "", rating: "" },
    capturedCoordinates: null,
    searchSource: null,
  });

  const applyFilters = useCallback(
    (leads: LeadWithExtras[], f: { whatsapp: string; rating: string }) => {
      let out = [...leads];
      if (f.whatsapp === "true")
        out = out.filter((l) => l.hasWhatsApp === true);
      else if (f.whatsapp === "false")
        out = out.filter((l) => l.hasWhatsApp === false || l.hasWhatsApp == null);
      if (f.rating) {
        const min = parseFloat(f.rating);
        out = out.filter((l) => (l.rating ?? 0) >= min);
      }
      return out;
    },
    []
  );

  const search = useCallback(
    async (term: string, location: string, page: number = 1) => {
      const query = `${term.trim()} ${location.trim()}`.trim();
      if (!query) return;

      setState((s) => ({ ...s, loading: true, error: null }));

      try {
        const hasSerperApi = useSerper();
        let leads: LeadWithExtras[];
        let hasMore = false;
        let coords: string | null = null;

        if (hasSerperApi) {
          const { results, coordinates, hasMore: hm } = await searchSerperMaps(
            query,
            page,
            page > 1 ? state.capturedCoordinates ?? undefined : undefined
          );
          const waMap = hasWhatsAppConfig()
            ? await validateWhatsAppNumbers(results)
            : {};
          leads = results.map((r) => serperToLeadWithExtras(r, waMap));
          hasMore = hm;
          if (page === 1) coords = coordinates;
        } else {
          const { leads: placeLeads } = await searchPlaces({
            term: term.trim(),
            location: location.trim(),
            maxResults: 60,
            fetchPhone: true,
          });
          const waMap = hasWhatsAppConfig()
            ? await validateWhatsAppNumbers(placeLeads)
            : {};
          leads = placeLeads.map((p) => placeToLeadWithExtras(p, waMap));
          hasMore = false;
        }

        if (page === 1 && dbUser?.id) {
          salvarBuscaRealizada({
            segmento: term.trim(),
            localizacao: location.trim(),
            tipo_pesquisa: "google",
            user: dbUser.id,
          });
        }

        setState((s) => {
          const all = page === 1 ? leads : [...s.allLeads, ...leads];
          let pages: Record<number, LeadWithExtras[]>;
          let currPage = page;
          let hm = hasMore;
          if (hasSerperApi) {
            pages = { ...s.pagesData, [page]: leads };
          } else {
            const ITEMS_PER_PAGE = 20;
            pages = {};
            for (let i = 0; i < all.length; i += ITEMS_PER_PAGE) {
              pages[Math.floor(i / ITEMS_PER_PAGE) + 1] = all.slice(
                i,
                i + ITEMS_PER_PAGE
              );
            }
            currPage = 1;
            hm = Object.keys(pages).length > 1;
          }
          const currentPageData = pages[currPage] ?? leads;
          const filtered = applyFilters(currentPageData, s.filters);
          return {
            ...s,
            allLeads: all,
            pagesData: pages,
            filteredLeads: filtered,
            currentPage: currPage,
            hasMore: hm,
            loading: false,
            error: null,
            searchTerm: term,
            searchLocation: location,
            capturedCoordinates: coords ?? s.capturedCoordinates,
            searchSource: hasSerperApi ? "serper" : "places",
          };
        });
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Erro ao buscar leads.";
        setState((s) => ({
          ...s,
          loading: false,
          error: msg,
        }));
      }
    },
    [state.capturedCoordinates, applyFilters, dbUser]
  );

  const loadNextPage = useCallback(() => {
    if (!state.hasMore || state.loading) return;
    const nextPage = state.currentPage + 1;
    if (state.searchSource === "serper") {
      search(state.searchTerm, state.searchLocation, nextPage);
    } else {
      setState((s) => {
        const pageData = s.pagesData[nextPage] ?? [];
        const filtered = applyFilters(pageData, s.filters);
        return {
          ...s,
          currentPage: nextPage,
          filteredLeads: filtered,
          hasMore: nextPage < Object.keys(s.pagesData).length,
        };
      });
    }
  }, [state.hasMore, state.loading, state.searchTerm, state.searchLocation, state.currentPage, state.searchSource, search, applyFilters]);

  const loadPrevPage = useCallback(() => {
    if (state.currentPage <= 1) return;
    const prevPage = state.currentPage - 1;
    setState((s) => {
      const pageData = s.pagesData[prevPage] ?? [];
      const filtered = applyFilters(pageData, s.filters);
      return {
        ...s,
        currentPage: prevPage,
        filteredLeads: filtered,
      };
    });
  }, [state.currentPage, applyFilters]);

  const setFilters = useCallback(
    (f: Partial<{ whatsapp: string; rating: string }>) => {
      setState((s) => {
        const next = { ...s.filters, ...f };
        const pageData = s.pagesData[s.currentPage] ?? [];
        const filtered = applyFilters(pageData, next);
        return { ...s, filters: next, filteredLeads: filtered };
      });
    },
    [applyFilters]
  );

  const toggleSelection = useCallback((id: string) => {
    setState((s) => {
      const next = new Set(s.selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...s, selectedIds: next };
    });
  }, []);

  const selectAll = useCallback(() => {
    setState((s) => {
      const next = new Set(s.selectedIds);
      s.filteredLeads.forEach((l) => next.add(l.id));
      return { ...s, selectedIds: next };
    });
  }, []);

  const clearSelection = useCallback(() => {
    setState((s) => {
      const next = new Set<string>();
      s.filteredLeads.forEach((l) => next.delete(l.id));
      return { ...s, selectedIds: new Set() };
    });
  }, []);

  const clearAllSelections = useCallback(() => {
    setState((s) => ({ ...s, selectedIds: new Set() }));
  }, []);

  const reset = useCallback(() => {
    setState({
      allLeads: [],
      filteredLeads: [],
      pagesData: {},
      currentPage: 1,
      hasMore: false,
      loading: false,
      error: null,
      searchTerm: "",
      searchLocation: "",
      selectedIds: new Set(),
      filters: { whatsapp: "", rating: "" },
      capturedCoordinates: null,
      searchSource: null,
    });
  }, []);

  return {
    ...state,
    search,
    loadNextPage,
    loadPrevPage,
    setFilters,
    toggleSelection,
    selectAll,
    clearSelection,
    clearAllSelections,
    reset,
    hasSerper: useSerper(),
    hasWhatsApp: hasWhatsAppConfig(),
  };
}
