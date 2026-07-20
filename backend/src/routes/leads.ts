import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireAdmin } from "../middlewares/auth.js";
import { asBigInt, asyncHandler, paginationParams, parseBody, requireEmpresa } from "../lib/helpers.js";
import { serialize } from "../lib/serialize.js";
import { debitCredits } from "../lib/creditos.js";

const router = Router();
router.use(authenticate, requireEmpresa);

// ─── Função utilitária: filtro base por empresa/user ───────────────────────
function baseWhere(req: any): Prisma.LeadWhereInput {
  const where: Prisma.LeadWhereInput = {};
  if (req.user.role === "super_admin") {
    if (req.query.empresa_id) where.empresa_id = BigInt(String(req.query.empresa_id));
  } else {
    where.empresa_id = req.user.empresa_id!;
    if (req.user.role !== "admin") where.user_id = req.user.id;
  }
  return where;
}

// ─── LIST com filtros ──────────────────────────────────────────────────────
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { skip, take, page, pageSize } = paginationParams(req);
    const where = baseWhere(req);

    if (req.query.search) {
      const q = String(req.query.search);
      where.OR = [
        { nome: { contains: q, mode: "insensitive" } },
        { telefone: { contains: q } },
        { email: { contains: q, mode: "insensitive" } },
        { segmento_busca: { contains: q, mode: "insensitive" } },
        { localizacao_busca: { contains: q, mode: "insensitive" } },
      ];
    }
    if (req.query.has_whatsapp) {
      const v = String(req.query.has_whatsapp);
      if (v === "true") where.has_whatsapp = true;
      else if (v === "false") where.has_whatsapp = false;
      else if (v === "null") where.has_whatsapp = null;
    }
    if (req.query.user_id) where.user_id = BigInt(String(req.query.user_id));
    if (req.query.etapa_id) where.etapa_id = BigInt(String(req.query.etapa_id));
    if (req.query.origem_busca) where.origem_busca = String(req.query.origem_busca);
    if (req.query.segmento_busca) where.segmento_busca = String(req.query.segmento_busca);
    if (req.query.localizacao_busca) where.localizacao_busca = String(req.query.localizacao_busca);
    if (req.query.data_de || req.query.data_ate) {
      where.data_captacao = {};
      if (req.query.data_de) (where.data_captacao as any).gte = new Date(String(req.query.data_de));
      if (req.query.data_ate) (where.data_captacao as any).lte = new Date(String(req.query.data_ate));
    }

    const [items, total] = await Promise.all([
      prisma.lead.findMany({
        where,
        skip,
        take,
        orderBy: { data_captacao: "desc" },
        include: { user: { select: { id: true, nome: true, email: true } }, etapa: true },
      }),
      prisma.lead.count({ where }),
    ]);
    res.json({ items: serialize(items), total, page, pageSize });
  })
);

// ─── GET ONE ───────────────────────────────────────────────────────────────
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = asBigInt(req.params.id);
    const lead = await prisma.lead.findUnique({
      where: { id },
      include: {
        user: { select: { id: true, nome: true, email: true } },
        etapa: true,
        tarefas: { orderBy: { data_vencimento: "asc" } },
        anotacoes: { orderBy: { created_at: "desc" }, include: { user: { select: { id: true, nome: true, email: true } } } },
        logs: { orderBy: { data_entrada: "desc" }, include: { etapa: true, user: { select: { id: true, nome: true } } } },
      },
    });
    if (!lead) {
      res.status(404).json({ error: "Lead não encontrado" });
      return;
    }
    if (req.user!.role !== "super_admin" && lead.empresa_id !== req.user!.empresa_id) {
      res.status(403).json({ error: "Sem permissão" });
      return;
    }
    res.json(serialize(lead));
  })
);

// ─── CREATE (single) ───────────────────────────────────────────────────────
const leadSchema = z.object({
  nome: z.string().min(1),
  endereco: z.string().nullable().optional(),
  telefone: z.string().nullable().optional(),
  email: z.string().nullable().optional(),
  website: z.string().nullable().optional(),
  rating: z.number().nullable().optional(),
  avaliacoes: z.number().int().optional(),
  has_whatsapp: z.boolean().nullable().optional(),
  whatsapp_status: z.string().nullable().optional(),
  tags: z.array(z.string()).optional(),
  origem_busca: z.string().nullable().optional(),
  segmento_busca: z.string().nullable().optional(),
  localizacao_busca: z.string().nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = parseBody(leadSchema, req, res);
    if (!data) return;
    const empresaId = req.user!.empresa_id!;

    // Exige funil configurado
    const primeiraEtapa = await prisma.funilEtapa.findFirst({
      where: { empresa_id: empresaId },
      orderBy: { ordem: "asc" },
    });
    if (!primeiraEtapa) {
      res.status(400).json({
        error:
          "Funil não configurado. Crie pelo menos uma etapa em Funil → Configurações antes de captar leads.",
        code: "FUNIL_NAO_CONFIGURADO",
      });
      return;
    }

    // Cada lead captado consome 1 crédito
    await debitCredits(empresaId, 1, { role: req.user!.role });

    const lead = await prisma.lead.create({
      data: {
        ...data,
        user_id: req.user!.id,
        empresa_id: empresaId,
        etapa_id: primeiraEtapa.id,
        status_funil: "em_andamento",
      },
    });

    await prisma.funilLog.create({
      data: {
        lead_id: lead.id,
        etapa_id: primeiraEtapa.id,
        user_id: req.user!.id,
        empresa_id: empresaId,
      },
    });

    res.status(201).json(serialize(lead));
  })
);

// ─── BULK CREATE (captação) ────────────────────────────────────────────────
const bulkSchema = z.object({ leads: z.array(leadSchema).min(1).max(500) });

router.post(
  "/bulk",
  asyncHandler(async (req, res) => {
    const data = parseBody(bulkSchema, req, res);
    if (!data) return;
    const empresaId = req.user!.empresa_id!;

    // 1) Exige que o funil esteja configurado
    const primeiraEtapa = await prisma.funilEtapa.findFirst({
      where: { empresa_id: empresaId },
      orderBy: { ordem: "asc" },
    });
    if (!primeiraEtapa) {
      res.status(400).json({
        error:
          "Funil não configurado. Crie pelo menos uma etapa em Funil → Configurações antes de captar leads.",
        code: "FUNIL_NAO_CONFIGURADO",
      });
      return;
    }

    // 2) Debita créditos (somente após validação do funil)
    await debitCredits(empresaId, data.leads.length, { role: req.user!.role });

    const inserted = await prisma.lead.createManyAndReturn({
      data: data.leads.map((l, i) => ({
        ...l,
        user_id: req.user!.id,
        empresa_id: empresaId,
        etapa_id: primeiraEtapa.id,
        status_funil: "em_andamento",
        ordem_funil: i,
      })),
    });

    // Log de movimentação para cada lead
    await prisma.funilLog.createMany({
      data: inserted.map((lead) => ({
        lead_id: lead.id,
        etapa_id: primeiraEtapa.id,
        user_id: req.user!.id,
        empresa_id: empresaId,
      })),
    });

    // Executa automações da primeira etapa (cria tarefas automáticas)
    const automacoes = await prisma.funilAutomacao.findMany({
      where: { etapa_id: primeiraEtapa.id, empresa_id: empresaId },
    });
    if (automacoes.length > 0) {
      const tarefasData = inserted.flatMap((lead) =>
        automacoes.map((a) => ({
          lead_id: lead.id,
          descricao: a.descricao,
          data_vencimento:
            a.dias_vencimento > 0
              ? new Date(Date.now() + a.dias_vencimento * 86_400_000)
              : null,
          empresa_id: empresaId,
        }))
      );
      await prisma.funilTarefa.createMany({ data: tarefasData });
    }

    res.status(201).json({ count: inserted.length, items: serialize(inserted) });
  })
);

// ─── ENRICH (custa 2 créditos) ─────────────────────────────────────────────
const enrichSchema = z.object({
  decisor_nome: z.string().nullable().optional(),
  decisor_telefone: z.string().nullable().optional(),
  decisor_email: z.string().nullable().optional(),
  decisor_cargo: z.string().nullable().optional(),
  tamanho_empresa: z.string().nullable().optional(),
  linkedin_url: z.string().nullable().optional(),
  facebook_url: z.string().nullable().optional(),
  instagram_url: z.string().nullable().optional(),
});

router.post(
  "/:id/enrich",
  asyncHandler(async (req, res) => {
    const id = asBigInt(req.params.id);
    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) {
      res.status(404).json({ error: "Lead não encontrado" });
      return;
    }
    if (req.user!.role !== "super_admin" && lead.empresa_id !== req.user!.empresa_id) {
      res.status(403).json({ error: "Sem permissão" });
      return;
    }
    const data = parseBody(enrichSchema, req, res);
    if (!data) return;

    // Enriquecimento custa 2 créditos
    await debitCredits(req.user!.empresa_id, 2, { role: req.user!.role });

    const updated = await prisma.lead.update({
      where: { id },
      data: { ...data, decisor_enriquecido_em: new Date() },
    });
    res.json(serialize(updated));
  })
);

// ─── UPDATE ────────────────────────────────────────────────────────────────
const updateSchema = leadSchema.partial().extend({
  etapa_id: z.number().nullable().optional(),
  status_funil: z.string().optional(),
  ordem_funil: z.number().int().optional(),
  valor: z.number().optional(),
  contato: z.string().nullable().optional(),
  notas: z.string().nullable().optional(),
  decisor_nome: z.string().nullable().optional(),
  decisor_telefone: z.string().nullable().optional(),
  decisor_email: z.string().nullable().optional(),
  decisor_cargo: z.string().nullable().optional(),
  decisor_enriquecido_em: z.string().datetime().nullable().optional(),
  tamanho_empresa: z.string().nullable().optional(),
  linkedin_url: z.string().nullable().optional(),
  facebook_url: z.string().nullable().optional(),
  instagram_url: z.string().nullable().optional(),
});

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = asBigInt(req.params.id);
    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) {
      res.status(404).json({ error: "Lead não encontrado" });
      return;
    }
    if (req.user!.role !== "super_admin" && lead.empresa_id !== req.user!.empresa_id) {
      res.status(403).json({ error: "Sem permissão" });
      return;
    }
    const data = parseBody(updateSchema, req, res);
    if (!data) return;
    const updateData: any = { ...data };
    if (data.etapa_id !== undefined) updateData.etapa_id = data.etapa_id === null ? null : BigInt(data.etapa_id);
    if (data.decisor_enriquecido_em) updateData.decisor_enriquecido_em = new Date(data.decisor_enriquecido_em);
    const updated = await prisma.lead.update({ where: { id }, data: updateData });
    res.json(serialize(updated));
  })
);

// ─── MOVE ETAPA (com log) ──────────────────────────────────────────────────
const moveSchema = z.object({ etapa_id: z.number().nullable() });

router.post(
  "/:id/move",
  asyncHandler(async (req, res) => {
    const id = asBigInt(req.params.id);
    const data = parseBody(moveSchema, req, res);
    if (!data) return;
    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) {
      res.status(404).json({ error: "Lead não encontrado" });
      return;
    }
    if (req.user!.role !== "super_admin" && lead.empresa_id !== req.user!.empresa_id) {
      res.status(403).json({ error: "Sem permissão" });
      return;
    }
    const newEtapaId = data.etapa_id ? BigInt(data.etapa_id) : null;
    const updated = await prisma.$transaction(async (tx) => {
      const upd = await tx.lead.update({ where: { id }, data: { etapa_id: newEtapaId } });
      if (newEtapaId) {
        await tx.funilLog.create({
          data: {
            lead_id: id,
            etapa_id: newEtapaId,
            user_id: req.user!.id,
            empresa_id: lead.empresa_id,
          },
        });
      }
      return upd;
    });
    res.json(serialize(updated));
  })
);

// ─── DELETE ────────────────────────────────────────────────────────────────
router.delete(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = asBigInt(req.params.id);
    const lead = await prisma.lead.findUnique({ where: { id } });
    if (!lead) {
      res.status(404).json({ error: "Lead não encontrado" });
      return;
    }
    if (
      req.user!.role !== "super_admin" &&
      (lead.empresa_id !== req.user!.empresa_id ||
        (req.user!.role !== "admin" && lead.user_id !== req.user!.id))
    ) {
      res.status(403).json({ error: "Sem permissão" });
      return;
    }
    await prisma.lead.delete({ where: { id } });
    res.json({ ok: true });
  })
);

// ─── BULK DELETE ───────────────────────────────────────────────────────────
const bulkDeleteSchema = z.object({ ids: z.array(z.number().or(z.string())).min(1) });

router.post(
  "/bulk-delete",
  asyncHandler(async (req, res) => {
    const data = parseBody(bulkDeleteSchema, req, res);
    if (!data) return;
    const ids = data.ids.map((i) => BigInt(i));
    const where: Prisma.LeadWhereInput = { id: { in: ids } };
    if (req.user!.role !== "super_admin") {
      where.empresa_id = req.user!.empresa_id!;
      if (req.user!.role !== "admin") where.user_id = req.user!.id;
    }
    const result = await prisma.lead.deleteMany({ where });
    res.json({ count: result.count });
  })
);

// ─── CHECK DUPLICATES ──────────────────────────────────────────────────────
const checkSchema = z.object({
  telefones: z.array(z.string()).optional(),
  nomes: z.array(z.string()).optional(),
});

router.post(
  "/check-duplicates",
  asyncHandler(async (req, res) => {
    const data = parseBody(checkSchema, req, res);
    if (!data) return;
    const where: Prisma.LeadWhereInput = {
      empresa_id: req.user!.role === "super_admin" ? undefined : req.user!.empresa_id!,
      OR: [],
    };
    if (data.telefones?.length) where.OR!.push({ telefone: { in: data.telefones } });
    if (data.nomes?.length) {
      where.OR!.push({ nome: { in: data.nomes, mode: "insensitive" as any } });
    }
    if (!where.OR!.length) {
      res.json({ telefones: [], nomes: [] });
      return;
    }
    const found = await prisma.lead.findMany({
      where,
      select: { telefone: true, nome: true },
    });
    const telefones = new Set(found.map((f) => f.telefone).filter(Boolean));
    const nomes = new Set(found.map((f) => f.nome.toLowerCase()));
    res.json({ telefones: Array.from(telefones), nomes: Array.from(nomes) });
  })
);

export default router;
