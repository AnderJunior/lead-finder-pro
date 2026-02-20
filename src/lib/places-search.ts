/**
 * Serviço de busca de empresas via Google Places API
 * Tenta Place.searchByText (Places API New); se PERMISSION_DENIED, usa PlacesService.textSearch (Places API legada)
 */

export interface PlaceSearchResult {
  id: string;
  name: string;
  category: string;
  address: string;
  phone: string;
  website: string;
  rating: number;
  reviews: number;
  lat?: number;
  lng?: number;
}

export interface SearchParams {
  term: string;
  location: string;
  maxResults?: number; // limite total (ex.: 60). API retorna 20 por página
  fetchPhone?: boolean; // chamar getDetails para obter telefone (mais requisições)
}

export interface SearchResult {
  leads: PlaceSearchResult[];
  searchTerm: string;
  searchLocation: string;
  totalCount: number;
}

declare global {
  interface Window {
    google?: typeof google;
  }
}

async function getPlacesLibrary(): Promise<google.maps.PlacesLibrary> {
  if (!window.google?.maps?.importLibrary) {
    throw new Error("Google Maps API não carregada. Verifique VITE_GOOGLE_MAPS_API_KEY.");
  }
  return (await window.google.maps.importLibrary("places")) as google.maps.PlacesLibrary;
}

function formatCategory(place: google.maps.places.Place): string {
  const primaryType = (place as { primaryTypeDisplayName?: string | { text?: string } }).primaryTypeDisplayName;
  if (typeof primaryType === "string") return primaryType;
  if (primaryType && typeof primaryType === "object" && "text" in primaryType) {
    return (primaryType as { text: string }).text ?? "Empresa";
  }
  const types = (place as { types?: string[] }).types;
  if (!types?.length) return "Empresa";
  const primary = types[0];
  return primary
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

function extractWebsite(place: google.maps.places.Place): string {
  const uri = (place as { websiteUri?: string }).websiteUri;
  if (typeof uri === "string") return uri;
  return "";
}

function extractPhone(place: google.maps.places.Place): string {
  const national = (place as { nationalPhoneNumber?: string }).nationalPhoneNumber;
  if (typeof national === "string") return national;
  const international = (place as { internationalPhoneNumber?: string }).internationalPhoneNumber;
  if (typeof international === "string") return international;
  return "";
}

function extractRating(place: google.maps.places.Place): number {
  const r = (place as { rating?: number }).rating;
  return typeof r === "number" ? r : 0;
}

function extractUserRatingCount(place: google.maps.places.Place): number {
  const c = (place as { userRatingCount?: number }).userRatingCount;
  return typeof c === "number" ? c : 0;
}

function extractDisplayName(place: google.maps.places.Place): string {
  const dn = (place as { displayName?: string | { text?: string } }).displayName;
  if (typeof dn === "string") return dn;
  if (dn && typeof dn === "object" && "text" in dn && typeof (dn as { text?: string }).text === "string") {
    return (dn as { text: string }).text;
  }
  return "";
}

function placeToLead(place: google.maps.places.Place, index: number): PlaceSearchResult {
  const location = (place as { location?: google.maps.LatLng }).location;
  const name = extractDisplayName(place) || place.id || "Sem nome";
  return {
    id: place.id || `place-${index}`,
    name,
    category: formatCategory(place),
    address: (place as { formattedAddress?: string }).formattedAddress ?? "",
    phone: extractPhone(place),
    website: extractWebsite(place),
    rating: extractRating(place),
    reviews: extractUserRatingCount(place),
    lat: location?.lat ? (typeof location.lat === "function" ? location.lat() : location.lat) : undefined,
    lng: location?.lng ? (typeof location.lng === "function" ? location.lng() : location.lng) : undefined,
  };
}

function placeResultToLead(pr: google.maps.places.PlaceResult, index: number): PlaceSearchResult {
  const geom = pr.geometry?.location;
  const lat = geom ? (typeof geom.lat === "function" ? geom.lat() : geom.lat) : undefined;
  const lng = geom ? (typeof geom.lng === "function" ? geom.lng() : geom.lng) : undefined;
  const types = pr.types || [];
  const category = types.length
    ? types[0]
        .split("_")
        .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
        .join(" ")
    : "Empresa";
  return {
    id: pr.place_id || `place-${index}`,
    name: pr.name ?? "Sem nome",
    category,
    address: pr.formatted_address ?? pr.vicinity ?? "",
    phone: pr.formatted_phone_number ?? pr.international_phone_number ?? "",
    website: pr.website ?? pr.url ?? "",
    rating: typeof pr.rating === "number" ? pr.rating : 0,
    reviews: typeof pr.user_ratings_total === "number" ? pr.user_ratings_total : 0,
    lat,
    lng,
  };
}

const MAX_RESULTS_TOTAL = 60; // limite para evitar excesso de requisições
const BATCH_DELAY_MS = 100; // delay entre lotes de getDetails

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * Enriquece resultados com getDetails (telefone, website, rating)
 */
async function enrichWithDetails(
  service: google.maps.places.PlacesService,
  results: google.maps.places.PlaceResult[]
): Promise<google.maps.places.PlaceResult[]> {
  const BATCH_SIZE = 5;
  const enriched: google.maps.places.PlaceResult[] = [];

  for (let i = 0; i < results.length; i += BATCH_SIZE) {
    const batch = results.slice(i, i + BATCH_SIZE);
    const details = await Promise.all(
      batch.map(
        (r) =>
          new Promise<google.maps.places.PlaceResult | null>((res) => {
            if (!r.place_id) return res(r);
            service.getDetails(
              {
                placeId: r.place_id,
                fields: ["place_id", "formatted_phone_number", "international_phone_number", "website", "rating", "user_ratings_total"],
              },
              (detail, status) => {
                if (status === "OK" && detail) {
                  res({ ...r, ...detail });
                } else {
                  res(r);
                }
              }
            );
          })
      )
    );
    enriched.push(...details.filter((d): d is google.maps.places.PlaceResult => d !== null));
    if (i + BATCH_SIZE < results.length) await sleep(BATCH_DELAY_MS);
  }
  return enriched;
}

/**
 * Busca via PlacesService.textSearch (API legada) - TODAS as páginas + enriquecimento com telefone
 */
async function searchPlacesLegacy(params: SearchParams): Promise<SearchResult> {
  const { term, location, maxResults = MAX_RESULTS_TOTAL, fetchPhone = true } = params;
  const textQuery = `${term.trim()} ${location.trim()}`.trim();
  if (!textQuery) return { leads: [], searchTerm: term, searchLocation: location, totalCount: 0 };

  const { PlacesService, PlacesServiceStatus } = await getPlacesLibrary();
  const div = document.createElement("div");
  const service = new PlacesService(div);

  const allResults: google.maps.places.PlaceResult[] = [];

  await new Promise<void>((resolve, reject) => {
    const handleResponse = (
      results: google.maps.places.PlaceResult[] | null,
      status: google.maps.places.PlacesServiceStatus,
      pagination: google.maps.places.PlaceSearchPagination | null
    ) => {
      if (status !== PlacesServiceStatus.OK || !results?.length) {
        resolve();
        return;
      }
      allResults.push(...results);
      if (pagination?.hasNextPage && allResults.length < maxResults) {
        pagination.nextPage();
      } else {
        resolve();
      }
    };
    service.textSearch({ query: textQuery, language: "pt-BR" }, handleResponse);
  });

  const capped = allResults.slice(0, maxResults);

  const toEnrich = fetchPhone ? await enrichWithDetails(service, capped) : capped;

  const leads = toEnrich.map((r, i) => placeResultToLead(r, i));

  return { leads, searchTerm: term, searchLocation: location, totalCount: leads.length };
}

/**
 * Busca empresas por termo + localização usando Google Places Text Search
 * Tenta API New primeiro; em PERMISSION_DENIED usa API legada (com todas as páginas + telefone)
 */
export async function searchPlaces(params: SearchParams): Promise<SearchResult> {
  const { term, location, maxResults = MAX_RESULTS_TOTAL, fetchPhone = true } = params;
  const textQuery = `${term.trim()} ${location.trim()}`.trim();

  if (!textQuery) {
    return { leads: [], searchTerm: term, searchLocation: location, totalCount: 0 };
  }

  const placesLib = await getPlacesLibrary();

  try {
    const { Place } = placesLib;
    const request: google.maps.places.SearchByTextRequest = {
      textQuery,
      fields: ["id", "displayName", "formattedAddress", "location", "types", "primaryTypeDisplayName"],
      maxResultCount: 20,
      language: "pt-BR",
      region: "br",
    };
    const { places } = await Place.searchByText(request);
    const leads = (places || []).map((p, i) => placeToLead(p, i));
    return { leads, searchTerm: term, searchLocation: location, totalCount: leads.length };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("PERMISSION_DENIED") || msg.includes("blocked") || msg.includes("403")) {
      return searchPlacesLegacy({ term, location, maxResults, fetchPhone });
    }
    throw err;
  }
}
