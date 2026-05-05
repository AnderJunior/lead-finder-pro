import { Router } from "express";
import { prisma } from "../lib/prisma.js";
import { authenticate } from "../middlewares/auth.js";
import { asyncHandler, requireEmpresa } from "../lib/helpers.js";
import { serialize } from "../lib/serialize.js";

const router = Router();
router.use(authenticate, requireEmpresa);

/**
 * GET /api/ranking?desde=ISO_DATE
 * Retorna ranking de vendedores (apenas role=user) na empresa.
 * Métricas: total de leads captados, qualificados (status_funil != em_andamento), buscas, etc.
 */
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const empresaId =
      req.user!.role === "super_admin" && req.query.empresa_id
        ? BigInt(String(req.query.empresa_id))
        : req.user!.empresa_id!;
    const desde = req.query.desde ? new Date(String(req.query.desde)) : new Date(0);

    const vendedores = await prisma.user.findMany({
      where: { empresa_id: empresaId, role: "user" },
      select: { id: true, nome: true, email: true, avatar_url: true },
    });

    const ranking = await Promise.all(
      vendedores.map(async (v) => {
        const [leads, qualificados, buscas] = await Promise.all([
          prisma.lead.count({
            where: { user_id: v.id, empresa_id: empresaId, data_captacao: { gte: desde } },
          }),
          prisma.lead.count({
            where: {
              user_id: v.id,
              empresa_id: empresaId,
              etapa_id: { not: null },
              data_captacao: { gte: desde },
            },
          }),
          prisma.buscaRealizada.count({
            where: { user_id: v.id, empresa_id: empresaId, created_at: { gte: desde } },
          }),
        ]);
        return {
          id: v.id.toString(),
          nome: v.nome,
          email: v.email,
          avatar_url: v.avatar_url,
          leads,
          qualificados,
          buscas,
        };
      })
    );

    ranking.sort((a, b) => b.leads - a.leads);
    res.json(serialize(ranking));
  })
);

export default router;
