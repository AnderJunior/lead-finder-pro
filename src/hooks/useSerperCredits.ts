import { useState, useEffect } from "react";
import { getIntegracoesConfig } from "@/lib/integracoes-config";

const SERPER_ACCOUNT_URL = "https://google.serper.dev/account";
const CORS_PROXIES = [
  "https://corsproxy.io/?",
  "https://api.codetabs.com/v1/proxy?quest=",
];
const TOTAL_CREDITS = 2500;

interface SerperAccountData {
  credits: number;
  totalCredits: number;
  loading: boolean;
  error: string | null;
}

async function fetchAccountWithCors(apiKey: string): Promise<Response> {
  const headers: Record<string, string> = { "X-API-KEY": apiKey };

  try {
    const res = await fetch(SERPER_ACCOUNT_URL, { method: "GET", headers });
    if (res.ok) return res;
  } catch {
    // CORS blocked
  }

  for (const proxy of CORS_PROXIES) {
    try {
      const url = `${proxy}${encodeURIComponent(SERPER_ACCOUNT_URL)}`;
      const res = await fetch(url, { method: "GET", headers });
      if (res.ok) return res;
    } catch {
      continue;
    }
  }

  throw new Error("Não foi possível conectar à API Serper");
}

export function useSerperCredits(): SerperAccountData {
  const [credits, setCredits] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function fetchCredits() {
      try {
        const config = await getIntegracoesConfig();
        const apiKey = config.serper_api_key;
        if (!apiKey) {
          if (!cancelled) setError("API Key não configurada");
          if (!cancelled) setLoading(false);
          return;
        }

        const res = await fetchAccountWithCors(apiKey);
        const data = await res.json();
        if (!cancelled) {
          setCredits(data.balance ?? data.credits ?? 0);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Erro ao buscar créditos");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchCredits();
    return () => { cancelled = true; };
  }, []);

  return { credits, totalCredits: TOTAL_CREDITS, loading, error };
}
