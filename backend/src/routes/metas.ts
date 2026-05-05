import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireAdmin } from "../middlewares/auth.js";
import { asBigInt, asyncHandler, parseBody, requireEmpresa } from "../lib/helpers.js";
import { serialize } from "../lib/serialize.js";

const router = Router();
router.use(authenticate, requireEmpresa);

// METAS

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const empresaId =
      req.user!.role === "super_admin" && req.query.empresa_id
        ? BigInt(String(req.query.empresa_id))
        : req.user!.empresa_id!;
    const metas = await prisma.meta.findMany({
      where: { empresa_id: empresaId },
      include: { vendedores: { include: { user: { select: { id: true, nome: true, email: true } } } } },
      orderBy: { created_at: "asc" },
    });
    res.json(serialize(metas));
  })
);

const metaSchema = z.object({
  nome: z.string().min(1),
  slug: z.string().min(1),
  valor: z.number().int().nonnegative(),
  periodo: z.enum(["diario", "semanal", "mensal"]).default("mensal"),
});

router.post(
  "/",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const data = parseBody(metaSchema, req, res);
    if (!data) return;
    const meta = await prisma.meta.create({
      data: { ...data, empresa_id: req.user!.empresa_id! },
    });
    res.status(201).json(serialize(meta));
  })
);

router.put(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = asBigInt(req.params.id);
    const meta = await prisma.meta.findUnique({ where: { id } });
    if (!meta) {
      res.status(404).json({ error: "Meta não encontrada" });
      return;
    }
    if (req.user!.role !== "super_admin" && meta.empresa_id !== req.user!.empresa_id) {
      res.status(403).json({ error: "Sem permissão" });
      return;
    }
    const data = parseBody(metaSchema.partial(), req, res);
    if (!data) return;
    const updated = await prisma.meta.update({ where: { id }, data });
    res.json(serialize(updated));
  })
);

router.delete(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = asBigInt(req.params.id);
    const meta = await prisma.meta.findUnique({ where: { id } });
    if (!meta) {
      res.status(404).json({ error: "Meta não encontrada" });
      return;
    }
    if (meta.fixa) {
      res.status(400).json({ error: "Meta fixa não pode ser deletada" });
      return;
    }
    if (req.user!.role !== "super_admin" && meta.empresa_id !== req.user!.empresa_id) {
      res.status(403).json({ error: "Sem permissão" });
      return;
    }
    await prisma.meta.delete({ where: { id } });
    res.json({ ok: true });
  })
);

// METAS POR VENDEDOR

const metaVendedorSchema = z.object({
  meta_id: z.union([z.string(), z.number()]),
  user_id: z.union([z.string(), z.number()]),
  valor: z.number().int().nonnegative(),
});

router.post(
  "/vendedor",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const data = parseBody(metaVendedorSchema, req, res);
    if (!data) return;
    const empresaId = req.user!.empresa_id!;
    const mv = await prisma.metaVendedor.upsert({
      where: { meta_id_user_id: { meta_id: BigInt(data.meta_id), user_id: BigInt(data.user_id) } },
      update: { valor: data.valor },
      create: {
        meta_id: BigInt(data.meta_id),
        user_id: BigInt(data.user_id),
        valor: data.valor,
        empresa_id: empresaId,
      },
    });
    res.json(serialize(mv));
  })
);

export default router;
