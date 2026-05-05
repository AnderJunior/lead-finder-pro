/**
 * Validação de números WhatsApp via Evolution API.
 * Agora chama o backend (que repassa pra Evolution) — sem CORS.
 */

import { api } from "./api";
import { getIntegracoesConfig, getCachedConfig } from "./integracoes-config";

export interface WhatsAppValidationMap {
  [cleanNumber: string]: {
    hasWhatsApp: boolean;
    status: "verified" | "no_whatsapp";
    jid?: string | null;
  };
}

export function hasWhatsAppConfig(): boolean {
  const cfg = getCachedConfig();
  return Boolean(
    cfg.evolution_api_url.trim() &&
      cfg.evolution_api_instance.trim() &&
      cfg.evolution_api_key.trim()
  );
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

  // Garante que o cache da config global está populado (para hasWhatsAppConfig)
  await getIntegracoesConfig();

  try {
    const data = await api.post<
      Array<{ number?: string | number; exists?: boolean; jid?: string | null }>
    >("/api/proxy/whatsapp/check", { numbers });

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
