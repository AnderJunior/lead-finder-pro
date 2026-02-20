/**
 * Validação de números WhatsApp via Evolution API
 * Baseado na lógica do sistema_pronto
 */

export interface WhatsAppValidationMap {
  [cleanNumber: string]: {
    hasWhatsApp: boolean;
    status: "verified" | "no_whatsapp";
    jid?: string | null;
  };
}

function getConfig() {
  const baseUrl = import.meta.env.VITE_WHATSAPP_BASE_URL?.trim() ?? "";
  const instance = import.meta.env.VITE_WHATSAPP_INSTANCE?.trim() ?? "";
  const apiKey = import.meta.env.VITE_WHATSAPP_API_KEY?.trim() ?? "";
  const authHeader =
    import.meta.env.VITE_WHATSAPP_AUTH_HEADER?.trim() || "apikey";
  return { baseUrl, instance, apiKey, authHeader };
}

export function hasWhatsAppConfig(): boolean {
  const { baseUrl, instance, apiKey } = getConfig();
  return Boolean(baseUrl && instance && apiKey);
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

  const { baseUrl, instance, apiKey, authHeader } = getConfig();
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
