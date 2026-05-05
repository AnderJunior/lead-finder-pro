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
    if (req.query.assinatura_id) where.assinatura_id = BigInt(String(req.query.assinatura_id));
    if (req.query.status) where.status = req.query.status;
    const items = await prisma.pagamento.findMany({
      where,
      orderBy: { data_vencimento: "desc" },
      include: { empresa: { select: { id: true, nome: true } } },
    });
    res.json(serialize(items));
  })
);

const schema = z.object({
  assinatura_id: z.union([z.string(), z.number()]),
  empresa_id: z.union([z.string(), z.number()]),
  valor: z.number().positive(),
  status: z.enum(["pendente", "pago", "atrasado", "cancelado"]).optional(),
  data_vencimento: z.string().datetime(),
  data_pagamento: z.string().datetime().nullable().optional(),
  metodo_pagamento: z.string().nullable().optional(),
  referencia: z.string().nullable().optional(),
  observacoes: z.string().nullable().optional(),
});

router.post(
  "/",
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const data = parseBody(schema, req, res);
    if (!data) return;
    const p = await prisma.pagamento.create({
      data: {
        assinatura_id: BigInt(data.assinatura_id),
        empresa_id: BigInt(data.empresa_id),
        valor: data.valor,
        status: data.status || "pendente",
        data_vencimento: new Date(data.data_vencimento),
        data_pagamento: data.data_pagamento ? new Date(data.data_pagamento) : null,
        metodo_pagamento: data.metodo_pagamento || null,
        referencia: data.referencia || null,
        observacoes: data.observacoes || null,
      },
    });
    res.status(201).json(serialize(p));
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
    if (data.assinatura_id) updateData.assinatura_id = BigInt(data.assinatura_id);
    if (data.empresa_id) updateData.empresa_id = BigInt(data.empresa_id);
    if (data.data_vencimento) updateData.data_vencimento = new Date(data.data_vencimento);
    if (data.data_pagamento !== undefined) {
      updateData.data_pagamento = data.data_pagamento ? new Date(data.data_pagamento) : null;
    }
    const updated = await prisma.pagamento.update({ where: { id }, data: updateData });
    res.json(serialize(updated));
  })
);

router.delete(
  "/:id",
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const id = asBigInt(req.params.id);
    await prisma.pagamento.delete({ where: { id } });
    res.json({ ok: true });
  })
);

export default router;
