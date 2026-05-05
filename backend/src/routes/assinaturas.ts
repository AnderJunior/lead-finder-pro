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
  asyncHandler(async (req, res) => {
    const where: any = {};
    if (req.user!.role === "super_admin") {
      if (req.query.empresa_id) where.empresa_id = BigInt(String(req.query.empresa_id));
    } else {
      if (!req.user!.empresa_id) {
        res.json([]);
        return;
      }
      where.empresa_id = req.user!.empresa_id;
    }
    const items = await prisma.assinatura.findMany({
      where,
      orderBy: { created_at: "desc" },
      include: {
        plano: true,
        empresa: { select: { id: true, nome: true } },
        pagamentos: { orderBy: { data_vencimento: "desc" } },
      },
    });
    res.json(serialize(items));
  })
);

const schema = z.object({
  empresa_id: z.union([z.string(), z.number()]),
  plano_id: z.union([z.string(), z.number()]),
  status: z.enum(["ativa", "vencida", "cancelada", "trial", "suspensa"]).optional(),
  ciclo: z.enum(["mensal", "trimestral", "semestral", "anual"]).optional(),
  valor: z.number().nonnegative(),
  data_inicio: z.string().datetime().optional(),
  data_vencimento: z.string().datetime(),
  observacoes: z.string().nullable().optional(),
});

router.post(
  "/",
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const data = parseBody(schema, req, res);
    if (!data) return;
    const a = await prisma.assinatura.create({
      data: {
        empresa_id: BigInt(data.empresa_id),
        plano_id: BigInt(data.plano_id),
        status: data.status || "ativa",
        ciclo: data.ciclo || "mensal",
        valor: data.valor,
        data_inicio: data.data_inicio ? new Date(data.data_inicio) : new Date(),
        data_vencimento: new Date(data.data_vencimento),
        observacoes: data.observacoes || null,
      },
    });
    res.status(201).json(serialize(a));
  })
);

router.put(
  "/:id",
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const id = asBigInt(req.params.id);
    const data = parseBody(schema.partial(), req, res);
    if (!data) return;
    const updateData: any = { ...data };
    if (data.empresa_id) updateData.empresa_id = BigInt(data.empresa_id);
    if (data.plano_id) updateData.plano_id = BigInt(data.plano_id);
    if (data.data_inicio) updateData.data_inicio = new Date(data.data_inicio);
    if (data.data_vencimento) updateData.data_vencimento = new Date(data.data_vencimento);
    const updated = await prisma.assinatura.update({ where: { id }, data: updateData });
    res.json(serialize(updated));
  })
);

router.delete(
  "/:id",
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const id = asBigInt(req.params.id);
    await prisma.assinatura.delete({ where: { id } });
    res.json({ ok: true });
  })
);

export default router;
