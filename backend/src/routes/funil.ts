import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireAdmin } from "../middlewares/auth.js";
import { asBigInt, asyncHandler, parseBody, requireEmpresa } from "../lib/helpers.js";
import { serialize } from "../lib/serialize.js";

const router = Router();
router.use(authenticate, requireEmpresa);

// ════════════════════════════════════════════════════════════════════════════
// ETAPAS
// ════════════════════════════════════════════════════════════════════════════

router.get(
  "/etapas",
  asyncHandler(async (req, res) => {
    const empresaId =
      req.user!.role === "super_admin" && req.query.empresa_id
        ? BigInt(String(req.query.empresa_id))
        : req.user!.empresa_id!;
    const etapas = await prisma.funilEtapa.findMany({
      where: { empresa_id: empresaId },
      orderBy: { ordem: "asc" },
    });
    res.json(serialize(etapas));
  })
);

const etapaSchema = z.object({
  nome: z.string().min(1),
  cor: z.string().optional(),
  ordem: z.number().int().optional(),
});

router.post(
  "/etapas",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const data = parseBody(etapaSchema, req, res);
    if (!data) return;
    const empresaId = req.user!.empresa_id!;
    const lastOrdem = await prisma.funilEtapa.findFirst({
      where: { empresa_id: empresaId },
      orderBy: { ordem: "desc" },
      select: { ordem: true },
    });
    const etapa = await prisma.funilEtapa.create({
      data: {
        nome: data.nome,
        cor: data.cor || "#3b82f6",
        ordem: data.ordem ?? (lastOrdem ? lastOrdem.ordem + 1 : 0),
        user_id: req.user!.id,
        empresa_id: empresaId,
      },
    });
    res.status(201).json(serialize(etapa));
  })
);

router.put(
  "/etapas/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = asBigInt(req.params.id);
    const etapa = await prisma.funilEtapa.findUnique({ where: { id } });
    if (!etapa) {
      res.status(404).json({ error: "Etapa não encontrada" });
      return;
    }
    if (req.user!.role !== "super_admin" && etapa.empresa_id !== req.user!.empresa_id) {
      res.status(403).json({ error: "Sem permissão" });
      return;
    }
    const data = parseBody(etapaSchema.partial(), req, res);
    if (!data) return;
    const updated = await prisma.funilEtapa.update({ where: { id }, data });
    res.json(serialize(updated));
  })
);

router.delete(
  "/etapas/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = asBigInt(req.params.id);
    const etapa = await prisma.funilEtapa.findUnique({ where: { id } });
    if (!etapa) {
      res.status(404).json({ error: "Etapa não encontrada" });
      return;
    }
    if (req.user!.role !== "super_admin" && etapa.empresa_id !== req.user!.empresa_id) {
      res.status(403).json({ error: "Sem permissão" });
      return;
    }
    await prisma.funilEtapa.delete({ where: { id } });
    res.json({ ok: true });
  })
);

// REORDER
const reorderSchema = z.object({ ids: z.array(z.union([z.string(), z.number()])).min(1) });
router.post(
  "/etapas/reorder",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const data = parseBody(reorderSchema, req, res);
    if (!data) return;
    await prisma.$transaction(
      data.ids.map((id, idx) =>
        prisma.funilEtapa.update({ where: { id: BigInt(id) }, data: { ordem: idx } })
      )
    );
    res.json({ ok: true });
  })
);

// ════════════════════════════════════════════════════════════════════════════
// TAREFAS
// ════════════════════════════════════════════════════════════════════════════

router.get(
  "/tarefas",
  asyncHandler(async (req, res) => {
    const where: any = {};
    if (req.user!.role === "super_admin") {
      if (req.query.empresa_id) where.empresa_id = BigInt(String(req.query.empresa_id));
    } else {
      where.empresa_id = req.user!.empresa_id!;
    }
    if (req.query.lead_id) where.lead_id = BigInt(String(req.query.lead_id));
    if (req.query.concluida) where.concluida = req.query.concluida === "true";

    const tarefas = await prisma.funilTarefa.findMany({
      where,
      orderBy: [{ concluida: "asc" }, { data_vencimento: "asc" }],
      include: { lead: { select: { id: true, nome: true } } },
    });
    res.json(serialize(tarefas));
  })
);

const tarefaSchema = z.object({
  lead_id: z.union([z.string(), z.number()]),
  descricao: z.string().min(1),
  data_vencimento: z.string().datetime().nullable().optional(),
});

router.post(
  "/tarefas",
  asyncHandler(async (req, res) => {
    const data = parseBody(tarefaSchema, req, res);
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
    const tarefa = await prisma.funilTarefa.create({
      data: {
        lead_id: leadId,
        descricao: data.descricao,
        data_vencimento: data.data_vencimento ? new Date(data.data_vencimento) : null,
        empresa_id: lead.empresa_id,
      },
    });
    res.status(201).json(serialize(tarefa));
  })
);

const tarefaUpdateSchema = z.object({
  descricao: z.string().optional(),
  data_vencimento: z.string().datetime().nullable().optional(),
  concluida: z.boolean().optional(),
});

router.put(
  "/tarefas/:id",
  asyncHandler(async (req, res) => {
    const id = asBigInt(req.params.id);
    const tarefa = await prisma.funilTarefa.findUnique({ where: { id } });
    if (!tarefa) {
      res.status(404).json({ error: "Tarefa não encontrada" });
      return;
    }
    if (req.user!.role !== "super_admin" && tarefa.empresa_id !== req.user!.empresa_id) {
      res.status(403).json({ error: "Sem permissão" });
      return;
    }
    const data = parseBody(tarefaUpdateSchema, req, res);
    if (!data) return;
    const updateData: any = { ...data };
    if (data.data_vencimento !== undefined) {
      updateData.data_vencimento = data.data_vencimento ? new Date(data.data_vencimento) : null;
    }
    if (data.concluida !== undefined) {
      updateData.concluida_em = data.concluida ? new Date() : null;
      updateData.concluida_por_user_id = data.concluida ? req.user!.id : null;
    }
    const updated = await prisma.funilTarefa.update({ where: { id }, data: updateData });
    res.json(serialize(updated));
  })
);

router.delete(
  "/tarefas/:id",
  asyncHandler(async (req, res) => {
    const id = asBigInt(req.params.id);
    const tarefa = await prisma.funilTarefa.findUnique({ where: { id } });
    if (!tarefa) {
      res.status(404).json({ error: "Tarefa não encontrada" });
      return;
    }
    if (req.user!.role !== "super_admin" && tarefa.empresa_id !== req.user!.empresa_id) {
      res.status(403).json({ error: "Sem permissão" });
      return;
    }
    await prisma.funilTarefa.delete({ where: { id } });
    res.json({ ok: true });
  })
);

// ════════════════════════════════════════════════════════════════════════════
// AUTOMAÇÕES
// ════════════════════════════════════════════════════════════════════════════

router.get(
  "/automacoes",
  asyncHandler(async (req, res) => {
    const empresaId =
      req.user!.role === "super_admin" && req.query.empresa_id
        ? BigInt(String(req.query.empresa_id))
        : req.user!.empresa_id!;
    const where: any = { empresa_id: empresaId };
    if (req.query.etapa_id) where.etapa_id = BigInt(String(req.query.etapa_id));
    const items = await prisma.funilAutomacao.findMany({ where, orderBy: { ordem: "asc" } });
    res.json(serialize(items));
  })
);

const automacaoSchema = z.object({
  etapa_id: z.union([z.string(), z.number()]),
  descricao: z.string().min(1),
  dias_vencimento: z.number().int().nonnegative().optional(),
  ordem: z.number().int().optional(),
});

router.post(
  "/automacoes",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const data = parseBody(automacaoSchema, req, res);
    if (!data) return;
    const etapaId = BigInt(data.etapa_id);
    const etapa = await prisma.funilEtapa.findUnique({ where: { id: etapaId } });
    if (!etapa) {
      res.status(404).json({ error: "Etapa não encontrada" });
      return;
    }
    if (req.user!.role !== "super_admin" && etapa.empresa_id !== req.user!.empresa_id) {
      res.status(403).json({ error: "Sem permissão" });
      return;
    }
    const a = await prisma.funilAutomacao.create({
      data: {
        etapa_id: etapaId,
        descricao: data.descricao,
        dias_vencimento: data.dias_vencimento ?? 0,
        ordem: data.ordem ?? 0,
        empresa_id: etapa.empresa_id,
      },
    });
    res.status(201).json(serialize(a));
  })
);

router.delete(
  "/automacoes/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = asBigInt(req.params.id);
    const a = await prisma.funilAutomacao.findUnique({ where: { id } });
    if (!a) {
      res.status(404).json({ error: "Automação não encontrada" });
      return;
    }
    if (req.user!.role !== "super_admin" && a.empresa_id !== req.user!.empresa_id) {
      res.status(403).json({ error: "Sem permissão" });
      return;
    }
    await prisma.funilAutomacao.delete({ where: { id } });
    res.json({ ok: true });
  })
);

// ════════════════════════════════════════════════════════════════════════════
// LOGS (read-only para admin/user)
// ════════════════════════════════════════════════════════════════════════════

router.get(
  "/logs",
  asyncHandler(async (req, res) => {
    const where: any = {};
    if (req.user!.role !== "super_admin") where.empresa_id = req.user!.empresa_id!;
    if (req.query.lead_id) where.lead_id = BigInt(String(req.query.lead_id));
    const logs = await prisma.funilLog.findMany({
      where,
      orderBy: { data_entrada: "desc" },
      take: 200,
      include: { etapa: true, user: { select: { id: true, nome: true } } },
    });
    res.json(serialize(logs));
  })
);

export default router;
