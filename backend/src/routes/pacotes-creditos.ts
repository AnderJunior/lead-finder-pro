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
    const items = await prisma.pacoteCredito.findMany({
      where: { ativo: true },
      orderBy: [{ ordem: "asc" }, { quantidade: "asc" }],
    });
    res.json(serialize(items));
  })
);

const schema = z.object({
  nome: z.string().min(1),
  quantidade: z.number().int().positive(),
  preco: z.number().nonnegative().optional(),
  ordem: z.number().int().optional(),
  ativo: z.boolean().optional(),
});

router.post(
  "/",
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const data = parseBody(schema, req, res);
    if (!data) return;
    const item = await prisma.pacoteCredito.create({
      data: {
        nome: data.nome,
        quantidade: data.quantidade,
        preco: data.preco ?? 0,
        ordem: data.ordem ?? 0,
        ativo: data.ativo ?? true,
      },
    });
    res.status(201).json(serialize(item));
  })
);

router.put(
  "/:id",
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const id = asBigInt(req.params.id);
    const data = parseBody(schema.partial(), req, res);
    if (!data) return;
    const item = await prisma.pacoteCredito.update({
      where: { id },
      data,
    });
    res.json(serialize(item));
  })
);

router.delete(
  "/:id",
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const id = asBigInt(req.params.id);
    await prisma.pacoteCredito.delete({ where: { id } });
    res.json({ ok: true });
  })
);

export default router;
