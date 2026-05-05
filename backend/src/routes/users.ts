import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireAdmin } from "../middlewares/auth.js";
import { asBigInt, asyncHandler, parseBody } from "../lib/helpers.js";
import { hashPassword } from "../lib/auth.js";
import { publicUser, serialize } from "../lib/serialize.js";

const router = Router();
router.use(authenticate);

// ─── LIST ──────────────────────────────────────────────────────────────────
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const where: any = {};
    if (req.user!.role !== "super_admin") {
      if (!req.user!.empresa_id) {
        res.json([]);
        return;
      }
      where.empresa_id = req.user!.empresa_id;
    } else if (req.query.empresa_id) {
      where.empresa_id = BigInt(String(req.query.empresa_id));
    }

    const users = await prisma.user.findMany({
      where,
      orderBy: { created_at: "asc" },
      include: { empresa: { select: { nome: true } } },
    });
    res.json(serialize(users.map((u) => ({ ...u, password_hash: undefined }))));
  })
);

// ─── GET ONE ───────────────────────────────────────────────────────────────
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = asBigInt(req.params.id);
    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      res.status(404).json({ error: "Usuário não encontrado" });
      return;
    }
    if (req.user!.role !== "super_admin" && user.empresa_id !== req.user!.empresa_id) {
      res.status(403).json({ error: "Sem permissão" });
      return;
    }
    res.json(publicUser(user));
  })
);

// ─── CREATE ────────────────────────────────────────────────────────────────
const createSchema = z.object({
  email: z.string().email(),
  nome: z.string().min(1),
  password: z.string().min(6),
  telefone: z.string().nullable().optional(),
  role: z.enum(["user", "admin"]).default("user"),
  empresa_id: z.number().int().optional(),
});

router.post(
  "/",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const data = parseBody(createSchema, req, res);
    if (!data) return;

    let empresaId: bigint | null = null;
    if (req.user!.role === "super_admin") {
      if (!data.empresa_id) {
        res.status(400).json({ error: "empresa_id obrigatório para super_admin" });
        return;
      }
      empresaId = BigInt(data.empresa_id);
    } else {
      empresaId = req.user!.empresa_id!;
    }

    const exists = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    if (exists) {
      res.status(409).json({ error: "Email já em uso" });
      return;
    }
    const hash = await hashPassword(data.password);
    const user = await prisma.user.create({
      data: {
        email: data.email.toLowerCase(),
        nome: data.nome,
        telefone: data.telefone || null,
        password_hash: hash,
        role: data.role,
        empresa_id: empresaId,
      },
    });
    res.status(201).json(publicUser(user));
  })
);

// ─── UPDATE ────────────────────────────────────────────────────────────────
const updateSchema = z.object({
  nome: z.string().min(1).optional(),
  telefone: z.string().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
  role: z.enum(["user", "admin"]).optional(),
  status: z.enum(["ativo", "inativo"]).optional(),
  password: z.string().min(6).optional(),
});

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = asBigInt(req.params.id);
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      res.status(404).json({ error: "Usuário não encontrado" });
      return;
    }

    const isSelf = target.id === req.user!.id;
    const isSuper = req.user!.role === "super_admin";
    const isAdminSameEmpresa =
      req.user!.role === "admin" && target.empresa_id === req.user!.empresa_id;

    if (!isSelf && !isSuper && !isAdminSameEmpresa) {
      res.status(403).json({ error: "Sem permissão" });
      return;
    }

    const data = parseBody(updateSchema, req, res);
    if (!data) return;

    // Apenas admin/super pode mudar role/status
    if (!isSuper && !isAdminSameEmpresa) {
      delete data.role;
      delete data.status;
    }

    const updateData: any = { ...data };
    if (data.password) {
      updateData.password_hash = await hashPassword(data.password);
      delete updateData.password;
    }

    const updated = await prisma.user.update({ where: { id }, data: updateData });
    res.json(publicUser(updated));
  })
);

// ─── DELETE ────────────────────────────────────────────────────────────────
router.delete(
  "/:id",
  requireAdmin,
  asyncHandler(async (req, res) => {
    const id = asBigInt(req.params.id);
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target) {
      res.status(404).json({ error: "Usuário não encontrado" });
      return;
    }
    if (req.user!.role !== "super_admin" && target.empresa_id !== req.user!.empresa_id) {
      res.status(403).json({ error: "Sem permissão" });
      return;
    }
    if (target.id === req.user!.id) {
      res.status(400).json({ error: "Não pode deletar a si mesmo" });
      return;
    }
    await prisma.user.delete({ where: { id } });
    res.json({ ok: true });
  })
);

export default router;
