import type { Request, Response, NextFunction } from "express";
import type { User } from "@prisma/client";
import { COOKIE_NAME, validateToken } from "../lib/auth.js";

declare global {
  namespace Express {
    interface Request {
      user?: User;
      sessionId?: string;
    }
  }
}

function extractToken(req: Request): string | null {
  const cookieToken = req.cookies?.[COOKIE_NAME];
  if (cookieToken) return cookieToken;
  const auth = req.header("authorization");
  if (auth?.startsWith("Bearer ")) return auth.slice(7);
  return null;
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const token = extractToken(req);
  if (!token) {
    res.status(401).json({ error: "Não autenticado" });
    return;
  }
  const result = await validateToken(token);
  if (!result) {
    res.status(401).json({ error: "Sessão inválida ou expirada" });
    return;
  }
  req.user = result.user;
  req.sessionId = result.sessionId;
  next();
}

export function requireRole(...roles: Array<"user" | "admin" | "super_admin">) {
  return (req: Request, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: "Não autenticado" });
      return;
    }
    if (!roles.includes(req.user.role)) {
      res.status(403).json({ error: "Sem permissão" });
      return;
    }
    next();
  };
}

export const requireSuperAdmin = requireRole("super_admin");
export const requireAdmin = requireRole("admin", "super_admin");
