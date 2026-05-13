/**
 * CRUD de administradores (super_admin).
 * Apenas super admins podem gerenciar outros super admins.
 */
import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireSuperAdmin } from "../middlewares/auth.js";
import { asBigInt, asyncHandler, parseBody } from "../lib/helpers.js";
import { hashPassword } from "../lib/auth.js";
import { publicUser } from "../lib/serialize.js";

const router = Router();
router.use(authenticate, requireSuperAdmin);

// ─── LIST ──────────────────────────────────────────────────────────────────
router.get(
  "/",
  asyncHandler(async (_req, res) => {
    const admins = await prisma.user.findMany({
      where: { role: "super_admin" },
      orderBy: { created_at: "asc" },
      select: {
        id: true,
        email: true,
        nome: true,
        telefone: true,
        avatar_url: true,
        status: true,
        role: true,
        created_at: true,
        updated_at: true,
      },
    });
    res.json(admins.map((u) => publicUser(u)));
  })
);

// ─── CREATE ────────────────────────────────────────────────────────────────
const createSchema = z.object({
  email: z.string().email(),
  nome: z.string().min(1),
  password: z.string().min(6),
  telefone: z.string().nullable().optional(),
});

router.post(
  "/",
  asyncHandler(async (req, res) => {
    const data = parseBody(createSchema, req, res);
    if (!data) return;
    const email = data.email.toLowerCase();
    const exists = await prisma.user.findUnique({ where: { email } });
    if (exists) {
      res.status(409).json({ error: "Email já em uso" });
      return;
    }
    const hash = await hashPassword(data.password);
    const created = await prisma.user.create({
      data: {
        email,
        nome: data.nome,
        telefone: data.telefone || null,
        password_hash: hash,
        role: "super_admin",
        empresa_id: null,
        // Super admin não precisa ver o onboarding video
        onboarding_video_watched: true,
        onboarding_video_watched_at: new Date(),
      },
    });
    res.status(201).json(publicUser(created));
  })
);

// ─── UPDATE ────────────────────────────────────────────────────────────────
const updateSchema = z.object({
  nome: z.string().min(1).optional(),
  telefone: z.string().nullable().optional(),
  avatar_url: z.string().nullable().optional(),
  status: z.enum(["ativo", "inativo"]).optional(),
  password: z.string().min(6).optional(),
});

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = asBigInt(req.params.id);
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target || target.role !== "super_admin") {
      res.status(404).json({ error: "Super admin não encontrado" });
      return;
    }
    const data = parseBody(updateSchema, req, res);
    if (!data) return;
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
  asyncHandler(async (req, res) => {
    const id = asBigInt(req.params.id);
    if (req.user!.id === id) {
      res.status(400).json({ error: "Você não pode deletar a si mesmo" });
      return;
    }
    const target = await prisma.user.findUnique({ where: { id } });
    if (!target || target.role !== "super_admin") {
      res.status(404).json({ error: "Super admin não encontrado" });
      return;
    }
    // Garante pelo menos 1 super admin no sistema
    const count = await prisma.user.count({ where: { role: "super_admin" } });
    if (count <= 1) {
      res.status(400).json({ error: "Não é possível remover o último super admin do sistema" });
      return;
    }
    await prisma.user.delete({ where: { id } });
    res.json({ ok: true });
  })
);

export default router;
