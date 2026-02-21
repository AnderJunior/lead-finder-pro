import { useState, useEffect, useCallback } from "react";
import { supabase } from "./supabase";

export interface IntegracoesConfig {
  google_maps_api_key: string;
  serper_api_key: string;
  evolution_api_url: string;
  evolution_api_instance: string;
  evolution_api_key: string;
}

const EMPTY_CONFIG: IntegracoesConfig = {
  google_maps_api_key: "",
  serper_api_key: "",
  evolution_api_url: "",
  evolution_api_instance: "",
  evolution_api_key: "",
};

let cachedConfig: IntegracoesConfig | null = null;
let fetchPromise: Promise<IntegracoesConfig> | null = null;
let listeners: Array<(cfg: IntegracoesConfig) => void> = [];

function notifyListeners(cfg: IntegracoesConfig) {
  listeners.forEach((fn) => fn(cfg));
}

async function fetchFromDb(): Promise<IntegracoesConfig> {
  const { data: session } = await supabase.auth.getSession();
  if (!session?.session) {
    return { ...EMPTY_CONFIG };
  }

  const { data, error } = await supabase
    .from("configuracoes_integracoes")
    .select(
      "google_maps_api_key, serper_api_key, evolution_api_url, evolution_api_instance, evolution_api_key"
    )
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return { ...EMPTY_CONFIG };
  }

  const config: IntegracoesConfig = {
    google_maps_api_key: data.google_maps_api_key || "",
    serper_api_key: data.serper_api_key || "",
    evolution_api_url: data.evolution_api_url || "",
    evolution_api_instance: data.evolution_api_instance || "",
    evolution_api_key: data.evolution_api_key || "",
  };

  cachedConfig = config;
  return config;
}

/**
 * Busca config do banco (com cache em memória).
 * Só cacheia se houver sessão autenticada.
 */
export async function getIntegracoesConfig(): Promise<IntegracoesConfig> {
  if (cachedConfig) return cachedConfig;
  if (!fetchPromise) {
    fetchPromise = fetchFromDb().finally(() => { fetchPromise = null; });
  }
  return fetchPromise;
}

/**
 * Retorna config cacheada sincronamente. Retorna EMPTY se ainda não carregou.
 */
export function getCachedConfig(): IntegracoesConfig {
  return cachedConfig ?? EMPTY_CONFIG;
}

/**
 * Invalida o cache e re-busca do banco. Notifica listeners.
 */
export async function invalidateIntegracoesCache(): Promise<void> {
  cachedConfig = null;
  fetchPromise = null;
  const cfg = await getIntegracoesConfig();
  notifyListeners(cfg);
}

/**
 * React hook que carrega e retorna as configs de integrações.
 * Escuta auth state changes para recarregar quando o user fizer login.
 */
export function useIntegracoesConfig() {
  const [config, setConfig] = useState<IntegracoesConfig>(cachedConfig ?? EMPTY_CONFIG);
  const [loading, setLoading] = useState(!cachedConfig);

  const load = useCallback(() => {
    getIntegracoesConfig().then((cfg) => {
      setConfig(cfg);
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    load();

    const onUpdate = (cfg: IntegracoesConfig) => {
      setConfig(cfg);
      setLoading(false);
    };
    listeners.push(onUpdate);

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        cachedConfig = null;
        fetchPromise = null;
        load();
      }
    });

    return () => {
      listeners = listeners.filter((fn) => fn !== onUpdate);
      subscription.unsubscribe();
    };
  }, [load]);

  return { config, loading };
}
