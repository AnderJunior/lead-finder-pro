import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { randomBytes } from "node:crypto";
import { prisma } from "./prisma.js";
import type { User } from "@prisma/client";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const SESSION_DAYS = 7;

export interface JwtPayload {
  sub: string; // user id
  sid: string; // session id
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 12);
}

export async function verifyPassword(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain, hash);
}

export async function createSession(userId: bigint): Promise<{ token: string; sessionId: string }> {
  const sessionId = randomBytes(24).toString("hex");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000);

  await prisma.session.create({
    data: { id: sessionId, user_id: userId, expires_at: expiresAt },
  });

  const token = jwt.sign(
    { sub: userId.toString(), sid: sessionId } satisfies JwtPayload,
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN } as jwt.SignOptions
  );

  return { token, sessionId };
}

export async function destroySession(sessionId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { id: sessionId } }).catch(() => null);
}

export async function validateToken(
  token: string
): Promise<{ user: User; sessionId: string } | null> {
  try {
    const payload = jwt.verify(token, JWT_SECRET) as JwtPayload;
    const session = await prisma.session.findUnique({
      where: { id: payload.sid },
      include: { user: true },
    });
    if (!session) return null;
    if (session.expires_at < new Date()) {
      await prisma.session.delete({ where: { id: session.id } }).catch(() => null);
      return null;
    }
    if (session.user.status !== "ativo") return null;
    return { user: session.user, sessionId: session.id };
  } catch {
    return null;
  }
}

export const COOKIE_NAME = "leadradar_session";

export function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.COOKIE_SECURE === "true",
    domain: process.env.COOKIE_DOMAIN || undefined,
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
  };
}
