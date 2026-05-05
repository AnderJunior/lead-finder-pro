import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireSuperAdmin } from "../middlewares/auth.js";
import { asyncHandler, parseBody } from "../lib/helpers.js";
import { serialize } from "../lib/serialize.js";

const router = Router();
router.use(authenticate);

// ─── GET (qualquer autenticado lê) ─────────────────────────────────────────
router.get(
  "/",
  asyncHandler(async (_req, res) => {
    let cfg = await prisma.configuracaoGlobal.findUnique({ where: { id: 1 } });
    if (!cfg) {
      cfg = await prisma.configuracaoGlobal.create({ data: { id: 1 } });
    }
    res.json(serialize(cfg));
  })
);

// ─── UPDATE (apenas super_admin) ───────────────────────────────────────────
const updateSchema = z.object({
  google_maps_api_key: z.string().optional(),
  serper_api_key: z.string().optional(),
  evolution_api_url: z.string().optional(),
  evolution_api_instance: z.string().optional(),
  evolution_api_key: z.string().optional(),
  onboarding_video_url: z.string().optional(),
});

router.put(
  "/",
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const data = parseBody(updateSchema, req, res);
    if (!data) return;
    const cfg = await prisma.configuracaoGlobal.upsert({
      where: { id: 1 },
      update: { ...data, updated_by_id: req.user!.id },
      create: { id: 1, ...data, updated_by_id: req.user!.id },
    });
    res.json(serialize(cfg));
  })
);

export default router;
