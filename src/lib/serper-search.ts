/**
 * Serviço de busca de empresas via Serper Maps API
 * Suporta paginação real (carregar página a página)
 */

const SERPER_BASE = "https://google.serper.dev";
const CORS_PROXIES = [
  "https://api.codetabs.com/v1/proxy?quest=",
  "https://corsproxy.io/?",
];

export interface SerperPlaceResult {
  id: string;
  name: string;
  title: string;
  address: string;
  endereco: string;
  phone: string;
  telefone: string;
  rating: number;
  reviews: number;
  website: string | null;
  types: string;
  place_id: string | null;
  gps_coordinates: { latitude: number; longitude: number } | null;
  pageNum: number;
}

export interface SerperMapsResponse {
  results: SerperPlaceResult[];
  coordinates: string | null;
  hasMore: boolean;
}

function getApiKey(): string {
  const key = import.meta.env.VITE_SERPER_API_KEY;
  if (!key) throw new Error("Configure VITE_SERPER_API_KEY no .env");
  return key;
}

async function fetchWithCors(
  url: string,
  options: RequestInit
): Promise<Response> {
  try {
    const res = await fetch(url, options);
    if (res.ok) return res;
  } catch {
    // fallback proxy
  }
  const proxy = CORS_PROXIES[0];
  return fetch(`${proxy}${encodeURIComponent(url)}`, {
    ...options,
    headers: { ...options.headers, "X-API-KEY": getApiKey() },
  });
}

export async function searchSerperMaps(
  query: string,
  page: number = 1,
  coordinates?: string
): Promise<SerperMapsResponse> {
  const apiKey = getApiKey();
  const body: Record<string, unknown> = {
    q: query.trim(),
    hl: "pt-br",
    page,
  };
  if (page > 1 && coordinates) {
    body.ll = coordinates;
  }

  const url = `${SERPER_BASE}/maps`;
  const res = await fetchWithCors(url, {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Serper API: ${res.status} - ${text}`);
  }

  const data = (await res.json()) as {
    places?: Array<{
      placeId?: string;
      title?: string;
      address?: string;
      phoneNumber?: string;
      rating?: number;
      ratingCount?: number;
      website?: string;
      category?: string;
      latitude?: number;
      longitude?: number;
    }>;
    searchParameters?: { ll?: string };
    searchMetadata?: { ll?: string };
  };

  const places = data.places ?? [];
  let capturedCoords: string | null = null;

  if (page === 1) {
    if (data.searchParameters?.ll) capturedCoords = data.searchParameters.ll;
    else if (data.searchMetadata?.ll) capturedCoords = data.searchMetadata.ll;
    else if (places.length > 0) {
      const withCoords = places.filter((p) => p.latitude && p.longitude);
      if (withCoords.length > 0) {
        const sample = withCoords.slice(0, 5);
        const avgLat =
          sample.reduce((s, p) => s + (p.latitude ?? 0), 0) / sample.length;
        const avgLng =
          sample.reduce((s, p) => s + (p.longitude ?? 0), 0) / sample.length;
        capturedCoords = `@${avgLat.toFixed(6)},${avgLng.toFixed(6)},12z`;
      }
    }
    if (!capturedCoords) capturedCoords = "@-14.235,-51.9253,6z";
  }

  const hasMore = places.length >= 15 && page < 100;

  const results: SerperPlaceResult[] = places.map((place, index) => ({
    id: `${place.placeId ?? "no-id"}_${page}_${index}_${Date.now()}`,
    name: place.title ?? "Nome não disponível",
    title: place.title ?? "Nome não disponível",
    endereco: place.address ?? "Endereço não disponível",
    address: place.address ?? "Endereço não disponível",
    telefone: place.phoneNumber ?? "Telefone não disponível",
    phone: place.phoneNumber ?? "Telefone não disponível",
    rating: place.rating ?? 0,
    reviews: place.ratingCount ?? 0,
    website: place.website ?? null,
    types: place.category ?? "Categoria não disponível",
    place_id: place.placeId ?? null,
    gps_coordinates:
      place.latitude && place.longitude
        ? { latitude: place.latitude, longitude: place.longitude }
        : null,
    pageNum: page,
  }));

  return {
    results,
    coordinates: capturedCoords,
    hasMore,
  };
}
