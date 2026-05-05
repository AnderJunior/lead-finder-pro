import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middlewares/auth.js";
import { asBigInt, asyncHandler, parseBody, requireEmpresa } from "../lib/helpers.js";
import { serialize } from "../lib/serialize.js";

const router = Router();
router.use(authenticate, requireEmpresa);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const where: any = {};
    if (req.user!.role !== "super_admin") where.empresa_id = req.user!.empresa_id!;
    if (req.query.lead_id) where.lead_id = BigInt(String(req.query.lead_id));
    const items = await prisma.leadAnotacao.findMany({
      where,
      orderBy: { created_at: "desc" },
      include: { user: { select: { id: true, nome: true, email: true } } },
    });
    res.json(serialize(items));
  })
);

const createSchema = z.object({
  lead_id: z.union([z.string(), z.number()]),
  texto: z.string().min(1),
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = parseBody(createSchema, req, res);
    if (!data) return;
    const leadId = BigInt(data.lead_id);
    const lead = await prisma.lead.findUnique({ where: { id: leadId } });
    if (!lead) {
      res.status(404).json({ error: "Lead não encontrado" });
      return;
    }
    if (req.user!.role !== "super_admin" && lead.empresa_id !== req.user!.empresa_id) {
      res.status(403).json({ error: "Sem permissão" });
      return;
    }
    const a = await prisma.leadAnotacao.create({
      data: {
        lead_id: leadId,
        texto: data.texto,
        user_id: req.user!.id,
        empresa_id: lead.empresa_id,
      },
    });
    res.status(201).json(serialize(a));
  })
);

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = asBigInt(req.params.id);
    const a = await prisma.leadAnotacao.findUnique({ where: { id } });
    if (!a) {
      res.status(404).json({ error: "Anotação não encontrada" });
      return;
    }
    if (req.user!.role !== "super_admin" && a.user_id !== req.user!.id) {
      res.status(403).json({ error: "Sem permissão" });
      return;
    }
    const texto = z.object({ texto: z.string().min(1) }).safeParse(req.body);
    if (!texto.success) {
      res.status(400).json({ error: "Texto obrigatório" });
      return;
    }
    const updated = await prisma.leadAnotacao.update({
      where: { id },
      data: { texto: texto.data.texto },
    });
    res.json(serialize(updated));
  })
);

router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = asBigInt(req.params.id);
    const a = await prisma.leadAnotacao.findUnique({ where: { id } });
    if (!a) {
      res.status(404).json({ error: "Anotação não encontrada" });
      return;
    }
    if (req.user!.role !== "super_admin" && a.user_id !== req.user!.id) {
      res.status(403).json({ error: "Sem permissão" });
      return;
    }
    await prisma.leadAnotacao.delete({ where: { id } });
    res.json({ ok: true });
  })
);

export default router;
