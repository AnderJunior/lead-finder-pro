/**
 * Hook para busca de perfis do Instagram via Serper API
 * Gerencia estado, paginação, seleção e captação de resultados
 */
import { useState, useCallback } from "react";
import {
  searchInstagramProfiles,
  type InstagramProfileResult,
} from "@/lib/serper-instagram";
import { salvarBuscaRealizada, fetchChavesLeadsCaptados } from "@/lib/supabase-functions";
import { useAuth } from "@/contexts/AuthContext";

export type InstagramResultWithCaptado = InstagramProfileResult & {
  jaCaptado?: boolean;
};

export interface UseInstagramSearchState {
  results: InstagramResultWithCaptado[];
  pagesData: Record<number, InstagramResultWithCaptado[]>;
  currentPage: number;
  hasMore: boolean;
  loading: boolean;
  error: string | null;
  searchTerm: string;
  selectedIds: Set<string>;
  totalFound: number;
}

export interface UseInstagramSearchReturn extends UseInstagramSearchState {
  search: (term: string, page?: number) => Promise<void>;
  loadNextPage: () => Promise<void>;
  loadPrevPage: () => void;
  toggleSelection: (id: string) => void;
  selectAll: () => void;
  clearSelection: () => void;
  refreshCaptados: () => Promise<void>;
  reset: () => void;
}

export function useInstagramSearch(): UseInstagramSearchReturn {
  const { dbUser } = useAuth();

  const [state, setState] = useState<UseInstagramSearchState>({
    results: [],
    pagesData: {},
    currentPage: 1,
    hasMore: false,
    loading: false,
    error: null,
    searchTerm: "",
    selectedIds: new Set(),
    totalFound: 0,
  });

  const search = useCallback(
    async (term: string, page: number = 1) => {
      if (!term.trim()) return;

      setState((s) => ({ ...s, loading: true, error: null }));

      try {
        const { results, hasMore } = await searchInstagramProfiles(
          term.trim(),
          page
        );

        if (page === 1 && dbUser?.id) {
          salvarBuscaRealizada({
            segmento: term.trim(),
            localizacao: "Instagram",
            tipo_pesquisa: "instagram",
            user: dbUser.id,
          });
        }

        let markedResults: InstagramResultWithCaptado[] = results;
        try {
          const chaves = await fetchChavesLeadsCaptados();
          const nomeCaptados = new Set(
            chaves.map((c) => c.nome.toLowerCase().trim())
          );
          const websiteCaptados = new Set(
            chaves
              .filter((c) => c.website)
              .map((c) => c.website!.toLowerCase().trim())
          );

          markedResults = results.map((r) => {
            const captadoPorNome = nomeCaptados.has(r.title.toLowerCase().trim());
            const captadoPorLink = websiteCaptados.has(r.link.toLowerCase().trim());
            return { ...r, jaCaptado: captadoPorNome || captadoPorLink };
          });
        } catch {
          // Se falhar a verificação, segue sem marcar
        }

        setState((s) => {
          const pages = { ...s.pagesData, [page]: markedResults };
          const allResults =
            page === 1
              ? markedResults
              : [...s.results, ...markedResults];
          return {
            ...s,
            results: allResults,
            pagesData: pages,
            currentPage: page,
            hasMore,
            loading: false,
            error: null,
            searchTerm: term.trim(),
            totalFound: allResults.length,
          };
        });
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Erro ao buscar perfis.";
        setState((s) => ({ ...s, loading: false, error: msg }));
      }
    },
    [dbUser]
  );

  const loadNextPage = useCallback(async () => {
    if (!state.hasMore || state.loading) return Promise.resolve();
    const nextPage = state.currentPage + 1;

    if (state.pagesData[nextPage]) {
      setState((s) => ({
        ...s,
        currentPage: nextPage,
      }));
      return;
    }

    await search(state.searchTerm, nextPage);
  }, [state.hasMore, state.loading, state.currentPage, state.searchTerm, state.pagesData, search]);

  const loadPrevPage = useCallback(() => {
    if (state.currentPage <= 1) return;
    setState((s) => ({
      ...s,
      currentPage: s.currentPage - 1,
    }));
  }, [state.currentPage]);

  const toggleSelection = useCallback((id: string) => {
    setState((s) => {
      const allResults = Object.values(s.pagesData).flat();
      const result = allResults.find((r) => r.id === id);
      if (result?.jaCaptado) return s;
      const next = new Set(s.selectedIds);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return { ...s, selectedIds: next };
    });
  }, []);

  const selectAll = useCallback(() => {
    setState((s) => {
      const pageData = s.pagesData[s.currentPage] ?? [];
      const next = new Set(s.selectedIds);
      pageData
        .filter((r) => !r.jaCaptado)
        .forEach((r) => next.add(r.id));
      return { ...s, selectedIds: next };
    });
  }, []);

  const clearSelection = useCallback(() => {
    setState((s) => ({ ...s, selectedIds: new Set() }));
  }, []);

  const refreshCaptados = useCallback(async () => {
    try {
      const chaves = await fetchChavesLeadsCaptados();
      const nomeCaptados = new Set(
        chaves.map((c) => c.nome.toLowerCase().trim())
      );
      const websiteCaptados = new Set(
        chaves
          .filter((c) => c.website)
          .map((c) => c.website!.toLowerCase().trim())
      );

      setState((s) => {
        const mark = (r: InstagramResultWithCaptado): InstagramResultWithCaptado => {
          const captadoPorNome = nomeCaptados.has(r.title.toLowerCase().trim());
          const captadoPorLink = websiteCaptados.has(r.link.toLowerCase().trim());
          return { ...r, jaCaptado: captadoPorNome || captadoPorLink };
        };

        const results = s.results.map(mark);
        const pagesData: Record<number, InstagramResultWithCaptado[]> = {};
        for (const [k, v] of Object.entries(s.pagesData)) {
          pagesData[Number(k)] = v.map(mark);
        }

        return { ...s, results, pagesData };
      });
    } catch {
      // Falha silenciosa
    }
  }, []);

  const reset = useCallback(() => {
    setState({
      results: [],
      pagesData: {},
      currentPage: 1,
      hasMore: false,
      loading: false,
      error: null,
      searchTerm: "",
      selectedIds: new Set(),
      totalFound: 0,
    });
  }, []);

  return {
    ...state,
    search,
    loadNextPage,
    loadPrevPage,
    toggleSelection,
    selectAll,
    clearSelection,
    refreshCaptados,
    reset,
  };
}
