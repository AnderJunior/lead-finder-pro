import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import {
  COOKIE_NAME,
  cookieOptions,
  createSession,
  destroySession,
  hashPassword,
  verifyPassword,
} from "../lib/auth.js";
import { authenticate } from "../middlewares/auth.js";
import { publicUser } from "../lib/serialize.js";
import { ensurePersonalEmpresa } from "../lib/helpers.js";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/login", async (req, res) => {
  const parse = loginSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Dados inválidos", details: parse.error.flatten() });
    return;
  }
  const { email, password } = parse.data;

  const user = await prisma.user.findUnique({ where: { email: email.toLowerCase() } });
  if (!user) {
    res.status(401).json({ error: "Email ou senha incorretos" });
    return;
  }
  const ok = await verifyPassword(password, user.password_hash);
  if (!ok) {
    res.status(401).json({ error: "Email ou senha incorretos" });
    return;
  }
  if (user.status !== "ativo") {
    res.status(403).json({ error: "Usuário inativo" });
    return;
  }

  const { token } = await createSession(user.id);
  res.cookie(COOKIE_NAME, token, cookieOptions());
  res.json({ user: publicUser(user) });
});

router.post("/logout", authenticate, async (req, res) => {
  if (req.sessionId) {
    await destroySession(req.sessionId);
  }
  res.clearCookie(COOKIE_NAME, { ...cookieOptions(), maxAge: 0 });
  res.json({ ok: true });
});

router.get("/me", authenticate, async (req, res) => {
  // Super admin usa a própria conta como empresa: garante a empresa pessoal já
  // aqui, para que empresa_id/créditos apareçam assim que o app carrega.
  if (req.user!.role === "super_admin" && !req.user!.empresa_id) {
    await ensurePersonalEmpresa(req.user!);
  }
  const userWithEmpresa = await prisma.user.findUnique({
    where: { id: req.user!.id },
    include: {
      empresa: {
        include: {
          assinaturas: {
            orderBy: { created_at: "desc" },
            take: 1,
            include: { pagamentos: { orderBy: { created_at: "desc" }, take: 1 } },
          },
        },
      },
    },
  });
  res.json({ user: publicUser(userWithEmpresa) });
});

router.post("/onboarding-watched", authenticate, async (req, res) => {
  const updated = await prisma.user.update({
    where: { id: req.user!.id },
    data: { onboarding_video_watched: true, onboarding_video_watched_at: new Date() },
  });
  res.json({ ok: true, watched_at: updated.onboarding_video_watched_at });
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6),
});

router.post("/change-password", authenticate, async (req, res) => {
  const parse = changePasswordSchema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Dados inválidos" });
    return;
  }
  const { currentPassword, newPassword } = parse.data;
  const ok = await verifyPassword(currentPassword, req.user!.password_hash);
  if (!ok) {
    res.status(400).json({ error: "Senha atual incorreta" });
    return;
  }
  const newHash = await hashPassword(newPassword);
  await prisma.user.update({
    where: { id: req.user!.id },
    data: { password_hash: newHash },
  });
  res.json({ ok: true });
});

export default router;
