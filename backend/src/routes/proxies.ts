import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middlewares/auth.js";
import { asyncHandler, parseBody } from "../lib/helpers.js";

const router = Router();
router.use(authenticate);

async function getGlobalIntegrations() {
  const cfg = await prisma.configuracaoGlobal.findUnique({ where: { id: 1 } });
  return cfg ?? {
    serper_api_key: "",
    google_maps_api_key: "",
    evolution_api_url: "",
    evolution_api_instance: "",
    evolution_api_key: "",
  };
}

// ─── SERPER MAPS ───────────────────────────────────────────────────────────
const serperMapsSchema = z.object({
  q: z.string().min(1),
  gl: z.string().optional(),
  hl: z.string().optional(),
  ll: z.string().optional(), // "@lat,lng,zoom"
  page: z.number().int().positive().optional(),
});

router.post(
  "/serper/maps",
  asyncHandler(async (req, res) => {
    const data = parseBody(serperMapsSchema, req, res);
    if (!data) return;
    const cfg = await getGlobalIntegrations();
    if (!cfg.serper_api_key) {
      res.status(400).json({ error: "Serper API key não configurada (Integrações Globais)" });
      return;
    }
    const r = await fetch("https://google.serper.dev/maps", {
      method: "POST",
      headers: {
        "X-API-KEY": cfg.serper_api_key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    const text = await r.text();
    res.status(r.status).type(r.headers.get("content-type") || "application/json").send(text);
  })
);

// ─── SERPER SEARCH (texto/orgânica) ────────────────────────────────────────
const serperSearchSchema = z.object({
  q: z.string().min(1),
  gl: z.string().optional(),
  hl: z.string().optional(),
  num: z.number().int().positive().optional(),
});

router.post(
  "/serper/search",
  asyncHandler(async (req, res) => {
    const data = parseBody(serperSearchSchema, req, res);
    if (!data) return;
    const cfg = await getGlobalIntegrations();
    if (!cfg.serper_api_key) {
      res.status(400).json({ error: "Serper API key não configurada" });
      return;
    }
    const r = await fetch("https://google.serper.dev/search", {
      method: "POST",
      headers: {
        "X-API-KEY": cfg.serper_api_key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    });
    const text = await r.text();
    res.status(r.status).type(r.headers.get("content-type") || "application/json").send(text);
  })
);

// ─── SERPER ACCOUNT (saldo de créditos da conta Serper) ────────────────────
router.get(
  "/serper/account",
  asyncHandler(async (_req, res) => {
    const cfg = await getGlobalIntegrations();
    if (!cfg.serper_api_key) {
      res.status(400).json({ error: "Serper API key não configurada" });
      return;
    }
    const r = await fetch("https://google.serper.dev/account", {
      headers: { "X-API-KEY": cfg.serper_api_key },
    });
    const text = await r.text();
    res.status(r.status).type(r.headers.get("content-type") || "application/json").send(text);
  })
);

// ─── EVOLUTION API (validação de WhatsApp) ─────────────────────────────────
const whatsappSchema = z.object({ numbers: z.array(z.string()).min(1).max(200) });

router.post(
  "/whatsapp/check",
  asyncHandler(async (req, res) => {
    const data = parseBody(whatsappSchema, req, res);
    if (!data) return;
    const cfg = await getGlobalIntegrations();
    if (!cfg.evolution_api_url || !cfg.evolution_api_instance || !cfg.evolution_api_key) {
      res.status(400).json({ error: "Evolution API não configurada" });
      return;
    }
    const url = `${cfg.evolution_api_url.replace(/\/$/, "")}/chat/whatsappNumbers/${cfg.evolution_api_instance}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { apikey: cfg.evolution_api_key, "Content-Type": "application/json" },
      body: JSON.stringify({ numbers: data.numbers }),
    });
    const text = await r.text();
    res.status(r.status).type(r.headers.get("content-type") || "application/json").send(text);
  })
);

export default router;
