/**
 * Validação de números WhatsApp via Evolution API
 * Configurações vêm do banco de dados (configuracoes_integracoes)
 */

import { getIntegracoesConfig, getCachedConfig } from "./integracoes-config";

export interface WhatsAppValidationMap {
  [cleanNumber: string]: {
    hasWhatsApp: boolean;
    status: "verified" | "no_whatsapp";
    jid?: string | null;
  };
}

async function getConfig() {
  const cfg = await getIntegracoesConfig();
  return {
    baseUrl: cfg.evolution_api_url.trim(),
    instance: cfg.evolution_api_instance.trim(),
    apiKey: cfg.evolution_api_key.trim(),
    authHeader: "apikey",
  };
}

export function hasWhatsAppConfig(): boolean {
  const cfg = getCachedConfig();
  return Boolean(cfg.evolution_api_url.trim() && cfg.evolution_api_instance.trim() && cfg.evolution_api_key.trim());
}

function extractPhoneNumbers(results: { phone?: string; telefone?: string }[]): string[] {
  const seen = new Set<string>();
  const numbers: string[] = [];
  for (const r of results) {
    const raw = r.phone ?? r.telefone ?? "";
    if (!raw || raw.includes("não disponível")) continue;
    const clean = raw.replace(/\D/g, "");
    if (clean.length >= 10 && !seen.has(clean)) {
      seen.add(clean);
      numbers.push(clean);
    }
  }
  return numbers;
}

export async function validateWhatsAppNumbers(
  results: { phone?: string; telefone?: string }[]
): Promise<WhatsAppValidationMap> {
  const numbers = extractPhoneNumbers(results);
  if (numbers.length === 0) return {};

  const { baseUrl, instance, apiKey, authHeader } = await getConfig();
  if (!baseUrl || !instance || !apiKey) return {};

  const url = `${baseUrl.replace(/\/$/, "")}/chat/whatsappNumbers/${instance}`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        [authHeader]: apiKey,
      },
      body: JSON.stringify({ numbers }),
    });

    if (!res.ok) return {};

    const data = (await res.json()) as Array<{
      number?: string | number;
      exists?: boolean;
      jid?: string | null;
    }>;

    const map: WhatsAppValidationMap = {};
    for (const item of data ?? []) {
      const num = item.number?.toString();
      if (num) {
        map[num] = {
          hasWhatsApp: item.exists === true,
          status: item.exists === true ? "verified" : "no_whatsapp",
          jid: item.jid ?? null,
        };
      }
    }
    return map;
  } catch {
    return {};
  }
}
