/**
 * Serviço de busca de perfis do Instagram via Serper Search API
 * Busca perfis de negócios no Instagram usando Google Search (site:instagram.com)
 * Filtra para retornar apenas perfis (exclui reels, posts e stories)
 */

import { getIntegracoesConfig } from "./integracoes-config";

const SERPER_BASE = "https://google.serper.dev";
const CORS_PROXIES = [
  "https://api.codetabs.com/v1/proxy?quest=",
  "https://corsproxy.io/?",
];

export interface InstagramProfileResult {
  id: string;
  title: string;
  link: string;
  snippet: string;
  position: number;
  platform: "instagram";
  searchTerm: string;
  pageNum: number;
}

export interface InstagramSearchResponse {
  results: InstagramProfileResult[];
  hasMore: boolean;
}

async function getApiKey(): Promise<string> {
  const config = await getIntegracoesConfig();
  const key = config.serper_api_key;
  if (!key) throw new Error("Configure a chave da Serper API nas configurações do sistema.");
  return key;
}

async function fetchWithCors(
  url: string,
  options: RequestInit,
  apiKey: string
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
    headers: { ...options.headers, "X-API-KEY": apiKey },
  });
}

function buildInstagramQuery(term: string): string {
  return `site:instagram.com "${term}" -inurl:reel -inurl:p/ -inurl:stories`;
}

function isInstagramProfile(link: string, snippet: string): boolean {
  const isReel =
    link.includes("/reel/") ||
    link.includes("/stories/") ||
    (link.includes("/p/") && snippet.includes("reel"));
  const isProfile =
    link.includes("instagram.com") && !link.includes("instagram.com/p/");
  return isProfile && !isReel;
}

export async function searchInstagramProfiles(
  term: string,
  page: number = 1
): Promise<InstagramSearchResponse> {
  const apiKey = await getApiKey();
  const searchQuery = buildInstagramQuery(term.trim());

  const body = {
    q: searchQuery,
    gl: "br",
    hl: "pt-br",
    page,
  };

  const url = `${SERPER_BASE}/search`;
  const res = await fetchWithCors(url, {
    method: "POST",
    headers: {
      "X-API-KEY": apiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  }, apiKey);

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Serper API: ${res.status} - ${text}`);
  }

  const data = (await res.json()) as {
    organic?: Array<{
      title?: string;
      link?: string;
      snippet?: string;
      position?: number;
    }>;
  };

  const organic = data.organic ?? [];

  const filtered = organic.filter((item) =>
    isInstagramProfile(item.link ?? "", item.snippet ?? "")
  );

  const hasMore = organic.length >= 8 && page < 100;

  const results: InstagramProfileResult[] = filtered.map((item, index) => ({
    id: `instagram_${item.link ?? ""}_${page}_${index}_${Date.now()}`,
    title: item.title ?? "Título não disponível",
    link: item.link ?? "#",
    snippet: item.snippet ?? "Descrição não disponível",
    position: item.position ?? (page - 1) * 10 + index + 1,
    platform: "instagram" as const,
    searchTerm: term.trim(),
    pageNum: page,
  }));

  return { results, hasMore };
}
