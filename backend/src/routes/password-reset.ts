import { Router } from "express";
import { z } from "zod";
import { randomBytes } from "node:crypto";
import { prisma } from "../lib/prisma.js";
import { asyncHandler, parseBody } from "../lib/helpers.js";
import { hashPassword } from "../lib/auth.js";

const router = Router();

const requestSchema = z.object({ email: z.string().email() });

/**
 * Solicita reset. Por enquanto retorna o token na resposta (ambiente dev).
 * Em prod, enviar por email.
 */
router.post(
  "/request",
  asyncHandler(async (req, res) => {
    const data = parseBody(requestSchema, req, res);
    if (!data) return;
    const user = await prisma.user.findUnique({ where: { email: data.email.toLowerCase() } });
    // Sempre retorna sucesso pra não vazar quais emails existem
    if (!user) {
      res.json({ ok: true });
      return;
    }
    const token = randomBytes(24).toString("hex");
    await prisma.passwordReset.create({
      data: {
        id: token,
        user_id: user.id,
        expires_at: new Date(Date.now() + 60 * 60 * 1000), // 1h
      },
    });
    // TODO: enviar por email em prod
    res.json({ ok: true, token: process.env.NODE_ENV === "production" ? undefined : token });
  })
);

const confirmSchema = z.object({
  token: z.string().min(10),
  newPassword: z.string().min(6),
});

router.post(
  "/confirm",
  asyncHandler(async (req, res) => {
    const data = parseBody(confirmSchema, req, res);
    if (!data) return;
    const reset = await prisma.passwordReset.findUnique({ where: { id: data.token } });
    if (!reset || reset.used || reset.expires_at < new Date()) {
      res.status(400).json({ error: "Token inválido ou expirado" });
      return;
    }
    const hash = await hashPassword(data.newPassword);
    await prisma.$transaction([
      prisma.user.update({ where: { id: reset.user_id }, data: { password_hash: hash } }),
      prisma.passwordReset.update({ where: { id: data.token }, data: { used: true } }),
      prisma.session.deleteMany({ where: { user_id: reset.user_id } }),
    ]);
    res.json({ ok: true });
  })
);

export default router;
