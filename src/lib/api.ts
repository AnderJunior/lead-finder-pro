/**
 * Cliente HTTP do LeadRadar.
 * Usa fetch com cookies (credentials: include) para autenticação por sessão.
 */

import { notifyCreditsChanged } from "./credits-bus";

/**
 * VITE_API_URL:
 *  - Produção: vazio "" → URL relativa (mesma origem, com proxy /api/* → backend via Traefik/nginx)
 *  - Dev: "http://localhost:3001"
 */
const RAW_API_URL = import.meta.env.VITE_API_URL;
const API_BASE = (RAW_API_URL ?? (import.meta.env.DEV ? "http://localhost:3001" : "")).replace(/\/$/, "");

/** Endpoints que debitam créditos no backend.
 *  Sempre que um deles for chamado com sucesso, notificamos o credits-bus. */
const CREDIT_CONSUMING_ENDPOINTS: Array<{ method: string; pattern: RegExp }> = [
  { method: "POST", pattern: /\/api\/buscas\/?$/ },
  { method: "POST", pattern: /\/api\/leads\/?$/ },
  { method: "POST", pattern: /\/api\/leads\/bulk\/?$/ },
  { method: "POST", pattern: /\/api\/leads\/[^/]+\/enrich\/?$/ },
];

function consumesCredits(method: string, path: string): boolean {
  return CREDIT_CONSUMING_ENDPOINTS.some((e) => e.method === method && e.pattern.test(path));
}

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(message: string, status: number, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

interface RequestOptions {
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  signal?: AbortSignal;
  headers?: Record<string, string>;
}

function buildUrl(path: string, query?: RequestOptions["query"]): string {
  // Em produção, API_BASE = "" → usa same-origin via window.location.origin
  const base =
    API_BASE ||
    (typeof window !== "undefined" ? window.location.origin : "http://localhost");
  const fullUrl = path.startsWith("http")
    ? path
    : `${base}${path.startsWith("/") ? "" : "/"}${path}`;
  const url = new URL(fullUrl);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

async function request<T>(method: string, path: string, opts: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = {
    Accept: "application/json",
    ...(opts.headers || {}),
  };
  let body: BodyInit | undefined;
  if (opts.body !== undefined) {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify(opts.body);
  }
  const res = await fetch(buildUrl(path, opts.query), {
    method,
    headers,
    body,
    credentials: "include",
    signal: opts.signal,
  });

  let data: any = null;
  const text = await res.text();
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  if (!res.ok) {
    // Se deu erro de créditos insuficientes, força resync do display
    if (res.status === 402) {
      notifyCreditsChanged();
    }
    const message =
      (data && typeof data === "object" && (data.error || data.message)) ||
      `Erro ${res.status}`;
    throw new ApiError(String(message), res.status, data);
  }

  // Notifica bus de créditos se foi um endpoint que consome
  if (consumesCredits(method, path)) {
    notifyCreditsChanged();
  }

  return data as T;
}

export const api = {
  get: <T = any>(path: string, opts?: RequestOptions) => request<T>("GET", path, opts),
  post: <T = any>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>("POST", path, { ...opts, body }),
  put: <T = any>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>("PUT", path, { ...opts, body }),
  patch: <T = any>(path: string, body?: unknown, opts?: RequestOptions) =>
    request<T>("PATCH", path, { ...opts, body }),
  delete: <T = any>(path: string, opts?: RequestOptions) => request<T>("DELETE", path, opts),
};
