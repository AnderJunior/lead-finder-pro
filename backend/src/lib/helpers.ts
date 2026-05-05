import type { Request, Response, NextFunction } from "express";
import { z, ZodError, type ZodSchema } from "zod";

/**
 * Garante que o usuário tem empresa_id (não super_admin solto).
 * Super admin pode passar ?empresa_id=X para escopar a query.
 */
export function getEmpresaScope(req: Request): bigint | null {
  if (req.user?.role === "super_admin") {
    const param = req.query.empresa_id || req.body?.empresa_id;
    if (param) return BigInt(String(param));
    return null; // super_admin sem escopo: vê tudo (caller decide)
  }
  if (!req.user?.empresa_id) return null;
  return req.user.empresa_id;
}

export function requireEmpresa(req: Request, res: Response, next: NextFunction): void {
  if (req.user?.role === "super_admin") {
    next();
    return;
  }
  if (!req.user?.empresa_id) {
    res.status(403).json({ error: "Usuário sem empresa associada" });
    return;
  }
  next();
}

export function asBigInt(value: unknown): bigint {
  if (typeof value === "bigint") return value;
  if (typeof value === "number") return BigInt(value);
  if (typeof value === "string") return BigInt(value);
  throw new Error(`Não foi possível converter ${value} para bigint`);
}

export function asBigIntOrNull(value: unknown): bigint | null {
  if (value === null || value === undefined || value === "") return null;
  return asBigInt(value);
}

/**
 * Wrapper para handlers async que captura erros e passa pro error handler.
 */
export function asyncHandler<T extends Request = Request>(
  fn: (req: T, res: Response, next: NextFunction) => Promise<void | Response>
) {
  return (req: T, res: Response, next: NextFunction): void => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Validador Zod para body. Devolve 400 com detalhes se inválido.
 */
export function parseBody<T extends ZodSchema>(schema: T, req: Request, res: Response): z.infer<T> | null {
  const parse = schema.safeParse(req.body);
  if (!parse.success) {
    res.status(400).json({ error: "Dados inválidos", details: parse.error.flatten() });
    return null;
  }
  return parse.data;
}

export function paginationParams(req: Request) {
  const page = Math.max(1, Number(req.query.page) || 1);
  const pageSize = Math.min(200, Math.max(1, Number(req.query.pageSize) || 25));
  return { page, pageSize, skip: (page - 1) * pageSize, take: pageSize };
}
