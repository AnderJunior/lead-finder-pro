import { Router } from "express";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middlewares/auth.js";
import { asyncHandler, paginationParams, parseBody, requireEmpresa } from "../lib/helpers.js";
import { serialize } from "../lib/serialize.js";
import { debitCredits } from "../lib/creditos.js";

const router = Router();
router.use(authenticate, requireEmpresa);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { skip, take, page, pageSize } = paginationParams(req);
    const where: Prisma.BuscaRealizadaWhereInput = {};
    if (req.user!.role === "super_admin") {
      if (req.query.empresa_id) where.empresa_id = BigInt(String(req.query.empresa_id));
    } else {
      where.empresa_id = req.user!.empresa_id!;
      if (req.user!.role !== "admin") where.user_id = req.user!.id;
    }
    if (req.query.user_id) where.user_id = BigInt(String(req.query.user_id));
    if (req.query.search) {
      const q = String(req.query.search);
      where.OR = [
        { segmento: { contains: q, mode: "insensitive" } },
        { localizacao: { contains: q, mode: "insensitive" } },
        { tipo_pesquisa: { contains: q, mode: "insensitive" } },
      ];
    }
    if (req.query.data_de || req.query.data_ate) {
      where.created_at = {};
      if (req.query.data_de) (where.created_at as any).gte = new Date(String(req.query.data_de));
      if (req.query.data_ate) (where.created_at as any).lte = new Date(String(req.query.data_ate));
    }

    const [items, total] = await Promise.all([
      prisma.buscaRealizada.findMany({
        where,
        skip,
        take,
        orderBy: { created_at: "desc" },
        include: { user: { select: { id: true, nome: true, email: true } } },
      }),
      prisma.buscaRealizada.count({ where }),
    ]);
    res.json({ items: serialize(items), total, page, pageSize });
  })
);

const createSchema = z.object({
  segmento: z.string().nullable().optional(),
  localizacao: z.string().nullable().optional(),
  tipo_pesquisa: z.string().nullable().optional(),
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = parseBody(createSchema, req, res);
    if (!data) return;
    // Cada busca consome 1 crédito (super admin não consome)
    await debitCredits(req.user!.empresa_id, 1);
    const busca = await prisma.buscaRealizada.create({
      data: {
        ...data,
        user_id: req.user!.id,
        empresa_id: req.user!.empresa_id!,
      },
    });
    res.status(201).json(serialize(busca));
  })
);

export default router;
