/**
 * Serviço de enriquecimento de leads via Serper Search API
 * Busca informações do decisor e da empresa usando buscas orgânicas do Google
 */

import { getIntegracoesConfig } from "./integracoes-config";

const SERPER_BASE = "https://google.serper.dev";
const CORS_PROXIES = [
  "https://api.codetabs.com/v1/proxy?quest=",
  "https://corsproxy.io/?",
];

export interface LeadEnrichmentResult {
  /** Telefone principal da empresa (preenche lead.telefone se vazio) */
  telefone: string | null;
  /** Email principal da empresa (preenche lead.email se vazio) */
  email: string | null;
  decisor_nome: string | null;
  decisor_telefone: string | null;
  decisor_email: string | null;
  decisor_cargo: string | null;
  tamanho_empresa: string | null;
  website: string | null;
  linkedin_url: string | null;
  facebook_url: string | null;
  instagram_url: string | null;
  fontes: string[];
}

/** Regex para extrair telefones brasileiros */
const PHONE_REGEX = /(?:\(?\d{2}\)?\s?)?(?:9?\d{4}[-\s]?\d{4}|\d{2}\s?\d{4}\s?-?\s?\d{4})/g;
/** Regex para extrair emails */
const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
/** Padrões de cargo antes do nome */
const CARGO_NOME_PATTERNS = [
  /(?:diretor|CEO|sócio|proprietário|gerente|responsável|contato)[:\s–-]+([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+){1,3})/gi,
  /([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+){1,3})\s*[-–]\s*(?:diretor|CEO|sócio|proprietário|gerente)/gi,
  /(?:com\s+)?([A-ZÀ-Ú][a-zà-ú]+(?:\s+[A-ZÀ-Ú][a-zà-ú]+){1,3})/g,
];
/** Cargos para extrair do texto */
const CARGOS = [
  "CEO",
  "Diretor",
  "Diretora",
  "Gerente",
  "Sócio",
  "Sócia",
  "Proprietário",
  "Proprietária",
  "Dono",
  "Responsável",
  "Coordenador",
  "Coordenadora",
  "Superintendente",
  "Presidente",
];
/** Padrões de tamanho de empresa */
const TAMANHO_PATTERNS = [
  /(\d+\s*[-–]\s*\d+\s*funcionários?)/gi,
  /(\d+\+\s*funcionários?)/gi,
  /(\d+\s*funcionários?)/gi,
  /(microempreendedor|micro\s*empresa|MEI)/gi,
  /(empresa\s*pequena|pequena\s*empresa|pequeno\s*porte)/gi,
  /(empresa\s*média|média\s*empresa|médio\s*porte)/gi,
  /(empresa\s*grande|grande\s*empresa|grande\s*porte)/gi,
  /(startup)/gi,
];

function extrairTelefones(texto: string): string[] {
  const matches = texto.match(PHONE_REGEX) ?? [];
  return [...new Set(matches.map((m) => m.replace(/\s+/g, " ").trim()))];
}

function extrairEmails(texto: string): string[] {
  const matches = texto.match(EMAIL_REGEX) ?? [];
  return [...new Set(matches.filter((e) => !e.endsWith(".png") && !e.endsWith(".jpg")))];
}

function extrairNomes(texto: string): string[] {
  const nomes: string[] = [];
  for (const pattern of CARGO_NOME_PATTERNS) {
    const m = texto.matchAll(pattern);
    for (const match of m) {
      const nome = match[1]?.trim();
      if (nome && nome.length >= 6 && nome.length <= 50 && !nomes.includes(nome)) {
        nomes.push(nome);
      }
    }
  }
  return nomes;
}

function extrairCargo(texto: string): string | null {
  const textoS = texto.toLowerCase();
  for (const cargo of CARGOS) {
    const regex = new RegExp(
      `\\b${cargo.replace(/[àáâãä]/g, "[aàáâãä]").replace(/[òóôõö]/g, "[oòóôõö]")}\\b`,
      "gi"
    );
    const m = textoS.match(regex);
    if (m?.[0]) return m[0].charAt(0).toUpperCase() + m[0].slice(1).toLowerCase();
  }
  return null;
}

function extrairTamanhoEmpresa(texto: string): string | null {
  for (const pattern of TAMANHO_PATTERNS) {
    const m = texto.match(pattern);
    if (m?.[0]) return m[0].trim();
  }
  return null;
}

function normalizarTelefone(tel: string): string {
  const digits = tel.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("9")) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  }
  return tel;
}

/** Filtra e retorna a primeira URL válida de um domínio */
function extrairUrlDeDominio(links: string[], dominio: string): string | null {
  const dom = dominio.toLowerCase();
  for (const link of links) {
    const l = link.toLowerCase().trim();
    if (l.includes(dom) && (l.startsWith("http") || l.startsWith("//"))) {
      return l.startsWith("//") ? `https:${l}` : l;
    }
  }
  return null;
}

/** Remove query strings e fragmentos para normalizar URL */
function limparUrl(url: string): string {
  try {
    const u = new URL(url.startsWith("http") ? url : `https://${url}`);
    return `${u.protocol}//${u.host}${u.pathname.replace(/\/$/, "")}`;
  } catch {
    return url;
  }
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
    headers: { ...(options.headers as Record<string, string>), "X-API-KEY": apiKey },
  });
}

async function searchSerperOrganic(
  query: string,
  page: number = 1
): Promise<{ title: string; link: string; snippet: string }[]> {
  const apiKey = await getApiKey();
  const url = `${SERPER_BASE}/search`;
  const body = { q: query, gl: "br", hl: "pt-br", page };

  const res = await fetchWithCors(
    url,
    {
      method: "POST",
      headers: { "X-API-KEY": apiKey, "Content-Type": "application/json" },
      body: JSON.stringify(body),
    },
    apiKey
  );

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Serper API: ${res.status} - ${text}`);
  }

  const data = (await res.json()) as {
    organic?: Array<{ title?: string; link?: string; snippet?: string }>;
  };
  const organic = data.organic ?? [];
  return organic.map((o) => ({
    title: o.title ?? "",
    link: o.link ?? "",
    snippet: o.snippet ?? "",
  }));
}

/**
 * Enriquece um lead buscando informações via Serper Search (Google).
 * Inclui: decisor, cargo, tamanho da empresa, site, LinkedIn, Facebook, Instagram.
 */
export async function enrichLead(
  nomeEmpresa: string,
  websiteExistente?: string | null
): Promise<LeadEnrichmentResult> {
  const todasAsStrings: string[] = [];
  const todosOsLinks: string[] = [];
  const fontes: string[] = [];

  // Query 1: Nome da empresa + cargos/contato
  const query1 = `"${nomeEmpresa}" CEO diretor contato proprietário`;
  const res1 = await searchSerperOrganic(query1);
  for (const r of res1) {
    todasAsStrings.push(`${r.title} ${r.snippet}`);
    if (r.link) {
      todosOsLinks.push(r.link);
      if (!fontes.includes(r.link)) fontes.push(r.link);
    }
  }

  // Query 2: Tamanho da empresa
  const query2 = `"${nomeEmpresa}" funcionários tamanho empresa`;
  const res2 = await searchSerperOrganic(query2);
  for (const r of res2) {
    todasAsStrings.push(`${r.title} ${r.snippet}`);
  }

  // Query 3: LinkedIn
  const query3 = `"${nomeEmpresa}" site:linkedin.com`;
  const res3 = await searchSerperOrganic(query3);
  for (const r of res3) {
    if (r.link && (r.link.includes("linkedin.com/company") || r.link.includes("linkedin.com/in"))) {
      todosOsLinks.push(r.link);
    }
  }

  // Query 4: Facebook
  const query4 = `"${nomeEmpresa}" site:facebook.com`;
  const res4 = await searchSerperOrganic(query4);
  for (const r of res4) {
    if (r.link && r.link.includes("facebook.com")) {
      todosOsLinks.push(r.link);
    }
  }

  // Query 5: Instagram
  const query5 = `"${nomeEmpresa}" site:instagram.com`;
  const res5 = await searchSerperOrganic(query5);
  for (const r of res5) {
    if (r.link && r.link.includes("instagram.com") && !r.link.includes("/p/") && !r.link.includes("/reel/")) {
      todosOsLinks.push(r.link);
    }
  }

  // Query 6: Website (se não tiver)
  let websiteEncontrado: string | null = null;
  if (!websiteExistente?.trim()) {
    const query6 = `"${nomeEmpresa}" site oficial`;
    const res6 = await searchSerperOrganic(query6);
    for (const r of res6) {
      if (r.link && !r.link.includes("facebook.com") && !r.link.includes("instagram.com") && !r.link.includes("linkedin.com")) {
        const dominio = r.link.replace(/^https?:\/\//, "").split("/")[0];
        if (dominio && !dominio.includes("google.") && !dominio.includes("youtube.")) {
          websiteEncontrado = limparUrl(r.link);
          break;
        }
      }
    }
  }

  // Query 7: Busca no site da empresa (se tiver website)
  if (websiteExistente?.trim()) {
    try {
      const dominio = websiteExistente.replace(/^https?:\/\//, "").replace(/\/.*$/, "");
      const query7 = `site:${dominio} contato diretor telefone email`;
      const res7 = await searchSerperOrganic(query7);
      for (const r of res7) {
        todasAsStrings.push(`${r.title} ${r.snippet}`);
        if (r.link && !fontes.includes(r.link)) fontes.push(r.link);
      }
    } catch {
      // ignora
    }
  }

  const textoCompleto = todasAsStrings.join(" ");

  const telefones = extrairTelefones(textoCompleto);
  const emails = extrairEmails(textoCompleto);
  const nomes = extrairNomes(textoCompleto);
  const cargo = extrairCargo(textoCompleto);
  const tamanho = extrairTamanhoEmpresa(textoCompleto);

  const linkedin = extrairUrlDeDominio([...new Set(todosOsLinks)], "linkedin.com");
  const facebook = extrairUrlDeDominio([...new Set(todosOsLinks)], "facebook.com");
  const instagram = extrairUrlDeDominio([...new Set(todosOsLinks)], "instagram.com");

  const telPrincipal = telefones[0] ? normalizarTelefone(telefones[0]) : null;
  const emailPrincipal = emails[0] ?? null;

  return {
    telefone: telPrincipal,
    email: emailPrincipal,
    decisor_nome: nomes[0] ?? null,
    decisor_telefone: telPrincipal,
    decisor_email: emailPrincipal,
    decisor_cargo: cargo,
    tamanho_empresa: tamanho,
    website: websiteEncontrado ?? null,
    linkedin_url: linkedin ? limparUrl(linkedin) : null,
    facebook_url: facebook ? limparUrl(facebook) : null,
    instagram_url: instagram ? limparUrl(instagram) : null,
    fontes: fontes.slice(0, 5),
  };
}
