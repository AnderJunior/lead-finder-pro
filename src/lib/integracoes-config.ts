import { useState, useEffect, useCallback } from "react";
import { api, ApiError } from "./api";

export interface IntegracoesConfig {
  google_maps_api_key: string;
  serper_api_key: string;
  evolution_api_url: string;
  evolution_api_instance: string;
  evolution_api_key: string;
  onboarding_video_url: string;
}

const EMPTY_CONFIG: IntegracoesConfig = {
  google_maps_api_key: "",
  serper_api_key: "",
  evolution_api_url: "",
  evolution_api_instance: "",
  evolution_api_key: "",
  onboarding_video_url: "",
};

let cachedConfig: IntegracoesConfig | null = null;
let fetchPromise: Promise<IntegracoesConfig> | null = null;
let listeners: Array<(cfg: IntegracoesConfig) => void> = [];

function notifyListeners(cfg: IntegracoesConfig) {
  listeners.forEach((fn) => fn(cfg));
}

async function fetchFromApi(): Promise<IntegracoesConfig> {
  try {
    const data = await api.get<any>("/api/configuracoes-globais");
    const config: IntegracoesConfig = {
      google_maps_api_key: data.google_maps_api_key || "",
      serper_api_key: data.serper_api_key || "",
      evolution_api_url: data.evolution_api_url || "",
      evolution_api_instance: data.evolution_api_instance || "",
      evolution_api_key: data.evolution_api_key || "",
      onboarding_video_url: data.onboarding_video_url || "",
    };
    cachedConfig = config;
    return config;
  } catch (err) {
    if (err instanceof ApiError && err.status === 401) {
      return { ...EMPTY_CONFIG };
    }
    console.warn("Erro ao buscar integrações:", err);
    return { ...EMPTY_CONFIG };
  }
}

export async function getIntegracoesConfig(): Promise<IntegracoesConfig> {
  if (cachedConfig) return cachedConfig;
  if (!fetchPromise) {
    fetchPromise = fetchFromApi().finally(() => {
      fetchPromise = null;
    });
  }
  return fetchPromise;
}

export function getCachedConfig(): IntegracoesConfig {
  return cachedConfig ?? EMPTY_CONFIG;
}

export async function invalidateIntegracoesCache(): Promise<void> {
  cachedConfig = null;
  fetchPromise = null;
  const cfg = await getIntegracoesConfig();
  notifyListeners(cfg);
}

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
    return () => {
      listeners = listeners.filter((fn) => fn !== onUpdate);
    };
  }, [load]);

  return { config, loading };
}
