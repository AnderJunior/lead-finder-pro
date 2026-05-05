import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireSuperAdmin } from "../middlewares/auth.js";
import { asBigInt, asyncHandler, parseBody } from "../lib/helpers.js";
import { serialize } from "../lib/serialize.js";

const router = Router();
router.use(authenticate);

router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const planos = await prisma.plano.findMany({ orderBy: { preco_mensal: "asc" } });
    res.json(serialize(planos));
  })
);

const schema = z.object({
  nome: z.string().min(1),
  descricao: z.string().nullable().optional(),
  preco_mensal: z.number().nonnegative(),
  preco_anual: z.number().nonnegative(),
  max_usuarios: z.number().int().positive(),
  creditos_iniciais: z.number().int().nonnegative().optional(),
  max_leads: z.number().int().nonnegative().optional(),
  max_buscas_mes: z.number().int().nonnegative().optional(),
  recursos: z.array(z.string()).optional(),
  ativo: z.boolean().optional(),
});

router.post(
  "/",
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const data = parseBody(schema, req, res);
    if (!data) return;
    const plano = await prisma.plano.create({ data });
    res.status(201).json(serialize(plano));
  })
);

router.put(
  "/:id",
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const id = asBigInt(req.params.id);
    const data = parseBody(schema.partial(), req, res);
    if (!data) return;
    const plano = await prisma.plano.update({ where: { id }, data });
    res.json(serialize(plano));
  })
);

router.delete(
  "/:id",
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const id = asBigInt(req.params.id);
    await prisma.plano.delete({ where: { id } });
    res.json({ ok: true });
  })
);

export default router;
