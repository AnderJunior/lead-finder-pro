import { useState, useCallback } from "react";
import { searchPlaces, type PlaceSearchResult, type SearchParams } from "@/lib/places-search";

export interface SearchResponse {
  leads: PlaceSearchResult[];
  error: string | null;
}

export interface UsePlacesSearchReturn {
  search: (params: SearchParams) => Promise<SearchResponse>;
  loading: boolean;
  error: string | null;
  lastSearch: { term: string; location: string } | null;
  clearError: () => void;
}

export function usePlacesSearch(): UsePlacesSearchReturn {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSearch, setLastSearch] = useState<{ term: string; location: string } | null>(null);

  const search = useCallback(async (params: SearchParams): Promise<SearchResponse> => {
    setLoading(true);
    setError(null);
    setLastSearch({ term: params.term, location: params.location });

    try {
      const result = await searchPlaces(params);
      return { leads: result.leads, error: null };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Erro ao buscar empresas. Tente novamente.";
      setError(message);
      return { leads: [], error: message };
    } finally {
      setLoading(false);
    }
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return { search, loading, error, lastSearch, clearError };
}
