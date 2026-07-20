import type { Request, Response, NextFunction } from "express";
import type { User } from "@prisma/client";
import { z, ZodError, type ZodSchema } from "zod";
import { prisma } from "./prisma.js";

/** Saldo de créditos concedido à empresa pessoal do super admin (uso praticamente ilimitado). */
const SUPER_ADMIN_EMPRESA_CREDITOS = 1_000_000;

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

/**
 * Provisiona (sob demanda) uma "empresa pessoal" para o super admin, usando os
 * dados da própria conta. A partir daí a conta dele funciona como uma empresa
 * comum na plataforma (funil, leads, etc). Idempotente.
 */
export async function ensurePersonalEmpresa(user: User): Promise<bigint> {
  if (user.empresa_id) return user.empresa_id;
  const empresa = await prisma.empresa.create({
    data: {
      nome: user.nome || user.email,
      email_comercial: user.email,
      telefone: user.telefone ?? null,
      ativo: true,
      creditos: SUPER_ADMIN_EMPRESA_CREDITOS,
    },
  });
  await prisma.user.update({
    where: { id: user.id },
    data: { empresa_id: empresa.id },
  });
  user.empresa_id = empresa.id; // reflete na request atual
  return empresa.id;
}

export async function requireEmpresa(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  if (req.user?.role === "super_admin") {
    // Se o super admin não está escopando outra empresa (?empresa_id=),
    // usa a empresa pessoal dele — criando-a na primeira vez.
    const scoping = req.query.empresa_id || req.body?.empresa_id;
    if (!req.user.empresa_id && !scoping) {
      try {
        await ensurePersonalEmpresa(req.user);
      } catch (err) {
        next(err);
        return;
      }
    }
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
