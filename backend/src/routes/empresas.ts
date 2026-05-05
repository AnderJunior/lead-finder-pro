import { Router } from "express";
import { z } from "zod";
import { prisma } from "../lib/prisma.js";
import { authenticate, requireSuperAdmin } from "../middlewares/auth.js";
import { asBigInt, asyncHandler, parseBody } from "../lib/helpers.js";
import { hashPassword } from "../lib/auth.js";
import { serialize } from "../lib/serialize.js";
import { addCredits, setCredits } from "../lib/creditos.js";

const router = Router();
router.use(authenticate);

// ─── LIST: super admin lê todas; admin/user só sua empresa ─────────────────
router.get(
  "/",
  asyncHandler(async (req, res) => {
    const where = req.user!.role === "super_admin" ? {} : { id: req.user!.empresa_id! };

    const empresas = await prisma.empresa.findMany({
      where,
      orderBy: { created_at: "desc" },
      include: {
        _count: { select: { users: true } },
        assinaturas: {
          orderBy: { created_at: "desc" },
          take: 1,
          include: { plano: true, pagamentos: { orderBy: { created_at: "desc" }, take: 1 } },
        },
      },
    });
    res.json(serialize(empresas));
  })
);

// ─── GET ONE ───────────────────────────────────────────────────────────────
router.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = asBigInt(req.params.id);
    if (req.user!.role !== "super_admin" && req.user!.empresa_id !== id) {
      res.status(403).json({ error: "Sem permissão" });
      return;
    }
    const empresa = await prisma.empresa.findUnique({
      where: { id },
      include: {
        users: {
          orderBy: { created_at: "asc" },
          select: {
            id: true,
            email: true,
            nome: true,
            telefone: true,
            avatar_url: true,
            role: true,
            status: true,
            empresa_id: true,
            created_at: true,
            updated_at: true,
          },
        },
        assinaturas: {
          orderBy: { created_at: "desc" },
          include: { plano: true, pagamentos: { orderBy: { data_vencimento: "desc" } } },
        },
      },
    });
    if (!empresa) {
      res.status(404).json({ error: "Empresa não encontrada" });
      return;
    }
    res.json(serialize(empresa));
  })
);

// ─── CREATE empresa + admin user (super_admin) ─────────────────────────────
const createSchema = z.object({
  nome: z.string().min(1),
  cnpj: z.string().optional().nullable(),
  endereco: z.string().optional().nullable(),
  telefone: z.string().optional().nullable(),
  email_comercial: z.string().email().optional().nullable(),
  admin: z.object({
    email: z.string().email(),
    nome: z.string().min(1),
    password: z.string().min(6),
    telefone: z.string().optional().nullable(),
  }),
  plano_id: z.number().int().positive().optional().nullable(),
  ciclo: z.enum(["mensal", "trimestral", "semestral", "anual"]).optional(),
  valor: z.number().nonnegative().optional(),
  data_vencimento: z.string().datetime().optional(),
});

router.post(
  "/",
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const data = parseBody(createSchema, req, res);
    if (!data) return;

    const exists = await prisma.user.findUnique({ where: { email: data.admin.email.toLowerCase() } });
    if (exists) {
      res.status(409).json({ error: "Email do admin já está em uso" });
      return;
    }

    const hash = await hashPassword(data.admin.password);

    // Busca o plano (se houver) para pegar créditos iniciais
    let creditosIniciais = 0;
    if (data.plano_id) {
      const plano = await prisma.plano.findUnique({ where: { id: BigInt(data.plano_id) } });
      creditosIniciais = plano?.creditos_iniciais ?? 0;
    }

    const empresa = await prisma.$transaction(async (tx) => {
      const emp = await tx.empresa.create({
        data: {
          nome: data.nome,
          cnpj: data.cnpj || null,
          endereco: data.endereco || null,
          telefone: data.telefone || null,
          email_comercial: data.email_comercial || null,
          creditos: creditosIniciais,
          updated_by_id: req.user!.id,
        },
      });
      await tx.user.create({
        data: {
          email: data.admin.email.toLowerCase(),
          password_hash: hash,
          nome: data.admin.nome,
          telefone: data.admin.telefone || null,
          role: "admin",
          empresa_id: emp.id,
        },
      });
      if (data.plano_id) {
        await tx.assinatura.create({
          data: {
            empresa_id: emp.id,
            plano_id: BigInt(data.plano_id),
            ciclo: data.ciclo || "mensal",
            valor: data.valor || 0,
            data_vencimento: data.data_vencimento ? new Date(data.data_vencimento) : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          },
        });
      }
      return emp;
    });

    res.status(201).json(serialize(empresa));
  })
);

// ─── UPDATE ────────────────────────────────────────────────────────────────
const updateSchema = z.object({
  nome: z.string().min(1).optional(),
  cnpj: z.string().nullable().optional(),
  endereco: z.string().nullable().optional(),
  telefone: z.string().nullable().optional(),
  email_comercial: z.string().email().nullable().optional(),
  ativo: z.boolean().optional(),
});

router.put(
  "/:id",
  asyncHandler(async (req, res) => {
    const id = asBigInt(req.params.id);
    const isOwner = req.user!.empresa_id === id;
    const isAdminOrSuper = req.user!.role === "super_admin" || (req.user!.role === "admin" && isOwner);
    if (!isAdminOrSuper) {
      res.status(403).json({ error: "Sem permissão" });
      return;
    }
    const data = parseBody(updateSchema, req, res);
    if (!data) return;

    // Apenas super admin pode alterar campo `ativo`
    if (data.ativo !== undefined && req.user!.role !== "super_admin") {
      delete data.ativo;
    }

    const empresa = await prisma.empresa.update({
      where: { id },
      data: { ...data, updated_by_id: req.user!.id },
    });
    res.json(serialize(empresa));
  })
);

// ─── DELETE (super admin) ──────────────────────────────────────────────────
router.delete(
  "/:id",
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const id = asBigInt(req.params.id);
    await prisma.empresa.delete({ where: { id } });
    res.json({ ok: true });
  })
);

// ─── TOGGLE ATIVO ──────────────────────────────────────────────────────────
router.post(
  "/:id/toggle-ativo",
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const id = asBigInt(req.params.id);
    const empresa = await prisma.empresa.findUnique({ where: { id } });
    if (!empresa) {
      res.status(404).json({ error: "Empresa não encontrada" });
      return;
    }
    const updated = await prisma.empresa.update({
      where: { id },
      data: { ativo: !empresa.ativo },
    });
    res.json(serialize(updated));
  })
);

// ─── CRÉDITOS ──────────────────────────────────────────────────────────────

// GET saldo da empresa (próprio user) ou de uma empresa específica (super admin)
router.get(
  "/:id/creditos",
  asyncHandler(async (req, res) => {
    const id = asBigInt(req.params.id);
    if (req.user!.role !== "super_admin" && req.user!.empresa_id !== id) {
      res.status(403).json({ error: "Sem permissão" });
      return;
    }
    const empresa = await prisma.empresa.findUnique({
      where: { id },
      select: { creditos: true },
    });
    if (!empresa) {
      res.status(404).json({ error: "Empresa não encontrada" });
      return;
    }
    res.json({ creditos: empresa.creditos });
  })
);

// Adicionar créditos (incrementa)
const addSchema = z.object({ amount: z.number().int().positive() });
router.post(
  "/:id/creditos/adicionar",
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const id = asBigInt(req.params.id);
    const data = parseBody(addSchema, req, res);
    if (!data) return;
    const total = await addCredits(id, data.amount);
    res.json({ creditos: total });
  })
);

// Definir saldo absoluto
const setSchema = z.object({ amount: z.number().int().nonnegative() });
router.post(
  "/:id/creditos/definir",
  requireSuperAdmin,
  asyncHandler(async (req, res) => {
    const id = asBigInt(req.params.id);
    const data = parseBody(setSchema, req, res);
    if (!data) return;
    const total = await setCredits(id, data.amount);
    res.json({ creditos: total });
  })
);

export default router;
